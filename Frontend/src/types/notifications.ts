export type NotificationType = 'success' | 'error' | 'warning' | 'info' | 'alarm';

export interface NotificationOptions {
  duration?: number; // en milisegundos, null = no se cierra automáticamente
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  icon?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface AlarmNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  timestamp: Date;
  timeout?: number;
  onDismiss?: () => void;
}
