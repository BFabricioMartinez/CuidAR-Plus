import { useAdminDashboard } from '../../hooks/admin/useAdminDashboard';

// ============================================
// COMPONENTE
// ============================================
export default function AdminDashboard() {
  const {
    stats,
    patientsAdherence,
    loading,
    error,
  } = useAdminDashboard();

  // Calcular color según adherencia
  const getAdherenceColor = (percentage: number | null) => {
    if (percentage === null) return '#9ca3af';
    if (percentage >= 80) return '#10b981';
    if (percentage >= 60) return '#f59e0b';
    return '#ef4444';
  };

  if (loading && !stats) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Cargando dashboard...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Dashboard Administrativo</h1>
        <p style={styles.subtitle}>Vista general del sistema</p>
      </div>

      {error && <div style={styles.errorAlert}>⚠️ {error}</div>}

      {/* KPIs Principales */}
      {stats && (
        <>
          <div style={styles.kpiContainer}>
            <div style={styles.kpiCard}>
              <div style={styles.kpiIcon}>👥</div>
              <div>
                <div style={styles.kpiValue}>{stats.active_users}</div>
                <div style={styles.kpiLabel}>Usuarios Activos</div>
              </div>
            </div>

            <div style={styles.kpiCard}>
              <div style={styles.kpiIcon}>🏥</div>
              <div>
                <div style={styles.kpiValue}>{stats.total_patients}</div>
                <div style={styles.kpiLabel}>Pacientes Totales</div>
              </div>
            </div>

            <div style={styles.kpiCard}>
              <div style={styles.kpiIcon}>💊</div>
              <div>
                <div style={styles.kpiValue}>{stats.active_treatments}</div>
                <div style={styles.kpiLabel}>Tratamientos Activos</div>
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

          {/* Dosis de Hoy */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>📝 Dosis de Hoy</h2>
            <div style={styles.dosesGrid}>
              <div style={styles.doseCard}>
                <div style={styles.doseNumber}>{stats.today_doses.taken}</div>
                <div style={styles.doseLabel}>✓ Tomadas</div>
                <div
                  style={{
                    ...styles.doseBar,
                    width: `${
                      stats.today_doses.total > 0
                        ? (stats.today_doses.taken / stats.today_doses.total) * 100
                        : 0
                    }%`,
                    backgroundColor: '#10b981',
                  }}
                />
              </div>

              <div style={styles.doseCard}>
                <div style={styles.doseNumber}>{stats.today_doses.missed}</div>
                <div style={styles.doseLabel}>✗ Omitidas</div>
                <div
                  style={{
                    ...styles.doseBar,
                    width: `${
                      stats.today_doses.total > 0
                        ? (stats.today_doses.missed / stats.today_doses.total) * 100
                        : 0
                    }%`,
                    backgroundColor: '#f59e0b',
                  }}
                />
              </div>

              <div style={styles.doseCard}>
                <div style={styles.doseNumber}>{stats.today_doses.total}</div>
                <div style={styles.doseLabel}>📋 Total</div>
                <div
                  style={{
                    ...styles.doseBar,
                    width: '100%',
                    backgroundColor: '#667eea',
                  }}
                />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Adherencia por Paciente */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>
          🎯 Adherencia por Paciente (Últimos 7 días)
        </h2>

        {patientsAdherence.length === 0 ? (
          <div style={styles.emptyState}>
            <p>No hay datos de adherencia disponibles</p>
          </div>
        ) : (
          <div style={styles.adherenceTable}>
            {patientsAdherence.map((patient) => (
              <div key={patient.patient_id} style={styles.adherenceRow}>
                <div style={styles.patientInfo}>
                  <div style={styles.patientName}>{patient.patient_name}</div>
                  <div style={styles.patientStats}>
                    {patient.summary.taken_count} tomadas ·{' '}
                    {patient.summary.missed_count} omitidas ·{' '}
                    {patient.summary.total_count} total
                  </div>
                </div>
                <div style={styles.adherenceValue}>
                  <div
                    style={{
                      ...styles.adherenceBadge,
                      backgroundColor: getAdherenceColor(
                        patient.summary.adherence_percentage
                      ),
                    }}
                  >
                    {patient.summary.adherence_percentage !== null
                      ? `${patient.summary.adherence_percentage}%`
                      : 'N/A'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Acciones Rápidas */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>⚡ Acciones Rápidas</h2>
        <div style={styles.actionsGrid}>
          <a href="/admin/users" style={styles.actionCard}>
            <div style={styles.actionIcon}>👥</div>
            <div style={styles.actionText}>Gestionar Usuarios</div>
          </a>
          <a href="/admin/pacientes" style={styles.actionCard}>
            <div style={styles.actionIcon}>🏥</div>
            <div style={styles.actionText}>Gestionar Pacientes</div>
          </a>
          <a href="/admin/asignaciones" style={styles.actionCard}>
            <div style={styles.actionIcon}>🔗</div>
            <div style={styles.actionText}>Asignar Cuidadores</div>
          </a>
        </div>
      </div>
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
  kpiContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '20px',
    marginBottom: '30px',
  },
  kpiCard: {
    backgroundColor: '#fff',
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  kpiIcon: {
    fontSize: '40px',
  },
  kpiValue: {
    fontSize: '32px',
    fontWeight: 700,
    color: '#1f2937',
  },
  kpiLabel: {
    fontSize: '14px',
    color: '#6b7280',
    marginTop: '4px',
  },
  section: {
    marginBottom: '30px',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#1f2937',
    marginBottom: '20px',
  },
  dosesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
  },
  doseCard: {
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    position: 'relative',
    overflow: 'hidden',
  },
  doseNumber: {
    fontSize: '36px',
    fontWeight: 700,
    color: '#1f2937',
    marginBottom: '8px',
  },
  doseLabel: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '12px',
  },
  doseBar: {
    height: '6px',
    borderRadius: '3px',
    transition: 'width 0.5s ease',
  },
  emptyState: {
    backgroundColor: '#f9fafb',
    padding: '60px 40px',
    borderRadius: '12px',
    textAlign: 'center',
    color: '#6b7280',
  },
  adherenceTable: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    overflow: 'hidden',
  },
  adherenceRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    borderBottom: '1px solid #e5e7eb',
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1f2937',
    marginBottom: '4px',
  },
  patientStats: {
    fontSize: '13px',
    color: '#6b7280',
  },
  adherenceValue: {
    marginLeft: '20px',
  },
  adherenceBadge: {
    padding: '8px 16px',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: 700,
    color: '#fff',
    minWidth: '60px',
    textAlign: 'center',
  },
  actionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
  },
  actionCard: {
    backgroundColor: '#fff',
    padding: '30px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '15px',
    textDecoration: 'none',
    transition: 'transform 0.2s, box-shadow 0.2s',
    cursor: 'pointer',
  },
  actionIcon: {
    fontSize: '48px',
  },
  actionText: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1f2937',
    textAlign: 'center',
  },
};

// Hover effect para action cards
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  a[style*="actionCard"]:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 20px rgba(0,0,0,0.15) !important;
  }
`;
document.head.appendChild(styleSheet);