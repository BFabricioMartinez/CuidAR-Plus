import { useState, useCallback, useEffect } from 'react';
import {
  assignmentsApi,
  patientsApi,
  treatmentsApi,
  statisticsApi,
  intakesApi,
  ApiError,
} from '../../api';
import type { Treatment, MyStats, IntakeLog, Patient, Assignment } from '../../api';

// ============================================
// TIPOS
// ============================================

export interface UpcomingDose {
  treatment_id: number;
  med_name: string;
  dosage: string;
  time: string;
  frequency: string;
}

// ============================================
// HOOK useAsistencialDashboard
// ============================================

export const useAsistencialDashboard = () => {
  // Estados principales
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [upcomingDoses, setUpcomingDoses] = useState<UpcomingDose[]>([]);
  const [stats, setStats] = useState<MyStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Obtener usuario actual del localStorage
  const getUserFromStorage = useCallback(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }, []);

  // Parsear horarios desde frecuencia (igual que Personal)
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

        console.log('🔍 [DIAGNÓSTICO] Fecha de hoy (local):', today.toDateString());
        console.log('🔍 [DIAGNÓSTICO] Zona horaria offset (minutos):', new Date().getTimezoneOffset());

        const intakesResponse = await intakesApi.list({
          filters: {
            patient_id: patientId,
            order: 'desc'  // Orden descendente para traer los más recientes primero
          },
          limit: 100  // Máximo permitido por el backend
        });

        console.log('🔍 [DIAGNÓSTICO] Total intakes recibidos:', intakesResponse.items.length);

        // Crear un Set de dosis ya registradas hoy (treatment_id + time)
        const todayIntakes = new Set<string>();
        intakesResponse.items.forEach((intake: IntakeLog) => {
          if (intake.taken_at) {
            const intakeDate = new Date(intake.taken_at);
            console.log('🔍 [DIAGNÓSTICO] Intake received:', {
              treatment_id: intake.treatment_id,
              taken_at_raw: intake.taken_at,
              intakeDate_toString: intakeDate.toString(),
              intakeDate_toDateString: intakeDate.toDateString(),
              today_toDateString: today.toDateString(),
              matches: intakeDate.toDateString() === today.toDateString(),
              time_extracted: intakeDate.toTimeString().slice(0, 5)
            });

            if (intakeDate.toDateString() === today.toDateString()) {
              const time = intakeDate.toTimeString().slice(0, 5); // HH:MM
              const key = `${intake.treatment_id}-${time}`;
              todayIntakes.add(key);
              console.log('✅ [DIAGNÓSTICO] Agregado a todayIntakes:', key);
            }
          }
        });

        console.log('🔍 [DIAGNÓSTICO] todayIntakes Set:', Array.from(todayIntakes));

        // Generar dosis solo si no están registradas
        treatmentsList.forEach((treatment) => {
          const times = parseTimesFromFrequency(treatment.frequency);

          times.forEach((time) => {
            const doseKey = `${treatment.id}-${time}`;
            const isRegistered = todayIntakes.has(doseKey);

            console.log('🔍 [DIAGNÓSTICO] Verificando dosis:', {
              treatment_id: treatment.id,
              med_name: treatment.medication_name,
              time,
              doseKey,
              isRegistered,
              willShow: !isRegistered
            });

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
        console.log('🔍 [DIAGNÓSTICO] Dosis finales que se mostrarán:', doses);
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

  // Cargar pacientes asignados al cuidador
  const fetchMyPatients = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const user = getUserFromStorage();
      if (!user || !user.id) {
        throw new Error('Usuario no autenticado');
      }

      // Obtener assignments del cuidador
      const assignments: Assignment[] = await assignmentsApi.getMyPatients(user.id);

      if (assignments.length === 0) {
        setPatients([]);
        setSelectedPatientId(null);
        return;
      }

      // Obtener detalles de cada paciente
      const patientPromises = assignments.map((assignment) =>
        patientsApi.getById(assignment.patient_id)
      );

      const patientsData = await Promise.all(patientPromises);
      setPatients(patientsData);

      // Seleccionar el primero por defecto si no hay ninguno seleccionado
      if (!selectedPatientId && patientsData.length > 0) {
        setSelectedPatientId(patientsData[0].id);
      }
    } catch (err) {
      const errorMsg =
        err instanceof ApiError ? err.message : 'Error al cargar pacientes asignados';
      setError(errorMsg);
      console.error('Error loading patients:', err);
    } finally {
      setLoading(false);
    }
  }, [getUserFromStorage, selectedPatientId]);

  // Cargar estadísticas del cuidador
  const fetchMyStats = useCallback(async () => {
    try {
      const user = getUserFromStorage();
      if (!user || !user.id) {
        throw new Error('Usuario no autenticado');
      }

      const statsData = await statisticsApi.myStats(user.id);
      setStats(statsData);
    } catch (err) {
      console.error('Error loading stats:', err);
      // No mostramos error al usuario, las stats son secundarias
      // Si el endpoint no existe (404), simplemente no mostramos estadísticas
      setStats(null);
    }
  }, [getUserFromStorage]);

  // Cargar tratamientos del paciente seleccionado
  const fetchPatientTreatments = useCallback(async () => {
    if (!selectedPatientId) {
      setTreatments([]);
      setUpcomingDoses([]);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const treatmentsData = await treatmentsApi.getByPatient(selectedPatientId);
      setTreatments(treatmentsData.treatments);
      await calculateUpcomingDoses(treatmentsData.treatments, selectedPatientId);
    } catch (err) {
      const errorMsg =
        err instanceof ApiError ? err.message : 'Error al cargar tratamientos';
      setError(errorMsg);
      console.error('Error loading treatments:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedPatientId, calculateUpcomingDoses]);

  // Marcar dosis como TOMADA
  const markAsTaken = useCallback(
    async (treatmentId: number, time: string) => {
      try {
        const user = getUserFromStorage();
        if (!user || !user.id) {
          throw new Error('Usuario no autenticado');
        }

        console.log('🔍 [DIAGNÓSTICO] Marcando como tomada:', { treatmentId, time, userId: user.id });
        const response = await intakesApi.markAsTaken(treatmentId, time, user.id);
        console.log('🔍 [DIAGNÓSTICO] Respuesta del backend:', response);

        setSuccessMessage(`Dosis de las ${time} marcada como tomada ✓`);
        setTimeout(() => setSuccessMessage(''), 3000);

        // Recargar datos
        console.log('🔍 [DIAGNÓSTICO] Recargando datos después de marcar como tomada...');
        await fetchPatientTreatments();
        await fetchMyStats();
      } catch (err) {
        const errorMsg =
          err instanceof ApiError ? err.message : 'Error al marcar dosis como tomada';
        setError(errorMsg);
        setTimeout(() => setError(''), 3000);
        console.error('Error marking as taken:', err);
      }
    },
    [getUserFromStorage, fetchPatientTreatments, fetchMyStats]
  );

  // Marcar dosis como OMITIDA
  const markAsMissed = useCallback(
    async (treatmentId: number, time: string) => {
      try {
        const user = getUserFromStorage();
        if (!user || !user.id) {
          throw new Error('Usuario no autenticado');
        }

        console.log('🔍 [DIAGNÓSTICO] Marcando como omitida:', { treatmentId, time, userId: user.id });
        const response = await intakesApi.markAsMissed(treatmentId, time, user.id);
        console.log('🔍 [DIAGNÓSTICO] Respuesta del backend:', response);

        setSuccessMessage(`Dosis de las ${time} marcada como omitida`);
        setTimeout(() => setSuccessMessage(''), 3000);

        // Recargar datos
        console.log('🔍 [DIAGNÓSTICO] Recargando datos después de marcar como omitida...');
        await fetchPatientTreatments();
        await fetchMyStats();
      } catch (err) {
        const errorMsg =
          err instanceof ApiError ? err.message : 'Error al marcar dosis como omitida';
        setError(errorMsg);
        setTimeout(() => setError(''), 3000);
        console.error('Error marking as missed:', err);
      }
    },
    [getUserFromStorage, fetchPatientTreatments, fetchMyStats]
  );

  // Cargar todo el dashboard (pacientes + estadísticas)
  const fetchDashboard = useCallback(async () => {
    await Promise.all([fetchMyPatients(), fetchMyStats()]);
  }, [fetchMyPatients, fetchMyStats]);

  // Cambiar paciente seleccionado
  const selectPatient = useCallback((patientId: number) => {
    setSelectedPatientId(patientId);
  }, []);

  // Effect: Cargar tratamientos cuando cambia el paciente seleccionado
  useEffect(() => {
    if (selectedPatientId) {
      fetchPatientTreatments();
    }
  }, [selectedPatientId, fetchPatientTreatments]);

  return {
    // Estados
    patients,
    selectedPatientId,
    treatments,
    upcomingDoses,
    stats,
    loading,
    error,
    successMessage,

    // Funciones
    fetchDashboard,
    fetchMyPatients,
    fetchMyStats,
    fetchPatientTreatments,
    selectPatient,
    markAsTaken,
    markAsMissed,
  };
};
