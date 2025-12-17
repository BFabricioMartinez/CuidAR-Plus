import { apiClient } from './client';
import type {
  OverviewStats,
  MyStats,
  PersonalStats,
  PatientsAdherenceResponse,
  AdherenceTrendResponse,
  CaregiverStatsResponse,
} from '../types/api';

export const statisticsApi = {
  /**
   * GET /statistics/overview
   * Obtiene estadísticas generales del sistema
   */
  overview: async (): Promise<OverviewStats> => {
    return apiClient.get<OverviewStats>('/statistics/overview');
  },

  /**
   * GET /statistics/my-stats?user_id={userId}
   * Obtiene estadísticas específicas de un cuidador (rol ASISTENCIAL)
   * Incluye: cantidad de pacientes asignados, dosis tomadas/omitidas hoy, adherencia
   */
  myStats: async (userId: number): Promise<MyStats> => {
    return apiClient.get<MyStats>(`/statistics/my-stats?user_id=${userId}`);
  },

  /**
   * GET /statistics/personal-stats?user_id={userId}
   * Obtiene estadísticas específicas de un usuario (rol PERSONAL)
   * Incluye: dosis tomadas/omitidas hoy, adherencia del paciente del usuario
   */
  personalStats: async (userId: number): Promise<PersonalStats> => {
    return apiClient.get<PersonalStats>(`/statistics/personal-stats?user_id=${userId}`);
  },

  // ============================================
  // ENDPOINTS ADMIN OPTIMIZADOS
  // ============================================

  /**
   * GET /statistics/admin/patients-adherence
   * Obtiene adherencia de todos los pacientes (últimos 7 días)
   * Optimiza múltiples llamadas a /intake/patient/{id}/history
   */
  adminPatientsAdherence: async (): Promise<PatientsAdherenceResponse> => {
    return apiClient.get<PatientsAdherenceResponse>('/statistics/admin/patients-adherence');
  },

  /**
   * GET /statistics/admin/adherence-trend
   * Obtiene tendencia de adherencia global (últimos 7 días, agrupado por día)
   * Optimiza múltiples llamadas a /intake/patient/{id}/history
   */
  adminAdherenceTrend: async (): Promise<AdherenceTrendResponse> => {
    return apiClient.get<AdherenceTrendResponse>('/statistics/admin/adherence-trend');
  },

  /**
   * GET /statistics/admin/caregiver-stats
   * Obtiene estadísticas de cuidadores (cantidad de pacientes asignados)
   * Optimiza múltiples llamadas a /user/{id} y /assignment/paginated
   */
  adminCaregiverStats: async (): Promise<CaregiverStatsResponse> => {
    return apiClient.get<CaregiverStatsResponse>('/statistics/admin/caregiver-stats');
  },
};
