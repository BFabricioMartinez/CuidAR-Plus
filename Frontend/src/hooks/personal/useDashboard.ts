import { useState, useCallback } from 'react';
import { treatmentsApi, patientsApi, intakesApi, assignmentsApi, authApi, ApiError } from '../../api';
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

        // Crear un Set con las claves de dosis ya registradas (treatment_id + hora)
        const registeredDoses = new Set<string>();
        todayIntakes.forEach(intake => {
          if (intake.taken_at) {
            const intakeDate = new Date(intake.taken_at);
            const hour = String(intakeDate.getHours()).padStart(2, '0');
            const minute = String(intakeDate.getMinutes()).padStart(2, '0');
            const time = `${hour}:${minute}`;
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

  // Obtener el patient_id del usuario actual
  const getMyPatientId = useCallback(async (): Promise<number | null> => {
    const currentUser = authApi.getStoredUser();
    if (!currentUser || !currentUser.id) {
      return null;
    }

    // Para usuarios PERSONAL, obtener el paciente a través de las asignaciones
    let myPatientId: number | null = null;

    // Buscar asignaciones activas donde el patient_id corresponde a este usuario
    try {
      const assignments = await assignmentsApi.getAll(undefined, currentUser.id);
      if (assignments.length > 0 && assignments[0].active) {
        myPatientId = assignments[0].patient_id;
        return myPatientId;
      }
    } catch {
      // Continuar con otro método
    }

    // Si no se encontró, buscar todas las asignaciones activas y verificar
    // si alguna corresponde a un paciente creado para este usuario
    try {
      const allAssignments = await assignmentsApi.getAll();
      const activeAssignments = allAssignments.filter(a => a.active);
      
      // Para cada asignación, verificar si el paciente fue creado para este usuario
      for (const assignment of activeAssignments) {
        try {
          const patient = await patientsApi.getById(assignment.patient_id);
          // Verificar si el paciente tiene una nota que indica que fue creado para este usuario
          if (patient.notes && patient.notes.includes(currentUser.email)) {
            myPatientId = patient.id;
            return myPatientId;
          }
        } catch {
          continue;
        }
      }
    } catch {
      // Si falla, retornar null
    }

    return null;
  }, []);

  // Calcular estadísticas del paciente manualmente
  const calculatePatientStats = useCallback(async (patientId: number): Promise<OverviewStats> => {
    // Obtener todos los intakes de hoy para este paciente
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    try {
      // Obtener historial de intakes del paciente
      const intakesResponse = await intakesApi.getPatientHistory(patientId);

      // Filtrar solo los intakes de hoy
      const todayIntakes = intakesResponse.intakes.filter(intake => {
        if (!intake.taken_at) return false;
        const intakeDate = new Date(intake.taken_at);
        return intakeDate >= startOfDay && intakeDate <= endOfDay;
      });

      // Contar dosis tomadas y omitidas
      const taken = todayIntakes.filter(i => i.status === 'TAKEN').length;
      const missed = todayIntakes.filter(i => i.status === 'MISSED').length;
      const total = taken + missed;
      const adherence_percentage = total > 0 ? (taken / total) * 100 : null;

      return {
        active_users: 0, // No relevante para usuario PERSONAL
        total_patients: 0, // No relevante para usuario PERSONAL
        active_treatments: 0, // Se puede calcular después si es necesario
        today_doses: {
          taken,
          missed,
          total,
          adherence_percentage,
        },
      };
    } catch (err) {
      console.error('Error calculating patient stats:', err);
      // Retornar estadísticas vacías en caso de error
      return {
        active_users: 0,
        total_patients: 0,
        active_treatments: 0,
        today_doses: {
          taken: 0,
          missed: 0,
          total: 0,
          adherence_percentage: null,
        },
      };
    }
  }, []);

  // Cargar todo el dashboard
  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      // Obtener el patient_id del usuario actual
      const myPatientId = await getMyPatientId();

      if (myPatientId) {
        // Calcular estadísticas específicas del paciente (solo sus datos)
        const statsData = await calculatePatientStats(myPatientId);
        setStats(statsData);

        // Cargar tratamientos del paciente
        const treatmentsData = await treatmentsApi.getByPatient(myPatientId);
        setTreatments(treatmentsData.treatments);
        await calculateUpcomingDoses(treatmentsData.treatments, myPatientId);
      } else {
        // Si no tiene paciente asignado, no mostrar datos
        setTreatments([]);
        setUpcomingDoses([]);
        setStats({
          active_users: 0,
          total_patients: 0,
          active_treatments: 0,
          today_doses: {
            taken: 0,
            missed: 0,
            total: 0,
            adherence_percentage: null,
          },
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
  }, [calculateUpcomingDoses, getMyPatientId, calculatePatientStats]);

  return {
    treatments,
    upcomingDoses,
    stats,
    loading,
    error,
    fetchDashboard,
  };
};
