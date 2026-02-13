// Tipos compartidos entre múltiples dominios

export enum ExpirationStatus {
  NORMAL = 'NORMAL',
  WARNING = 'WARNING',
  EXPIRED = 'EXPIRED'
}

/**
 * Constantes de frecuencia para notificaciones de certificados
 * Define cada cuántas horas se debe enviar una notificación según el estado
 */
export const NOTIFICATION_FREQUENCY = {
  /** Frecuencia para certificados WARNING (≤ 7 días): cada 48 horas (2 días) */
  WARNING_HOURS: 48,
  /** Frecuencia para certificados EXPIRED: cada 24 horas (1 día) */
  EXPIRED_HOURS: 24
} as const;
