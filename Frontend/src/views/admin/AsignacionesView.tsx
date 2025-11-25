import { useState, useEffect } from 'react';

// ============================================
// TIPOS
// ============================================
interface Assignment {
  id: number;
  caregiver_id: number;
  patient_id: number;
  active: boolean;
  created_at?: string;
}

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface Patient {
  id: number;
  name: string;
}

interface AssignmentWithNames extends Assignment {
  caregiver_name: string;
  patient_name: string;
}

// ============================================
// COMPONENTE
// ============================================
export default function AsignacionesView() {
  const [assignments, setAssignments] = useState<AssignmentWithNames[]>([]);
  const [caregivers, setCaregivers] = useState<User[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showForm, setShowForm] = useState(false);

  // Form
  const [selectedCaregiver, setSelectedCaregiver] = useState<string>('');
  const [selectedPatient, setSelectedPatient] = useState<string>('');

  // Filtros
  const [filterCaregiver, setFilterCaregiver] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const token = localStorage.getItem('token');

  // Cargar datos al montar
  useEffect(() => {
    fetchAssignments();
    fetchCaregivers();
    fetchPatients();
  }, []);

  // Obtener asignaciones
  const fetchAssignments = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:8000/assignments/all', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Error al cargar asignaciones');

      const data = await response.json();

      // Obtener nombres de cuidadores y pacientes
      const enrichedData = await Promise.all(
        data.map(async (assignment: Assignment) => {
          try {
            const [caregiverRes, patientRes] = await Promise.all([
              fetch(`http://localhost:8000/users/${assignment.caregiver_id}`, {
                headers: { 'Authorization': `Bearer ${token}` },
              }),
              fetch(`http://localhost:8000/patients/${assignment.patient_id}`, {
                headers: { 'Authorization': `Bearer ${token}` },
              }),
            ]);

            const caregiver = await caregiverRes.json();
            const patient = await patientRes.json();

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
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Obtener cuidadores (ASISTENCIAL activos)
  const fetchCaregivers = async () => {
    try {
      const response = await fetch(
        'http://localhost:8000/users/all?role=ASISTENCIAL&active=true',
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Error al cargar cuidadores');

      const data = await response.json();
      setCaregivers(data);
    } catch (err: any) {
      console.error('Error al cargar cuidadores:', err);
    }
  };

  // Obtener pacientes activos
  const fetchPatients = async () => {
    try {
      const response = await fetch(
        'http://localhost:8000/patients/all?active=true',
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Error al cargar pacientes');

      const data = await response.json();
      setPatients(data);
    } catch (err: any) {
      console.error('Error al cargar pacientes:', err);
    }
  };

  // Crear asignación
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCaregiver || !selectedPatient) {
      setError('Debes seleccionar un cuidador y un paciente');
      setTimeout(() => setError(''), 3000);
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
      setError('Esta asignación ya existe');
      setTimeout(() => setError(''), 3000);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:8000/assignments/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          caregiver_id: Number(selectedCaregiver),
          patient_id: Number(selectedPatient),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al crear asignación');
      }

      setSuccessMessage('Asignación creada exitosamente ✓');
      setTimeout(() => setSuccessMessage(''), 3000);

      setSelectedCaregiver('');
      setSelectedPatient('');
      setShowForm(false);

      fetchAssignments();
    } catch (err: any) {
      setError(err.message);
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  // Eliminar asignación
  const handleDelete = async (id: number, caregiverName: string, patientName: string) => {
    if (
      !confirm(
        `¿Estás seguro de eliminar la asignación de ${caregiverName} con ${patientName}?`
      )
    )
      return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `http://localhost:8000/assignments/${id}/delete`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Error al eliminar asignación');

      setSuccessMessage('Asignación eliminada exitosamente');
      setTimeout(() => setSuccessMessage(''), 3000);

      fetchAssignments();
    } catch (err: any) {
      setError(err.message);
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  // Cancelar formulario
  const cancelForm = () => {
    setShowForm(false);
    setSelectedCaregiver('');
    setSelectedPatient('');
  };

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

  // Agrupar asignaciones por cuidador
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
        {!showForm && (
          <button onClick={() => setShowForm(true)} style={styles.btnAdd}>
            + Nueva Asignación
          </button>
        )}
      </div>

      {/* Mensajes */}
      {error && <div style={styles.errorAlert}>⚠️ {error}</div>}
      {successMessage && <div style={styles.successAlert}>✓ {successMessage}</div>}

      {/* Formulario */}
      {showForm && (
        <div style={styles.formCard}>
          <h2 style={styles.formTitle}>Nueva Asignación</h2>

          <form onSubmit={handleCreate} style={styles.form}>
            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Cuidador *</label>
                <select
                  value={selectedCaregiver}
                  onChange={(e) => setSelectedCaregiver(e.target.value)}
                  style={styles.select}
                  required
                >
                  <option value="">Seleccionar cuidador...</option>
                  {caregivers.map((caregiver) => (
                    <option key={caregiver.id} value={caregiver.id}>
                      {caregiver.name} ({caregiver.email})
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Paciente *</label>
                <select
                  value={selectedPatient}
                  onChange={(e) => setSelectedPatient(e.target.value)}
                  style={styles.select}
                  required
                >
                  <option value="">Seleccionar paciente...</option>
                  {patients.map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      {patient.name}
                    </option>
                  ))}
                </select>
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
        <div style={styles.filtersGrid}>
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

          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Cuidador</label>
            <select
              value={filterCaregiver}
              onChange={(e) => setFilterCaregiver(e.target.value)}
              style={styles.filterSelect}
            >
              <option value="all">Todos los cuidadores</option>
              {caregivers.map((caregiver) => (
                <option key={caregiver.id} value={caregiver.id}>
                  {caregiver.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Lista de asignaciones */}
      {loading && assignments.length === 0 ? (
        <div style={styles.loading}>Cargando asignaciones...</div>
      ) : filteredAssignments.length === 0 ? (
        <div style={styles.emptyState}>
          <p>🔗 No hay asignaciones registradas</p>
          <p style={styles.emptyHint}>
            {searchTerm || filterCaregiver !== 'all'
              ? 'Probá cambiando los filtros'
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
  select: {
    padding: '12px',
    fontSize: '15px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    outline: 'none',
    cursor: 'pointer',
    backgroundColor: '#fff',
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