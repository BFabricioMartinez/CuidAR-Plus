import { apiClient } from './client';
import type { OverviewStats, MyStats } from '../types/api';

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
};
