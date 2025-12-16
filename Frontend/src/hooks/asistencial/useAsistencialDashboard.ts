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
  patient_id?: number;
  patient_name?: string;
}

export interface PatientAdherence {
  patient_id: number;
  patient_name: string;
  adherence_percentage: number | null;
  taken: number;
  missed: number;
  total: number;
}

// ============================================
// HOOK useAsistencialDashboard
// ============================================

export const useAsistencialDashboard = () => {
  // Estados principales
  const [patients, setPatients] = useState<Patient[]>([]);
  // Leer selectedPatientId del localStorage al inicializar
  // null = "Todos" (por defecto), número = paciente específico
  const [selectedPatientId, setSelectedPatientIdState] = useState<number | null>(() => {
    const stored = localStorage.getItem('selectedPatientId');
    // Si no hay nada guardado, por defecto es "Todos" (null)
    if (!stored) return null;
    // Si está guardado "all" o "null", retornar null (Todos)
    if (stored === 'all' || stored === 'null') return null;
    return Number(stored);
  });
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [upcomingDoses, setUpcomingDoses] = useState<UpcomingDose[]>([]);
  const [stats, setStats] = useState<MyStats | null>(null);
  const [patientsAdherence, setPatientsAdherence] = useState<PatientAdherence[]>([]);
  const [allUpcomingDoses, setAllUpcomingDoses] = useState<UpcomingDose[]>([]);
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

        const intakesResponse = await intakesApi.list({
          filters: {
            patient_id: patientId,
            order: 'desc'  // Orden descendente para traer los más recientes primero
          },
          limit: 100  // Máximo permitido por el backend
        });

        // Crear un Set de dosis ya registradas hoy (treatment_id + hora programada)
        // Usar scheduled_time (hora programada) en lugar de extraer hora de taken_at
        const todayIntakes = new Set<string>();
        intakesResponse.items.forEach((intake: IntakeLog) => {
          if (intake.treatment_id) {
            const intakeDate = intake.taken_at ? new Date(intake.taken_at) : null;

            // Solo procesar si es de hoy
            if (intakeDate && intakeDate.toDateString() === today.toDateString()) {
              // Usar scheduled_time si existe (hora programada), sino fallback a hora de taken_at
              let time: string;
              if (intake.scheduled_time) {
                time = intake.scheduled_time; // Hora programada (ej: "08:00")
              } else {
                // Fallback para registros antiguos sin scheduled_time
                time = intakeDate.toTimeString().slice(0, 5); // HH:MM
              }
              const key = `${intake.treatment_id}-${time}`;
              todayIntakes.add(key);
            }
          }
        });

        // Generar dosis solo si no están registradas
        treatmentsList.forEach((treatment) => {
          const times = parseTimesFromFrequency(treatment.frequency);

          times.forEach((time) => {
            const doseKey = `${treatment.id}-${time}`;
            const isRegistered = todayIntakes.has(doseKey);

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
        setSelectedPatientIdState(null);
        localStorage.setItem('selectedPatientId', 'all');
        return;
      }

      // Obtener detalles de cada paciente
      const patientPromises = assignments.map((assignment) =>
        patientsApi.getById(assignment.patient_id)
      );

      const patientsData = await Promise.all(patientPromises);
      setPatients(patientsData);

      // Por defecto, mantener "Todos" (null) si no hay ninguno seleccionado
      // No seleccionamos automáticamente el primer paciente
      if (selectedPatientId === null) {
        localStorage.setItem('selectedPatientId', 'all');
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

  // Calcular adherencia y próximas dosis para todos los pacientes (Vista General)
  const calculateAllPatientsData = useCallback(async () => {
    try {
      const user = getUserFromStorage();
      if (!user || !user.id || patients.length === 0) {
        setPatientsAdherence([]);
        setAllUpcomingDoses([]);
        return;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const adherenceData: PatientAdherence[] = [];
      const allDoses: UpcomingDose[] = [];

      // Procesar cada paciente
      for (const patient of patients) {
        try {
          // Obtener tratamientos del paciente
          const treatmentsData = await treatmentsApi.getByPatient(patient.id);

          // Obtener intakes del paciente
          const intakesResponse = await intakesApi.list({
            filters: {
              patient_id: patient.id,
              order: 'desc'
            },
            limit: 100
          });

          // Filtrar intakes de hoy
          const todayIntakes = intakesResponse.items.filter((intake: IntakeLog) => {
            if (!intake.taken_at) return false;
            const intakeDate = new Date(intake.taken_at);
            intakeDate.setHours(0, 0, 0, 0);
            return intakeDate.getTime() === today.getTime();
          });

          // Calcular estadísticas de adherencia
          const taken = todayIntakes.filter((i: IntakeLog) => i.status === 'TAKEN').length;
          const missed = todayIntakes.filter((i: IntakeLog) => i.status === 'MISSED').length;
          const total = taken + missed;
          const adherence_percentage = total > 0 ? (taken / total) * 100 : null;

          adherenceData.push({
            patient_id: patient.id,
            patient_name: patient.name,
            adherence_percentage,
            taken,
            missed,
            total,
          });

          // Calcular próximas dosis del paciente
          // Usar scheduled_time (hora programada) en lugar de extraer hora de taken_at
          const todayIntakesSet = new Set<string>();
          todayIntakes.forEach((intake: IntakeLog) => {
            if (intake.treatment_id) {
              // Usar scheduled_time si existe (hora programada), sino fallback a hora de taken_at
              let time: string;
              if (intake.scheduled_time) {
                time = intake.scheduled_time; // Hora programada (ej: "08:00")
              } else if (intake.taken_at) {
                // Fallback para registros antiguos sin scheduled_time
                const intakeDate = new Date(intake.taken_at);
                time = intakeDate.toTimeString().slice(0, 5); // HH:MM
              } else {
                return; // Skip si no hay ni scheduled_time ni taken_at
              }
              const key = `${intake.treatment_id}-${time}`;
              todayIntakesSet.add(key);
            }
          });

          // Generar dosis pendientes
          treatmentsData.treatments.forEach((treatment) => {
            const times = parseTimesFromFrequency(treatment.frequency);
            times.forEach((time) => {
              const doseKey = `${treatment.id}-${time}`;
              if (!todayIntakesSet.has(doseKey)) {
                allDoses.push({
                  treatment_id: treatment.id,
                  med_name: treatment.medication_name,
                  dosage: treatment.dosage || '',
                  time,
                  frequency: treatment.frequency,
                  patient_id: patient.id,
                  patient_name: patient.name,
                });
              }
            });
          });
        } catch (err) {
          console.error(`Error processing patient ${patient.id}:`, err);
        }
      }

      // Ordenar adherencia por porcentaje (descendente)
      adherenceData.sort((a, b) => {
        if (a.adherence_percentage === null && b.adherence_percentage === null) return 0;
        if (a.adherence_percentage === null) return 1;
        if (b.adherence_percentage === null) return -1;
        return b.adherence_percentage - a.adherence_percentage;
      });

      // Ordenar dosis por hora
      allDoses.sort((a, b) => a.time.localeCompare(b.time));

      setPatientsAdherence(adherenceData);
      setAllUpcomingDoses(allDoses);
    } catch (err) {
      console.error('Error calculating all patients data:', err);
      setPatientsAdherence([]);
      setAllUpcomingDoses([]);
    }
  }, [getUserFromStorage, patients, parseTimesFromFrequency]);

  // Cargar estadísticas del cuidador o del paciente seleccionado
  const fetchMyStats = useCallback(async () => {
    try {
      const user = getUserFromStorage();
      if (!user || !user.id) {
        throw new Error('Usuario no autenticado');
      }

      // Si "Todos" está seleccionado, usar estadísticas generales del cuidador
      if (selectedPatientId === null) {
        const statsData = await statisticsApi.myStats(user.id);
        setStats(statsData);
      } else {
        // Si hay un paciente específico seleccionado, calcular sus estadísticas
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Obtener todos los intakes de hoy del paciente seleccionado
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:8000/intake/paginated', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            limit: 100,
            filters: {
              patient_id: selectedPatientId,
              order: 'desc'
            }
          }),
        });

        if (!response.ok) {
          throw new Error('Error al cargar intakes');
        }

        const responseData = await response.json();
        const intakesResponse = {
          items: responseData.intakes || []
        };

        // Filtrar solo los de hoy
        const todayIntakes = intakesResponse.items.filter((intake: IntakeLog) => {
          if (!intake.taken_at) return false;
          const intakeDate = new Date(intake.taken_at);
          intakeDate.setHours(0, 0, 0, 0);
          return intakeDate.getTime() === today.getTime();
        });

        // Calcular estadísticas
        const taken = todayIntakes.filter((i: IntakeLog) => i.status === 'TAKEN').length;
        const missed = todayIntakes.filter((i: IntakeLog) => i.status === 'MISSED').length;
        const total = taken + missed;
        const adherence_percentage = total > 0 ? (taken / total) * 100 : null;

        setStats({
          assigned_patients: 1, // Solo este paciente
          today_doses: {
            taken,
            missed,
            total,
            adherence_percentage,
          },
        });
      }
    } catch (err) {
      console.error('Error loading stats:', err);
      // No mostramos error al usuario, las stats son secundarias
      // Si el endpoint no existe (404), simplemente no mostramos estadísticas
      setStats(null);
    }
  }, [getUserFromStorage, selectedPatientId]);

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

        await intakesApi.markAsTaken(treatmentId, time, user.id);

        setSuccessMessage(`Dosis de las ${time} marcada como tomada ✓`);
        setTimeout(() => setSuccessMessage(''), 3000);

        // Recargar datos
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

        await intakesApi.markAsMissed(treatmentId, time, user.id);

        setSuccessMessage(`Dosis de las ${time} marcada como omitida`);
        setTimeout(() => setSuccessMessage(''), 3000);

        // Recargar datos
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
    await fetchMyPatients();
    await fetchMyStats();
  }, [fetchMyPatients, fetchMyStats]);

  // Cambiar paciente seleccionado (con sincronización en localStorage)
  // patientId puede ser null (Todos) o un número (paciente específico)
  const selectPatient = useCallback((patientId: number | null) => {
    setSelectedPatientIdState(patientId);
    if (patientId === null) {
      localStorage.setItem('selectedPatientId', 'all');
    } else {
      localStorage.setItem('selectedPatientId', patientId.toString());
    }
    // Disparar evento personalizado para sincronizar entre componentes
    window.dispatchEvent(new CustomEvent('patientSelected', { detail: patientId }));
  }, []);

  // Effect: Sincronizar con localStorage cuando cambia desde otro componente
  useEffect(() => {
    const handlePatientSelected = (e: CustomEvent<number>) => {
      if (e.detail !== selectedPatientId) {
        setSelectedPatientIdState(e.detail);
      }
    };

    const handleStorageChange = () => {
      const stored = localStorage.getItem('selectedPatientId');
      let storedId: number | null = null;
      if (stored && stored !== 'all' && stored !== 'null') {
        storedId = Number(stored);
      }
      if (storedId !== selectedPatientId) {
        setSelectedPatientIdState(storedId);
      }
    };

    // Escuchar evento personalizado (mismo tab)
    window.addEventListener('patientSelected', handlePatientSelected as EventListener);
    // Escuchar cambios en localStorage (otros tabs)
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('patientSelected', handlePatientSelected as EventListener);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [selectedPatientId]);

  // Effect: Cargar tratamientos cuando cambia el paciente seleccionado
  useEffect(() => {
    if (selectedPatientId) {
      fetchPatientTreatments();
    } else {
      // Si "Todos" está seleccionado, limpiar tratamientos y dosis
      setTreatments([]);
      setUpcomingDoses([]);
    }
  }, [selectedPatientId, fetchPatientTreatments]);

  // Effect: Recargar estadísticas cuando cambia el paciente seleccionado
  useEffect(() => {
    fetchMyStats();
  }, [selectedPatientId, fetchMyStats]);

  // Effect: Calcular datos de todos los pacientes cuando está en Vista General
  useEffect(() => {
    if (selectedPatientId === null && patients.length > 0) {
      calculateAllPatientsData();
    } else {
      setPatientsAdherence([]);
      setAllUpcomingDoses([]);
    }
  }, [selectedPatientId, patients, calculateAllPatientsData]);

  return {
    // Estados
    patients,
    selectedPatientId,
    treatments,
    upcomingDoses,
    stats,
    patientsAdherence,
    allUpcomingDoses,
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
