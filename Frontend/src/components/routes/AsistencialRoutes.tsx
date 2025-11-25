import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from '../layouts/Navbar';
import AsistencialDashboard from '../../views/asistencial/AsistencialDashboard';
import TratamientoView from '../../views/asistencial/TrtamientoView';
import HistorialView from '../../views/asistencial/HistorialView';

export default function AsistencialRoutes() {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Si no está autenticado, redirigir al login
  if (!token) {
    return <Navigate to="/" replace />;
  }

  // Si no es ASISTENCIAL, redirigir según su rol
  if (user.role !== 'ASISTENCIAL') {
    if (user.role === 'ADMIN') {
      return <Navigate to="/admin/dashboard" replace />;
    }
    if (user.role === 'PERSONAL') {
      return <Navigate to="/personal/dashboard" replace />;
    }
  }

  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/dashboard" element={<AsistencialDashboard />} />
        <Route path="/tratamientos" element={<TratamientoView />} />
        <Route path="/historial" element={<HistorialView />} />
        
        {/* Redirect por defecto */}
        <Route path="*" element={<Navigate to="/asistencial/dashboard" replace />} />
      </Routes>
    </>
  );
}