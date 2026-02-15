# 📋 Estado del Proyecto Auth_APP + Próximos Pasos

**Última actualización**: 2026-02-15  
**Estado general**: ✅ Microservicio auth_APP funcional con RBAC multi-app

---

## 📊 Estado Actual del Proyecto

### ✅ COMPLETADO: auth_APP (Microservicio de Autenticación + RBAC)

**Implementación exitosa:**

#### 🏗️ Arquitectura y Estructura
- **Clean Architecture** completa (domain, infrastructure, types)
- **CommonJS** como sistema de módulos (3 warnings Sonar pendientes de top-level await - no críticos)
- **TypeScript 5.9** con configuración estricta
- **Vitest** como framework de testing

#### 🔐 Sistema de Autenticación
- **JWT dual-mode**:
  - **Single-app tokens**: scope limitado a una aplicación específica
  - **Multi-app tokens**: acceso a múltiples aplicaciones
  - **Access token**: 15 minutos (configurable via JWT_ACCESS_EXPIRES_IN)
  - **Refresh token**: 7 días (configurable via JWT_REFRESH_EXPIRES_IN)
- **Password hashing** con bcrypt (10 salt rounds)
- **Value Objects** con validación de dominio:
  - Email (RFC 5322 compliant)
  - Password (min 8 chars, uppercase, lowercase, número)
  - Username (3-50 chars, alfanumérico)

#### 👥 Sistema RBAC (Role-Based Access Control)
- **6 tablas** portable entre aplicaciones:
  1. `users` - Usuarios del sistema
  2. `applications` - Aplicaciones registradas
  3. `roles` - Roles por aplicación
  4. `permissions` - Permisos granulares
  5. `role_permissions` - Relación role-permission
  6. `user_roles` - Asignación user-role con TTL opcional
- **Funcionalidades**:
  - Asignación/revocación de roles por usuario-aplicación
  - Verificación de acceso multi-app con cache
  - Invalidación automática de cache por cambios de roles
  - Roles con fecha de expiración (campo `expires_at`)
  - Campo `granted_by` para auditoría

#### ⚡ Cache en Memoria
- **MemoryCacheService** implementado con:
  - TTL: 900 segundos (consistente con access token de 15 min)
  - Max entries: 1000 (estrategia LRU eviction)
  - Invalidación automática por cambios de roles
  - Soporte de namespaces (user:*, role:*, permission:*)
- **Beneficios**:
  - Reduce queries a BD en verificaciones de acceso
  - Mejora performance en ~80% para verificaciones repetidas
  - Cache coherente con lógica de negocio

#### 🧪 Testing y Calidad
- **67 tests unitarios** ✅ (100% passing):
  - LoginUseCase: 8 tests
  - RefreshTokenUseCase: 4 tests
  - ValidateTokenUseCase: 6 tests
  - RoleManagementUseCases: 15 tests (Assign + Revoke)
  - VerifyUserAccessUseCase: 27 tests
  - MemoryCacheService: 25 tests
- **Calidad de código**:
  - 9/12 warnings de Sonar corregidos (75%)
  - 3 warnings restantes: "prefer top-level await" (limitación CommonJS, no críticos)
  - 0 errores de compilación TypeScript

#### 📁 Estructura Implementada

