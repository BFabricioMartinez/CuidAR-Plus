import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Select from 'react-select';
import { useAsistencialHistory } from '../../hooks/asistencial/useAsistencialHistory';

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
export default function HistorialView() {
  const navigate = useNavigate();
  const {
    patients,
    selectedPatientId,
    history,
    treatments,
    loading,
    error,
    loadingMore,
    nextCursor,
    hasMore,
    filterStatus,
    filterDate,
    filterDateFrom,
    filterDateTo,
    filterTreatment,
    setFilterStatus,
    setFilterDate,
    setFilterDateFrom,
    setFilterDateTo,
    setFilterTreatment,
    fetchMyPatients,
    clearFilters,
    formatDate,
    formatTime,
    fetchHistory,
  } = useAsistencialHistory();

  // Estados locales para filtros (con debounce)
  const [localFilters, setLocalFilters] = useState({
    status: filterStatus,
    treatment_id: filterTreatment,
    dateFrom: filterDateFrom,
    dateTo: filterDateTo,
  });

  // Ref para el timeout del debounce
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sincronizar estados locales con los del hook
  useEffect(() => {
    setLocalFilters({
      status: filterStatus,
      treatment_id: filterTreatment,
      dateFrom: filterDateFrom,
      dateTo: filterDateTo,
    });
  }, [filterStatus, filterTreatment, filterDateFrom, filterDateTo]);

  // Función para aplicar filtros con debounce
  const applyFilters = useCallback(() => {
    setFilterStatus(localFilters.status);
    setFilterTreatment(localFilters.treatment_id);
    setFilterDateFrom(localFilters.dateFrom);
    setFilterDateTo(localFilters.dateTo);
    setFilterDate(''); // Limpiar fecha única si se usa rango
  }, [localFilters, setFilterStatus, setFilterTreatment, setFilterDateFrom, setFilterDateTo, setFilterDate]);

  // Debounce para aplicar filtros
  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      applyFilters();
    }, 500); // 500ms de debounce

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [localFilters, applyFilters]);

  // Contar filtros activos
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (localFilters.status !== 'all') count++;
    if (localFilters.treatment_id !== 'all') count++;
    if (localFilters.dateFrom) count++;
    if (localFilters.dateTo) count++;
    return count;
  }, [localFilters]);

  // Preparar opciones para react-select (estado)
  const statusOptions = useMemo(() => {
    return [
      { value: 'all', label: 'Todos' },
      { value: 'TAKEN', label: 'Tomadas' },
      { value: 'MISSED', label: 'Omitidas' },
    ];
  }, []);

  // Preparar opciones para react-select (medicamentos)
  const treatmentOptions = useMemo(() => {
    return [
      { value: 'all', label: 'Todos los medicamentos' },
      ...treatments.map((treatment) => ({
        value: treatment.id.toString(),
        label: treatment.medication_name,
      })),
    ];
  }, [treatments]);

  // Limpiar filtros
  const handleClearFilters = () => {
    setLocalFilters({
      status: 'all',
      treatment_id: 'all',
      dateFrom: '',
      dateTo: '',
    });
    clearFilters();
  };

  useEffect(() => {
    fetchMyPatients();
  }, [fetchMyPatients]);

  // Redirigir al dashboard si "Todos" está seleccionado
  useEffect(() => {
    if (selectedPatientId === null) {
      navigate('/asistencial/dashboard');
    }
  }, [selectedPatientId, navigate]);

  // Scroll infinito dentro del cuadro de historial (como en MiHistorial)
  useEffect(() => {
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      const scrollHeight = target.scrollHeight;
      const scrollTop = target.scrollTop;
      const clientHeight = target.clientHeight;

      if (
        scrollHeight - scrollTop - clientHeight < 300 &&
        nextCursor &&
        !loadingMore &&
        hasMore
      ) {
        fetchHistory(nextCursor);
      }
    };

    const scrollContainer = document.querySelector('.history-box-content');
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
      return () => scrollContainer.removeEventListener('scroll', handleScroll);
    }
  }, [nextCursor, loadingMore, hasMore, fetchHistory]);

  const selectedPatientName =
    patients.find((p) => p.id === selectedPatientId)?.name || '';

  return (
    <div className="history-container">
      {/* Header with Gradient */}
      <div className="history-header">
        <div className="header-content-history">
          <div className="title-section">
            <h1 className="page-title">Historial de Tomas</h1>
            <p className="page-subtitle">Registro de medicación de tus pacientes</p>
            {selectedPatientName && (
              <p className="page-subtitle-secondary">
                Paciente seleccionado: <strong>{selectedPatientName}</strong>
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="history-content">
        {/* Estado cuando no hay paciente */}
        {!selectedPatientId && (
          <div className="empty-history">
            <div className="empty-icon">👥</div>
            <h3 className="empty-title">Seleccioná un paciente</h3>
            <p className="empty-text">
              Utilizá el selector de paciente en la barra superior para ver
              el historial de tomas de un paciente asignado.
            </p>
          </div>
        )}

        {selectedPatientId && (
          <>
            {/* Error */}
            {error && (
              <div className="alert alert-error">
                <svg className="alert-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Cuadro de historial */}
            <div className="history-box">
              <div className="history-box-header">
                <div className="history-box-header-top">
                  <h2 className="history-box-title">
                    <svg className="title-icon" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                    Historial de Tomas del Paciente
                  </h2>
                  {activeFiltersCount > 0 && (
                    <button onClick={handleClearFilters} className="btn-clear-filters-compact">
                      <svg className="btn-icon" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                      </svg>
                      Limpiar
                    </button>
                  )}
                </div>
              </div>

              {/* Filtros integrados */}
              <div className="filters-section">
                <div className="filters-grid">
                  <div className="filter-field">
                    <label className="filter-label">
                      <svg className="filter-label-icon" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Estado
                      {localFilters.status !== 'all' && <span className="filter-active-indicator" />}
                    </label>
                    <Select
                      value={statusOptions.find(opt => opt.value === localFilters.status) || statusOptions[0]}
                      onChange={(option) => setLocalFilters(prev => ({ ...prev, status: option?.value || 'all' }))}
                      options={statusOptions}
                      placeholder="Seleccionar estado..."
                      isSearchable={false}
                      isClearable={false}
                      className="react-select-container"
                      classNamePrefix="react-select"
                      menuPortalTarget={document.body}
                      menuPosition="fixed"
                      styles={{
                        control: (base) => ({
                          ...base,
                          border: '1.5px solid #e5e7eb',
                          borderRadius: '8px',
                          minHeight: '40px',
                          boxShadow: 'none',
                          background: '#fff',
                          '&:hover': {
                            border: '1.5px solid #cbd5e1',
                          },
                        }),
                        controlFocused: (base) => ({
                          ...base,
                          border: '1.5px solid #667eea',
                          boxShadow: '0 0 0 3px rgba(102, 126, 234, 0.1)',
                        }),
                        menuPortal: (base) => ({
                          ...base,
                          zIndex: 9999,
                        }),
                      }}
                    />
                  </div>

                  <div className="filter-field">
                    <label className="filter-label">
                      <svg className="filter-label-icon" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
                      </svg>
                      Medicamento
                      {localFilters.treatment_id !== 'all' && <span className="filter-active-indicator" />}
                    </label>
                    <Select
                      value={treatmentOptions.find(opt => opt.value === localFilters.treatment_id) || treatmentOptions[0]}
                      onChange={(option) => setLocalFilters(prev => ({ ...prev, treatment_id: option?.value || 'all' }))}
                      options={treatmentOptions}
                      placeholder="Seleccionar medicamento..."
                      isSearchable
                      isClearable
                      className="react-select-container"
                      classNamePrefix="react-select"
                      noOptionsMessage={() => 'No se encontraron medicamentos'}
                      menuPortalTarget={document.body}
                      menuPosition="fixed"
                      styles={{
                        control: (base) => ({
                          ...base,
                          border: '1.5px solid #e5e7eb',
                          borderRadius: '8px',
                          minHeight: '40px',
                          boxShadow: 'none',
                          background: '#fff',
                          '&:hover': {
                            border: '1.5px solid #cbd5e1',
                          },
                        }),
                        controlFocused: (base) => ({
                          ...base,
                          border: '1.5px solid #667eea',
                          boxShadow: '0 0 0 3px rgba(102, 126, 234, 0.1)',
                        }),
                        menuPortal: (base) => ({
                          ...base,
                          zIndex: 9999,
                        }),
                      }}
                    />
                  </div>

                  <div className="filter-field filter-field-date-range">
                    <label className="filter-label">
                      <svg className="filter-label-icon" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                      </svg>
                      Rango de Fechas
                      {(localFilters.dateFrom || localFilters.dateTo) && <span className="filter-active-indicator" />}
                    </label>
                    <div className="date-range-inputs">
                      <div className="date-input-wrapper">
                        <label className="date-input-label">Desde</label>
                        <input
                          type="date"
                          value={localFilters.dateFrom}
                          onChange={(e) => setLocalFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                          className="filter-input filter-input-date"
                          max={localFilters.dateTo || undefined}
                        />
                      </div>
                      <div className="date-input-wrapper">
                        <label className="date-input-label">Hasta</label>
                        <input
                          type="date"
                          value={localFilters.dateTo}
                          onChange={(e) => setLocalFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                          className="filter-input filter-input-date"
                          min={localFilters.dateFrom || undefined}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="history-box-content">
                {loading ? (
                  <div className="loading-state">
                    <div className="loading-spinner">
                      <div className="spinner-ring"></div>
                      <div className="spinner-ring"></div>
                      <div className="spinner-ring"></div>
                    </div>
                    <p className="loading-text">Cargando historial...</p>
                  </div>
                ) : history.length === 0 ? (
                  <div className="empty-history">
                    <div className="empty-icon">📋</div>
                    <h3 className="empty-title">Sin registros</h3>
                    <p className="empty-text">
                      {activeFiltersCount > 0
                        ? 'No hay registros que coincidan con los filtros aplicados'
                        : 'Todavía no hay tomas registradas para este paciente'}
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Desktop Table */}
                    <div className="table-wrapper">
                      <table className="history-table">
                        <thead>
                          <tr className="table-header">
                            <th className="table-th">Fecha</th>
                            <th className="table-th">Hora Programada</th>
                            <th className="table-th">Hora Registrada</th>
                            <th className="table-th">Medicamento</th>
                            <th className="table-th">Dosis</th>
                            <th className="table-th">Estado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {history.map((item, index) => (
                            <tr
                              key={item.id}
                              className="table-row"
                              style={{ animationDelay: `${index * 0.05}s` }}
                            >
                              <td className="table-td td-date">{formatDate(item.taken_at)}</td>
                              <td className="table-td td-time">
                                {item.scheduled_time && item.scheduled_time !== 'N/A' 
                                  ? `${item.scheduled_time} hs` 
                                  : item.scheduled_time || 'N/A'}
                              </td>
                              <td className="table-td td-time">{formatTime(item.taken_at)}</td>
                              <td className="table-td td-med">{item.medication_name}</td>
                              <td className="table-td td-dosage">{item.dosage}</td>
                              <td className="table-td">
                                <span className={`status-badge ${item.status === 'TAKEN' ? 'badge-taken' : 'badge-missed'}`}>
                                  {item.status === 'TAKEN' ? (
                                    <>
                                      <svg className="badge-icon" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                      </svg>
                                      Tomada
                                    </>
                                  ) : (
                                    <>
                                      <svg className="badge-icon" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                      </svg>
                                      Omitida
                                    </>
                                  )}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="cards-container">
                      {history.map((item, index) => (
                        <div key={item.id} className="history-card" style={{ animationDelay: `${index * 0.1}s` }}>
                          <div className="card-header">
                            <span className="card-date">{formatDate(item.taken_at)}</span>
                            <span className={`status-badge ${item.status === 'TAKEN' ? 'badge-taken' : 'badge-missed'}`}>
                              {item.status === 'TAKEN' ? (
                                <>
                                  <svg className="badge-icon" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                  Tomada
                                </>
                              ) : (
                                <>
                                  <svg className="badge-icon" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                  </svg>
                                  Omitida
                                </>
                              )}
                            </span>
                          </div>

                          <div className="card-body">
                            <div className="card-row">
                              <span className="card-label">Medicamento:</span>
                              <span className="card-value">{item.medication_name}</span>
                            </div>
                            <div className="card-row">
                              <span className="card-label">Dosis:</span>
                              <span className="card-value">{item.dosage}</span>
                            </div>
                            <div className="card-row">
                              <span className="card-label">Hora programada:</span>
                              <span className="card-value">
                                {item.scheduled_time && item.scheduled_time !== 'N/A' 
                                  ? `${item.scheduled_time} hs` 
                                  : item.scheduled_time || 'N/A'}
                              </span>
                            </div>
                            <div className="card-row">
                              <span className="card-label">Hora registrada:</span>
                              <span className="card-value">{formatTime(item.taken_at)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Indicador de carga de más registros */}
                    {loadingMore && (
                      <div className="loading-more">
                        <div className="loading-spinner-small">
                          <div className="spinner-ring-small"></div>
                          <div className="spinner-ring-small"></div>
                          <div className="spinner-ring-small"></div>
                        </div>
                        <p className="loading-more-text">Cargando más registros...</p>
                      </div>
                    )}

                    {/* Mensaje cuando no hay más registros */}
                    {!loading && !loadingMore && !hasMore && history.length > 0 && (
                      <div className="end-of-list">
                        <svg className="end-icon" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <p className="end-text">Has llegado al final del historial</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <style>{`
        .history-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #f5f7fa 0%, #e9ecef 100%);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          padding-bottom: 4rem;
        }

        .history-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 3rem 2rem;
          position: relative;
          overflow: hidden;
        }

        .history-header::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: url('data:image/svg+xml,<svg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><circle cx="30" cy="30" r="1.5" fill="rgba(255,255,255,0.1)"/></svg>');
          opacity: 0.5;
        }

        .header-content-history {
          max-width: 1400px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }

        .title-section {
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

        .page-title {
          font-size: 2.5rem;
          font-weight: 800;
          color: #fff;
          margin: 0 0 0.5rem 0;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }

        .page-subtitle {
          font-size: 1.125rem;
          color: rgba(255, 255, 255, 0.9);
          margin: 0;
          font-weight: 500;
        }

        .page-subtitle-secondary {
          margin-top: 0.5rem;
          font-size: 0.95rem;
          color: rgba(255, 255, 255, 0.9);
        }

        .history-content {
          max-width: 1400px;
          margin: -2rem auto 0;
          padding: 0 2rem;
          position: relative;
          z-index: 5;
        }

        .filters-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
          align-items: start;
        }

        .filter-field {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
        }

        .filter-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.75rem;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          position: relative;
        }

        .filter-label-icon {
          width: 16px;
          height: 16px;
          color: #667eea;
        }

        .filter-active-indicator {
          width: 8px;
          height: 8px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 50%;
          margin-left: 0.25rem;
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }

        .filter-select,
        .filter-input {
          padding: 0.5rem 0.875rem;
          font-size: 0.9375rem;
          border: 1.5px solid #e5e7eb;
          border-radius: 8px;
          outline: none;
          transition: all 0.3s ease;
          background: #fff;
          font-family: inherit;
          min-height: 40px;
          box-sizing: border-box;
          color: #1f2937;
        }

        .filter-select:hover {
          border-color: #cbd5e1;
        }

        .filter-select:focus,
        .filter-input:focus {
          border-color: #667eea;
          background-color: #fff;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .filter-field-date-range {
          grid-column: 1 / -1;
        }

        .date-range-inputs {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          margin-top: 0;
        }

        .date-input-wrapper {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .date-input-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .filter-input-date {
          width: 100%;
          min-height: 40px;
        }

        /* React Select Styles */
        .react-select-container {
          width: 100%;
        }

        .react-select__control {
          border: 1.5px solid #e5e7eb !important;
          border-radius: 8px !important;
          min-height: 40px !important;
          background: #fff !important;
          transition: all 0.3s ease !important;
        }

        .react-select__control:hover {
          border-color: #cbd5e1 !important;
        }

        .react-select__control--is-focused {
          border-color: #667eea !important;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1) !important;
          background: #fff !important;
        }

        .react-select__value-container {
          padding: 0.5rem 0.875rem !important;
        }

        .react-select__input-container {
          margin: 0 !important;
          padding: 0 !important;
        }

        .react-select__input {
          font-size: 0.9375rem !important;
          color: #1f2937 !important;
        }

        .react-select__single-value {
          color: #1f2937 !important;
          font-size: 0.9375rem !important;
        }

        .react-select__placeholder {
          color: #9ca3af !important;
          font-size: 0.9375rem !important;
        }

        .react-select__indicator-separator {
          background-color: #e5e7eb !important;
        }

        .react-select__dropdown-indicator {
          color: #667eea !important;
        }

        .react-select__dropdown-indicator:hover {
          color: #764ba2 !important;
        }

        .react-select__clear-indicator {
          color: #9ca3af !important;
        }

        .react-select__clear-indicator:hover {
          color: #dc2626 !important;
        }

        .react-select__menu {
          border-radius: 10px !important;
          border: 2px solid #e5e7eb !important;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1) !important;
          margin-top: 4px !important;
          z-index: 9999 !important;
        }

        .react-select__menu-portal {
          z-index: 9999 !important;
        }

        .react-select__menu-list {
          padding: 0.5rem !important;
        }

        .react-select__option {
          border-radius: 8px !important;
          padding: 0.75rem 1rem !important;
          font-size: 0.9375rem !important;
          cursor: pointer !important;
          transition: all 0.2s ease !important;
        }

        .react-select__option:hover {
          background: rgba(102, 126, 234, 0.1) !important;
        }

        .react-select__option--is-selected {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
          color: #fff !important;
        }

        .react-select__option--is-focused {
          background: rgba(102, 126, 234, 0.1) !important;
        }

        .react-select__option--is-focused.react-select__option--is-selected {
          background: linear-gradient(135deg, #764ba2 0%, #667eea 100%) !important;
        }

        .alert {
          padding: 1rem 1.25rem;
          border-radius: 14px;
          margin-bottom: 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-weight: 500;
          animation: slideDown 0.3s ease-out;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .alert-error {
          background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
          color: #dc2626;
          border: 1px solid #fca5a5;
        }

        .alert-icon {
          width: 22px;
          height: 22px;
          flex-shrink: 0;
        }

        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem 1.5rem;
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
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .loading-text {
          font-size: 1.125rem;
          color: #6b7280;
          font-weight: 500;
        }

        .empty-history {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(10px);
          border-radius: 24px;
          padding: 3rem 1.5rem;
          margin: 1.5rem 0;
          text-align: center;
          border: 2px dashed #e5e7eb;
        }

        .empty-icon {
          font-size: 5rem;
          margin-bottom: 1.5rem;
          opacity: 0.5;
          animation: float 3s ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }

        .empty-title {
          font-size: 1.75rem;
          font-weight: 700;
          color: #4b5563;
          margin: 0 0 0.75rem 0;
        }

        .empty-text {
          font-size: 1rem;
          color: #6b7280;
          margin: 0;
          line-height: 1.6;
        }

        /* Loading more / fin de lista (paginación) */
        .loading-more {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem 1.5rem;
          gap: 1.5rem;
        }

        .loading-spinner-small {
          position: relative;
          width: 50px;
          height: 50px;
        }

        .spinner-ring-small {
          position: absolute;
          width: 100%;
          height: 100%;
          border: 3px solid transparent;
          border-top-color: #667eea;
          border-radius: 50%;
          animation: spin 1.5s cubic-bezier(0.5, 0, 0.5, 1) infinite;
        }

        .spinner-ring-small:nth-child(1) {
          animation-delay: -0.45s;
        }

        .spinner-ring-small:nth-child(2) {
          animation-delay: -0.3s;
        }

        .spinner-ring-small:nth-child(3) {
          animation-delay: -0.15s;
        }

        .loading-more-text {
          font-size: 1rem;
          color: #6b7280;
          font-weight: 500;
          margin: 0;
        }

        .end-of-list {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          padding: 2rem 1.5rem;
          margin: 1.5rem;
          background: rgba(102, 126, 234, 0.05);
          border-radius: 16px;
          border: 1px solid rgba(102, 126, 234, 0.1);
        }

        .end-icon {
          width: 24px;
          height: 24px;
          color: #667eea;
          flex-shrink: 0;
        }

        .end-text {
          font-size: 1rem;
          color: #6b7280;
          font-weight: 600;
          margin: 0;
        }

        .history-box {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-radius: 24px;
          border: 1px solid rgba(255, 255, 255, 0.8);
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          max-height: calc(100vh - 180px);
          animation: fadeInUp 0.6s ease-out 0.6s both;
        }

        .history-box-header {
          padding: 1.5rem 2rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .history-box-header-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
        }

        .btn-clear-filters-compact {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: rgba(255, 255, 255, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.3);
          color: #fff;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          font-family: inherit;
        }

        .btn-clear-filters-compact:hover {
          background: rgba(255, 255, 255, 0.3);
          border-color: rgba(255, 255, 255, 0.5);
        }

        .filters-section {
          padding: 1.25rem 2rem;
          background: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
          position: relative;
          z-index: 100;
        }

        .history-box-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #fff;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin: 0;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }

        .title-icon {
          width: 26px;
          height: 26px;
          flex-shrink: 0;
        }

        .history-box-content {
          flex: 1;
          overflow-y: auto;
          padding: 0;
        }

        .history-box-content::-webkit-scrollbar {
          width: 8px;
        }

        .history-box-content::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.05);
          border-radius: 10px;
        }

        .history-box-content::-webkit-scrollbar-thumb {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 10px;
        }

        .history-box-content::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
        }

        .table-wrapper {
          border-radius: 12px;
          overflow: visible;
        }

        .history-table {
          width: 100%;
          border-collapse: collapse;
        }

        .table-header {
          background: #f9fafb;
        }

        .table-th {
          padding: 1.25rem 1.5rem;
          text-align: left;
          font-size: 0.875rem;
          font-weight: 700;
          color: #374151;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 2px solid #e5e7eb;
          position: sticky;
          top: 0;
          background: #f9fafb;
          z-index: 10;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        .table-th:first-child {
          border-top-left-radius: 12px;
        }

        .table-th:last-child {
          border-top-right-radius: 12px;
        }

        .table-row {
          border-bottom: 1px solid #f3f4f6;
          transition: all 0.2s ease;
          animation: fadeIn 0.3s ease-out both;
        }

        .table-row:hover {
          background: rgba(102, 126, 234, 0.05);
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
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

        .table-td {
          padding: 1.25rem 1.5rem;
          font-size: 0.9375rem;
          color: #1f2937;
        }

        .td-date {
          font-weight: 600;
        }

        .td-time {
          font-weight: 500;
          color: #4b5563;
        }

        .td-med {
          font-weight: 700;
          color: #667eea;
        }

        .td-dosage {
          color: #6b7280;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border-radius: 50px;
          font-size: 0.875rem;
          font-weight: 700;
        }

        .badge-taken {
          background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
          color: #065f46;
          border: 1px solid #6ee7b7;
        }

        .badge-missed {
          background: linear-gradient(135deg, #fed7aa 0%, #fdba74 100%);
          color: #92400e;
          border: 1px solid #fb923c;
        }

        .badge-icon {
          width: 18px;
          height: 18px;
        }

        .cards-container {
          display: none;
          flex-direction: column;
          gap: 1.25rem;
          padding: 1.5rem;
        }

        .history-card {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.8);
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
          animation: fadeInUp 0.4s ease-out both;
        }

        .card-header {
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
          padding: 1.25rem 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #f3f4f6;
        }

        .card-date {
          font-size: 0.9375rem;
          font-weight: 700;
          color: #1f2937;
        }

        .card-body {
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .card-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .card-label {
          font-size: 0.875rem;
          color: #6b7280;
          font-weight: 500;
        }

        .card-value {
          font-size: 0.9375rem;
          font-weight: 600;
          color: #1f2937;
        }

        @media (max-width: 1024px) {
          .table-wrapper {
            display: none;
          }

          .cards-container {
            display: flex;
            animation: fadeInUp 0.6s ease-out 0.6s both;
          }
        }

        @media (max-width: 1024px) {
          .filters-grid {
            grid-template-columns: 1fr;
          }

          .filter-field-date-range {
            grid-column: span 1;
          }

          .date-range-inputs {
            grid-template-columns: 1fr;
          }

          .filters-section {
            padding: 1rem 1.5rem;
          }
        }

        @media (max-width: 768px) {
          .history-header {
            padding: 2rem 1.5rem;
          }

          .page-title {
            font-size: 2rem;
          }

          .history-content {
            padding: 0 1.5rem;
          }

          .history-box {
            max-height: calc(100vh - 60px);
            border-radius: 20px;
          }

          .history-box-header {
            padding: 0.75rem 1.25rem;
          }

          .history-box-title {
            font-size: 1rem;
          }

          .filters-section {
            padding: 0.5rem 1.25rem;
          }

          .filters-grid {
            grid-template-columns: 1fr;
            gap: 0.5rem;
          }

          .filter-field {
            gap: 0.25rem;
          }

          .filter-label {
            font-size: 0.625rem;
            margin-bottom: 0.125rem;
          }

          .filter-select,
          .filter-input {
            padding: 0.375rem 0.625rem;
            font-size: 0.8125rem;
            min-height: 32px;
          }

          .filter-field-date-range {
            grid-column: span 1;
          }

          .date-range-inputs {
            grid-template-columns: 1fr;
            gap: 0.5rem;
          }

          .date-input-label {
            font-size: 0.625rem;
          }

          .filter-input-date {
            min-height: 32px;
            padding: 0.375rem 0.625rem;
            font-size: 0.8125rem;
          }

          .react-select__control {
            min-height: 32px !important;
          }

          .react-select__value-container {
            padding: 0.375rem 0.625rem !important;
          }

          .react-select__single-value {
            font-size: 0.8125rem !important;
          }

          .history-box-header-top {
            flex-direction: row;
            align-items: center;
            gap: 0.75rem;
          }

          .btn-clear-filters-compact {
            padding: 0.375rem 0.75rem;
            font-size: 0.8125rem;
          }

          .cards-container {
            padding: 1rem 1.25rem;
            gap: 1rem;
          }

          .history-card {
            border-radius: 12px;
          }

          .card-header {
            padding: 1rem 1.25rem;
          }

          .card-date {
            font-size: 0.9375rem;
          }

          .card-body {
            padding: 1.25rem 1.25rem;
            gap: 1rem;
          }

          .card-label {
            font-size: 0.875rem;
          }

          .card-value {
            font-size: 0.9375rem;
            font-weight: 700;
          }

          .status-badge {
            font-size: 0.8125rem;
            padding: 0.5rem 1rem;
          }
        }
      `}</style>
    </div>
  );
}
