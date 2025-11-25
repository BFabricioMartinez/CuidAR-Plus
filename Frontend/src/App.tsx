import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './views/Login';
import AdminRoutes from './components/routes/AdminRoutes';
import AsistencialRoutes from './components/routes/AsistencialRoutes';
import ProtectedRoutes from './components/routes/ProtectedRoutes';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta pública - Login */}
        <Route path="/" element={<Login />} />

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