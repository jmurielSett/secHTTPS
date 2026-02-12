import express, { Application } from 'express';
import { requestLogger } from './infrastructure/middleware/requestLogger';
import { InMemoryCertificateRepository } from './infrastructure/persistence/CertificateRepository';
import { InMemoryNotificationRepository } from './infrastructure/persistence/NotificationRepository';
import { createCertificateRouter } from './infrastructure/transport/routes/certificateRoutes';
import { createNotificationRouter } from './infrastructure/transport/routes/notificationRoutes';

export function createApp(): Application {
  const app = express();

  // Middleware para parsear JSON
  app.use(express.json());

  // Middleware para logging de peticiones
  app.use(requestLogger);

  // Crear repositorios compartidos (singleton pattern)
  const certificateRepository = new InMemoryCertificateRepository();
  const notificationRepository = new InMemoryNotificationRepository();

  // Registrar rutas de certificados
  app.use('/api/certif', createCertificateRouter(certificateRepository, notificationRepository));
  
  // Registrar rutas de notificaciones
  app.use('/api/notif', createNotificationRouter(certificateRepository, notificationRepository));

  return app;
}
