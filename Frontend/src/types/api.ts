// Tipos TypeScript para todas las respuestas de la API

// ============================================
// AUTENTICACIÓN
// ============================================

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  role?: 'ADMIN' | 'ASISTENCIAL' | 'PERSONAL';
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface User {
  id: number;
  name: string | null;
  email: string;
  role: 'ADMIN' | 'ASISTENCIAL' | 'PERSONAL';
  active: boolean;
}

// ============================================
// PAGINACIÓN
// ============================================

export interface PaginatedRequest<T = any> {
  limit?: number;
  last_seen_id?: number | null;
  filters?: T;
}

export interface PaginatedResponse<T> {
  items: T[];
  next_cursor: number | null;
}

// ============================================
// PACIENTES
// ============================================

export interface Patient {
  id: number;
  name: string;
  caregiver_id: number;
  active: boolean;
  notes: string | null;
  caregiver?: {
    id: number;
    name: string | null;
    email: string;
  } | null;
  treatments_count?: number;
}

export interface PatientFilters {
  search?: string;
  name?: string;
  active?: boolean;
  caregiver_id?: number;
  order?: 'asc' | 'desc';
}

export interface CreatePatientRequest {
  name: string;
  caregiver_id?: number | null;
  notes?: string;
}

export interface UpdatePatientRequest {
  id: number;
  name?: string;
  caregiver_id?: number;
  notes?: string;
  active?: boolean;
}

// ============================================
// TRATAMIENTOS
// ============================================

export interface Treatment {
  id: number;
  patient_id: number;
  medication_id: number | null;
  medication_name: string;
  dosage: string | null;
  frequency: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  active: boolean;
  patient?: {
    id: number;
    name: string;
    caregiver_id: number;
  } | null;
  medication?: {
    id: number;
    name: string;
    description: string | null;
  } | null;
  intake_logs_count?: number;
}

export interface TreatmentFilters {
  search?: string;
  medication_name?: string;
  patient_id?: number;
  active?: boolean;
  order?: 'asc' | 'desc';
}

export interface CreateTreatmentRequest {
  patient_id: number;
  medication_name: string;
  dosage?: string;
  frequency: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  notes?: string;
}

export interface UpdateTreatmentRequest {
  id: number;
  patient_id?: number;
  medication_name?: string;
  dosage?: string;
  frequency?: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  notes?: string;
  active?: boolean;
}

// ============================================
// TOMAS / INTAKE LOGS
// ============================================

export interface IntakeLog {
  id: number;
  treatment_id: number;
  taken_at: string;
  status: string;
  treatment?: {
    id: number;
    medication_name: string;
    dosage: string | null;
    frequency: string;
    description: string | null;
    patient_id: number;
  } | null;
  patient?: {
    id: number;
    name: string;
    caregiver_id: number;
  } | null;
  medication?: {
    id: number;
    name: string;
    description: string | null;
  } | null;
}

export interface IntakeFilters {
  treatment_id?: number;
  patient_id?: number;
  status?: string;
  order?: 'asc' | 'desc';
}

export interface CreateIntakeRequest {
  treatment_id: number;
  taken_at: string;
  status: string;
}

export interface UpdateIntakeRequest {
  id: number;
  treatment_id?: number;
  taken_at?: string;
  status?: string;
}

// ============================================
// ESTADÍSTICAS
// ============================================

export interface OverviewStats {
  active_users: number;
  total_patients: number;
  active_treatments: number;
  today_doses: {
    taken: number;
    missed: number;
    total: number;
    adherence_percentage: number | null;
  };
}

export interface MyStats {
  assigned_patients?: number;
  today_doses: {
    taken: number;
    missed: number;
    total: number;
    adherence_percentage: number | null;
  };
}

// ============================================
// RESPUESTAS GENÉRICAS
// ============================================

export interface MessageResponse {
  message: string;
}

export interface CreateResponse<T> {
  message: string;
  data: T;
}
