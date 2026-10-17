from datetime import date

from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import AuditLog, LeaveRequest

MAX_DAYS = 60


def is_admin(u):
    return u.is_superuser or u.role in ('admin', 'hr')


def can_decide(u):
    return is_admin(u) or u.role == 'head'


def bad(msg, status=400):
    return Response({'detail': msg}, status=status)


def parse_date(s):
    try:
        return date.fromisoformat(str(s))
    except ValueError:
        return None


def leave_json(l):
    e = l.employee
    return {
        'id': l.id,
        'employee_id': e.username,
        'name': e.get_full_name() or e.username,
        'department': e.department.name if e.department else None,
        'from_date': l.from_date.isoformat(),
        'to_date': l.to_date.isoformat(),
        'days': (l.to_date - l.from_date).days + 1,
        'reason': l.reason,
        'status': l.status,
        'decided_by': (l.decided_by.get_full_name() or l.decided_by.username) if l.decided_by else None,
        'created_at': l.created_at.isoformat(),
    }


class LeaveListCreateView(APIView):
    """GET = my leave requests, POST = apply for leave."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = (LeaveRequest.objects.filter(employee=request.user)
              .select_related('employee', 'employee__department', 'decided_by')
              .order_by('-created_at'))
        return Response([leave_json(l) for l in qs])

    def post(self, request):
        d1 = parse_date(request.data.get('from_date'))
        d2 = parse_date(request.data.get('to_date'))
        reason = str(request.data.get('reason', '')).strip()[:255]
        if not d1 or not d2:
            return bad('Choose valid dates')
        if d2 < d1:
            return bad('End date cannot be before the start date')
        if d1 < timezone.localdate():
            return bad('Leave cannot start in the past')
        if (d2 - d1).days + 1 > MAX_DAYS:
            return bad(f'Leave cannot be longer than {MAX_DAYS} days')
        clash = LeaveRequest.objects.filter(
            employee=request.user, status__in=['pending', 'approved'],
            from_date__lte=d2, to_date__gte=d1).exists()
        if clash:
            return bad('You already have a leave request in these dates')
        l = LeaveRequest.objects.create(employee=request.user, from_date=d1, to_date=d2, reason=reason)
        return Response(leave_json(l), status=201)


class LeaveManageView(APIView):
    """Requests this user is allowed to decide. ?status=pending|approved|rejected|all"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        u = request.user
        if not can_decide(u):
            return bad('Not allowed', 403)
        status_f = request.query_params.get('status', 'pending')
        qs = (LeaveRequest.objects.exclude(employee=u)
              .select_related('employee', 'employee__department', 'decided_by'))
        if not is_admin(u):   # department head: own department's staff only
            qs = qs.filter(employee__department=u.department, employee__role='staff') if u.department_id else qs.none()
        if status_f != 'all':
            qs = qs.filter(status=status_f)
        return Response([leave_json(l) for l in qs.order_by('-created_at')[:200]])


class LeaveDecideView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        u = request.user
        if not can_decide(u):
            return bad('Not allowed', 403)
        l = get_object_or_404(LeaveRequest, pk=pk)
        if l.employee_id == u.id:
            return bad('You cannot decide your own leave')
        if not is_admin(u) and (not u.department_id
                                or l.employee.department_id != u.department_id
                                or l.employee.role != 'staff'):
            return bad('Not allowed', 403)
        if l.status != 'pending':
            return bad('This request was already decided')
        action = request.data.get('action')
        if action not in ('approve', 'reject'):
            return bad('Action must be approve or reject')
        l.status = 'approved' if action == 'approve' else 'rejected'
        l.decided_by = u
        l.save()
        AuditLog.objects.create(
            actor=u, action=f'leave_{action}', target=l.employee.username,
            details={'leave': l.id, 'from': str(l.from_date), 'to': str(l.to_date)})
        return Response(leave_json(l))


class LeaveCancelView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        l = get_object_or_404(LeaveRequest, pk=pk, employee=request.user)
        if l.status != 'pending':
            return bad('Only pending requests can be cancelled')
        l.delete()
        return Response({'ok': True})