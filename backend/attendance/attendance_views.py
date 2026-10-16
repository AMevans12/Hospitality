import calendar
import math
import re
from datetime import date, datetime, timedelta

from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from .models import Attendance, Employee, Holiday, LeaveRequest, Setting, AuditLog
from . import face as facelib
from .permissions import IsAdminOrHR
from .views import audit
import cv2
import numpy as np
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

import io
from PIL import Image, ImageOps

from .geo import distance_m
from .models import Attendance, Holiday, LeaveRequest, Setting


class Reject(Exception):
    def __init__(self, detail, code, **extra):
        self.detail, self.code, self.extra = detail, code, extra

    def response(self):
        return Response({'detail': self.detail, 'code': self.code, **self.extra}, status=400)


def iso(dt):
    return timezone.localtime(dt).isoformat() if dt else None


def record_json(a):
    mins = int((a.check_out - a.check_in).total_seconds() // 60) if a.check_in and a.check_out else None
    return {'date': a.date, 'status': a.status, 'check_in': iso(a.check_in), 'check_out': iso(a.check_out),
            'in_distance_m': a.in_distance_m, 'out_distance_m': a.out_distance_m, 'worked_minutes': mins}


def open_record(emp):
    """The record the employee is currently checked in on (today, or last night's shift)."""
    today = timezone.localdate()
    return (Attendance.objects
            .filter(employee=emp, check_in__isnull=False, check_out__isnull=True,
                    date__in=[today, today - timedelta(days=1)],
                    check_in__gte=timezone.now() - timedelta(hours=18))
            .order_by('-date').first())


def read_position(request):
    d = request.data
    if d.get('mocked') in (True, 'true', 'True', 1, '1'):
        raise Reject('Fake or mock location detected. Turn it off and try again.', 'mock_location')
    try:
        lat, lng, acc = float(d.get('lat')), float(d.get('lng')), float(d.get('accuracy'))
    except (TypeError, ValueError):
        raise Reject('Could not read your location. Turn on GPS and try again.', 'no_location')
    if not all(map(math.isfinite, (lat, lng, acc))) or not (-90 <= lat <= 90 and -180 <= lng <= 180):
        raise Reject('Could not read your location. Turn on GPS and try again.', 'no_location')
    return lat, lng, acc


def verify_location(request):
    lat, lng, acc = read_position(request)
    st = Setting.get()
    if acc > st.max_gps_accuracy_m:
        raise Reject(f'GPS signal is weak (accurate to about {round(acc)} m). '
                     'Move near a window or outdoors and try again.', 'weak_gps', accuracy_m=round(acc))
    dist = distance_m(lat, lng, float(st.hospital_lat), float(st.hospital_lng))
    if dist > st.radius_m:
        raise Reject(f'You are {round(dist)} m from the hospital. '
                     f'You must be within {st.radius_m} m to mark attendance.',
                     'outside_area', distance_m=round(dist), radius_m=st.radius_m)
    return lat, lng, dist


def late_status(emp, day, now):
    if not emp.shift_id:
        return 'present'
    start = timezone.make_aware(datetime.combine(day, emp.shift.start_time))
    return 'late' if now > start + timedelta(minutes=Setting.get().late_after_min) else 'present'

def verify_face(request, emp):
    """Face check for check-in/out. Returns {'score', 'photo'} or None when face_required is off."""
    st = Setting.get()
    if not st.face_required:
        return None
    if not emp.face_embedding:
        raise Reject('Your face is not enrolled yet. Ask HR.', 'not_enrolled')
    frames = request.FILES.getlist('frames')
    try:
        res = facelib.verify(emp, frames, st.min_face_score)
    except facelib.FaceError as e:
        raise Reject(e.detail, e.code)
    frames[res['best']].seek(0)
    res['photo'] = frames[res['best']]
    return res

class TodayView(APIView):
    """What the employee dashboard needs: current state, shift, geofence info."""

    def get(self, request):
        emp, st = request.user, Setting.get()
        today = timezone.localdate()
        rec = open_record(emp)
        if rec:
            state = 'checked_in'
        else:
            rec = Attendance.objects.filter(employee=emp, date=today).first()
            state = 'done' if rec and rec.check_out else 'not_started'
        shift = emp.shift
        return Response({
            'state': state,
            'record': record_json(rec) if rec else None,
            'shift': {'name': shift.name, 'start_time': shift.start_time, 'end_time': shift.end_time,
                      'crosses_midnight': shift.crosses_midnight} if shift else None,
            'geofence': {'lat': st.hospital_lat, 'lng': st.hospital_lng, 'radius_m': st.radius_m,
                         'max_accuracy_m': st.max_gps_accuracy_m},
            'server_time': iso(timezone.now()),
        })


class CheckInView(APIView):
    def post(self, request):
        emp = request.user
        try:
            today, now = timezone.localdate(), timezone.now()
            if open_record(emp):
                raise Reject('You are already checked in.', 'already_checked_in')
            if Attendance.objects.filter(employee=emp, date=today).exists():
                raise Reject("Today's attendance is already complete.", 'already_done')
            lat, lng, dist = verify_location(request)
            fc = verify_face(request, emp)
            try:
                with transaction.atomic():
                    rec = Attendance.objects.create(
                        employee=emp, date=today, check_in=now, status=late_status(emp, today, now),
                        in_lat=lat, in_lng=lng, in_distance_m=round(dist, 1), source='app',
                        face_score=fc['score'] if fc else None)
            except IntegrityError:
                raise Reject('You are already checked in.', 'already_checked_in')
            if fc:
                rec.in_photo.save(f'{emp.username}_{today}_in.jpg', fc['photo'], save=True)
        except Reject as e:
            return e.response()
        return Response({'detail': 'Checked in', **record_json(rec)}, status=201)


class CheckOutView(APIView):
    def post(self, request):
        emp = request.user
        try:
            rec = open_record(emp)
            if not rec:
                raise Reject("You haven't checked in yet.", 'not_checked_in')
            lat, lng, dist = verify_location(request)
            fc = verify_face(request, emp)
            rec.check_out = timezone.now()
            rec.out_lat, rec.out_lng, rec.out_distance_m = lat, lng, round(dist, 1)
            if fc:
                rec.out_face_score = fc['score']
                rec.out_photo.save(f'{emp.username}_{rec.date}_out.jpg', fc['photo'], save=False)
            rec.save()
        except Reject as e:
            return e.response()
        return Response({'detail': 'Checked out', **record_json(rec)})


class FaceEnrollView(APIView):
    """The employee enrolls their own face once. HR must reset it before it can be redone."""

    def post(self, request):
        try:
            facelib.enroll(request.user, request.FILES.getlist('frames'))
        except facelib.FaceError as e:
            return Response({'detail': e.detail, 'code': e.code}, status=400)
        audit(request, 'face.enroll', request.user.username)
        return Response({'detail': 'Face enrolled', 'face_enrolled': True}, status=201)


class FaceResetView(APIView):
    permission_classes = [IsAdminOrHR]

    def post(self, request, pk):
        emp = get_object_or_404(Employee, pk=pk, is_superuser=False)
        if emp.face_image:
            emp.face_image.delete(save=False)
        emp.face_embedding = []
        emp.save()
        audit(request, 'face.reset', emp.username)
        return Response({'detail': 'Face reset. The employee can enroll again.'})
    
def daterange(a, b):
    d = a
    while d <= b:
        yield d
        d += timedelta(days=1)


class HistoryView(APIView):
    """The logged-in employee's own attendance for one month: GET ?month=2026-10"""

    def get(self, request):
        emp = request.user
        today = timezone.localdate()
        raw = request.query_params.get('month') or today.strftime('%Y-%m')
        m = re.fullmatch(r'(\d{4})-(\d{2})', raw)
        if not m or not 1 <= int(m.group(2)) <= 12:
            return Response({'detail': 'month must look like 2026-10'}, status=400)
        y, mo = int(m.group(1)), int(m.group(2))
        first, last = date(y, mo, 1), date(y, mo, calendar.monthrange(y, mo)[1])
        start = max(first, timezone.localtime(emp.date_joined).date())   # counted from the day they joined
        end = min(last, today)                                           # never count future days

        recs = {a.date: a for a in Attendance.objects.filter(employee=emp, date__range=(first, last))}
        holidays = set(Holiday.objects.filter(date__range=(first, last)).values_list('date', flat=True))
        leave = set()
        for lv in LeaveRequest.objects.filter(employee=emp, status='approved',
                                              from_date__lte=last, to_date__gte=first):
            leave.update(daterange(max(lv.from_date, first), min(lv.to_date, last)))

        counts = dict(present=0, late=0, absent=0, leave=0)
        days = []
        if start <= end:
            for d in daterange(start, end):
                a = recs.get(d)
                if a:
                    status = a.status
                elif d in holidays:
                    status = 'holiday'
                elif d in leave:
                    status = 'leave'
                elif d == today:
                    status = 'pending'          # today is not over, so it is not "absent" yet
                else:
                    status = 'absent'
                if status in counts:
                    counts[status] += 1
                row = record_json(a) if a else {'date': d, 'check_in': None, 'check_out': None, 'worked_minutes': None}
                row['status'] = status
                days.append(row)
        days.reverse()                           # newest first

        expected = counts['present'] + counts['late'] + counts['absent']   # working days minus leave
        pct = round((counts['present'] + counts['late']) * 100 / expected) if expected else 0
        return Response({'month': raw, 'summary': {**counts, 'percent': pct}, 'days': days})

class FaceCheckView(APIView):
    """Live guidance while the user lines up their face. Saves nothing."""
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser]

    def post(self, request):
        f = request.FILES.get('frame')
        if not f:
            return Response({'ok': False, 'hint': 'No image received'})
        raw = f.read()
        
        try:
            pil = ImageOps.exif_transpose(Image.open(io.BytesIO(raw))).convert('RGB')
        except Exception:
            return Response({'ok': False, 'hint': 'Could not read the image'})
        img = cv2.cvtColor(np.array(pil), cv2.COLOR_RGB2BGR)
        if img is None:
            return Response({'ok': False, 'hint': 'Could not read the image'})
        h, w = img.shape[:2]
        if max(h, w) > 960:
            k = 960 / max(h, w)
            img = cv2.resize(img, (int(w * k), int(h * k)))
            h, w = img.shape[:2]

        faces = facelib.get_app().get(img)
        if not faces:
            return Response({'ok': False, 'hint': 'No face found. Put your face inside the oval.'})
        if len(faces) > 1:
            return Response({'ok': False, 'hint': 'Only one person should be in the frame.'})

        fc = faces[0]
        x1, y1, x2, y2 = [float(v) for v in fc.bbox]
        fw = (x2 - x1) / w
        cx, cy = (x1 + x2) / 2 / w, (y1 + y2) / 2 / h
        crop = img[max(0, int(y1)):int(y2), max(0, int(x1)):int(x2)]
        if crop.size == 0:
            return Response({'ok': False, 'hint': 'Put your face inside the oval.'})
        gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
        bright = float(gray.mean())
        sharp = float(cv2.Laplacian(gray, cv2.CV_64F).var())

        hint = None
        if bright < 70:
            hint = 'Too dark. Move to a brighter place.'
        elif bright > 215:
            hint = 'Too bright. Avoid strong light behind or on your face.'
        elif float(fc.det_score) < 0.6:
            hint = 'Face not clear. Improve the lighting and remove glasses or mask.'
        elif fw < 0.28:
            hint = 'Move closer.'
        elif fw > 0.75:
            hint = 'Move back a little.'
        elif abs(cx - 0.5) > 0.15 or abs(cy - 0.5) > 0.2:
            hint = 'Center your face in the oval.'
        elif sharp < 25:
            hint = 'Hold still.'
        if hint:
            return Response({'ok': False, 'hint': hint})

        k = fc.kps
        eye_dist = abs(float(k[1][0]) - float(k[0][0])) or 1.0
        yaw = (float(k[2][0]) - (float(k[0][0]) + float(k[1][0])) / 2) / eye_dist
        return Response({'ok': True, 'yaw': yaw})

class DeviceResetView(APIView):
    permission_classes = [IsAdminOrHR]

    def post(self, request, pk):
        emp = get_object_or_404(Employee, pk=pk)
        emp.device_id = ''
        emp.device_name = ''
        emp.device_bound_at = None
        emp.save(update_fields=['device_id', 'device_name', 'device_bound_at'])
        AuditLog.objects.create(actor=request.user, action='device_reset', target=emp.username)
        return Response({'ok': True})
    