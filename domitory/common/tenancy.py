"""Multi-university scoping helpers.

Rules:
- platform_admin and ministry have no university → see all data, may narrow with ?university=<id>.
- Every other user sees only rows of their own university.
- A user without a role or (for scoped roles) without a university sees nothing.
"""
from rest_framework.exceptions import PermissionDenied

GLOBAL_ROLES = ('platform_admin', 'ministry')


def is_global_user(user):
    return getattr(user, 'role_name', None) in GLOBAL_ROLES


def resolve_university_id(request):
    """University id the request is scoped to, or None for 'all universities'."""
    user = request.user
    if is_global_user(user):
        return request.query_params.get('university') or None
    return user.university_id


def scope_queryset(qs, request, lookup='university'):
    """Filter qs by the requesting user's university. lookup is the ORM path to the FK."""
    user = request.user
    if is_global_user(user):
        uni = request.query_params.get('university')
        return qs.filter(**{f'{lookup}_id': uni}) if uni else qs
    if not user.university_id:
        return qs.none()
    return qs.filter(**{f'{lookup}_id': user.university_id})


def university_for_create(request, explicit=None):
    """University to attach to a newly created scoped object.

    Scoped users always get their own university (an explicit value is ignored).
    Global users must pass one explicitly.
    """
    user = request.user
    if is_global_user(user):
        if explicit is None:
            # platform_admin working "inside" a university picked in the sidebar (?university=)
            from apps.universities.models import University
            scoped = request.query_params.get('university')
            explicit = University.objects.filter(pk=scoped).first() if scoped else None
        if explicit is None:
            raise PermissionDenied('Выберите университет (селектор в меню) или передайте university.')
        return explicit
    if not user.university_id:
        raise PermissionDenied('Your account is not linked to a university.')
    return user.university


class UniversityScopedMixin:
    """ViewSet mixin: get_queryset() is scoped via `university_lookup`."""
    university_lookup = 'university'

    def scope(self, qs):
        return scope_queryset(qs, self.request, self.university_lookup)
