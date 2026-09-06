from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsSecurityStaff, RoleBasedPermission
from apps.reports.services import ReportService
from common.tenancy import resolve_university_id


class IsMinistryOrPlatformAdmin(RoleBasedPermission):
    allowed_roles = ['platform_admin', 'ministry']


class SummaryReportView(APIView):
    permission_classes = [IsAuthenticated, IsSecurityStaff]

    def get(self, request):
        data = ReportService.summary(university_id=resolve_university_id(request))
        return Response(data)


class UniversitiesOverviewView(APIView):
    """Per-university statistics for the ministry dashboard."""
    permission_classes = [IsAuthenticated, IsMinistryOrPlatformAdmin]

    def get(self, request):
        return Response(ReportService.universities_overview())


class OccupancyReportView(APIView):
    permission_classes = [IsAuthenticated, IsSecurityStaff]

    def get(self, request):
        building_id = request.query_params.get('building')
        data = ReportService.occupancy(building_id, university_id=resolve_university_id(request))
        return Response(data)


class AvailableRoomsReportView(APIView):
    permission_classes = [IsAuthenticated, IsSecurityStaff]

    def get(self, request):
        building_id = request.query_params.get('building')
        gender = request.query_params.get('gender')
        data = ReportService.available_rooms(building_id, gender, university_id=resolve_university_id(request))
        return Response(list(data))


class DebtorsReportView(APIView):
    permission_classes = [IsAuthenticated, IsSecurityStaff]

    def get(self, request):
        data = ReportService.debtors(university_id=resolve_university_id(request))
        return Response(list(data))


class PaymentsReportView(APIView):
    permission_classes = [IsAuthenticated, IsSecurityStaff]

    def get(self, request):
        data = ReportService.payments_report(
            date_from=request.query_params.get('date_from'),
            date_to=request.query_params.get('date_to'),
            method=request.query_params.get('method'),
            period=request.query_params.get('period'),
            university_id=resolve_university_id(request),
        )
        return Response(data)


class ResidentsReportView(APIView):
    permission_classes = [IsAuthenticated, IsSecurityStaff]

    def get(self, request):
        data = ReportService.residents_report(
            status_filter=request.query_params.get('status'),
            faculty=request.query_params.get('faculty'),
            gender=request.query_params.get('gender'),
            university_id=resolve_university_id(request),
        )
        return Response(list(data))
