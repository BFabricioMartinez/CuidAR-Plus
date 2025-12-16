import { useState, useCallback } from 'react';
import { treatmentsApi, patientsApi, intakesApi, authApi, ApiError } from '../../api';
import type { Treatment, CreateTreatmentRequest } from '../../api';

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

export const useTreatmentManagement = () => {
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [formData, setFormData] = useState<TreatmentFormData>(initialFormData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Cargar tratamientos
  const fetchTreatments = useCallback(async () => {
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
          const data = await treatmentsApi.getByPatient(myPatient.id);
          setTreatments(data.treatments);
        } else {
          setTreatments([]);
        }
      } catch (patientErr) {
        console.error('Error al obtener datos del paciente:', patientErr);
        setTreatments([]);
      }
    } catch (err) {
      const errorMsg =
        err instanceof ApiError
          ? err.message
          : 'Error al cargar tratamientos';
      setError(errorMsg);
      console.error('Error loading treatments:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Crear tratamiento
  const createTreatment = useCallback(async (data: TreatmentFormData) => {
    setLoading(true);
    setError('');
    setSuccessMessage('');

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

      // Obtener el paciente donde caregiver_id coincide con el usuario actual
      const patientsResponse = await patientsApi.list({
        limit: 1,
        filters: {
          caregiver_id: currentUser.id,
          active: true
        },
      });

      if (patientsResponse.items.length === 0) {
        throw new Error('No se encontró tu perfil de paciente');
      }

      const myPatient = patientsResponse.items[0];

      const requestData: CreateTreatmentRequest = {
        patient_id: myPatient.id,
        medication_name: data.medication_name,
        dosage: data.dosage || undefined,
        frequency: data.frequency,
        start_date: data.start_date || undefined,
        end_date: data.end_date || undefined,
        notes: data.notes || undefined,
      };

      await treatmentsApi.create(requestData);
      setSuccessMessage('Tratamiento creado exitosamente');
      return true;
    } catch (err) {
      const errorMsg =
        err instanceof ApiError
          ? err.message
          : 'Error al crear tratamiento';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

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

        setSuccessMessage('Tratamiento actualizado exitosamente');
        return true;
      } catch (err) {
        const errorMsg =
          err instanceof ApiError
            ? err.message
            : 'Error al actualizar tratamiento';
        setError(errorMsg);
        throw err;
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
      return true;
    } catch (err) {
      const errorMsg =
        err instanceof ApiError
          ? err.message
          : 'Error al eliminar tratamiento';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Marcar dosis como tomada
  const markAsTaken = useCallback(async (treatmentId: number, time: string) => {
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      // ============================================================================
      // FIX: taken_at debe ser la hora ACTUAL cuando se marca la dosis, no la hora programada
      // time = hora programada (scheduled_time)
      // taken_at = hora actual (cuando el usuario marca la dosis)
      // ============================================================================
      const now = new Date(); // Hora actual, NO modificar con la hora programada

      // Formatear como "YYYY-MM-DD HH:mm:ss" (sin timezone)
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hour = String(now.getHours()).padStart(2, '0');
      const minute = String(now.getMinutes()).padStart(2, '0');
      const second = String(now.getSeconds()).padStart(2, '0');
      const taken_at = `${year}-${month}-${day} ${hour}:${minute}:${second}`;

      await intakesApi.create({
        treatment_id: treatmentId,
        taken_at,
        status: 'TAKEN',
      });

      setSuccessMessage(`Dosis de las ${time} marcada como tomada`);
      return true;
    } catch (err) {
      const errorMsg =
        err instanceof ApiError
          ? err.message
          : 'Error al marcar dosis';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Marcar dosis como omitida
  const markAsMissed = useCallback(async (treatmentId: number, time: string) => {
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      // ============================================================================
      // FIX: taken_at debe ser la hora ACTUAL cuando se marca la dosis, no la hora programada
      // time = hora programada (scheduled_time)
      // taken_at = hora actual (cuando el usuario marca la dosis)
      // ============================================================================
      const now = new Date(); // Hora actual, NO modificar con la hora programada

      // Formatear como "YYYY-MM-DD HH:mm:ss" (sin timezone)
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hour = String(now.getHours()).padStart(2, '0');
      const minute = String(now.getMinutes()).padStart(2, '0');
      const second = String(now.getSeconds()).padStart(2, '0');
      const taken_at = `${year}-${month}-${day} ${hour}:${minute}:${second}`;

      await intakesApi.create({
        treatment_id: treatmentId,
        taken_at,
        status: 'MISSED',
      });

      setSuccessMessage(`Dosis de las ${time} marcada como omitida`);
      return true;
    } catch (err) {
      const errorMsg =
        err instanceof ApiError
          ? err.message
          : 'Error al marcar dosis';
      setError(errorMsg);
      throw err;
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
  const setFormDataFromTreatment = useCallback((treatment: Treatment) => {
    setFormData({
      medication_name: treatment.medication_name,
      dosage: treatment.dosage || '',
      frequency: treatment.frequency,
      start_date: treatment.start_date || new Date().toISOString().split('T')[0],
      end_date: treatment.end_date || '',
      notes: treatment.notes || '',
    });
  }, []);

  // Resetear formulario
  const resetForm = useCallback(() => {
    setFormData(initialFormData);
  }, []);

  // Limpiar mensajes
  const clearMessages = useCallback(() => {
    setError('');
    setSuccessMessage('');
  }, []);

  return {
    treatments,
    formData,
    loading,
    error,
    successMessage,
    fetchTreatments,
    createTreatment,
    updateTreatment,
    deleteTreatment,
    markAsTaken,
    markAsMissed,
    handleInputChange,
    setFormDataFromTreatment,
    resetForm,
    clearMessages,
  };
};
