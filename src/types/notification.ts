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
