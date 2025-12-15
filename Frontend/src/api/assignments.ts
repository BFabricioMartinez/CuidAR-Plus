import { apiClient } from './client';

// ============================================
// TIPOS PARA ASSIGNMENTS
// ============================================

export interface Assignment {
  id: number;
  patient_id: number;
  caregiver_id: number;
  active: boolean;
  created_at?: string;
}

export interface AssignmentWithDetails extends Assignment {
  patient?: {
    id: number;
    name: string;
    caregiver_id?: number;
    active?: boolean;
    notes?: string | null;
  } | null;
  caregiver?: {
    id: number;
    name: string | null;
    email: string;
    role?: string;
  } | null;
}

// ============================================
// API DE ASSIGNMENTS
// ============================================

export const assignmentsApi = {
  /**
   * POST /assignment/paginated
   * Obtiene todas las asignaciones usando el endpoint paginado del backend
   * Opcionalmente filtradas por caregiver_id o patient_id
   */
  getAll: async (caregiverId?: number, patientId?: number): Promise<Assignment[]> => {
    const response = await apiClient.post<{
      assignments: AssignmentWithDetails[];
      next_cursor: number | null;
    }>('/assignment/paginated', {
      limit: 100, // Límite alto para obtener todas
      filters: {
        ...(caregiverId && { caregiver_id: caregiverId }),
        ...(patientId && { patient_id: patientId }),
      },
    });

    // Convertir de AssignmentWithDetails a Assignment simple
    return response.assignments.map((a) => ({
      id: a.id,
      patient_id: a.patient_id,
      caregiver_id: a.caregiver_id,
      active: a.active,
      created_at: a.created_at,
    }));
  },

  /**
   * POST /assignment/paginated con filtro por caregiver_id
   * Obtiene todos los pacientes asignados a un cuidador específico
   * Devuelve un array de assignments
   */
  getMyPatients: async (caregiverId: number): Promise<Assignment[]> => {
    const response = await apiClient.post<{
      assignments: AssignmentWithDetails[];
      next_cursor: number | null;
    }>('/assignment/paginated', {
      limit: 100, // Límite alto para obtener todos los pacientes del cuidador
      filters: {
        caregiver_id: caregiverId,
      },
    });

    // Convertir de AssignmentWithDetails a Assignment simple
    return response.assignments.map((a) => ({
      id: a.id,
      patient_id: a.patient_id,
      caregiver_id: a.caregiver_id,
      active: a.active,
      created_at: a.created_at,
    }));
  },

  /**
   * GET /assignment/{assignment_id}
   * Obtiene una asignación por ID con detalles
   */
  getById: async (assignmentId: number): Promise<AssignmentWithDetails> => {
    return apiClient.get<AssignmentWithDetails>(`/assignment/${assignmentId}`);
  },

  /**
   * POST /assignment/create
   * Crea una nueva asignación
   */
  create: async (data: { caregiver_id: number; patient_id: number }): Promise<{ message: string; assignment: Assignment }> => {
    return apiClient.post<{ message: string; assignment: Assignment }>('/assignment/create', data);
  },

  /**
   * PUT /assignment/{assignment_id}/deactivate
   * Desactiva una asignación (soft delete)
   */
  delete: async (assignmentId: number): Promise<{ message: string }> => {
    return apiClient.put<{ message: string }>(`/assignment/${assignmentId}/deactivate`);
  },
};
