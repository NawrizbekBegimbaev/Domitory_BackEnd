export interface User {
  id: string
  email: string
  full_name: string
  role: { id: number; name: string; description: string } | null
  phone_number: string
  photo: string | null
  is_active: boolean
  date_joined: string
}

export interface Building {
  id: string
  name: string
  address: string
  gender_policy: string
  is_active: boolean
  organization: string
  created_at: string
  updated_at: string
}

export interface Floor {
  id: string
  building: string
  building_name: string
  number: number
  description: string
}

export interface Room {
  id: string
  floor: string
  floor_number: number
  building_name: string
  building_id?: string
  room_number: string
  capacity: number
  current_occupancy: number
  available_beds: number
  gender_policy: string
  status: string
  monthly_price: string
  description?: string
  created_at?: string
  updated_at?: string
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
  photo: string | null
  status: string
  notes: string
  organization: string
  guardians?: Guardian[]
  documents?: ResidentDocument[]
  created_at?: string
  updated_at?: string
}

export interface Guardian {
  id: string
  resident: string
  full_name: string
  relationship: string
  phone_number: string
  is_emergency_contact: boolean
  created_at?: string
  updated_at?: string
}

export interface ResidentDocument {
  id: string
  resident: string
  document_type: string
  document_number: string
  file: string
  created_at: string
  updated_at: string
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
  created_by?: string
  assignments?: RoomAssignment[]
  created_at?: string
  updated_at?: string
}

export interface RoomAssignment {
  id: string
  contract: string
  resident: string
  resident_name?: string
  room: string
  room_number?: string
  building_name?: string
  start_date: string
  end_date: string | null
  status: string
}

export interface StayRecord {
  id: string
  resident: string
  resident_name?: string
  check_in_at: string | null
  check_out_at: string | null
  reason: string
  recorded_by: string | null
  created_at: string
}

export interface TariffPlan {
  id: string
  name: string
  amount: string
  billing_period: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Charge {
  id: string
  resident: string
  resident_name?: string
  tariff_plan: string | null
  period_month: number
  period_year: number
  amount: string
  paid_amount: string
  remaining: string
  status: string
  due_date: string
}

export interface Payment {
  id: string
  resident: string
  resident_name?: string
  amount: string
  payment_date: string
  payment_method: string
  status: string
  recorded_by: string | null
  recorded_by_name?: string | null
  notes: string
  created_at: string
}

export interface Discount {
  id: string
  resident: string
  discount_type: string
  value: string
  reason: string
  start_date: string
  end_date: string | null
  approved_by: string | null
  created_at: string
  updated_at: string
}

export interface BalanceResponse {
  total_charges: string
  total_paid: string
  total_payments: string
  debt: string
}

export interface AuditLog {
  id: string
  user: string
  user_name?: string
  user_email?: string
  action: string
  model_name: string
  object_id: string
  changes: Record<string, unknown>
  ip_address: string | null
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
