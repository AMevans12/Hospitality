import re
import secrets

from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import generics
from rest_framework.response import Response
from rest_framework.views import APIView
from datetime import date
from django.utils import timezone
from django.utils.dateparse import parse_date
from .models import Attendance, LeaveRequest, Setting
from .reports import build_report
from .serializers import SettingSerializer

from .models import Employee, Department, Shift, AuditLog
from .permissions import IsAdminOrHR, IsAdminOrHROrReadOnly
from .serializers import (user_payload, EmployeeSerializer,
                          DepartmentSerializer, ShiftSerializer)
from django.http import HttpResponse, Http404
from .exports import report_xlsx, report_pdf


def next_employee_id():
    nums = []
    for u in Employee.objects.filter(username__startswith='YH-').values_list('username', flat=True):
        m = re.fullmatch(r'YH-(\d+)', u)
        if m:
            nums.append(int(m.group(1)))
    return f'YH-{(max(nums) if nums else 0) + 1:04d}'


def make_temp_pin():
    return f'{secrets.randbelow(10**6):06d}'


def audit(request, action, target='', details=None):
    AuditLog.objects.create(actor=request.user, action=action, target=target, details=details or {})


class MeView(APIView):
    def get(self, request):
        data = user_payload(request.user)
        data['must_change_pin'] = request.user.must_change_pin
        return Response(data)


class ChangePinView(APIView):
    def post(self, request):
        old = str(request.data.get('old_pin', ''))
        new = str(request.data.get('new_pin', ''))
        u = request.user
        if not u.check_password(old):
            return Response({'detail': 'Current PIN is wrong'}, status=400)
        if len(new) < 4:
            return Response({'detail': 'New PIN must be at least 4 characters'}, status=400)
        if new == old:
            return Response({'detail': 'New PIN must be different'}, status=400)
        u.set_password(new)
        u.must_change_pin = False
        u.save()
        return Response({'detail': 'PIN changed'})


class EmployeeList(generics.ListCreateAPIView):
    permission_classes = [IsAdminOrHR]
    serializer_class = EmployeeSerializer

    def get_queryset(self):
        qs = (Employee.objects.select_related('department')
              .filter(is_superuser=False).order_by('username'))
        p = self.request.query_params
        if p.get('search'):
            s = p['search']
            qs = qs.filter(Q(username__icontains=s) | Q(first_name__icontains=s) |
                           Q(last_name__icontains=s) | Q(department__name__icontains=s))
        if p.get('category'):
            qs = qs.filter(department__category=p['category'])
        if p.get('department'):
            qs = qs.filter(department_id=p['department'])
        if p.get('active'):
            qs = qs.filter(is_active=p['active'] in ('1', 'true'))
        return qs

    def create(self, request, *args, **kwargs):
        ser = self.get_serializer(data=request.data)
        ser.is_valid(raise_exception=True)
        pin = make_temp_pin()
        emp = ser.save(username=next_employee_id(), must_change_pin=True)
        emp.set_password(pin)
        emp.save()
        audit(request, 'employee.create', emp.username)
        data = dict(ser.data)
        data['temp_pin'] = pin          # shown once, hand it to the employee
        return Response(data, status=201)


class EmployeeDetail(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdminOrHR]
    serializer_class = EmployeeSerializer
    queryset = Employee.objects.select_related('department').filter(is_superuser=False)

    def perform_update(self, serializer):
        emp = serializer.save()
        audit(self.request, 'employee.update', emp.username, self.request.data)

    def perform_destroy(self, instance):    # deactivate, never delete (keeps attendance history)
        instance.is_active = False
        instance.save()
        audit(self.request, 'employee.deactivate', instance.username)


class ResetPin(APIView):
    permission_classes = [IsAdminOrHR]

    def post(self, request, pk):
        emp = get_object_or_404(Employee, pk=pk, is_superuser=False)
        pin = make_temp_pin()
        emp.set_password(pin)
        emp.must_change_pin = True
        emp.failed_logins = 0
        emp.locked_until = None        
        emp.save()
        audit(request, 'employee.reset_pin', emp.username)
        return Response({'employee_id': emp.username, 'temp_pin': pin})


class DepartmentList(generics.ListAPIView):
    queryset = Department.objects.all().order_by('name')
    serializer_class = DepartmentSerializer


class ShiftList(generics.ListCreateAPIView):
    permission_classes = [IsAdminOrHROrReadOnly]
    queryset = Shift.objects.all().order_by('start_time', 'name')
    serializer_class = ShiftSerializer

    def perform_create(self, serializer):
        s = serializer.save()
        audit(self.request, 'shift.create', s.name)

class ShiftDetail(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdminOrHROrReadOnly]
    queryset = Shift.objects.all()
    serializer_class = ShiftSerializer

    def perform_update(self, serializer):
        s = serializer.save()
        audit(self.request, 'shift.update', s.name)

    def perform_destroy(self, instance):
        audit(self.request, 'shift.delete', instance.name)
        instance.delete()


class DashboardView(APIView):
    permission_classes = [IsAdminOrHR]

    def get(self, request):
        p = request.query_params
        day = parse_date(p.get('date') or '') or timezone.localdate()
        emps = Employee.objects.filter(is_active=True, is_superuser=False)
        if p.get('department'):
            emps = emps.filter(department_id=p['department'])
        ids = list(emps.values_list('id', flat=True))
        att = Attendance.objects.filter(date=day, employee_id__in=ids)
        present = att.filter(status='present').count()
        late = att.filter(status='late').count()
        on_leave = (LeaveRequest.objects.filter(status='approved', from_date__lte=day,
                                                to_date__gte=day, employee_id__in=ids)
                    .values('employee').distinct().count())
        total = len(ids)
        return Response({'date': day, 'total': total, 'present': present, 'late': late,
                         'leave': on_leave, 'absent': max(total - present - late - on_leave, 0)})


class AttendanceReportView(APIView):
    permission_classes = [IsAdminOrHR]

    def get(self, request):
        p = request.query_params
        today = timezone.localdate()
        d_from = parse_date(p.get('from') or '') or today.replace(day=1)
        d_to = parse_date(p.get('to') or '') or today
        return Response(build_report(d_from, d_to, p.get('department'), p.get('category')))


class SettingsView(APIView):
    permission_classes = [IsAdminOrHR]

    def get(self, request):
        return Response(SettingSerializer(Setting.get()).data)

    def patch(self, request):
        ser = SettingSerializer(Setting.get(), data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        audit(request, 'settings.update', 'Setting', request.data)
        return Response(ser.data)

class ReportExport(APIView):
    permission_classes = [IsAdminOrHR]

    def get(self, request, fmt):
        if fmt not in ('excel', 'pdf'):
            raise Http404
        p = request.query_params
        today = timezone.localdate()
        d_from = parse_date(p.get('from') or '') or today.replace(day=1)
        d_to = parse_date(p.get('to') or '') or today
        rep = build_report(d_from, d_to, p.get('department'), p.get('category'))
        if fmt == 'excel':
            content, ext = report_xlsx(rep), 'xlsx'
            ctype = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        else:
            content, ext, ctype = report_pdf(rep), 'pdf', 'application/pdf'
        audit(request, 'report.export', fmt)
        resp = HttpResponse(content, content_type=ctype)
        resp['Content-Disposition'] = f'attachment; filename="attendance_{rep["from"]}_{rep["to"]}.{ext}"'
        return resp