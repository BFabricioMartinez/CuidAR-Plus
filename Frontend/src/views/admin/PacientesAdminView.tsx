import { useState, useEffect } from 'react';
import { patientsApi, usersApi, assignmentsApi, ApiError } from '../../api';
import type { Patient, User } from '../../api';

// ============================================
// TIPOS
// ============================================

interface PatientForm {
  name: string;
  caregiver_id: string;
  notes: string;
}

// ============================================
// COMPONENTE
// ============================================
export default function PacientesAdminView() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [caregivers, setCaregivers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [caregiverNames, setCaregiverNames] = useState<Record<number, string>>({});

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState<string>('all');

  const [formData, setFormData] = useState<PatientForm>({
    name: '',
    caregiver_id: '',
    notes: '',
  });


  // Cargar pacientes y cuidadores al montar
  useEffect(() => {
    fetchPatients();
    fetchCaregivers();
  }, [filterActive]);

  // Obtener pacientes
  const fetchPatients = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await patientsApi.list({
        limit: 100,
        filters: {
          ...(filterActive !== 'all' && { active: filterActive === 'true' }),
        },
      });

      setPatients(response.items);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Error al cargar pacientes');
      }
    } finally {
      setLoading(false);
    }
  };

  // Obtener cuidadores (usuarios ASISTENCIAL activos)
  const fetchCaregivers = async () => {
    try {
      const caregivers = await usersApi.getByRole('ASISTENCIAL');
      setCaregivers(caregivers);
      if (caregivers.length === 0) {
        console.warn('No hay cuidadores (ASISTENCIAL) disponibles en el sistema');
      }
    } catch (err: any) {
      console.error('Error al cargar cuidadores:', err);
      if (err instanceof ApiError) {
        setError(`Error al cargar cuidadores: ${err.message}`);
      }
    }
  };

  // Manejar cambios en formulario
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Crear paciente
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validar que se haya seleccionado un cuidador
    if (!formData.caregiver_id) {
      setError('Debes seleccionar un cuidador para crear el paciente');
      setTimeout(() => setError(''), 5000);
      setLoading(false);
      return;
    }

    try {
      const caregiverId = Number(formData.caregiver_id);
      
      // Crear el paciente
      const createResponse: any = await patientsApi.create({
        name: formData.name,
        caregiver_id: caregiverId,
        notes: formData.notes || undefined,
      });

      // El backend devuelve { message: "...", patient: {...} }
      console.log('📦 Respuesta completa del backend:', createResponse);
      const createdPatient = createResponse.patient || createResponse.data;
      
      if (!createdPatient || !createdPatient.id) {
        console.error('❌ No se pudo obtener el ID del paciente creado. Respuesta:', createResponse);
        setError('Error: No se pudo obtener el ID del paciente creado');
        setTimeout(() => setError(''), 5000);
        setLoading(false);
        return;
      }
      
      console.log('📋 Paciente creado con ID:', createdPatient.id);
      
      // Crear también la asignación en la tabla assignments
      try {
        console.log('🔗 Creando asignación para paciente ID:', createdPatient.id, 'cuidador ID:', caregiverId);
        const assignmentResult = await assignmentsApi.create({
          caregiver_id: caregiverId,
          patient_id: createdPatient.id,
        });
        console.log('✅ Asignación creada exitosamente:', assignmentResult);
      } catch (assignError: any) {
        console.error('❌ Error completo al crear asignación:', assignError);
        // Si la asignación ya existe, no es un error crítico
        if (assignError instanceof ApiError) {
          if (assignError.status === 409) {
            console.log('ℹ️ Asignación ya existe (409), continuando...');
          } else {
            console.error('❌ Error de API al crear asignación:', assignError.status, assignError.message);
            setError(`⚠️ Paciente creado pero error al asignar: ${assignError.message}`);
            setTimeout(() => setError(''), 7000);
          }
        } else {
          console.error('❌ Error desconocido al crear asignación:', assignError);
          setError(`⚠️ Paciente creado pero error al asignar. Ver consola para más detalles.`);
          setTimeout(() => setError(''), 7000);
        }
      }

      setSuccessMessage('Paciente creado exitosamente ✓');
      setTimeout(() => setSuccessMessage(''), 3000);

      setFormData({
        name: '',
        caregiver_id: '',
        notes: '',
      });
      setShowForm(false);

      fetchPatients();
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Error al crear paciente');
      }
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  // Editar paciente
  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPatient) return;

    setLoading(true);
    setError('');

    try {
      await patientsApi.update({
        id: editingPatient.id,
        name: formData.name,
        caregiver_id: formData.caregiver_id ? Number(formData.caregiver_id) : undefined,
        notes: formData.notes || undefined,
      });

      setSuccessMessage('Paciente actualizado exitosamente ✓');
      setTimeout(() => setSuccessMessage(''), 3000);

      setFormData({
        name: '',
        caregiver_id: '',
        notes: '',
      });
      setEditingPatient(null);
      setShowForm(false);

      fetchPatients();
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Error al actualizar paciente');
      }
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  // Activar/Desactivar paciente
  const handleToggleActive = async (patient: Patient) => {
    if (
      !confirm(
        `¿Estás seguro de ${patient.active ? 'desactivar' : 'activar'} a ${patient.name}?`
      )
    )
      return;

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

      fetchPatients();
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Error al cambiar estado del paciente');
      }
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  // Eliminar paciente
  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este paciente?')) return;

    setLoading(true);
    setError('');

    try {
      await patientsApi.deactivate(id);

      setSuccessMessage('Paciente eliminado exitosamente');
      setTimeout(() => setSuccessMessage(''), 3000);

      fetchPatients();
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Error al eliminar paciente');
      }
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  // Abrir formulario para editar
  const openEditForm = (patient: Patient) => {
    setEditingPatient(patient);
    setFormData({
      name: patient.name,
      caregiver_id: patient.caregiver_id?.toString() || '',
      notes: patient.notes || '',
    });
    setShowForm(true);
  };

  // Cancelar formulario
  const cancelForm = () => {
    setShowForm(false);
    setEditingPatient(null);
    setFormData({
      name: '',
      caregiver_id: '',
      notes: '',
    });
  };

  // Filtrar pacientes por búsqueda
  const filteredPatients = patients.filter((patient) =>
    patient.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Obtener nombre del cuidador
  const getCaregiverName = async (caregiverId?: number): Promise<string> => {
    if (!caregiverId) return 'Sin asignar';
    const caregiver = caregivers.find((c) => c.id === caregiverId);
    if (caregiver) return caregiver.name || 'Sin nombre';
    
    // Si no está en el array, intentar cargarlo desde la API
    try {
      const caregiverData = await usersApi.getById(caregiverId);
      return caregiverData.name || 'Sin nombre';
    } catch {
      return 'Desconocido';
    }
  };

  // Cargar nombres de cuidadores que no están en el array
  useEffect(() => {
    const loadMissingCaregiverNames = async () => {
      const missingIds = patients
        .filter(p => p.caregiver_id && !caregivers.find(c => c.id === p.caregiver_id))
        .map(p => p.caregiver_id!)
        .filter((id, index, self) => self.indexOf(id) === index); // unique

      if (missingIds.length === 0) return;

      const names: Record<number, string> = {};
      await Promise.all(
        missingIds.map(async (id) => {
          try {
            const caregiver = await usersApi.getById(id);
            names[id] = caregiver.name || 'Sin nombre';
          } catch {
            names[id] = 'Desconocido';
          }
        })
      );
      setCaregiverNames(prev => ({ ...prev, ...names }));
    };

    if (patients.length > 0) {
      loadMissingCaregiverNames();
    }
  }, [patients, caregivers]);

  // Función síncrona para obtener nombre del cuidador
  const getCaregiverNameSync = (caregiverId?: number): string => {
    if (!caregiverId) return 'Sin asignar';
    const caregiver = caregivers.find((c) => c.id === caregiverId);
    if (caregiver) return caregiver.name || 'Sin nombre';
    return caregiverNames[caregiverId] || 'Cargando...';
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Gestión de Pacientes</h1>
          <p style={styles.subtitle}>Administra todos los pacientes del sistema</p>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} style={styles.btnAdd}>
            + Crear Paciente
          </button>
        )}
      </div>

      {/* Mensajes */}
      {error && <div style={styles.errorAlert}>⚠️ {error}</div>}
      {successMessage && <div style={styles.successAlert}>✓ {successMessage}</div>}

      {/* Formulario */}
      {showForm && (
        <div style={styles.formCard}>
          <h2 style={styles.formTitle}>
            {editingPatient ? 'Editar Paciente' : 'Nuevo Paciente'}
          </h2>

          <form onSubmit={editingPatient ? handleEdit : handleCreate} style={styles.form}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Nombre completo *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                style={styles.input}
                placeholder="Ej: María González"
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Cuidador asignado *</label>
              <select
                name="caregiver_id"
                value={formData.caregiver_id}
                onChange={handleInputChange}
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
                  ⚠️ No hay cuidadores (ASISTENCIAL) activos en el sistema. Debes crear al menos uno antes de crear pacientes.
                </small>
              )}
              {caregivers.length > 0 && (
                <small style={styles.hint}>
                  Requerido - Selecciona un cuidador para asignar al paciente
                </small>
              )}
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Notas</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                style={styles.textarea}
                placeholder="Información adicional sobre el paciente..."
                rows={3}
              />
            </div>

            <div style={styles.formActions}>
              <button type="button" onClick={cancelForm} style={styles.btnCancel}>
                Cancelar
              </button>
              <button type="submit" style={styles.btnSubmit} disabled={loading}>
                {loading ? 'Guardando...' : editingPatient ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filtros */}
      <div style={styles.filtersCard}>
        <div style={styles.filtersGrid}>
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Buscar</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.filterInput}
              placeholder="Nombre del paciente..."
            />
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Estado</label>
            <select
              value={filterActive}
              onChange={(e) => setFilterActive(e.target.value)}
              style={styles.filterSelect}
            >
              <option value="all">Todos</option>
              <option value="true">Activos</option>
              <option value="false">Inactivos</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de pacientes */}
      {loading && patients.length === 0 ? (
        <div style={styles.loading}>Cargando pacientes...</div>
      ) : filteredPatients.length === 0 ? (
        <div style={styles.emptyState}>
          <p>📋 No se encontraron pacientes</p>
          <p style={styles.emptyHint}>
            {searchTerm || filterActive !== 'all'
              ? 'Probá cambiando los filtros'
              : 'Hacé clic en "Crear Paciente" para comenzar'}
          </p>
        </div>
      ) : (
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHeader}>
                <th style={styles.th}>Nombre</th>
                <th style={styles.th}>Cuidador Asignado</th>
                <th style={styles.th}>Notas</th>
                <th style={styles.th}>Estado</th>
                <th style={styles.th}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredPatients.map((patient) => (
                <tr key={patient.id} style={styles.tableRow}>
                  <td style={styles.td}>
                    <div style={styles.patientName}>{patient.name}</div>
                  </td>
                  <td style={styles.td}>
                    <span
                      style={{
                        ...badgeStyle,
                        backgroundColor: patient.caregiver_id ? '#e0e7ff' : '#f3f4f6',
                        color: patient.caregiver_id ? '#4338ca' : '#6b7280',
                      }}
                    >
                      {getCaregiverNameSync(patient.caregiver_id)}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.notes}>
                      {patient.notes || <em style={{ color: '#9ca3af' }}>Sin notas</em>}
                    </div>
                  </td>
                  <td style={styles.td}>
                    <span
                      style={{
                        ...badgeStyle,
                        backgroundColor: patient.active ? '#d1fae5' : '#fee2e2',
                        color: patient.active ? '#065f46' : '#991b1b',
                      }}
                    >
                      {patient.active ? '✓ Activo' : '✗ Inactivo'}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.actions}>
                      <button
                        onClick={() => openEditForm(patient)}
                        style={styles.btnEdit}
                        title="Editar"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleToggleActive(patient)}
                        style={styles.btnToggle}
                        title={patient.active ? 'Desactivar' : 'Activar'}
                      >
                        {patient.active ? '🔒' : '🔓'}
                      </button>
                      <button
                        onClick={() => handleDelete(patient.id)}
                        style={styles.btnDelete}
                        title="Eliminar"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ============================================
