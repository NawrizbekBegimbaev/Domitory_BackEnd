export interface User {
  id: string
  email: string
  full_name: string
  role: { name: string; description: string } | null
  organization: { id: string; name: string; short_name: string } | null
  phone_number: string
  is_active: boolean
}

export interface Organization {
  id: string
  name: string
  short_name: string
  org_type: string
  status: string
  contact_email: string
  contact_phone: string
  address: string
}

export interface Building {
  id: string
  name: string
  address: string
  gender_policy: string
  is_active: boolean
  organization: string
}

export interface Floor {
  id: string
  building: string
  number: number
  description: string
}

export interface Room {
  id: string
  floor: string
  room_number: string
  capacity: number
  current_occupancy: number
  gender_policy: string
  status: string
  monthly_price: string
}

export interface Resident {
  id: string
  full_name: string
  birth_date: string | null
  gender: string
  phone_number: string
  email: string
  university_id: string
  faculty: string
  course: number | null
  status: string
  notes: string
  organization: string
}

export interface Guardian {
  id: string
  resident: string
  full_name: string
  relationship: string
  phone_number: string
  is_emergency_contact: boolean
}

export interface Contract {
  id: string
  resident: string
  resident_name?: string
  building: string
  building_name?: string
  contract_number: string
  start_date: string
  end_date: string
  status: string
}

export interface RoomAssignment {
  id: string
  contract: string
  resident: string
  resident_name?: string
  room: string
  room_number?: string
  start_date: string
  end_date: string | null
  status: string
}

export interface TariffPlan {
  id: string
  name: string
  amount: string
  billing_period: string
  is_active: boolean
}

export interface Charge {
  id: string
  resident: string
  period_month: number
  period_year: number
  amount: string
  status: string
  due_date: string
}

export interface Payment {
  id: string
  resident: string
  amount: string
  payment_date: string
  payment_method: string
  status: string
  recorded_by: string | null
  notes: string
}

export interface AuditLog {
  id: string
  user: string
  user_name?: string
  action: string
  model_name: string
  object_id: string
  changes: Record<string, unknown>
  ip_address: string
  timestamp: string
}

export interface SummaryReport {
  total_residents: number
  free_beds: number
  total_debt: string
  collected_this_month: string
}

export interface OccupancyFloor {
  floor_number: number
  rooms: number
  capacity: number
  occupancy: number
  free: number
  percentage: number
}

export interface OccupancyBuilding {
  building_id: string
  building_name: string
  capacity: number
  occupancy: number
  free: number
  percentage: number
  floors: OccupancyFloor[]
}

export interface Debtor {
  id: string
  full_name: string
  university_id: string
  faculty: string
  phone_number: string
  total_charged: string
  total_allocated: string
  debt: string
}

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}
