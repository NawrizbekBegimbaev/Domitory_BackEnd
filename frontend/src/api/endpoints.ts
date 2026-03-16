import api from './client'
import type {
  User, Organization, Building, Floor, Room, Resident, Guardian,
  Contract, RoomAssignment, TariffPlan, Charge, Payment,
  AuditLog, SummaryReport, OccupancyBuilding, Debtor,
  PaginatedResponse,
} from '../types'

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ access: string; refresh: string; user_id: string }>('/auth/login/', { email, password }),
  refresh: (refresh: string) =>
    api.post<{ access: string }>('/auth/refresh/', { refresh }),
  me: () => api.get<User>('/auth/me/'),
}

// Users
export const usersApi = {
  list: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<User>>('/users/', { params }),
  get: (id: string) => api.get<User>(`/users/${id}/`),
  create: (data: Record<string, unknown>) => api.post<User>('/users/', data),
  update: (id: string, data: Record<string, unknown>) => api.put<User>(`/users/${id}/`, data),
  delete: (id: string) => api.delete(`/users/${id}/`),
}

// Buildings
export const buildingsApi = {
  list: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<Building>>('/buildings/', { params }),
  get: (id: string) => api.get<Building>(`/buildings/${id}/`),
  create: (data: Record<string, unknown>) => api.post<Building>('/buildings/', data),
  update: (id: string, data: Record<string, unknown>) => api.put<Building>(`/buildings/${id}/`, data),
}

// Floors
export const floorsApi = {
  list: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<Floor>>('/floors/', { params }),
  create: (data: Record<string, unknown>) => api.post<Floor>('/floors/', data),
}

// Rooms
export const roomsApi = {
  list: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<Room>>('/rooms/', { params }),
  get: (id: string) => api.get<Room>(`/rooms/${id}/`),
  create: (data: Record<string, unknown>) => api.post<Room>('/rooms/', data),
  update: (id: string, data: Record<string, unknown>) => api.put<Room>(`/rooms/${id}/`, data),
}

// Residents
export const residentsApi = {
  list: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<Resident>>('/residents/', { params }),
  get: (id: string) => api.get<Resident>(`/residents/${id}/`),
  create: (data: Record<string, unknown>) => api.post<Resident>('/residents/', data),
  update: (id: string, data: Record<string, unknown>) => api.put<Resident>(`/residents/${id}/`, data),
  guardians: (id: string) => api.get<Guardian[]>(`/residents/${id}/guardians/`),
  balance: (id: string) =>
    api.get<{ total_charges: string; total_paid: string; total_payments: string; debt: string }>(
      `/residents/${id}/balance/`,
    ),
}

// Contracts
export const contractsApi = {
  list: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<Contract>>('/contracts/', { params }),
  get: (id: string) => api.get<Contract>(`/contracts/${id}/`),
  create: (data: Record<string, unknown>) => api.post<Contract>('/contracts/', data),
  terminate: (id: string) => api.post(`/contracts/${id}/terminate/`),
}

// Assignments
export const assignmentsApi = {
  list: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<RoomAssignment>>('/assignments/', { params }),
  create: (data: Record<string, unknown>) => api.post<RoomAssignment>('/assignments/', data),
  close: (id: string) => api.post(`/assignments/${id}/close/`),
  transfer: (id: string, data: Record<string, unknown>) => api.post(`/assignments/${id}/transfer/`, data),
}

// Tariffs
export const tariffsApi = {
  list: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<TariffPlan>>('/tariffs/', { params }),
  create: (data: Record<string, unknown>) => api.post<TariffPlan>('/tariffs/', data),
}

// Charges
export const chargesApi = {
  list: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<Charge>>('/charges/', { params }),
  generate: (data: Record<string, unknown>) => api.post('/charges/generate/', data),
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
    api.get('/reports/available-rooms/', { params }),
  debtors: () => api.get<Debtor[]>('/reports/debtors/'),
  payments: (params?: Record<string, string>) => api.get('/reports/payments/', { params }),
  residents: (params?: Record<string, string>) => api.get('/reports/residents/', { params }),
}

// Organizations
export const organizationsApi = {
  list: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<Organization>>('/organizations/', { params }),
  get: (id: string) => api.get<Organization>(`/organizations/${id}/`),
  create: (data: Record<string, unknown>) => api.post<Organization>('/organizations/', data),
  update: (id: string, data: Record<string, unknown>) => api.put<Organization>(`/organizations/${id}/`, data),
}

// Discounts
export const discountsApi = {
  list: (params?: Record<string, string>) => api.get('/discounts/', { params }),
  create: (data: Record<string, unknown>) => api.post('/discounts/', data),
}

// Audit
export const auditApi = {
  list: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<AuditLog>>('/audit/', { params }),
}
