import { useState, useCallback, useEffect } from 'react';
import {
  assignmentsApi,
  patientsApi,
  treatmentsApi,
  intakesApi,
  ApiError,
} from '../../api';
import type { Treatment, Patient, Assignment, IntakeLog } from '../../api';

// ============================================
// TIPOS
// ============================================

export interface HistoryItem {
  id: number;
  treatment_id: number;
  taken_at: string;
  scheduled_time?: string; // Hora programada de la dosis (ej: "08:00")
  status: string;
  medication_name?: string;
  dosage?: string;
  treatment?: {
    id: number;
    medication_name: string;
    dosage: string | null;
  } | null;
}

export interface HistoryFilters {
  status: string; // 'all' | 'TAKEN' | 'MISSED'
  date: string; // formato 'YYYY-MM-DD' o vacío
  treatmentId: string; // 'all' | ID del tratamiento
}

export interface HistoryStats {
  total: number;
  taken: number;
  missed: number;
}

// ============================================
// HOOK useAsistencialHistory
// ============================================

export const useAsistencialHistory = () => {
  // Estados principales
  const [patients, setPatients] = useState<Patient[]>([]);
  // Leer paciente seleccionado desde localStorage al inicializar
  // null = "Todos" (por defecto), número = paciente específico
  const [selectedPatientId, setSelectedPatientIdState] = useState<number | null>(() => {
    const stored = localStorage.getItem('selectedPatientId');
    if (!stored) return null;
    if (stored === 'all' || stored === 'null') return null;
    return Number(stored);
  });
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(true);

  // Filtros
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [filterTreatment, setFilterTreatment] = useState<string>('all');

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

  // Cargar tratamientos del paciente (para el filtro)
  const fetchTreatments = useCallback(async () => {
    if (!selectedPatientId) {
      setTreatments([]);
      return;
    }

    try {
      const treatmentsData = await treatmentsApi.getByPatient(selectedPatientId);
      setTreatments(treatmentsData.treatments);
    } catch (err) {
      console.error('Error loading treatments:', err);
      setTreatments([]);
    }
  }, [selectedPatientId]);

  // Cargar historial del paciente seleccionado con filtros
  const fetchHistory = useCallback(
    async (cursor: number | null = null) => {
      if (!selectedPatientId) {
        setHistory([]);
        setNextCursor(null);
        setHasMore(true);
        return;
      }

      const isInitialLoad = cursor === null;

      if (isInitialLoad) {
        setLoading(true);
        setHistory([]);
        setNextCursor(null);
        setHasMore(true);
      } else {
        if (!hasMore) return;
        setLoadingMore(true);
      }

      setError('');

      try {
        const token = localStorage.getItem('token');

        // Preparar filtros para el backend
        const filters: any = {
          patient_id: selectedPatientId,
          order: 'desc',
        };

        // Filtro por estado
        if (filterStatus !== 'all') {
          filters.status = filterStatus;
        }

        // Filtro por tratamiento
        if (filterTreatment !== 'all') {
          const treatmentId = parseInt(filterTreatment);
          filters.treatment_id = treatmentId;
        }

        // Usar intakesApi.list() en lugar de fetch directo
        const response = await intakesApi.list({
          limit: 20,
          last_seen_id: cursor,
          filters,
        });

        let intakes = response.items || [];

        // Enriquecer con datos del tratamiento
        let historyData: HistoryItem[] = intakes.map((intake: IntakeLog) => {
          const treatment = treatments.find((t) => t.id === intake.treatment_id) || intake.treatment || null;

          // scheduled_time: hora programada de la dosis (debe venir del backend)
          // Si no está disponible, intentar extraerla de taken_at como fallback
          let scheduledTime = intake.scheduled_time;
          
          if (!scheduledTime && intake.taken_at) {
            try {
              const takenAtDate = new Date(intake.taken_at);
              const hours = String(takenAtDate.getHours()).padStart(2, '0');
              const minutes = String(takenAtDate.getMinutes()).padStart(2, '0');
              scheduledTime = `${hours}:${minutes}`;
            } catch (e) {
              scheduledTime = 'N/A';
            }
          }
          
          if (!scheduledTime) {
            scheduledTime = 'N/A';
          }

          return {
            id: intake.id,
            treatment_id: intake.treatment_id,
            taken_at: intake.taken_at,
            scheduled_time: scheduledTime, // Hora programada de la dosis
            status: intake.status,
            medication_name: treatment?.medication_name || 'Desconocido',
            dosage: treatment?.dosage || '',
            treatment: intake.treatment,
          };
        });

        // Filtro por fecha o rango de fechas en el cliente (para no depender del backend)
        if (filterDate) {
          // Filtro por fecha única (compatibilidad)
          const filterDateObj = new Date(filterDate);
          filterDateObj.setHours(0, 0, 0, 0);

          historyData = historyData.filter((item) => {
            const itemDate = new Date(item.taken_at);
            itemDate.setHours(0, 0, 0, 0);
            return itemDate.getTime() === filterDateObj.getTime();
          });
        } else if (filterDateFrom || filterDateTo) {
          // Filtro por rango de fechas
          historyData = historyData.filter((item) => {
            const itemDate = new Date(item.taken_at);
            itemDate.setHours(0, 0, 0, 0);
            
            if (filterDateFrom && filterDateTo) {
              const fromDate = new Date(filterDateFrom);
              fromDate.setHours(0, 0, 0, 0);
              const toDate = new Date(filterDateTo);
              toDate.setHours(23, 59, 59, 999);
              return itemDate >= fromDate && itemDate <= toDate;
            } else if (filterDateFrom) {
              const fromDate = new Date(filterDateFrom);
              fromDate.setHours(0, 0, 0, 0);
              return itemDate >= fromDate;
            } else if (filterDateTo) {
              const toDate = new Date(filterDateTo);
              toDate.setHours(23, 59, 59, 999);
              return itemDate <= toDate;
            }
            return true;
          });
        }

        // Actualizar datos
        if (isInitialLoad) {
          setHistory(historyData);
        } else {
          setHistory((prev) => [...prev, ...historyData]);
        }

        // Actualizar cursor y estado de hasMore
        setNextCursor(response.next_cursor);
        setHasMore(response.next_cursor !== null);
      } catch (err) {
        const errorMsg =
          err instanceof ApiError ? err.message : 'Error al cargar historial';
        setError(errorMsg);
        console.error('Error loading history:', err);
      } finally {
        if (isInitialLoad) {
          setLoading(false);
        } else {
          setLoadingMore(false);
        }
      }
    },
    [selectedPatientId, filterStatus, filterDate, filterDateFrom, filterDateTo, filterTreatment, treatments, hasMore]
  );

  // Cambiar paciente seleccionado
  // patientId puede ser null (Todos) o un número (paciente específico)
  const selectPatient = useCallback((patientId: number | null) => {
    setSelectedPatientIdState(patientId);
    if (patientId === null) {
      localStorage.setItem('selectedPatientId', 'all');
    } else {
      localStorage.setItem('selectedPatientId', patientId.toString());
    }
    window.dispatchEvent(new CustomEvent('patientSelected', { detail: patientId }));
    // Resetear filtros al cambiar de paciente
    setFilterStatus('all');
    setFilterDate('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setFilterTreatment('all');
  }, []);

  // Sincronizar paciente seleccionado cuando cambia desde navbar / otros componentes
  useEffect(() => {
    const handlePatientSelected = (e: Event) => {
      const customEvent = e as CustomEvent<number>;
      if (customEvent.detail !== selectedPatientId) {
        setSelectedPatientIdState(customEvent.detail);
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

    window.addEventListener('patientSelected', handlePatientSelected);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('patientSelected', handlePatientSelected);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [selectedPatientId]);

  // Limpiar todos los filtros
  const clearFilters = useCallback(() => {
    setFilterStatus('all');
    setFilterDate('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setFilterTreatment('all');
    setNextCursor(null);
    setHasMore(true);
  }, []);

  // Calcular estadísticas del historial
  const stats: HistoryStats = {
    total: history.length,
    taken: history.filter((h) => h.status === 'TAKEN').length,
    missed: history.filter((h) => h.status === 'MISSED').length,
  };

  // Formatear fecha
  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }, []);

  // Formatear hora
  const formatTime = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }, []);

  // Effect: Cargar tratamientos cuando cambia el paciente seleccionado
  useEffect(() => {
    if (selectedPatientId) {
      fetchTreatments();
    }
  }, [selectedPatientId, fetchTreatments]);

  // Effect: Cargar historial cuando cambian los filtros o tratamientos
  useEffect(() => {
    if (selectedPatientId) {
      fetchHistory();
    }
  }, [selectedPatientId, filterStatus, filterDate, filterDateFrom, filterDateTo, filterTreatment, fetchHistory]);

  return {
    // Estados
    patients,
    selectedPatientId,
    history,
    treatments,
    loading,
    error,
    loadingMore,
    nextCursor,
    hasMore,
    stats,

    // Filtros
    filterStatus,
    filterDate,
    filterDateFrom,
    filterDateTo,
    filterTreatment,
    setFilterStatus,
    setFilterDate,
    setFilterDateFrom,
    setFilterDateTo,
    setFilterTreatment,

    // Funciones
    fetchMyPatients,
    fetchTreatments,
    fetchHistory,
    selectPatient,
    clearFilters,
    formatDate,
    formatTime,
  };
};
