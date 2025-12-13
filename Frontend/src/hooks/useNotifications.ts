import toast from 'react-hot-toast';
import { NotificationType, NotificationOptions } from '../types/notifications';

export const useNotifications = () => {
  /**
   * Muestra una notificación básica
   */
  const notify = (
    message: string,
    type: NotificationType = 'info',
    options?: NotificationOptions
  ) => {
    const duration = options?.duration ?? 4000;
    const position = options?.position ?? 'top-right';

    const toastOptions = {
      duration,
      position,
      icon: options?.icon,
    };

    switch (type) {
      case 'success':
        return toast.success(message, toastOptions);
      case 'error':
        return toast.error(message, toastOptions);
      case 'warning':
        return toast(message, {
          ...toastOptions,
          icon: options?.icon ?? '⚠️',
          style: {
            background: '#f59e0b',
            color: '#fff',
          },
        });
      case 'alarm':
        return toast(message, {
          ...toastOptions,
          icon: options?.icon ?? '🔔',
          style: {
            background: '#dc2626',
            color: '#fff',
            fontWeight: 'bold',
            border: '2px solid #991b1b',
          },
        });
      case 'info':
      default:
        return toast(message, {
          ...toastOptions,
          icon: options?.icon ?? 'ℹ️',
        });
    }
  };

  /**
   * Muestra una notificación de alarma programable con timeout
   */
  const notifyAlarm = (
    title: string,
    message: string,
    timeout?: number, // en milisegundos
    onDismiss?: () => void
  ) => {
    const fullMessage = `${title}\n${message}`;

    const toastId = toast(
      (t) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{title}</div>
          <div style={{ fontSize: '14px' }}>{message}</div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <button
              onClick={() => {
                toast.dismiss(t.id);
                onDismiss?.();
              }}
              style={{
                padding: '6px 12px',
                background: '#fff',
                color: '#dc2626',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '14px',
              }}
            >
              Descartar
            </button>
          </div>
        </div>
      ),
      {
        duration: timeout ?? Infinity, // Si no se especifica timeout, permanece hasta que se descarte
        position: 'top-center',
        icon: '🔔',
        style: {
          background: '#dc2626',
          color: '#fff',
          padding: '16px',
          minWidth: '300px',
        },
      }
    );

    // Si hay timeout, auto-cerrar y ejecutar callback
    if (timeout) {
      setTimeout(() => {
        toast.dismiss(toastId);
        onDismiss?.();
      }, timeout);
    }

    return toastId;
  };

  /**
   * Muestra una notificación de dosis pendiente (alarma de medicamento)
   */
  const notifyDosePending = (
    medicationName: string,
    dosage: string,
    time: string,
    onTaken?: () => void,
    onMissed?: () => void
  ) => {
    const toastId = toast(
      (t) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontWeight: 'bold', fontSize: '16px' }}>
            🔔 Recordatorio de Medicación
          </div>
          <div style={{ fontSize: '14px' }}>
            Es hora de tomar: <strong>{medicationName}</strong>
          </div>
          <div style={{ fontSize: '13px', opacity: 0.9 }}>
            Dosis: {dosage} | Hora: {time}
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <button
              onClick={() => {
                toast.dismiss(t.id);
                onTaken?.();
              }}
              style={{
                padding: '8px 16px',
                background: '#10b981',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '14px',
              }}
            >
              ✓ Tomada
            </button>
            <button
              onClick={() => {
                toast.dismiss(t.id);
                onMissed?.();
              }}
              style={{
                padding: '8px 16px',
                background: '#f59e0b',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '14px',
              }}
            >
              ✗ Omitir
            </button>
            <button
              onClick={() => toast.dismiss(t.id)}
              style={{
                padding: '8px 16px',
                background: '#6b7280',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '14px',
              }}
            >
              Más tarde
            </button>
          </div>
        </div>
      ),
      {
        duration: Infinity, // No se cierra automáticamente
        position: 'top-center',
        icon: '💊',
        style: {
          background: '#667eea',
          color: '#fff',
          padding: '20px',
          minWidth: '400px',
          maxWidth: '500px',
        },
      }
    );

    return toastId;
  };

  /**
   * Cierra una notificación específica
   */
  const dismiss = (toastId: string) => {
    toast.dismiss(toastId);
  };

  /**
   * Cierra todas las notificaciones
   */
  const dismissAll = () => {
    toast.dismiss();
  };

  /**
   * Notificaciones de ejemplo/atajos comunes
   */
  const success = (message: string, options?: NotificationOptions) =>
    notify(message, 'success', options);

  const error = (message: string, options?: NotificationOptions) =>
    notify(message, 'error', options);

  const warning = (message: string, options?: NotificationOptions) =>
    notify(message, 'warning', options);

  const info = (message: string, options?: NotificationOptions) =>
    notify(message, 'info', options);

  return {
    notify,
    notifyAlarm,
    notifyDosePending,
    success,
    error,
    warning,
    info,
    dismiss,
    dismissAll,
  };
};
