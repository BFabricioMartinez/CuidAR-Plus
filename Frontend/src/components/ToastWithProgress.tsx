import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import type { Toast } from 'react-hot-toast';

interface ToastWithProgressProps {
  t: Toast;
  message: string;
  icon?: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

export function ToastWithProgress({ t, message, icon, type }: ToastWithProgressProps) {
  const [started, setStarted] = useState(false);
  const duration = t.duration || 4000;

  // Iniciar animación al montar
  useEffect(() => {
    // Usar requestAnimationFrame para asegurar que la animación comience
    requestAnimationFrame(() => {
      setStarted(true);
    });
  }, []);

  // Colores según el tipo con mejor contraste
  const colors = {
    success: {
      bg: '#059669', // Verde más oscuro para mejor contraste
      progress: '#34d399', // Verde claro para la barra
    },
    error: {
      bg: '#dc2626', // Rojo más oscuro
      progress: '#f87171', // Rojo claro para la barra
    },
    warning: {
      bg: '#d97706', // Naranja más oscuro
      progress: '#fbbf24', // Naranja claro para la barra
    },
    info: {
      bg: '#2563eb', // Azul más oscuro
      progress: '#60a5fa', // Azul claro para la barra
    },
  };

  const color = colors[type];

  return (
    <div
      style={{
        minWidth: '280px',
        maxWidth: '500px',
        background: color.bg,
        color: '#fff',
        padding: '16px',
        paddingBottom: '12px', // Menos padding abajo para la barra
        borderRadius: '10px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        position: 'relative',
        overflow: 'hidden',
        opacity: t.visible ? 1 : 0,
        transform: t.visible ? 'translateY(0)' : 'translateY(-10px)',
        transition: 'opacity 0.3s ease, transform 0.3s ease',
        zIndex: 10001, // Asegurar que aparezca por encima de modales (z-index 9999)
      }}
    >
      {/* Contenido del toast */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span
          style={{
            flex: 1,
            fontSize: '14px',
            fontWeight: '500',
            lineHeight: '1.4',
          }}
        >
          {message}
        </span>
        {/* Botón de cerrar */}
        <button
          onClick={() => toast.dismiss(t.id)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0.8,
            transition: 'opacity 0.2s',
            fontSize: '18px',
            lineHeight: 1,
            flexShrink: 0,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.8')}
          aria-label="Cerrar"
        >
          ✕
        </button>
      </div>

      {/* Barra de progreso pegada al borde inferior */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '3px',
          backgroundColor: 'rgba(0, 0, 0, 0.15)',
          borderBottomLeftRadius: '10px',
          borderBottomRightRadius: '10px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            backgroundColor: color.progress,
            width: '100%',
            transformOrigin: 'left',
            transform: started ? 'scaleX(0)' : 'scaleX(1)',
            transition: started ? `transform ${duration}ms linear` : 'none',
          }}
        />
      </div>
    </div>
  );
}
