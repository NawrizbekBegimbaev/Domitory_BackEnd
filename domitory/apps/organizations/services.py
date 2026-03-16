from apps.organizations.models import Organization


class OrganizationService:

    @staticmethod
    def create_organization(data):
        return Organization.objects.create(**data)