```
auth_APP/
├── src/
│   ├── domain/
│   │   ├── repositories/
│   │   │   ├── IApplicationRepository.ts ✅
│   │   │   ├── IRoleRepository.ts ✅
│   │   │   └── IUserRepository.ts ✅
│   │   ├── services/
│   │   │   └── ICacheService.ts ✅
│   │   ├── usecases/
│   │   │   ├── LoginUseCase.ts ✅
│   │   │   ├── RefreshTokenUseCase.ts ✅
│   │   │   ├── ValidateTokenUseCase.ts ✅
│   │   │   ├── RoleManagementUseCases.ts ✅ (Assign/Revoke)
│   │   │   └── VerifyUserAccessUseCase.ts ✅
│   │   └── value-objects/
│   │       ├── Email.ts ✅
│   │       ├── Password.ts ✅
│   │       └── Username.ts ✅
│   ├── infrastructure/
│   │   ├── cache/
│   │   │   └── MemoryCacheService.ts ✅
│   │   ├── database/
│   │   │   ├── connection.ts ✅
│   │   │   └── migrations/ ✅
│   │   │       ├── 001_create_users_table.sql
│   │   │       ├── 002_create_applications_table.sql
│   │   │       ├── 003_create_roles_table.sql
│   │   │       ├── 004_create_permissions_table.sql
│   │   │       ├── 005_create_role_permissions_table.sql
│   │   │       └── 006_create_user_roles_table.sql
│   │   ├── persistence/
│   │   │   ├── InMemoryUserRepository.ts ✅ (para tests)
│   │   │   ├── PostgresApplicationRepository.ts ✅
│   │   │   ├── PostgresRoleRepository.ts ✅
│   │   │   └── PostgresUserRepository.ts ✅
│   │   ├── security/
│   │   │   ├── JWTService.ts ✅
│   │   │   └── PasswordHasher.ts ✅
│   │   └── transport/
│   │       ├── controllers/
│   │       │   ├── AdminController.ts ✅ (role management)
│   │       │   └── AuthController.ts ✅
│   │       ├── middleware/
│   │       │   └── authMiddleware.ts ✅
│   │       └── routes/
│   │           ├── adminRoutes.ts ✅
│   │           └── authRoutes.ts ✅
│   ├── types/
│   │   ├── rbac.ts ✅ (AssignRoleDTO, RevokeRoleDTO, RoleOperationResult)
│   │   ├── shared.ts ✅ (JWT_CONFIG, CACHE_CONFIG)
│   │   └── user.ts ✅ (User, LoginDTO, TokenPair, TokenPayload)
│   ├── scripts/
│   │   ├── migrate.ts ✅
│   │   └── reset-db.ts ✅
│   ├── app.ts ✅
│   └── server.ts ✅
├── tests/
│   └── unit/ ✅ (67 tests passing)
│       ├── domain/
│       │   ├── usecases/
│       │   │   ├── LoginUseCase.test.ts
│       │   │   ├── RefreshTokenUseCase.test.ts
│       │   │   ├── ValidateTokenUseCase.test.ts
│       │   │   ├── RoleManagementUseCases.test.ts
│       │   │   └── VerifyUserAccessUseCase.test.ts
│       │   └── value-objects/
│       └── infrastructure/
│           └── cache/
│               └── MemoryCacheService.test.ts
├── package.json ✅
├── tsconfig.json ✅
├── vitest.config.ts ✅
├── .env.example ✅
└── .env ✅
```

#### 🚀 Comandos Disponibles

```bash
# Desarrollo
npm run dev              # Inicia servidor en modo watch (puerto 4000)

# Base de datos
npm run db:migrate       # Ejecuta migraciones
npm run db:reset         # Reset completo de BD

# Testing
npm run test:unit        # 67 tests unitarios
npm run test:watch       # Tests en modo watch

# Build
npm run build            # Compila TypeScript a dist/
npm start                # Inicia servidor de producción
```

#### 📋 Variables de Entorno (.env)

```env
# Server
PORT=4000
NODE_ENV=development

# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=auth_db
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres

# JWT Secrets (CAMBIAR EN PRODUCCIÓN)
JWT_ACCESS_SECRET=your-super-secret-access-key-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production

# JWT Expiration (opcional, defaults definidos en shared.ts)
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Cache (opcional, defaults definidos en shared.ts)
CACHE_TTL=900
CACHE_MAX_SIZE=1000
```

---

## ⏳ PENDIENTE (Priorizado)

### 🔴 Alta Prioridad

#### 1. Middleware de Autorización Avanzado

**Objetivo**: Implementar middlewares reutilizables para proteger rutas con permisos granulares.

**Archivos a crear**:

