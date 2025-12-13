# Sistema de Notificaciones / Toast Globales

Sistema completo de notificaciones in-app con soporte para alarmas programables, ideal para recordatorios de medicación y alertas del sistema.

## Características

- ✅ Notificaciones toast con react-hot-toast
- ✅ Múltiples tipos: success, error, warning, info, alarm
- ✅ Alarmas con timeout automático o persistentes
- ✅ Notificaciones de dosis con acciones (Tomada/Omitida)
- ✅ Posicionamiento configurable
- ✅ TypeScript completo
- ✅ Configuración global en App.tsx
- 🚀 Preparado para notificaciones push futuras

## Instalación

Ya está instalado y configurado. La librería `react-hot-toast` ya estaba en el proyecto.

## Uso Básico

### 1. Importar el hook

```tsx
import { useNotifications } from '../hooks/useNotifications';
```

### 2. Usar en tu componente

```tsx
function MiComponente() {
  const { success, error, warning, info } = useNotifications();

  const handleClick = () => {
    success('¡Operación exitosa!');
  };

  return <button onClick={handleClick}>Hacer algo</button>;
}
```

## API Completa

### Métodos Básicos

#### `success(message, options?)`
Muestra una notificación de éxito.

```tsx
success('Operación completada');
success('Guardado con éxito', { duration: 3000 });
```

#### `error(message, options?)`
Muestra una notificación de error.

```tsx
error('Ocurrió un error');
error('No se pudo conectar', { duration: 5000 });
```

#### `warning(message, options?)`
Muestra una notificación de advertencia.

```tsx
warning('Ten cuidado con esta acción');
```

#### `info(message, options?)`
Muestra una notificación informativa.

```tsx
info('Información importante');
```

### Métodos Avanzados

#### `notify(message, type, options?)`
Notificación personalizada con control total.

```tsx
notify('Mensaje personalizado', 'warning', {
  duration: 6000,
  position: 'top-center',
  icon: '🚀',
});
```

**Tipos disponibles:** `'success'`, `'error'`, `'warning'`, `'info'`, `'alarm'`

**Posiciones disponibles:**
- `'top-left'`
- `'top-center'`
- `'top-right'` (por defecto)
- `'bottom-left'`
- `'bottom-center'`
- `'bottom-right'`

#### `notifyAlarm(title, message, timeout?, onDismiss?)`
Muestra una alarma importante con título, mensaje y botón de descarte.

```tsx
// Alarma con timeout de 10 segundos
notifyAlarm(
  'Recordatorio Importante',
  'Esta alarma se cerrará en 10 segundos',
  10000,
  () => console.log('Alarma cerrada')
);

// Alarma persistente (sin timeout)
notifyAlarm(
  'Atención Urgente',
  'Esta alarma permanece hasta que la descartes',
  undefined,
  () => console.log('Descartada')
);
```

#### `notifyDosePending(medicationName, dosage, time, onTaken?, onMissed?)`
Notificación especial para recordatorios de medicación con botones de acción.

```tsx
notifyDosePending(
  'Paracetamol',
  '500mg',
  '14:30',
  () => {
    // Callback cuando se marca como tomada
    console.log('Dosis tomada');
    success('Dosis registrada correctamente');
  },
  () => {
    // Callback cuando se marca como omitida
    console.log('Dosis omitida');
    warning('Recuerda tomarla más tarde');
  }
);
```

#### `dismiss(toastId)` y `dismissAll()`
Cierra notificaciones específicas o todas.

```tsx
const { dismiss, dismissAll } = useNotifications();

// Cerrar una específica
const toastId = success('Mensaje');
dismiss(toastId);

// Cerrar todas
dismissAll();
```

## Opciones de Configuración

```tsx
interface NotificationOptions {
  duration?: number; // en milisegundos, null = no se cierra automáticamente
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  icon?: string; // emoji o carácter
}
```

## Ejemplos de Uso en CuidAR

### Ejemplo 1: Notificación después de marcar dosis como tomada

```tsx
import { useNotifications } from '../../hooks/useNotifications';

function AsistencialDashboard() {
  const { success, error } = useNotifications();

  const markAsTaken = async (treatmentId: number, time: string) => {
    try {
      await api.markDoseAsTaken(treatmentId, time);
      success('Dosis marcada como tomada correctamente');
    } catch (err) {
      error('Error al marcar la dosis');
    }
  };

  // ...resto del componente
}
```

