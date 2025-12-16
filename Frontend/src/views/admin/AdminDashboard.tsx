import { useState, useEffect } from 'react';
import { useAdminDashboard } from '../../hooks/admin/useAdminDashboard';
import { patientsApi, usersApi, assignmentsApi, ApiError } from '../../api';
import type { Patient, User, Assignment } from '../../api';

// ============================================
// COMPONENTE
// ============================================
export default function AdminDashboard() {
  const {
    stats,
    loading: statsLoading,
    error: statsError,
    fetchDashboard,
  } = useAdminDashboard();

  // Estados para pacientes
  const [patients, setPatients] = useState<Patient[]>([]);
  const [caregivers, setCaregivers] = useState<User[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [patientsError, setPatientsError] = useState('');
  const [caregiverNames, setCaregiverNames] = useState<Record<number, string>>({});
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  // Cargar datos al montar
  useEffect(() => {
    fetchDashboard();
    fetchAssignments();
    // Cargar cuidadores primero para tener los nombres disponibles
    fetchCaregivers().then(() => {
      // Después de cargar cuidadores, cargar pacientes
      fetchPatients();
    });
  }, [fetchDashboard]);

  // Obtener asignaciones
  const fetchAssignments = async () => {
    try {
      const allAssignments = await assignmentsApi.getAll();
      setAssignments(allAssignments);
    } catch (err: any) {
      console.error('Error al cargar asignaciones:', err);
    }
  };

  // Obtener pacientes
  const fetchPatients = async (cursor?: number | null) => {
    if (cursor === undefined) {
      setPatientsLoading(true);
    } else {
      setLoadingMore(true);
    }
    setPatientsError('');

    try {
      const response = await patientsApi.list({
        limit: 20, // Cargar 20 a la vez para scroll infinito
        last_seen_id: cursor || undefined,
        filters: {},
      });

      if (cursor) {
        // Agregar más pacientes (scroll infinito)
        setPatients(prev => [...prev, ...response.items]);
        // Cargar nombres de cuidadores para los nuevos pacientes
        loadCaregiverNamesForPatients(response.items);
      } else {
        // Primera carga
        setPatients(response.items);
        // Cargar nombres de cuidadores para los pacientes
        loadCaregiverNamesForPatients(response.items);
      }
      
      setNextCursor(response.next_cursor);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setPatientsError(err.message);
      } else {
        setPatientsError('Error al cargar pacientes');
      }
    } finally {
      setPatientsLoading(false);
      setLoadingMore(false);
    }
  };

  // Cargar más pacientes (scroll infinito)
  const loadMorePatients = () => {
    if (nextCursor && !loadingMore) {
      fetchPatients(nextCursor);
    }
  };

  // Manejar scroll en el contenedor de la tabla
  const handleTableScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const scrollBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
    
    // Cargar más cuando esté cerca del final (50px antes)
    if (scrollBottom < 50 && nextCursor && !loadingMore) {
      loadMorePatients();
    }
  };

  // Obtener cuidadores (usuarios ASISTENCIAL activos)
  const fetchCaregivers = async () => {
    try {
      const caregivers = await usersApi.getByRole('ASISTENCIAL');
      setCaregivers(caregivers);
    } catch (err: any) {
      console.error('Error al cargar cuidadores:', err);
    }
  };

  // Cargar nombres de cuidadores para una lista de pacientes
  const loadCaregiverNamesForPatients = async (patientsList: Patient[]) => {
    const missingIds = patientsList
      .filter(p => p.caregiver_id && !caregivers.find(c => c.id === p.caregiver_id))
      .map(p => p.caregiver_id!)
      .filter((id, index, self) => self.indexOf(id) === index); // unique

    if (missingIds.length === 0) return;

    const names: Record<number, string> = {};
    await Promise.all(
      missingIds.map(async (id) => {
        try {
          const caregiver = await usersApi.getById(id);
          // Si no tiene nombre, usar email o username del email
          let displayName = caregiver.name;
          if (!displayName && caregiver.email) {
            displayName = caregiver.email.split('@')[0];
          } else if (!displayName) {
            displayName = 'Sin nombre';
          }
          names[id] = displayName;
        } catch {
          names[id] = 'Desconocido';
        }
      })
    );
    setCaregiverNames(prev => ({ ...prev, ...names }));
  };

  // Obtener el caregiver_id de un paciente desde assignments o desde patient.caregiver_id
  const getCaregiverIdForPatient = (patientId: number): number | undefined => {
    // Buscar primero en assignments (prioridad)
    const assignment = assignments.find(
      (a) => a.patient_id === patientId && a.active
    );

    if (assignment) {
      return assignment.caregiver_id;
    }

    // Si no hay assignment, buscar en los datos del paciente
    const patient = patients.find((p) => p.id === patientId);
    return patient?.caregiver_id;
  };

  // Función síncrona para obtener nombre del cuidador
  const getCaregiverNameSync = (patientId: number): string => {
    // Obtener el caregiver_id desde assignments o desde patient
    const caregiverId = getCaregiverIdForPatient(patientId);

    if (!caregiverId) return 'Sin asignar';

    // Primero buscar en el array de cuidadores
    const caregiver = caregivers.find((c) => c.id === caregiverId);
    if (caregiver) {
      // Si tiene nombre, usarlo
      if (caregiver.name) return caregiver.name;
      // Si no tiene nombre pero tiene email, usar username del email
      if (caregiver.email) return caregiver.email.split('@')[0];
      return 'Sin nombre';
    }

    // Si no está en el array, buscar en caregiverNames
    if (caregiverNames[caregiverId]) {
      return caregiverNames[caregiverId];
    }

    // Si no está cargado aún, intentar cargarlo inmediatamente (sin esperar)
    // pero mostrar "Cargando..." mientras tanto
    if (caregiverId && !caregiverNames[caregiverId]) {
      // Cargar en background
      usersApi.getById(caregiverId).then(caregiver => {
        let displayName = caregiver.name;
        if (!displayName && caregiver.email) {
          displayName = caregiver.email.split('@')[0];
        } else if (!displayName) {
          displayName = 'Sin nombre';
        }
        setCaregiverNames(prev => ({ ...prev, [caregiverId]: displayName }));
      }).catch(() => {
        setCaregiverNames(prev => ({ ...prev, [caregiverId]: 'Desconocido' }));
      });
    }

    return 'Cargando...';
  };

  if (statsLoading && !stats) {
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

      {statsError && <div style={styles.errorAlert}>⚠️ {statsError}</div>}
      {patientsError && <div style={styles.errorAlert}>⚠️ {patientsError}</div>}

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
        </>
      )}

      {/* Tabla de Pacientes */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>📋 Lista de Pacientes</h2>
        
        {patientsLoading && patients.length === 0 ? (
          <div style={styles.loading}>Cargando pacientes...</div>
        ) : patients.length === 0 ? (
          <div style={styles.emptyState}>
            <p>📋 No hay pacientes registrados</p>
          </div>
        ) : (
          <div 
            style={styles.tableContainer} 
            onScroll={handleTableScroll}
          >
            <table style={styles.table}>
              <thead style={styles.tableHeaderSticky}>
                <tr style={styles.tableHeader}>
                  <th style={styles.th}>Nombre</th>
                  <th style={styles.th}>Cuidador Asignado</th>
                  <th style={styles.th}>Notas</th>
                  <th style={styles.th}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((patient) => (
                  <tr key={patient.id} style={styles.tableRow}>
                    <td style={styles.td}>
                      <div style={styles.patientName}>{patient.name}</div>
                    </td>
                    <td style={styles.td}>
                      {(() => {
                        const caregiverName = getCaregiverNameSync(patient.id);
                        const hasCaregiver = caregiverName !== 'Sin asignar';
                        return (
                          <span
                            style={{
                              ...badgeStyle,
                              backgroundColor: hasCaregiver ? '#e0e7ff' : '#f3f4f6',
                              color: hasCaregiver ? '#4338ca' : '#6b7280',
                            }}
                          >
                            {caregiverName}
                          </span>
                        );
                      })()}
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
                  </tr>
                ))}
              </tbody>
            </table>
            {loadingMore && (
              <div style={styles.loadingMore}>
                <div>Cargando más pacientes...</div>
              </div>
            )}
            {!nextCursor && patients.length > 0 && (
              <div style={styles.endOfList}>
                <div>No hay más pacientes para mostrar</div>
              </div>
            )}
          </div>
        )}
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
  emptyState: {
    backgroundColor: '#f9fafb',
    padding: '60px 40px',
    borderRadius: '12px',
    textAlign: 'center',
    color: '#6b7280',
  },
  tableContainer: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    overflow: 'auto',
    overflowX: 'auto',
    maxHeight: '600px', // Altura máxima para scroll
    position: 'relative',
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
  loadingMore: {
    padding: '20px',
    textAlign: 'center',
    color: '#6b7280',
    fontSize: '14px',
  },
  endOfList: {
    padding: '20px',
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: '14px',
    fontStyle: 'italic',
  },
};

// Badge style para los estados
const badgeStyle: React.CSSProperties = {
  padding: '4px 12px',
  borderRadius: '12px',
  fontSize: '12px',
  fontWeight: 600,
  display: 'inline-block',
};
