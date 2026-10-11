from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsAdminOrHR(BasePermission):
    def has_permission(self, request, view):
        u = request.user
        return bool(u and u.is_authenticated and (u.is_superuser or u.role in ('admin', 'hr')))

class IsAdminOrHROrReadOnly(BasePermission):
    def has_permission(self, request, view):
        u = request.user
        if not (u and u.is_authenticated):
            return False
        if request.method in SAFE_METHODS:
            return True
        return bool(u.is_superuser or u.role in ('admin', 'hr'))