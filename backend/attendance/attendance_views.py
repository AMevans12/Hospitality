import math
from datetime import datetime, timedelta

from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from .geo import distance_m
from .models import Attendance, Setting


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
            try:
                with transaction.atomic():
                    rec = Attendance.objects.create(
                        employee=emp, date=today, check_in=now, status=late_status(emp, today, now),
                        in_lat=lat, in_lng=lng, in_distance_m=round(dist, 1), source='app')
            except IntegrityError:
                raise Reject('You are already checked in.', 'already_checked_in')
        except Reject as e:
            return e.response()
        return Response({'detail': 'Checked in', **record_json(rec)}, status=201)


class CheckOutView(APIView):
    def post(self, request):
        try:
            rec = open_record(request.user)
            if not rec:
                raise Reject("You haven't checked in yet.", 'not_checked_in')
            lat, lng, dist = verify_location(request)
            rec.check_out = timezone.now()
            rec.out_lat, rec.out_lng, rec.out_distance_m = lat, lng, round(dist, 1)
            rec.save()
        except Reject as e:
            return e.response()
        return Response({'detail': 'Checked out', **record_json(rec)})