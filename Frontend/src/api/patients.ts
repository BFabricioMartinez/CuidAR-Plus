import { apiClient } from './client';
import type {
  Patient,
  PatientFilters,
  PaginatedRequest,
  PaginatedResponse,
  CreatePatientRequest,
  UpdatePatientRequest,
  MessageResponse,
  CreateResponse,
} from '../types/api';

export const patientsApi = {
  /**
   * POST /patient/paginated
   * Lista paginada de pacientes con filtros
   */
  list: async (
    request: PaginatedRequest<PatientFilters> = {}
  ): Promise<PaginatedResponse<Patient>> => {
    const response = await apiClient.post<{ patients: Patient[]; next_cursor: number | null }>(
      '/patient/paginated',
      request
    );
    return {
      items: response.patients,
      next_cursor: response.next_cursor,
    };
  },

  /**
   * GET /patient/{patient_id}
   * Obtiene un paciente por ID
   */
  getById: async (patientId: number): Promise<Patient> => {
    return apiClient.get<Patient>(`/patient/${patientId}`);
  },

  /**
   * POST /patient/create
   * Crea un nuevo paciente
   */
  create: async (data: CreatePatientRequest): Promise<CreateResponse<Patient>> => {
    return apiClient.post<CreateResponse<Patient>>('/patient/create', data);
  },

  /**
   * PUT /patient/update
   * Actualiza un paciente existente
   */
  update: async (data: UpdatePatientRequest): Promise<MessageResponse> => {
    return apiClient.put<MessageResponse>('/patient/update', data);
  },

  /**
   * PUT /patient/{patient_id}/deactivate
   * Desactiva un paciente (soft delete)
   */
  deactivate: async (patientId: number): Promise<MessageResponse> => {
    return apiClient.put<MessageResponse>(`/patient/${patientId}/deactivate`);
  },
};
