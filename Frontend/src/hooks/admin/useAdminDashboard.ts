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
  // Estados principales
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [patientsAdherence, setPatientsAdherence] = useState<PatientAdherence[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Obtener estadísticas generales
  const fetchOverviewStats = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const data = await statisticsApi.overview();
      setStats(data);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Error al cargar estadísticas');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Obtener adherencia de todos los pacientes
  const fetchPatientsAdherence = useCallback(async () => {
    try {
      // Obtener todos los pacientes activos
      const patientsResponse = await patientsApi.list({
        limit: 100,
        filters: {
          active: true,
        },
      });

      const patients = patientsResponse.items;

      // Obtener adherencia de cada paciente (últimos 7 días)
      const adherencePromises = patients.map(async (patient: Patient) => {
        try {
          // Nota: Este endpoint puede no existir aún, manejamos el error
          const adherenceRes = await fetch(
            `http://localhost:8000/statistics/patients/${patient.id}/adherence?days=7`,
            {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
              },
            }
          );

          if (!adherenceRes.ok) return null;

          const adherenceData = await adherenceRes.json();
          return adherenceData;
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
    } catch (err: any) {
      console.error('Error adherencia:', err);
    }
  }, []);

  // Cargar todos los datos del dashboard
  const fetchDashboard = useCallback(async () => {
    await Promise.all([fetchOverviewStats(), fetchPatientsAdherence()]);
  }, [fetchOverviewStats, fetchPatientsAdherence]);

  return {
    // Estados
    stats,
    patientsAdherence,
    loading,
    error,
    successMessage,

    // Funciones
    fetchDashboard,
    fetchOverviewStats,
    fetchPatientsAdherence,
  };
};
