import { useState, useEffect, useCallback } from 'react';

// ============================================
// TIPOS
// ============================================

export type NotificationPermission = 'default' | 'granted' | 'denied';

interface ScheduledNotification {
  id: string;
  medicationName: string;
  scheduledTime: Date;
  type: '1hour' | '10min';
}

// ============================================
// HOOK useNotifications
// ============================================

export const useNotifications = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [enabled, setEnabled] = useState(false);
  const [scheduledNotifications, setScheduledNotifications] = useState<ScheduledNotification[]>([]);

  // Verificar permiso actual al montar
  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission as NotificationPermission);
      // Cargar estado de localStorage
      const savedEnabled = localStorage.getItem('notifications_enabled');
      setEnabled(savedEnabled === 'true');
    }
  }, []);

  // Solicitar permiso
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      console.warn('Este navegador no soporta notificaciones');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result as NotificationPermission);
      return result === 'granted';
    } catch (error) {
      console.error('Error al solicitar permiso:', error);
      return false;
    }
  }, []);

  // Activar notificaciones
  const enableNotifications = useCallback(async (): Promise<boolean> => {
    const granted = await requestPermission();
    if (granted) {
      setEnabled(true);
      localStorage.setItem('notifications_enabled', 'true');
      return true;
    }
    return false;
  }, [requestPermission]);

  // Desactivar notificaciones
  const disableNotifications = useCallback(() => {
    setEnabled(false);
    localStorage.setItem('notifications_enabled', 'false');
    // Cancelar todas las notificaciones programadas
    cancelAllNotifications();
  }, []);

  // Programar notificación individual
  const scheduleNotification = useCallback((
    id: string,
    title: string,
    body: string,
    scheduledTime: Date
  ) => {
    if (!enabled || permission !== 'granted') {
      console.warn('Notificaciones no habilitadas');
      return;
    }

    const now = new Date();
    const delay = scheduledTime.getTime() - now.getTime();

    if (delay <= 0) {
      // Si ya pasó el tiempo, mostrar inmediatamente
      showNotification(title, body);
      return;
    }

    // Programar notificación
    const timeoutId = setTimeout(() => {
      showNotification(title, body);
    }, delay);

    // Guardar referencia (en producción usarías un mejor sistema)
    const notificationData = {
      id,
      timeoutId: timeoutId as unknown as string,
      scheduledTime
    };

    // Guardar en localStorage para persistencia
    const stored = localStorage.getItem('scheduled_notifications') || '[]';
    const notifications = JSON.parse(stored);
    notifications.push(notificationData);
    localStorage.setItem('scheduled_notifications', JSON.stringify(notifications));

    return timeoutId;
  }, [enabled, permission]);

  // Mostrar notificación
  const showNotification = useCallback((title: string, body: string, icon?: string) => {
    if (permission !== 'granted') {
      console.warn('No hay permiso para mostrar notificaciones');
      return;
    }

    try {
      const notification = new Notification(title, {
        body,
        icon: icon || '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        tag: 'medication-reminder',
        requireInteraction: true, // La notificación no se cierra automáticamente
      });

      // Opcional: manejar click en notificación
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch (error) {
      console.error('Error al mostrar notificación:', error);
    }
  }, [permission]);

  // Programar notificaciones para un medicamento específico
  const scheduleMedicationNotifications = useCallback((
    medicationId: number,
    medicationName: string,
    scheduledTime: Date
  ) => {
    if (!enabled) return;

    const now = new Date();
    const medicationTime = new Date(scheduledTime);

    // Notificación 1 hora antes
    const oneHourBefore = new Date(medicationTime.getTime() - 60 * 60 * 1000);
    if (oneHourBefore > now) {
      scheduleNotification(
        `med-${medicationId}-1h`,
        '⏰ Recordatorio de medicación',
        `En 1 hora: ${medicationName}`,
        oneHourBefore
      );
    }

    // Notificación 10 minutos antes
    const tenMinBefore = new Date(medicationTime.getTime() - 10 * 60 * 1000);
    if (tenMinBefore > now) {
      scheduleNotification(
        `med-${medicationId}-10m`,
        '🔔 ¡Es hora de tomar tu medicamento!',
        `En 10 minutos: ${medicationName}`,
        tenMinBefore
      );
    }

    // Notificación en el momento exacto
    if (medicationTime > now) {
      scheduleNotification(
        `med-${medicationId}-now`,
        '💊 Hora de medicación',
        `Tomar ahora: ${medicationName}`,
        medicationTime
      );
    }
  }, [enabled, scheduleNotification]);

  // Cancelar todas las notificaciones
  const cancelAllNotifications = useCallback(() => {
    // Limpiar localStorage
    localStorage.removeItem('scheduled_notifications');
    setScheduledNotifications([]);
  }, []);

  // Probar notificación (útil para testing)
  const testNotification = useCallback(() => {
    showNotification(
      '✅ ¡Notificaciones activadas!',
      'Recibirás recordatorios de tus medicamentos',
      '/pwa-192x192.png'
    );
  }, [showNotification]);

  return {
    // Estado
    permission,
    enabled,
    isSupported: 'Notification' in window,
    scheduledNotifications,

    // Acciones
    enableNotifications,
    disableNotifications,
    requestPermission,
    scheduleNotification,
    scheduleMedicationNotifications,
    cancelAllNotifications,
    testNotification,
    showNotification,
  };
};
