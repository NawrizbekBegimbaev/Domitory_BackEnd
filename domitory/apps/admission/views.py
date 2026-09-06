from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsDormManager, IsSecurityStaff, IsUniversityAdmin
from apps.admission.models import AdmissionCampaign, Booking, BookingWindow, BuildingOrder, PlacementRule
from apps.admission.serializers import (
    BookingSerializer,
    BookingWindowSerializer,
    BuildingOrderSerializer,
    CampaignSerializer,
    EligibleRoomSerializer,
    PlacementRuleSerializer,
    ReserveSerializer,
)
from apps.admission.services import BookingService, CampaignService, EligibilityService
from apps.inventory.models import Room
from apps.residents.models import Resident
from common.tenancy import UniversityScopedMixin, is_global_user, resolve_university_id, scope_queryset, university_for_create


def _error(message, code='ValidationError', http=status.HTTP_400_BAD_REQUEST):
    return Response({'error': {'code': code, 'message': message, 'details': {}}}, status=http)


def _dj_message(e):
    return str(e.message if hasattr(e, 'message') else e.messages[0])


class _AdminWriteMixin:
    """Read for any staff role, write for university_admin+."""

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy', 'activate'):
            return [IsAuthenticated(), IsUniversityAdmin()]
        return super().get_permissions()


class CampaignViewSet(_AdminWriteMixin, UniversityScopedMixin, viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsSecurityStaff]
    serializer_class = CampaignSerializer
    ordering_fields = ['start_date', 'name']
    university_lookup = 'university'

    def get_queryset(self):
        return self.scope(AdmissionCampaign.objects.select_related('university').all())

    def perform_create(self, serializer):
        explicit = self.request.data.get('university')
        if explicit:
            from apps.universities.models import University
            explicit = University.objects.filter(pk=explicit).first()
        serializer.save(university=university_for_create(self.request, explicit))

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        campaign = CampaignService.activate(self.get_object(), user=request.user)
        return Response(CampaignSerializer(campaign).data)

    @action(detail=False, methods=['get'])
    def active(self, request):
        campaign = self.get_queryset().filter(is_active=True).first()
        if campaign is None:
            return Response(None)
        return Response(CampaignSerializer(campaign).data)


class _CampaignChildViewSet(_AdminWriteMixin, UniversityScopedMixin, viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsSecurityStaff]
    university_lookup = 'campaign__university'
    filterset_fields = ['campaign']

    def _check_campaign(self, campaign):
        if not is_global_user(self.request.user) and campaign.university_id != self.request.user.university_id:
            raise PermissionDenied('Кампания принадлежит другому университету.')

    def _check_scope_university(self, campaign, obj, lookup):
        if obj is not None and getattr(obj, lookup) != campaign.university_id:
            raise PermissionDenied('Объект принадлежит другому университету.')

    def perform_create(self, serializer):
        self._check_campaign(serializer.validated_data['campaign'])
        serializer.save()

    def perform_update(self, serializer):
        self._check_campaign(serializer.validated_data.get('campaign', serializer.instance.campaign))
        serializer.save()


class BookingWindowViewSet(_CampaignChildViewSet):
    serializer_class = BookingWindowSerializer

    def get_queryset(self):
        return self.scope(BookingWindow.objects.select_related('campaign').all())


class PlacementRuleViewSet(_CampaignChildViewSet):
    serializer_class = PlacementRuleSerializer

    def get_queryset(self):
        return self.scope(PlacementRule.objects.select_related('campaign', 'building', 'floor__building', 'room__floor__building').all())

    def _validate_scope(self, serializer):
        data = serializer.validated_data
        campaign = data.get('campaign', getattr(serializer.instance, 'campaign', None))
        self._check_campaign(campaign)
        if data.get('building'):
            self._check_scope_university(campaign, data['building'], 'university_id')
        if data.get('floor'):
            self._check_scope_university(campaign, data['floor'].building, 'university_id')
        if data.get('room'):
            self._check_scope_university(campaign, data['room'].floor.building, 'university_id')

    def perform_create(self, serializer):
        self._validate_scope(serializer)
        serializer.save()

    def perform_update(self, serializer):
        self._validate_scope(serializer)
        serializer.save()


class BuildingOrderViewSet(_CampaignChildViewSet):
    serializer_class = BuildingOrderSerializer

    def get_queryset(self):
        return self.scope(BuildingOrder.objects.select_related('campaign', 'building').all())

    def perform_create(self, serializer):
        campaign = serializer.validated_data['campaign']
        self._check_campaign(campaign)
        self._check_scope_university(campaign, serializer.validated_data['building'], 'university_id')
        serializer.save()


