import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from '../layouts/Navbar';
import AdminDashboard from '../../views/admin/AdminDashboard';
import AsignacionesView from '../../views/admin/AsignacionesView';

export default function AdminRoutes() {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Si no está autenticado, redirigir al login
  if (!token) {
    return <Navigate to="/" replace />;
  }

  // Si no es ADMIN, redirigir según su rol
  if (user.role !== 'ADMIN') {
    if (user.role === 'ASISTENCIAL') {
      return <Navigate to="/asistencial/dashboard" replace />;
    }
    if (user.role === 'PERSONAL') {
      return <Navigate to="/personal/dashboard" replace />;
    }
  }

  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/dashboard" element={<AdminDashboard />} />
        <Route path="/asignaciones" element={<AsignacionesView />} />
        
        {/* Redirect por defecto */}
        <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
      </Routes>
    </>
  );
}
