import { useState, useEffect } from 'react';

// ============================================
// TIPOS
// ============================================
interface Treatment {
  id: number;
  patient_id: number;
  medication_name: string;
  dosage: string;
  frequency: string;
  start_date: string;
  end_date?: string;
  notes?: string;
  active: boolean;
}

interface TreatmentForm {
  medication_name: string;
  dosage: string;
  frequency: string;
  start_date: string;
  end_date: string;
  notes: string;
}

// ============================================
// COMPONENTE
// ============================================
export default function MisTratamientos() {
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingTreatment, setEditingTreatment] = useState<Treatment | null>(null);
  
  const [formData, setFormData] = useState<TreatmentForm>({
    medication_name: '',
    dosage: '',
    frequency: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    notes: '',
  });

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('token');

  // Cargar tratamientos al montar
  useEffect(() => {
    fetchTreatments();
  }, []);

  // Obtener tratamientos
  const fetchTreatments = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        'http://localhost:8000/treatments/all?active=true',
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Error al cargar tratamientos');

      const data = await response.json();
      setTreatments(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Manejar cambios en el formulario
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Crear tratamiento
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

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

      setSuccessMessage('Tratamiento creado exitosamente ✓');
      setTimeout(() => setSuccessMessage(''), 3000);
      
      // Resetear formulario y cerrar
      setFormData({
        medication_name: '',
        dosage: '',
        frequency: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        notes: '',
      });
      setShowForm(false);
      
      // Recargar lista
      fetchTreatments();
    } catch (err: any) {
      setError(err.message);
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  // Editar tratamiento
  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTreatment) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `http://localhost:8000/treatments/${editingTreatment.id}/update`,
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

      setSuccessMessage('Tratamiento actualizado exitosamente ✓');
      setTimeout(() => setSuccessMessage(''), 3000);
      
      // Resetear y cerrar
      setFormData({
        medication_name: '',
        dosage: '',
        frequency: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        notes: '',
      });
      setEditingTreatment(null);
      setShowForm(false);
      
      // Recargar lista
      fetchTreatments();
    } catch (err: any) {
      setError(err.message);
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  // Eliminar tratamiento (soft delete)
  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de desactivar este tratamiento?')) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `http://localhost:8000/treatments/${id}/delete`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Error al eliminar tratamiento');

      setSuccessMessage('Tratamiento desactivado exitosamente');
      setTimeout(() => setSuccessMessage(''), 3000);
      
      // Recargar lista
      fetchTreatments();
    } catch (err: any) {
      setError(err.message);
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  // Abrir formulario para editar
  const openEditForm = (treatment: Treatment) => {
    setEditingTreatment(treatment);
    setFormData({
      medication_name: treatment.medication_name,
      dosage: treatment.dosage,
      frequency: treatment.frequency,
      start_date: treatment.start_date,
      end_date: treatment.end_date || '',
      notes: treatment.notes || '',
    });
    setShowForm(true);
  };

  // Cancelar formulario
  const cancelForm = () => {
    setShowForm(false);
    setEditingTreatment(null);
    setFormData({
      medication_name: '',
      dosage: '',
      frequency: '',
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      notes: '',
    });
  };

  
  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Mis Tratamientos</h1>
          <p style={styles.subtitle}>Gestiona tus medicamentos y horarios</p>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} style={styles.btnAdd}>
            + Agregar Tratamiento
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
            {editingTreatment ? 'Editar Tratamiento' : 'Nuevo Tratamiento'}
          </h2>
          
          <form onSubmit={editingTreatment ? handleEdit : handleCreate} style={styles.form}>
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
      {loading && treatments.length === 0 ? (
        <div style={styles.loading}>Cargando tratamientos...</div>
      ) : treatments.length === 0 ? (
        <div style={styles.emptyState}>
          <p>📋 No tenés tratamientos registrados</p>
          <p style={styles.emptyHint}>Hacé clic en "Agregar Tratamiento" para comenzar</p>
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
                    {new Date(treatment.start_date).toLocaleDateString('es-AR')}
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
                <button
                  onClick={() => openEditForm(treatment)}
                  style={styles.btnEdit}
                >
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
    transition: 'transform 0.2s, box-shadow 0.2s',
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