// ESTILOS
// ============================================
const badgeStyle: React.CSSProperties = {
  padding: '4px 12px',
  borderRadius: '12px',
  fontSize: '12px',
  fontWeight: 600,
  display: 'inline-block',
};

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
  hint: {
    fontSize: '12px',
    color: '#9ca3af',
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
  tableContainer: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    overflow: 'hidden',
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '800px',
  },
  tableHeader: {
    backgroundColor: '#f9fafb',
  },
  th: {
    padding: '16px',
    textAlign: 'left',
    fontSize: '14px',
    fontWeight: 600,
    color: '#374151',
    borderBottom: '2px solid #e5e7eb',
  },
  tableRow: {
    borderBottom: '1px solid #e5e7eb',
    transition: 'background-color 0.2s',
  },
  td: {
    padding: '16px',
    fontSize: '14px',
    color: '#1f2937',
  },
  patientName: {
    fontWeight: 600,
  },
  notes: {
    maxWidth: '300px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  actions: {
    display: 'flex',
    gap: '8px',
  },
  btnEdit: {
    padding: '6px 12px',
    fontSize: '16px',
    border: 'none',
    borderRadius: '6px',
    backgroundColor: '#f3f4f6',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  btnToggle: {
    padding: '6px 12px',
    fontSize: '16px',
    border: 'none',
    borderRadius: '6px',
    backgroundColor: '#f3f4f6',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  btnDelete: {
    padding: '6px 12px',
    fontSize: '16px',
    border: 'none',
    borderRadius: '6px',
    backgroundColor: '#f3f4f6',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
};
