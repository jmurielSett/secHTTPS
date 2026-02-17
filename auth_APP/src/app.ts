import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import express, { Application } from 'express';
import { IUserRepository } from './domain/repositories/IUserRepository';
import { IPasswordHasher, ITokenService } from './domain/services';
import { VerifyUserAccessUseCase } from './domain/usecases/VerifyUserAccessUseCase';
import { MemoryCacheService } from './infrastructure/cache';
import { connectDatabase } from './infrastructure/database/connection';
import { seedAdminUser } from './infrastructure/database/seeds';
import { errorHandler } from './infrastructure/middleware/errorHandler';
import { InMemoryUserRepository } from './infrastructure/persistence/InMemoryUserRepository';
import { PostgresUserRepository } from './infrastructure/persistence/PostgresUserRepository';
import { JWTService } from './infrastructure/security/JWTService';
import { PasswordHasher } from './infrastructure/security/PasswordHasher';
import { createAdminRouter } from './infrastructure/transport/routes/adminRoutes';
import { createAuthRouter } from './infrastructure/transport/routes/authRoutes';
import { CACHE_CONFIG } from './types/shared';
import { logError } from './utils/logger';

// Cargar variables de entorno
dotenv.config();

export interface AppContext {
  app: Application;
  repositories: {
    userRepository: IUserRepository;
  };
  services: {
    tokenService: ITokenService;
    passwordHasher: IPasswordHasher;
    cacheService: MemoryCacheService;
  };
}

export async function createApp(usePostgres: boolean = false): Promise<AppContext> {
  // Connect to database if using PostgreSQL
  let pool;
  if (usePostgres) {
    pool = await connectDatabase();
  }

  const app = express();
  
  // CORS configuration - Allow requests from frontend applications
  const allowedOrigins = [
    'http://localhost:5173', // Vite dev server (secHTTPS_APP frontend)
    'http://localhost:5174', // Alternative Vite port
    'http://localhost:3000', // secHTTPS_APP backend
  ];

  app.use(cors({
    origin: allowedOrigins,
    credentials: true, // CRITICAL: Allow cookies to be sent/received
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));
  
  // Cookie parser middleware - Parse httpOnly cookies
  app.use(cookieParser());
  
  // Middleware para parsear JSON
  app.use(express.json());
  
  // Create service instances
  const tokenService = new JWTService();
  const passwordHasher = new PasswordHasher();
  
  // Create cache service (TTL matches Access Token duration for consistency)
  const cacheService = new MemoryCacheService(
    CACHE_CONFIG.TTL_SECONDS,
    CACHE_CONFIG.MAX_SIZE,
    CACHE_CONFIG.CLEANUP_INTERVAL_MS
  );
  
  // Create repository instances based on configuration
  let userRepository: IUserRepository;
  
  console.log(`🔍 DEBUG: usePostgres=${usePostgres}, pool=${pool ? 'defined' : 'undefined'}`);
  
  if (usePostgres && pool) {
    console.log('🔧 Using PostgreSQL repository and seeding admin user...');
    userRepository = new PostgresUserRepository(pool);
    
    // Seed admin user in PostgreSQL with RBAC roles (if not exists)
    try {
      await seedAdminUser(pool);
      console.log('✅ PostgreSQL admin user seed completed');
    } catch (err) {
      logError('❌ Error seeding admin user:', err instanceof Error ? err : undefined);
      throw err;
    }
    
  } else {
    console.log('🔧 Using In-Memory repository...');
    userRepository = new InMemoryUserRepository();
    
    // Seed admin user in memory for testing
    const { UserId } = await import('./domain/value-objects');
    const { UserRole } = await import('./types/user');
    
    const adminId = UserId.generate();
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123';
    const hashedPassword = await passwordHasher.hash(adminPassword);
    
    await userRepository.create({
      id: adminId.getValue(),
      email: process.env.ADMIN_EMAIL || 'admin@auth.com',
      username: process.env.ADMIN_USERNAME || 'admin',
      passwordHash: hashedPassword,
      role: UserRole.ADMIN,
      createdAt: new Date().toISOString()
    });
    
    console.log('✓ In-memory admin user created for testing');
  }
  
  // Mount routes
  app.use('/auth', createAuthRouter(userRepository, tokenService, passwordHasher, pool));
  
  // Mount admin routes (only for PostgreSQL with RBAC support)
  if (usePostgres && pool) {
    const verifyAccessUseCase = new VerifyUserAccessUseCase(userRepository, cacheService);
    app.use('/admin', createAdminRouter(pool, verifyAccessUseCase, userRepository, passwordHasher));
    console.log('✓ Admin routes mounted at /admin');
  }
  
  // Error handler middleware (debe ir al final)
  app.use(errorHandler);
  
  return {
    app,
    repositories: {
      userRepository
    },
    services: {
      tokenService,
      passwordHasher,
      cacheService
    }
  };
}
