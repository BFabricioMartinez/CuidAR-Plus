import { useState, useCallback } from 'react';
import { treatmentsApi, patientsApi, statisticsApi, ApiError } from '../../api';
import type { Treatment, OverviewStats } from '../../api';

export interface UpcomingDose {
  treatment_id: number;
  med_name: string;
  dosage: string;
  time: string;
  frequency: string;
}

export const useDashboard = () => {
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [upcomingDoses, setUpcomingDoses] = useState<UpcomingDose[]>([]);
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Parsear horarios desde frecuencia
  const parseTimesFromFrequency = useCallback((frequency: string): string[] => {
    const times: string[] = [];
    const regex = /\b(\d{1,2}):(\d{2})\b/g;
    let match;

    while ((match = regex.exec(frequency)) !== null) {
      const hour = match[1].padStart(2, '0');
      const minute = match[2];
      times.push(`${hour}:${minute}`);
    }

    return [...new Set(times)].sort();
  }, []);

  // Calcular dosis pendientes de hoy
  const calculateUpcomingDoses = useCallback(
    (treatmentsList: Treatment[]) => {
      const doses: UpcomingDose[] = [];

      treatmentsList.forEach((treatment) => {
        const times = parseTimesFromFrequency(treatment.frequency);

        times.forEach((time) => {
          doses.push({
            treatment_id: treatment.id,
            med_name: treatment.medication_name,
            dosage: treatment.dosage || '',
            time,
            frequency: treatment.frequency,
          });
        });
      });

      // Ordenar por hora
      doses.sort((a, b) => a.time.localeCompare(b.time));
      setUpcomingDoses(doses);
    },
    [parseTimesFromFrequency]
  );

  // Cargar todo el dashboard
  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      // Cargar estadísticas generales
      const statsData = await statisticsApi.overview();
      setStats(statsData);

      // Obtener pacientes del usuario (para rol PERSONAL, debería ser solo 1)
      const patientsResponse = await patientsApi.list({
        limit: 1,
        filters: { active: true },
      });

      if (patientsResponse.items.length > 0) {
        const myPatient = patientsResponse.items[0];

        // Cargar tratamientos del paciente
        const treatmentsData = await treatmentsApi.getByPatient(myPatient.id);
        setTreatments(treatmentsData.treatments);
        calculateUpcomingDoses(treatmentsData.treatments);
      } else {
        setTreatments([]);
        setUpcomingDoses([]);
      }
    } catch (err) {
      const errorMsg =
        err instanceof ApiError
          ? err.message
          : 'Error al cargar el dashboard';
      setError(errorMsg);
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, [calculateUpcomingDoses]);

  return {
    treatments,
    upcomingDoses,
    stats,
    loading,
    error,
    fetchDashboard,
  };
};
