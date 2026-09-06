from common.permissions import RoleBasedPermission


class IsPlatformAdmin(RoleBasedPermission):
    allowed_roles = ['platform_admin']


class IsUniversityAdmin(RoleBasedPermission):
    allowed_roles = ['platform_admin', 'university_admin']


class IsDormManager(RoleBasedPermission):
    allowed_roles = ['platform_admin', 'university_admin', 'dorm_manager']


class IsAccountant(RoleBasedPermission):
    allowed_roles = ['platform_admin', 'university_admin', 'accountant']


class IsSecurityStaff(RoleBasedPermission):
    """Any staff role. ministry is included for reading only (writes are blocked globally)."""
    allowed_roles = [
        'platform_admin', 'university_admin', 'dorm_manager',
        'accountant', 'security_staff', 'ministry',
    ]


class IsAccountantOrMinistry(RoleBasedPermission):
    """Finance data: accountant group plus read-only ministry."""
    allowed_roles = ['platform_admin', 'university_admin', 'accountant', 'ministry']
