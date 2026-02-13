import express, { Application } from 'express';
import { connectDatabase } from './infrastructure/database/connection';
import { requestLogger } from './infrastructure/middleware/requestLogger';
import { InMemoryCertificateRepository } from './infrastructure/persistence/CertificateRepository';
import { InMemoryNotificationRepository } from './infrastructure/persistence/NotificationRepository';
import { PostgresCertificateRepository } from './infrastructure/persistence/PostgresCertificateRepository';
import { PostgresNotificationRepository } from './infrastructure/persistence/PostgresNotificationRepository';
import { createCertificateRouter } from './infrastructure/transport/routes/certificateRoutes';
import { createNotificationRouter } from './infrastructure/transport/routes/notificationRoutes';

export async function createApp(usePostgres: boolean = false): Promise<Application> {
  // Connect to database if using PostgreSQL
  if (usePostgres) {
    await connectDatabase();
  }
  const app = express();
  
  // Middleware para parsear JSON
  app.use(express.json());
  
  // Middleware para logging de peticiones
  app.use(requestLogger);
  
  // Create repository instances based on configuration
  let certificateRepository;
  let notificationRepository;
  
  if (usePostgres) {
    certificateRepository = new PostgresCertificateRepository();
    notificationRepository = new PostgresNotificationRepository();
  } else {
    certificateRepository = new InMemoryCertificateRepository();
    notificationRepository = new InMemoryNotificationRepository();
  }
    
  app.use('/api/certif', createCertificateRouter(certificateRepository, notificationRepository));
  app.use('/api/notif', createNotificationRouter(certificateRepository, notificationRepository));
  
  return app;
}
