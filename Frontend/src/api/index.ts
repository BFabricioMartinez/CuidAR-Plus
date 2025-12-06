// Punto de entrada centralizado para todas las APIs

export { apiClient, ApiError } from './client';
export { authApi } from './auth';
export { patientsApi } from './patients';
export { treatmentsApi } from './treatments';
export { intakesApi } from './intakes';
export { statisticsApi } from './statistics';

// Re-exportar tipos
export type * from '../types/api';
