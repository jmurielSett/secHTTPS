import * as trpcExpress from '@trpc/server/adapters/express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Application } from 'express';
import jwt from 'jsonwebtoken';
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
    credentials: true // IMPORTANTE: permite enviar/recibir cookies cross-origin
  }));
  
  // Middleware para parsear JSON
  app.use(express.json());
  
  // Middleware para parsear cookies (DEBE ir antes de las rutas)
  app.use(cookieParser());
  
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
  
  // JWT Configuration
  const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET!;
  const APPLICATION_NAME = process.env.APPLICATION_NAME || 'secHTTPS_APP';

  // tRPC endpoint - Expone todos los procedimientos bajo /trpc
  app.use(
    '/trpc',
    trpcExpress.createExpressMiddleware({
      router: appRouter,
      createContext: ({ req }): TRPCContext => {
        let userId: string | undefined;
        let username: string | undefined;
        let applicationName: string | undefined;
        let roles: string[] | undefined;

        // Extract access token from httpOnly cookie
        const accessToken = req.cookies.accessToken;

        if (accessToken) {
          try {
            const decoded = jwt.verify(accessToken, JWT_ACCESS_SECRET) as any;
            
            // Validate token type and application
            if (decoded.type === 'access') {
              // Validate that token is for this application
              if (!decoded.applicationName || decoded.applicationName === APPLICATION_NAME) {
                userId = decoded.userId;
                username = decoded.username;
                applicationName = decoded.applicationName;
                roles = decoded.roles || [];
              } else {
                console.warn(`[Auth] Token is for ${decoded.applicationName}, not ${APPLICATION_NAME}`);
              }
            }
          } catch (error: any) {
            // Token invalid or expired - context will have no user
            if (error.name === 'TokenExpiredError') {
              console.warn('[Auth] Access token expired');
            } else {
              console.warn('[Auth] Invalid access token:', error.message);
            }
          }
        }

        return {
          certificateRepository,
          notificationRepository,
          userId,
          username,
          applicationName,
          roles
        };
      }
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
