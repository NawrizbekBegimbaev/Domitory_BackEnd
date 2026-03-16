from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsSecurityStaff
from apps.reports.services import ReportService


class SummaryReportView(APIView):
    permission_classes = [IsAuthenticated, IsSecurityStaff]

    def get(self, request):
        data = ReportService.summary(request.user.organization)
        return Response(data)


class OccupancyReportView(APIView):
    permission_classes = [IsAuthenticated, IsSecurityStaff]

    def get(self, request):
        building_id = request.query_params.get('building')
        data = ReportService.occupancy(request.user.organization, building_id)
        return Response(data)


class AvailableRoomsReportView(APIView):
    permission_classes = [IsAuthenticated, IsSecurityStaff]

    def get(self, request):
        building_id = request.query_params.get('building')
        gender = request.query_params.get('gender')
        data = ReportService.available_rooms(request.user.organization, building_id, gender)
        return Response(list(data))


class DebtorsReportView(APIView):
    permission_classes = [IsAuthenticated, IsSecurityStaff]

    def get(self, request):
        data = ReportService.debtors(request.user.organization)
        return Response(list(data))


class PaymentsReportView(APIView):
    permission_classes = [IsAuthenticated, IsSecurityStaff]

    def get(self, request):
        data = ReportService.payments_report(
            organization=request.user.organization,
            date_from=request.query_params.get('date_from'),
            date_to=request.query_params.get('date_to'),
            method=request.query_params.get('method'),
        )
        return Response(data)


class ResidentsReportView(APIView):
    permission_classes = [IsAuthenticated, IsSecurityStaff]

    def get(self, request):
        data = ReportService.residents_report(
            organization=request.user.organization,
            status_filter=request.query_params.get('status'),
            faculty=request.query_params.get('faculty'),
            gender=request.query_params.get('gender'),
        )
        return Response(list(data))