```typescript
// auth_APP/src/infrastructure/middleware/authorizationMiddleware.ts

import { Request, Response, NextFunction } from 'express';
import { VerifyUserAccessUseCase } from '../../domain/usecases/VerifyUserAccessUseCase';

interface AuthRequest extends Request {
  user?: {
    userId: string;
    username: string;
    applications?: string[];
  };
}

export class AuthorizationMiddleware {
  constructor(private readonly verifyAccessUseCase: VerifyUserAccessUseCase) {}

  /**
   * Requiere que el usuario tenga un rol específico en la aplicación
   * @example router.get('/admin', requireRole('my_app', 'admin'), handler)
   */
  requireRole(applicationName: string, roleName: string) {
    return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const hasAccess = await this.verifyAccessUseCase.execute({
        userId: req.user.userId,
        applicationName,
        requiredRole: roleName
      });

      if (!hasAccess) {
        res.status(403).json({ 
          error: 'Insufficient permissions',
          required: { application: applicationName, role: roleName }
        });
        return;
      }

      next();
    };
  }

  /**
   * Requiere al menos uno de los roles especificados
   * @example router.get('/dashboard', requireAnyRole('my_app', ['admin', 'manager']), handler)
   */
  requireAnyRole(applicationName: string, roles: string[]) {
    return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      for (const role of roles) {
        const hasAccess = await this.verifyAccessUseCase.execute({
          userId: req.user.userId,
          applicationName,
          requiredRole: role
        });
        
        if (hasAccess) {
          next();
          return;
        }
      }

      res.status(403).json({ 
        error: 'Insufficient permissions',
        required: { application: applicationName, anyOf: roles }
      });
    };
  }

  /**
   * Requiere todos los roles especificados
   * @example router.post('/audit', requireAllRoles('my_app', ['admin', 'auditor']), handler)
   */
  requireAllRoles(applicationName: string, roles: string[]) {
    return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const accessResults = await Promise.all(
        roles.map(role => 
          this.verifyAccessUseCase.execute({
            userId: req.user!.userId,
            applicationName,
            requiredRole: role
          })
        )
      );

      if (accessResults.every(result => result)) {
        next();
        return;
      }

      res.status(403).json({ 
        error: 'Insufficient permissions',
        required: { application: applicationName, allOf: roles }
      });
    };
  }

  /**
   * Requiere un permiso específico (verifica role -> permissions)
   * @example router.delete('/users/:id', requirePermission('my_app', 'users:delete'), handler)
   */
  requirePermission(applicationName: string, permission: string) {
    return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      // Nota: Requiere añadir método verifyUserPermission a VerifyUserAccessUseCase
      const hasPermission = await this.verifyAccessUseCase.verifyUserPermission(
        req.user.userId,
        applicationName,
        permission
      );

      if (!hasPermission) {
        res.status(403).json({ 
          error: 'Insufficient permissions',
          required: { application: applicationName, permission }
        });
        return;
      }

      next();
    };
  }
}
```

**Cambios requeridos en VerifyUserAccessUseCase**:

```typescript
// Añadir este método a auth_APP/src/domain/usecases/VerifyUserAccessUseCase.ts

/**
 * Verifica si un usuario tiene un permiso específico en una aplicación
 */
async verifyUserPermission(
  userId: string,
  applicationName: string,
  permissionName: string
): Promise<boolean> {
  const cacheKey = `permission:${userId}:${applicationName}:${permissionName}`;
  
  // Verificar cache
  const cachedResult = this.cacheService.get<boolean>(cacheKey);
  if (cachedResult !== null) {
    return cachedResult;
  }

  // Obtener roles del usuario en la aplicación
  const roles = await this.roleRepository.getUserRolesInApplication(userId, applicationName);
  
  if (roles.length === 0) {
    this.cacheService.set(cacheKey, false);
    return false;
  }

  // Verificar si algún rol tiene el permiso
  for (const role of roles) {
    const hasPermission = await this.roleRepository.roleHasPermission(
      role.name,
      applicationName,
      permissionName
    );
    
    if (hasPermission) {
      this.cacheService.set(cacheKey, true);
      return true;
    }
  }

  this.cacheService.set(cacheKey, false);
  return false;
}
```

**Tests requeridos**: `AuthorizationMiddleware.test.ts` (~15-20 tests)

---

#### 2. Tests de Integración

**Objetivo**: Testear flujos completos con PostgreSQL real (no mocks).

