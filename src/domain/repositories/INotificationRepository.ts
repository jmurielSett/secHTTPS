import { Notification } from '../../types/notification';
import { GetNotificationsFilters } from '../usecases/notifications/GetNotificationsUseCase';

/**
 * Interfaz del repositorio de notificaciones
 * Define el contrato que debe cumplir cualquier implementación de persistencia
 * (Inversión de Dependencias - Clean Architecture)
 */
export interface INotificationRepository {
  save(notification: Notification): Promise<Notification>;
  findByCertificateId(certificateId: string): Promise<Notification[]>;
  findLastByCertificateId(certificateId: string): Promise<Notification | null>;
  findAll(filters?: GetNotificationsFilters): Promise<Notification[]>;
}
