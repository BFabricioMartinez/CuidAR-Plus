import { useEffect } from 'react';
import { useDashboard } from '../../hooks/personal/useDashboard';
import { useTreatmentManagement } from '../../hooks/personal/useTreatmentManagement';
import { authApi } from '../../api';

export default function PersonalDashboard() {
  const user = authApi.getStoredUser();
  const { treatments, upcomingDoses, stats, loading, error, fetchDashboard } = useDashboard();
  const { markAsTaken, markAsMissed } = useTreatmentManagement();

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleMarkTaken = async (treatmentId: number, time: string) => {
    try {
      await markAsTaken(treatmentId, time);
      setTimeout(() => fetchDashboard(), 1000);
    } catch (err) {
      console.error('Error al marcar dosis:', err);
    }
  };

  const handleMarkMissed = async (treatmentId: number, time: string) => {
    try {
      await markAsMissed(treatmentId, time);
      setTimeout(() => fetchDashboard(), 1000);
    } catch (err) {
      console.error('Error al marcar dosis:', err);
    }
  };

  if (loading && !stats) {
    return (
      <div className="dashboard-container">
        <div className="loading-screen">
          <div className="loading-spinner">
            <div className="spinner-ring"></div>
            <div className="spinner-ring"></div>
            <div className="spinner-ring"></div>
          </div>
          <p className="loading-text">Cargando tu información de salud...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Header with Gradient */}
      <div className="dashboard-header">
        <div className="header-content">
          <div className="welcome-section">
            <h1 className="dashboard-title">¡Hola, {user?.name || user?.email}!</h1>
            <p className="dashboard-subtitle">Aquí está tu resumen de salud de hoy</p>
          </div>
          <div className="date-badge">
            {new Date().toLocaleDateString('es-AR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long'
            })}
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="error-banner">
          <svg className="error-icon" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      <div className="dashboard-content">
        {/* KPI Cards with Glassmorphism */}
        {stats && (
          <div className="stats-grid">
            <div className="stat-card stat-card-success">
              <div className="stat-icon-wrapper success">
                <svg className="stat-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="stat-content">
                <div className="stat-value">{stats.today_doses.taken}</div>
                <div className="stat-label">Dosis Tomadas Hoy</div>
              </div>
              <div className="stat-decoration success-decoration"></div>
            </div>

            <div className="stat-card stat-card-warning">
              <div className="stat-icon-wrapper warning">
                <svg className="stat-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="stat-content">
                <div className="stat-value">{stats.today_doses.missed}</div>
                <div className="stat-label">Dosis Omitidas Hoy</div>
              </div>
              <div className="stat-decoration warning-decoration"></div>
            </div>

            <div className="stat-card stat-card-info">
              <div className="stat-icon-wrapper info">
                <svg className="stat-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                </svg>
              </div>
              <div className="stat-content">
                <div className="stat-value">
                  {stats.today_doses.adherence_percentage
                    ? `${Math.round(stats.today_doses.adherence_percentage)}%`
                    : 'N/A'}
                </div>
                <div className="stat-label">Adherencia Hoy</div>
              </div>
              <div className="stat-decoration info-decoration"></div>
            </div>
          </div>
        )}

        {/* Upcoming Doses Section */}
        <div className="section">
          <div className="section-header">
            <h2 className="section-title">
              <span className="section-icon">⏰</span>
              Dosis Programadas para Hoy
            </h2>
          </div>

          {upcomingDoses.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <h3 className="empty-title">Sin dosis programadas</h3>
              <p className="empty-text">
                No tienes dosis programadas para hoy. <br />
                Agrega tratamientos en "Mis Tratamientos"
              </p>
            </div>
          ) : (
            <div className="doses-grid">
              {upcomingDoses.map((dose, index) => (
                <div key={index} className="dose-card">
                  <div className="dose-time-badge">
                    <svg className="time-icon" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                    {dose.time}
                  </div>

                  <div className="dose-info">
                    <h3 className="dose-med-name">{dose.med_name}</h3>
                    <p className="dose-dosage">{dose.dosage}</p>
                  </div>

                  <div className="dose-actions">
                    <button
                      onClick={() => handleMarkTaken(dose.treatment_id, dose.time)}
                      className="dose-btn dose-btn-taken"
                      title="Marcar como tomada"
                    >
                      <svg className="btn-icon" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>Tomada</span>
                    </button>
                    <button
                      onClick={() => handleMarkMissed(dose.treatment_id, dose.time)}
                      className="dose-btn dose-btn-missed"
                      title="Marcar como omitida"
                    >
                      <svg className="btn-icon" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <span>Omitida</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active Treatments */}
        <div className="section">
          <div className="section-header">
            <h2 className="section-title">
              <span className="section-icon">💊</span>
              Tratamientos Activos
            </h2>
          </div>

          {treatments.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">💊</div>
              <h3 className="empty-title">Sin tratamientos activos</h3>
              <p className="empty-text">
                No tienes tratamientos activos registrados
              </p>
            </div>
          ) : (
            <div className="treatments-grid">
              {treatments.map((treatment) => (
                <div key={treatment.id} className="treatment-card">
                  <div className="treatment-badge">
                    <svg className="treatment-badge-icon" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h3 className="treatment-name">{treatment.medication_name}</h3>
                  <p className="treatment-dosage">{treatment.dosage}</p>
                  <p className="treatment-frequency">{treatment.frequency}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .dashboard-container {
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

        .dashboard-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 3rem 2rem 4rem;
          position: relative;
          overflow: hidden;
        }

        .dashboard-header::before {
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

        .dashboard-title {
          font-size: 2.5rem;
          font-weight: 800;
          color: #fff;
          margin: 0 0 0.5rem 0;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }

        .dashboard-subtitle {
          font-size: 1.125rem;
          color: rgba(255, 255, 255, 0.9);
          margin: 0;
          font-weight: 500;
        }

        .date-badge {
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(10px);
          padding: 0.875rem 1.5rem;
          border-radius: 50px;
          color: #fff;
          font-weight: 600;
          font-size: 0.9375rem;
          border: 1px solid rgba(255, 255, 255, 0.3);
          text-transform: capitalize;
          animation: slideInRight 0.6s ease-out;
        }

        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
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

        .dashboard-content {
          max-width: 1400px;
          margin: -2rem auto 0;
          padding: 0 2rem;
          position: relative;
          z-index: 5;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
          margin-bottom: 3rem;
        }

        .stat-card {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          border-radius: 24px;
          padding: 2rem;
          display: flex;
          align-items: center;
          gap: 1.5rem;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.8);
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
          animation: fadeInUp 0.6s ease-out;
          animation-fill-mode: both;
        }

        .stat-card:nth-child(1) { animation-delay: 0.1s; }
        .stat-card:nth-child(2) { animation-delay: 0.2s; }
        .stat-card:nth-child(3) { animation-delay: 0.3s; }

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

        .stat-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.12);
        }

        .stat-decoration {
          position: absolute;
          width: 200px;
          height: 200px;
          border-radius: 50%;
          filter: blur(60px);
          opacity: 0.15;
          right: -50px;
          top: -50px;
        }

        .success-decoration {
          background: #10b981;
        }

        .warning-decoration {
          background: #f59e0b;
        }

        .info-decoration {
          background: #3b82f6;
        }

        .stat-icon-wrapper {
          width: 64px;
          height: 64px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .stat-icon-wrapper.success {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          box-shadow: 0 8px 20px rgba(16, 185, 129, 0.3);
        }

        .stat-icon-wrapper.warning {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          box-shadow: 0 8px 20px rgba(245, 158, 11, 0.3);
        }

        .stat-icon-wrapper.info {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          box-shadow: 0 8px 20px rgba(59, 130, 246, 0.3);
        }

        .stat-icon {
          width: 32px;
          height: 32px;
          color: #fff;
        }

        .stat-content {
          flex: 1;
        }

        .stat-value {
          font-size: 2.5rem;
          font-weight: 800;
          color: #1f2937;
          line-height: 1;
          margin-bottom: 0.5rem;
        }

        .stat-label {
          font-size: 0.9375rem;
          color: #6b7280;
          font-weight: 600;
        }

        .section {
          margin-bottom: 3rem;
        }

        .section-header {
          margin-bottom: 1.5rem;
        }

        .section-title {
          font-size: 1.75rem;
          font-weight: 700;
          color: #1f2937;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin: 0;
        }

        .section-icon {
          font-size: 2rem;
        }

        .empty-state {
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

        .doses-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 1.5rem;
        }

        .dose-card {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-radius: 20px;
          padding: 1.75rem;
          border: 1px solid rgba(255, 255, 255, 0.8);
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
          transition: all 0.3s ease;
          animation: scaleIn 0.4s ease-out;
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .dose-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 15px 40px rgba(0, 0, 0, 0.12);
        }

        .dose-time-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #fff;
          padding: 0.625rem 1.25rem;
          border-radius: 50px;
          font-weight: 700;
          font-size: 1.125rem;
          margin-bottom: 1.25rem;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        .time-icon {
          width: 20px;
          height: 20px;
        }

        .dose-info {
          margin-bottom: 1.5rem;
        }

        .dose-med-name {
          font-size: 1.25rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 0.5rem 0;
        }

        .dose-dosage {
          font-size: 1rem;
          color: #6b7280;
          margin: 0;
          font-weight: 500;
        }

        .dose-actions {
          display: flex;
          gap: 0.75rem;
        }

        .dose-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.875rem 1rem;
          border: none;
          border-radius: 12px;
          font-size: 0.9375rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
          font-family: inherit;
        }

        .dose-btn-taken {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: #fff;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }

        .dose-btn-taken:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(16, 185, 129, 0.4);
        }

        .dose-btn-missed {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: #fff;
          box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
        }

        .dose-btn-missed:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(245, 158, 11, 0.4);
        }

        .dose-btn:active {
          transform: translateY(0);
        }

        .btn-icon {
          width: 20px;
          height: 20px;
        }

        .treatments-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 1.25rem;
        }

        .treatment-card {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          border-radius: 18px;
          padding: 1.75rem 1.5rem;
          border: 1px solid rgba(255, 255, 255, 0.8);
          box-shadow: 0 6px 25px rgba(0, 0, 0, 0.06);
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .treatment-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 4px;
          height: 100%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }

        .treatment-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 35px rgba(0, 0, 0, 0.1);
        }

        .treatment-badge {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1rem;
        }

        .treatment-badge-icon {
          width: 24px;
          height: 24px;
          color: #667eea;
        }

        .treatment-name {
          font-size: 1.125rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 0.5rem 0;
        }

        .treatment-dosage {
          font-size: 0.9375rem;
          color: #6b7280;
          margin: 0 0 0.25rem 0;
          font-weight: 600;
        }

        .treatment-frequency {
          font-size: 0.875rem;
          color: #9ca3af;
          margin: 0;
        }

        @media (max-width: 768px) {
          .dashboard-header {
            padding: 2rem 1.5rem 3rem;
          }

          .dashboard-title {
            font-size: 2rem;
          }

          .dashboard-content {
            padding: 0 1.5rem;
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }

          .doses-grid {
            grid-template-columns: 1fr;
          }

          .treatments-grid {
            grid-template-columns: repeat(auto-fill, minmax(100%, 1fr));
          }

          .date-badge {
            width: 100%;
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
}
