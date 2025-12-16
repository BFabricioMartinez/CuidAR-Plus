import { useState, useCallback } from 'react';
import { treatmentsApi, patientsApi, intakesApi, assignmentsApi, authApi, ApiError } from '../../api';
import type { Treatment, CreateTreatmentRequest, Assignment } from '../../api';

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
      // Obtener usuario actual
      const currentUser = authApi.getStoredUser();
      if (!currentUser || !currentUser.id) {
        throw new Error('Usuario no autenticado');
      }

      // Para usuarios PERSONAL, obtener el paciente a través de las asignaciones
      // Buscar asignaciones activas donde el patient_id corresponde a este usuario
      let myPatientId: number | null = null;

      // Primero intentar buscar asignaciones donde el patient_id podría ser el ID del usuario
      // (cuando se asigna un usuario PERSONAL, inicialmente se usa su ID)
      try {
        const assignments = await assignmentsApi.getAll(undefined, currentUser.id);
        if (assignments.length > 0 && assignments[0].active) {
          myPatientId = assignments[0].patient_id;
        }
      } catch {
        // Si no funciona, buscar de otra manera
      }

      // Si no se encontró, buscar todas las asignaciones activas y verificar
      // si alguna corresponde a un paciente creado para este usuario
      if (!myPatientId) {
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
                break;
              }
            } catch {
              continue;
            }
          }
        } catch {
          // Si falla, continuar con el método anterior
        }
      }

      // NO usar el primer paciente activo como fallback
      // Si no tiene asignación, no debe ver datos de otros usuarios
      if (myPatientId) {
        const data = await treatmentsApi.getByPatient(myPatientId);
        setTreatments(data.treatments);
      } else {
        // Si no tiene paciente asignado, no mostrar tratamientos
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

  // Crear tratamiento
  const createTreatment = useCallback(async (data: TreatmentFormData) => {
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      // Obtener patient_id
      const myPatientId = await getMyPatientId();

      if (!myPatientId) {
        throw new Error('No se encontró tu perfil de paciente');
      }

      const requestData: CreateTreatmentRequest = {
        patient_id: myPatientId,
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
  }, [getMyPatientId]);

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
      // FIX: Formato de datetime sin timezone para compatibilidad con PostgreSQL
      //
      // PROBLEMA:
      // - toISOString() genera "2025-12-06T11:00:00.000Z" (timezone-aware UTC)
      // - PostgreSQL TIMESTAMP WITHOUT TIME ZONE espera datetime sin timezone
      // - Backend lanzaba error: "can't subtract offset-naive and offset-aware datetimes"
      //
      // SOLUCIÓN:
      // - Crear datetime local y formatearlo como "YYYY-MM-DD HH:mm:ss"
      // - Esto envía un datetime sin información de timezone al backend
      // ============================================================================
      const now = new Date();
      const [hours, minutes] = time.split(':');
      now.setHours(parseInt(hours), parseInt(minutes), 0, 0);

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
      // Formatear datetime sin timezone (igual que en markAsTaken)
      const now = new Date();
      const [hours, minutes] = time.split(':');
      now.setHours(parseInt(hours), parseInt(minutes), 0, 0);

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
