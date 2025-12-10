import { useState, useCallback } from 'react';
import { treatmentsApi, patientsApi, statisticsApi, intakesApi, ApiError } from '../../api';
import type { Treatment, OverviewStats, IntakeLog } from '../../api';

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

  // Calcular dosis pendientes de hoy (filtrando las ya registradas)
  const calculateUpcomingDoses = useCallback(
    async (treatmentsList: Treatment[], patientId: number) => {
      const doses: UpcomingDose[] = [];

      try {
        // Obtener todos los registros de tomas de hoy
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const intakesResponse = await intakesApi.list({
          filters: { patient_id: patientId },
        });

        // Crear un Set de dosis ya registradas hoy (treatment_id + time)
        const todayIntakes = new Set<string>();
        intakesResponse.items.forEach((intake: IntakeLog) => {
          if (intake.taken_at) {
            const intakeDate = new Date(intake.taken_at);
            if (intakeDate.toDateString() === today.toDateString()) {
              const time = intakeDate.toTimeString().slice(0, 5); // HH:MM
              todayIntakes.add(`${intake.treatment_id}-${time}`);
            }
          }
        });

        // Generar dosis solo si no están registradas
        treatmentsList.forEach((treatment) => {
          const times = parseTimesFromFrequency(treatment.frequency);

          times.forEach((time) => {
            const doseKey = `${treatment.id}-${time}`;

            // Solo agregar si no está registrada hoy
            if (!todayIntakes.has(doseKey)) {
              doses.push({
                treatment_id: treatment.id,
                med_name: treatment.medication_name,
                dosage: treatment.dosage || '',
                time,
                frequency: treatment.frequency,
              });
            }
          });
        });

        // Ordenar por hora
        doses.sort((a, b) => a.time.localeCompare(b.time));
        setUpcomingDoses(doses);
      } catch (err) {
        console.error('Error calculating upcoming doses:', err);
        // En caso de error, mostrar todas las dosis
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
        doses.sort((a, b) => a.time.localeCompare(b.time));
        setUpcomingDoses(doses);
      }
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
        await calculateUpcomingDoses(treatmentsData.treatments, myPatient.id);
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
