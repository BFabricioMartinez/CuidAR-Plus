import { useEffect } from 'react';
import { useAsistencialDashboard } from '../../hooks/asistencial/useAsistencialDashboard';

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
export default function AsistencialDashboard() {
  // Usar el hook personalizado
  const {
    patients,
    selectedPatientId,
    treatments,
    upcomingDoses,
    stats,
    loading,
    error,
    successMessage,
    fetchDashboard,
    selectPatient,
    markAsTaken,
    markAsMissed,
  } = useAsistencialDashboard();

  // Cargar dashboard al montar el componente
  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

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

      {/* Mensajes de error y éxito */}
      {error && <div style={styles.errorAlert}>⚠️ {error}</div>}
      {successMessage && <div style={styles.successAlert}>✓ {successMessage}</div>}

      {/* KPIs - Estadísticas del cuidador */}
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
                {stats.today_doses.adherence_percentage !== null
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

      {/* Dosis Pendientes de Hoy */}
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
                      onClick={() => markAsTaken(dose.treatment_id, dose.time)}
                      style={styles.btnTaken}
                    >
                      ✓ Tomada
                    </button>
                    <button
                      onClick={() => markAsMissed(dose.treatment_id, dose.time)}
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

      {/* Tratamientos Activos del Paciente */}
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
