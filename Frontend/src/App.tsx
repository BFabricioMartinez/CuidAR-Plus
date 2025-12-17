import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Dashboard from './views/Dashboard';
import Login from './views/Login';
import AdminRoutes from './components/routes/AdminRoutes';
import AsistencialRoutes from './components/routes/AsistencialRoutes';
import ProtectedRoutes from './components/routes/ProtectedRoutes';

function App() {
  return (
    <BrowserRouter>
      {/* Configuración global de notificaciones */}
      <Toaster
        position="top-right"
        reverseOrder={false}
        gutter={8}
        containerStyle={{
          top: 20,
          right: 20,
        }}
        toastOptions={{
          // Duración por defecto
          duration: 3000,
          // Los estilos específicos se manejan en utils/toast.ts
          style: {
            fontSize: '14px',
            maxWidth: '500px',
          },
        }}
      />

      <Routes>
        {/* Ruta pública - Dashboard (Landing Page) */}
        <Route path="/" element={<Dashboard />} />

        {/* Ruta pública - Login */}
        <Route path="/login" element={<Login />} />

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