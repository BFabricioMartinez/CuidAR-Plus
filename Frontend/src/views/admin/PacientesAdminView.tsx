import { useState } from 'react';
import { usePatientsAdmin } from '../../hooks/admin/usePatientsAdmin';
import type { Patient } from '../../api';

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
  const {
    patients,
    caregivers,
    loading,
    error,
    successMessage,
    filterActive,
    searchTerm,
    setFilterActive,
    setSearchTerm,
    createPatient,
    updatePatient,
    toggleActive,
    deletePatient,
  } = usePatientsAdmin();

  const [showForm, setShowForm] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);

  const [formData, setFormData] = useState<PatientForm>({
    name: '',
    caregiver_id: '',
    notes: '',
  });

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
    await createPatient({
      name: formData.name,
      caregiver_id: formData.caregiver_id ? Number(formData.caregiver_id) : null,
      notes: formData.notes || undefined,
    });
    setFormData({
      name: '',
      caregiver_id: '',
      notes: '',
    });
    setShowForm(false);
  };

  // Editar paciente
  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPatient) return;

    await updatePatient({
      id: editingPatient.id,
      name: formData.name,
      caregiver_id: formData.caregiver_id ? Number(formData.caregiver_id) : undefined,
      notes: formData.notes || undefined,
    });
    setFormData({
      name: '',
      caregiver_id: '',
      notes: '',
    });
    setEditingPatient(null);
    setShowForm(false);
  };

  // Activar/Desactivar paciente
  const handleToggleActive = async (patient: Patient) => {
    if (
      !confirm(
        `¿Estás seguro de ${patient.active ? 'desactivar' : 'activar'} a ${patient.name}?`
      )
    )
      return;

    await toggleActive(patient);
  };

  // Eliminar paciente
  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este paciente?')) return;
    await deletePatient(id);
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


  // Obtener nombre del cuidador
  const getCaregiverName = (caregiverId?: number) => {
    if (!caregiverId) return 'Sin asignar';
    const caregiver = caregivers.find((c) => c.id === caregiverId);
    return caregiver?.name || 'Desconocido';
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
              <label style={styles.label}>Cuidador asignado</label>
              <select
                name="caregiver_id"
                value={formData.caregiver_id}
                onChange={handleInputChange}
                style={styles.select}
              >
                <option value="">Sin asignar</option>
                {caregivers.map((caregiver) => (
                  <option key={caregiver.id} value={caregiver.id}>
                    {caregiver.name}
                  </option>
                ))}
              </select>
              <small style={styles.hint}>
                Opcional - Puedes asignar un cuidador ahora o después
              </small>
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
              {patients.map((patient) => (
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
                      {getCaregiverName(patient.caregiver_id)}
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