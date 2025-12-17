import { useState, useEffect } from 'react';
import Select from 'react-select';
import { assignmentsApi, usersApi, patientsApi, ApiError } from '../../api';
import type { Assignment, User, Patient } from '../../api';
import { toastSuccess, toastError, toastWarning } from '../../utils/toast';

// ============================================
// TIPOS
// ============================================
interface AssignmentWithNames {
  id: number;
  caregiver_id: number;
  patient_id: number;
  active: boolean;
  created_at?: string;
  caregiver_name: string;
  patient_name: string;
}

interface AssignableItem {
  id: number;
  name: string;
  type: 'patient' | 'personal';
  email?: string;
}

// ============================================
// COMPONENTE
// ============================================
export default function AsignacionesView() {
  const [assignments, setAssignments] = useState<AssignmentWithNames[]>([]);
  const [caregivers, setCaregivers] = useState<User[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [personalUsers, setPersonalUsers] = useState<User[]>([]);
  const [assignableItems, setAssignableItems] = useState<AssignableItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showCreatePatientForm, setShowCreatePatientForm] = useState(false);

  // Form de asignación
  const [selectedCaregiver, setSelectedCaregiver] = useState<{ value: string; label: string } | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<{ value: string; label: string } | null>(null);

  // Form de crear paciente
  const [patientFormData, setPatientFormData] = useState({
    name: '',
    caregiver_id: '',
    notes: '',
  });

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');

  // Cargar datos al montar
  useEffect(() => {
    fetchAssignments();
    fetchCaregivers();
    fetchPatients();
    fetchPersonalUsers();
  }, []);

  // Combinar pacientes y usuarios PERSONAL en una lista unificada
  useEffect(() => {
    // Crear un Set con los caregiver_ids de todos los pacientes
    // Esto nos permite identificar qué usuarios PERSONAL ya tienen un paciente asociado
    const caregiverIdsWithPatient = new Set(
      patients.map(p => p.caregiver_id).filter(id => id !== undefined && id !== null)
    );

    const items: AssignableItem[] = [
      // Siempre incluir todos los pacientes
      ...patients.map(p => ({
        id: p.id,
        name: p.name,
        type: 'patient' as const,
      })),
      // Solo incluir usuarios PERSONAL que NO tienen un paciente asociado
      // (es decir, cuyo user.id NO está en la lista de caregiver_ids)
      ...personalUsers
        .filter(u => !caregiverIdsWithPatient.has(u.id))
        .map(u => {
          // Si no tiene nombre, usar la parte antes del @ del email
          let displayName = u.name;
          if (!displayName && u.email) {
            displayName = u.email.split('@')[0];
          } else if (!displayName) {
            displayName = 'Sin nombre';
          }
          return {
            id: u.id,
            name: displayName,
            type: 'personal' as const,
            email: u.email,
          };
        }),
    ];
    setAssignableItems(items);
  }, [patients, personalUsers]);

  // Obtener asignaciones
  const fetchAssignments = async () => {
    setLoading(true);

    try {
      const assignments = await assignmentsApi.getAll();

      // Obtener nombres de cuidadores y pacientes/usuarios PERSONAL
      const enrichedData = await Promise.all(
        assignments.map(async (assignment: Assignment) => {
          try {
            // Obtener cuidador
            const caregiver = await usersApi.getById(assignment.caregiver_id);
            let caregiverName = caregiver.name;
            if (!caregiverName && caregiver.email) {
              caregiverName = caregiver.email.split('@')[0];
            } else if (!caregiverName) {
              caregiverName = 'Desconocido';
            }

            let patientName = 'Desconocido';

            // Intentar obtener como paciente primero
            try {
              const patient = await patientsApi.getById(assignment.patient_id);
              patientName = patient.name || 'Desconocido';
            } catch {
              // Si no es paciente, intentar como usuario PERSONAL
              try {
                const user = await usersApi.getById(assignment.patient_id);
                patientName = user.name || user.email || 'Desconocido';
              } catch {
                patientName = 'Desconocido';
              }
            }

            return {
              ...assignment,
              caregiver_name: caregiverName,
              patient_name: patientName,
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
    } catch (err: any) {
      const message = err instanceof ApiError ? err.message : 'Error al cargar asignaciones';
      toastError(message);
    } finally {
      setLoading(false);
    }
  };

  // Obtener cuidadores (ASISTENCIAL activos)
  const fetchCaregivers = async () => {
    try {
      const caregivers = await usersApi.getByRole('ASISTENCIAL');
      setCaregivers(caregivers);
    } catch (err: any) {
      console.error('Error al cargar cuidadores:', err);
    }
  };

  // Obtener pacientes activos
  const fetchPatients = async () => {
    try {
      const response = await patientsApi.list({
        limit: 100,
        filters: {
          active: true,
        },
      });
      setPatients(response.items);
    } catch (err: any) {
      console.error('Error al cargar pacientes:', err);
    }
  };

  // Obtener usuarios PERSONAL activos
  const fetchPersonalUsers = async () => {
    try {
      const personalUsers = await usersApi.getByRole('PERSONAL');
      setPersonalUsers(personalUsers);
    } catch (err: any) {
      console.error('Error al cargar usuarios PERSONAL:', err);
    }
  };

  // Crear asignación
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCaregiver || !selectedPatient) {
      toastWarning('Seleccioná un cuidador y un paciente');
      return;
    }

    const caregiverId = selectedCaregiver.value;
    const patientId = selectedPatient.value;

    // Verificar si ya existe la asignación
    const exists = assignments.some(
      (a) =>
        a.caregiver_id === Number(caregiverId) &&
        a.patient_id === Number(patientId) &&
        a.active
    );

    if (exists) {
      toastWarning('Esta asignación ya existe');
      return;
    }

    setLoading(true);

    try {
      await assignmentsApi.create({
        caregiver_id: Number(caregiverId),
        patient_id: Number(patientId),
      });

      toastSuccess('Asignación creada correctamente');

      setSelectedCaregiver(null);
      setSelectedPatient(null);
      setShowForm(false);

      // Esperar un momento para que el backend procese la asignación
      setTimeout(() => {
        fetchAssignments();
      }, 100);
    } catch (err: any) {
      const message = err instanceof ApiError ? err.message : 'Error al crear asignación';
      toastError(message);
    } finally {
      setLoading(false);
    }
  };

  // Eliminar asignación
  const handleDelete = async (id: number, caregiverName: string, patientName: string) => {
    // Confirmación nativa para operaciones críticas
    const confirmed = window.confirm(
      `¿Confirmar eliminación?\n\nCuidador: ${caregiverName}\nPaciente: ${patientName}\n\nEsta acción no se puede deshacer.`
    );

    if (!confirmed) return;

    setLoading(true);

    try {
      await assignmentsApi.deactivate(id);

      toastSuccess('Asignación eliminada correctamente');

      fetchAssignments();
    } catch (err: any) {
      const message = err instanceof ApiError ? err.message : 'Error al eliminar asignación';
      toastError(message);
    } finally {
      setLoading(false);
    }
  };

  // Cancelar formulario
  const cancelForm = () => {
    setShowForm(false);
    setSelectedCaregiver(null);
    setSelectedPatient(null);
  };

  // Crear paciente
  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Validar que se haya seleccionado un cuidador
    if (!patientFormData.caregiver_id) {
      toastWarning('Seleccioná un cuidador para el paciente');
      setLoading(false);
      return;
    }

    try {
      const caregiverId = Number(patientFormData.caregiver_id);

      // Crear el paciente
      const createResponse: any = await patientsApi.create({
        name: patientFormData.name,
        caregiver_id: caregiverId,
        notes: patientFormData.notes || undefined,
      });

      const createdPatient = createResponse.patient || createResponse.data;

      if (!createdPatient || !createdPatient.id) {
        toastError('No se pudo obtener el ID del paciente creado');
        setLoading(false);
        return;
      }

      // Crear también la asignación en la tabla assignments
      try {
        await assignmentsApi.create({
          caregiver_id: caregiverId,
          patient_id: createdPatient.id,
        });
      } catch (assignError: any) {
        if (assignError instanceof ApiError && assignError.status !== 409) {
          toastWarning(`Paciente creado, pero error al asignar: ${assignError.message}`);
        }
      }

      toastSuccess('Paciente creado y asignado correctamente');

      setPatientFormData({
        name: '',
        caregiver_id: '',
        notes: '',
      });
      setShowCreatePatientForm(false);

      // Recargar pacientes y asignaciones
      fetchPatients();
      fetchAssignments();
    } catch (err: any) {
      const message = err instanceof ApiError ? err.message : 'Error al crear paciente';
      toastError(message);
    } finally {
      setLoading(false);
    }
  };

  // Cancelar formulario de crear paciente
  const cancelPatientForm = () => {
    setShowCreatePatientForm(false);
    setPatientFormData({
      name: '',
      caregiver_id: '',
      notes: '',
    });
  };

  // Obtener IDs de pacientes/usuarios que ya tienen asignación activa
  const assignedIds = new Set(
    assignments
      .filter(a => a.active)
      .map(a => a.patient_id)
  );

  // Preparar opciones para react-select (cuidadores)
  const caregiverOptions = caregivers.map((caregiver) => ({
    value: caregiver.id.toString(),
    label: `${caregiver.name || 'Sin nombre'} (${caregiver.email})`,
  }));

  // Preparar opciones para react-select (pacientes/usuarios personal)
  const assignableOptions = assignableItems
    .filter((item) => !assignedIds.has(item.id)) // Excluir si ya tiene asignación activa
    .map((item) => ({
      value: item.id.toString(),
      label: `${item.name}${item.type === 'personal' ? ' [PERSONAL]' : ' [Paciente]'}`,
    }));

  // Filtrar asignaciones
  const filteredAssignments = assignments.filter((assignment) => {
    const matchesSearch =
      assignment.caregiver_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignment.patient_name.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  // Agrupar asignaciones por cuidador (usar filteredAssignments para mostrar solo las filtradas)
  const groupedAssignments = filteredAssignments.reduce((acc, assignment) => {
    const key = assignment.caregiver_id;
    if (!acc[key]) {
      acc[key] = {
        caregiver_name: assignment.caregiver_name,
        caregiver_id: assignment.caregiver_id,
        patients: [],
      };
    }
    acc[key].patients.push(assignment);
    return acc;
  }, {} as Record<number, { caregiver_name: string; caregiver_id: number; patients: AssignmentWithNames[] }>);

  return (
    <div className="admin-assignments-container">
      {/* Header con gradiente */}
      <div className="admin-assignments-header">
        <div className="header-content">
          <div className="welcome-section">
            <h1 className="admin-assignments-title">Gestión de Asignaciones</h1>
            <p className="admin-assignments-subtitle">Asigna cuidadores a pacientes</p>
          </div>
          {!showForm && !showCreatePatientForm && (
            <div className="header-buttons">
              <button onClick={() => setShowCreatePatientForm(true)} className="admin-btn-add-patient">
                <svg className="btn-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Crear Paciente
              </button>
              <button onClick={() => setShowForm(true)} className="admin-btn-add">
                <svg className="btn-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Nueva Asignación
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="admin-assignments-content">

        {/* Formulario de Crear Paciente */}
        {showCreatePatientForm && (
          <div className="admin-form-card">
            <div className="form-header">
              <h2 className="form-title">Crear Nuevo Paciente</h2>
              <button type="button" onClick={cancelPatientForm} className="btn-close-form">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreatePatient} className="admin-form">
              <div className="form-grid">
                <div className="form-field">
                  <label className="field-label">
                    <svg className="label-icon" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                    </svg>
                    Nombre completo <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    value={patientFormData.name}
                    onChange={(e) => setPatientFormData({ ...patientFormData, name: e.target.value })}
                    className="field-input"
                    placeholder="Ej: María González"
                    required
                  />
                </div>

                <div className="form-field">
                  <label className="field-label">
                    <svg className="label-icon" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                    </svg>
                    Cuidador asignado <span className="required">*</span>
                  </label>
                  <select
                    value={patientFormData.caregiver_id}
                    onChange={(e) => setPatientFormData({ ...patientFormData, caregiver_id: e.target.value })}
                    className="field-input"
                    required
                  >
                    <option value="">Seleccionar cuidador...</option>
                    {caregivers.length === 0 ? (
                      <option value="" disabled>
                        No hay cuidadores disponibles
                      </option>
                    ) : (
                      caregivers.map((caregiver) => (
                        <option key={caregiver.id} value={caregiver.id}>
                          {caregiver.name} ({caregiver.email})
                        </option>
                      ))
                    )}
                  </select>
                  {caregivers.length === 0 && (
                    <small className="field-hint" style={{ color: '#dc2626' }}>
                      ⚠️ No hay cuidadores (ASISTENCIAL) activos en el sistema.
                    </small>
                  )}
                </div>

                <div className="form-field form-field-full">
                  <label className="field-label">
                    <svg className="label-icon" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    Notas
                  </label>
                  <textarea
                    value={patientFormData.notes}
                    onChange={(e) => setPatientFormData({ ...patientFormData, notes: e.target.value })}
                    className="field-textarea"
                    placeholder="Información adicional sobre el paciente..."
                    rows={3}
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="button" onClick={cancelPatientForm} className="btn-cancel">
                  Cancelar
                </button>
                <button type="submit" className="btn-submit" disabled={loading}>
                  {loading ? (
                    <>
                      <svg className="spinner-small" viewBox="0 0 24 24" fill="none">
                        <circle className="spinner-circle" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="spinner-path" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Guardando...
                    </>
                  ) : (
                    <>
                      <svg className="btn-icon-submit" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Crear Paciente
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Formulario de Asignación */}
        {showForm && (
          <div className="admin-form-card">
            <div className="form-header">
              <h2 className="form-title">Nueva Asignación</h2>
              <button type="button" onClick={cancelForm} className="btn-close-form">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreate} className="admin-form">
              <div className="form-grid">
                <div className="form-field">
                  <label className="field-label">
                    <svg className="label-icon" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                    </svg>
                    Cuidador <span className="required">*</span>
                  </label>
                  <Select
                    value={selectedCaregiver}
                    onChange={(option) => setSelectedCaregiver(option)}
                    options={caregiverOptions}
                    placeholder="Seleccionar cuidador..."
                    isSearchable
                    isClearable
                    className="react-select-container"
                    classNamePrefix="react-select"
                    noOptionsMessage={() => 'No se encontraron cuidadores'}
                  />
                </div>

                <div className="form-field">
                  <label className="field-label">
                    <svg className="label-icon" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                    Paciente o Usuario Personal <span className="required">*</span>
                  </label>
                  <Select
                    value={selectedPatient}
                    onChange={(option) => setSelectedPatient(option)}
                    options={assignableOptions}
                    placeholder="Seleccionar paciente o usuario personal..."
                    isSearchable
                    isClearable
                    className="react-select-container"
                    classNamePrefix="react-select"
                    noOptionsMessage={() => 'No se encontraron pacientes ni usuarios personal'}
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="button" onClick={cancelForm} className="btn-cancel">
                  Cancelar
                </button>
                <button type="submit" className="btn-submit" disabled={loading}>
                  {loading ? (
                    <>
                      <svg className="spinner-small" viewBox="0 0 24 24" fill="none">
                        <circle className="spinner-circle" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="spinner-path" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Asignando...
                    </>
                  ) : (
                    <>
                      <svg className="btn-icon-submit" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Crear Asignación
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Filtros */}
        <div className="admin-filters-card">
          <div className="filter-group">
            <label className="filter-label">Buscar</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="filter-input"
              placeholder="Cuidador o paciente..."
            />
          </div>
        </div>

        {/* Lista de asignaciones */}
        {loading && assignments.length === 0 ? (
          <div className="admin-loading">Cargando asignaciones...</div>
        ) : filteredAssignments.length === 0 ? (
          <div className="admin-empty-state">
            <div className="empty-icon">🔗</div>
            <h3 className="empty-title">No hay asignaciones registradas</h3>
            <p className="empty-text">
              {searchTerm
                ? 'Probá cambiando el filtro de búsqueda'
                : 'Hacé clic en "Nueva Asignación" para comenzar'}
            </p>
          </div>
        ) : (
          <div className="admin-assignments-grid">
            {Object.values(groupedAssignments).map((group) => (
              <div key={group.caregiver_id} className="admin-caregiver-card">
                <div className="caregiver-card-header">
                  <div className="caregiver-icon-wrapper">
                    <svg className="caregiver-icon" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                    </svg>
                  </div>
                  <div className="caregiver-info">
                    <h3 className="caregiver-name">{group.caregiver_name}</h3>
                    <p className="caregiver-count">
                      {group.patients.length} paciente{group.patients.length !== 1 ? 's' : ''} asignado{group.patients.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                <div className="patients-grid">
                  {group.patients.map((assignment) => (
                    <div key={assignment.id} className="admin-patient-item">
                      <div className="patient-icon-wrapper">
                        <svg className="patient-icon" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="patient-info">
                        <div className="patient-name">{assignment.patient_name}</div>
                        <div className="patient-date">
                          Desde: {new Date(assignment.created_at || '').toLocaleDateString('es-AR')}
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          handleDelete(
                            assignment.id,
                            assignment.caregiver_name,
                            assignment.patient_name
                          )
                        }
                        className="admin-btn-remove"
                        title="Eliminar asignación"
                      >
                        <svg className="remove-icon" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .admin-assignments-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #f5f7fa 0%, #e9ecef 100%);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          padding-bottom: 4rem;
        }

        .admin-assignments-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 3rem 2rem 4rem;
          position: relative;
          overflow: hidden;
        }

        .admin-assignments-header::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: url('data:image/svg+xml,<svg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><circle cx="30" cy="30" r="1.5" fill="rgba(255,255,255,0.1)"/></svg>');
          opacity: 0.5;
        }

        .header-content {
          max-width: 1400px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1.5rem;
          position: relative;
          z-index: 1;
        }

        .welcome-section {
          animation: slideInLeft 0.6s ease-out;
        }

        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .admin-assignments-title {
          font-size: 2.5rem;
          font-weight: 800;
          color: #fff;
          margin: 0 0 0.5rem 0;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }

        .admin-assignments-subtitle {
          font-size: 1.125rem;
          color: rgba(255, 255, 255, 0.9);
          margin: 0;
          font-weight: 500;
        }

        .header-buttons {
          display: flex;
          gap: 1rem;
        }

        .admin-btn-add {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          padding: 1rem 1.75rem;
          background: rgba(255, 255, 255, 0.95);
          color: #667eea;
          border: none;
          border-radius: 14px;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
          animation: slideInRight 0.6s ease-out;
          font-family: inherit;
        }

        .admin-btn-add-patient {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          padding: 1rem 1.75rem;
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.9) 0%, rgba(5, 150, 105, 0.9) 100%);
          color: #fff;
          border: none;
          border-radius: 14px;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 8px 20px rgba(16, 185, 129, 0.3);
          animation: slideInRight 0.6s ease-out;
          font-family: inherit;
        }

        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .admin-btn-add:hover {
          background: #fff;
          transform: translateY(-3px);
          box-shadow: 0 12px 28px rgba(0, 0, 0, 0.2);
        }

        .admin-btn-add-patient:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 28px rgba(16, 185, 129, 0.4);
        }

        .btn-icon {
          width: 20px;
          height: 20px;
        }

        .admin-assignments-content {
          max-width: 1400px;
          margin: -2rem auto 0;
          padding: 0 2rem;
          position: relative;
          z-index: 5;
        }

        .admin-form-card {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-radius: 24px;
          padding: 2rem;
          margin-bottom: 2rem;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.8);
          animation: scaleIn 0.4s ease-out;
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .form-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          padding-bottom: 1.5rem;
          border-bottom: 2px solid #f3f4f6;
        }

        .form-title {
          font-size: 1.75rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0;
        }

        .btn-close-form {
          width: 40px;
          height: 40px;
          border: none;
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          border-radius: 10px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
        }

        .btn-close-form:hover {
          background: rgba(239, 68, 68, 0.2);
          transform: rotate(90deg);
        }

        .btn-close-form svg {
          width: 20px;
          height: 20px;
        }

        .admin-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
        }

        .form-field {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-field-full {
          grid-column: 1 / -1;
        }

        .field-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9375rem;
          font-weight: 600;
          color: #374151;
        }

        .label-icon {
          width: 18px;
          height: 18px;
          color: #667eea;
        }

        .required {
          color: #ef4444;
          font-weight: 700;
        }

        .field-input,
        .field-textarea {
          padding: 1rem;
          font-size: 1rem;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          outline: none;
          transition: all 0.3s ease;
          background: #f9fafb;
          font-family: inherit;
        }

        .field-input:focus,
        .field-textarea:focus {
          border-color: #667eea;
          background: #fff;
          box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
          transform: translateY(-1px);
        }

        .field-textarea {
          resize: vertical;
        }

        /* React Select Styles */
        .react-select-container {
          margin-top: 0.5rem;
        }

        .react-select__control {
          min-height: 48px;
          border: 2px solid #e5e7eb !important;
          border-radius: 12px !important;
          background: #fff !important;
          box-shadow: none !important;
          transition: all 0.3s ease !important;
        }

        .react-select__control:hover {
          border-color: #d1d5db !important;
        }

        .react-select__control--is-focused {
          border-color: #667eea !important;
          box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1) !important;
          transform: translateY(-1px);
        }

        .react-select__value-container {
          padding: 0.5rem 1rem !important;
        }

        .react-select__input-container {
          margin: 0 !important;
          padding: 0 !important;
        }

        .react-select__input {
          font-size: 1rem !important;
          color: #1f2937 !important;
        }

        .react-select__single-value {
          color: #1f2937 !important;
          font-size: 1rem !important;
        }

        .react-select__placeholder {
          color: #9ca3af !important;
          font-size: 1rem !important;
        }

        .react-select__indicator-separator {
          display: none !important;
        }

        .react-select__dropdown-indicator {
          color: #6b7280 !important;
          padding: 0.5rem !important;
        }

        .react-select__dropdown-indicator:hover {
          color: #667eea !important;
        }

        .react-select__clear-indicator {
          color: #6b7280 !important;
          padding: 0.5rem !important;
        }

        .react-select__clear-indicator:hover {
          color: #ef4444 !important;
        }

        .react-select__menu {
          border-radius: 12px !important;
          border: 2px solid #e5e7eb !important;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1) !important;
          margin-top: 0.5rem !important;
          overflow: hidden !important;
        }

        .react-select__menu-list {
          padding: 0.5rem !important;
        }

        .react-select__option {
          padding: 0.75rem 1rem !important;
          border-radius: 8px !important;
          font-size: 1rem !important;
          color: #1f2937 !important;
          cursor: pointer !important;
          transition: all 0.2s ease !important;
        }

        .react-select__option:hover {
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%) !important;
          color: #667eea !important;
        }

        .react-select__option--is-selected {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
          color: #fff !important;
        }

        .react-select__option--is-focused {
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%) !important;
          color: #667eea !important;
        }

        .react-select__option--is-focused.react-select__option--is-selected {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
          color: #fff !important;
        }

        .field-hint {
          font-size: 0.875rem;
          color: #6b7280;
          font-style: italic;
        }

        .form-actions {
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
          padding-top: 1rem;
          border-top: 2px solid #f3f4f6;
        }

        .btn-cancel {
          padding: 1rem 2rem;
          border: 2px solid #e5e7eb;
          background: #fff;
          color: #6b7280;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          font-family: inherit;
        }

        .btn-cancel:hover {
          background: #f9fafb;
          border-color: #d1d5db;
          transform: translateY(-2px);
        }

        .btn-submit {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          padding: 1rem 2rem;
          border: none;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #fff;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
          font-family: inherit;
        }

        .btn-submit:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 12px 28px rgba(102, 126, 234, 0.4);
        }

        .btn-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-icon-submit {
          width: 20px;
          height: 20px;
        }

        .spinner-small {
          width: 20px;
          height: 20px;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .spinner-circle {
          opacity: 0.25;
        }

        .spinner-path {
          opacity: 0.75;
        }

        .admin-filters-card {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-radius: 24px;
          padding: 1.5rem 2rem;
          margin-bottom: 2rem;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.8);
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .filter-label {
          font-size: 0.875rem;
          font-weight: 600;
          color: #374151;
        }

        .filter-input {
          padding: 0.875rem 1rem;
          font-size: 0.9375rem;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          outline: none;
          transition: all 0.3s ease;
          background: #f9fafb;
          font-family: inherit;
        }

        .filter-input:focus {
          border-color: #667eea;
          background: #fff;
          box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
        }

        .admin-loading {
          text-align: center;
          padding: 3rem;
          color: #6b7280;
          font-size: 1rem;
        }

        .admin-empty-state {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(10px);
          border-radius: 24px;
          padding: 4rem 2rem;
          text-align: center;
          border: 2px dashed #e5e7eb;
        }

        .empty-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
          opacity: 0.5;
        }

        .empty-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #4b5563;
          margin: 0 0 0.5rem 0;
        }

        .empty-text {
          font-size: 1rem;
          color: #6b7280;
          margin: 0;
          line-height: 1.6;
        }

        .admin-assignments-grid {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .admin-caregiver-card {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-radius: 24px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.8);
          overflow: hidden;
          animation: fadeInUp 0.6s ease-out both;
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .caregiver-card-header {
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
          padding: 1.75rem 2rem;
          display: flex;
          align-items: center;
          gap: 1.25rem;
          border-bottom: 2px solid rgba(102, 126, 234, 0.2);
        }

        .caregiver-icon-wrapper {
          width: 56px;
          height: 56px;
          border-radius: 14px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
        }

        .caregiver-icon {
          width: 28px;
          height: 28px;
          color: #fff;
        }

        .caregiver-info {
          flex: 1;
        }

        .caregiver-name {
          font-size: 1.375rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 0.25rem 0;
        }

        .caregiver-count {
          font-size: 0.9375rem;
          color: #6b7280;
          margin: 0;
          font-weight: 500;
        }

        .patients-grid {
          padding: 1.75rem 2rem;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1rem;
        }

        .admin-patient-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.25rem;
          background: rgba(255, 255, 255, 0.7);
          border-radius: 16px;
          border: 1px solid rgba(102, 126, 234, 0.1);
          transition: all 0.3s ease;
          position: relative;
        }

        .admin-patient-item:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
          background: rgba(255, 255, 255, 0.95);
          border-color: rgba(102, 126, 234, 0.3);
        }

        .patient-icon-wrapper {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .patient-icon {
          width: 24px;
          height: 24px;
          color: #10b981;
        }

        .patient-info {
          flex: 1;
        }

        .patient-name {
          font-size: 1rem;
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 0.25rem;
        }

        .patient-date {
          font-size: 0.8125rem;
          color: #6b7280;
        }

        .admin-btn-remove {
          width: 36px;
          height: 36px;
          padding: 0;
          border: none;
          border-radius: 10px;
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .admin-btn-remove:hover {
          background: rgba(239, 68, 68, 0.2);
          transform: translateY(-2px) scale(1.05);
        }

        .remove-icon {
          width: 18px;
          height: 18px;
        }

        @media (max-width: 768px) {
          .admin-assignments-header {
            padding: 2rem 1.5rem 3rem;
          }

          .admin-assignments-title {
            font-size: 2rem;
          }

          .admin-assignments-content {
            padding: 0 1.5rem;
          }

          .header-buttons {
            flex-direction: column;
            width: 100%;
          }

          .admin-btn-add,
          .admin-btn-add-patient {
            width: 100%;
            justify-content: center;
          }

          .form-grid {
            grid-template-columns: 1fr;
          }

          .form-actions {
            flex-direction: column;
          }

          .btn-cancel,
          .btn-submit {
            width: 100%;
            justify-content: center;
          }

          .patients-grid {
            grid-template-columns: 1fr;
            padding: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
}

