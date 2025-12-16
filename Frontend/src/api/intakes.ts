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

  /**
   * POST /tomas/marcar-tomada
   * Marca una dosis como TOMADA
   * @param treatmentId - ID del tratamiento
   * @param time - Hora de la dosis en formato HH:MM
   * @param recordedByUserId - ID del usuario que registra la toma
   */
  markAsTaken: async (
    treatmentId: number,
    time: string,
    recordedByUserId: number
  ): Promise<{ message: string }> => {
    // ============================================================================
    // FIX: taken_at debe ser la hora ACTUAL cuando se marca la dosis, no la hora programada
    // time = hora programada (scheduled_time)
    // taken_at_full = hora actual (cuando el usuario marca la dosis)
    // ============================================================================
    const now = new Date(); // Hora actual, NO modificar con la hora programada

    // Formatear como "YYYY-MM-DD HH:mm:ss" (sin timezone)
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    const second = String(now.getSeconds()).padStart(2, '0');
    const taken_at_full = `${year}-${month}-${day} ${hour}:${minute}:${second}`;

    return apiClient.post<{ message: string }>(
      `/tomas/marcar-tomada?treatment_id=${treatmentId}&time=${time}&recorded_by_user_id=${recordedByUserId}&taken_at_full=${encodeURIComponent(taken_at_full)}`
    );
  },

  /**
   * POST /tomas/marcar-omitida
   * Marca una dosis como OMITIDA
   * @param treatmentId - ID del tratamiento
   * @param time - Hora de la dosis en formato HH:MM
   * @param recordedByUserId - ID del usuario que registra la omisión
   */
  markAsMissed: async (
    treatmentId: number,
    time: string,
    recordedByUserId: number
  ): Promise<{ message: string }> => {
    // ============================================================================
    // FIX: taken_at debe ser la hora ACTUAL cuando se marca la dosis, no la hora programada
    // time = hora programada (scheduled_time)
    // taken_at_full = hora actual (cuando el usuario marca la dosis)
    // ============================================================================
    const now = new Date(); // Hora actual, NO modificar con la hora programada

    // Formatear como "YYYY-MM-DD HH:mm:ss" (sin timezone)
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    const second = String(now.getSeconds()).padStart(2, '0');
    const taken_at_full = `${year}-${month}-${day} ${hour}:${minute}:${second}`;

    return apiClient.post<{ message: string }>(
      `/tomas/marcar-omitida?treatment_id=${treatmentId}&time=${time}&recorded_by_user_id=${recordedByUserId}&taken_at_full=${encodeURIComponent(taken_at_full)}`
    );
  },
};
