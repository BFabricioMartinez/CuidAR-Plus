import { useNotifications } from '../hooks/useNotifications';

/**
 * EJEMPLOS DE USO DEL SISTEMA DE NOTIFICACIONES
 *
 * Este componente muestra diferentes casos de uso del hook useNotifications
 */
export default function NotificationsExample() {
  const {
    success,
    error,
    warning,
    info,
    notify,
    notifyAlarm,
    notifyDosePending,
    dismissAll,
  } = useNotifications();

  // ============================================
  // EJEMPLO 1: Notificaciones básicas
  // ============================================
  const handleBasicNotifications = () => {
    success('Operación exitosa');
    error('Ocurrió un error');
    warning('Ten cuidado con esta acción');
    info('Información importante');
  };

  // ============================================
  // EJEMPLO 2: Notificación personalizada
  // ============================================
  const handleCustomNotification = () => {
    notify('Mensaje personalizado', 'warning', {
      duration: 6000,
      position: 'top-center',
      icon: '🚀',
    });
  };

  // ============================================
  // EJEMPLO 3: Alarma con timeout automático
  // ============================================
  const handleAlarmWithTimeout = () => {
    notifyAlarm(
      'Recordatorio Importante',
      'Esta alarma se cerrará automáticamente en 10 segundos',
      10000, // 10 segundos
      () => {
        console.log('La alarma fue cerrada');
      }
    );
  };

  // ============================================
  // EJEMPLO 4: Alarma persistente (sin timeout)
  // ============================================
  const handlePersistentAlarm = () => {
    notifyAlarm(
      'Atención Urgente',
      'Esta alarma permanecerá hasta que la descartes manualmente',
      undefined, // Sin timeout
      () => {
        console.log('Alarma descartada manualmente');
      }
    );
  };

  // ============================================
  // EJEMPLO 5: Notificación de dosis pendiente
  // ============================================
  const handleDoseNotification = () => {
    notifyDosePending(
      'Paracetamol',
      '500mg',
      '14:30',
      () => {
        // Callback cuando se marca como tomada
        console.log('Dosis marcada como tomada');
        success('Dosis registrada correctamente');
      },
      () => {
        // Callback cuando se marca como omitida
        console.log('Dosis marcada como omitida');
        warning('Dosis omitida');
      }
    );
  };

  // ============================================
  // EJEMPLO 6: Alarmas programadas con setInterval
  // ============================================
  const handleScheduledAlarms = () => {
    // Simular verificación periódica de medicamentos
    const checkMedications = setInterval(() => {
      const now = new Date();
      const hour = now.getHours();
      const minute = now.getMinutes();

      // Ejemplo: Alarma a las 14:30
      if (hour === 14 && minute === 30) {
        notifyDosePending(
          'Aspirina',
          '100mg',
          '14:30',
          () => console.log('Aspirina tomada'),
          () => console.log('Aspirina omitida')
        );
        clearInterval(checkMedications);
      }
    }, 60000); // Verificar cada minuto

    // Limpiar después de 1 hora
    setTimeout(() => clearInterval(checkMedications), 3600000);

    info('Sistema de alarmas activado');
  };

  // ============================================
  // EJEMPLO 7: Notificación con posiciones diferentes
  // ============================================
  const handlePositionedNotifications = () => {
    notify('Top Left', 'info', { position: 'top-left' });
    notify('Top Center', 'info', { position: 'top-center' });
    notify('Top Right', 'info', { position: 'top-right' });

    setTimeout(() => {
      notify('Bottom Left', 'success', { position: 'bottom-left' });
      notify('Bottom Center', 'success', { position: 'bottom-center' });
      notify('Bottom Right', 'success', { position: 'bottom-right' });
    }, 500);
  };

  // ============================================
  // EJEMPLO 8: Simular flujo de alarma de medicación
  // ============================================
  const handleMedicationFlow = () => {
    // 1. Notificar 15 minutos antes
    info('Recordatorio: En 15 minutos debes tomar tu medicación', {
      duration: 10000,
      icon: '⏰',
    });

    // 2. Notificar en el momento exacto
    setTimeout(() => {
      notifyDosePending(
        'Omeprazol',
        '20mg',
        new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
        () => {
          success('¡Excelente! Dosis registrada');
        },
        () => {
          warning('Dosis omitida. Recuerda tomarla más tarde.');
        }
      );
    }, 3000); // Simular 15 minutos (reducido a 3 segundos para el ejemplo)
  };

  return (
    <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '30px' }}>Sistema de Notificaciones - Ejemplos</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <button onClick={handleBasicNotifications} style={styles.button}>
          1. Notificaciones Básicas
        </button>

        <button onClick={handleCustomNotification} style={styles.button}>
          2. Notificación Personalizada
        </button>

        <button onClick={handleAlarmWithTimeout} style={styles.button}>
          3. Alarma con Timeout (10 seg)
        </button>

        <button onClick={handlePersistentAlarm} style={styles.button}>
          4. Alarma Persistente
        </button>

        <button onClick={handleDoseNotification} style={styles.button}>
          5. Notificación de Dosis
        </button>

        <button onClick={handleScheduledAlarms} style={styles.button}>
          6. Activar Alarmas Programadas
        </button>

        <button onClick={handlePositionedNotifications} style={styles.button}>
          7. Notificaciones en Diferentes Posiciones
        </button>

        <button onClick={handleMedicationFlow} style={styles.button}>
          8. Simular Flujo de Medicación
        </button>

        <button onClick={dismissAll} style={{ ...styles.button, background: '#ef4444' }}>
          Cerrar Todas las Notificaciones
        </button>
      </div>

      <div style={styles.codeExample}>
        <h3>Código de Ejemplo Básico:</h3>
        <pre style={styles.code}>
{`import { useNotifications } from '../hooks/useNotifications';

function MiComponente() {
  const { success, notifyDosePending } = useNotifications();

  const handleSuccess = () => {
    success('¡Operación exitosa!');
  };

  const handleDoseReminder = () => {
    notifyDosePending(
      'Paracetamol',
      '500mg',
      '14:30',
      () => console.log('Tomada'),
      () => console.log('Omitida')
    );
  };

  return (
    <div>
      <button onClick={handleSuccess}>Mostrar éxito</button>
      <button onClick={handleDoseReminder}>Recordar dosis</button>
    </div>
  );
}`}
        </pre>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  button: {
    padding: '12px 24px',
    fontSize: '16px',
    background: '#667eea',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  codeExample: {
    marginTop: '40px',
    padding: '20px',
    background: '#f3f4f6',
    borderRadius: '8px',
  },
  code: {
    background: '#1f2937',
    color: '#fff',
    padding: '20px',
    borderRadius: '8px',
    overflow: 'auto',
    fontSize: '14px',
    fontFamily: 'monospace',
  },
};
