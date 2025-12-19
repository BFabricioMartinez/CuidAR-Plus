import { useState, useEffect, useCallback } from 'react';

// ============================================
// CONFIGURACIÓN
// ============================================

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// VAPID Public Key - Generada con generate_vapid_keys.py (compatible con pywebpush 2.x)
const VAPID_PUBLIC_KEY = 'BB3fOofRSnsYzGUJQDsqwMWdsUarPkH3vyMQA6AprIJW_Fl8sCRnc5Fv-Rc0orz5_DuP4NbAtrpRRAhetStZnNQ';

// ============================================
// TIPOS
// ============================================

export type NotificationPermission = 'default' | 'granted' | 'denied';

// ============================================
// UTILIDADES
// ============================================

/**
 * Convierte una clave VAPID base64 a Uint8Array para la API de Push
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// ============================================
// HOOK useNotifications
// ============================================

export const useNotifications = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [enabled, setEnabled] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Verificar si el navegador soporta notificaciones
  const isSupported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;

  // Verificar permiso actual al montar
  useEffect(() => {
    if (isSupported) {
      setPermission(Notification.permission as NotificationPermission);
      const savedEnabled = localStorage.getItem('notifications_enabled');
      setEnabled(savedEnabled === 'true');

      // Verificar si ya está suscrito
      checkSubscriptionStatus();
    }
  }, []);

  /**
   * Verifica si el usuario ya tiene una suscripción activa
   */
  const checkSubscriptionStatus = useCallback(async () => {
    if (!isSupported) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error('Error verificando suscripción:', error);
    }
  }, [isSupported]);

  /**
   * Solicita permiso de notificaciones
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      console.warn('Este navegador no soporta notificaciones push');
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
  }, [isSupported]);

  /**
   * Suscribe al usuario a push notifications del backend
   */
  const subscribeToPush = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      console.error('Push notifications no soportadas');
      return false;
    }

    try {
      // Esperar a que el Service Worker esté listo
      const registration = await navigator.serviceWorker.ready;

      // Verificar si ya existe una suscripción
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        // Crear nueva suscripción
        const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey
        });
      }

      // Enviar suscripción al backend
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No hay token de autenticación');
        return false;
      }

      const response = await fetch(`${API_URL}/push/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          subscription: subscription.toJSON()
        })
      });

      if (!response.ok) {
        throw new Error('Error al suscribir en el backend');
      }

      setIsSubscribed(true);
      console.log('✅ Suscrito a push notifications');
      return true;

    } catch (error) {
      console.error('Error al suscribir a push:', error);
      return false;
    }
  }, [isSupported]);

  /**
   * Desuscribe al usuario de push notifications
   */
  const unsubscribeFromPush = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Desuscribir del navegador
        await subscription.unsubscribe();

        // Notificar al backend
        const token = localStorage.getItem('token');
        if (token) {
          await fetch(`${API_URL}/push/unsubscribe?endpoint=${encodeURIComponent(subscription.endpoint)}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
        }
      }

      setIsSubscribed(false);
      console.log('✅ Desuscrito de push notifications');
      return true;

    } catch (error) {
      console.error('Error al desuscribir:', error);
      return false;
    }
  }, [isSupported]);

  /**
   * Activa notificaciones (solicita permiso y suscribe a push)
   */
  const enableNotifications = useCallback(async (): Promise<boolean> => {
    const granted = await requestPermission();
    if (!granted) {
      return false;
    }

    const subscribed = await subscribeToPush();
    if (subscribed) {
      setEnabled(true);
      localStorage.setItem('notifications_enabled', 'true');
      return true;
    }

    return false;
  }, [requestPermission, subscribeToPush]);

  /**
   * Desactiva notificaciones (desuscribe de push)
   */
  const disableNotifications = useCallback(async () => {
    await unsubscribeFromPush();
    setEnabled(false);
    localStorage.setItem('notifications_enabled', 'false');
  }, [unsubscribeFromPush]);

  /**
   * Envía una notificación de prueba (solicita al backend que envíe una push)
   */
  const testNotification = useCallback(async () => {
    if (!enabled || !isSubscribed) {
      console.warn('Notificaciones no habilitadas');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No hay token de autenticación');
        return;
      }

      const response = await fetch(`${API_URL}/push/test`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        console.log('✅ Notificación de prueba enviada');
      } else {
        console.error('Error al enviar notificación de prueba');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }, [enabled, isSubscribed]);

  /**
   * Muestra una notificación local inmediata (solo para casos especiales)
   */
  const showLocalNotification = useCallback(async (title: string, body: string, icon?: string) => {
    if (permission !== 'granted') {
      return;
    }

    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(title, {
          body,
          icon: icon || '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          tag: 'local-notification',
          requireInteraction: true,
        });
      } else {
        // Fallback: Notification API directa
        new Notification(title, {
          body,
          icon: icon || '/pwa-192x192.png',
        });
      }
    } catch (error) {
      console.error('Error al mostrar notificación local:', error);
    }
  }, [permission]);

  return {
    // Estado
    permission,
    enabled,
    isSupported,
    isSubscribed,

    // Acciones
    enableNotifications,
    disableNotifications,
    testNotification,
    showLocalNotification,
  };
};
