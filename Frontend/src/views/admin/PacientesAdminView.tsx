import { useState, useEffect } from 'react';
import { patientsApi, usersApi, assignmentsApi, ApiError } from '../../api';
import type { Patient, User } from '../../api';
import { toastSuccess, toastError, toastWarning } from '../../utils/toast';

// ============================================
// TIPOS
// ============================================

interface PatientForm {
  name: string;
  caregiver_id: string;
  notes: string;
}

// ============================================
// COMPONENTE
// ============================================
export default function PacientesAdminView() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [caregivers, setCaregivers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [caregiverNames, setCaregiverNames] = useState<Record<number, string>>({});

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState<string>('all');

  const [formData, setFormData] = useState<PatientForm>({
    name: '',
    caregiver_id: '',
    notes: '',
  });


  // Cargar pacientes y cuidadores al montar
  useEffect(() => {
    fetchPatients();
    fetchCaregivers();
  }, [filterActive]);

  // Obtener pacientes
  const fetchPatients = async () => {
    setLoading(true);

    try {
      const response = await patientsApi.list({
        limit: 100,
        filters: {
          ...(filterActive !== 'all' && { active: filterActive === 'true' }),
        },
      });

      setPatients(response.items);
    } catch (err: any) {
      const message = err instanceof ApiError ? err.message : 'Error al cargar pacientes';
      toastError(message);
    } finally {
      setLoading(false);
    }
  };

  // Obtener cuidadores (usuarios ASISTENCIAL activos)
  const fetchCaregivers = async () => {
    try {
      const caregivers = await usersApi.getByRole('ASISTENCIAL');
      setCaregivers(caregivers);
      if (caregivers.length === 0) {
        toastWarning('No hay cuidadores disponibles en el sistema');
      }
    } catch (err: any) {
      console.error('Error al cargar cuidadores:', err);
      const message = err instanceof ApiError ? err.message : 'Error al cargar cuidadores';
      toastError(message);
    }
  };

  // Manejar cambios en formulario
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Crear paciente
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Validar que se haya seleccionado un cuidador
    if (!formData.caregiver_id) {
      toastWarning('Seleccioná un cuidador para el paciente');
      setLoading(false);
      return;
    }

    try {
      const caregiverId = Number(formData.caregiver_id);

      // Crear el paciente
      const createResponse: any = await patientsApi.create({
        name: formData.name,
        caregiver_id: caregiverId,
        notes: formData.notes || undefined,
      });

      const createdPatient = createResponse.patient || createResponse.data;

      if (!createdPatient || !createdPatient.id) {
        toastError('No se pudo obtener el ID del paciente creado');
        setLoading(false);
        return;
      }

      // Crear también la asignación en la tabla assignments
      try {
        await assignmentsApi.create({
          caregiver_id: caregiverId,
          patient_id: createdPatient.id,
        });
      } catch (assignError: any) {
        if (assignError instanceof ApiError && assignError.status !== 409) {
          toastWarning(`Paciente creado, pero error al asignar: ${assignError.message}`);
        }
      }

      toastSuccess('Paciente creado correctamente');

      setFormData({
        name: '',
        caregiver_id: '',
        notes: '',
      });
      setShowForm(false);

      fetchPatients();
    } catch (err: any) {
      const message = err instanceof ApiError ? err.message : 'Error al crear paciente';
      toastError(message);
    } finally {
      setLoading(false);
    }
  };

  // Editar paciente
  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPatient) return;

    setLoading(true);

    try {
      await patientsApi.update({
        id: editingPatient.id,
        name: formData.name,
        caregiver_id: formData.caregiver_id ? Number(formData.caregiver_id) : undefined,
        notes: formData.notes || undefined,
      });

      toastSuccess('Paciente actualizado correctamente');

      setFormData({
        name: '',
        caregiver_id: '',
        notes: '',
      });
      setEditingPatient(null);
      setShowForm(false);

      fetchPatients();
    } catch (err: any) {
      const message = err instanceof ApiError ? err.message : 'Error al actualizar paciente';
      toastError(message);
    } finally {
      setLoading(false);
    }
  };

  // Activar/Desactivar paciente
  const handleToggleActive = async (patient: Patient) => {
    const action = patient.active ? 'desactivar' : 'activar';
    const confirmed = window.confirm(
      `¿Confirmar cambio de estado?\n\nPaciente: ${patient.name}\nAcción: ${action.toUpperCase()}`
    );

    if (!confirmed) return;

    setLoading(true);

    try {
      await patientsApi.update({
        id: patient.id,
        active: !patient.active,
      });

      const message = `Paciente ${patient.active ? 'desactivado' : 'activado'} correctamente`;
      toastSuccess(message);

      fetchPatients();
    } catch (err: any) {
      const message = err instanceof ApiError ? err.message : 'Error al cambiar estado del paciente';
      toastError(message);
    } finally {
      setLoading(false);
    }
  };

  // Eliminar paciente
  const handleDelete = async (id: number) => {
    const confirmed = window.confirm(
      '¿Confirmar eliminación?\n\nEsta acción no se puede deshacer.'
    );

    if (!confirmed) return;

    setLoading(true);

    try {
      await patientsApi.deactivate(id);

      toastSuccess('Paciente eliminado correctamente');

      fetchPatients();
    } catch (err: any) {
      const message = err instanceof ApiError ? err.message : 'Error al eliminar paciente';
      toastError(message);
    } finally {
      setLoading(false);
    }
  };

  // Abrir formulario para editar
  const openEditForm = (patient: Patient) => {
    setEditingPatient(patient);
    setFormData({
      name: patient.name,
      caregiver_id: patient.caregiver_id?.toString() || '',
      notes: patient.notes || '',
    });
    setShowForm(true);
  };

  // Cancelar formulario
  const cancelForm = () => {
    setShowForm(false);
    setEditingPatient(null);
    setFormData({
      name: '',
      caregiver_id: '',
      notes: '',
    });
  };

  // Filtrar pacientes por búsqueda
  const filteredPatients = patients.filter((patient) =>
    patient.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Obtener nombre del cuidador
  const getCaregiverName = async (caregiverId?: number): Promise<string> => {
    if (!caregiverId) return 'Sin asignar';
    const caregiver = caregivers.find((c) => c.id === caregiverId);
    if (caregiver) return caregiver.name || 'Sin nombre';
    
    // Si no está en el array, intentar cargarlo desde la API
    try {
      const caregiverData = await usersApi.getById(caregiverId);
      return caregiverData.name || 'Sin nombre';
    } catch {
      return 'Desconocido';
    }
  };

  // Cargar nombres de cuidadores que no están en el array
  useEffect(() => {
    const loadMissingCaregiverNames = async () => {
      const missingIds = patients
        .filter(p => p.caregiver_id && !caregivers.find(c => c.id === p.caregiver_id))
        .map(p => p.caregiver_id!)
        .filter((id, index, self) => self.indexOf(id) === index); // unique

      if (missingIds.length === 0) return;

      const names: Record<number, string> = {};
      await Promise.all(
        missingIds.map(async (id) => {
          try {
            const caregiver = await usersApi.getById(id);
            names[id] = caregiver.name || 'Sin nombre';
          } catch {
            names[id] = 'Desconocido';
          }
        })
      );
      setCaregiverNames(prev => ({ ...prev, ...names }));
    };

    if (patients.length > 0) {
      loadMissingCaregiverNames();
    }
  }, [patients, caregivers]);

  // Función síncrona para obtener nombre del cuidador
  const getCaregiverNameSync = (caregiverId?: number): string => {
    if (!caregiverId) return 'Sin asignar';
    const caregiver = caregivers.find((c) => c.id === caregiverId);
    if (caregiver) return caregiver.name || 'Sin nombre';
    return caregiverNames[caregiverId] || 'Cargando...';
  };

  return (
    <div className="admin-patients-container">
      {/* Header con gradiente */}
      <div className="admin-patients-header">
        <div className="header-content">
          <div className="welcome-section">
            <h1 className="admin-patients-title">Gestión de Pacientes</h1>
            <p className="admin-patients-subtitle">Administra todos los pacientes del sistema</p>
          </div>
          {!showForm && (
            <button onClick={() => setShowForm(true)} className="admin-btn-add">
              <svg className="btn-icon" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Crear Paciente
            </button>
          )}
        </div>
      </div>

      <div className="admin-patients-content">

        {/* Formulario */}
        {showForm && (
          <div className="admin-form-card">
            <div className="form-header">
              <h2 className="form-title">
                {editingPatient ? 'Editar Paciente' : 'Nuevo Paciente'}
              </h2>
              <button type="button" onClick={cancelForm} className="btn-close-form">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            <form onSubmit={editingPatient ? handleEdit : handleCreate} className="admin-form">
              <div className="form-grid">
                <div className="form-field">
                  <label className="field-label">
                    <svg className="label-icon" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                    </svg>
                    Nombre completo <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="field-input"
                    placeholder="Ej: María González"
                    required
                  />
                </div>

                <div className="form-field">
                  <label className="field-label">
                    <svg className="label-icon" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                    </svg>
                    Cuidador asignado <span className="required">*</span>
                  </label>
                  <select
                    name="caregiver_id"
                    value={formData.caregiver_id}
                    onChange={handleInputChange}
                    className="field-input"
                    required
                  >
                    <option value="">Seleccionar cuidador...</option>
                    {caregivers.length === 0 ? (
                      <option value="" disabled>
                        No hay cuidadores disponibles
                      </option>
                    ) : (
                      caregivers.map((caregiver) => (
                        <option key={caregiver.id} value={caregiver.id}>
                          {caregiver.name} ({caregiver.email})
                        </option>
                      ))
                    )}
                  </select>
                  {caregivers.length === 0 && (
                    <small className="field-hint" style={{ color: '#dc2626' }}>
                      ⚠️ No hay cuidadores (ASISTENCIAL) activos en el sistema. Debes crear al menos uno antes de crear pacientes.
                    </small>
                  )}
                  {caregivers.length > 0 && (
                    <small className="field-hint">
                      Requerido - Selecciona un cuidador para asignar al paciente
                    </small>
                  )}
                </div>

                <div className="form-field form-field-full">
                  <label className="field-label">
                    <svg className="label-icon" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    Notas
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    className="field-textarea"
                    placeholder="Información adicional sobre el paciente..."
                    rows={3}
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="button" onClick={cancelForm} className="btn-cancel">
                  Cancelar
                </button>
                <button type="submit" className="btn-submit" disabled={loading}>
                  {loading ? (
                    <>
                      <svg className="spinner-small" viewBox="0 0 24 24" fill="none">
                        <circle className="spinner-circle" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="spinner-path" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Guardando...
                    </>
                  ) : (
                    <>
                      <svg className="btn-icon-submit" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {editingPatient ? 'Actualizar' : 'Crear'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Filtros */}
        <div className="admin-filters-card">
          <div className="filters-grid">
            <div className="filter-group">
              <label className="filter-label">Buscar</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="filter-input"
                placeholder="Nombre del paciente..."
              />
            </div>

            <div className="filter-group">
              <label className="filter-label">Estado</label>
              <select
                value={filterActive}
                onChange={(e) => setFilterActive(e.target.value)}
                className="filter-select"
              >
                <option value="all">Todos</option>
                <option value="true">Activos</option>
                <option value="false">Inactivos</option>
              </select>
            </div>
          </div>
        </div>

        {/* Lista de pacientes */}
        {loading && patients.length === 0 ? (
          <div className="admin-loading">Cargando pacientes...</div>
        ) : filteredPatients.length === 0 ? (
          <div className="admin-empty-state">
            <div className="empty-icon">📋</div>
            <h3 className="empty-title">No se encontraron pacientes</h3>
            <p className="empty-text">
              {searchTerm || filterActive !== 'all'
                ? 'Probá cambiando los filtros'
                : 'Hacé clic en "Crear Paciente" para comenzar'}
            </p>
          </div>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr className="admin-table-header">
                  <th className="admin-th">Nombre</th>
                  <th className="admin-th">Cuidador Asignado</th>
                  <th className="admin-th">Notas</th>
                  <th className="admin-th">Estado</th>
                  <th className="admin-th">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.map((patient) => (
                  <tr key={patient.id} className="admin-table-row">
                    <td className="admin-td">
                      <div className="admin-patient-name">{patient.name}</div>
                    </td>
                    <td className="admin-td">
                      <span
                        className={`admin-badge ${patient.caregiver_id ? 'admin-badge-primary' : 'admin-badge-secondary'}`}
                      >
                        {getCaregiverNameSync(patient.caregiver_id)}
                      </span>
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
                    <td className="admin-td">
                      <div className="admin-actions">
                        <button
                          onClick={() => openEditForm(patient)}
                          className="admin-btn-action admin-btn-edit"
                          title="Editar"
                        >
                          <svg className="action-icon" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleToggleActive(patient)}
                          className="admin-btn-action admin-btn-toggle"
                          title={patient.active ? 'Desactivar' : 'Activar'}
                        >
                          {patient.active ? (
                            <svg className="action-icon" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <svg className="action-icon" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 016 0v1h1a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2h1V7a5 5 0 015-5z" />
                            </svg>
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(patient.id)}
                          className="admin-btn-action admin-btn-delete"
                          title="Eliminar"
                        >
                          <svg className="action-icon" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`
        .admin-patients-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #f5f7fa 0%, #e9ecef 100%);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          padding-bottom: 4rem;
        }

        .admin-patients-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 3rem 2rem 4rem;
          position: relative;
          overflow: hidden;
        }

        .admin-patients-header::before {
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

        .admin-patients-title {
          font-size: 2.5rem;
          font-weight: 800;
          color: #fff;
          margin: 0 0 0.5rem 0;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }

        .admin-patients-subtitle {
          font-size: 1.125rem;
          color: rgba(255, 255, 255, 0.9);
          margin: 0;
          font-weight: 500;
        }

        .admin-btn-add {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          padding: 1rem 1.75rem;
          background: rgba(255, 255, 255, 0.95);
          color: #667eea;
          border: none;
          border-radius: 14px;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
          animation: slideInRight 0.6s ease-out;
          font-family: inherit;
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

        .admin-btn-add:hover {
          background: #fff;
          transform: translateY(-3px);
          box-shadow: 0 12px 28px rgba(0, 0, 0, 0.2);
        }

        .btn-icon {
          width: 20px;
          height: 20px;
        }

        .admin-patients-content {
          max-width: 1400px;
          margin: -2rem auto 0;
          padding: 0 2rem;
          position: relative;
          z-index: 5;
        }

        .admin-form-card {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-radius: 24px;
          padding: 2rem;
          margin-bottom: 2rem;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.8);
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

        .form-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          padding-bottom: 1.5rem;
          border-bottom: 2px solid #f3f4f6;
        }

        .form-title {
          font-size: 1.75rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0;
        }

        .btn-close-form {
          width: 40px;
          height: 40px;
          border: none;
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          border-radius: 10px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
        }

        .btn-close-form:hover {
          background: rgba(239, 68, 68, 0.2);
          transform: rotate(90deg);
        }

        .btn-close-form svg {
          width: 20px;
          height: 20px;
        }

        .admin-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
        }

        .form-field {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-field-full {
          grid-column: 1 / -1;
        }

        .field-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9375rem;
          font-weight: 600;
          color: #374151;
        }

        .label-icon {
          width: 18px;
          height: 18px;
          color: #667eea;
        }

        .required {
          color: #ef4444;
          font-weight: 700;
        }

        .field-input,
        .field-textarea {
          padding: 1rem;
          font-size: 1rem;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          outline: none;
          transition: all 0.3s ease;
          background: #f9fafb;
          font-family: inherit;
        }

        .field-input:focus,
        .field-textarea:focus {
          border-color: #667eea;
          background: #fff;
          box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
          transform: translateY(-1px);
        }

        .field-textarea {
          resize: vertical;
        }

        .field-hint {
          font-size: 0.875rem;
          color: #6b7280;
          font-style: italic;
        }

        .form-actions {
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
          padding-top: 1rem;
          border-top: 2px solid #f3f4f6;
        }

        .btn-cancel {
          padding: 1rem 2rem;
          border: 2px solid #e5e7eb;
          background: #fff;
          color: #6b7280;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          font-family: inherit;
        }

        .btn-cancel:hover {
          background: #f9fafb;
          border-color: #d1d5db;
          transform: translateY(-2px);
        }

        .btn-submit {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          padding: 1rem 2rem;
          border: none;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #fff;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
          font-family: inherit;
        }

        .btn-submit:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 12px 28px rgba(102, 126, 234, 0.4);
        }

        .btn-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-icon-submit {
          width: 20px;
          height: 20px;
        }

        .spinner-small {
          width: 20px;
          height: 20px;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .spinner-circle {
          opacity: 0.25;
        }

        .spinner-path {
          opacity: 0.75;
        }

        .admin-filters-card {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-radius: 24px;
          padding: 1.5rem 2rem;
          margin-bottom: 2rem;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.8);
        }

        .filters-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .filter-label {
          font-size: 0.875rem;
          font-weight: 600;
          color: #374151;
        }

        .filter-input,
        .filter-select {
          padding: 0.875rem 1rem;
          font-size: 0.9375rem;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          outline: none;
          transition: all 0.3s ease;
          background: #f9fafb;
          font-family: inherit;
        }

        .filter-input:focus,
        .filter-select:focus {
          border-color: #667eea;
          background: #fff;
          box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
        }

        .filter-select {
          cursor: pointer;
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

        .admin-actions {
          display: flex;
          gap: 0.5rem;
        }

        .admin-btn-action {
          width: 36px;
          height: 36px;
          padding: 0;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: inherit;
        }

        .admin-btn-edit {
          background: rgba(102, 126, 234, 0.1);
          color: #667eea;
        }

        .admin-btn-edit:hover {
          background: rgba(102, 126, 234, 0.2);
          transform: translateY(-2px);
        }

        .admin-btn-toggle {
          background: rgba(245, 158, 11, 0.1);
          color: #f59e0b;
        }

        .admin-btn-toggle:hover {
          background: rgba(245, 158, 11, 0.2);
          transform: translateY(-2px);
        }

        .admin-btn-delete {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
        }

        .admin-btn-delete:hover {
          background: rgba(239, 68, 68, 0.2);
          transform: translateY(-2px);
        }

        .action-icon {
          width: 18px;
          height: 18px;
        }

        @media (max-width: 768px) {
          .admin-patients-header {
            padding: 2rem 1.5rem 3rem;
          }

          .admin-patients-title {
            font-size: 2rem;
          }

          .admin-patients-content {
            padding: 0 1.5rem;
          }

          .form-grid {
            grid-template-columns: 1fr;
          }

          .form-actions {
            flex-direction: column;
          }

          .btn-cancel,
          .btn-submit {
            width: 100%;
            justify-content: center;
          }

          .filters-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

