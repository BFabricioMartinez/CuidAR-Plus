import { apiClient } from './client';
import type {
  IntakeLog,
  IntakeFilters,
  PaginatedRequest,
  PaginatedResponse,
  CreateIntakeRequest,
  UpdateIntakeRequest,
  MessageResponse,
  CreateResponse,
} from '../types/api';

export const intakesApi = {
  /**
   * POST /intake/paginated
   * Lista paginada de registros de tomas con filtros
   */
  list: async (
    request: PaginatedRequest<IntakeFilters> = {}
  ): Promise<PaginatedResponse<IntakeLog>> => {
    const response = await apiClient.post<{ intakes: IntakeLog[]; next_cursor: number | null }>(
      '/intake/paginated',
      request
    );
    return {
      items: response.intakes,
      next_cursor: response.next_cursor,
    };
  },

  /**
   * GET /intake/{intake_id}
   * Obtiene un registro de toma por ID
   */
  getById: async (intakeId: number): Promise<IntakeLog> => {
    return apiClient.get<IntakeLog>(`/intake/${intakeId}`);
  },

  /**
   * POST /intake/create
   * Crea un nuevo registro de toma
   */
  create: async (data: CreateIntakeRequest): Promise<CreateResponse<IntakeLog>> => {
    return apiClient.post<CreateResponse<IntakeLog>>('/intake/create', data);
  },

  /**
   * PUT /intake/update
   * Actualiza un registro de toma existente
   */
  update: async (data: UpdateIntakeRequest): Promise<MessageResponse> => {
    return apiClient.put<MessageResponse>('/intake/update', data);
  },

  /**
   * GET /intake/treatment/{treatment_id}
   * Obtiene todos los registros de toma de un tratamiento
   */
  getByTreatment: async (
    treatmentId: number
  ): Promise<{ intakes: IntakeLog[]; count: number }> => {
    return apiClient.get<{ intakes: IntakeLog[]; count: number }>(
      `/intake/treatment/${treatmentId}`
    );
  },

  /**
   * GET /intake/patient/{patient_id}/history
   * Obtiene el historial completo de tomas de un paciente
   */
  getPatientHistory: async (
    patientId: number
  ): Promise<{ intakes: IntakeLog[]; count: number; patient_id: number }> => {
    return apiClient.get<{ intakes: IntakeLog[]; count: number; patient_id: number }>(
      `/intake/patient/${patientId}/history`
    );
  },
};
