/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

declare const self: ServiceWorkerGlobalScope;

// Precachear assets estáticos (inyectado por Vite PWA)
precacheAndRoute(self.__WB_MANIFEST);

// Limpiar caches antiguos
cleanupOutdatedCaches();

// Cache de API con NetworkFirst
registerRoute(
  ({ url }) => url.origin === 'https://cuidar-backend.onrender.com' && url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 60 * 5, // 5 minutos
      }),
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  })
);

// ============================================================================
// PUSH NOTIFICATIONS - Event Listener
// ============================================================================

/**
 * Evento 'push' - Se dispara cuando llega una notificación push del servidor
 */
self.addEventListener('push', (event: PushEvent) => {
  console.log('[Service Worker] Push recibido', event);

  if (!event.data) {
    console.warn('[Service Worker] Push sin datos');
    return;
  }

  try {
    // Parsear datos del push
    const data = event.data.json();
    console.log('[Service Worker] Push data:', data);

    const { title, body, icon, badge, tag, data: customData } = data;

    // Opciones de la notificación
    const options: NotificationOptions = {
      body,
      icon: icon || '/pwa-192x192.png',
      badge: badge || '/pwa-192x192.png',
      tag: tag || 'default',
      requireInteraction: true, // No se cierra automáticamente
      data: customData || {},
    };

    // Mostrar notificación
    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  } catch (error) {
    console.error('[Service Worker] Error procesando push:', error);
  }
});

/**
 * Evento 'notificationclick' - Se dispara cuando el usuario hace click en la notificación
 */
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  console.log('[Service Worker] Notificación clickeada', event);

  // Cerrar la notificación
  event.notification.close();

  // Abrir o enfocar la app
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Si ya hay una ventana abierta, enfocarla
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // Si no, abrir nueva ventana
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});

/**
 * Evento 'notificationclose' - Se dispara cuando se cierra la notificación
 */
self.addEventListener('notificationclose', (event: NotificationEvent) => {
  console.log('[Service Worker] Notificación cerrada', event);
  // Aquí podrías trackear métricas si necesitas
});

// ============================================================================
// MENSAJE DESDE EL CLIENTE
// ============================================================================

/**
 * Maneja mensajes del cliente (para casos especiales si los necesitas)
 */
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  console.log('[Service Worker] Mensaje recibido:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('[Service Worker] CuidAR Service Worker activado ✅');
