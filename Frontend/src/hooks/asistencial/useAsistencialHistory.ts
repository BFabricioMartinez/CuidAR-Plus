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
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Filtros
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('');
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
  const fetchHistory = useCallback(async () => {
    if (!selectedPatientId) {
      setHistory([]);
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Construir filtros para la API
      const filters: any = {
        patient_id: selectedPatientId,
      };

      // Filtro por estado
      if (filterStatus !== 'all') {
        filters.status = filterStatus;
      }

      // Filtro por tratamiento
      if (filterTreatment !== 'all') {
        filters.treatment_id = parseInt(filterTreatment);
      }

      // Usar el endpoint POST /intake/paginated con filtros
      const intakesResponse = await intakesApi.list({
        limit: 200, // Límite alto para obtener todo el historial
        filters,
      });

      let historyData: HistoryItem[] = intakesResponse.items.map((intake: IntakeLog) => {
        // Buscar el tratamiento correspondiente para enriquecer los datos
        const treatment = treatments.find((t) => t.id === intake.treatment_id);

        return {
          id: intake.id,
          treatment_id: intake.treatment_id,
          taken_at: intake.taken_at,
          status: intake.status,
          medication_name: treatment?.medication_name || intake.treatment?.medication_name || 'Desconocido',
          dosage: treatment?.dosage || intake.treatment?.dosage || '',
          treatment: intake.treatment,
        };
      });

      // Filtro por fecha (filtro en cliente porque el backend no lo soporta directamente)
      if (filterDate) {
        const filterDateObj = new Date(filterDate);
        filterDateObj.setHours(0, 0, 0, 0);

        historyData = historyData.filter((item) => {
          const itemDate = new Date(item.taken_at);
          itemDate.setHours(0, 0, 0, 0);
          return itemDate.getTime() === filterDateObj.getTime();
        });
      }

      setHistory(historyData);
    } catch (err) {
      const errorMsg =
        err instanceof ApiError ? err.message : 'Error al cargar historial';
      setError(errorMsg);
      console.error('Error loading history:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedPatientId, filterStatus, filterDate, filterTreatment, treatments]);

  // Cambiar paciente seleccionado
  const selectPatient = useCallback((patientId: number) => {
    setSelectedPatientId(patientId);
    // Resetear filtros al cambiar de paciente
    setFilterStatus('all');
    setFilterDate('');
    setFilterTreatment('all');
  }, []);

  // Limpiar todos los filtros
  const clearFilters = useCallback(() => {
    setFilterStatus('all');
    setFilterDate('');
    setFilterTreatment('all');
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
    if (selectedPatientId && treatments.length >= 0) {
      fetchHistory();
    }
  }, [selectedPatientId, treatments, fetchHistory]);

  return {
    // Estados
    patients,
    selectedPatientId,
    history,
    treatments,
    loading,
    error,
    stats,

    // Filtros
    filterStatus,
    filterDate,
    filterTreatment,
    setFilterStatus,
    setFilterDate,
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
