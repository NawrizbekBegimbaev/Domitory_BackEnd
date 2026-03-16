from rest_framework.permissions import BasePermission


class RoleBasedPermission(BasePermission):
    allowed_roles = []

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if not hasattr(request.user, 'role') or request.user.role is None:
            return False
        return request.user.role.name in self.allowed_roles
