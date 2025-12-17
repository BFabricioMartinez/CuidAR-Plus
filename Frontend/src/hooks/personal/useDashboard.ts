import { useState, useCallback } from 'react';
import { treatmentsApi, patientsApi, statisticsApi, intakesApi, authApi, ApiError } from '../../api';
import type { Treatment, PersonalStats } from '../../api';

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
  const [stats, setStats] = useState<PersonalStats | null>(null);
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

      // Obtener todos los intakes de hoy para este paciente
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

      try {
        // Obtener historial de intakes del paciente filtrado por hoy
        const intakesResponse = await intakesApi.getPatientHistory(patientId);

        // Filtrar solo los intakes de hoy
        const todayIntakes = intakesResponse.intakes.filter(intake => {
          if (!intake.taken_at) return false;
          const intakeDate = new Date(intake.taken_at);
          return intakeDate >= startOfDay && intakeDate <= endOfDay;
        });

        // Crear un Set con las claves de dosis ya registradas (treatment_id + hora programada)
        // Usar scheduled_time (hora programada) en lugar de extraer hora de taken_at
        const registeredDoses = new Set<string>();
        todayIntakes.forEach(intake => {
          if (intake.treatment_id) {
            // Usar scheduled_time si existe (hora programada), sino fallback a hora de taken_at
            let time: string;
            if (intake.scheduled_time) {
              time = intake.scheduled_time; // Hora programada (ej: "08:00")
            } else if (intake.taken_at) {
              // Fallback para registros antiguos sin scheduled_time
              const intakeDate = new Date(intake.taken_at);
              const hour = String(intakeDate.getHours()).padStart(2, '0');
              const minute = String(intakeDate.getMinutes()).padStart(2, '0');
              time = `${hour}:${minute}`;
            } else {
              return; // Skip si no hay ni scheduled_time ni taken_at
            }
            const key = `${intake.treatment_id}-${time}`;
            registeredDoses.add(key);
          }
        });

        // Generar dosis de todos los tratamientos activos
        treatmentsList.forEach((treatment) => {
          const times = parseTimesFromFrequency(treatment.frequency);

          times.forEach((time) => {
            const doseKey = `${treatment.id}-${time}`;

            // Solo agregar si NO está registrada
            if (!registeredDoses.has(doseKey)) {
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
        console.error('Error al filtrar dosis registradas:', err);
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
      // ============================================================================
      // FIX: Para rol PERSONAL, el usuario es su propio cuidador
      // User.id === Patient.caregiver_id (NO Patient.id, porque los pacientes
      // pueden existir sin usuario y los IDs van desincronizados)
      // ============================================================================
      const currentUser = authApi.getStoredUser();
      if (!currentUser) {
        throw new Error('No se encontró información del usuario');
      }

      try {
        // Obtener el paciente donde caregiver_id coincide con el usuario actual
        const patientsResponse = await patientsApi.list({
          limit: 1,
          filters: {
            caregiver_id: currentUser.id,
            active: true
          },
        });

        if (patientsResponse.items.length > 0) {
          const myPatient = patientsResponse.items[0];

          // Cargar tratamientos del paciente
          const treatmentsData = await treatmentsApi.getByPatient(myPatient.id);
          setTreatments(treatmentsData.treatments);
          await calculateUpcomingDoses(treatmentsData.treatments, myPatient.id);

          // Cargar estadísticas específicas del usuario PERSONAL
          // Esto mostrará solo las estadísticas de este paciente específico
          const statsData = await statisticsApi.personalStats(currentUser.id);
          setStats(statsData);
        } else {
          setTreatments([]);
          setUpcomingDoses([]);
          // Si no hay paciente, usar estadísticas vacías
          setStats({
            today_doses: {
              taken: 0,
              missed: 0,
              adherence_percentage: 0
            }
          });
        }
      } catch (patientErr) {
        // Si no se encuentra el paciente, mostrar mensaje apropiado
        console.error('Error al obtener datos del paciente:', patientErr);
        setTreatments([]);
        setUpcomingDoses([]);
        setStats({
          today_doses: {
            taken: 0,
            missed: 0,
            adherence_percentage: 0
          }
        });
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
