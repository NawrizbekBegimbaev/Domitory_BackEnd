from rest_framework.permissions import SAFE_METHODS, BasePermission

# Roles that may never write anything, regardless of the view.
READ_ONLY_ROLES = ('ministry',)


class RoleBasedPermission(BasePermission):
    allowed_roles = []

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if not hasattr(request.user, 'role') or request.user.role is None:
            return False
        role = request.user.role.name
        if role in READ_ONLY_ROLES and request.method not in SAFE_METHODS:
            return False
        return role in self.allowed_roles
