import { useEffect, useState } from 'react';
import { useAsistencialDashboard } from '../../hooks/asistencial/useAsistencialDashboard';
import { toastDoseTaken, toastDoseMissed, toastError, toastLoading, toastDismiss } from '../../utils/toast';

export default function AsistencialDashboard() {
  const {
    patients,
    selectedPatientId,
    treatments,
    upcomingDoses,
    stats,
    patientsAdherence,
    allUpcomingDoses,
    loading,
    error,
    fetchDashboard,
    markAsTaken: markAsTakenHook,
    markAsMissed: markAsMissedHook,
  } = useAsistencialDashboard();

  // Estado para rastrear las dosis que se están desvaneciendo
  const [fadingDoses, setFadingDoses] = useState<Set<string>>(new Set());
  // Estado para rastrear las dosis que ya fueron marcadas (para ocultarlas permanentemente)
  const [markedDoses, setMarkedDoses] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Nombre del paciente seleccionado
  const selectedPatientName =
    patients.find((p) => p.id === selectedPatientId)?.name || '';

  // Función para verificar si una dosis está atrasada
  const isDoseOverdue = (time: string): boolean => {
    const now = new Date();
    const [hours, minutes] = time.split(':').map(Number);
    const doseTime = new Date();
    doseTime.setHours(hours, minutes, 0, 0);
    return now > doseTime;
  };

  // Generar una clave única para cada dosis
  const getDoseKey = (treatmentId: number, time: string) => `${treatmentId}-${time}`;

  const handleMarkTaken = async (treatmentId: number, time: string) => {
    const doseKey = getDoseKey(treatmentId, time);
    const dose = upcomingDoses.find(d => d.treatment_id === treatmentId && d.time === time);
    const medicationName = dose?.med_name || 'medicamento';

    // Prevenir múltiples clicks mostrando loading
    if (fadingDoses.has(doseKey)) {
      return; // Ya está siendo procesada
    }

    // Mostrar loading toast con ID único
    const loadingToastId = `dose-taken-${doseKey}`;
    toastLoading(`Marcando dosis de ${medicationName}...`, loadingToastId);

    try {
      // Agregar a la lista de dosis que se están desvaneciendo
      setFadingDoses(prev => new Set(prev).add(doseKey));
      // Marcar como procesada inmediatamente para que no reaparezca
      setMarkedDoses(prev => new Set(prev).add(doseKey));

      await markAsTakenHook(treatmentId, time);

      // Cerrar loading y mostrar success
      toastDismiss(loadingToastId);
      toastDoseTaken(medicationName);

      // Esperar a que termine la animación, luego solo remover de fadingDoses
      setTimeout(() => {
        setFadingDoses(prev => {
          const next = new Set(prev);
          next.delete(doseKey);
          return next;
        });
        // Recargar dashboard después de la animación
        fetchDashboard();
      }, 600); // 600ms coincide con la duración de la animación
    } catch (err) {
      console.error('Error al marcar dosis:', err);

      // Cerrar loading y mostrar error
      toastDismiss(loadingToastId);
      toastError('No se pudo registrar la dosis. Por favor, intentá nuevamente.');

      // Remover de ambas listas si hay error
      setFadingDoses(prev => {
        const next = new Set(prev);
        next.delete(doseKey);
        return next;
      });
      setMarkedDoses(prev => {
        const next = new Set(prev);
        next.delete(doseKey);
        return next;
      });
    }
  };

  const handleMarkMissed = async (treatmentId: number, time: string) => {
    const doseKey = getDoseKey(treatmentId, time);
    const dose = upcomingDoses.find(d => d.treatment_id === treatmentId && d.time === time);
    const medicationName = dose?.med_name || 'medicamento';

    // Prevenir múltiples clicks
    if (fadingDoses.has(doseKey)) {
      return; // Ya está siendo procesada
    }

    // Mostrar loading toast con ID único
    const loadingToastId = `dose-missed-${doseKey}`;
    toastLoading(`Marcando dosis de ${medicationName}...`, loadingToastId);

    try {
      // Agregar a la lista de dosis que se están desvaneciendo
      setFadingDoses(prev => new Set(prev).add(doseKey));
      // Marcar como procesada inmediatamente para que no reaparezca
      setMarkedDoses(prev => new Set(prev).add(doseKey));

      await markAsMissedHook(treatmentId, time);

      // Cerrar loading y mostrar warning
      toastDismiss(loadingToastId);
      toastDoseMissed(medicationName);

      // Esperar a que termine la animación, luego solo remover de fadingDoses
      setTimeout(() => {
        setFadingDoses(prev => {
          const next = new Set(prev);
          next.delete(doseKey);
          return next;
        });
        // Recargar dashboard después de la animación
        fetchDashboard();
      }, 600); // 600ms coincide con la duración de la animación
    } catch (err) {
      console.error('Error al marcar dosis:', err);

      // Cerrar loading y mostrar error
      toastDismiss(loadingToastId);
      toastError('No se pudo marcar la dosis como omitida. Por favor, intentá nuevamente.');

      // Remover de ambas listas si hay error
      setFadingDoses(prev => {
        const next = new Set(prev);
        next.delete(doseKey);
        return next;
      });
      setMarkedDoses(prev => {
        const next = new Set(prev);
        next.delete(doseKey);
        return next;
      });
    }
  };

  if (loading && !stats) {
    return (
      <div className="dashboard-container loading-container">
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
    <div className="dashboard-container">
      {/* Header with Gradient */}
      <div className="dashboard-header">
        <div className="header-content">
          <div className="welcome-section">
            <h1 className="dashboard-title">Dashboard Asistencial</h1>
            <p className="dashboard-subtitle">Gestiona los tratamientos de tus pacientes</p>
          </div>
          <div className="date-badge">
            {new Date().toLocaleDateString('es-AR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long'
            })}
          </div>
        </div>

        {/* Quick Navigation Menu (Mobile Only) */}
        <div className="quick-nav-mobile">
          {selectedPatientId ? (
            <>
              <button
                onClick={() => document.getElementById('doses-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                className="quick-nav-btn"
              >
                <svg className="quick-nav-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                <span>Dosis</span>
              </button>
              <button
                onClick={() => document.getElementById('treatments-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                className="quick-nav-btn"
              >
                <svg className="quick-nav-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
                </svg>
                <span>Tratamientos</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => document.getElementById('adherence-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                className="quick-nav-btn"
              >
                <svg className="quick-nav-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 0l-2 2a1 1 0 101.414 1.414L8 10.414l1.293 1.293a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Adherencia</span>
              </button>
              <button
                onClick={() => document.getElementById('timeline-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                className="quick-nav-btn"
              >
                <svg className="quick-nav-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                <span>Próximas Dosis</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="error-banner">
            <div>
            <svg className="error-icon" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
            </div>
          </div>
      )}

      <div className="dashboard-content">
        {/* Layout de dos columnas: Estadísticas (izq) + Dosis Programadas (der) */}
        <div className="dashboard-layout">
          {/* COLUMNA IZQUIERDA: Estadísticas */}
          <div className="stats-column">
            {stats && (
              <>
                {/* Featured Adherence Chart */}
                <div className="chart-card chart-card-featured">
                  <div className="chart-header">
                    <h3 className="chart-title">Adherencia de Hoy</h3>
                    <div className="chart-subtitle">Progreso diario</div>
                  </div>
                  <div className="circular-chart-container">
                    <svg className="circular-chart" viewBox="0 0 200 200">
                      {/* Background Circle */}
                      <circle
                        className="circular-chart-bg"
                        cx="100"
                        cy="100"
                        r="80"
                        fill="none"
                        stroke="rgba(255, 255, 255, 0.1)"
                        strokeWidth="12"
                      />
                      {/* Progress Circle */}
                      <circle
                        className="circular-chart-progress"
                        cx="100"
                        cy="100"
                        r="80"
                        fill="none"
                        stroke="url(#adherenceGradient)"
                        strokeWidth="12"
                        strokeLinecap="round"
                        strokeDasharray={`${(stats.today_doses.adherence_percentage || 0) * 5.026} 502.6`}
                        transform="rotate(-90 100 100)"
                      />
                      {/* Gradient Definition */}
                      <defs>
                        <linearGradient id="adherenceGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#667eea" />
                          <stop offset="100%" stopColor="#764ba2" />
                        </linearGradient>
                      </defs>
                      {/* Center Text */}
                      <text x="100" y="95" textAnchor="middle" className="circular-chart-value">
                        {stats.today_doses.adherence_percentage
                          ? `${Math.round(stats.today_doses.adherence_percentage)}%`
                          : 'N/A'}
                      </text>
                      <text x="100" y="115" textAnchor="middle" className="circular-chart-label">
                        adherencia
                      </text>
                    </svg>
                  </div>
                  <div className="chart-decoration featured-decoration"></div>
                </div>

                {/* Mini Stats Grid */}
                <div className="mini-stats-grid">
                  {/* Taken Doses Chart */}
                  <div className="chart-card chart-card-success">
                    <div className="chart-header">
                      <div className="chart-icon-wrapper success">
                        <svg className="chart-icon" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
            <div>
                        <h3 className="chart-title-small">Dosis Tomadas</h3>
                        <div className="chart-subtitle-small">Hoy</div>
            </div>
                    </div>
                    <div className="mini-chart-container">
                      <div className="chart-value-large">{stats.today_doses.taken}</div>
                      <svg className="mini-bar-chart" viewBox="0 0 120 60">
                        {/* Bar */}
                        <rect
                          className="mini-bar-bg"
                          x="10"
                          y="10"
                          width="100"
                          height="40"
                          rx="8"
                          fill="rgba(255, 255, 255, 0.1)"
                        />
                        <rect
                          className="mini-bar-fill"
                          x="10"
                          y="10"
                          width={Math.min(100, (stats.today_doses.taken / Math.max(stats.today_doses.taken + stats.today_doses.missed, 1)) * 100)}
                          height="40"
                          rx="8"
                          fill="url(#successGradient)"
                        />
                        <defs>
                          <linearGradient id="successGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#10b981" />
                            <stop offset="100%" stopColor="#34d399" />
                          </linearGradient>
                        </defs>
                      </svg>
                    </div>
                    <div className="chart-decoration success-decoration"></div>
          </div>

                  {/* Missed Doses Chart */}
                  <div className="chart-card chart-card-warning">
                    <div className="chart-header">
                      <div className="chart-icon-wrapper warning">
                        <svg className="chart-icon" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </div>
            <div>
                        <h3 className="chart-title-small">Dosis Omitidas</h3>
                        <div className="chart-subtitle-small">Hoy</div>
              </div>
            </div>
                    <div className="mini-chart-container">
                      <div className="chart-value-large">{stats.today_doses.missed}</div>
                      <svg className="mini-bar-chart" viewBox="0 0 120 60">
                        {/* Bar */}
                        <rect
                          className="mini-bar-bg"
                          x="10"
                          y="10"
                          width="100"
                          height="40"
                          rx="8"
                          fill="rgba(255, 255, 255, 0.1)"
                        />
                        <rect
                          className="mini-bar-fill"
                          x="10"
                          y="10"
                          width={Math.min(100, (stats.today_doses.missed / Math.max(stats.today_doses.taken + stats.today_doses.missed, 1)) * 100)}
                          height="40"
                          rx="8"
                          fill="url(#warningGradient)"
                        />
                        <defs>
                          <linearGradient id="warningGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#f59e0b" />
                            <stop offset="100%" stopColor="#fbbf24" />
                          </linearGradient>
                        </defs>
                      </svg>
          </div>
                    <div className="chart-decoration warning-decoration"></div>
        </div>
                </div>
              </>
        )}
      </div>

          {/* COLUMNA DERECHA: Dosis Programadas */}
          <div className="doses-column">
            {selectedPatientId ? (
              <>
                {/* Caja de Dosis Programadas con Scroll */}
                <div id="doses-section" className="doses-box">
                  <div className="doses-box-header">
                    <h2 className="doses-box-title">
                      <span className="section-icon">⏰</span>
                      Dosis Programadas para Hoy - {selectedPatientName}
                    </h2>
                  </div>

                  <div className="doses-box-content">
                    {(() => {
                      // Filtrar dosis no marcadas, PERO mantener las que están desvaneciéndose
                      const visibleDoses = upcomingDoses.filter(dose => {
                        const doseKey = getDoseKey(dose.treatment_id, dose.time);
                        // Mostrar si NO está marcada, O si está marcada pero todavía desvaneciéndose
                        return !markedDoses.has(doseKey) || fadingDoses.has(doseKey);
                      });

                      if (upcomingDoses.length === 0) {
                        return (
                          <div className="empty-state">
                            <div className="empty-icon">📋</div>
                            <h3 className="empty-title">Sin dosis programadas</h3>
                            <p className="empty-text">
                              No hay dosis programadas para hoy para {selectedPatientName}. <br />
                              El paciente no tiene tratamientos activos
                            </p>
            </div>
                        );
                      }

                      if (visibleDoses.length === 0) {
                        return (
                          <div className="empty-state">
                            <div className="empty-icon">✅</div>
                            <h3 className="empty-title">¡Todas las dosis completadas!</h3>
                            <p className="empty-text">
                              Se han registrado todas las dosis de hoy para {selectedPatientName}. <br />
                              ¡Excelente trabajo manteniendo la adherencia!
                            </p>
                  </div>
                        );
                      }

                      return (
                        <div className="doses-grid">
                          {visibleDoses.map((dose) => {
                            const doseKey = getDoseKey(dose.treatment_id, dose.time);
                            const isOverdue = isDoseOverdue(dose.time);
                            const isFading = fadingDoses.has(doseKey);

                            return (
                              <div
                                key={doseKey}
                                className={`dose-card ${isOverdue ? 'dose-card-overdue' : ''} ${isFading ? 'dose-card-fading' : ''}`}
                              >
                                {/* Indicador de atrasada */}
                                {isOverdue && (
                                  <div className="overdue-badge">
                                    <svg className="overdue-icon" viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    <span className="overdue-text">Atrasada</span>
                                  </div>
                                )}

                                <div className={`dose-time-badge ${isOverdue ? 'dose-time-badge-overdue' : ''}`}>
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
                                    disabled={isFading}
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
                                    disabled={isFading}
                                  >
                                    <svg className="btn-icon" viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                    <span>Omitida</span>
                    </button>
                  </div>
                </div>
                            );
                          })}
            </div>
                      );
                    })()}
        </div>
                </div>

                {/* Active Treatments (dentro de la columna de dosis) */}
                <div id="treatments-section" className="treatments-box">
                  <div className="treatments-box-header">
                    <h2 className="treatments-box-title">
                      <span className="section-icon">💊</span>
                      Tratamientos Activos - {selectedPatientName}
          </h2>
                  </div>

                  <div className="treatments-box-content">
                    {treatments.length === 0 ? (
                      <div className="empty-state">
                        <div className="empty-icon">💊</div>
                        <h3 className="empty-title">Sin tratamientos activos</h3>
                        <p className="empty-text">
                          {selectedPatientName} no tiene tratamientos activos registrados
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
              </>
            ) : (
              <>
                {/* Vista General - Todos los Pacientes */}

                {/* Card de Total de Pacientes Asignados */}
                <div className="general-overview-card">
                  <div className="overview-header">
                    <div className="overview-icon-wrapper">
                      <svg className="overview-icon" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                      </svg>
                    </div>
                    <div className="overview-text-wrapper">
                      <h3 className="overview-title">Total de Pacientes Asignados</h3>
                      <p className="overview-subtitle">Bajo tu cuidado</p>
                    </div>
                    <div className="overview-value">{patients.length}</div>
                  </div>
                  <div className="overview-decoration"></div>
                </div>

                {/* Gráfico de Distribución de Adherencia por Paciente */}
                <div id="adherence-section" className="adherence-chart-card">
                  <div className="chart-card-header">
                    <h3 className="chart-card-title">
                      <svg className="chart-card-icon" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 0l-2 2a1 1 0 101.414 1.414L8 10.414l1.293 1.293a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Distribución de Adherencia por Paciente
                    </h3>
                  </div>
                  <div className="adherence-bars-container">
                    {patientsAdherence.length === 0 ? (
                      <div className="empty-state-mini">
                        <p>No hay datos de adherencia disponibles</p>
                      </div>
                    ) : (
                      patientsAdherence.map((pa) => {
                        const percentage = pa.adherence_percentage ?? 0;
                        let barColor = '#10b981'; // Verde por defecto
                        if (percentage < 50) barColor = '#ef4444'; // Rojo
                        else if (percentage < 80) barColor = '#f59e0b'; // Amarillo

                        return (
                          <div key={pa.patient_id} className="adherence-bar-item">
                            <div className="adherence-bar-label">
                              <span className="patient-name-label">{pa.patient_name}</span>
                              <span className="adherence-percentage-label">
                                {pa.adherence_percentage !== null
                                  ? `${Math.round(pa.adherence_percentage)}%`
                                  : 'N/A'}
                              </span>
                            </div>
                            <div className="adherence-bar-bg">
                              <div
                                className="adherence-bar-fill"
                                style={{
                                  width: `${percentage}%`,
                                  backgroundColor: barColor
                                }}
                              ></div>
                            </div>
                            <div className="adherence-bar-stats">
                              <span className="stat-item stat-taken">✓ {pa.taken}</span>
                              <span className="stat-item stat-missed">✗ {pa.missed}</span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Top Pacientes */}
                <div className="top-patients-section">
                  <h3 className="section-title-small">
                    <svg className="section-icon-small" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    Destacados
                  </h3>
                  <div className="top-patients-grid">
                    {/* Top 3 Mejores */}
                    <div className="top-patients-card top-patients-success">
                      <h4 className="top-patients-title">🏆 Mejor Adherencia</h4>
                      <div className="top-patients-list">
                        {patientsAdherence.slice(0, 3).map((pa, idx) => (
                          <div key={pa.patient_id} className="top-patient-item">
                            <span className="top-rank">#{idx + 1}</span>
                            <span className="top-patient-name">{pa.patient_name}</span>
                            <span className="top-patient-percentage">
                              {pa.adherence_percentage !== null
                                ? `${Math.round(pa.adherence_percentage)}%`
                                : 'N/A'}
                            </span>
                          </div>
                        ))}
                        {patientsAdherence.length === 0 && (
                          <p className="empty-text-small">Sin datos disponibles</p>
                        )}
                      </div>
                    </div>

                    {/* Top 3 que Necesitan Atención */}
                    <div className="top-patients-card top-patients-warning">
                      <h4 className="top-patients-title">⚠️ Necesitan Atención</h4>
                      <div className="top-patients-list">
                        {patientsAdherence.slice().reverse().slice(0, 3).map((pa, idx) => (
                          <div key={pa.patient_id} className="top-patient-item">
                            <span className="top-rank">#{patientsAdherence.length - idx}</span>
                            <span className="top-patient-name">{pa.patient_name}</span>
                            <span className="top-patient-percentage">
                              {pa.adherence_percentage !== null
                                ? `${Math.round(pa.adherence_percentage)}%`
                                : 'N/A'}
                            </span>
                          </div>
                        ))}
                        {patientsAdherence.length === 0 && (
                          <p className="empty-text-small">Sin datos disponibles</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Timeline de Próximas Dosis */}
                <div id="timeline-section" className="upcoming-doses-timeline-card">
                  <div className="chart-card-header">
                    <h3 className="chart-card-title">
                      <svg className="chart-card-icon" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                      </svg>
                      Próximas Dosis del Día (Todos los Pacientes)
                    </h3>
                  </div>
                  <div className="timeline-container">
                    {allUpcomingDoses.length === 0 ? (
                      <div className="empty-state-mini">
                        <div className="empty-icon-mini">✅</div>
                        <p>No hay dosis pendientes para hoy</p>
                      </div>
                    ) : (
                      <div className="timeline-list">
                        {allUpcomingDoses.slice(0, 10).map((dose, idx) => {
                          const now = new Date();
                          const [hours, minutes] = dose.time.split(':').map(Number);
                          const doseTime = new Date();
                          doseTime.setHours(hours, minutes, 0, 0);
                          const isOverdue = now > doseTime;

                          return (
                            <div key={idx} className={`timeline-item ${isOverdue ? 'timeline-item-overdue' : ''}`}>
                              <div className="timeline-time">
                                <svg className="timeline-clock-icon" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                </svg>
                                {dose.time}
                              </div>
                              <div className="timeline-details">
                                <div className="timeline-patient">{dose.patient_name}</div>
                                <div className="timeline-medication">{dose.med_name} - {dose.dosage}</div>
                              </div>
                              {isOverdue && (
                                <div className="timeline-badge-overdue">Atrasada</div>
                              )}
                            </div>
                          );
                        })}
                        {allUpcomingDoses.length > 10 && (
                          <div className="timeline-more">
                            +{allUpcomingDoses.length - 10} dosis más
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
    </div>
        </div>
      </div>

      <style>{`
        .dashboard-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #f5f7fa 0%, #e9ecef 100%);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          padding-bottom: 4rem;
        }

        .dashboard-container.loading-container {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          min-height: 100vh !important;
          padding: 0 !important;
          padding-bottom: 0 !important;
          margin: 0 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          background: linear-gradient(135deg, #f5f7fa 0%, #e9ecef 100%) !important;
          z-index: 999 !important;
        }

        .loading-screen {
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 2rem !important;
          width: 100% !important;
          height: 100% !important;
        }

        .loading-spinner {
          position: relative;
          width: 80px;
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .spinner-ring {
          position: absolute;
          width: 100%;
          height: 100%;
          border: 4px solid transparent;
          border-top-color: #667eea;
          border-radius: 50%;
          animation: spin 1.2s linear infinite;
        }

        .spinner-ring:nth-child(1) {
          width: 100%;
          height: 100%;
          border-top-color: #667eea;
          animation-duration: 1.2s;
        }

        .spinner-ring:nth-child(2) {
          width: 75%;
          height: 75%;
          top: 12.5%;
          left: 12.5%;
          border-top-color: #764ba2;
          animation-duration: 1s;
          animation-direction: reverse;
        }

        .spinner-ring:nth-child(3) {
          width: 50%;
          height: 50%;
          top: 25%;
          left: 25%;
          border-top-color: #667eea;
          animation-duration: 0.8s;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .loading-text {
          font-size: 1.125rem;
          color: #6b7280;
          font-weight: 500;
          text-align: center;
          margin: 0;
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

        /* ============================================
           QUICK NAVIGATION MENU (Mobile Only)
           ============================================ */

        .quick-nav-mobile {
          display: none;
          gap: 0.75rem;
          padding: 1rem 0 0;
          margin-top: 1rem;
          max-width: 1400px;
          margin-left: auto;
          margin-right: auto;
        }

        .quick-nav-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.875rem 1rem;
          background: rgba(255, 255, 255, 0.25);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 12px;
          color: #fff;
          font-weight: 600;
          font-size: 0.9375rem;
          cursor: pointer;
          transition: all 0.3s ease;
          font-family: inherit;
        }

        .quick-nav-btn:hover {
          background: rgba(255, 255, 255, 0.35);
          transform: translateY(-2px);
        }

        .quick-nav-btn:active {
          transform: translateY(0);
        }

        .quick-nav-icon {
          width: 18px;
          height: 18px;
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

        /* ============================================
           LAYOUT DE DOS COLUMNAS
           ============================================ */

        .dashboard-layout {
          display: grid;
          grid-template-columns: 400px 1fr;
          gap: 2rem;
          margin-bottom: 3rem;
          align-items: start;
        }

        .stats-column {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          position: sticky;
          top: 2rem;
        }

        .doses-column {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        /* Mini Stats Grid (dentro de stats-column) */
        .mini-stats-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.5rem;
        }

        /* ============================================
           CAJA DE DOSIS PROGRAMADAS
           ============================================ */

        .doses-box {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-radius: 24px;
          border: 1px solid rgba(255, 255, 255, 0.8);
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          max-height: calc(100vh - 180px);
        }

        .doses-box-header {
          padding: 1.75rem 2rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .doses-box-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #fff;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin: 0;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }

        .doses-box-content {
          flex: 1;
          overflow-y: auto;
          padding: 1.5rem;
        }

        /* Scroll personalizado */
        .doses-box-content::-webkit-scrollbar {
          width: 8px;
        }

        .doses-box-content::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.05);
          border-radius: 10px;
        }

        .doses-box-content::-webkit-scrollbar-thumb {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 10px;
        }

        .doses-box-content::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
        }

        .chart-card {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          border-radius: 24px;
          padding: 2rem;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.8);
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
          animation: fadeInUp 0.6s ease-out;
          animation-fill-mode: both;
        }

        .chart-card:nth-child(1) { animation-delay: 0.1s; }
        .chart-card:nth-child(2) { animation-delay: 0.2s; }
        .chart-card:nth-child(3) { animation-delay: 0.3s; }
        .chart-card:nth-child(4) { animation-delay: 0.4s; }

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

        .chart-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.12);
        }

        .chart-decoration {
          position: absolute;
          width: 200px;
          height: 200px;
          border-radius: 50%;
          filter: blur(60px);
          opacity: 0.15;
          right: -50px;
          top: -50px;
        }

        .featured-decoration {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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

        /* ============================================
           CHART HEADERS & TITLES
           ============================================ */

        .chart-header {
          margin-bottom: 1.5rem;
        }

        .chart-card-featured .chart-header {
          text-align: center;
        }

        .chart-card-success .chart-header,
        .chart-card-warning .chart-header,
        .chart-card-info .chart-header {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .chart-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 0.25rem 0;
        }

        .chart-subtitle {
          font-size: 0.9375rem;
          color: #6b7280;
          font-weight: 500;
        }

        .chart-title-small {
          font-size: 1rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 0.125rem 0;
        }

        .chart-subtitle-small {
          font-size: 0.8125rem;
          color: #9ca3af;
          font-weight: 500;
        }

        .chart-icon-wrapper {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .chart-icon-wrapper.success {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          box-shadow: 0 8px 20px rgba(16, 185, 129, 0.25);
        }

        .chart-icon-wrapper.warning {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          box-shadow: 0 8px 20px rgba(245, 158, 11, 0.25);
        }

        .chart-icon-wrapper.info {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          box-shadow: 0 8px 20px rgba(59, 130, 246, 0.25);
        }

        .chart-icon {
          width: 24px;
          height: 24px;
          color: #fff;
        }

        /* ============================================
           CIRCULAR CHART (Adherence)
           ============================================ */

        .circular-chart-container {
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 1rem 0;
        }

        .circular-chart {
          width: 100%;
          max-width: 240px;
          height: auto;
        }

        .circular-chart-progress {
          transition: stroke-dasharray 1s ease-out;
          animation: drawCircle 1.5s ease-out;
        }

        @keyframes drawCircle {
          from {
            stroke-dasharray: 0 502.6;
          }
        }

        .circular-chart-value {
          font-size: 2.5rem;
          font-weight: 800;
          fill: #1f2937;
        }

        .circular-chart-label {
          font-size: 0.875rem;
          font-weight: 600;
          fill: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        /* ============================================
           MINI BAR CHARTS
           ============================================ */

        .mini-chart-container {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .chart-value-large {
          font-size: 2.25rem;
          font-weight: 800;
          color: #1f2937;
          line-height: 1;
        }

        .mini-bar-chart {
          width: 100%;
          height: auto;
        }

        .mini-bar-fill {
          transition: width 1s ease-out;
          animation: expandBar 1s ease-out;
        }

        @keyframes expandBar {
          from {
            width: 0;
          }
        }

        .section {
          margin-bottom: 0;
        }

        .section-header {
          margin-bottom: 1.5rem;
        }

        .section-title {
          font-size: 1.375rem;
          font-weight: 700;
          color: #1f2937;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin: 0;
        }

        .section-icon {
          font-size: 1.75rem;
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
          display: flex;
          flex-direction: column;
          gap: 1rem;
          overflow: hidden;
        }

        .dose-card {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-radius: 20px;
          padding: 1.75rem;
          border: 1px solid rgba(255, 255, 255, 0.8);
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
          transition: all 0.3s ease;
          position: relative;
        }

        .dose-card:not(.dose-card-fading) {
          animation: scaleIn 0.4s ease-out;
          animation-fill-mode: both;
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

        .dose-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .btn-icon {
          width: 20px;
          height: 20px;
        }

        /* ============================================
           ESTILOS PARA DOSIS ATRASADAS
           ============================================ */

        .dose-card-overdue {
          border: 2px solid rgba(239, 68, 68, 0.3);
          background: linear-gradient(135deg, rgba(254, 242, 242, 0.95) 0%, rgba(255, 255, 255, 0.95) 100%);
        }

        .dose-card-overdue:hover {
          border-color: rgba(239, 68, 68, 0.5);
        }

        .overdue-badge {
          position: absolute;
          top: 1rem;
          right: 1rem;
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: #fff;
          padding: 0.5rem 0.875rem;
          border-radius: 8px;
          font-size: 0.8125rem;
          font-weight: 700;
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.8;
          }
        }

        .overdue-icon {
          width: 14px;
          height: 14px;
        }

        .overdue-text {
          font-size: 0.8125rem;
        }

        .dose-time-badge-overdue {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
          animation: pulseGlow 2s ease-in-out infinite;
        }

        @keyframes pulseGlow {
          0%, 100% {
            box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
          }
          50% {
            box-shadow: 0 4px 20px rgba(239, 68, 68, 0.5);
          }
        }

        /* ============================================
           ANIMACIÓN DE DESVANECIMIENTO
           ============================================ */

        .dose-card-fading {
          animation: fadeOutScale 0.6s ease-out forwards;
          pointer-events: none;
        }

        @keyframes fadeOutScale {
          0% {
            opacity: 1;
            transform: scale(1);
            max-height: 500px;
            margin-bottom: 1rem;
          }
          50% {
            opacity: 0.3;
            transform: scale(0.95);
            max-height: 500px;
            margin-bottom: 1rem;
          }
          100% {
            opacity: 0;
            transform: scale(0.9);
            max-height: 0;
            padding: 0;
            margin: 0;
            border: none;
            margin-bottom: 0;
          }
        }

        /* ============================================
           CAJA DE TRATAMIENTOS ACTIVOS
           ============================================ */

        .treatments-box {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-radius: 24px;
          border: 1px solid rgba(255, 255, 255, 0.8);
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
          overflow: hidden;
        }

        .treatments-box-header {
          padding: 1.5rem 2rem;
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
          border-bottom: 1px solid rgba(102, 126, 234, 0.2);
        }

        .treatments-box-title {
          font-size: 1.375rem;
          font-weight: 700;
          color: #1f2937;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin: 0;
        }

        .treatments-box-content {
          padding: 1.5rem;
        }

        .treatments-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 1rem;
        }

        .treatment-card {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          border-radius: 16px;
          padding: 1.5rem 1.25rem;
          border: 1px solid rgba(255, 255, 255, 0.8);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
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

        @media (max-width: 1024px) {
          .dashboard-layout {
            grid-template-columns: 1fr;
            gap: 2rem;
          }

          .stats-column {
            position: static;
          }

          .mini-stats-grid {
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
          }

          .doses-box {
            max-height: 500px;
          }
        }

        /* ============================================
           ESTILOS PARA VISTA GENERAL
           ============================================ */

        /* Card de Total de Pacientes */
        .general-overview-card {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 24px;
          padding: 1.5rem;
          box-shadow: 0 10px 40px rgba(102, 126, 234, 0.3);
          position: relative;
          overflow: hidden;
          animation: fadeInUp 0.6s ease-out;
        }

        .overview-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          justify-content: space-between;
          position: relative;
        }

        .overview-icon-wrapper {
          width: 48px;
          height: 48px;
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(10px);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255, 255, 255, 0.3);
          flex-shrink: 0;
        }

        .overview-icon {
          width: 24px;
          height: 24px;
          color: #fff;
        }

        .overview-text-wrapper {
          flex: 1;
          min-width: 0;
        }

        .overview-title {
          font-size: 1.125rem;
          font-weight: 700;
          color: #fff;
          margin: 0 0 0.25rem 0;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }

        .overview-subtitle {
          font-size: 0.875rem;
          color: rgba(255, 255, 255, 0.9);
          margin: 0;
        }

        .overview-value {
          font-size: 2.5rem;
          font-weight: 800;
          color: #fff;
          text-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
          flex-shrink: 0;
          line-height: 1;
        }

        .overview-decoration {
          position: absolute;
          width: 200px;
          height: 200px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.1);
          filter: blur(60px);
          bottom: -50px;
          right: -50px;
        }

        /* Gráfico de Adherencia por Paciente */
        .adherence-chart-card {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-radius: 24px;
          padding: 2rem;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.8);
          animation: fadeInUp 0.6s ease-out;
          animation-delay: 0.1s;
          animation-fill-mode: both;
        }

        .chart-card-header {
          margin-bottom: 1.5rem;
        }

        .chart-card-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #1f2937;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin: 0;
        }

        .chart-card-icon {
          width: 24px;
          height: 24px;
          color: #667eea;
        }

        .adherence-bars-container {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .adherence-bar-item {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .adherence-bar-label {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .patient-name-label {
          font-weight: 600;
          color: #1f2937;
          font-size: 0.9375rem;
        }

        .adherence-percentage-label {
          font-weight: 700;
          color: #667eea;
          font-size: 1rem;
        }

        .adherence-bar-bg {
          width: 100%;
          height: 12px;
          background: rgba(0, 0, 0, 0.05);
          border-radius: 50px;
          overflow: hidden;
          position: relative;
        }

        .adherence-bar-fill {
          height: 100%;
          border-radius: 50px;
          transition: width 1s ease-out;
          animation: expandBar 1s ease-out;
        }

        .adherence-bar-stats {
          display: flex;
          gap: 1rem;
          font-size: 0.875rem;
        }

        .stat-item {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-weight: 600;
        }

        .stat-taken {
          color: #10b981;
        }

        .stat-missed {
          color: #f59e0b;
        }

        /* Top Pacientes */
        .top-patients-section {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-radius: 24px;
          padding: 2rem;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.8);
          animation: fadeInUp 0.6s ease-out;
          animation-delay: 0.2s;
          animation-fill-mode: both;
        }

        .section-title-small {
          font-size: 1.25rem;
          font-weight: 700;
          color: #1f2937;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin: 0 0 1.5rem 0;
        }

        .section-icon-small {
          width: 24px;
          height: 24px;
          color: #667eea;
        }

        .top-patients-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
        }

        .top-patients-card {
          background: rgba(255, 255, 255, 0.7);
          border-radius: 16px;
          padding: 1.5rem;
          border: 2px solid;
        }

        .top-patients-success {
          border-color: #10b981;
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(16, 185, 129, 0.1) 100%);
        }

        .top-patients-warning {
          border-color: #f59e0b;
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.05) 0%, rgba(245, 158, 11, 0.1) 100%);
        }

        .top-patients-title {
          font-size: 1rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 1rem 0;
        }

        .top-patients-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .top-patient-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          background: rgba(255, 255, 255, 0.8);
          border-radius: 12px;
          transition: all 0.3s ease;
        }

        .top-patient-item:hover {
          transform: translateX(4px);
          background: rgba(255, 255, 255, 1);
        }

        .top-rank {
          font-weight: 800;
          color: #667eea;
          font-size: 0.875rem;
          min-width: 28px;
        }

        .top-patient-name {
          flex: 1;
          font-weight: 600;
          color: #1f2937;
          font-size: 0.9375rem;
        }

        .top-patient-percentage {
          font-weight: 700;
          color: #667eea;
          font-size: 0.9375rem;
        }

        .empty-text-small {
          font-size: 0.875rem;
          color: #6b7280;
          text-align: center;
          margin: 1rem 0;
        }

        /* Timeline de Próximas Dosis */
        .upcoming-doses-timeline-card {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-radius: 24px;
          padding: 2rem;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.8);
          animation: fadeInUp 0.6s ease-out;
          animation-delay: 0.3s;
          animation-fill-mode: both;
          overflow: hidden;
        }

        .timeline-container {
          max-height: 500px;
          overflow-y: auto;
          overflow-x: hidden;
        }

        .timeline-container::-webkit-scrollbar {
          width: 8px;
        }

        .timeline-container::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.05);
          border-radius: 10px;
        }

        .timeline-container::-webkit-scrollbar-thumb {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 10px;
        }

        .timeline-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .timeline-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.7);
          border-radius: 12px;
          border: 1px solid rgba(0, 0, 0, 0.05);
          transition: all 0.3s ease;
          position: relative;
          min-width: 0;
          overflow: hidden;
        }

        .timeline-item:hover {
          transform: translateX(4px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }

        .timeline-item-overdue {
          border-color: rgba(239, 68, 68, 0.3);
          background: linear-gradient(135deg, rgba(254, 242, 242, 0.7) 0%, rgba(255, 255, 255, 0.7) 100%);
        }

        .timeline-time {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 700;
          color: #667eea;
          font-size: 1rem;
          min-width: 80px;
          flex-shrink: 0;
        }

        .timeline-clock-icon {
          width: 20px;
          height: 20px;
          flex-shrink: 0;
        }

        .timeline-details {
          flex: 1;
          min-width: 0;
          overflow: hidden;
        }

        .timeline-patient {
          font-weight: 700;
          color: #1f2937;
          font-size: 0.9375rem;
          margin-bottom: 0.25rem;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }

        .timeline-medication {
          font-size: 0.875rem;
          color: #6b7280;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }

        .timeline-badge-overdue {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: #fff;
          padding: 0.375rem 0.75rem;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 700;
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          flex-shrink: 0;
          white-space: nowrap;
        }

        .timeline-more {
          text-align: center;
          padding: 1rem;
          font-size: 0.875rem;
          color: #6b7280;
          font-weight: 600;
        }

        .empty-state-mini {
          text-align: center;
          padding: 2rem;
          color: #6b7280;
        }

        .empty-icon-mini {
          font-size: 2rem;
          margin-bottom: 0.5rem;
          opacity: 0.5;
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

          .dashboard-layout {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }

          .stats-column {
            position: static;
          }

          .mini-stats-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
          }

          .doses-box {
            max-height: 400px;
          }

          .doses-box-header {
            padding: 1.25rem 1.5rem;
          }

          .doses-box-title {
            font-size: 1.25rem;
          }

          .doses-box-content {
            padding: 1rem;
          }

          .treatments-box-header {
            padding: 1.25rem 1.5rem;
          }

          .treatments-box-title {
            font-size: 1.25rem;
          }

          .treatments-box-content {
            padding: 1rem;
          }

          .treatments-grid {
            grid-template-columns: 1fr;
          }

          .date-badge {
            width: 100%;
            text-align: center;
          }

          /* Show Quick Navigation Menu on Mobile */
          .quick-nav-mobile {
            display: flex;
          }

          /* Vista General - Mobile Adjustments */
          .top-patients-grid {
            grid-template-columns: 1fr;
          }

          .overview-value {
            font-size: 2rem;
          }

          .overview-icon-wrapper {
            width: 40px;
            height: 40px;
          }

          .overview-icon {
            width: 20px;
            height: 20px;
          }

          .overview-title {
            font-size: 1rem;
          }

          .overview-subtitle {
            font-size: 0.8125rem;
          }

          .timeline-item {
            flex-direction: column;
            align-items: flex-start;
          }

          .timeline-time {
            min-width: auto;
          }
        }
      `}</style>
    </div>
  );
}
