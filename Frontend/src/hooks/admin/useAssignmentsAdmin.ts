import { useState, useCallback, useEffect } from 'react';
import { assignmentsApi, usersApi, patientsApi, ApiError } from '../../api';
import type { Assignment, User, Patient } from '../../api';

// ============================================
// TIPOS
// ============================================

export interface AssignmentWithNames extends Assignment {
  caregiver_name: string;
  patient_name: string;
}

// ============================================
// HOOK useAssignmentsAdmin
// ============================================

export const useAssignmentsAdmin = () => {
  const [assignments, setAssignments] = useState<AssignmentWithNames[]>([]);
  const [caregivers, setCaregivers] = useState<User[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Filtros
  const [filterCaregiver, setFilterCaregiver] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Obtener asignaciones
  const fetchAssignments = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await assignmentsApi.getAll();

      // Enriquecer con nombres de cuidadores y pacientes
      const enrichedData = await Promise.all(
        response.map(async (assignment: Assignment) => {
          try {
            const [caregiver, patient] = await Promise.all([
              usersApi.getById(assignment.caregiver_id),
              patientsApi.getById(assignment.patient_id),
            ]);

            return {
              ...assignment,
              caregiver_name: caregiver.name || 'Desconocido',
              patient_name: patient.name || 'Desconocido',
            };
          } catch {
            return {
              ...assignment,
              caregiver_name: 'Desconocido',
              patient_name: 'Desconocido',
            };
          }
        })
      );

      setAssignments(enrichedData);
    } catch (err) {
      const errorMsg =
        err instanceof ApiError ? err.message : 'Error al cargar asignaciones';
      setError(errorMsg);
      console.error('Error loading assignments:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Obtener cuidadores (ASISTENCIAL activos)
  const fetchCaregivers = useCallback(async () => {
    try {
      const caregiversData = await usersApi.getByRole('ASISTENCIAL');
      setCaregivers(caregiversData);
    } catch (err) {
      console.error('Error loading caregivers:', err);
    }
  }, []);

  // Obtener pacientes activos
  const fetchPatients = useCallback(async () => {
    try {
      const response = await patientsApi.list({
        limit: 100,
        filters: { active: true },
      });
      setPatients(response.items);
    } catch (err) {
      console.error('Error loading patients:', err);
    }
  }, []);

  // Crear asignación
  const createAssignment = useCallback(
    async (caregiverId: number, patientId: number) => {
      setLoading(true);
      setError('');

      try {
        // Verificar si ya existe la asignación
        const exists = assignments.some(
          (a) =>
            a.caregiver_id === caregiverId &&
            a.patient_id === patientId &&
            a.active
        );

        if (exists) {
          setError('Esta asignación ya existe');
          setTimeout(() => setError(''), 3000);
          setLoading(false);
          return;
        }

        await assignmentsApi.create({
          caregiver_id: caregiverId,
          patient_id: patientId,
        });

        setSuccessMessage('Asignación creada exitosamente ✓');
        setTimeout(() => setSuccessMessage(''), 3000);
        await fetchAssignments();
      } catch (err) {
        const errorMsg =
          err instanceof ApiError ? err.message : 'Error al crear asignación';
        setError(errorMsg);
        setTimeout(() => setError(''), 5000);
      } finally {
        setLoading(false);
      }
    },
    [assignments, fetchAssignments]
  );

  // Eliminar asignación
  const deleteAssignment = useCallback(
    async (assignmentId: number) => {
      setLoading(true);
      setError('');

      try {
        await assignmentsApi.deactivate(assignmentId);
        setSuccessMessage('Asignación eliminada exitosamente');
        setTimeout(() => setSuccessMessage(''), 3000);
        await fetchAssignments();
      } catch (err) {
        const errorMsg =
          err instanceof ApiError ? err.message : 'Error al eliminar asignación';
        setError(errorMsg);
        setTimeout(() => setError(''), 5000);
      } finally {
        setLoading(false);
      }
    },
    [fetchAssignments]
  );

  // Effect: Cargar datos al montar
  useEffect(() => {
    fetchAssignments();
    fetchCaregivers();
    fetchPatients();
  }, [fetchAssignments, fetchCaregivers, fetchPatients]);

  // Filtrar asignaciones
  const filteredAssignments = assignments.filter((assignment) => {
    const matchesCaregiver =
      filterCaregiver === 'all' ||
      assignment.caregiver_id === Number(filterCaregiver);

    const matchesSearch =
      assignment.caregiver_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignment.patient_name.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesCaregiver && matchesSearch;
  });

  return {
    // Estados
    assignments: filteredAssignments,
    caregivers,
    patients,
    loading,
    error,
    successMessage,

    // Filtros
    filterCaregiver,
    searchTerm,
    setFilterCaregiver,
    setSearchTerm,

    // Funciones
    fetchAssignments,
    fetchCaregivers,
    fetchPatients,
    createAssignment,
    deleteAssignment,
  };
};




