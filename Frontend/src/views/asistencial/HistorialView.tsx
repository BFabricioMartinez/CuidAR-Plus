import { useEffect } from 'react';
import { useAsistencialHistory } from '../../hooks/asistencial/useAsistencialHistory';

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
export default function HistorialView() {
  // Usar el hook personalizado
  const {
    patients,
    selectedPatientId,
    history,
    treatments,
    loading,
    error,
    stats,
    filterStatus,
    filterDate,
    filterTreatment,
    setFilterStatus,
    setFilterDate,
    setFilterTreatment,
    fetchMyPatients,
    selectPatient,
    clearFilters,
    formatDate,
    formatTime,
  } = useAsistencialHistory();

  // Cargar pacientes al montar el componente
  useEffect(() => {
    fetchMyPatients();
  }, [fetchMyPatients]);

  // Nombre del paciente seleccionado
  const selectedPatientName =
    patients.find((p) => p.id === selectedPatientId)?.name || '';

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Historial de Tomas</h1>
          <p style={styles.subtitle}>Registro de medicación de tus pacientes</p>
        </div>
      </div>

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

      {selectedPatientId && (
        <>
          {/* Estadísticas */}
          <div style={styles.statsContainer}>
            <div style={styles.statCard}>
              <div style={styles.statValue}>{stats.total}</div>
              <div style={styles.statLabel}>Total Registros</div>
            </div>
            <div style={styles.statCard}>
              <div style={{ ...styles.statValue, color: '#10b981' }}>{stats.taken}</div>
              <div style={styles.statLabel}>Tomadas</div>
            </div>
            <div style={styles.statCard}>
              <div style={{ ...styles.statValue, color: '#f59e0b' }}>{stats.missed}</div>
              <div style={styles.statLabel}>Omitidas</div>
            </div>
          </div>

          {/* Filtros */}
          <div style={styles.filtersCard}>
            <h3 style={styles.filtersTitle}>🔍 Filtros</h3>

            <div style={styles.filtersGrid}>
              {/* Filtro por estado */}
              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>Estado</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  style={styles.filterSelect}
                >
                  <option value="all">Todos</option>
                  <option value="TAKEN">Tomadas</option>
                  <option value="MISSED">Omitidas</option>
                </select>
              </div>

              {/* Filtro por fecha */}
              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>Fecha</label>
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  style={styles.filterInput}
                />
              </div>

              {/* Filtro por tratamiento */}
              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>Medicamento</label>
                <select
                  value={filterTreatment}
                  onChange={(e) => setFilterTreatment(e.target.value)}
                  style={styles.filterSelect}
                >
                  <option value="all">Todos</option>
                  {treatments.map((treatment) => (
                    <option key={treatment.id} value={treatment.id}>
                      {treatment.medication_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Botón limpiar */}
              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>&nbsp;</label>
                <button onClick={clearFilters} style={styles.btnClear}>
                  Limpiar Filtros
                </button>
              </div>
            </div>
          </div>

          {/* Error */}
          {error && <div style={styles.errorAlert}>⚠️ {error}</div>}

          {/* Lista de historial */}
          {loading ? (
            <div style={styles.loading}>Cargando historial...</div>
          ) : history.length === 0 ? (
            <div style={styles.emptyState}>
              <p>📋 No hay registros para {selectedPatientName}</p>
              <p style={styles.emptyHint}>
                {filterStatus !== 'all' || filterDate || filterTreatment !== 'all'
                  ? 'Probá cambiando los filtros'
                  : 'Todavía no hay tomas registradas'}
              </p>
            </div>
          ) : (
            <div style={styles.historyList}>
              {/* Tabla Desktop */}
              <div style={styles.tableContainer}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tableHeader}>
                      <th style={styles.th}>Fecha</th>
                      <th style={styles.th}>Hora Registrada</th>
                      <th style={styles.th}>Medicamento</th>
                      <th style={styles.th}>Dosis</th>
                      <th style={styles.th}>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((item) => (
                      <tr key={item.id} style={styles.tableRow}>
                        <td style={styles.td}>{formatDate(item.taken_at)}</td>
                        <td style={styles.td}>{formatTime(item.taken_at)}</td>
                        <td style={styles.td}>{item.medication_name}</td>
                        <td style={styles.td}>{item.dosage}</td>
                        <td style={styles.td}>
                          <span
                            style={{
                              ...styles.badge,
                              backgroundColor:
                                item.status === 'TAKEN' ? '#d1fae5' : '#fed7aa',
                              color:
                                item.status === 'TAKEN' ? '#065f46' : '#92400e',
                            }}
                          >
                            {item.status === 'TAKEN' ? '✓ Tomada' : '✗ Omitida'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Cards Mobile */}
              <div style={styles.cardsContainer}>
                {history.map((item) => (
                  <div key={item.id} style={styles.historyCard}>
                    <div style={styles.cardHeader}>
                      <span style={styles.cardDate}>{formatDate(item.taken_at)}</span>
                      <span
                        style={{
                          ...styles.badge,
                          backgroundColor:
                            item.status === 'TAKEN' ? '#d1fae5' : '#fed7aa',
                          color: item.status === 'TAKEN' ? '#065f46' : '#92400e',
                        }}
                      >
                        {item.status === 'TAKEN' ? '✓ Tomada' : '✗ Omitida'}
                      </span>
                    </div>

                    <div style={styles.cardBody}>
                      <div style={styles.cardRow}>
                        <span style={styles.cardLabel}>Medicamento:</span>
                        <span style={styles.cardValue}>{item.medication_name}</span>
                      </div>
                      <div style={styles.cardRow}>
                        <span style={styles.cardLabel}>Dosis:</span>
                        <span style={styles.cardValue}>{item.dosage}</span>
                      </div>
                      <div style={styles.cardRow}>
                        <span style={styles.cardLabel}>Hora registrada:</span>
                        <span style={styles.cardValue}>
                          {formatTime(item.taken_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
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
  statsContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '15px',
    marginBottom: '30px',
  },
  statCard: {
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '10px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    textAlign: 'center',
  },
  statValue: {
    fontSize: '32px',
    fontWeight: 700,
    color: '#667eea',
    marginBottom: '8px',
  },
  statLabel: {
    fontSize: '14px',
    color: '#6b7280',
  },
  filtersCard: {
    backgroundColor: '#fff',
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    marginBottom: '30px',
  },
  filtersTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#1f2937',
    marginBottom: '20px',
  },
  filtersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '15px',
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  filterLabel: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
  },
  filterSelect: {
    padding: '10px',
    fontSize: '14px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    outline: 'none',
    cursor: 'pointer',
  },
  filterInput: {
    padding: '10px',
    fontSize: '14px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    outline: 'none',
  },
  btnClear: {
    padding: '10px',
    fontSize: '14px',
    fontWeight: 600,
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    backgroundColor: '#fff',
    color: '#6b7280',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
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
  emptyState: {
    backgroundColor: '#f9fafb',
    padding: '60px 40px',
    borderRadius: '12px',
    textAlign: 'center',
    color: '#6b7280',
  },
  emptyHint: {
    fontSize: '14px',
    marginTop: '8px',
  },
  historyList: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    overflow: 'hidden',
  },
  tableContainer: {
    overflowX: 'auto',
    display: 'block',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
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
  badge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 600,
    display: 'inline-block',
  },
  cardsContainer: {
    display: 'none',
    flexDirection: 'column',
    gap: '12px',
    padding: '15px',
  },
  historyCard: {
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    overflow: 'hidden',
  },
  cardHeader: {
    backgroundColor: '#f9fafb',
    padding: '12px 15px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #e5e7eb',
  },
  cardDate: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#1f2937',
  },
  cardBody: {
    padding: '15px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  cardRow: {
    display: 'flex',
    justifyContent: 'space-between',
  },
  cardLabel: {
    fontSize: '13px',
    color: '#6b7280',
  },
  cardValue: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#1f2937',
  },
};

// Media query para mobile
const mediaQuery = window.matchMedia('(max-width: 768px)');
if (mediaQuery.matches) {
  styles.tableContainer = { display: 'none' };
  styles.cardsContainer = { ...styles.cardsContainer, display: 'flex' };
}
