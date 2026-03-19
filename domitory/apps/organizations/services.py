from apps.organizations.models import Organization


class OrganizationService:

    @staticmethod
    def create_organization(data):
        return Organization.objects.create(**data)

    @staticmethod
    def update_organization(organization, data):
        for field, value in data.items():
            setattr(organization, field, value)
        organization.save(update_fields=list(data.keys()))
        return organization

    @staticmethod
    def deactivate_organization(organization):
        organization.status = Organization.Status.INACTIVE
        organization.save(update_fields=['status'])
        return organization

    @staticmethod
    def activate_organization(organization):
        organization.status = Organization.Status.ACTIVE
        organization.save(update_fields=['status'])
        return organization
