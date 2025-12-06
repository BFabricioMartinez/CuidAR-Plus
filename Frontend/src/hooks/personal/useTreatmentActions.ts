import { useState, useCallback } from 'react';
import type { TreatmentFormData } from './useTreatmentForm';

export const useTreatmentActions = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  const token = localStorage.getItem('token');

  const createTreatment = useCallback(async (formData: TreatmentFormData) => {
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      // Primero obtener el patient_id del usuario
      const patientsResponse = await fetch(
        'http://localhost:8000/patients/all',
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!patientsResponse.ok) throw new Error('Error al obtener paciente');

      const patients = await patientsResponse.json();
      const myPatient = patients[0]; // Usuario PERSONAL tiene un solo paciente

      if (!myPatient) {
        throw new Error('No se encontró tu perfil de paciente');
      }

      // Crear tratamiento
      const response = await fetch(
        'http://localhost:8000/treatments/create',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            patient_id: myPatient.id,
            medication_name: formData.medication_name,
            dosage: formData.dosage,
            frequency: formData.frequency,
            start_date: formData.start_date,
            end_date: formData.end_date || null,
            notes: formData.notes || null,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al crear tratamiento');
      }

      setSuccessMessage('Tratamiento creado exitosamente');
      return true;
    } catch (err: any) {
      setError(err.message || 'Error al crear tratamiento');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [token]);

  const updateTreatment = useCallback(async (
    treatmentId: number,
    formData: TreatmentFormData
  ) => {
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await fetch(
        `http://localhost:8000/treatments/${treatmentId}/update`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            medication_name: formData.medication_name,
            dosage: formData.dosage,
            frequency: formData.frequency,
            start_date: formData.start_date,
            end_date: formData.end_date || null,
            notes: formData.notes || null,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al actualizar tratamiento');
      }

      setSuccessMessage('Tratamiento actualizado exitosamente');
      return true;
    } catch (err: any) {
      setError(err.message || 'Error al actualizar tratamiento');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [token]);

  const deleteTreatment = useCallback(async (treatmentId: number) => {
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await fetch(
        `http://localhost:8000/treatments/${treatmentId}/delete`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Error al eliminar tratamiento');

      setSuccessMessage('Tratamiento desactivado exitosamente');
      return true;
    } catch (err: any) {
      setError(err.message || 'Error al eliminar tratamiento');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [token]);

  const clearMessages = useCallback(() => {
    setError('');
    setSuccessMessage('');
  }, []);

  return {
    loading,
    error,
    successMessage,
    createTreatment,
    updateTreatment,
    deleteTreatment,
    clearMessages,
  };
};
