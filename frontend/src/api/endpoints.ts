import api from './client'
import type {
  User, Building, Floor, Room, Resident, Guardian,
  ResidentDocument, Contract, RoomAssignment, StayRecord,
  Charge, Payment, BalanceResponse,
  AuditLog, SummaryReport, OccupancyBuilding, Debtor,
  AccessEvent, PaginatedResponse,
} from '../types'

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ access: string; refresh: string; user_id: string }>('/auth/login/', { email, password }),
  refresh: (refresh: string) =>
    api.post<{ access: string }>('/auth/refresh/', { refresh }),
  me: () => api.get<User>('/auth/me/'),
  phoneLoginRequest: (phone: string) => api.post('/auth/login/phone/', { phone }),
  phoneLoginConfirm: (phone: string, code: string) =>
    api.post<{ access: string; refresh: string; user_id: string }>('/auth/login/phone/confirm/', { phone, code }),
  verifyEmailSend: (email: string) => api.post('/auth/verify-email/', { email }),
  verifyEmailConfirm: (code: string) => api.post('/auth/verify-email/confirm/', { code }),
  verifyPhoneSend: (phone: string) => api.post('/auth/verify-phone/', { phone }),
  verifyPhoneConfirm: (code: string) => api.post('/auth/verify-phone/confirm/', { code }),
  requestPasswordReset: (email: string) => api.post('/auth/password-reset/', { email }),
  confirmPasswordReset: (email: string, code: string, new_password: string) =>
    api.post('/auth/password-reset/confirm/', { email, code, new_password }),
}

// Users
export const usersApi = {
  list: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<User>>('/users/', { params }),
  get: (id: string) => api.get<User>(`/users/${id}/`),
  create: (data: Record<string, unknown>) => api.post<User>('/users/', data),
  update: (id: string, data: Record<string, unknown>) => api.patch<User>(`/users/${id}/`, data),
  delete: (id: string) => api.delete(`/users/${id}/`),
}

// Buildings
export const buildingsApi = {
  list: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<Building>>('/buildings/', { params }),
  get: (id: string) => api.get<Building>(`/buildings/${id}/`),
  create: (data: Record<string, unknown>) => api.post<Building>('/buildings/', data),
  update: (id: string, data: Record<string, unknown>) => api.patch<Building>(`/buildings/${id}/`, data),
  delete: (id: string) => api.delete(`/buildings/${id}/`),
}

// Floors
export const floorsApi = {
  list: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<Floor>>('/floors/', { params }),
  get: (id: string) => api.get<Floor>(`/floors/${id}/`),
  create: (data: Record<string, unknown>) => api.post<Floor>('/floors/', data),
  update: (id: string, data: Record<string, unknown>) => api.patch<Floor>(`/floors/${id}/`, data),
  delete: (id: string) => api.delete(`/floors/${id}/`),
}

// Rooms
export const roomsApi = {
  list: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<Room>>('/rooms/', { params }),
  get: (id: string) => api.get<Room>(`/rooms/${id}/`),
  create: (data: Record<string, unknown>) => api.post<Room>('/rooms/', data),
  update: (id: string, data: Record<string, unknown>) => api.patch<Room>(`/rooms/${id}/`, data),
  delete: (id: string) => api.delete(`/rooms/${id}/`),
  available: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<Room>>('/rooms/available/', { params }),
}

// Residents
export const residentsApi = {
  list: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<Resident>>('/residents/', { params }),
  get: (id: string) => api.get<Resident>(`/residents/${id}/`),
  create: (data: Record<string, unknown>) => api.post<Resident>('/residents/', data),
  update: (id: string, data: Record<string, unknown>) => api.patch<Resident>(`/residents/${id}/`, data),
  delete: (id: string) => api.delete(`/residents/${id}/`),
  guardians: (id: string) => api.get<Guardian[]>(`/residents/${id}/guardians/`),
  addGuardian: (id: string, data: Record<string, unknown>) =>
    api.post<Guardian>(`/residents/${id}/guardians/`, data),
  documents: (id: string) => api.get<ResidentDocument[]>(`/residents/${id}/documents/`),
  uploadDocument: (id: string, formData: FormData) =>
    api.post<ResidentDocument>(`/residents/${id}/documents/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  balance: (id: string) => api.get<BalanceResponse>(`/residents/${id}/balance/`),
  transfer: (id: string, data: { new_room: string }) =>
    api.post<RoomAssignment>(`/residents/${id}/transfer/`, data),
  withdraw: (id: string) =>
    api.post<{ withdrawn: string; new_balance: string }>(`/residents/${id}/withdraw/`),
}

// Faculties
export const facultiesApi = {
  list: () => api.get<PaginatedResponse<{ id: string; name: string }>>('/faculties/', { params: { page_size: '200' } }),
}

// Contracts
export const contractsApi = {
  list: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<Contract>>('/contracts/', { params }),
  get: (id: string) => api.get<Contract>(`/contracts/${id}/`),
  create: (data: Record<string, unknown>) => api.post<Contract>('/contracts/', data),
  update: (id: string, data: Record<string, unknown>) => api.patch<Contract>(`/contracts/${id}/`, data),
  terminate: (id: string) => api.post(`/contracts/${id}/terminate/`),
}

// Assignments
export const assignmentsApi = {
  list: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<RoomAssignment>>('/assignments/', { params }),
  create: (data: Record<string, unknown>) => api.post<RoomAssignment>('/assignments/', data),
  fullRoom: (data: { room: string; assignments: { resident: string; contract: string }[] }) =>
    api.post<RoomAssignment[]>('/assignments/full-room/', data),
  close: (id: string) => api.post(`/assignments/${id}/close/`),
  transfer: (id: string, data: { new_room: string }) => api.post(`/assignments/${id}/transfer/`, data),
}

// Stay Records
export const stayRecordsApi = {
  list: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<StayRecord>>('/stay-records/', { params }),
}

// Charges
export const chargesApi = {
  list: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<Charge>>('/charges/', { params }),
}

// Payments
export const paymentsApi = {
  list: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<Payment>>('/payments/', { params }),
  create: (data: Record<string, unknown>) => api.post<Payment>('/payments/', data),
}

// Reports
export const reportsApi = {
  summary: () => api.get<SummaryReport>('/reports/summary/'),
  occupancy: (building?: string) =>
    api.get<OccupancyBuilding[]>('/reports/occupancy/', { params: building ? { building } : {} }),
  availableRooms: (params?: Record<string, string>) =>
    api.get<Room[]>('/reports/available-rooms/', { params }),
  debtors: () => api.get<Debtor[]>('/reports/debtors/'),
  payments: (params?: Record<string, string>) =>
    api.get<{ payments: Payment[]; total: string; count: number }>('/reports/payments/', { params }),
  residents: (params?: Record<string, string>) =>
    api.get<Resident[]>('/reports/residents/', { params }),
}

// Audit
export const auditApi = {
  list: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<AuditLog>>('/audit/', { params }),
}

// Access Events
export const accessEventsApi = {
  list: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<AccessEvent>>('/access-events/', { params }),
}