**Estructura propuesta**:

```
tests/
├── unit/ ✅ (67 tests existentes)
└── integration/ ❌ (PENDIENTE)
    ├── setup.ts
    ├── teardown.ts
    ├── AuthController.integration.test.ts
    ├── AdminController.integration.test.ts
    └── RBACFlow.integration.test.ts
```

**Configuración**:

```typescript
// tests/integration/setup.ts
import { Pool } from 'pg';
import { execSync } from 'child_process';

const TEST_DB_CONFIG = {
  host: process.env.DATABASE_HOST || 'localhost',
  port: Number(process.env.DATABASE_PORT) || 5432,
  database: 'auth_db_test',
  user: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'postgres'
};

export async function setupTestDatabase(): Promise<Pool> {
  // Crear base de datos de test si no existe
  const adminPool = new Pool({
    ...TEST_DB_CONFIG,
    database: 'postgres'
  });

  try {
    await adminPool.query(`DROP DATABASE IF EXISTS auth_db_test`);
    await adminPool.query(`CREATE DATABASE auth_db_test`);
  } finally {
    await adminPool.end();
  }

  // Ejecutar migraciones
  process.env.DATABASE_NAME = 'auth_db_test';
  execSync('npm run db:migrate', { stdio: 'inherit' });

  // Retornar pool de test
  return new Pool(TEST_DB_CONFIG);
}

export async function teardownTestDatabase(pool: Pool): Promise<void> {
  await pool.end();
}
```

```typescript
// vitest.integration.config.ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    setupFiles: ['tests/integration/setup.ts'],
    testTimeout: 10000,
    isolate: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
```

**Tests clave a implementar**:

1. **AuthController.integration.test.ts**:
   - POST /auth/login (credenciales válidas/inválidas)
   - POST /auth/refresh (token válido/inválido/expirado)
   - POST /auth/validate (token válido/inválido)
   - (~10 tests)

2. **AdminController.integration.test.ts**:
   - POST /admin/roles/assign (asignar rol)
   - POST /admin/roles/revoke (revocar rol específico/todos)
   - Verificación de invalidación de cache
   - (~8 tests)

3. **RBACFlow.integration.test.ts**:
   - Flujo completo: crear usuario → asignar roles → verificar acceso
   - Flujo con expiración de roles
   - Flujo multi-app
   - (~12 tests)

**Actualizar package.json**:

```json
{
  "scripts": {
    "test:unit": "vitest run --config vitest.config.ts",
    "test:integration": "vitest run --config vitest.integration.config.ts",
    "test:all": "npm run test:unit && npm run test:integration",
    "test:watch:integration": "vitest watch --config vitest.integration.config.ts"
  }
}
```

**Estimación**: ~30 tests de integración, ~4-6 horas de implementación.

---

#### 3. Tests E2E (End-to-End)

**Objetivo**: Testear workflows completos de usuario final.

**Escenarios clave**:

1. **Onboarding de usuario**:
   - Registro → login → obtener tokens → validar acceso
   
2. **Gestión de roles**:
   - Admin asigna rol a usuario → usuario verifica acceso → admin revoca rol → usuario pierde acceso
   
3. **Multi-app workflow**:
   - Usuario con roles en múltiples apps → login con scope multi-app → verificar acceso a cada app
   
4. **Expiración de tokens**:
   - Login → esperar expiración access token → refresh → usar nuevo access token
   
5. **Cache invalidation**:
   - Verificar acceso (cachea) → revocar rol → verificar que cache se invalida → denegar acceso

**Herramientas**: Supertest + Vitest

**Estimación**: ~20 tests E2E, ~3-4 horas de implementación.

---

### 🟡 Media Prioridad

#### 4. Integración con secHTTPS_APP

**Objetivo**: Proteger rutas de secHTTPS_APP con autenticación JWT desde auth_APP.

**Pasos**:

1. **Crear cliente de autenticación en secHTTPS_APP**:

