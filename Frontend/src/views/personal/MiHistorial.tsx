import { useState, useEffect, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type FilterFn,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table';
import { authApi, patientsApi, treatmentsApi, intakesApi } from '../../api';

// ============================================
// TIPOS
// ============================================
interface IntakeLog {
  id: number;
  treatment_id: number;
  taken_at: string;
  scheduled_time: string;
  status: 'TAKEN' | 'MISSED';
  acknowledged: boolean;
}

interface Treatment {
  id: number;
  medication_name: string;
  dosage: string;
}

interface HistoryItem extends IntakeLog {
  medication_name?: string;
  dosage?: string;
}

// ============================================
// FILTROS PERSONALIZADOS
// ============================================
const statusFilterFn: FilterFn<HistoryItem> = (row, columnId, filterValue) => {
  if (filterValue === 'all') return true;
  return row.getValue(columnId) === filterValue;
};

const treatmentFilterFn: FilterFn<HistoryItem> = (row, columnId, filterValue) => {
  if (filterValue === 'all') return true;
  return row.getValue(columnId) === parseInt(filterValue);
};

const dateFilterFn: FilterFn<HistoryItem> = (row, columnId, filterValue) => {
  if (!filterValue) return true;
  const takenAt = row.getValue(columnId) as string;
  if (!takenAt) return false;
  const intakeDateStr = takenAt.split('T')[0];
  return intakeDateStr === filterValue;
};

// ============================================
// COMPONENTE
// ============================================
export default function MiHistorial() {
  const [data, setData] = useState<HistoryItem[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [patientId, setPatientId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  // Paginación
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(true);

  // TanStack Table States
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  // Definición de columnas para TanStack Table
  const columns = useMemo<ColumnDef<HistoryItem>[]>(
    () => [
      {
        accessorKey: 'taken_at',
        id: 'taken_at',
        header: 'Fecha',
        cell: ({ getValue }) => formatDate(getValue() as string),
        filterFn: dateFilterFn,
      },
      {
        accessorKey: 'scheduled_time',
        id: 'scheduled_time',
        header: 'Hora Programada',
        enableSorting: false,
      },
      {
        accessorKey: 'taken_at',
        id: 'taken_time',
        header: 'Hora Registrada',
        cell: ({ getValue }) => formatTime(getValue() as string),
        enableSorting: false,
      },
      {
        accessorKey: 'medication_name',
        header: 'Medicamento',
        cell: ({ getValue }) => getValue() || 'Desconocido',
      },
      {
        accessorKey: 'dosage',
        header: 'Dosis',
        cell: ({ getValue }) => getValue() || '',
      },
      {
        accessorKey: 'status',
        header: 'Estado',
        cell: ({ getValue }) => {
          const status = getValue() as string;
          return (
            <span className={`status-badge ${status === 'TAKEN' ? 'badge-taken' : 'badge-missed'}`}>
              {status === 'TAKEN' ? (
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
          );
        },
        filterFn: statusFilterFn,
      },
      {
        accessorKey: 'treatment_id',
        header: 'Treatment ID',
        filterFn: treatmentFilterFn,
        enableSorting: false,
        // Columna oculta, solo para filtrado
      },
    ],
    []
  );

  // Configuración de TanStack Table
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true, // Paginación manual desde el backend
  });

  // Cargar datos al montar
  useEffect(() => {
    loadPatientAndData();
  }, []);

  // Cargar paciente del usuario y luego los datos
  const loadPatientAndData = async () => {
    try {
      const currentUser = authApi.getStoredUser();
      if (!currentUser) {
        setError('No se encontró información del usuario');
        return;
      }

      // Obtener el paciente donde caregiver_id coincide con el usuario actual
      const patientsResponse = await patientsApi.list({
        limit: 1,
        filters: {
          caregiver_id: currentUser.id,
          active: true
        },
      });

      if (patientsResponse.items.length > 0) {
        const myPatient = patientsResponse.items[0];
        setPatientId(myPatient.id);
        await fetchTreatments(myPatient.id);
        await fetchHistory(null, myPatient.id);
      } else {
        setError('No se encontró un paciente asociado a tu cuenta');
        setTreatments([]);
        setData([]);
      }
    } catch (err: any) {
      console.error('Error al cargar datos del paciente:', err);
      setError(err.message || 'Error al cargar datos del paciente');
    }
  };

  // Recargar cuando cambien los filtros (resetear lista)
  useEffect(() => {
    if (treatments.length > 0 && patientId !== null) {
      setData([]);
      setNextCursor(null);
      setHasMore(true);
      fetchHistory(null, patientId);
    }
  }, [columnFilters, patientId]);

  // Obtener tratamientos (para el filtro) - solo del paciente del usuario
  const fetchTreatments = async (patientId: number) => {
    try {
      const treatmentsData = await treatmentsApi.getByPatient(patientId);
      setTreatments(treatmentsData.treatments || []);
    } catch (err: any) {
      console.error('Error al cargar tratamientos:', err);
      setTreatments([]);
    }
  };

  // Obtener historial de tomas con paginación - solo del paciente del usuario
  const fetchHistory = async (cursor: number | null = null, patientIdParam?: number) => {
    const targetPatientId = patientIdParam || patientId;
    if (!targetPatientId) return;
    if (!hasMore && cursor !== null) return;

    const isInitialLoad = cursor === null;

    if (isInitialLoad) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    setError('');

    try {
      // Preparar filtros para el backend
      const filters: any = {
        patient_id: targetPatientId, // Filtrar por el paciente del usuario
      };

      // Extraer filtros de TanStack Table
      const statusFilter = columnFilters.find(f => f.id === 'status');
      const treatmentFilter = columnFilters.find(f => f.id === 'treatment_id');

      if (statusFilter && statusFilter.value !== 'all') {
        filters.status = statusFilter.value;
      }

      if (treatmentFilter && treatmentFilter.value !== 'all') {
        filters.treatment_id = parseInt(treatmentFilter.value as string);
      }

      filters.order = 'desc';

      const response = await intakesApi.list({
        limit: 20,
        last_seen_id: cursor,
        filters,
      });

      let intakes = response.items || [];

      // Enriquecer con datos del tratamiento
      const enrichedData = intakes.map((intake: any) => {
        // scheduled_time: hora programada de la dosis (debe venir del backend como scheduled_time)
        // El backend debería guardar este valor cuando se marca la dosis (parámetro 'time')
        // taken_at: hora en que el usuario registró la toma (puede ser diferente a scheduled_time)
        const scheduledTime = intake.scheduled_time || 'N/A';

        return {
          id: intake.id,
          treatment_id: intake.treatment_id,
          taken_at: intake.taken_at, // Hora registrada (cuando el usuario marcó la dosis)
          scheduled_time: scheduledTime, // Hora programada (cuando debería tomarse la dosis)
          status: intake.status,
          acknowledged: false,
          medication_name: intake.treatment?.medication_name || 'Desconocido',
          dosage: intake.treatment?.dosage || '',
        };
      });

      // Actualizar datos
      if (isInitialLoad) {
        setData(enrichedData);
      } else {
        setData((prev) => [...prev, ...enrichedData]);
      }

      // Actualizar cursor y estado de hasMore
      setNextCursor(response.next_cursor);
      setHasMore(response.next_cursor !== null);
    } catch (err: any) {
      setError(err.message || 'Error al cargar historial');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Formatear fecha
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Formatear hora
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Limpiar filtros
  const clearFilters = () => {
    setColumnFilters([]);
  };

  // Obtener valores de filtros actuales
  const getFilterValue = (columnId: string): string => {
    const filter = columnFilters.find(f => f.id === columnId);
    return (filter?.value as string) || (columnId === 'taken_at' ? '' : 'all');
  };

  // Establecer filtro
  const setFilter = (columnId: string, value: string) => {
    setColumnFilters((prev) => {
      const otherFilters = prev.filter(f => f.id !== columnId);
      if (value === 'all' || value === '') {
        return otherFilters;
      }
      return [...otherFilters, { id: columnId, value }];
    });
  };

  // Detectar scroll para cargar más automáticamente (dentro del contenedor)
  useEffect(() => {
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      const scrollHeight = target.scrollHeight;
      const scrollTop = target.scrollTop;
      const clientHeight = target.clientHeight;

      if (scrollHeight - scrollTop - clientHeight < 300 && nextCursor && !loadingMore && hasMore && patientId !== null) {
        fetchHistory(nextCursor, patientId);
      }
    };

    const scrollContainer = document.querySelector('.history-box-content');
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
      return () => scrollContainer.removeEventListener('scroll', handleScroll);
    }
  }, [nextCursor, loadingMore, hasMore]);

  // Obtener filas filtradas
  const filteredRows = table.getRowModel().rows;

  return (
    <div className="history-container">
      {/* Header with Gradient */}
      <div className="history-header">
        <div className="header-content-history">
          <div className="title-section">
            <h1 className="page-title">Mi Historial de Tomas</h1>
            <p className="page-subtitle">Registro completo de medicación</p>
          </div>
        </div>
      </div>

      <div className="history-content">
        {/* Filtros */}
        <div className="filters-card">
          <div className="filters-header">
            <h3 className="filters-title">
              <svg className="filters-icon" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
              </svg>
              Filtros de Búsqueda
            </h3>
            <button onClick={clearFilters} className="btn-clear-filters">
              <svg className="btn-icon" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
              </svg>
              Limpiar
            </button>
          </div>

          <div className="filters-grid">
            <div className="filter-field">
              <label className="filter-label">
                <svg className="filter-label-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Estado
              </label>
              <select
                value={getFilterValue('status')}
                onChange={(e) => setFilter('status', e.target.value)}
                className="filter-select"
              >
                <option value="all">Todos</option>
                <option value="TAKEN">Tomadas</option>
                <option value="MISSED">Omitidas</option>
              </select>
            </div>

            <div className="filter-field">
              <label className="filter-label">
                <svg className="filter-label-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
                Fecha
              </label>
              <input
                type="date"
                value={getFilterValue('taken_at')}
                onChange={(e) => setFilter('taken_at', e.target.value)}
                className="filter-input"
              />
            </div>

            <div className="filter-field">
              <label className="filter-label">
                <svg className="filter-label-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
                </svg>
                Medicamento
              </label>
              <select
                value={getFilterValue('treatment_id')}
                onChange={(e) => setFilter('treatment_id', e.target.value)}
                className="filter-select"
              >
                <option value="all">Todos</option>
                {treatments.map((treatment) => (
                  <option key={treatment.id} value={treatment.id}>
                    {treatment.medication_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="alert alert-error">
            <svg className="alert-icon" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Cuadro de historial con scroll */}
        <div className="history-box">
          <div className="history-box-header">
            <h2 className="history-box-title">
              <svg className="title-icon" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
              Historial de Tomas
            </h2>
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
            ) : filteredRows.length === 0 ? (
              <div className="empty-history">
                <div className="empty-icon">📋</div>
                <h3 className="empty-title">Sin registros</h3>
                <p className="empty-text">
                  {columnFilters.length > 0
                    ? 'No hay registros que coincidan con los filtros aplicados'
                    : 'Todavía no hay tomas registradas en el historial'}
                </p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="table-wrapper">
                  <table className="history-table">
                    <thead>
                      {table.getHeaderGroups().map(headerGroup => (
                        <tr key={headerGroup.id} className="table-header">
                          {headerGroup.headers.map(header => {
                            // Ocultar columna treatment_id
                            if (header.column.id === 'treatment_id') return null;

                            return (
                              <th key={header.id} className="table-th">
                                {header.isPlaceholder
                                  ? null
                                  : flexRender(
                                      header.column.columnDef.header,
                                      header.getContext()
                                    )}
                              </th>
                            );
                          })}
                        </tr>
                      ))}
                    </thead>
                    <tbody>
                      {filteredRows.map((row, index) => (
                        <tr
                          key={row.id}
                          className="table-row"
                          style={{ animationDelay: `${index * 0.05}s` }}
                        >
                          {row.getVisibleCells().map(cell => {
                            // Ocultar columna treatment_id
                            if (cell.column.id === 'treatment_id') return null;

                            // Aplicar clases especiales a ciertas columnas
                            let tdClass = 'table-td';
                            if (cell.column.id === 'taken_at') tdClass += ' td-date';
                            if (cell.column.id === 'scheduled_time' || cell.column.id === 'taken_time') tdClass += ' td-time';
                            if (cell.column.id === 'medication_name') tdClass += ' td-med';
                            if (cell.column.id === 'dosage') tdClass += ' td-dosage';

                            return (
                              <td key={cell.id} className={tdClass}>
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="cards-container">
                  {filteredRows.map((row, index) => {
                    const item = row.original;
                    return (
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
                            <span className="card-value">{item.scheduled_time}</span>
                          </div>
                          <div className="card-row">
                            <span className="card-label">Hora registrada:</span>
                            <span className="card-value">{formatTime(item.taken_at)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
                {!loading && !loadingMore && !hasMore && data.length > 0 && (
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

        .history-content {
          max-width: 1400px;
          margin: -2rem auto 0;
          padding: 0 2rem;
          position: relative;
          z-index: 5;
        }

        .filters-card {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-radius: 20px;
          padding: 1.75rem 2rem;
          margin-bottom: 2rem;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.8);
          animation: scaleIn 0.4s ease-out 0.5s both;
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

        .filters-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .filters-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 0.625rem;
        }

        .filters-icon {
          width: 22px;
          height: 22px;
          color: #667eea;
        }

        .btn-clear-filters {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 1.25rem;
          background: rgba(102, 126, 234, 0.1);
          border: 2px solid #667eea;
          color: #667eea;
          border-radius: 10px;
          font-size: 0.9375rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          font-family: inherit;
        }

        .btn-clear-filters:hover {
          background: #667eea;
          color: #fff;
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(102, 126, 234, 0.3);
        }

        .btn-icon {
          width: 18px;
          height: 18px;
        }

        .filters-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 1.25rem;
        }

        .filter-field {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .filter-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          font-weight: 600;
          color: #374151;
        }

        .filter-label-icon {
          width: 16px;
          height: 16px;
          color: #667eea;
        }

        .filter-select,
        .filter-input {
          padding: 0.875rem 1rem;
          font-size: 1rem;
          border: 2px solid #e5e7eb;
          border-radius: 10px;
          outline: none;
          transition: all 0.3s ease;
          background: #f9fafb;
          font-family: inherit;
        }

        .filter-select:focus,
        .filter-input:focus {
          border-color: #667eea;
          background: #fff;
          box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
        }

        .filter-select {
          cursor: pointer;
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

        /* ============================================
           LOADING MORE / END OF LIST
           ============================================ */

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

        .empty-history {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(10px);
          border-radius: 24px;
          padding: 3rem 1.5rem;
          margin: 1.5rem;
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

        /* ============================================
           CUADRO DE HISTORIAL CON SCROLL
           ============================================ */

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
          padding: 1.75rem 2rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
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

        /* Scroll personalizado */
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
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
        }

        .table-th {
          padding: 1.25rem 1.5rem;
          text-align: left;
          font-size: 0.875rem;
          font-weight: 700;
          color: #fff;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 2px solid rgba(255, 255, 255, 0.2);
          position: sticky;
          top: 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          backdrop-filter: blur(10px);
          z-index: 10;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
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

          .filters-grid {
            grid-template-columns: 1fr;
          }

          .filters-header {
            flex-direction: column;
            align-items: stretch;
            gap: 1rem;
          }

          .btn-clear-filters {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
