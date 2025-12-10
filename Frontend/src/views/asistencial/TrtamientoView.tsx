import { useEffect } from 'react';
import { useAsistencialTreatments } from '../../hooks/asistencial/useAsistencialTreatments';

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
export default function TratamientoView() {
  // Usar el hook personalizado
  const {
    patients,
    selectedPatientId,
    treatments,
    formData,
    loading,
    error,
    successMessage,
    showForm,
    editingTreatment,
    fetchMyPatients,
    selectPatient,
    createTreatment,
    updateTreatment,
    deleteTreatment,
    fetchTreatments,
    handleInputChange,
    openEditForm,
    openCreateForm,
    cancelForm,
  } = useAsistencialTreatments();

  // Cargar pacientes al montar el componente
  useEffect(() => {
    fetchMyPatients();
  }, [fetchMyPatients]);

  // Manejar envío del formulario (crear o editar)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let success = false;

    if (editingTreatment) {
      // Actualizar tratamiento existente
      success = await updateTreatment(editingTreatment.id, formData);
    } else {
      // Crear nuevo tratamiento
      success = await createTreatment(formData);
    }

    // Si fue exitoso, cerrar formulario y recargar tratamientos
    if (success) {
      cancelForm();
      fetchTreatments();
    }
  };

  // Manejar eliminación con confirmación
  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de desactivar este tratamiento?')) return;

    const success = await deleteTreatment(id);

    if (success) {
      fetchTreatments();
    }
  };

  // Nombre del paciente seleccionado
  const selectedPatientName =
    patients.find((p) => p.id === selectedPatientId)?.name || '';

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Gestión de Tratamientos</h1>
          <p style={styles.subtitle}>Administra los tratamientos de tus pacientes</p>
        </div>
        {selectedPatientId && !showForm && (
          <button onClick={openCreateForm} style={styles.btnAdd}>
            + Agregar Tratamiento
          </button>
        )}
      </div>

      {/* Mensajes de error y éxito */}
      {error && <div style={styles.errorAlert}>⚠️ {error}</div>}
      {successMessage && <div style={styles.successAlert}>✓ {successMessage}</div>}

      {/* Selector de Paciente */}
      <div style={styles.selectorCard}>
        <label style={styles.selectorLabel}>Seleccionar Paciente:</label>
        {patients.length === 0 ? (
          <p style={styles.noPatients}>No tenés pacientes asignados</p>
        ) : (
          <select
            value={selectedPatientId || ''}
            onChange={(e) => selectPatient(Number(e.target.value))}
            style={styles.selector}
          >
            {patients.map((patient) => (
              <option key={patient.id} value={patient.id}>
                {patient.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Formulario de Crear/Editar */}
      {showForm && selectedPatientId && (
        <div style={styles.formCard}>
          <h2 style={styles.formTitle}>
            {editingTreatment ? 'Editar Tratamiento' : 'Nuevo Tratamiento'} -{' '}
            {selectedPatientName}
          </h2>

          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Medicamento *</label>
                <input
                  type="text"
                  name="medication_name"
                  value={formData.medication_name}
                  onChange={handleInputChange}
                  style={styles.input}
                  placeholder="Ej: Paracetamol"
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Dosis *</label>
                <input
                  type="text"
                  name="dosage"
                  value={formData.dosage}
                  onChange={handleInputChange}
                  style={styles.input}
                  placeholder="Ej: 500mg"
                  required
                />
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Frecuencia *</label>
              <input
                type="text"
                name="frequency"
                value={formData.frequency}
                onChange={handleInputChange}
                style={styles.input}
                placeholder="Ej: Cada 8 horas: 8:00, 16:00, 00:00"
                required
              />
              <small style={styles.hint}>
                Incluye los horarios en formato HH:MM (ej: 08:00, 14:00, 20:00)
              </small>
            </div>

            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Fecha de inicio *</label>
                <input
                  type="date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleInputChange}
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Fecha de fin</label>
                <input
                  type="date"
                  name="end_date"
                  value={formData.end_date}
                  onChange={handleInputChange}
                  style={styles.input}
                />
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Notas</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                style={styles.textarea}
                placeholder="Notas adicionales..."
                rows={3}
              />
            </div>

            <div style={styles.formActions}>
              <button type="button" onClick={cancelForm} style={styles.btnCancel}>
                Cancelar
              </button>
              <button type="submit" style={styles.btnSubmit} disabled={loading}>
                {loading ? 'Guardando...' : editingTreatment ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de tratamientos */}
      {selectedPatientId && (
        <>
          {loading && treatments.length === 0 ? (
            <div style={styles.loading}>Cargando tratamientos...</div>
          ) : treatments.length === 0 ? (
            <div style={styles.emptyState}>
              <p>📋 No hay tratamientos registrados para {selectedPatientName}</p>
              <p style={styles.emptyHint}>
                Hacé clic en "Agregar Tratamiento" para comenzar
              </p>
            </div>
          ) : (
            <div style={styles.treatmentsList}>
              {treatments.map((treatment) => (
                <div key={treatment.id} style={styles.treatmentCard}>
                  <div style={styles.treatmentHeader}>
                    <div style={styles.treatmentIcon}>💊</div>
                    <div style={styles.treatmentInfo}>
                      <h3 style={styles.treatmentName}>{treatment.medication_name}</h3>
                      <p style={styles.treatmentDosage}>{treatment.dosage}</p>
                    </div>
                  </div>

                  <div style={styles.treatmentDetails}>
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>Frecuencia:</span>
                      <span style={styles.detailValue}>{treatment.frequency}</span>
                    </div>
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>Inicio:</span>
                      <span style={styles.detailValue}>
                        {treatment.start_date
                          ? new Date(treatment.start_date).toLocaleDateString('es-AR')
                          : 'N/A'}
                      </span>
                    </div>
                    {treatment.end_date && (
                      <div style={styles.detailRow}>
                        <span style={styles.detailLabel}>Fin:</span>
                        <span style={styles.detailValue}>
                          {new Date(treatment.end_date).toLocaleDateString('es-AR')}
                        </span>
                      </div>
                    )}
                    {treatment.notes && (
                      <div style={styles.detailRow}>
                        <span style={styles.detailLabel}>Notas:</span>
                        <span style={styles.detailValue}>{treatment.notes}</span>
                      </div>
                    )}
                  </div>

                  <div style={styles.treatmentActions}>
                    <button onClick={() => openEditForm(treatment)} style={styles.btnEdit}>
                      ✏️ Editar
                    </button>
                    <button
                      onClick={() => handleDelete(treatment.id)}
                      style={styles.btnDelete}
                    >
                      🗑️ Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ============================================
// ESTILOS
// ============================================
const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1200px',
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
  selectorCard: {
    backgroundColor: '#fff',
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    marginBottom: '30px',
  },
  selectorLabel: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1f2937',
    display: 'block',
    marginBottom: '12px',
  },
  selector: {
    width: '100%',
    padding: '12px 16px',
    fontSize: '16px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    outline: 'none',
    cursor: 'pointer',
    backgroundColor: '#fff',
  },
  noPatients: {
    color: '#6b7280',
    fontStyle: 'italic',
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
  treatmentsList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '20px',
  },
  treatmentCard: {
    backgroundColor: '#fff',
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  treatmentHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    marginBottom: '20px',
  },
  treatmentIcon: {
    fontSize: '32px',
  },
  treatmentInfo: {
    flex: 1,
  },
  treatmentName: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#1f2937',
    margin: '0 0 4px 0',
  },
  treatmentDosage: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
  },
  treatmentDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginBottom: '20px',
    paddingTop: '16px',
    borderTop: '1px solid #e5e7eb',
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#6b7280',
  },
  detailValue: {
    fontSize: '14px',
    color: '#1f2937',
  },
  treatmentActions: {
    display: 'flex',
    gap: '10px',
  },
  btnEdit: {
    flex: 1,
    padding: '10px',
    fontSize: '14px',
    fontWeight: 600,
    border: '2px solid #667eea',
    borderRadius: '8px',
    backgroundColor: '#fff',
    color: '#667eea',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  btnDelete: {
    flex: 1,
    padding: '10px',
    fontSize: '14px',
    fontWeight: 600,
    border: '2px solid #dc2626',
    borderRadius: '8px',
    backgroundColor: '#fff',
    color: '#dc2626',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
};