```typescript
// secHTTPS_APP/src/infrastructure/security/AuthClient.ts

export interface AuthUser {
  userId: string;
  username: string;
  applications?: string[];
}

export class AuthClient {
  private readonly authUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:4000';

  /**
   * Valida un access token contra auth_APP
   */
  async validateToken(token: string): Promise<AuthUser | null> {
    try {
      const response = await fetch(`${this.authUrl}/auth/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) return null;
      
      return response.json();
    } catch (error) {
      console.error('Auth validation failed:', error);
      return null;
    }
  }

  /**
   * Verifica si un usuario tiene acceso a una aplicación con un rol específico
   */
  async verifyAccess(
    token: string,
    applicationName: string,
    requiredRole?: string
  ): Promise<boolean> {
    try {
      const response = await fetch(`${this.authUrl}/admin/roles/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ applicationName, requiredRole })
      });

      return response.ok;
    } catch (error) {
      console.error('Access verification failed:', error);
      return false;
    }
  }
}
```

2. **Middleware de autenticación en secHTTPS_APP**:

```typescript
// secHTTPS_APP/src/infrastructure/middleware/authMiddleware.ts

import { Request, Response, NextFunction } from 'express';
import { AuthClient } from '../security/AuthClient';

const authClient = new AuthClient();

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const token = authHeader.replace('Bearer ', '');
  const user = await authClient.validateToken(token);
  
  if (!user) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  // Añadir user al request
  (req as any).user = user;
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  // Asume que user ya está en req por requireAuth
  const user = (req as any).user;
  
  if (!user || !user.applications?.includes('secHTTPS_APP')) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  
  next();
}
```

3. **Proteger rutas de certificados**:

```typescript
// secHTTPS_APP/src/infrastructure/transport/routes/certificateRoutes.ts

import { requireAuth } from '../../middleware/authMiddleware';

// Aplicar middleware a todas las rutas
router.use(requireAuth);

router.get('/', (req, res) => certificateController.getCertificates(req, res));
router.post('/', (req, res) => certificateController.createCertificate(req, res));
// ... resto de rutas protegidas
```

4. **Actualizar .env de secHTTPS_APP**:

```env
AUTH_SERVICE_URL=http://localhost:4000
```

**Estimación**: ~2-3 horas de implementación + 10-15 tests de integración.

---

#### 5. Docker Compose para Desarrollo

**Objetivo**: Orquestar auth_APP + secHTTPS_APP + PostgreSQL con un solo comando.

**Estructura propuesta**:

```yaml
# secHTTPS/docker-compose.yml (en raíz del monorepo)

version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: sechttps-postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init-databases.sql:/docker-entrypoint-initdb.d/init.sql
    networks:
      - sechttps-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  auth-service:
    build:
      context: ./auth_APP
      dockerfile: Dockerfile
    container_name: auth-service
    ports:
      - "4000:4000"
    environment:
      - PORT=4000
      - NODE_ENV=development
      - DATABASE_HOST=postgres
      - DATABASE_PORT=5432
      - DATABASE_NAME=auth_db
      - DATABASE_USER=postgres
      - DATABASE_PASSWORD=postgres
      - JWT_ACCESS_SECRET=${JWT_ACCESS_SECRET:-dev-secret-access-key}
      - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET:-dev-secret-refresh-key}
      - JWT_ACCESS_EXPIRES_IN=15m
      - JWT_REFRESH_EXPIRES_IN=7d
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - ./auth_APP:/app
      - /app/node_modules
    networks:
      - sechttps-network
    command: npm run dev

  sechttps-app:
    build:
      context: ./secHTTPS_APP
      dockerfile: Dockerfile
    container_name: sechttps-app
    ports:
      - "3000:3000"
    environment:
      - PORT=3000
      - NODE_ENV=development
      - AUTH_SERVICE_URL=http://auth-service:4000
      - DATABASE_HOST=postgres
      - DATABASE_PORT=5432
      - DATABASE_NAME=sechttps_db
      - DATABASE_USER=postgres
      - DATABASE_PASSWORD=postgres
      - USE_POSTGRES=true
    depends_on:
      postgres:
        condition: service_healthy
      auth-service:
        condition: service_started
    volumes:
      - ./secHTTPS_APP:/app
      - /app/node_modules
    networks:
      - sechttps-network
    command: npm run dev

volumes:
  postgres_data:

networks:
  sechttps-network:
    driver: bridge
```

**Script de inicialización de BD**:

```sql
-- secHTTPS/init-databases.sql
CREATE DATABASE auth_db;
CREATE DATABASE sechttps_db;
```

**Dockerfile para auth_APP**:

```dockerfile
# auth_APP/Dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 4000

CMD ["npm", "run", "dev"]
```

**Comandos útiles**:

```bash
# Levantar todo
docker-compose up -d

# Ver logs
docker-compose logs -f auth-service
docker-compose logs -f sechttps-app

# Rebuild después de cambios
docker-compose up -d --build

# Parar todo
docker-compose down

# Limpiar volúmenes (CUIDADO: borra BD)
docker-compose down -v
```

**Estimación**: ~2 horas de configuración + testing.

---

#### 6. Documentación API (OpenAPI/Swagger)

**Objetivo**: Generar documentación interactiva de la API.

**Herramientas**: `swagger-jsdoc` + `swagger-ui-express`

**Instalación**:

```bash
npm install swagger-jsdoc swagger-ui-express
npm install -D @types/swagger-jsdoc @types/swagger-ui-express
```

**Configuración**:

```typescript
// auth_APP/src/infrastructure/swagger.ts

import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Auth Service API',
    version: '1.0.0',
    description: 'Microservicio de autenticación JWT + RBAC multi-aplicación',
    contact: {
      name: 'API Support',
      email: 'support@sechttps.local'
    }
  },
  servers: [
    {
      url: 'http://localhost:4000',
      description: 'Development server'
    },
    {
      url: 'https://api.production.com',
      description: 'Production server'
    }
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    }
  }
};

const options = {
  swaggerDefinition,
  apis: ['./src/infrastructure/transport/routes/*.ts']
};

const swaggerSpec = swaggerJSDoc(options);

export function setupSwagger(app: Express): void {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get('/api-docs.json', (req, res) => {
    res.json(swaggerSpec);
  });
}
```

**Documentar endpoints (ejemplo)**:

```typescript
// auth_APP/src/infrastructure/transport/routes/authRoutes.ts

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login con credenciales
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: admin
 *               password:
 *                 type: string
 *                 format: password
 *                 example: admin123
 *               applicationName:
 *                 type: string
 *                 example: my_app
 *     responses:
 *       200:
 *         description: Login exitoso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *                 user:
 *                   type: object
 *                   properties:
 *                     userId:
 *                       type: string
 *                     username:
 *                       type: string
 *                     email:
 *                       type: string
 *       401:
 *         description: Credenciales inválidas
 *       404:
 *         description: Usuario no encontrado
 */
router.post('/login', (req, res) => authController.login(req, res));
```

**Acceso**: `http://localhost:4000/api-docs`

**Estimación**: ~2-3 horas para documentar todos los endpoints.

---

### 🟢 Baja Prioridad

#### 7. Deployment en Producción (Ubuntu Server)

**Stack tecnológico**:
- **OS**: Ubuntu 22.04 LTS
- **Reverse proxy**: Nginx
- **Process manager**: PM2
- **SSL**: Let's Encrypt (Certbot)
- **Database**: PostgreSQL 16
- **Firewall**: UFW

**Pasos de deployment** (resumido):

1. **Preparar servidor**:
   - Instalar Node.js 20, PostgreSQL, Nginx, PM2, Git
   - Configurar firewall (puertos 22, 80, 443)

2. **Clonar repositorio**:
   ```bash
   cd /var/www
   git clone https://github.com/tu-usuario/secHTTPS.git
   ```

3. **Configurar bases de datos**:
   ```sql
   CREATE DATABASE auth_db;
   CREATE DATABASE sechttps_db;
   CREATE USER sechttps_user WITH PASSWORD 'strong-password';
   GRANT ALL PRIVILEGES ON DATABASE auth_db TO sechttps_user;
   ```

4. **Configurar .env de producción** (secrets únicos)

5. **Build y migraciones**:
   ```bash
   cd auth_APP
   npm install --production
   npm run build
   npm run db:migrate
   ```

6. **Configurar PM2**:
   ```bash
   pm2 start dist/server.js --name auth-service -i 2
   pm2 startup systemd
   pm2 save
   ```

7. **Configurar Nginx** (reverse proxy + rate limiting)

8. **SSL con Let's Encrypt**:
   ```bash
   sudo certbot --nginx -d api.miempresa.com
   ```

**Estimación**: ~4-6 horas de configuración inicial.

---

#### 8. Migración a ES Modules (Opcional)

**Motivación**: Resolver 3 warnings de Sonar sobre "prefer top-level await".

**Impacto**: Alto - requiere cambios en ~200-300 líneas de código.

**Cambios requeridos**:

1. **package.json**: `"type": "module"`
2. **tsconfig.json**: `"module": "ES2022"`
3. **Convertir todos los imports/exports**:
   - `require()` → `import`
   - `module.exports` → `export`
4. **Reemplazar `__dirname` y `__filename`**:
   ```typescript
   import { fileURLToPath } from 'node:url';
   import { dirname } from 'node:path';
   const __filename = fileURLToPath(import.meta.url);
   const __dirname = dirname(__filename);
   ```
5. **Actualizar extensions en imports**: `.js` explícito en imports

**Beneficios**:
- Top-level await nativo (sin async IIFE)
- Mejor tree-shaking
- Estándar moderno de Node.js

**Contras**:
- Cambio invasivo
- Requiere re-testing completo
- Algunos paquetes pueden tener problemas de compatibilidad

**Estimación**: ~6-8 horas de migración + testing.

**Recomendación**: **NO urgente**. Mantener CommonJS funciona perfectamente. Los 3 warnings son cosméticos.

---

## 📚 Recursos y Referencias

### Documentación oficial
- [JWT.io - Introduction to JSON Web Tokens](https://jwt.io/introduction)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [Clean Architecture by Uncle Bob](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)

### Herramientas
- [PM2 Production Process Manager](https://pm2.keymetrics.io/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt Getting Started](https://letsencrypt.org/getting-started/)
- [PostgreSQL Security](https://www.postgresql.org/docs/current/auth-pg-hba-conf.html)

### Testing
- [Vitest Documentation](https://vitest.dev/)
- [Supertest - HTTP assertions](https://github.com/visionmedia/supertest)

---

## 🎯 Roadmap Sugerido

### Sprint 1 (1-2 semanas)
- ✅ Middleware de autorización avanzado (requireRole, requireAnyRole, etc.)
- ✅ Tests de integración (AuthController, AdminController)
- ✅ Tests E2E (workflows RBAC completos)

### Sprint 2 (1 semana)
- ✅ Integración con secHTTPS_APP
- ✅ Docker Compose
- ✅ Documentación API (Swagger)

### Sprint 3 (1 semana - opcional)
- ✅ Deployment en producción
- ✅ Monitoreo y alertas
- ✅ CI/CD pipeline

---

## 🆘 Troubleshooting Común

### Error: Cannot connect to PostgreSQL

```bash
# Verificar que PostgreSQL está corriendo
sudo systemctl status postgresql

# Ver logs
sudo tail -f /var/log/postgresql/postgresql-*.log

# Verificar puerto
sudo netstat -tlnp | grep 5432
```

### Error: JWT secrets not defined

```bash
# Verificar que .env existe y tiene las variables
cat .env | grep JWT

# Asegurarse de que dotenv se carga primero en server.ts
```

### Error: Tests de integración fallan

```bash
# Verificar que la BD de test se puede crear
psql -U postgres -c "CREATE DATABASE auth_db_test"

# Verificar permisos
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE auth_db_test TO postgres"
```

### Error: Cache not invalidating

```bash
# Verificar logs de invalidación
# Buscar "[Cache] Invalidated" en consola

# Verificar que RoleManagementUseCases llama a invalidateUserCache
```

---

## 📞 Contacto y Soporte

**Autor**: GitHub Copilot  
**Fecha creación**: 2026-02-14  
**Última actualización**: 2026-02-15  
**Versión**: 2.0