class BookingViewSet(UniversityScopedMixin, viewsets.ReadOnlyModelViewSet):
    """Reservations. Create = reserve; confirm turns it into an assignment; cancel releases the bed."""
    permission_classes = [IsAuthenticated, IsSecurityStaff]
    serializer_class = BookingSerializer
    filterset_fields = ['status', 'resident', 'room', 'campaign']
    search_fields = ['resident__full_name', 'room__room_number']
    ordering_fields = ['created_at', 'expires_at']
    university_lookup = 'resident__university'

    def get_queryset(self):
        BookingService.expire_stale()
        return self.scope(Booking.objects.select_related(
            'resident', 'room', 'room__floor', 'room__floor__building', 'created_by', 'campaign',
        ).all())

    def get_permissions(self):
        if self.action in ('create', 'confirm', 'cancel'):
            return [IsAuthenticated(), IsDormManager()]
        return super().get_permissions()

    def create(self, request, *args, **kwargs):
        serializer = ReserveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        try:
            resident = scope_queryset(Resident.objects.all(), request).get(pk=data['resident'])
            room = scope_queryset(Room.objects.select_related('floor__building'), request, 'floor__building__university').get(pk=data['room'])
        except (Resident.DoesNotExist, Room.DoesNotExist):
            return _error('Жилец или комната не найдены', 'NotFound', status.HTTP_404_NOT_FOUND)
        try:
            booking = BookingService.reserve(
                resident, room, created_by=request.user, beds=data['beds'],
                override_reason=data['override_reason'], note=data['note'],
            )
        except DjangoValidationError as e:
            return _error(_dj_message(e))
        return Response(BookingSerializer(booking).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def confirm(self, request, pk=None):
        booking = self.get_object()
        contract = None
        if request.data.get('contract'):
            from apps.occupancy.models import AccommodationContract
            contract = scope_queryset(AccommodationContract.objects.all(), request, 'resident__university').filter(pk=request.data['contract']).first()
            if contract is None:
                return _error('Договор не найден', 'NotFound', status.HTTP_404_NOT_FOUND)
        try:
            booking = BookingService.confirm(booking, user=request.user, contract=contract)
        except DjangoValidationError as e:
            return _error(_dj_message(e))
        return Response(BookingSerializer(booking).data)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        try:
            booking = BookingService.cancel(self.get_object(), user=request.user)
        except DjangoValidationError as e:
            return _error(_dj_message(e))
        return Response(BookingSerializer(booking).data)


class EligibilityView(APIView):
    """GET ?resident=&room=[&beds=] → {ok, reasons, codes}"""
    permission_classes = [IsAuthenticated, IsSecurityStaff]

    def get(self, request):
        try:
            resident = scope_queryset(Resident.objects.all(), request).get(pk=request.query_params.get('resident'))
            room = scope_queryset(Room.objects.select_related('floor__building'), request, 'floor__building__university').get(pk=request.query_params.get('room'))
        except (Resident.DoesNotExist, Room.DoesNotExist, ValueError, DjangoValidationError):
            return _error('Жилец или комната не найдены', 'NotFound', status.HTTP_404_NOT_FOUND)
        beds = int(request.query_params.get('beds') or 1)
        skip_window = request.query_params.get('skip_window') in ('1', 'true')
        e = EligibilityService.check(resident, room, beds=beds, skip_window=skip_window)
        campaign = EligibilityService.active_campaign(resident.university_id)
        return Response({
            'ok': e.ok, 'reasons': e.reasons, 'codes': e.codes,
            'enforced': bool(campaign and campaign.enforce),
            'can_override': request.user.role_name in ('platform_admin', 'university_admin'),
        })


class EligibleRoomsView(APIView):
    """GET ?resident=[&include_blocked=1] → rooms the resident may take now."""
    permission_classes = [IsAuthenticated, IsSecurityStaff]

    def get(self, request):
        try:
            resident = scope_queryset(Resident.objects.all(), request).get(pk=request.query_params.get('resident'))
        except (Resident.DoesNotExist, ValueError, DjangoValidationError):
            return _error('Жилец не найден', 'NotFound', status.HTTP_404_NOT_FOUND)
        include_blocked = request.query_params.get('include_blocked') in ('1', 'true')
        rows = EligibilityService.eligible_rooms(resident, include_blocked=include_blocked)
        return Response(EligibleRoomSerializer(rows, many=True).data)


class AdmissionStatusView(APIView):
    """Active campaign + windows open now / upcoming. Basis for the student app."""
    permission_classes = [IsAuthenticated, IsSecurityStaff]

    def get(self, request):
        university_id = resolve_university_id(request)
        if not university_id:
            return _error('Укажите университет (?university=)', 'ValidationError')
        data = CampaignService.status(university_id)
        return Response({
            'campaign': CampaignSerializer(data['campaign']).data if data['campaign'] else None,
            'open_windows': BookingWindowSerializer(data['open_windows'], many=True).data,
            'upcoming_windows': BookingWindowSerializer(data['upcoming_windows'], many=True).data,
        })
