import { Router } from 'express';
import { CreateNotificationUseCase } from '../../../domain/usecases/notifications/CreateNotificationUseCase';
import { GetNotificationsUseCase } from '../../../domain/usecases/notifications/GetNotificationsUseCase';
import { ICertificateRepository } from '../../persistence/CertificateRepository';
import { INotificationRepository } from '../../persistence/NotificationRepository';
import { NotificationController } from '../controllers/NotificationController';

export function createNotificationRouter(
  certificateRepository: ICertificateRepository,
  notificationRepository: INotificationRepository
): Router {
  const router = Router();
  
  // Create use cases
  const createNotificationUseCase = new CreateNotificationUseCase(
    certificateRepository,
    notificationRepository
  );
  const getNotificationsUseCase = new GetNotificationsUseCase(notificationRepository);
  
  // Create controller
  const notificationController = new NotificationController(
    createNotificationUseCase,
    getNotificationsUseCase
  );
  
  // Register routes
  router.get('/', (req, res) => notificationController.getNotifications(req, res));
  router.post('/', (req, res) => notificationController.createNotification(req, res));
  
  return router;
}