### Ejemplo 2: Sistema de alarmas programadas

```tsx
import { useEffect } from 'react';
import { useNotifications } from '../../hooks/useNotifications';

function DoseScheduler() {
  const { notifyDosePending } = useNotifications();

  useEffect(() => {
    // Verificar dosis pendientes cada minuto
    const interval = setInterval(() => {
      const now = new Date();
      const currentTime = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;

      // Verificar si hay dosis programadas para esta hora
      upcomingDoses.forEach((dose) => {
        if (dose.time === currentTime) {
          notifyDosePending(
            dose.medication,
            dose.dosage,
            dose.time,
            () => markAsTaken(dose.id),
            () => markAsMissed(dose.id)
          );
        }
      });
    }, 60000); // Cada 1 minuto

    return () => clearInterval(interval);
  }, [upcomingDoses]);

  // ...resto del componente
}
```

### Ejemplo 3: Alarma de recordatorio 15 minutos antes

```tsx
import { useNotifications } from '../../hooks/useNotifications';

function ReminderSystem() {
  const { info, notifyDosePending } = useNotifications();

  const scheduleReminder = (dose: Dose) => {
    const [hours, minutes] = dose.time.split(':').map(Number);
    const doseTime = new Date();
    doseTime.setHours(hours, minutes, 0, 0);

    const reminderTime = new Date(doseTime.getTime() - 15 * 60000); // 15 minutos antes
    const now = new Date();

    if (reminderTime > now) {
      const timeUntilReminder = reminderTime.getTime() - now.getTime();

      // Recordatorio 15 minutos antes
      setTimeout(() => {
        info(`Recordatorio: En 15 minutos debes tomar ${dose.medication}`, {
          duration: 8000,
          icon: '⏰',
        });
      }, timeUntilReminder);

      // Notificación en el momento exacto
      const timeUntilDose = doseTime.getTime() - now.getTime();
      setTimeout(() => {
        notifyDosePending(
          dose.medication,
          dose.dosage,
          dose.time,
          () => handleTaken(dose.id),
          () => handleMissed(dose.id)
        );
      }, timeUntilDose);
    }
  };

  // ...resto del componente
}
```

### Ejemplo 4: Flujo completo de adherencia

```tsx
import { useNotifications } from '../../hooks/useNotifications';

function AdherenceFlow() {
  const { success, warning, error, notifyAlarm } = useNotifications();

  const checkAdherence = async (patientId: number) => {
    try {
      const adherence = await api.getAdherence(patientId);

      if (adherence < 50) {
        // Adherencia crítica
        notifyAlarm(
          'Adherencia Crítica',
          `El paciente tiene solo ${adherence}% de adherencia`,
          undefined, // Persistente
          () => console.log('Alarma vista')
        );
      } else if (adherence < 80) {
        // Adherencia baja
        warning(`Adherencia baja: ${adherence}%`);
      } else {
        // Adherencia buena
        success(`Adherencia excelente: ${adherence}%`);
      }
    } catch (err) {
      error('Error al verificar adherencia');
    }
  };

  // ...resto del componente
}
```

## Personalización Global

La configuración global del Toaster está en [App.tsx](src/App.tsx):

```tsx
<Toaster
  position="top-right"
  reverseOrder={false}
  gutter={8}
  toastOptions={{
    duration: 4000,
    style: {
      background: '#363636',
      color: '#fff',
      padding: '16px',
      borderRadius: '8px',
    },
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
```

## Archivos del Sistema

- **[src/types/notifications.ts](src/types/notifications.ts)** - Tipos TypeScript
- **[src/hooks/useNotifications.ts](src/hooks/useNotifications.ts)** - Hook principal
- **[src/App.tsx](src/App.tsx)** - Configuración del Toaster
- **[src/examples/NotificationsExample.tsx](src/examples/NotificationsExample.tsx)** - Ejemplos de uso

## Próximos Pasos (Notificaciones Push)

Cuando quieras implementar notificaciones push, podrás:

1. Integrar con Firebase Cloud Messaging (FCM)
2. Crear un servicio de notificaciones push
3. Reutilizar el mismo hook `useNotifications` para mostrar las notificaciones cuando lleguen
4. Agregar persistencia para notificaciones no leídas

El sistema actual está diseñado para ser compatible con notificaciones push futuras.

## Soporte

Para más información sobre react-hot-toast: https://react-hot-toast.com/
