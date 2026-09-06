from django.urls import path

from apps.reports.views import (
    AvailableRoomsReportView,
    DebtorsReportView,
    OccupancyReportView,
    PaymentsReportView,
    ResidentsReportView,
    SummaryReportView,
    UniversitiesOverviewView,
)

urlpatterns = [
    path('reports/summary/', SummaryReportView.as_view(), name='report-summary'),
    path('reports/universities/', UniversitiesOverviewView.as_view(), name='report-universities'),
    path('reports/occupancy/', OccupancyReportView.as_view(), name='report-occupancy'),
    path('reports/available-rooms/', AvailableRoomsReportView.as_view(), name='report-available-rooms'),
    path('reports/debtors/', DebtorsReportView.as_view(), name='report-debtors'),
    path('reports/payments/', PaymentsReportView.as_view(), name='report-payments'),
    path('reports/residents/', ResidentsReportView.as_view(), name='report-residents'),
]
