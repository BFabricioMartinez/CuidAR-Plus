import { useState, useEffect } from 'react';
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
  const [selectedCaregiver, setSelectedCaregiver] = useState<string>('');
  const [selectedPatient, setSelectedPatient] = useState<string>('');

  // Form de crear paciente
  const [patientFormData, setPatientFormData] = useState({
    name: '',
    caregiver_id: '',
    notes: '',
  });

  // Búsqueda en selects
  const [caregiverSearch, setCaregiverSearch] = useState<string>('');
  const [patientSearch, setPatientSearch] = useState<string>('');

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

    // Verificar si ya existe la asignación
    const exists = assignments.some(
      (a) =>
        a.caregiver_id === Number(selectedCaregiver) &&
        a.patient_id === Number(selectedPatient) &&
        a.active
    );

    if (exists) {
      toastWarning('Esta asignación ya existe');
      return;
    }

    setLoading(true);

    try {
      await assignmentsApi.create({
        caregiver_id: Number(selectedCaregiver),
        patient_id: Number(selectedPatient),
      });

      toastSuccess('Asignación creada correctamente');

      setSelectedCaregiver('');
      setSelectedPatient('');
      setCaregiverSearch('');
      setPatientSearch('');
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
    setSelectedCaregiver('');
    setSelectedPatient('');
    setCaregiverSearch('');
    setPatientSearch('');
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

  // Filtrar cuidadores por búsqueda
  const filteredCaregivers = caregivers.filter((caregiver) =>
    caregiver.name?.toLowerCase().includes(caregiverSearch.toLowerCase()) ||
    caregiver.email.toLowerCase().includes(caregiverSearch.toLowerCase())
  );

  // Obtener IDs de pacientes/usuarios que ya tienen asignación activa
  const assignedIds = new Set(
    assignments
      .filter(a => a.active)
      .map(a => a.patient_id)
  );

  // Filtrar items asignables: excluir los que ya tienen asignación y aplicar búsqueda
  const filteredAssignableItems = assignableItems.filter((item) => {
    // Excluir si ya tiene asignación activa
    if (assignedIds.has(item.id)) {
      return false;
    }
    // Aplicar filtro de búsqueda
    return (
      item.name.toLowerCase().includes(patientSearch.toLowerCase()) ||
      (item.email && item.email.toLowerCase().includes(patientSearch.toLowerCase()))
    );
  });

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
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Gestión de Asignaciones</h1>
          <p style={styles.subtitle}>Asigna cuidadores a pacientes</p>
        </div>
        {!showForm && !showCreatePatientForm && (
          <div style={styles.headerButtons}>
            <button onClick={() => setShowCreatePatientForm(true)} style={styles.btnAddPatient}>
              + Crear Paciente
            </button>
            <button onClick={() => setShowForm(true)} style={styles.btnAdd}>
              + Nueva Asignación
            </button>
          </div>
        )}
      </div>

      {/* Formulario de Crear Paciente */}
      {showCreatePatientForm && (
        <div style={styles.formCard}>
          <h2 style={styles.formTitle}>Crear Nuevo Paciente</h2>

          <form onSubmit={handleCreatePatient} style={styles.form}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Nombre completo *</label>
              <input
                type="text"
                value={patientFormData.name}
                onChange={(e) => setPatientFormData({ ...patientFormData, name: e.target.value })}
                style={styles.input}
                placeholder="Ej: María González"
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Cuidador asignado *</label>
              <select
                value={patientFormData.caregiver_id}
                onChange={(e) => setPatientFormData({ ...patientFormData, caregiver_id: e.target.value })}
                style={styles.select}
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
                <small style={{ ...styles.hint, color: '#dc2626' }}>
                  ⚠️ No hay cuidadores (ASISTENCIAL) activos en el sistema.
                </small>
              )}
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Notas</label>
              <textarea
                value={patientFormData.notes}
                onChange={(e) => setPatientFormData({ ...patientFormData, notes: e.target.value })}
                style={styles.textarea}
                placeholder="Información adicional sobre el paciente..."
                rows={3}
              />
            </div>

            <div style={styles.formActions}>
              <button type="button" onClick={cancelPatientForm} style={styles.btnCancel}>
                Cancelar
              </button>
              <button type="submit" style={styles.btnSubmit} disabled={loading}>
                {loading ? 'Guardando...' : 'Crear Paciente'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Formulario de Asignación */}
      {showForm && (
        <div style={styles.formCard}>
          <h2 style={styles.formTitle}>Nueva Asignación</h2>

          <form onSubmit={handleCreate} style={styles.form}>
            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Cuidador *</label>
                <input
                  type="text"
                  placeholder="Buscar cuidador..."
                  value={caregiverSearch}
                  onChange={(e) => setCaregiverSearch(e.target.value)}
                  style={styles.searchInput}
                />
                <select
                  value={selectedCaregiver}
                  onChange={(e) => setSelectedCaregiver(e.target.value)}
                  style={styles.selectWithScroll}
                  required
                  size={5}
                >
                  <option value="">Seleccionar cuidador...</option>
                  {filteredCaregivers.map((caregiver) => (
                    <option key={caregiver.id} value={caregiver.id}>
                      {caregiver.name} ({caregiver.email})
                    </option>
                  ))}
                </select>
                {filteredCaregivers.length === 0 && caregiverSearch && (
                  <small style={styles.hint}>No se encontraron cuidadores</small>
                )}
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Paciente o Usuario Personal *</label>
                <input
                  type="text"
                  placeholder="Buscar paciente o usuario personal..."
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  style={styles.searchInput}
                />
                <select
                  value={selectedPatient}
                  onChange={(e) => setSelectedPatient(e.target.value)}
                  style={styles.selectWithScroll}
                  required
                  size={5}
                >
                  <option value="">Seleccionar paciente o usuario personal...</option>
                  {filteredAssignableItems.map((item) => (
                    <option key={`${item.type}-${item.id}`} value={item.id}>
                      {item.name} {item.type === 'personal' ? ' [PERSONAL]' : ' [Paciente]'}
                    </option>
                  ))}
                </select>
                {filteredAssignableItems.length === 0 && patientSearch && (
                  <small style={styles.hint}>No se encontraron pacientes ni usuarios personal</small>
                )}
              </div>
            </div>

            <div style={styles.formActions}>
              <button type="button" onClick={cancelForm} style={styles.btnCancel}>
                Cancelar
              </button>
              <button type="submit" style={styles.btnSubmit} disabled={loading}>
                {loading ? 'Asignando...' : 'Crear Asignación'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filtros */}
      <div style={styles.filtersCard}>
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Buscar</label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.filterInput}
            placeholder="Cuidador o paciente..."
          />
        </div>
      </div>

      {/* Lista de asignaciones */}
      {loading && assignments.length === 0 ? (
        <div style={styles.loading}>Cargando asignaciones...</div>
      ) : filteredAssignments.length === 0 ? (
        <div style={styles.emptyState}>
          <p>🔗 No hay asignaciones registradas</p>
          <p style={styles.emptyHint}>
            {searchTerm
              ? 'Probá cambiando el filtro de búsqueda'
              : 'Hacé clic en "Nueva Asignación" para comenzar'}
          </p>
        </div>
      ) : (
        <div style={styles.assignmentsContainer}>
          {Object.values(groupedAssignments).map((group) => (
            <div key={group.caregiver_id} style={styles.caregiverCard}>
              <div style={styles.caregiverHeader}>
                <div style={styles.caregiverIcon}>👨‍⚕️</div>
                <div style={styles.caregiverInfo}>
                  <h3 style={styles.caregiverName}>{group.caregiver_name}</h3>
                  <p style={styles.caregiverCount}>
                    {group.patients.length} paciente{group.patients.length !== 1 ? 's' : ''} asignado{group.patients.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              <div style={styles.patientsGrid}>
                {group.patients.map((assignment) => (
                  <div key={assignment.id} style={styles.patientItem}>
                    <div style={styles.patientIcon}>🏥</div>
                    <div style={styles.patientInfo}>
                      <div style={styles.patientName}>{assignment.patient_name}</div>
                      <div style={styles.patientDate}>
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
                      style={styles.btnRemove}
                      title="Eliminar asignación"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// ESTILOS
// ============================================
const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
  },
  title: {
    fontSize: '32px',
    fontWeight: 700,
    color: '#1f2937',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '16px',
    color: '#6b7280',
    margin: 0,
  },
  headerButtons: {
    display: 'flex',
    gap: '12px',
  },
  btnAdd: {
    backgroundColor: '#667eea',
    color: '#fff',
    padding: '12px 24px',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  btnAddPatient: {
    backgroundColor: '#10b981',
    color: '#fff',
    padding: '12px 24px',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    color: '#6b7280',
  },
  errorAlert: {
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '20px',
    border: '1px solid #fecaca',
  },
  successAlert: {
    backgroundColor: '#f0fdf4',
    color: '#16a34a',
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '20px',
    border: '1px solid #bbf7d0',
  },
  formCard: {
    backgroundColor: '#fff',
    padding: '30px',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    marginBottom: '30px',
  },
  formTitle: {
    fontSize: '24px',
    fontWeight: 600,
    color: '#1f2937',
    marginBottom: '20px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
  },
  input: {
    padding: '12px',
    fontSize: '15px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  select: {
    padding: '12px',
    fontSize: '15px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    outline: 'none',
    cursor: 'pointer',
    backgroundColor: '#fff',
  },
  textarea: {
    padding: '12px',
    fontSize: '15px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    outline: 'none',
    transition: 'border-color 0.2s',
    fontFamily: 'inherit',
    resize: 'vertical',
  },
  searchInput: {
    padding: '10px',
    fontSize: '14px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    outline: 'none',
    marginBottom: '8px',
    transition: 'border-color 0.2s',
  },
  selectWithScroll: {
    padding: '8px',
    fontSize: '14px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    outline: 'none',
    cursor: 'pointer',
    backgroundColor: '#fff',
    overflowY: 'auto',
    maxHeight: '150px',
  },
  hint: {
    fontSize: '12px',
    color: '#9ca3af',
    marginTop: '4px',
  },
  formActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    marginTop: '10px',
  },
  btnCancel: {
    padding: '12px 24px',
    fontSize: '15px',
    fontWeight: 600,
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    backgroundColor: '#fff',
    color: '#6b7280',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  btnSubmit: {
    padding: '12px 24px',
    fontSize: '15px',
    fontWeight: 600,
    border: 'none',
    borderRadius: '8px',
    backgroundColor: '#667eea',
    color: '#fff',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  filtersCard: {
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    marginBottom: '20px',
  },
  filtersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '15px',
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  filterLabel: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
  },
  filterInput: {
    padding: '10px',
    fontSize: '14px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    outline: 'none',
  },
  filterSelect: {
    padding: '10px',
    fontSize: '14px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    outline: 'none',
    cursor: 'pointer',
  },
  emptyState: {
    backgroundColor: '#f9fafb',
    padding: '60px 40px',
    borderRadius: '12px',
    textAlign: 'center',
    color: '#6b7280',
  },
  emptyHint: {
    fontSize: '14px',
    marginTop: '8px',
  },
  assignmentsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  caregiverCard: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    overflow: 'hidden',
  },
  caregiverHeader: {
    backgroundColor: '#f9fafb',
    padding: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    borderBottom: '2px solid #e5e7eb',
  },
  caregiverIcon: {
    fontSize: '32px',
  },
  caregiverInfo: {
    flex: 1,
  },
  caregiverName: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#1f2937',
    margin: '0 0 4px 0',
  },
  caregiverCount: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
  },
  patientsGrid: {
    padding: '20px',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '15px',
  },
  patientItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '15px',
    backgroundColor: '#f9fafb',
    borderRadius: '10px',
    border: '1px solid #e5e7eb',
    transition: 'all 0.2s',
  },
  patientIcon: {
    fontSize: '24px',
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#1f2937',
    marginBottom: '4px',
  },
  patientDate: {
    fontSize: '12px',
    color: '#6b7280',
  },
  btnRemove: {
    width: '28px',
    height: '28px',
    padding: 0,
    fontSize: '14px',
    border: 'none',
    borderRadius: '50%',
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};

// Hover effects
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  .patient-item:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  }
`;
document.head.appendChild(styleSheet);
