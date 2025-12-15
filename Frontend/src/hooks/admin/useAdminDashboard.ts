import { useState, useCallback, useEffect } from 'react';
import { statisticsApi, patientsApi, ApiError } from '../../api';
import type { OverviewStats, Patient } from '../../api';

// ============================================
// TIPOS
// ============================================

export interface PatientAdherence {
  patient_id: number;
  patient_name: string;
  summary: {
    taken_count: number;
    missed_count: number;
    total_count: number;
    adherence_percentage: number | null;
  };
}

// ============================================
// HOOK useAdminDashboard
// ============================================

export const useAdminDashboard = () => {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [patientsAdherence, setPatientsAdherence] = useState<PatientAdherence[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Cargar estadísticas generales
  const fetchOverviewStats = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const statsData = await statisticsApi.overview();
      setStats(statsData);
    } catch (err) {
      const errorMsg =
        err instanceof ApiError ? err.message : 'Error al cargar estadísticas';
      setError(errorMsg);
      console.error('Error loading overview stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Obtener adherencia de todos los pacientes
  const fetchPatientsAdherence = useCallback(async () => {
    try {
      // Obtener todos los pacientes
      const patientsResponse = await patientsApi.list({
        limit: 100, // Límite alto para obtener todos
        filters: {},
      });

      const patients = patientsResponse.items;

      // Obtener adherencia de cada paciente (últimos 7 días)
      // Nota: Este endpoint puede no existir, así que lo manejamos con try-catch
      const adherencePromises = patients.map(async (patient: Patient) => {
        try {
          const token = localStorage.getItem('token');
          const adherenceRes = await fetch(
            `http://localhost:8000/statistics/patients/${patient.id}/adherence?days=7`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (!adherenceRes.ok) return null;

          const adherenceData = await adherenceRes.json();
          return {
            patient_id: patient.id,
            patient_name: patient.name,
            summary: adherenceData.summary || {
              taken_count: 0,
              missed_count: 0,
              total_count: 0,
              adherence_percentage: null,
            },
          };
        } catch {
          return null;
        }
      });

      const adherenceResults = await Promise.all(adherencePromises);
      const validAdherence = adherenceResults.filter((a) => a !== null) as PatientAdherence[];

      // Ordenar por adherencia (menor a mayor para ver los más problemáticos)
      validAdherence.sort((a, b) => {
        const adhA = a.summary.adherence_percentage || 0;
        const adhB = b.summary.adherence_percentage || 0;
        return adhA - adhB;
      });

      setPatientsAdherence(validAdherence.slice(0, 10)); // Top 10
    } catch (err) {
      console.error('Error loading patients adherence:', err);
      // No mostramos error al usuario, es información secundaria
    }
  }, []);

  // Cargar todo el dashboard
  const fetchDashboard = useCallback(async () => {
    await Promise.all([fetchOverviewStats(), fetchPatientsAdherence()]);
  }, [fetchOverviewStats, fetchPatientsAdherence]);

  // Effect: Cargar datos al montar
  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return {
    // Estados
    stats,
    patientsAdherence,
    loading,
    error,

    // Funciones
    fetchDashboard,
    fetchOverviewStats,
    fetchPatientsAdherence,
  };
};

