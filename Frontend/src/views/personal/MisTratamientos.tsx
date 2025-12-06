import { useState, useEffect } from 'react';
import { useTreatments } from '../../hooks/personal/useTreatments';
import { useTreatmentForm } from '../../hooks/personal/useTreatmentForm';
import { useTreatmentActions } from '../../hooks/personal/useTreatmentActions';
import type { Treatment } from '../../types/treatment';

export default function MisTratamientos() {
  const [showForm, setShowForm] = useState(false);
  const [editingTreatment, setEditingTreatment] = useState<Treatment | null>(null);

  // Custom hooks
  const { treatments, loading: loadingTreatments, fetchTreatments } = useTreatments();
  const { formData, handleInputChange, setFormDataFromTreatment, resetForm } = useTreatmentForm();
  const {
    loading: actionLoading,
    error,
    successMessage,
    createTreatment,
    updateTreatment,
    deleteTreatment,
  } = useTreatmentActions();

  const loading = loadingTreatments || actionLoading;

  // Cargar tratamientos al montar
  useEffect(() => {
    fetchTreatments();
  }, []);

  // Crear tratamiento
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createTreatment(formData);
      resetForm();
      setShowForm(false);
      fetchTreatments();
    } catch (err) {
      console.error('Error al crear tratamiento:', err);
    }
  };

  // Editar tratamiento
  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTreatment) return;

    try {
      await updateTreatment(editingTreatment.id, formData);
      resetForm();
      setEditingTreatment(null);
      setShowForm(false);
      fetchTreatments();
    } catch (err) {
      console.error('Error al actualizar tratamiento:', err);
    }
  };

  // Eliminar tratamiento (soft delete)
  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de desactivar este tratamiento?')) return;

    try {
      await deleteTreatment(id);
      fetchTreatments();
    } catch (err) {
      console.error('Error al eliminar tratamiento:', err);
    }
  };

  // Abrir formulario para editar
  const openEditForm = (treatment: Treatment) => {
    setEditingTreatment(treatment);
    setFormDataFromTreatment(treatment);
    setShowForm(true);
  };

  // Cancelar formulario
  const cancelForm = () => {
    setShowForm(false);
    setEditingTreatment(null);
    resetForm();
  };

  return (
    <div className="max-w-7xl mx-auto p-5 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Mis Tratamientos</h1>
          <p className="text-base text-gray-500">Gestiona tus medicamentos y horarios</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg text-base font-semibold transition-colors"
          >
            + Agregar Tratamiento
          </button>
        )}
      </div>

      {/* Mensajes */}
      {error && (
        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-5 border border-red-200">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="bg-green-50 text-green-600 px-4 py-3 rounded-lg mb-5 border border-green-200">
          {successMessage}
        </div>
      )}

      {/* Formulario */}
      {showForm && (
        <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">
            {editingTreatment ? 'Editar Tratamiento' : 'Nuevo Tratamiento'}
          </h2>

          <form onSubmit={editingTreatment ? handleEdit : handleCreate} className="space-y-6">
            {/* Medicamento y Dosis */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700">
                  Medicamento <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="medication_name"
                  value={formData.medication_name}
                  onChange={handleInputChange}
                  className="px-3 py-2.5 text-sm border-2 border-gray-200 rounded-lg outline-none focus:border-indigo-500 transition-colors"
                  placeholder="Ej: Paracetamol"
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700">
                  Dosis <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="dosage"
                  value={formData.dosage}
                  onChange={handleInputChange}
                  className="px-3 py-2.5 text-sm border-2 border-gray-200 rounded-lg outline-none focus:border-indigo-500 transition-colors"
                  placeholder="Ej: 500mg"
                  required
                />
              </div>
            </div>

            {/* Frecuencia */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">
                Frecuencia <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="frequency"
                value={formData.frequency}
                onChange={handleInputChange}
                className="px-3 py-2.5 text-sm border-2 border-gray-200 rounded-lg outline-none focus:border-indigo-500 transition-colors"
                placeholder="Ej: Cada 8 horas: 8:00, 16:00, 00:00"
                required
              />
              <small className="text-xs text-gray-500">
                Incluye los horarios en formato HH:MM (ej: 08:00, 14:00, 20:00)
              </small>
            </div>

            {/* Fechas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700">
                  Fecha de inicio <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleInputChange}
                  className="px-3 py-2.5 text-sm border-2 border-gray-200 rounded-lg outline-none focus:border-indigo-500 transition-colors"
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700">Fecha de fin</label>
                <input
                  type="date"
                  name="end_date"
                  value={formData.end_date}
                  onChange={handleInputChange}
                  className="px-3 py-2.5 text-sm border-2 border-gray-200 rounded-lg outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            {/* Notas */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">Notas</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                className="px-3 py-2.5 text-sm border-2 border-gray-200 rounded-lg outline-none focus:border-indigo-500 transition-colors resize-vertical"
                placeholder="Notas adicionales..."
                rows={3}
              />
            </div>

            {/* Botones */}
            <div className="flex gap-3 justify-end pt-4">
              <button
                type="button"
                onClick={cancelForm}
                className="px-6 py-2.5 text-sm font-semibold border-2 border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 text-sm font-semibold border-none rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Guardando...' : editingTreatment ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de tratamientos */}
      {loadingTreatments && treatments.length === 0 ? (
        <div className="text-center py-10 text-gray-500">Cargando tratamientos...</div>
      ) : treatments.length === 0 ? (
        <div className="bg-gray-50 p-16 rounded-xl text-center text-gray-500">
          <p className="text-lg mb-2">📋 No tenés tratamientos registrados</p>
          <p className="text-sm">Hacé clic en "Agregar Tratamiento" para comenzar</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
          {treatments.map((treatment) => (
            <div
              key={treatment.id}
              className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow"
            >
              {/* Header del tratamiento */}
              <div className="flex items-center gap-4 mb-5">
                <div className="text-4xl">💊</div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-800 mb-1">
                    {treatment.medication_name}
                  </h3>
                  <p className="text-sm text-gray-500">{treatment.dosage}</p>
                </div>
              </div>

              {/* Detalles */}
              <div className="space-y-2.5 py-4 border-t border-gray-200">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-gray-600">Frecuencia:</span>
                  <span className="text-gray-800">{treatment.frequency}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-gray-600">Inicio:</span>
                  <span className="text-gray-800">
                    {new Date(treatment.start_date).toLocaleDateString('es-AR')}
                  </span>
                </div>
                {treatment.end_date && (
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-gray-600">Fin:</span>
                    <span className="text-gray-800">
                      {new Date(treatment.end_date).toLocaleDateString('es-AR')}
                    </span>
                  </div>
                )}
                {treatment.notes && (
                  <div className="flex flex-col gap-1 text-sm">
                    <span className="font-medium text-gray-600">Notas:</span>
                    <span className="text-gray-800">{treatment.notes}</span>
                  </div>
                )}
              </div>

              {/* Acciones */}
              <div className="flex gap-2 mt-5">
                <button
                  onClick={() => openEditForm(treatment)}
                  className="flex-1 py-2.5 text-sm font-semibold border-2 border-indigo-600 rounded-lg bg-white text-indigo-600 hover:bg-indigo-50 transition-colors"
                >
                  ✏️ Editar
                </button>
                <button
                  onClick={() => handleDelete(treatment.id)}
                  className="flex-1 py-2.5 text-sm font-semibold border-2 border-red-600 rounded-lg bg-white text-red-600 hover:bg-red-50 transition-colors"
                >
                  🗑️ Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
