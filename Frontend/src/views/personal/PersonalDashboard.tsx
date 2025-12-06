import { useEffect } from 'react';
import { usePersonalStats } from '../../hooks/personal/usePersonalStats';
import { useTreatments } from '../../hooks/personal/useTreatments';
import { useIntakeLogs } from '../../hooks/personal/useIntakeLogs';

export default function PersonalDashboard() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Custom hooks
  const { stats, loading: statsLoading, fetchStats } = usePersonalStats();
  const { treatments, upcomingDoses, loading: treatmentsLoading, fetchTreatments } = useTreatments();
  const { error, successMessage, markAsTaken, markAsMissed } = useIntakeLogs();

  const loading = statsLoading || treatmentsLoading;

  // Cargar datos al montar
  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Función principal que carga todo
  const fetchDashboardData = async () => {
    try {
      await Promise.all([
        fetchStats(user.id),
        fetchTreatments(),
      ]);
    } catch (err) {
      console.error('Error al cargar datos del dashboard:', err);
    }
  };

  // Marcar dosis como TOMADA
  const handleMarkTaken = async (treatmentId: number, time: string) => {
    try {
      await markAsTaken(treatmentId, time, user.id);
      setTimeout(() => {
        fetchDashboardData();
      }, 1000);
    } catch (err) {
      console.error('Error al marcar dosis como tomada:', err);
    }
  };

  // Marcar dosis como OMITIDA
  const handleMarkMissed = async (treatmentId: number, time: string) => {
    try {
      await markAsMissed(treatmentId, time, user.id);
      setTimeout(() => {
        fetchDashboardData();
      }, 1000);
    } catch (err) {
      console.error('Error al marcar dosis como omitida:', err);
    }
  };

  if (loading && !stats) {
    return (
      <div className="max-w-7xl mx-auto p-5">
        <div className="text-center py-10 text-lg text-gray-500">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-5 font-sans">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">Mi Dashboard</h1>
        <p className="text-base text-gray-500">Bienvenido, {user.name}</p>
      </div>

      {/* Mensajes de Error/Éxito */}
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

      {/* KPIs - Cards de Estadísticas */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
          {/* Tomadas Hoy */}
          <div className="bg-white p-5 rounded-xl shadow-md flex items-center gap-4 hover:shadow-lg transition-shadow">
            <div className="text-4xl">✓</div>
            <div>
              <div className="text-3xl font-bold text-gray-800">{stats.today_doses.taken}</div>
              <div className="text-sm text-gray-500">Tomadas Hoy</div>
            </div>
          </div>

          {/* Omitidas Hoy */}
          <div className="bg-white p-5 rounded-xl shadow-md flex items-center gap-4 hover:shadow-lg transition-shadow">
            <div className="text-4xl">✗</div>
            <div>
              <div className="text-3xl font-bold text-gray-800">{stats.today_doses.missed}</div>
              <div className="text-sm text-gray-500">Omitidas Hoy</div>
            </div>
          </div>

          {/* Adherencia Hoy */}
          <div className="bg-white p-5 rounded-xl shadow-md flex items-center gap-4 hover:shadow-lg transition-shadow">
            <div className="text-4xl">📊</div>
            <div>
              <div className="text-3xl font-bold text-gray-800">
                {stats.today_doses.adherence_percentage
                  ? `${stats.today_doses.adherence_percentage}%`
                  : 'N/A'}
              </div>
              <div className="text-sm text-gray-500">Adherencia Hoy</div>
            </div>
          </div>
        </div>
      )}

      {/* Sección de Dosis Pendientes */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">🕐 Dosis de Hoy</h2>

        {upcomingDoses.length === 0 ? (
          <div className="bg-gray-50 p-10 rounded-xl text-center text-gray-500">
            <p className="text-base">No tenés dosis programadas para hoy</p>
            <p className="text-sm mt-2">Agregá tratamientos en "Mis Tratamientos"</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {upcomingDoses.map((dose, index) => (
              <div
                key={index}
                className="bg-white p-5 rounded-xl shadow-md flex flex-col sm:flex-row items-start sm:items-center gap-5 hover:shadow-lg transition-shadow"
              >
                {/* Hora */}
                <div className="text-2xl font-bold text-indigo-600 min-w-[80px]">
                  {dose.time}
                </div>

                {/* Información del Medicamento */}
                <div className="flex-1">
                  <div className="text-lg font-semibold text-gray-800">{dose.med_name}</div>
                  <div className="text-sm text-gray-500">{dose.dosage}</div>
                </div>

                {/* Botones de Acción */}
                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => handleMarkTaken(dose.treatment_id, dose.time)}
                    className="flex-1 sm:flex-none bg-green-500 hover:bg-green-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
                  >
                    ✓ Tomada
                  </button>
                  <button
                    onClick={() => handleMarkMissed(dose.treatment_id, dose.time)}
                    className="flex-1 sm:flex-none bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
                  >
                    ✗ Omitida
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sección de Tratamientos Activos */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">💊 Mis Tratamientos Activos</h2>

        {treatments.length === 0 ? (
          <div className="bg-gray-50 p-10 rounded-xl text-center text-gray-500">
            <p>No tenés tratamientos activos</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {treatments.map((treatment) => (
              <div
                key={treatment.id}
                className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow"
              >
                <div className="text-base font-semibold text-gray-800 mb-2">
                  {treatment.medication_name}
                </div>
                <div className="text-sm text-gray-500 mb-1">{treatment.dosage}</div>
                <div className="text-xs text-gray-400">{treatment.frequency}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
