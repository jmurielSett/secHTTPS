import { INotificationRepository } from '../../../infrastructure/persistence/NotificationRepository';
import { Notification, NotificationResult } from '../../../types/notification';
import { ExpirationStatus } from '../../../types/shared';

export interface GetNotificationsFilters {
  certificateId?: string;
  startDate?: string;
  endDate?: string;
  expirationStatus?: ExpirationStatus;
  result?: NotificationResult;
}

export class GetNotificationsUseCase {
  constructor(private readonly notificationRepository: INotificationRepository) {}

  async execute(filters: GetNotificationsFilters): Promise<{ total: number; notifications: Notification[] }> {
    const notifications = await this.notificationRepository.findAll(filters);

    return {
      total: notifications.length,
      notifications
    };
  }
}
