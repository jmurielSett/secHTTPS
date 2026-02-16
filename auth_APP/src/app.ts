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
    } catch (error) {
      console.error('❌ Error seeding admin user:', error);
      throw error;
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
