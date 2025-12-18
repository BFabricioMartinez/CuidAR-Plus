import { useState, useCallback } from 'react';
import { statisticsApi, ApiError } from '../../api';
import type { OverviewStats } from '../../api';

// ============================================
// TIPOS
// ============================================

export interface PatientAdherence {
  patient_id: number;
  patient_name: string;
  adherence_percentage: number | null;
  taken: number;
  missed: number;
  total: number;
}

export interface AdherenceTrend {
  date: string;
  taken: number;
  missed: number;
  total: number;
  adherence_percentage: number;
}

export interface CaregiverStats {
  caregiver_id: number;
  caregiver_name: string;
  patient_count: number;
}

// ============================================
// HOOK useAdminDashboard
// ============================================

export const useAdminDashboard = () => {
  // Estados principales
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [patientsAdherence, setPatientsAdherence] = useState<PatientAdherence[]>([]);
  const [adherenceTrend, setAdherenceTrend] = useState<AdherenceTrend[]>([]);
  const [caregiverStats, setCaregiverStats] = useState<CaregiverStats[]>([]);
  const [topPatients, setTopPatients] = useState<{ best: PatientAdherence[]; worst: PatientAdherence[] }>({ best: [], worst: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Obtener estadísticas generales
  const fetchOverviewStats = useCallback(async () => {
    try {
      const data = await statisticsApi.overview();
      setStats(data);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Error al cargar estadísticas');
      }
    }
  }, []);

  // Calcular adherencia por paciente (últimos 7 días) - Todos los pacientes
  const calculatePatientsAdherence = useCallback(async () => {
    try {
      // Usar endpoint optimizado
      const response = await statisticsApi.adminPatientsAdherence();
      const adherenceData = response.patients;

      setPatientsAdherence(adherenceData);

      // Top 5 mejores y peores
      const best = adherenceData.slice(0, 5);
      const worst = [...adherenceData].reverse().slice(0, 5);
      setTopPatients({ best, worst });
    } catch (err: any) {
      console.error('Error calculando adherencia de pacientes:', err);
      setPatientsAdherence([]);
    }
  }, []);

  // Calcular tendencia de adherencia (últimos 7 días)
  const calculateAdherenceTrend = useCallback(async () => {
    try {
      // Usar endpoint optimizado
      const response = await statisticsApi.adminAdherenceTrend();
      setAdherenceTrend(response.trend);
    } catch (err: any) {
      console.error('Error calculando tendencia:', err);
      setAdherenceTrend([]);
    }
  }, []);

  // Calcular distribución de pacientes por cuidador
  const calculateCaregiverStats = useCallback(async () => {
    try {
      // Usar endpoint optimizado
      const response = await statisticsApi.adminCaregiverStats();
      setCaregiverStats(response.caregivers);
    } catch (err: any) {
      console.error('Error calculando estadísticas de cuidadores:', err);
      setCaregiverStats([]);
    }
  }, []);

  // Cargar todos los datos del dashboard
  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      await Promise.all([
        fetchOverviewStats(),
        calculatePatientsAdherence(),
        calculateAdherenceTrend(),
        calculateCaregiverStats(),
      ]);
    } catch (err: any) {
      console.error('Error cargando dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, [
    fetchOverviewStats,
    calculatePatientsAdherence,
    calculateAdherenceTrend,
    calculateCaregiverStats,
  ]);

  return {
    // Estados
    stats,
    patientsAdherence,
    adherenceTrend,
    caregiverStats,
    topPatients,
    loading,
    error,

    // Funciones
    fetchDashboard,
  };
};
