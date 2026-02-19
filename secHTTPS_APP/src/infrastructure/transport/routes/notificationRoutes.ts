import { Router } from 'express';
import { ICertificateRepository } from '../../../domain/repositories/ICertificateRepository';
import { INotificationRepository } from '../../../domain/repositories/INotificationRepository';
import { CreateNotificationUseCase } from '../../../domain/usecases/notifications/CreateNotificationUseCase';
import { GetNotificationsUseCase } from '../../../domain/usecases/notifications/GetNotificationsUseCase';
import { authMiddleware } from '../../middleware/authMiddleware';
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
  
  // Register routes — all protected by JWT
  router.get('/', authMiddleware, (req, res) => notificationController.getNotifications(req, res));
  router.post('/', authMiddleware, (req, res) => notificationController.createNotification(req, res));
  
  return router;
}
