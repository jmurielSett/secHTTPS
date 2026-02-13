import { GetNotificationsFilters } from '../../domain/usecases/notifications/GetNotificationsUseCase';
import { Notification } from '../../types/notification';

export interface INotificationRepository {
  save(notification: Notification): Promise<Notification>;
  findByCertificateId(certificateId: string): Promise<Notification[]>;
  findLastByCertificateId(certificateId: string): Promise<Notification | null>;
  findAll(filters?: GetNotificationsFilters): Promise<Notification[]>;
}

export class InMemoryNotificationRepository implements INotificationRepository {
  private readonly notifications = new Map<string, Notification>();

  async save(notification: Notification): Promise<Notification> {
    this.notifications.set(notification.id, notification);
    return notification;
  }

  async findByCertificateId(certificateId: string): Promise<Notification[]> {
    return Array.from(this.notifications.values())
      .filter(n => n.certificateId === certificateId)
      .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
  }

  async findLastByCertificateId(certificateId: string): Promise<Notification | null> {
    const notifications = await this.findByCertificateId(certificateId);
    return notifications.length > 0 ? notifications[0] : null;
  }

  async findAll(filters?: GetNotificationsFilters): Promise<Notification[]> {
    let results = Array.from(this.notifications.values());

    // Aplicar filtros
    if (filters) {
      if (filters.certificateId) {
        results = results.filter(n => n.certificateId === filters.certificateId);
      }

      if (filters.result) {
        results = results.filter(n => n.result === filters.result);
      }

      if (filters.expirationStatus) {
        results = results.filter(n => n.expirationStatusAtTime === filters.expirationStatus);
      }

      if (filters.startDate) {
        results = results.filter(n => new Date(n.sentAt) >= new Date(filters.startDate!));
      }

      if (filters.endDate) {
        results = results.filter(n => new Date(n.sentAt) <= new Date(filters.endDate!));
      }
    }

    // Ordenar por fecha de envío descendente
    return results.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
  }
}
