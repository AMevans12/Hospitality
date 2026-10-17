from collections import defaultdict
from datetime import timedelta

from django.db.models import Count
from django.utils import timezone

from .models import Employee, Attendance, LeaveRequest, Holiday


def daterange(a, b):
    for i in range((b - a).days + 1):
        yield a + timedelta(days=i)


def build_report(date_from, date_to, department=None, category=None):
    date_to = min(date_to, timezone.localdate())      # never count future days
    emps = (Employee.objects.filter(is_active=True, is_superuser=False)
            .select_related('department').order_by('username'))
    if department:
        emps = emps.filter(department_id=department)
    if category:
        emps = emps.filter(department__category=category)

    empty = {'from': date_from, 'to': date_to, 'totals': dict(present=0, absent=0, late=0, leave=0),
             'rows': [], 'departments': []}
    if date_to < date_from:
        return empty

    holidays = set(Holiday.objects.filter(date__range=(date_from, date_to))
                   .values_list('date', flat=True))
    days = [d for d in daterange(date_from, date_to) if d not in holidays]

    counts = defaultdict(lambda: defaultdict(int))
    for r in (Attendance.objects.filter(date__range=(date_from, date_to), employee__in=emps)
              .values('employee_id', 'status').annotate(n=Count('id'))):
        counts[r['employee_id']][r['status']] = r['n']

    leave_days = defaultdict(int)
    for lv in LeaveRequest.objects.filter(status='approved', from_date__lte=date_to,
                                          to_date__gte=date_from, employee__in=emps):
        for d in daterange(max(lv.from_date, date_from), min(lv.to_date, date_to)):
            if d not in holidays:
                leave_days[lv.employee_id] += 1

    rows, totals, by_dept = [], dict(present=0, absent=0, late=0, leave=0), {}
    for e in emps:
        start = max(date_from, timezone.localtime(e.date_joined).date())
        scheduled = sum(1 for d in days if d >= start)
        c = counts[e.id]
        present, late, leave = c['present'], c['late'], leave_days[e.id]
        absent = max(scheduled - present - late - leave, 0)
        expected = scheduled - leave
        pct = round((present + late) * 100 / expected) if expected > 0 else 0
        row = {'employee_id': e.username, 'name': e.get_full_name() or e.username,
               'department': e.department.name if e.department else '-',
               'present': present, 'absent': absent, 'late': late, 'leave': leave, 'percent': pct}
        rows.append(row)
        for k in totals:
            totals[k] += row[k]
        d = by_dept.setdefault(row['department'], dict(department=row['department'], employees=0,
                                                       present=0, absent=0, late=0, leave=0))
        d['employees'] += 1
        for k in ('present', 'absent', 'late', 'leave'):
            d[k] += row[k]

    return {'from': date_from, 'to': date_to, 'totals': totals, 'rows': rows,
            'departments': list(by_dept.values())}