import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './views/public/Login';
import Register from './views/public/Register';
import Dashboard from './views/public/Dashboard';
import AdminRoutes from './components/routes/AdminRoutes';
import AsistencialRoutes from './components/routes/AsistencialRoutes';
import ProtectedRoutes from './components/routes/ProtectedRoutes';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta pública - Dashboard */}
        <Route path="/" element={<Dashboard />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Rutas protegidas por rol */}
        <Route path="/admin/*" element={<AdminRoutes />} />
        <Route path="/asistencial/*" element={<AsistencialRoutes />} />
        <Route path="/personal/*" element={<ProtectedRoutes />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;