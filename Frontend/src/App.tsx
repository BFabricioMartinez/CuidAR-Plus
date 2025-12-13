import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
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
        toastOptions={{
          // Configuración por defecto
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
            padding: '16px',
            borderRadius: '8px',
          },
          // Estilos específicos por tipo
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />

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