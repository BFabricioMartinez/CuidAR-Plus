import { useState, useCallback, useEffect } from 'react';
import {
  assignmentsApi,
  patientsApi,
  treatmentsApi,
  ApiError,
} from '../../api';
import type { Treatment, Patient, Assignment, CreateTreatmentRequest } from '../../api';

// ============================================
// TIPOS
// ============================================

export interface TreatmentFormData {
  medication_name: string;
  dosage: string;
  frequency: string;
  start_date: string;
  end_date: string;
  notes: string;
}

const initialFormData: TreatmentFormData = {
  medication_name: '',
  dosage: '',
  frequency: '',
  start_date: new Date().toISOString().split('T')[0],
  end_date: '',
  notes: '',
};

// ============================================
// HOOK useAsistencialTreatments
// ============================================

export const useAsistencialTreatments = () => {
  // Estados principales
  const [patients, setPatients] = useState<Patient[]>([]);
  // Leer selectedPatientId desde localStorage al inicializar
  // null = "Todos" (por defecto), número = paciente específico
  const [selectedPatientId, setSelectedPatientIdState] = useState<number | null>(() => {
    const stored = localStorage.getItem('selectedPatientId');
    if (!stored) return null;
    if (stored === 'all' || stored === 'null') return null;
    return Number(stored);
  });
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [formData, setFormData] = useState<TreatmentFormData>(initialFormData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [showForm, setShowForm] = useState(false);
  const [editingTreatment, setEditingTreatment] = useState<Treatment | null>(null);

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

  // Cargar tratamientos del paciente seleccionado
  const fetchTreatments = useCallback(async () => {
    if (!selectedPatientId) {
      setTreatments([]);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const treatmentsData = await treatmentsApi.getByPatient(selectedPatientId);
      setTreatments(treatmentsData.treatments);
    } catch (err) {
      const errorMsg =
        err instanceof ApiError ? err.message : 'Error al cargar tratamientos';
      setError(errorMsg);
      console.error('Error loading treatments:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedPatientId]);

  // Crear tratamiento
  const createTreatment = useCallback(
    async (data: TreatmentFormData) => {
      if (!selectedPatientId) {
        setError('Debe seleccionar un paciente');
        return false;
      }

      setLoading(true);
      setError('');
      setSuccessMessage('');

      try {
        const requestData: CreateTreatmentRequest = {
          patient_id: selectedPatientId,
          medication_name: data.medication_name,
          dosage: data.dosage || undefined,
          frequency: data.frequency,
          start_date: data.start_date || undefined,
          end_date: data.end_date || undefined,
          notes: data.notes || undefined,
        };

        await treatmentsApi.create(requestData);
        setSuccessMessage('Tratamiento creado exitosamente ✓');

        // Auto-ocultar mensaje después de 3 segundos
        setTimeout(() => setSuccessMessage(''), 3000);

        return true;
      } catch (err) {
        const errorMsg =
          err instanceof ApiError ? err.message : 'Error al crear tratamiento';
        setError(errorMsg);

        // Auto-ocultar error después de 5 segundos
        setTimeout(() => setError(''), 5000);

        console.error('Error creating treatment:', err);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [selectedPatientId]
  );

  // Actualizar tratamiento
  const updateTreatment = useCallback(
    async (treatmentId: number, data: TreatmentFormData) => {
      setLoading(true);
      setError('');
      setSuccessMessage('');

      try {
        await treatmentsApi.update({
          id: treatmentId,
          medication_name: data.medication_name,
          dosage: data.dosage || undefined,
          frequency: data.frequency,
          start_date: data.start_date || undefined,
          end_date: data.end_date || undefined,
          notes: data.notes || undefined,
        });

        setSuccessMessage('Tratamiento actualizado exitosamente ✓');

        // Auto-ocultar mensaje después de 3 segundos
        setTimeout(() => setSuccessMessage(''), 3000);

        return true;
      } catch (err) {
        const errorMsg =
          err instanceof ApiError ? err.message : 'Error al actualizar tratamiento';
        setError(errorMsg);

        // Auto-ocultar error después de 5 segundos
        setTimeout(() => setError(''), 5000);

        console.error('Error updating treatment:', err);
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Eliminar (desactivar) tratamiento
  const deleteTreatment = useCallback(async (treatmentId: number) => {
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      await treatmentsApi.deactivate(treatmentId);
      setSuccessMessage('Tratamiento desactivado exitosamente');

      // Auto-ocultar mensaje después de 3 segundos
      setTimeout(() => setSuccessMessage(''), 3000);

      return true;
    } catch (err) {
      const errorMsg =
        err instanceof ApiError ? err.message : 'Error al eliminar tratamiento';
      setError(errorMsg);

      // Auto-ocultar error después de 5 segundos
      setTimeout(() => setError(''), 5000);

      console.error('Error deleting treatment:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Manejar cambios en el formulario
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    },
    []
  );

  // Cargar datos de un tratamiento en el formulario (para editar)
  const openEditForm = useCallback((treatment: Treatment) => {
    setEditingTreatment(treatment);
    setFormData({
      medication_name: treatment.medication_name,
      dosage: treatment.dosage || '',
      frequency: treatment.frequency,
      start_date: treatment.start_date || new Date().toISOString().split('T')[0],
      end_date: treatment.end_date || '',
      notes: treatment.notes || '',
    });
    setShowForm(true);
  }, []);

  // Abrir formulario para crear
  const openCreateForm = useCallback(() => {
    setShowForm(true);
    setEditingTreatment(null);
    setFormData(initialFormData);
  }, []);

  // Cancelar y cerrar formulario
  const cancelForm = useCallback(() => {
    setShowForm(false);
    setEditingTreatment(null);
    setFormData(initialFormData);
    setError('');
  }, []);

  // Resetear formulario
  const resetForm = useCallback(() => {
    setFormData(initialFormData);
  }, []);

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
    setShowForm(false);
    setEditingTreatment(null);
  }, []);

  // Effect: Sincronizar selectedPatientId cuando cambia desde otro componente
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

    // Escuchar evento personalizado (mismo tab)
    window.addEventListener('patientSelected', handlePatientSelected);
    // Escuchar cambios en localStorage (otros tabs)
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('patientSelected', handlePatientSelected);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [selectedPatientId]);

  // Limpiar mensajes
  const clearMessages = useCallback(() => {
    setError('');
    setSuccessMessage('');
  }, []);

  // Effect: Cargar tratamientos cuando cambia el paciente seleccionado
  useEffect(() => {
    if (selectedPatientId) {
      fetchTreatments();
    }
  }, [selectedPatientId, fetchTreatments]);

  return {
    // Estados
    patients,
    selectedPatientId,
    treatments,
    formData,
    loading,
    error,
    successMessage,
    showForm,
    editingTreatment,

    // Funciones de pacientes
    fetchMyPatients,
    selectPatient,

    // Funciones de tratamientos
    fetchTreatments,
    createTreatment,
    updateTreatment,
    deleteTreatment,

    // Funciones de formulario
    handleInputChange,
    openEditForm,
    openCreateForm,
    cancelForm,
    resetForm,
    clearMessages,
  };
};
