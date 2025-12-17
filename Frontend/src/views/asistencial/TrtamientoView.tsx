import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAsistencialTreatments } from '../../hooks/asistencial/useAsistencialTreatments';
import { toastSuccess, toastError, toastLoading, toastDismiss, toastWarning } from '../../utils/toast';
import type { Treatment } from '../../api';

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
export default function TratamientoView() {
  const navigate = useNavigate();
  const [selectedTimes, setSelectedTimes] = useState<string[]>([]);
  const [newTime, setNewTime] = useState('');
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [treatmentToDelete, setTreatmentToDelete] = useState<{ id: number; name: string } | null>(null);

  const {
    patients,
    selectedPatientId,
    treatments,
    formData,
    loading,
    showForm,
    editingTreatment,
    fetchMyPatients,
    createTreatment,
    updateTreatment,
    deleteTreatment,
    fetchTreatments,
    handleInputChange,
    openEditForm,
    openCreateForm,
    cancelForm,
  } = useAsistencialTreatments();

  // Cargar pacientes al montar el componente
  useEffect(() => {
    fetchMyPatients();
  }, [fetchMyPatients]);

  // Redirigir al dashboard si "Todos" está seleccionado
  useEffect(() => {
    if (selectedPatientId === null) {
      navigate('/asistencial/dashboard');
    }
  }, [selectedPatientId, navigate]);

  // Nombre del paciente seleccionado
  const selectedPatientName =
    patients.find((p) => p.id === selectedPatientId)?.name || '';

  // Sincronizar selectedTimes con formData.frequency SOLO cuando se abre/cierra el formulario
  useEffect(() => {
    if (showForm && formData.frequency) {
      const times = formData.frequency
        .split(',')
        .map(t => t.trim())
        .filter(t => /^\d{2}:\d{2}$/.test(t));
      if (times.length > 0) {
        setSelectedTimes(times);
      }
    }
  }, [showForm, formData.frequency]);

  // Horarios sugeridos comunes
  const suggestedTimes = ['08:00', '12:00', '14:00', '16:00', '20:00', '22:00'];

  // Agregar horario
  const addTime = (timeToAdd?: string) => {
    const timeValue = timeToAdd || newTime;
    if (!timeValue) return;

    if (selectedTimes.includes(timeValue)) {
      toastWarning('Este horario ya está agregado');
      return;
    }

    const updatedTimes = [...selectedTimes, timeValue].sort();
    setSelectedTimes(updatedTimes);

    const frequencyText = updatedTimes.join(', ');
    handleInputChange({ target: { name: 'frequency', value: frequencyText } } as any);

    setNewTime('');
    setShowTimePicker(false);
  };

  // Eliminar horario
  const removeTime = (timeToRemove: string) => {
    const updatedTimes = selectedTimes.filter(t => t !== timeToRemove);
    setSelectedTimes(updatedTimes);

    if (updatedTimes.length > 0) {
      const frequencyText = updatedTimes.join(', ');
      handleInputChange({ target: { name: 'frequency', value: frequencyText } } as any);
    } else {
      handleInputChange({ target: { name: 'frequency', value: '' } } as any);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) {
      toastError('Primero seleccioná un paciente desde la barra superior.');
      return;
    }

    const loadingToastId = 'create-treatment-asistencial';
    toastLoading('Creando tratamiento...', loadingToastId);

    try {
      const success = await createTreatment(formData);
      toastDismiss(loadingToastId);

      if (!success) {
        toastError('No se pudo crear el tratamiento. Intentá nuevamente.');
        return;
      }

      toastSuccess(`Tratamiento de ${formData.medication_name} creado correctamente`);
      cancelForm();
      setSelectedTimes([]);
      setNewTime('');
      setShowTimePicker(false);
      fetchTreatments();
    } catch (err) {
      console.error('Error al crear tratamiento asistencial:', err);
      toastDismiss(loadingToastId);
      toastError('No se pudo crear el tratamiento. Intentá nuevamente.');
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTreatment) return;

    const loadingToastId = 'update-treatment-asistencial';
    toastLoading('Actualizando tratamiento...', loadingToastId);

    try {
      const success = await updateTreatment(editingTreatment.id, formData);
      toastDismiss(loadingToastId);

      if (!success) {
        toastError('No se pudo actualizar el tratamiento. Intentá nuevamente.');
        return;
      }

      toastSuccess(`Tratamiento de ${formData.medication_name} actualizado correctamente`);
      cancelForm();
      setSelectedTimes([]);
      setNewTime('');
      setShowTimePicker(false);
      fetchTreatments();
    } catch (err) {
      console.error('Error al actualizar tratamiento asistencial:', err);
      toastDismiss(loadingToastId);
      toastError('No se pudo actualizar el tratamiento. Intentá nuevamente.');
    }
  };

  const handleDeleteClick = (treatment: Treatment) => {
    setTreatmentToDelete({ id: treatment.id, name: treatment.medication_name });
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!treatmentToDelete) return;

    const loadingToastId = 'delete-treatment-asistencial';
    toastLoading('Desactivando tratamiento...', loadingToastId);

    try {
      const success = await deleteTreatment(treatmentToDelete.id);
      toastDismiss(loadingToastId);

      if (!success) {
        toastError('No se pudo desactivar el tratamiento. Intentá nuevamente.');
        return;
      }

      toastSuccess('Tratamiento desactivado correctamente');
      setShowDeleteModal(false);
      setTreatmentToDelete(null);
      fetchTreatments();
    } catch (err) {
      console.error('Error al eliminar tratamiento asistencial:', err);
      toastDismiss(loadingToastId);
      toastError('No se pudo desactivar el tratamiento. Intentá nuevamente.');
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setTreatmentToDelete(null);
  };

  const handleCancelForm = () => {
    cancelForm();
    setSelectedTimes([]);
    setNewTime('');
    setShowTimePicker(false);
  };

  return (
    <div className="treatments-container">
      {/* Header with Gradient */}
      <div className="treatments-header">
        <div className="header-content-treatments">
          <div className="title-section">
            <h1 className="page-title">Gestión de Tratamientos</h1>
            <p className="page-subtitle">
              Administra los tratamientos de tus pacientes asignados
            </p>
            {selectedPatientName && (
              <p className="page-subtitle-secondary">
                Paciente seleccionado: <strong>{selectedPatientName}</strong>
              </p>
            )}
        </div>
        {selectedPatientId && !showForm && (
            <button onClick={openCreateForm} className="btn-add-treatment">
              <svg className="btn-icon-add" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              <span>Nuevo Tratamiento</span>
          </button>
        )}
        </div>
      </div>

      <div className="treatments-content">
        {/* Mensaje si no hay paciente seleccionado */}
        {!selectedPatientId && (
          <div className="empty-treatments">
            <div className="empty-icon">👥</div>
            <h3 className="empty-title">Seleccioná un paciente</h3>
            <p className="empty-text">
              Utilizá el selector de paciente en la parte superior para gestionar
              sus tratamientos activos.
            </p>
      </div>
        )}

        {/* Formulario */}
      {showForm && selectedPatientId && (
          <div className="treatment-form-card">
            <div className="form-header">
              <h2 className="form-title">
                {editingTreatment ? 'Editar Tratamiento' : 'Nuevo Tratamiento'}{' '}
                {selectedPatientName && (
                  <span className="form-title-patient">
                    · Paciente: <strong>{selectedPatientName}</strong>
                  </span>
                )}
          </h2>
              <button onClick={handleCancelForm} className="btn-close-form">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            <form onSubmit={editingTreatment ? handleEdit : handleCreate} className="treatment-form">
              <div className="form-grid">
                <div className="form-field">
                  <label className="field-label">
                    <svg className="label-icon" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
                    </svg>
                    Medicamento <span className="required">*</span>
                  </label>
                <input
                  type="text"
                  name="medication_name"
                  value={formData.medication_name}
                  onChange={handleInputChange}
                    className="field-input"
                    placeholder="Ej: Paracetamol, Ibuprofeno..."
                  required
                />
              </div>

                <div className="form-field">
                  <label className="field-label">
                    <svg className="label-icon" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                    </svg>
                    Dosis <span className="required">*</span>
                  </label>
                <input
                  type="text"
                  name="dosage"
                  value={formData.dosage}
                  onChange={handleInputChange}
                    className="field-input"
                    placeholder="Ej: 500mg, 1 comprimido..."
                  required
                />
              </div>
            </div>

              {/* Selector de Horarios Interactivo */}
              <div className="form-field form-field-full">
                <label className="field-label">
                  <svg className="label-icon" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  Horarios de toma <span className="required">*</span>
                </label>

                {selectedTimes.length > 0 && (
                  <div className="time-chips-container">
                    {selectedTimes.map((time) => (
                      <div key={time} className="time-chip">
                        <svg className="time-chip-icon" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                        </svg>
                        <span className="time-chip-text">{time}</span>
                        <button
                          type="button"
                          onClick={() => removeTime(time)}
                          className="time-chip-remove"
                          aria-label={`Eliminar horario ${time}`}
                        >
                          <svg viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="time-picker-controls">
                  {!showTimePicker ? (
                    <button
                      type="button"
                      onClick={() => setShowTimePicker(true)}
                      className="btn-add-time"
                    >
                      <svg className="btn-icon-time" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                      </svg>
                      Agregar horario
                    </button>
                  ) : (
                    <div className="time-picker-input-group">
              <input
                        type="time"
                        value={newTime}
                        onChange={(e) => setNewTime(e.target.value)}
                        className="time-input"
                        placeholder="00:00"
                      />
                      <button
                        type="button"
                        onClick={() => addTime()}
                        className="btn-confirm-time"
                        disabled={!newTime}
                      >
                        <svg viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowTimePicker(false);
                          setNewTime('');
                        }}
                        className="btn-cancel-time"
                      >
                        <svg viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>

                {!showTimePicker && (
                  <div className="suggested-times">
                    <p className="suggested-times-label">
                      {selectedTimes.length === 0 ? 'Horarios sugeridos:' : 'Agregar más horarios:'}
                    </p>
                    <div className="suggested-times-grid">
                      {suggestedTimes
                        .filter(time => !selectedTimes.includes(time))
                        .map((time) => (
                          <button
                            key={time}
                            type="button"
                            onClick={() => addTime(time)}
                            className="suggested-time-btn"
                          >
                            {time}
                          </button>
                        ))}
                    </div>
                  </div>
                )}

                <input
                  type="hidden"
                name="frequency"
                value={formData.frequency}
                  required={selectedTimes.length === 0}
                />

                <small className="field-hint">
                  {selectedTimes.length > 0
                    ? `${selectedTimes.length} ${selectedTimes.length === 1 ? 'horario configurado para este paciente' : 'horarios configurados para este paciente'}`
                    : 'Agregá los horarios en que el paciente debe tomar este medicamento'
                  }
              </small>
            </div>

              <div className="form-grid">
                <div className="form-field">
                  <label className="field-label">
                    <svg className="label-icon" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                    Fecha de inicio <span className="required">*</span>
                  </label>
                <input
                  type="date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleInputChange}
                    className="field-input"
                  required
                />
              </div>

                <div className="form-field">
                  <label className="field-label">
                    <svg className="label-icon" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                    Fecha de fin
                  </label>
                <input
                  type="date"
                  name="end_date"
                  value={formData.end_date}
                  onChange={handleInputChange}
                    className="field-input"
                />
              </div>
            </div>

              <div className="form-field form-field-full">
                <label className="field-label">
                  <svg className="label-icon" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  Notas adicionales
                </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                  className="field-textarea"
                  placeholder="Información adicional sobre el tratamiento del paciente..."
                rows={3}
              />
            </div>

              <div className="form-actions">
                <button type="button" onClick={handleCancelForm} className="btn-cancel">
                Cancelar
              </button>
                <button type="submit" disabled={loading} className="btn-submit">
                  {loading ? (
                    <>
                      <svg className="spinner-small" viewBox="0 0 24 24">
                        <circle className="spinner-circle" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="spinner-path" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Guardando...
                    </>
                  ) : (
                    <>
                      <svg className="btn-icon-submit" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {editingTreatment ? 'Actualizar' : 'Crear Tratamiento'}
                    </>
                  )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de tratamientos */}
      {selectedPatientId && (
          loading && treatments.length === 0 ? (
            <div className="loading-state">
              <div className="loading-spinner">
                <div className="spinner-ring"></div>
                <div className="spinner-ring"></div>
                <div className="spinner-ring"></div>
              </div>
              <p className="loading-text">Cargando tratamientos del paciente...</p>
            </div>
          ) : treatments.length === 0 ? (
            <div className="empty-treatments">
              <div className="empty-icon">💊</div>
              <h3 className="empty-title">
                Sin tratamientos registrados para {selectedPatientName || 'este paciente'}
              </h3>
              <p className="empty-text">
                Agregá el primer tratamiento para poder registrar y supervisar
                correctamente las tomas del paciente.
              </p>
              {!showForm && (
                <button onClick={openCreateForm} className="btn-empty-action">
                  <svg className="btn-icon-add" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  Agregar Tratamiento
                </button>
              )}
            </div>
          ) : (
            <div className="treatments-grid">
              {treatments.map((treatment, index) => (
                <div key={treatment.id} className="treatment-card" style={{ animationDelay: `${index * 0.1}s` }}>
                  <div className="treatment-card-header">
                    <div className="medication-badge">
                      <svg className="medication-icon" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <h3 className="medication-name">{treatment.medication_name}</h3>
                    <p className="medication-dosage">{treatment.dosage}</p>
                  </div>

                  <div className="treatment-card-body">
                    <div className="treatment-info-row">
                      <svg className="info-icon" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                      </svg>
                      <div className="info-content">
                        <span className="info-label">Frecuencia</span>
                        <span className="info-value">{treatment.frequency}</span>
                    </div>
                    </div>

                    {treatment.start_date && (
                      <div className="treatment-info-row">
                        <svg className="info-icon" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                        </svg>
                        <div className="info-content">
                          <span className="info-label">Inicio</span>
                          <span className="info-value">
                            {new Date(treatment.start_date).toLocaleDateString('es-AR')}
                      </span>
                    </div>
                      </div>
                    )}

                    {treatment.end_date && (
                      <div className="treatment-info-row">
                        <svg className="info-icon" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                        </svg>
                        <div className="info-content">
                          <span className="info-label">Fin</span>
                          <span className="info-value">
                          {new Date(treatment.end_date).toLocaleDateString('es-AR')}
                        </span>
                        </div>
                      </div>
                    )}

                    {treatment.notes && (
                      <div className="treatment-notes">
                        <svg className="notes-icon" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <p className="notes-text">{treatment.notes}</p>
                      </div>
                    )}
                  </div>

                  <div className="treatment-card-actions">
                    <button onClick={() => openEditForm(treatment)} className="btn-edit">
                      <svg className="btn-icon" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                      </svg>
                      <span>Editar</span>
                    </button>
                    <button onClick={() => handleDeleteClick(treatment)} className="btn-delete">
                      <svg className="btn-icon" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span>Eliminar</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* Modal de confirmación de eliminación */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={cancelDelete}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon-warning">
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>

            <h3 className="modal-title">¿Desactivar tratamiento?</h3>

            <p className="modal-message">
              ¿Estás seguro de que querés desactivar el tratamiento de <strong>{treatmentToDelete?.name}</strong> para este paciente?
              <br />
              Esta acción se puede revertir más adelante.
            </p>

            <div className="modal-actions">
              <button onClick={cancelDelete} className="btn-modal-cancel">
                No, cancelar
              </button>
              <button onClick={confirmDelete} className="btn-modal-confirm">
                Sí, desactivar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Estilos reutilizados de MisTratamientos */}
      <style>{`
        .treatments-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #f5f7fa 0%, #e9ecef 100%);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          padding-bottom: 4rem;
        }

        .treatments-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 3rem 2rem;
          position: relative;
          overflow: hidden;
        }

        .treatments-header::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: url('data:image/svg+xml,<svg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><circle cx="30" cy="30" r="1.5" fill="rgba(255,255,255,0.1)"/></svg>');
          opacity: 0.5;
        }

        .header-content-treatments {
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

        .btn-add-treatment {
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

        .btn-add-treatment:hover {
          background: #fff;
          transform: translateY(-3px);
          box-shadow: 0 12px 28px rgba(0, 0, 0, 0.2);
        }

        .btn-icon-add {
          width: 20px;
          height: 20px;
        }

        .treatments-content {
          max-width: 1400px;
          margin: -2rem auto 0;
          padding: 0 2rem;
          position: relative;
          z-index: 5;
        }

        .treatment-form-card {
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

        .form-title-patient {
          font-size: 0.95rem;
          color: #6b7280;
          margin-left: 0.5rem;
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

        .treatment-form {
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

        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem 2rem;
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

        .loading-text {
          font-size: 1.125rem;
          color: #6b7280;
          font-weight: 500;
        }

        .empty-treatments {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(10px);
          border-radius: 24px;
          padding: 4rem 2rem;
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
          margin: 0 0 2rem 0;
          line-height: 1.6;
        }

        .btn-empty-action {
          display: inline-flex;
          align-items: center;
          gap: 0.625rem;
          padding: 1rem 2rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #fff;
          border: none;
          border-radius: 14px;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
        }

        .btn-empty-action:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 28px rgba(102, 126, 234, 0.4);
        }

        .treatments-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
          gap: 1.5rem;
        }

        .treatment-card {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-radius: 20px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.8);
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
          transition: all 0.3s ease;
          animation: fadeInUp 0.6s ease-out both;
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

        .treatment-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.12);
        }

        .treatment-card-header {
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
          padding: 1.75rem;
          text-align: center;
        }

        .medication-badge {
          width: 64px;
          height: 64px;
          margin: 0 auto 1rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
        }

        .medication-icon {
          width: 32px;
          height: 32px;
          color: #fff;
        }

        .medication-name {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 0.5rem 0;
        }

        .medication-dosage {
          font-size: 1.125rem;
          color: #6b7280;
          font-weight: 600;
          margin: 0;
        }

        .treatment-card-body {
          padding: 1.75rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .treatment-info-row {
          display: flex;
          align-items: flex-start;
          gap: 0.875rem;
        }

        .info-icon {
          width: 20px;
          height: 20px;
          color: #667eea;
          flex-shrink: 0;
          margin-top: 0.125rem;
        }

        .info-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .info-label {
          font-size: 0.875rem;
          color: #6b7280;
          font-weight: 500;
        }

        .info-value {
          font-size: 1rem;
          color: #1f2937;
          font-weight: 600;
        }

        .treatment-notes {
          background: rgba(102, 126, 234, 0.05);
          padding: 1rem;
          border-radius: 12px;
          border-left: 4px solid #667eea;
          display: flex;
          gap: 0.75rem;
          margin-top: 0.5rem;
        }

        .notes-icon {
          width: 18px;
          height: 18px;
          color: #667eea;
          flex-shrink: 0;
          margin-top: 0.125rem;
        }

        .notes-text {
          font-size: 0.9375rem;
          color: #4b5563;
          margin: 0;
          line-height: 1.5;
        }

        .treatment-card-actions {
          display: flex;
          gap: 0.75rem;
          padding: 0 1.75rem 1.75rem;
        }

        .btn-edit,
        .btn-delete {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.875rem 1rem;
          border: 2px solid;
          border-radius: 12px;
          font-size: 0.9375rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          font-family: inherit;
        }

        .btn-edit {
          border-color: #667eea;
          background: #fff;
          color: #667eea;
        }

        .btn-edit:hover {
          background: rgba(102, 126, 234, 0.1);
          transform: translateY(-2px);
        }

        .btn-delete {
          border-color: #ef4444;
          background: #fff;
          color: #ef4444;
        }

        .btn-delete:hover {
          background: rgba(239, 68, 68, 0.1);
          transform: translateY(-2px);
        }

        .btn-icon {
          width: 18px;
          height: 18px;
        }

        /* Selector de horarios interactivo */
        .time-chips-container {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          padding: 1rem;
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);
          border-radius: 12px;
          border: 2px dashed #e5e7eb;
          margin-bottom: 1rem;
          min-height: 60px;
          animation: fadeIn 0.3s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .time-chip {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 1rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #fff;
          border-radius: 12px;
          font-size: 0.9375rem;
          font-weight: 600;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
          animation: chipSlideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          transition: all 0.3s ease;
        }

        @keyframes chipSlideIn {
          from {
            opacity: 0;
            transform: scale(0.8) translateY(-10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        .time-chip:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
        }

        .time-chip-icon {
          width: 16px;
          height: 16px;
          flex-shrink: 0;
        }

        .time-chip-text {
          font-variant-numeric: tabular-nums;
          letter-spacing: 0.5px;
        }

        .time-chip-remove {
          width: 20px;
          height: 20px;
          border: none;
          background: rgba(255, 255, 255, 0.2);
          color: #fff;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          padding: 0;
        }

        .time-chip-remove:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: rotate(90deg);
        }

        .time-chip-remove svg {
          width: 12px;
          height: 12px;
        }

        .time-picker-controls {
          margin-bottom: 1rem;
        }

        .btn-add-time {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.875rem 1.5rem;
          background: #fff;
          border: 2px dashed #667eea;
          color: #667eea;
          border-radius: 12px;
          font-size: 0.9375rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          font-family: inherit;
        }

        .btn-add-time:hover {
          background: rgba(102, 126, 234, 0.05);
          border-style: solid;
          transform: translateY(-2px);
        }

        .btn-icon-time {
          width: 18px;
          height: 18px;
        }

        .time-picker-input-group {
          display: flex;
          gap: 0.75rem;
          align-items: center;
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

        .time-input {
          flex: 1;
          padding: 0.875rem 1rem;
          font-size: 1rem;
          border: 2px solid #667eea;
          border-radius: 12px;
          outline: none;
          transition: all 0.3s ease;
          background: #fff;
          font-family: inherit;
          font-variant-numeric: tabular-nums;
        }

        .time-input:focus {
          border-color: #764ba2;
          box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.15);
        }

        .btn-confirm-time,
        .btn-cancel-time {
          width: 44px;
          height: 44px;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
          flex-shrink: 0;
        }

        .btn-confirm-time {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: #fff;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }

        .btn-confirm-time:hover:not(:disabled) {
          transform: translateY(-2px) scale(1.05);
          box-shadow: 0 6px 16px rgba(16, 185, 129, 0.4);
        }

        .btn-confirm-time:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-cancel-time {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
        }

        .btn-cancel-time:hover {
          background: rgba(239, 68, 68, 0.2);
          transform: translateY(-2px) rotate(90deg);
        }

        .btn-confirm-time svg,
        .btn-cancel-time svg {
          width: 20px;
          height: 20px;
        }

        .suggested-times {
          padding: 1rem;
          background: rgba(102, 126, 234, 0.03);
          border-radius: 12px;
          border: 1px solid rgba(102, 126, 234, 0.1);
          animation: fadeIn 0.3s ease-out;
        }

        .suggested-times-label {
          font-size: 0.875rem;
          color: #6b7280;
          font-weight: 600;
          margin: 0 0 0.75rem 0;
        }

        .suggested-times-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(70px, 1fr));
          gap: 0.5rem;
        }

        .suggested-time-btn {
          padding: 0.75rem;
          background: #fff;
          border: 2px solid #e5e7eb;
          color: #667eea;
          border-radius: 10px;
          font-size: 0.9375rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          font-family: inherit;
          font-variant-numeric: tabular-nums;
        }

        .suggested-time-btn:hover {
          background: rgba(102, 126, 234, 0.1);
          border-color: #667eea;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
        }

        @media (max-width: 768px) {
          .treatments-header {
            padding: 2rem 1.5rem;
          }

          .page-title {
            font-size: 2rem;
          }

          .treatments-content {
            padding: 0 1.5rem;
          }

          .treatments-grid {
            grid-template-columns: 1fr;
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

          .suggested-times-grid {
            grid-template-columns: repeat(3, 1fr);
          }

          .time-chips-container {
            padding: 0.75rem;
          }

          .time-chip {
            font-size: 0.875rem;
            padding: 0.5rem 0.875rem;
          }
        }

        /* Modal confirmación */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 1rem;
          animation: fadeIn 0.2s ease-out;
        }

        .modal-content {
          background: #fff;
          border-radius: 20px;
          padding: 2.5rem;
          max-width: 440px;
          width: 100%;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          animation: slideUp 0.3s ease-out;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .modal-icon-warning {
          width: 64px;
          height: 64px;
          margin-bottom: 1.5rem;
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.1) 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4);
          }
          50% {
            transform: scale(1.05);
            box-shadow: 0 0 0 10px rgba(239, 68, 68, 0);
          }
        }

        .modal-icon-warning svg {
          width: 32px;
          height: 32px;
          color: #ef4444;
        }

        .modal-title {
          font-size: 1.375rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 1rem 0;
        }

        .modal-message {
          font-size: 0.9375rem;
          color: #6b7280;
          line-height: 1.65;
          margin: 0 0 2rem 0;
        }

        .modal-message strong {
          color: #1f2937;
          font-weight: 600;
        }

        .modal-actions {
          display: flex;
          gap: 0.75rem;
          width: 100%;
        }

        .btn-modal-cancel,
        .btn-modal-confirm {
          flex: 1;
          padding: 1rem 1.5rem;
          border: none;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          font-family: inherit;
        }

        .btn-modal-cancel {
          background: #f3f4f6;
          color: #6b7280;
          border: 2px solid #e5e7eb;
        }

        .btn-modal-cancel:hover {
          background: #e5e7eb;
          border-color: #d1d5db;
          transform: translateY(-2px);
        }

        .btn-modal-confirm {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: #fff;
          box-shadow: 0 8px 20px rgba(239, 68, 68, 0.3);
        }

        .btn-modal-confirm:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 28px rgba(239, 68, 68, 0.4);
        }

        @media (max-width: 480px) {
          .modal-content {
            padding: 2rem 1.5rem;
          }

          .modal-actions {
            flex-direction: column;
            gap: 0.625rem;
          }

          .btn-modal-cancel,
          .btn-modal-confirm {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
