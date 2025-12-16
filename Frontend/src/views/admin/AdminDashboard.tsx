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

        {/* KPIs Principales */}
        {stats && (
          <div className="admin-kpi-container">
            <div className="admin-kpi-card">
              <div className="admin-kpi-icon-wrapper">
                <div className="admin-kpi-icon">👥</div>
              </div>
              <div className="admin-kpi-content">
                <div className="admin-kpi-value">{stats.active_users}</div>
                <div className="admin-kpi-label">Usuarios Activos</div>
              </div>
            </div>

            <div className="admin-kpi-card">
              <div className="admin-kpi-icon-wrapper">
                <div className="admin-kpi-icon">🏥</div>
              </div>
              <div className="admin-kpi-content">
                <div className="admin-kpi-value">{stats.total_patients}</div>
                <div className="admin-kpi-label">Pacientes Totales</div>
              </div>
            </div>

            <div className="admin-kpi-card">
              <div className="admin-kpi-icon-wrapper">
                <div className="admin-kpi-icon">💊</div>
              </div>
              <div className="admin-kpi-content">
                <div className="admin-kpi-value">{stats.active_treatments}</div>
                <div className="admin-kpi-label">Tratamientos Activos</div>
              </div>
            </div>

            <div className="admin-kpi-card">
              <div className="admin-kpi-icon-wrapper">
                <div className="admin-kpi-icon">📊</div>
              </div>
              <div className="admin-kpi-content">
                <div className="admin-kpi-value">
                  {stats.today_doses.adherence_percentage
                    ? `${stats.today_doses.adherence_percentage}%`
                    : 'N/A'}
                </div>
                <div className="admin-kpi-label">Adherencia Hoy</div>
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

        .admin-kpi-container {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .admin-kpi-card {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-radius: 24px;
          padding: 2rem;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.8);
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
          animation: fadeInUp 0.6s ease-out both;
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }

        .admin-kpi-card:nth-child(1) { animation-delay: 0.1s; }
        .admin-kpi-card:nth-child(2) { animation-delay: 0.2s; }
        .admin-kpi-card:nth-child(3) { animation-delay: 0.3s; }
        .admin-kpi-card:nth-child(4) { animation-delay: 0.4s; }

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

        .admin-kpi-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.12);
        }

        .admin-kpi-icon-wrapper {
          width: 64px;
          height: 64px;
          border-radius: 16px;
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .admin-kpi-icon {
          font-size: 2rem;
        }

        .admin-kpi-content {
          flex: 1;
        }

        .admin-kpi-value {
          font-size: 2.5rem;
          font-weight: 800;
          color: #1f2937;
          line-height: 1;
          margin-bottom: 0.5rem;
        }

        .admin-kpi-label {
          font-size: 0.9375rem;
          color: #6b7280;
          font-weight: 500;
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

          .admin-kpi-container {
            grid-template-columns: 1fr;
            gap: 1rem;
          }

          .admin-kpi-card {
            padding: 1.5rem;
          }

          .admin-kpi-value {
            font-size: 2rem;
          }
        }
      `}</style>
    </div>
  );
}

