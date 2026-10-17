from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Attendance, Employee, LeaveRequest
from .permissions import IsAdminOrHR


def iso(dt):
    return timezone.localtime(dt).isoformat() if dt else None


class DayListView(APIView):
    permission_classes = [IsAdminOrHR]

    def get(self, request):
        p = request.query_params
        day = parse_date(p.get('date') or '') or timezone.localdate()
        which = p.get('status', 'present')
        if which not in ('present', 'late', 'absent', 'leave'):
            return Response({'detail': 'Invalid status'}, status=400)

        emps = Employee.objects.filter(is_active=True, is_superuser=False).select_related('department')
        if p.get('department'):
            emps = emps.filter(department_id=p['department'])

        att = {a.employee_id: a for a in Attendance.objects.filter(date=day, employee__in=emps)}
        on_leave = set(LeaveRequest.objects
                       .filter(status='approved', from_date__lte=day, to_date__gte=day, employee__in=emps)
                       .values_list('employee_id', flat=True))

        items = []
        for e in emps.order_by('first_name', 'last_name', 'username'):
            a = att.get(e.id)
            st = a.status if a else None
            if which in ('present', 'late'):
                ok = st == which
            elif which == 'leave':
                ok = e.id in on_leave
            else:
                ok = st not in ('present', 'late') and e.id not in on_leave
            if ok:
                items.append({
                    'id': e.id,
                    'employee_id': e.username,
                    'name': e.get_full_name() or e.username,
                    'designation': e.designation,
                    'department': e.department.name if e.department else '',
                    'check_in': iso(a.check_in) if a else None,
                    'check_out': iso(a.check_out) if a else None,
                })
        return Response({'date': day, 'status': which, 'count': len(items), 'items': items})