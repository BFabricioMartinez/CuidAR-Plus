import { useEffect } from 'react';
import { useAdminDashboard } from '../../hooks/admin/useAdminDashboard';

// ============================================
// COMPONENTE
// ============================================
export default function AdminDashboard() {
  const {
    stats,
    patientsAdherence,
    adherenceTrend,
    caregiverStats,
    loading: statsLoading,
    error: statsError,
    fetchDashboard,
  } = useAdminDashboard();

  // Cargar datos al montar
  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (statsLoading && !stats) {
    return (
      <div className="admin-dashboard-container">
        <div className="loading-screen">
          <div className="loading-spinner">
            <div className="spinner-ring"></div>
            <div className="spinner-ring"></div>
            <div className="spinner-ring"></div>
          </div>
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
            <div className="admin-chart-card admin-chart-card-trend">
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
                  <svg className="admin-trend-chart" viewBox="0 0 600 350">
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
                        x1="50"
                        y1={310 - (val * 2.5)}
                        x2="550"
                        y2={310 - (val * 2.5)}
                        stroke="rgba(102, 126, 234, 0.1)"
                        strokeWidth="1"
                      />
                    ))}
                    {/* Labels */}
                    {[0, 25, 50, 75, 100].map((val) => (
                      <text key={val} x="45" y={315 - (val * 2.5)} textAnchor="end" className="admin-trend-label">
                        {val}%
                      </text>
                    ))}
                    {/* Data points and line */}
                    {adherenceTrend.length > 1 && (
                      <>
                        <polyline
                          points={adherenceTrend.map((d, i) => `${70 + (i * 80)},${310 - (d.adherence_percentage * 2.5)}`).join(' ')}
                          fill="none"
                          stroke="url(#trendLineGradient)"
                          strokeWidth="4"
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
                          d={`M 70,310 L ${adherenceTrend.map((d, i) => `${70 + (i * 80)},${310 - (d.adherence_percentage * 2.5)}`).join(' L ')} L ${70 + ((adherenceTrend.length - 1) * 80)},310 Z`}
                          fill="url(#trendGradient)"
                        />
                        {/* Data points */}
                        {adherenceTrend.map((d, i) => (
                          <g key={i}>
                            <circle
                              cx={70 + (i * 80)}
                              cy={310 - (d.adherence_percentage * 2.5)}
                              r="8"
                              fill="#667eea"
                              stroke="#fff"
                              strokeWidth="3"
                            />
                            <text
                              x={70 + (i * 80)}
                              y={280 - (d.adherence_percentage * 2.5)}
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
                            <text key={i} x={70 + (i * 80)} y="335" textAnchor="middle" className="admin-trend-date">
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
                {!patientsAdherence || patientsAdherence.length === 0 ? (
                  <div className="admin-chart-empty">No hay datos de adherencia disponibles</div>
                ) : (
                  patientsAdherence.map((pa) => {
                    const percentage = pa.adherence_percentage ?? 0;
                    let barColor = '#10b981'; // Verde por defecto
                    if (percentage < 50) barColor = '#ef4444'; // Rojo
                    else if (percentage < 80) barColor = '#f59e0b'; // Amarillo

                    return (
                      <div key={pa.patient_id} className="admin-adherence-bar-item">
                        <div className="admin-adherence-bar-label">
                          <span className="admin-adherence-patient-name">{pa.patient_name}</span>
                          <span className="admin-adherence-percentage">
                            {pa.adherence_percentage !== null
                              ? `${Math.round(pa.adherence_percentage)}%`
                              : 'N/A'}
                          </span>
                        </div>
                        <div className="admin-adherence-bar-bg">
                          <div
                            className="admin-adherence-bar-fill"
                            style={{
                              width: `${percentage}%`,
                              backgroundColor: barColor
                            }}
                          ></div>
                        </div>
                        <div className="admin-adherence-bar-stats">
                          <span className="admin-adherence-stat-item admin-adherence-stat-taken">✓ {pa.taken}</span>
                          <span className="admin-adherence-stat-item admin-adherence-stat-missed">✗ {pa.missed}</span>
                        </div>
                      </div>
                    );
                  })
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

          </div>
        )}
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
          gap: 0.625rem;
          padding-top: 0.25rem;
        }

        .admin-stat-simple-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.625rem 0.875rem;
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
          grid-auto-rows: minmax(280px, auto);
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        @media (max-width: 768px) {
          .admin-charts-grid {
            grid-template-columns: 1fr;
            gap: 1.25rem;
          }
        }

        .admin-chart-card {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-radius: 24px;
          padding: 1.25rem;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.8);
          position: relative;
          overflow: hidden;
          animation: fadeInUp 0.6s ease-out;
          display: flex;
          flex-direction: column;
        }

        .admin-chart-header {
          margin-bottom: 1rem;
          padding-bottom: 0.75rem;
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
        .admin-chart-card-trend {
          grid-column: span 2;
        }

        .admin-chart-card-trend .admin-chart-header {
          margin-bottom: 0;
          padding-bottom: 0;
        }

        .admin-trend-chart-container {
          flex: 1;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: 0;
          margin-top: -0.5rem;
          min-height: 350px;
        }

        .admin-trend-chart {
          width: 100%;
          height: 100%;
          min-height: 350px;
          max-height: 450px;
          margin-top: -1rem;
        }

        .admin-trend-label {
          font-size: 0.875rem;
          fill: #6b7280;
          font-weight: 600;
        }

        .admin-trend-value {
          font-size: 0.875rem;
          fill: #667eea;
          font-weight: 700;
        }

        .admin-trend-date {
          font-size: 0.875rem;
          fill: #9ca3af;
          font-weight: 500;
        }

        @media (max-width: 1024px) {
          .admin-chart-card-trend {
            grid-column: span 1;
          }

          .admin-trend-chart-container {
            min-height: 300px;
          }

          .admin-trend-chart {
            min-height: 300px;
            max-height: 380px;
          }
        }

        @media (max-width: 768px) {
          .admin-chart-card-trend {
            grid-column: span 1;
            padding: 1.25rem;
          }

          .admin-trend-chart-container {
            min-height: 350px;
            padding: 1rem 0.5rem;
            width: 100%;
            overflow-x: auto;
            overflow-y: visible;
          }

          .admin-trend-chart {
            min-height: 350px;
            max-height: 400px;
            width: 100%;
            min-width: 100%;
          }

          .admin-trend-label {
            font-size: 1rem;
            fill: #6b7280;
            font-weight: 600;
          }

          .admin-trend-value {
            font-size: 1.125rem;
            fill: #667eea;
            font-weight: 700;
          }

          .admin-trend-date {
            font-size: 1rem;
            fill: #9ca3af;
            font-weight: 500;
          }

          /* Hacer elementos del gráfico más grandes en mobile */
          .admin-trend-chart circle {
            r: 10 !important;
            stroke-width: 4 !important;
          }

          .admin-trend-chart polyline {
            stroke-width: 5 !important;
          }

          .admin-trend-chart line {
            stroke-width: 1.5 !important;
          }
        }

        @media (max-width: 480px) {
          .admin-trend-chart-container {
            min-height: 320px;
            padding: 1rem 0.25rem;
          }

          .admin-trend-chart {
            min-height: 320px;
            max-height: 380px;
          }

          .admin-trend-label {
            font-size: 1.125rem;
          }

          .admin-trend-value {
            font-size: 1.25rem;
          }

          .admin-trend-date {
            font-size: 1.125rem;
          }

          /* Elementos aún más grandes en pantallas muy pequeñas */
          .admin-trend-chart circle {
            r: 12 !important;
            stroke-width: 5 !important;
          }

          .admin-trend-chart polyline {
            stroke-width: 6 !important;
          }
        }

        /* Gráfico Donut */
        .admin-donut-chart-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem 0;
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
          gap: 0.875rem;
          max-height: 380px;
          overflow-y: auto;
          padding-right: 0.5rem;
        }

        .admin-adherence-bars-container::-webkit-scrollbar {
          width: 8px;
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
        }

        .admin-adherence-patient-name {
          font-weight: 600;
          color: #1f2937;
          font-size: 0.9375rem;
        }

        .admin-adherence-percentage {
          font-weight: 700;
          color: #667eea;
          font-size: 1rem;
        }

        .admin-adherence-bar-bg {
          width: 100%;
          height: 12px;
          background: rgba(0, 0, 0, 0.05);
          border-radius: 50px;
          overflow: hidden;
          position: relative;
        }

        .admin-adherence-bar-fill {
          height: 100%;
          border-radius: 50px;
          transition: width 1s ease-out;
          animation: expandBar 1s ease-out;
        }

        .admin-adherence-bar-stats {
          display: flex;
          gap: 1rem;
          font-size: 0.875rem;
        }

        .admin-adherence-stat-item {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-weight: 600;
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
          gap: 0.875rem;
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

        /* Dashboard Footer */
        .dashboard-footer {
          position: fixed;
          bottom: 1rem;
          left: 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          font-size: 0.875rem;
          color: #6b7280;
          z-index: 100;
          border: 1px solid rgba(0, 0, 0, 0.05);
        }

        .dashboard-footer svg {
          width: 16px;
          height: 16px;
          color: #667eea;
        }

        .dashboard-footer-text {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .dashboard-footer-year {
          font-weight: 600;
          color: #667eea;
        }

        @media (max-width: 640px) {
          .dashboard-footer {
            bottom: 0.5rem;
            left: 0.5rem;
            padding: 0.375rem 0.75rem;
            font-size: 0.75rem;
          }
        }
      `}</style>
      
      {/* Footer */}
      <div className="dashboard-footer">
        <svg viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
        </svg>
        <div className="dashboard-footer-text">
          <span className="dashboard-footer-year">{new Date().getFullYear()}</span>
          <span>CuidAR</span>
        </div>
      </div>
    </div>
  );
}

