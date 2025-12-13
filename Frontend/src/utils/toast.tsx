import toast from 'react-hot-toast';
import { ToastWithProgress } from '../components/ToastWithProgress';

/**
 * Helper centralizado para mostrar notificaciones toast en toda la aplicación.
 * Usa react-hot-toast con configuración consistente y production-ready.
 */

// ============================================
// TOAST BÁSICOS
// ============================================

/**
 * Muestra un toast de éxito
 */
export const toastSuccess = (message: string, options?: { duration?: number }) => {
  return toast.custom(
    (t) => <ToastWithProgress t={t} message={message} type="success" />,
    {
      duration: options?.duration ?? 3000,
      position: 'top-right',
    }
  );
};

/**
 * Muestra un toast de error
 */
export const toastError = (message: string, options?: { duration?: number }) => {
  return toast.custom(
    (t) => <ToastWithProgress t={t} message={message} type="error" />,
    {
      duration: options?.duration ?? 5000,
      position: 'top-right',
    }
  );
};

/**
 * Muestra un toast informativo
 */
export const toastInfo = (message: string, options?: { duration?: number }) => {
  return toast.custom(
    (t) => <ToastWithProgress t={t} message={message} type="info" />,
    {
      duration: options?.duration ?? 4000,
      position: 'top-right',
    }
  );
};

/**
 * Muestra un toast de advertencia
 */
export const toastWarning = (message: string, options?: { duration?: number }) => {
  return toast.custom(
    (t) => <ToastWithProgress t={t} message={message} type="warning" />,
    {
      duration: options?.duration ?? 4000,
      position: 'top-right',
    }
  );
};

/**
 * Muestra un toast de carga (loading)
 * @param message - Mensaje a mostrar
 * @param id - ID único para poder actualizar este toast después
 */
export const toastLoading = (message: string, id?: string) => {
  return toast.loading(message, {
    id,
    style: {
      background: '#6b7280',
      color: '#fff',
      padding: '16px',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '500',
    },
  });
};

/**
 * Cierra un toast específico o todos
 */
export const toastDismiss = (id?: string) => {
  if (id) {
    toast.dismiss(id);
  } else {
    toast.dismiss();
  }
};

// ============================================
// TOAST PROMISE (para operaciones async)
// ============================================

interface ToastPromiseMessages {
  loading: string;
  success: string;
  error: string;
}

/**
 * Muestra toasts según el estado de una promesa
 * Útil para operaciones async (fetch, guardado, etc.)
 */
export const toastPromise = <T,>(
  promise: Promise<T>,
  messages: ToastPromiseMessages,
  options?: { duration?: number }
) => {
  return toast.promise(
    promise,
    {
      loading: messages.loading,
      success: messages.success,
      error: messages.error,
    },
    {
      success: {
        duration: options?.duration ?? 3000,
        style: {
          background: '#10b981',
          color: '#fff',
          padding: '16px',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '500',
        },
        iconTheme: {
          primary: '#fff',
          secondary: '#10b981',
        },
      },
      error: {
        duration: options?.duration ?? 5000,
        style: {
          background: '#ef4444',
          color: '#fff',
          padding: '16px',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '500',
        },
        iconTheme: {
          primary: '#fff',
          secondary: '#ef4444',
        },
      },
      loading: {
        style: {
          background: '#6b7280',
          color: '#fff',
          padding: '16px',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '500',
        },
      },
    }
  );
};

// ============================================
// HELPERS ESPECÍFICOS DE LA APLICACIÓN
// ============================================

/**
 * Toast para cuando se marca una dosis como tomada
 */
export const toastDoseTaken = (medicationName: string) => {
  return toastSuccess(`Dosis de ${medicationName} registrada como tomada`);
};

/**
 * Toast para cuando se marca una dosis como omitida
 */
export const toastDoseMissed = (medicationName: string) => {
  return toastWarning(`Dosis de ${medicationName} marcada como omitida`);
};

/**
 * Toast para errores de red
 */
export const toastNetworkError = () => {
  return toastError('Error de conexión. Verificá tu conexión a internet.');
};

/**
 * Toast para operaciones de guardado genéricas
 */
export const toastSaved = (entityName: string = 'Los datos') => {
  return toastSuccess(`${entityName} guardados correctamente`);
};

/**
 * Toast para operaciones de eliminación
 */
export const toastDeleted = (entityName: string = 'El elemento') => {
  return toastSuccess(`${entityName} eliminado correctamente`);
};

/**
 * Toast para login exitoso
 */
export const toastLoginSuccess = (userName?: string) => {
  const message = userName ? `¡Bienvenido/a ${userName}!` : '¡Bienvenido/a!';
  return toastSuccess(message);
};

/**
 * Toast para logout
 */
export const toastLogoutSuccess = () => {
  return toastInfo('Sesión cerrada correctamente');
};
