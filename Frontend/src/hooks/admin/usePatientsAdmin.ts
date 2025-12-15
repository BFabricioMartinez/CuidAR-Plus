import { useState, useCallback, useEffect } from 'react';
import { patientsApi, usersApi, ApiError } from '../../api';
import type { Patient, User, PatientFilters, CreatePatientRequest, UpdatePatientRequest } from '../../api';

// ============================================
// HOOK usePatientsAdmin
// ============================================

export const usePatientsAdmin = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [caregivers, setCaregivers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Filtros
  const [filterActive, setFilterActive] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Obtener pacientes
  const fetchPatients = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const filters: PatientFilters = {};

      if (filterActive !== 'all') {
        filters.active = filterActive === 'true';
      }

      if (searchTerm) {
        filters.search = searchTerm;
      }

      const response = await patientsApi.list({
        limit: 100, // Límite alto para obtener todos
        filters,
      });

      setPatients(response.items);
    } catch (err) {
      const errorMsg =
        err instanceof ApiError ? err.message : 'Error al cargar pacientes';
      setError(errorMsg);
      console.error('Error loading patients:', err);
    } finally {
      setLoading(false);
    }
  }, [filterActive, searchTerm]);

  // Obtener cuidadores (usuarios ASISTENCIAL activos)
  const fetchCaregivers = useCallback(async () => {
    try {
      const caregiversData = await usersApi.getByRole('ASISTENCIAL');
      setCaregivers(caregiversData);
    } catch (err) {
      console.error('Error loading caregivers:', err);
      // No mostramos error, es información secundaria
    }
  }, []);

  // Crear paciente
  const createPatient = useCallback(async (data: CreatePatientRequest) => {
    setLoading(true);
    setError('');

    try {
      await patientsApi.create(data);
      setSuccessMessage('Paciente creado exitosamente ✓');
      setTimeout(() => setSuccessMessage(''), 3000);
      await fetchPatients();
    } catch (err) {
      const errorMsg =
        err instanceof ApiError ? err.message : 'Error al crear paciente';
      setError(errorMsg);
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoading(false);
    }
  }, [fetchPatients]);

  // Editar paciente
  const updatePatient = useCallback(async (data: UpdatePatientRequest) => {
    setLoading(true);
    setError('');

    try {
      await patientsApi.update(data);
      setSuccessMessage('Paciente actualizado exitosamente ✓');
      setTimeout(() => setSuccessMessage(''), 3000);
      await fetchPatients();
    } catch (err) {
      const errorMsg =
        err instanceof ApiError ? err.message : 'Error al actualizar paciente';
      setError(errorMsg);
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoading(false);
    }
  }, [fetchPatients]);

  // Activar/Desactivar paciente
  const toggleActive = useCallback(async (patient: Patient) => {
    setLoading(true);
    setError('');

    try {
      await patientsApi.update({
        id: patient.id,
        active: !patient.active,
      });
      setSuccessMessage(
        `Paciente ${patient.active ? 'desactivado' : 'activado'} exitosamente`
      );
      setTimeout(() => setSuccessMessage(''), 3000);
      await fetchPatients();
    } catch (err) {
      const errorMsg =
        err instanceof ApiError ? err.message : 'Error al cambiar estado del paciente';
      setError(errorMsg);
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoading(false);
    }
  }, [fetchPatients]);

  // Eliminar paciente
  const deletePatient = useCallback(async (patientId: number) => {
    setLoading(true);
    setError('');

    try {
      await patientsApi.deactivate(patientId);
      setSuccessMessage('Paciente eliminado exitosamente');
      setTimeout(() => setSuccessMessage(''), 3000);
      await fetchPatients();
    } catch (err) {
      const errorMsg =
        err instanceof ApiError ? err.message : 'Error al eliminar paciente';
      setError(errorMsg);
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoading(false);
    }
  }, [fetchPatients]);

  // Effect: Cargar datos al montar
  useEffect(() => {
    fetchPatients();
    fetchCaregivers();
  }, [fetchPatients, fetchCaregivers]);

  // Filtrar pacientes por búsqueda (búsqueda en el frontend)
  const filteredPatients = patients.filter((patient) =>
    patient.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return {
    // Estados
    patients: filteredPatients,
    caregivers,
    loading,
    error,
    successMessage,

    // Filtros
    filterActive,
    searchTerm,
    setFilterActive,
    setSearchTerm,

    // Funciones
    fetchPatients,
    fetchCaregivers,
    createPatient,
    updatePatient,
    toggleActive,
    deletePatient,
  };
};




