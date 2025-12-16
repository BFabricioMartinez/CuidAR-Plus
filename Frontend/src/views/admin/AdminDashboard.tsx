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
    patientsAdherence,
    adherenceTrend,
    dosesByHour,
    topMedications,
    caregiverStats,
    usersByRole,
    treatmentsStatus,
    topPatients,
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
      <div className="admin-dashboard-container">
        <div className="loading-screen">
          <div className="loading-spinner">
            <div className="spinner-ring"></div>
            <div className="spinner-ring"></div>
            <div className="spinner-ring"></div>
          </div>
          <p className="loading-text">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard-container">
      {/* Header con gradiente */}
      <div className="admin-dashboard-header">
        <div className="header-content">
          <div className="welcome-section">
            <h1 className="admin-dashboard-title">Dashboard Administrativo</h1>
            <p className="admin-dashboard-subtitle">Vista general del sistema</p>
          </div>
        </div>
      </div>

      {/* Error Alerts */}
      <div className="admin-dashboard-content">
        {statsError && (
          <div className="error-banner">
            <div>
              <svg className="error-icon" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{statsError}</span>
            </div>
          </div>
        )}
        {patientsError && (
          <div className="error-banner">
            <div>
              <svg className="error-icon" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{patientsError}</span>
            </div>
          </div>
        )}

        {/* Grid de Gráficos Estructurado */}
        {stats && (
          <div className="admin-charts-grid">
            {/* Card 1: Estadísticas Principales */}
            <div className="admin-chart-card">
              <div className="admin-chart-header">
                <h3 className="admin-chart-title">Estadísticas del Sistema</h3>
              </div>
              <div className="admin-stats-simple-list">
                <div className="admin-stat-simple-item">
                  <span className="admin-stat-simple-label">Usuarios Activos:</span>
                  <span className="admin-stat-simple-value">{stats.active_users}</span>
                </div>
                <div className="admin-stat-simple-item">
                  <span className="admin-stat-simple-label">Pacientes Totales:</span>
                  <span className="admin-stat-simple-value">{stats.total_patients}</span>
                </div>
                <div className="admin-stat-simple-item">
                  <span className="admin-stat-simple-label">Tratamientos Activos:</span>
                  <span className="admin-stat-simple-value">{stats.active_treatments}</span>
                </div>
                <div className="admin-stat-simple-item">
                  <span className="admin-stat-simple-label">Adherencia Hoy:</span>
                  <span className="admin-stat-simple-value">
                    {stats.today_doses.adherence_percentage ? `${Math.round(stats.today_doses.adherence_percentage)}%` : 'N/A'}
                  </span>
                </div>
                <div className="admin-stat-simple-item">
                  <span className="admin-stat-simple-label">Dosis Tomadas (Hoy):</span>
                  <span className="admin-stat-simple-value">{stats.today_doses.taken || 0}</span>
                </div>
                <div className="admin-stat-simple-item">
                  <span className="admin-stat-simple-label">Dosis Omitidas (Hoy):</span>
                  <span className="admin-stat-simple-value">{stats.today_doses.missed || 0}</span>
                </div>
              </div>
            </div>

            {/* Card 2: Evolución de Adherencia (7 días) */}
            <div className="admin-chart-card">
              <div className="admin-chart-header">
                <h3 className="admin-chart-title">
                  <svg className="admin-chart-icon" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 0l-2 2a1 1 0 101.414 1.414L8 10.414l1.293 1.293a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Evolución (7 días)
                </h3>
              </div>
              <div className="admin-trend-chart-container">
                {adherenceTrend.length > 0 ? (
                  <svg className="admin-trend-chart" viewBox="0 0 600 200">
                    <defs>
                      <linearGradient id="trendGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#667eea" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#667eea" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    {/* Grid lines */}
                    {[0, 25, 50, 75, 100].map((val) => (
                      <line
                        key={val}
                        x1="40"
                        y1={160 - (val * 1.4)}
                        x2="560"
                        y2={160 - (val * 1.4)}
                        stroke="rgba(102, 126, 234, 0.1)"
                        strokeWidth="1"
                      />
                    ))}
                    {/* Labels */}
                    {[0, 25, 50, 75, 100].map((val) => (
                      <text key={val} x="35" y={165 - (val * 1.4)} textAnchor="end" className="admin-trend-label">
                        {val}%
                      </text>
                    ))}
                    {/* Data points and line */}
                    {adherenceTrend.length > 1 && (
                      <>
                        <polyline
                          points={adherenceTrend.map((d, i) => `${60 + (i * 80)},${160 - (d.adherence_percentage * 1.4)}`).join(' ')}
                          fill="none"
                          stroke="url(#trendLineGradient)"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <defs>
                          <linearGradient id="trendLineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#667eea" />
                            <stop offset="100%" stopColor="#764ba2" />
                          </linearGradient>
                        </defs>
                        {/* Area under curve */}
                        <path
                          d={`M 60,160 L ${adherenceTrend.map((d, i) => `${60 + (i * 80)},${160 - (d.adherence_percentage * 1.4)}`).join(' L ')} L ${60 + ((adherenceTrend.length - 1) * 80)},160 Z`}
                          fill="url(#trendGradient)"
                        />
                        {/* Data points */}
                        {adherenceTrend.map((d, i) => (
                          <g key={i}>
                            <circle
                              cx={60 + (i * 80)}
                              cy={160 - (d.adherence_percentage * 1.4)}
                              r="6"
                              fill="#667eea"
                              stroke="#fff"
                              strokeWidth="2"
                            />
                            <text
                              x={60 + (i * 80)}
                              y={145 - (d.adherence_percentage * 1.4)}
                              textAnchor="middle"
                              className="admin-trend-value"
                            >
                              {Math.round(d.adherence_percentage)}%
                            </text>
                          </g>
                        ))}
                        {/* X-axis labels */}
                        {adherenceTrend.map((d, i) => {
                          const date = new Date(d.date);
                          const dayName = date.toLocaleDateString('es-AR', { weekday: 'short' });
                          return (
                            <text key={i} x={60 + (i * 80)} y="185" textAnchor="middle" className="admin-trend-date">
                              {dayName}
                            </text>
                          );
                        })}
                      </>
                    )}
                  </svg>
                ) : (
                  <div className="admin-chart-empty">No hay datos disponibles</div>
                )}
              </div>
            </div>

            {/* Card 3: Dosis por Estado (Hoy) */}
            <div className="admin-chart-card">
              <div className="admin-chart-header">
                <h3 className="admin-chart-title">
                  <svg className="admin-chart-icon" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Dosis de Hoy
                </h3>
              </div>
              <div className="admin-donut-chart-container">
                <svg className="admin-donut-chart" viewBox="0 0 200 200">
                  <circle cx="100" cy="100" r="70" fill="none" stroke="rgba(229, 231, 235, 0.5)" strokeWidth="20" />
                  {(() => {
                    const total = stats.today_doses.total || 1;
                    const taken = stats.today_doses.taken || 0;
                    const missed = stats.today_doses.missed || 0;
                    const takenPercent = (taken / total) * 100;
                    const missedPercent = (missed / total) * 100;
                    const circumference = 2 * Math.PI * 70;
                    const takenOffset = circumference - (takenPercent / 100) * circumference;
                    const missedOffset = circumference - (missedPercent / 100) * circumference;
                    return (
                      <>
                        <circle
                          cx="100"
                          cy="100"
                          r="70"
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="20"
                          strokeDasharray={circumference}
                          strokeDashoffset={takenOffset}
                          strokeLinecap="round"
                          transform="rotate(-90 100 100)"
                        />
                        <circle
                          cx="100"
                          cy="100"
                          r="70"
                          fill="none"
                          stroke="#f59e0b"
                          strokeWidth="20"
                          strokeDasharray={circumference}
                          strokeDashoffset={missedOffset}
                          strokeLinecap="round"
                          transform={`rotate(${-90 + (takenPercent / 100) * 360} 100 100)`}
                        />
                        <text x="100" y="95" textAnchor="middle" className="admin-donut-value">
                          {total}
                        </text>
                        <text x="100" y="115" textAnchor="middle" className="admin-donut-label">
                          Total
                        </text>
                      </>
                    );
                  })()}
                </svg>
                <div className="admin-donut-legend">
                  <div className="admin-donut-legend-item">
                    <div className="admin-donut-legend-color" style={{ backgroundColor: '#10b981' }}></div>
                    <span>Tomadas: {stats.today_doses.taken}</span>
                  </div>
                  <div className="admin-donut-legend-item">
                    <div className="admin-donut-legend-color" style={{ backgroundColor: '#f59e0b' }}></div>
                    <span>Omitidas: {stats.today_doses.missed}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 4: Distribución de Adherencia por Paciente */}
            <div className="admin-chart-card">
              <div className="admin-chart-header">
                <h3 className="admin-chart-title">
                  <svg className="admin-chart-icon" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 0l-2 2a1 1 0 101.414 1.414L8 10.414l1.293 1.293a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Adherencia por Paciente
                </h3>
              </div>
              <div className="admin-adherence-bars-container">
                {patientsAdherence.length > 0 ? (
                  patientsAdherence.slice(0, 10).map((pa) => {
                    const percentage = pa.summary.adherence_percentage ?? 0;
                    let barColor = '#10b981';
                    if (percentage < 50) barColor = '#ef4444';
                    else if (percentage < 80) barColor = '#f59e0b';
                    return (
                      <div key={pa.patient_id} className="admin-adherence-bar-item">
                        <div className="admin-adherence-bar-label">
                          <span className="admin-adherence-patient-name">{pa.patient_name}</span>
                          <span className="admin-adherence-percentage">
                            {pa.summary.adherence_percentage !== null ? `${Math.round(pa.summary.adherence_percentage)}%` : 'N/A'}
                          </span>
                        </div>
                        <div className="admin-adherence-bar-bg">
                          <div
                            className="admin-adherence-bar-fill"
                            style={{
                              width: `${Math.min(100, percentage)}%`,
                              backgroundColor: barColor
                            }}
                          ></div>
                        </div>
                        <div className="admin-adherence-bar-stats">
                          <span className="admin-adherence-stat-item admin-adherence-stat-taken">✓ {pa.summary.taken_count}</span>
                          <span className="admin-adherence-stat-item admin-adherence-stat-missed">✗ {pa.summary.missed_count}</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="admin-chart-empty">No hay datos de adherencia disponibles</div>
                )}
              </div>
            </div>

            {/* Card 5: Pacientes por Cuidador */}
            <div className="admin-chart-card">
              <div className="admin-chart-header">
                <h3 className="admin-chart-title">
                  <svg className="admin-chart-icon" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                  </svg>
                  Pacientes por Cuidador
                </h3>
              </div>
              <div className="admin-caregiver-bars-container">
                {caregiverStats.length > 0 ? (
                  caregiverStats.slice(0, 8).map((cg) => {
                    const maxCount = Math.max(...caregiverStats.map(c => c.patient_count), 1);
                    return (
                      <div key={cg.caregiver_id} className="admin-caregiver-bar-item">
                        <div className="admin-caregiver-bar-label">{cg.caregiver_name}</div>
                        <div className="admin-caregiver-bar-wrapper">
                          <div
                            className="admin-caregiver-bar-fill"
                            style={{ width: `${(cg.patient_count / maxCount) * 100}%` }}
                          ></div>
                          <span className="admin-caregiver-bar-value">{cg.patient_count}</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="admin-chart-empty">No hay asignaciones disponibles</div>
                )}
              </div>
            </div>

            {/* Card 6: Usuarios por Rol */}
            <div className="admin-chart-card">
              <div className="admin-chart-header">
                <h3 className="admin-chart-title">
                  <svg className="admin-chart-icon" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                  </svg>
                  Usuarios por Rol
                </h3>
              </div>
              <div className="admin-role-chart-container">
                {usersByRole.length > 0 ? (
                  <>
                    <svg className="admin-role-donut" viewBox="0 0 200 200">
                      {(() => {
                        const total = usersByRole.reduce((sum, r) => sum + r.count, 0);
                        if (total === 0) return null;
                        let currentOffset = 0;
                        const colors = ['#667eea', '#10b981', '#3b82f6'];
                        const circumference = 2 * Math.PI * 70;
                        return usersByRole.map((role, i) => {
                          const percent = (role.count / total) * 100;
                          const result = (
                            <circle
                              key={role.role}
                              cx="100"
                              cy="100"
                              r="70"
                              fill="none"
                              stroke={colors[i % colors.length]}
                              strokeWidth="20"
                              strokeDasharray={circumference}
                              strokeDashoffset={currentOffset}
                              strokeLinecap="round"
                              transform="rotate(-90 100 100)"
                            />
                          );
                          currentOffset -= (percent / 100) * circumference;
                          return result;
                        });
                      })()}
                      <text x="100" y="100" textAnchor="middle" className="admin-role-total">
                        {usersByRole.reduce((sum, r) => sum + r.count, 0)}
                      </text>
                    </svg>
                    <div className="admin-role-legend">
                      {usersByRole.map((role, i) => {
                        const colors = ['#667eea', '#10b981', '#3b82f6'];
                        return (
                          <div key={role.role} className="admin-role-legend-item">
                            <div className="admin-role-legend-color" style={{ backgroundColor: colors[i % colors.length] }}></div>
                            <span>{role.role}: {role.count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="admin-chart-empty">No hay datos disponibles</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tabla de Pacientes */}
        <div className="admin-section">
          <h2 className="admin-section-title">
            <span className="section-icon">📋</span>
            Lista de Pacientes
          </h2>
          
          {patientsLoading && patients.length === 0 ? (
            <div className="admin-loading">Cargando pacientes...</div>
          ) : patients.length === 0 ? (
            <div className="admin-empty-state">
              <div className="empty-icon">📋</div>
              <h3 className="empty-title">No hay pacientes registrados</h3>
              <p className="empty-text">Aún no se han registrado pacientes en el sistema</p>
            </div>
          ) : (
            <div 
              className="admin-table-container" 
              onScroll={handleTableScroll}
            >
              <table className="admin-table">
                <thead>
                  <tr className="admin-table-header">
                    <th className="admin-th">Nombre</th>
                    <th className="admin-th">Cuidador Asignado</th>
                    <th className="admin-th">Notas</th>
                    <th className="admin-th">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map((patient) => (
                    <tr key={patient.id} className="admin-table-row">
                      <td className="admin-td">
                        <div className="admin-patient-name">{patient.name}</div>
                      </td>
                      <td className="admin-td">
                        {(() => {
                          const caregiverName = getCaregiverNameSync(patient.id);
                          const hasCaregiver = caregiverName !== 'Sin asignar';
                          return (
                            <span
                              className={`admin-badge ${hasCaregiver ? 'admin-badge-primary' : 'admin-badge-secondary'}`}
                            >
                              {caregiverName}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="admin-td">
                        <div className="admin-notes">
                          {patient.notes || <em style={{ color: '#9ca3af' }}>Sin notas</em>}
                        </div>
                      </td>
                      <td className="admin-td">
                        <span
                          className={`admin-badge ${patient.active ? 'admin-badge-success' : 'admin-badge-error'}`}
                        >
                          {patient.active ? '✓ Activo' : '✗ Inactivo'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {loadingMore && (
                <div className="admin-loading-more">
                  <div>Cargando más pacientes...</div>
                </div>
              )}
              {!nextCursor && patients.length > 0 && (
                <div className="admin-end-of-list">
                  <div>No hay más pacientes para mostrar</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .admin-dashboard-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #f5f7fa 0%, #e9ecef 100%);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          padding-bottom: 4rem;
        }

        .loading-screen {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          gap: 2rem;
        }

        .loading-spinner {
          position: relative;
          width: 80px;
          height: 80px;
        }

        .spinner-ring {
          position: absolute;
          width: 100%;
          height: 100%;
          border: 4px solid transparent;
          border-top-color: #667eea;
          border-radius: 50%;
          animation: spin 1.5s cubic-bezier(0.5, 0, 0.5, 1) infinite;
        }

        .spinner-ring:nth-child(1) {
          animation-delay: -0.45s;
        }

        .spinner-ring:nth-child(2) {
          animation-delay: -0.3s;
        }

        .spinner-ring:nth-child(3) {
          animation-delay: -0.15s;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .loading-text {
          font-size: 1.125rem;
          color: #6b7280;
          font-weight: 500;
        }

        .admin-dashboard-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 3rem 2rem 4rem;
          position: relative;
          overflow: hidden;
        }

        .admin-dashboard-header::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: url('data:image/svg+xml,<svg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><circle cx="30" cy="30" r="1.5" fill="rgba(255,255,255,0.1)"/></svg>');
          opacity: 0.5;
        }

        .header-content {
          max-width: 1400px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1.5rem;
          position: relative;
          z-index: 1;
        }

        .welcome-section {
          animation: slideInLeft 0.6s ease-out;
        }

        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .admin-dashboard-title {
          font-size: 2.5rem;
          font-weight: 800;
          color: #fff;
          margin: 0 0 0.5rem 0;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }

        .admin-dashboard-subtitle {
          font-size: 1.125rem;
          color: rgba(255, 255, 255, 0.9);
          margin: 0;
          font-weight: 500;
        }

        .error-banner {
          max-width: 1400px;
          margin: -2rem auto 2rem;
          padding: 0 2rem;
          position: relative;
          z-index: 10;
        }

        .error-banner > div {
          background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
          color: #dc2626;
          padding: 1rem 1.5rem;
          border-radius: 16px;
          display: flex;
          align-items: center;
          gap: 1rem;
          border: 1px solid #fca5a5;
          font-weight: 500;
          box-shadow: 0 4px 12px rgba(220, 38, 38, 0.1);
        }

        .error-icon {
          width: 24px;
          height: 24px;
          flex-shrink: 0;
        }

        .admin-dashboard-content {
          max-width: 1400px;
          margin: -2rem auto 0;
          padding: 0 2rem;
          position: relative;
          z-index: 5;
        }

        .admin-stats-card {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-radius: 24px;
          padding: 2rem;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.8);
          position: relative;
          overflow: hidden;
          animation: fadeInUp 0.6s ease-out;
          margin-bottom: 2rem;
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .admin-stats-header {
          margin-bottom: 2rem;
          padding-bottom: 1.5rem;
          border-bottom: 2px solid rgba(102, 126, 234, 0.1);
        }

        .admin-stats-title {
          font-size: 1.75rem;
          font-weight: 800;
          color: #1f2937;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .admin-stats-title-icon {
          width: 32px;
          height: 32px;
          color: #667eea;
        }

        .admin-stats-list {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .admin-stats-simple-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          padding-top: 0.5rem;
        }

        .admin-stat-simple-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.875rem 1rem;
          background: rgba(249, 250, 251, 0.6);
          border-radius: 12px;
          border-bottom: 1px solid rgba(229, 231, 235, 0.5);
          transition: background 0.2s ease;
        }

        .admin-stat-simple-item:hover {
          background: rgba(249, 250, 251, 0.9);
        }

        .admin-stat-simple-label {
          font-size: 0.9375rem;
          color: #6b7280;
          font-weight: 500;
        }

        .admin-stat-simple-value {
          font-size: 1.125rem;
          font-weight: 700;
          color: #1f2937;
          font-variant-numeric: tabular-nums;
        }

        .admin-stat-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.25rem;
          background: rgba(249, 250, 251, 0.8);
          border-radius: 16px;
          transition: all 0.3s ease;
          border: 1px solid rgba(229, 231, 235, 0.5);
        }

        .admin-stat-item:hover {
          background: rgba(255, 255, 255, 0.95);
          transform: translateX(4px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }

        .admin-stat-item-adherence {
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);
        }

        .admin-stat-left {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex: 1;
        }

        .admin-stat-icon-wrapper {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .admin-stat-icon-wrapper.admin-stat-icon-users {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }

        .admin-stat-icon-wrapper.admin-stat-icon-patients {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        }

        .admin-stat-icon-wrapper.admin-stat-icon-treatments {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
        }

        .admin-stat-icon-wrapper.admin-stat-icon-adherence {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }

        .admin-stat-icon {
          width: 24px;
          height: 24px;
          color: #fff;
        }

        .admin-stat-info {
          flex: 1;
        }

        .admin-stat-label {
          font-size: 0.9375rem;
          color: #6b7280;
          font-weight: 500;
          margin-bottom: 0.25rem;
        }

        .admin-stat-value {
          font-size: 1.75rem;
          font-weight: 800;
          color: #1f2937;
          line-height: 1;
        }

        .admin-stat-chart {
          width: 200px;
          height: 40px;
          flex-shrink: 0;
        }

        .admin-stat-bar-chart {
          width: 100%;
          height: 100%;
        }

        .admin-stat-bar-bg {
          transition: all 0.3s ease;
        }

        .admin-stat-bar-fill {
          transition: width 1s ease-out;
          animation: expandBar 1s ease-out;
        }

        @keyframes expandBar {
          from {
            width: 0;
          }
        }

        .admin-stat-circular-chart {
          width: 80px;
          height: 80px;
          flex-shrink: 0;
        }

        .admin-stat-circular {
          width: 100%;
          height: 100%;
        }

        .admin-stat-circular-progress {
          transition: stroke-dasharray 1s ease-out;
          animation: drawCircle 1.5s ease-out;
        }

        @keyframes drawCircle {
          from {
            stroke-dasharray: 0 201;
          }
        }

        .admin-stats-decoration {
          position: absolute;
          width: 300px;
          height: 300px;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.1;
          right: -100px;
          top: -100px;
          pointer-events: none;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }

        /* Grid de Gráficos Estructurado */
        .admin-charts-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          grid-auto-rows: minmax(350px, auto);
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .admin-chart-card {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-radius: 24px;
          padding: 1.5rem;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.8);
          position: relative;
          overflow: hidden;
          animation: fadeInUp 0.6s ease-out;
          display: flex;
          flex-direction: column;
        }

        .admin-chart-header {
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 2px solid rgba(102, 126, 234, 0.1);
        }

        .admin-chart-title {
          font-size: 1.125rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .admin-chart-icon {
          width: 24px;
          height: 24px;
          color: #667eea;
        }

        .admin-chart-empty {
          text-align: center;
          padding: 3rem 1rem;
          color: #9ca3af;
          font-size: 0.9375rem;
        }

        /* Gráfico de Tendencia */
        .admin-trend-chart-container {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem 0;
        }

        .admin-trend-chart {
          width: 100%;
          height: 100%;
          max-height: 250px;
        }

        .admin-trend-label {
          font-size: 0.75rem;
          fill: #6b7280;
          font-weight: 500;
        }

        .admin-trend-value {
          font-size: 0.75rem;
          fill: #667eea;
          font-weight: 700;
        }

        .admin-trend-date {
          font-size: 0.75rem;
          fill: #9ca3af;
          font-weight: 500;
        }

        /* Gráfico Donut */
        .admin-donut-chart-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.5rem;
          padding: 1rem 0;
        }

        .admin-donut-chart {
          width: 100%;
          max-width: 180px;
          height: auto;
        }

        .admin-donut-value {
          font-size: 2rem;
          font-weight: 800;
          fill: #1f2937;
        }

        .admin-donut-label {
          font-size: 0.875rem;
          fill: #6b7280;
          font-weight: 600;
        }

        .admin-donut-legend {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          width: 100%;
        }

        .admin-donut-legend-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 0.875rem;
          color: #374151;
        }

        .admin-donut-legend-color {
          width: 16px;
          height: 16px;
          border-radius: 4px;
          flex-shrink: 0;
        }

        /* Barras de Adherencia */
        .admin-adherence-bars-container {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          max-height: 400px;
          overflow-y: auto;
          padding-right: 0.5rem;
        }

        .admin-adherence-bars-container::-webkit-scrollbar {
          width: 6px;
        }

        .admin-adherence-bars-container::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.05);
          border-radius: 10px;
        }

        .admin-adherence-bars-container::-webkit-scrollbar-thumb {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 10px;
        }

        .admin-adherence-bar-item {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .admin-adherence-bar-label {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.875rem;
        }

        .admin-adherence-patient-name {
          font-weight: 600;
          color: #1f2937;
        }

        .admin-adherence-percentage {
          font-weight: 700;
          color: #667eea;
        }

        .admin-adherence-bar-bg {
          height: 8px;
          background: rgba(229, 231, 235, 0.5);
          border-radius: 4px;
          overflow: hidden;
        }

        .admin-adherence-bar-fill {
          height: 100%;
          border-radius: 4px;
          transition: width 1s ease-out;
          animation: expandBar 1s ease-out;
        }

        .admin-adherence-bar-stats {
          display: flex;
          gap: 1rem;
          font-size: 0.75rem;
          color: #6b7280;
        }

        .admin-adherence-stat-item {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .admin-adherence-stat-taken {
          color: #10b981;
        }

        .admin-adherence-stat-missed {
          color: #f59e0b;
        }

        /* Barras de Cuidadores */
        .admin-caregiver-bars-container {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .admin-caregiver-bar-item {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .admin-caregiver-bar-label {
          font-size: 0.875rem;
          font-weight: 600;
          color: #374151;
        }

        .admin-caregiver-bar-wrapper {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .admin-caregiver-bar-fill {
          flex: 1;
          height: 24px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 12px;
          transition: width 1s ease-out;
          animation: expandBar 1s ease-out;
        }

        .admin-caregiver-bar-value {
          font-size: 0.875rem;
          font-weight: 700;
          color: #667eea;
          min-width: 30px;
          text-align: right;
        }

        /* Gráfico de Roles */
        .admin-role-chart-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.5rem;
          padding: 1rem 0;
        }

        .admin-role-donut {
          width: 100%;
          max-width: 180px;
          height: auto;
        }

        .admin-role-total {
          font-size: 2rem;
          font-weight: 800;
          fill: #1f2937;
        }

        .admin-role-legend {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          width: 100%;
        }

        .admin-role-legend-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 0.875rem;
          color: #374151;
        }

        .admin-role-legend-color {
          width: 16px;
          height: 16px;
          border-radius: 4px;
          flex-shrink: 0;
        }

        /* Estado de Tratamientos */
        .admin-treatment-status-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.5rem;
          padding: 1rem 0;
        }

        .admin-treatment-donut {
          width: 100%;
          max-width: 180px;
          height: auto;
        }

        .admin-treatment-value {
          font-size: 2rem;
          font-weight: 800;
          fill: #1f2937;
        }

        .admin-treatment-label {
          font-size: 0.875rem;
          fill: #6b7280;
          font-weight: 600;
        }

        .admin-treatment-legend {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          width: 100%;
        }

        .admin-treatment-legend-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 0.875rem;
          color: #374151;
        }

        .admin-treatment-legend-color {
          width: 16px;
          height: 16px;
          border-radius: 4px;
          flex-shrink: 0;
        }

        /* Top Pacientes */
        .admin-top-patients-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .admin-top-patient-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem;
          background: rgba(249, 250, 251, 0.8);
          border-radius: 12px;
          transition: all 0.3s ease;
        }

        .admin-top-patient-item:hover {
          background: rgba(255, 255, 255, 0.95);
          transform: translateX(4px);
        }

        .admin-top-patient-rank {
          font-size: 1.25rem;
          font-weight: 800;
          color: #667eea;
          min-width: 40px;
        }

        .admin-top-patient-info {
          flex: 1;
          min-width: 0;
        }

        .admin-top-patient-name {
          font-size: 0.9375rem;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 0.25rem;
        }

        .admin-top-patient-stats {
          display: flex;
          gap: 0.75rem;
          font-size: 0.75rem;
          color: #6b7280;
        }

        .admin-top-patient-adherence {
          font-weight: 700;
          color: #667eea;
        }

        .admin-top-patient-bar {
          width: 80px;
          height: 6px;
          background: rgba(229, 231, 235, 0.5);
          border-radius: 3px;
          overflow: hidden;
        }

        .admin-top-patient-bar-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 1s ease-out;
          animation: expandBar 1s ease-out;
        }

        /* Gráfico por Hora */
        .admin-hour-chart-container {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem 0;
          overflow-x: auto;
        }

        .admin-hour-chart {
          width: 100%;
          height: 100%;
          max-height: 200px;
          min-width: 600px;
        }

        .admin-hour-label {
          font-size: 0.75rem;
          fill: #6b7280;
          font-weight: 500;
        }

        .admin-hour-value {
          font-size: 0.75rem;
          fill: #1f2937;
          font-weight: 700;
        }

        /* Medicamentos */
        .admin-medications-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .admin-medication-item {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .admin-medication-name {
          font-size: 0.875rem;
          font-weight: 600;
          color: #374151;
        }

        .admin-medication-bar-wrapper {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .admin-medication-bar-bg {
          flex: 1;
          height: 20px;
          background: rgba(229, 231, 235, 0.5);
          border-radius: 10px;
          overflow: hidden;
        }

        .admin-medication-bar-fill {
          height: 100%;
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          border-radius: 10px;
          transition: width 1s ease-out;
          animation: expandBar 1s ease-out;
        }

        .admin-medication-count {
          font-size: 0.875rem;
          font-weight: 700;
          color: #3b82f6;
          min-width: 30px;
          text-align: right;
        }

        @media (max-width: 1200px) {
          .admin-charts-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 768px) {
          .admin-charts-grid {
            grid-template-columns: 1fr;
          }
        }

        .admin-section {
          margin-bottom: 2rem;
        }

        .admin-section-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 1.5rem 0;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .section-icon {
          font-size: 1.75rem;
        }

        .admin-loading {
          text-align: center;
          padding: 3rem;
          color: #6b7280;
          font-size: 1rem;
        }

        .admin-empty-state {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(10px);
          border-radius: 24px;
          padding: 4rem 2rem;
          text-align: center;
          border: 2px dashed #e5e7eb;
        }

        .empty-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
          opacity: 0.5;
        }

        .empty-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #4b5563;
          margin: 0 0 0.5rem 0;
        }

        .empty-text {
          font-size: 1rem;
          color: #6b7280;
          margin: 0;
          line-height: 1.6;
        }

        .admin-table-container {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-radius: 24px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.8);
          overflow: auto;
          overflow-x: auto;
          max-height: 600px;
          position: relative;
        }

        .admin-table-container::-webkit-scrollbar {
          width: 8px;
        }

        .admin-table-container::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.05);
          border-radius: 10px;
        }

        .admin-table-container::-webkit-scrollbar-thumb {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 10px;
        }

        .admin-table-container::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
        }

        .admin-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 800px;
        }

        .admin-table-header {
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
        }

        .admin-th {
          padding: 1.25rem 1rem;
          text-align: left;
          font-size: 0.875rem;
          font-weight: 700;
          color: #374151;
          border-bottom: 2px solid rgba(102, 126, 234, 0.2);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .admin-table-row {
          border-bottom: 1px solid rgba(229, 231, 235, 0.5);
          transition: background-color 0.2s;
        }

        .admin-table-row:hover {
          background-color: rgba(102, 126, 234, 0.05);
        }

        .admin-td {
          padding: 1.25rem 1rem;
          font-size: 0.9375rem;
          color: #1f2937;
        }

        .admin-patient-name {
          font-weight: 600;
          color: #1f2937;
        }

        .admin-notes {
          max-width: 300px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .admin-badge {
          padding: 0.375rem 0.875rem;
          border-radius: 12px;
          font-size: 0.8125rem;
          font-weight: 600;
          display: inline-block;
        }

        .admin-badge-primary {
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%);
          color: #4338ca;
          border: 1px solid rgba(102, 126, 234, 0.3);
        }

        .admin-badge-secondary {
          background: #f3f4f6;
          color: #6b7280;
        }

        .admin-badge-success {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.15) 100%);
          color: #065f46;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }

        .admin-badge-error {
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.15) 100%);
          color: #991b1b;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .admin-loading-more {
          padding: 1.5rem;
          text-align: center;
          color: #6b7280;
          font-size: 0.875rem;
        }

        .admin-end-of-list {
          padding: 1.5rem;
          text-align: center;
          color: #9ca3af;
          font-size: 0.875rem;
          font-style: italic;
        }

        @media (max-width: 768px) {
          .admin-dashboard-header {
            padding: 2rem 1.5rem 3rem;
          }

          .admin-dashboard-title {
            font-size: 2rem;
          }

          .admin-dashboard-content {
            padding: 0 1.5rem;
          }

          .admin-stats-card {
            padding: 1.5rem;
          }

          .admin-stats-title {
            font-size: 1.5rem;
          }

          .admin-stat-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
            padding: 1rem;
          }

          .admin-stat-left {
            width: 100%;
          }

          .admin-stat-chart {
            width: 100%;
          }

          .admin-stat-circular-chart {
            align-self: center;
          }

          .admin-stat-value {
            font-size: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
}

