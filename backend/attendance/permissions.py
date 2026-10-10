from rest_framework.permissions import BasePermission


class IsAdminOrHR(BasePermission):
    def has_permission(self, request, view):
        u = request.user
        return bool(u and u.is_authenticated and (u.is_superuser or u.role in ('admin', 'hr')))