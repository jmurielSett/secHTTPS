import { ExpirationStatus } from './shared';

export enum NotificationResult {
  SENT = 'SENT',
  ERROR = 'ERROR'
}

export interface Notification {
  id: string;
  certificateId: string;
  sentAt: string;
  recipientEmails: string[];
  subject: string;
  expirationStatusAtTime: ExpirationStatus;
  result: NotificationResult;
  errorMessage: string | null;
}

export interface CreateNotificationDTO {
  certificateId: string;
  recipientEmails: string[];
  subject: string;
  expirationStatusAtTime: ExpirationStatus;
  result: NotificationResult;
  errorMessage?: string;
}

/**
 * Resultado del envío de notificaciones para un certificado
 */
export interface NotificationResultDetail {
  certificateId: string;
  certificateFileName: string;
  success: boolean;
  error?: string;
}

/**
 * Resumen de la ejecución del proceso de notificaciones
 */
export interface NotificationSummary {
  executedAt: string;
  totalCertificatesChecked: number;
  totalCertificatesNeedingNotification: number;
  totalNotificationsSent: number;
  totalNotificationsFailed: number;
  results: NotificationResultDetail[];
}