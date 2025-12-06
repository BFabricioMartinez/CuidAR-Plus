import { apiClient } from './client';
import type { OverviewStats } from '../types/api';

export const statisticsApi = {
  /**
   * GET /statistics/overview
   * Obtiene estadísticas generales del sistema
   */
  overview: async (): Promise<OverviewStats> => {
    return apiClient.get<OverviewStats>('/statistics/overview');
  },
};
