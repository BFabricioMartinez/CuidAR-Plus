import { apiClient } from './client';
import type {
  Treatment,
  TreatmentFilters,
  PaginatedRequest,
  PaginatedResponse,
  CreateTreatmentRequest,
  UpdateTreatmentRequest,
  MessageResponse,
  CreateResponse,
} from '../types/api';

export const treatmentsApi = {
  /**
   * POST /treatment/paginated
   * Lista paginada de tratamientos con filtros
   */
  list: async (
    request: PaginatedRequest<TreatmentFilters> = {}
  ): Promise<PaginatedResponse<Treatment>> => {
    const response = await apiClient.post<{ treatments: Treatment[]; next_cursor: number | null }>(
      '/treatment/paginated',
      request
    );
    return {
      items: response.treatments,
      next_cursor: response.next_cursor,
    };
  },

  /**
   * GET /treatment/{treatment_id}
   * Obtiene un tratamiento por ID
   */
  getById: async (treatmentId: number): Promise<Treatment> => {
    return apiClient.get<Treatment>(`/treatment/${treatmentId}`);
  },

  /**
   * POST /treatment/create
   * Crea un nuevo tratamiento
   */
  create: async (data: CreateTreatmentRequest): Promise<CreateResponse<Treatment>> => {
    return apiClient.post<CreateResponse<Treatment>>('/treatment/create', data);
  },

  /**
   * PUT /treatment/update
   * Actualiza un tratamiento existente
   */
  update: async (data: UpdateTreatmentRequest): Promise<MessageResponse> => {
    return apiClient.put<MessageResponse>('/treatment/update', data);
  },

  /**
   * PUT /treatment/{treatment_id}/deactivate
   * Desactiva un tratamiento (soft delete)
   */
  deactivate: async (treatmentId: number): Promise<MessageResponse> => {
    return apiClient.put<MessageResponse>(`/treatment/${treatmentId}/deactivate`);
  },

  /**
   * GET /treatment/patient/{patient_id}
   * Obtiene todos los tratamientos activos de un paciente
   */
  getByPatient: async (patientId: number): Promise<{ treatments: Treatment[]; count: number }> => {
    return apiClient.get<{ treatments: Treatment[]; count: number }>(
      `/treatment/patient/${patientId}`
    );
  },
};
