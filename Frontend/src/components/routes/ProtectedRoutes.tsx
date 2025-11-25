import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from '../layouts/Navbar';
import PersonalDashboard from '../../views/personal/PersonalDashboard';
import MisTratamientos from '../../views/personal/MisTratamientos';
import MiHistorial from '../../views/personal/MiHistorial';

export default function ProtectedRoutes() {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Si no está autenticado, redirigir al login
  if (!token) {
    return <Navigate to="/" replace />;
  }

  // Si no es PERSONAL, redirigir según su rol
  if (user.role !== 'PERSONAL') {
    if (user.role === 'ADMIN') {
      return <Navigate to="/admin/dashboard" replace />;
    }
    if (user.role === 'ASISTENCIAL') {
      return <Navigate to="/asistencial/dashboard" replace />;
    }
  }

  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/dashboard" element={<PersonalDashboard />} />
        <Route path="/tratamientos" element={<MisTratamientos />} />
        <Route path="/historial" element={<MiHistorial />} />
        
        {/* Redirect por defecto */}
        <Route path="*" element={<Navigate to="/personal/dashboard" replace />} />
      </Routes>
    </>
  );
}