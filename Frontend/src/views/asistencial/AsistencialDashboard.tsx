import { useState, useEffect } from 'react';

// ============================================
// TIPOS
// ============================================
interface Patient {
  id: number;
  name: string;
}

interface Treatment {
  id: number;
  patient_id: number;
  medication_name: string;
  dosage: string;
  frequency: string;
  active: boolean;
}

interface UpcomingDose {
  treatment_id: number;
  med_name: string;
  dosage: string;
  time: string;
  frequency: string;
  status: 'PENDING' | 'MISSED';
}

interface MyStats {
  assigned_patients?: number;
  today_doses: {
    taken: number;
    missed: number;
    total: number;
    adherence_percentage: number | null;
  };
}

// ============================================
// COMPONENTE
// ============================================
export default function AsistencialDashboard() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [upcomingDoses, setUpcomingDoses] = useState<UpcomingDose[]>([]);
  const [stats, setStats] = useState<MyStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('token');

  // Cargar pacientes asignados al montar
  useEffect(() => {
    fetchMyPatients();
    fetchMyStats();
  }, []);

  // Cuando cambia el paciente seleccionado, cargar sus tratamientos
  useEffect(() => {
    if (selectedPatientId) {
      fetchPatientTreatments();
    }
  }, [selectedPatientId]);

  // Obtener mis pacientes asignados
  const fetchMyPatients = async () => {
    setLoading(true);
    setError('');

    try {
      // Obtener asignaciones donde soy el cuidador
      const response = await fetch(
        `http://localhost:8000/assignments/all?caregiver_id=${user.id}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Error al cargar pacientes');

      const assignments = await response.json();

      // Obtener detalles de cada paciente
      const patientPromises = assignments.map(async (assignment: any) => {
        const patientRes = await fetch(
          `http://localhost:8000/patients/${assignment.patient_id}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }
        );
        return patientRes.json();
      });

      const patientsData = await Promise.all(patientPromises);
      setPatients(patientsData);

      // Seleccionar el primero por defecto
      if (patientsData.length > 0) {
        setSelectedPatientId(patientsData[0].id);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Obtener mis estadísticas como cuidador
  const fetchMyStats = async () => {
    try {
      const response = await fetch(
        `http://localhost:8000/statistics/my-stats?user_id=${user.id}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Error al cargar estadísticas');

      const data = await response.json();
      setStats(data);
    } catch (err: any) {
      console.error('Error stats:', err);
    }
  };

  // Obtener tratamientos del paciente seleccionado
  const fetchPatientTreatments = async () => {
    if (!selectedPatientId) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `http://localhost:8000/treatments/all?patient_id=${selectedPatientId}&active=true`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Error al cargar tratamientos');

      const data = await response.json();
      setTreatments(data);

      // Calcular dosis pendientes
      calculateUpcomingDoses(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Parsear horarios desde frecuencia
  const parseTimesFromFrequency = (frequency: string): string[] => {
    const times: string[] = [];
    const regex = /\b(\d{1,2}):(\d{2})\b/g;
    let match;

    while ((match = regex.exec(frequency)) !== null) {
      const hour = match[1].padStart(2, '0');
      const minute = match[2];
      times.push(`${hour}:${minute}`);
    }

    return [...new Set(times)].sort();
  };

  // Calcular dosis pendientes de hoy
  const calculateUpcomingDoses = (treatmentsList: Treatment[]) => {
    const doses: UpcomingDose[] = [];

    treatmentsList.forEach((treatment) => {
      const times = parseTimesFromFrequency(treatment.frequency);

      times.forEach((time) => {
        doses.push({
          treatment_id: treatment.id,
          med_name: treatment.medication_name,
          dosage: treatment.dosage,
          time,
          frequency: treatment.frequency,
          status: 'PENDING',
        });
      });
    });

    doses.sort((a, b) => a.time.localeCompare(b.time));
    setUpcomingDoses(doses);
  };

  // Marcar dosis como TOMADA
  const handleMarkTaken = async (treatmentId: number, time: string) => {
    try {
      const response = await fetch(
        `http://localhost:8000/tomas/marcar-tomada?treatment_id=${treatmentId}&time=${time}&recorded_by_user_id=${user.id}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al marcar dosis');
      }

      setSuccessMessage(`Dosis de las ${time} marcada como tomada ✓`);
      setTimeout(() => setSuccessMessage(''), 3000);

      // Recargar datos
      fetchPatientTreatments();
      fetchMyStats();
    } catch (err: any) {
      setError(err.message);
      setTimeout(() => setError(''), 3000);
    }
  };

  // Marcar dosis como OMITIDA
  const handleMarkMissed = async (treatmentId: number, time: string) => {
    try {
      const response = await fetch(
        `http://localhost:8000/tomas/marcar-omitida?treatment_id=${treatmentId}&time=${time}&recorded_by_user_id=${user.id}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al marcar dosis');
      }

      setSuccessMessage(`Dosis de las ${time} marcada como omitida`);
      setTimeout(() => setSuccessMessage(''), 3000);

      // Recargar datos
      fetchPatientTreatments();
      fetchMyStats();
    } catch (err: any) {
      setError(err.message);
      setTimeout(() => setError(''), 3000);
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
          <h1 style={styles.title}>Dashboard Asistencial</h1>
          <p style={styles.subtitle}>Gestiona los tratamientos de tus pacientes</p>
        </div>
      </div>

      {/* Mensajes */}
      {error && <div style={styles.errorAlert}>⚠️ {error}</div>}
      {successMessage && <div style={styles.successAlert}>✓ {successMessage}</div>}

      {/* KPIs */}
      {stats && (
        <div style={styles.kpiContainer}>
          <div style={styles.kpiCard}>
            <div style={styles.kpiIcon}>👥</div>
            <div>
              <div style={styles.kpiValue}>{stats.assigned_patients || 0}</div>
              <div style={styles.kpiLabel}>Pacientes Asignados</div>
            </div>
          </div>

          <div style={styles.kpiCard}>
            <div style={styles.kpiIcon}>✓</div>
            <div>
              <div style={styles.kpiValue}>{stats.today_doses.taken}</div>
              <div style={styles.kpiLabel}>Tomadas Hoy</div>
            </div>
          </div>

          <div style={styles.kpiCard}>
            <div style={styles.kpiIcon}>✗</div>
            <div>
              <div style={styles.kpiValue}>{stats.today_doses.missed}</div>
              <div style={styles.kpiLabel}>Omitidas Hoy</div>
            </div>
          </div>

          <div style={styles.kpiCard}>
            <div style={styles.kpiIcon}>📊</div>
            <div>
              <div style={styles.kpiValue}>
                {stats.today_doses.adherence_percentage
                  ? `${stats.today_doses.adherence_percentage}%`
                  : 'N/A'}
              </div>
              <div style={styles.kpiLabel}>Adherencia Hoy</div>
            </div>
          </div>
        </div>
      )}

      {/* Selector de Paciente */}
      <div style={styles.selectorCard}>
        <label style={styles.selectorLabel}>Seleccionar Paciente:</label>
        {patients.length === 0 ? (
          <p style={styles.noPatients}>No tenés pacientes asignados</p>
        ) : (
          <select
            value={selectedPatientId || ''}
            onChange={(e) => setSelectedPatientId(Number(e.target.value))}
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

      {/* Dosis Pendientes */}
      {selectedPatientId && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>
            🕐 Dosis de Hoy - {selectedPatientName}
          </h2>

          {loading ? (
            <div style={styles.loading}>Cargando...</div>
          ) : upcomingDoses.length === 0 ? (
            <div style={styles.emptyState}>
              <p>No hay dosis programadas para hoy</p>
            </div>
          ) : (
            <div style={styles.dosesList}>
              {upcomingDoses.map((dose, index) => (
                <div key={index} style={styles.doseCard}>
                  <div style={styles.doseTime}>{dose.time}</div>
                  <div style={styles.doseInfo}>
                    <div style={styles.doseMedName}>{dose.med_name}</div>
                    <div style={styles.doseDosage}>{dose.dosage}</div>
                  </div>
                  <div style={styles.doseActions}>
                    <button
                      onClick={() => handleMarkTaken(dose.treatment_id, dose.time)}
                      style={styles.btnTaken}
                    >
                      ✓ Tomada
                    </button>
                    <button
                      onClick={() => handleMarkMissed(dose.treatment_id, dose.time)}
                      style={styles.btnMissed}
                    >
                      ✗ Omitida
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tratamientos Activos */}
      {selectedPatientId && treatments.length > 0 && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>
            💊 Tratamientos Activos - {selectedPatientName}
          </h2>

          <div style={styles.treatmentsList}>
            {treatments.map((treatment) => (
              <div key={treatment.id} style={styles.treatmentCard}>
                <div style={styles.treatmentName}>{treatment.medication_name}</div>
                <div style={styles.treatmentDosage}>{treatment.dosage}</div>
                <div style={styles.treatmentFrequency}>{treatment.frequency}</div>
              </div>
            ))}
          </div>
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
  loading: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '18px',
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
  kpiContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '30px',
  },
  kpiCard: {
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
  },
  kpiIcon: {
    fontSize: '32px',
  },
  kpiValue: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#1f2937',
  },
  kpiLabel: {
    fontSize: '14px',
    color: '#6b7280',
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
  section: {
    marginBottom: '30px',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#1f2937',
    marginBottom: '15px',
  },
  emptyState: {
    backgroundColor: '#f9fafb',
    padding: '40px',
    borderRadius: '12px',
    textAlign: 'center',
    color: '#6b7280',
  },
  dosesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  doseCard: {
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  doseTime: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#667eea',
    minWidth: '80px',
  },
  doseInfo: {
    flex: 1,
  },
  doseMedName: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#1f2937',
  },
  doseDosage: {
    fontSize: '14px',
    color: '#6b7280',
  },
  doseActions: {
    display: 'flex',
    gap: '10px',
  },
  btnTaken: {
    backgroundColor: '#10b981',
    color: '#fff',
    padding: '10px 20px',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  btnMissed: {
    backgroundColor: '#f59e0b',
    color: '#fff',
    padding: '10px 20px',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  treatmentsList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: '15px',
  },
  treatmentCard: {
    backgroundColor: '#fff',
    padding: '16px',
    borderRadius: '10px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  treatmentName: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1f2937',
    marginBottom: '8px',
  },
  treatmentDosage: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '4px',
  },
  treatmentFrequency: {
    fontSize: '12px',
    color: '#9ca3af',
  },
};