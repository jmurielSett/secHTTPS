import * as trpcExpress from '@trpc/server/adapters/express';
import cors from 'cors';
import express, { Application } from 'express';
import { ICertificateRepository } from './domain/repositories/ICertificateRepository';
import { INotificationRepository } from './domain/repositories/INotificationRepository';
import { connectDatabase } from './infrastructure/database/connection';
import { requestLogger } from './infrastructure/middleware/requestLogger';
import { InMemoryCertificateRepository } from './infrastructure/persistence/CertificateRepository';
import { InMemoryNotificationRepository } from './infrastructure/persistence/NotificationRepository';
import { PostgresCertificateRepository } from './infrastructure/persistence/PostgresCertificateRepository';
import { PostgresNotificationRepository } from './infrastructure/persistence/PostgresNotificationRepository';
import { createCertificateRouter } from './infrastructure/transport/routes/certificateRoutes';
import { createNotificationRouter } from './infrastructure/transport/routes/notificationRoutes';
import { appRouter } from './infrastructure/trpc/routers';
import { TRPCContext } from './infrastructure/trpc/trpc';

export interface AppContext {
  app: Application;
  repositories: {
    certificateRepository: ICertificateRepository;
    notificationRepository: INotificationRepository;
  };
}

export async function createApp(usePostgres: boolean = false): Promise<AppContext> {
  // Connect to database if using PostgreSQL
  if (usePostgres) {
    await connectDatabase();
  }
  const app = express();
  
  // CORS para permitir llamadas desde el frontend
  const allowedOrigins = [
    process.env.CLIENT_URL || 'http://localhost:5173',
    'http://localhost:5173',
    'http://localhost:5174'
  ];
  
  app.use(cors({
    origin: (origin, callback) => {
      // Permitir peticiones sin origin (como Postman, curl, etc)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true
  }));
  
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
  
  // tRPC endpoint - Expone todos los procedimientos bajo /trpc
  app.use(
    '/trpc',
    trpcExpress.createExpressMiddleware({
      router: appRouter,
      createContext: (): TRPCContext => ({
        certificateRepository,
        notificationRepository
        // TODO: Agregar cuando se integre auth_APP:
        // userId: req.user?.id,
        // username: req.user?.username,
        // token: req.headers.authorization?.split(' ')[1]
      })
    })
  );
    
  // REST API endpoints (se mantienen para compatibilidad)
  app.use('/api/certif', createCertificateRouter(certificateRepository, notificationRepository));
  app.use('/api/notif', createNotificationRouter(certificateRepository, notificationRepository));
  
  return {
    app,
    repositories: {
      certificateRepository,
      notificationRepository
    }
  };
}
