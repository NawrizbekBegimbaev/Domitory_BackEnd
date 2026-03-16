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
    allowed_roles = [
        'platform_admin', 'university_admin', 'dorm_manager',
        'accountant', 'security_staff',
    ]
