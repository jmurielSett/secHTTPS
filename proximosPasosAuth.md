# 📋 Próximos pasos: Microservicio Auth + secHTTPS

## 🗂️ Estructura de Monorepo (MUY normal y recomendada)

Tu propuesta es **perfecta** y muy común en proyectos profesionales:

```
secHTTPS/                          ← Repositorio Git
├── .gitignore                     ← Compartido por ambos proyectos
├── README.md                      ← Documentación principal
├── docker-compose.yml             ← Orquesta ambos servicios
├── proximosPasosAuth.md          ← Este archivo
│
├── secHTTPS_APP/                  ← Proyecto actual (renombrado)
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   ├── src/
│   │   ├── server.ts
│   │   ├── app.ts
│   │   ├── domain/
│   │   ├── infrastructure/
│   │   └── types/
│   ├── tests/
│   └── dist/
│
└── auth_APP/                      ← Nuevo microservicio Auth
    ├── package.json
    ├── tsconfig.json
    ├── .env.example
    ├── src/
    │   ├── server.ts
    │   ├── app.ts
    │   ├── domain/
    │   │   ├── usecases/
    │   │   │   ├── LoginUseCase.ts
    │   │   │   ├── RefreshTokenUseCase.ts
    │   │   │   └── ValidateTokenUseCase.ts
    │   │   └── repositories/
    │   │       └── IUserRepository.ts
    │   ├── infrastructure/
    │   │   ├── persistence/
    │   │   │   └── UserRepository.ts
    │   │   ├── security/
    │   │   │   ├── JWTService.ts
    │   │   │   └── PasswordHasher.ts
    │   │   ├── transport/
    │   │   │   ├── controllers/
    │   │   │   │   └── AuthController.ts
    │   │   │   └── routes/
    │   │   │       └── authRoutes.ts
    │   │   ├── middleware/
    │   │   │   └── authMiddleware.ts
    │   │   └── database/
    │   │       ├── connection.ts
    │   │       └── migrations/
    │   │           └── 001_create_users_table.sql
    │   └── types/
    │       └── user.ts
    ├── tests/
    └── dist/
```

**Ventajas de esta estructura:**
- ✅ Un solo repositorio Git (fácil versionado conjunto)
- ✅ Compartes configuración (docker-compose, Nginx, CI/CD)
- ✅ Deploys coordinados (versión compatible auth+app)
- ✅ Código reutilizable (tipos compartidos si quieres)

**Empresas que usan monorepos:**
- Google (Bazel)
- Facebook/Meta (Buck)
- Microsoft (Rush)
- Airbnb, Uber, Twitter

---

## 📝 PASO 1: Reestructurar proyecto actual

```bash
cd c:/Desarrollos/MASTER_IA/secHTTPS

# Crear carpeta temporal
mkdir temp_backup
cp -r . temp_backup/

# Crear estructura monorepo
mkdir secHTTPS_APP
mv src tests package.json tsconfig.json .env .env.example docker-compose.yml docs AGENT.md secHTTPS_APP/

# Verificar que todo está en secHTTPS_APP
ls secHTTPS_APP/
```

**Actualizar rutas en package.json:**

```json
// secHTTPS_APP/package.json
{
  "scripts": {
    "dev": "tsx --watch src/server.ts",
    "db:migrate": "tsx src/scripts/migrate.ts",
    // ... resto igual
  }
}
```

---

## 📝 PASO 2: Crear microservicio auth_APP

### 2.1 Inicializar proyecto

```bash
cd c:/Desarrollos/MASTER_IA/secHTTPS
mkdir auth_APP && cd auth_APP

# Inicializar Node.js
npm init -y

# Instalar dependencias
npm install express dotenv pg bcrypt jsonwebtoken
npm install -D typescript tsx @types/express @types/node @types/bcrypt @types/jsonwebtoken @types/pg vitest supertest @types/supertest
```

### 2.2 Crear package.json

```json
{
  "name": "auth-service",
  "version": "1.0.0",
  "description": "Authentication microservice with JWT",
  "main": "dist/server.js",
  "type": "commonjs",
  "scripts": {
    "dev": "tsx --watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "vitest",
    "test:run": "vitest --run",
    "db:migrate": "tsx src/scripts/migrate.ts"
  },
  "dependencies": {
    "bcrypt": "^5.1.1",
    "dotenv": "^17.3.1",
    "express": "^5.2.1",
    "jsonwebtoken": "^9.0.2",
    "pg": "^8.18.0"
  },
  "devDependencies": {
    "@types/bcrypt": "^5.0.2",
    "@types/express": "^5.0.6",
    "@types/jsonwebtoken": "^9.0.7",
    "@types/node": "^25.2.2",
    "@types/pg": "^8.16.0",
    "@types/supertest": "^6.0.3",
    "supertest": "^7.2.2",
    "tsx": "^4.21.0",
    "typescript": "^5.9.3",
    "vitest": "^4.0.18"
  }
}
```

### 2.3 Crear tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2021",
    "module": "commonjs",
    "lib": ["ES2021"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### 2.4 Crear .env.example

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

# Token expiration
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

### 2.5 Estructura de archivos clave

```typescript
// auth_APP/src/types/user.ts
export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  role: 'admin' | 'user';
  createdAt: string;
}

export interface CreateUserDTO {
  username: string;
  email: string;
  password: string;
  role?: 'admin' | 'user';
}

export interface LoginDTO {
  username: string;
  password: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface TokenPayload {
  userId: string;
  username: string;
  role: string;
  type: 'access' | 'refresh';
}
```

```typescript
// auth_APP/src/infrastructure/security/JWTService.ts
import jwt from 'jsonwebtoken';
import { TokenPayload, TokenPair } from '../../types/user';

export class JWTService {
  private readonly accessSecret = process.env.JWT_ACCESS_SECRET!;
  private readonly refreshSecret = process.env.JWT_REFRESH_SECRET!;
  private readonly accessExpiresIn = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
  private readonly refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

  generateTokenPair(userId: string, username: string, role: string): TokenPair {
    const accessToken = jwt.sign(
      { userId, username, role, type: 'access' } as TokenPayload,
      this.accessSecret,
      { expiresIn: this.accessExpiresIn }
    );

    const refreshToken = jwt.sign(
      { userId, username, role, type: 'refresh' } as TokenPayload,
      this.refreshSecret,
      { expiresIn: this.refreshExpiresIn }
    );

    return { accessToken, refreshToken };
  }

  verifyAccessToken(token: string): TokenPayload {
    return jwt.verify(token, this.accessSecret) as TokenPayload;
  }

  verifyRefreshToken(token: string): TokenPayload {
    return jwt.verify(token, this.refreshSecret) as TokenPayload;
  }
}
```

```typescript
// auth_APP/src/infrastructure/security/PasswordHasher.ts
import bcrypt from 'bcrypt';

export class PasswordHasher {
  private readonly saltRounds = 10;

  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  async compare(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
```

```sql
-- auth_APP/src/infrastructure/database/migrations/001_create_users_table.sql
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Insert default admin user (password: admin123)
-- CAMBIAR EN PRODUCCIÓN
INSERT INTO users (id, username, email, password_hash, role)
VALUES (
  'c7e7a1b0-1234-5678-9abc-def012345678',
  'admin',
  'admin@sechttps.local',
  '$2b$10$xVZ4f0qGZk8hKX8J9vQ8SeQ9Z8YmXq7KjX8J9vQ8SeQ9Z8YmXq7Kj',  -- bcrypt hash de "admin123"
  'admin'
) ON CONFLICT DO NOTHING;

COMMENT ON TABLE users IS 'Authentication users for secHTTPS system';
```

```typescript
// auth_APP/src/server.ts
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import { connectDatabase } from './infrastructure/database/connection';
import { createAuthRouter } from './infrastructure/transport/routes/authRoutes';

const PORT = process.env.PORT || 4000;

void (async () => {
  try {
    const app = express();
    
    // Middleware
    app.use(express.json());
    
    // Connect to database
    if (process.env.NODE_ENV !== 'test') {
      await connectDatabase();
    }
    
    // Routes
    app.use('/auth', createAuthRouter());
    
    // Health check
    app.get('/health', (req, res) => {
      res.json({ status: 'ok', service: 'auth', timestamp: new Date().toISOString() });
    });
    
    // Start server
    app.listen(PORT, () => {
      console.log(`🔐 Auth Service running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start auth service:', error);
    process.exit(1);
  }
})();
```

---

## 📝 PASO 3: Integrar secHTTPS_APP con auth_APP

### 3.1 Actualizar secHTTPS_APP/.env

```env
# Añadir al .env existente
AUTH_SERVICE_URL=http://localhost:4000
```

### 3.2 Crear cliente de Auth en secHTTPS_APP

```typescript
// secHTTPS_APP/src/infrastructure/security/AuthClient.ts
export interface AuthUser {
  userId: string;
  username: string;
  role: string;
}

export class AuthClient {
  private readonly authUrl = process.env.AUTH_SERVICE_URL!;

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
}
```

### 3.3 Middleware de autenticación en secHTTPS_APP

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

// Middleware para requerir rol admin
export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  await requireAuth(req, res, () => {
    const user = (req as any).user;
    if (user.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }
    next();
  });
}
```

### 3.4 Proteger rutas en secHTTPS_APP

```typescript
// secHTTPS_APP/src/infrastructure/transport/routes/certificateRoutes.ts
import { requireAuth } from '../../middleware/authMiddleware';

// Aplicar middleware a todas las rutas
router.use(requireAuth);

router.get('/', (req, res) => certificateController.getCertificates(req, res));
router.post('/', (req, res) => certificateController.createCertificate(req, res));
// ... resto de rutas protegidas
```

---

## 📝 PASO 4: Docker Compose para desarrollo

```yaml
# secHTTPS/docker-compose.yml (en la raíz del monorepo)
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

  auth-service:
    build: ./auth_APP
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
      - JWT_ACCESS_SECRET=${JWT_ACCESS_SECRET}
      - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
    depends_on:
      - postgres
    volumes:
      - ./auth_APP:/app
      - /app/node_modules
    networks:
      - sechttps-network
    command: npm run dev

  sechttps-app:
    build: ./secHTTPS_APP
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
      - postgres
      - auth-service
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

```sql
-- secHTTPS/init-databases.sql
-- Crear bases de datos separadas
CREATE DATABASE auth_db;
CREATE DATABASE sechttps_db;
```

**Comandos Docker:**

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

---

## 📝 PASO 5: Deployment en Ubuntu Server

### 5.1 Preparar servidor

```bash
# SSH al servidor
ssh usuario@ip-del-servidor

# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Instalar Nginx
sudo apt install -y nginx

# Instalar PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Instalar PM2 (Process Manager)
sudo npm install -g pm2

# Instalar Git
sudo apt install -y git
```

### 5.2 Configurar PostgreSQL

```bash
# Acceder a PostgreSQL
sudo -u postgres psql

# Crear bases de datos y usuario
CREATE DATABASE auth_db;
CREATE DATABASE sechttps_db;
CREATE USER sechttps_user WITH PASSWORD 'tu-password-seguro';
GRANT ALL PRIVILEGES ON DATABASE auth_db TO sechttps_user;
GRANT ALL PRIVILEGES ON DATABASE sechttps_db TO sechttps_user;

# Salir
\q
```

### 5.3 Clonar y configurar proyectos

```bash
# Crear directorio
sudo mkdir -p /var/www
sudo chown -R $USER:$USER /var/www

# Clonar repositorio
cd /var/www
git clone https://github.com/tu-usuario/secHTTPS.git
cd secHTTPS

# Configurar auth_APP
cd auth_APP
cp .env.example .env
nano .env  # Editar con valores de producción
npm install
npm run build
npm run db:migrate

# Configurar secHTTPS_APP
cd ../secHTTPS_APP
cp .env.example .env
nano .env  # Editar con valores de producción
npm install
npm run build
npm run db:migrate
```

### 5.4 Configurar PM2

```bash
cd /var/www/secHTTPS

# Iniciar auth-service
pm2 start auth_APP/dist/server.js --name auth-service

# Iniciar sechttps-app
pm2 start secHTTPS_APP/dist/server.js --name sechttps-app

# Configurar PM2 para arrancar al inicio
pm2 startup systemd
pm2 save

# Ver status
pm2 list
pm2 logs auth-service
pm2 logs sechttps-app

# Comandos útiles
pm2 restart auth-service
pm2 restart sechttps-app
pm2 stop all
pm2 delete all
```

**Configuración avanzada con ecosystem.config.js:**

```javascript
// /var/www/secHTTPS/ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'auth-service',
      script: './auth_APP/dist/server.js',
      cwd: '/var/www/secHTTPS',
      env: {
        NODE_ENV: 'production',
        PORT: 4000
      },
      instances: 2,
      exec_mode: 'cluster',
      max_memory_restart: '300M',
      error_file: '/var/log/pm2/auth-error.log',
      out_file: '/var/log/pm2/auth-out.log',
      time: true
    },
    {
      name: 'sechttps-app',
      script: './secHTTPS_APP/dist/server.js',
      cwd: '/var/www/secHTTPS',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        AUTH_SERVICE_URL: 'http://localhost:4000'
      },
      instances: 2,
      exec_mode: 'cluster',
      max_memory_restart: '500M',
      error_file: '/var/log/pm2/sechttps-error.log',
      out_file: '/var/log/pm2/sechttps-out.log',
      time: true
    }
  ]
};

// Iniciar con: pm2 start ecosystem.config.js
```

### 5.5 Configurar Nginx

```nginx
# /etc/nginx/sites-available/sechttps-api
server {
    listen 80;
    server_name api.miempresa.com;  # Tu dominio

    # Logs
    access_log /var/log/nginx/sechttps-access.log;
    error_log /var/log/nginx/sechttps-error.log;

    # Rate limiting (protección DDoS)
    limit_req zone=api_limit burst=20 nodelay;

    # CORS (ajustar según necesidad)
    add_header Access-Control-Allow-Origin *;
    add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, PATCH, OPTIONS";
    add_header Access-Control-Allow-Headers "Authorization, Content-Type";

    # OPTIONS pre-flight
    if ($request_method = 'OPTIONS') {
        return 204;
    }

    # ===== AUTH SERVICE (puerto 4000) =====
    location /auth/ {
        proxy_pass http://localhost:4000/auth/;
        
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # ===== secHTTPS APP (puerto 3000) =====
    location /api/ {
        proxy_pass http://localhost:3000/api/;
        
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Health checks
    location /health {
        access_log off;
        return 200 "OK\n";
        add_header Content-Type text/plain;
    }

    location /auth/health {
        proxy_pass http://localhost:4000/health;
        access_log off;
    }

    location /api/health {
        proxy_pass http://localhost:3000/health;
        access_log off;
    }
}

# Rate limiting zone (añadir en /etc/nginx/nginx.conf dentro de http {})
# limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
```

**Activar configuración:**

```bash
# Añadir rate limiting a nginx.conf
sudo nano /etc/nginx/nginx.conf
# Dentro de http { } añadir:
# limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

# Crear symlink
sudo ln -s /etc/nginx/sites-available/sechttps-api /etc/nginx/sites-enabled/

# Verificar configuración
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx

# Habilitar al inicio
sudo systemctl enable nginx
```

### 5.6 Configurar HTTPS con Let's Encrypt

```bash
# Instalar certbot
sudo apt install certbot python3-certbot-nginx

# Obtener certificado (certbot modifica Nginx automáticamente)
sudo certbot --nginx -d api.miempresa.com

# Resultado: HTTP redirect a HTTPS + certificado SSL configurado

# Verificar renovación automática
sudo certbot renew --dry-run

# Ver status de renovación
sudo systemctl status certbot.timer
```

**Nginx actualizado por certbot (automático):**

```nginx
# HTTP redirect (añadido por certbot)
server {
    listen 80;
    server_name api.miempresa.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS (añadido por certbot)
server {
    listen 443 ssl http2;
    server_name api.miempresa.com;

    # Certificados SSL gestionados por certbot
    ssl_certificate /etc/letsencrypt/live/api.miempresa.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.miempresa.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # ... resto de tu configuración (locations) ...
}
```

### 5.7 Configurar Firewall

```bash
# Instalar UFW (si no está instalado)
sudo apt install ufw

# Configurar reglas
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS

# Habilitar firewall
sudo ufw enable

# Ver status
sudo ufw status verbose
```

---

## 📝 PASO 6: Scripts de deployment automatizado

### 6.1 Script de deployment

```bash
# secHTTPS/deploy.sh
#!/bin/bash
set -e

echo "🚀 Starting deployment..."

# Variables
REPO_URL="https://github.com/tu-usuario/secHTTPS.git"
DEPLOY_DIR="/var/www/secHTTPS"
BACKUP_DIR="/var/backups/sechttps/$(date +%Y%m%d_%H%M%S)"

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Backup actual
echo -e "${YELLOW}📦 Creating backup...${NC}"
sudo mkdir -p $BACKUP_DIR
sudo cp -r $DEPLOY_DIR $BACKUP_DIR/

# Pull latest changes
echo -e "${YELLOW}📥 Pulling latest changes...${NC}"
cd $DEPLOY_DIR
git pull origin main

# Deploy auth_APP
echo -e "${YELLOW}🔐 Deploying auth-service...${NC}"
cd $DEPLOY_DIR/auth_APP
npm install --production
npm run build
npm run db:migrate
pm2 restart auth-service

# Deploy secHTTPS_APP
echo -e "${YELLOW}📜 Deploying sechttps-app...${NC}"
cd $DEPLOY_DIR/secHTTPS_APP
npm install --production
npm run build
npm run db:migrate
pm2 restart sechttps-app

# Health check
echo -e "${YELLOW}🏥 Running health checks...${NC}"
sleep 5

AUTH_HEALTH=$(curl -s http://localhost:4000/health | grep -o "ok" || echo "FAIL")
APP_HEALTH=$(curl -s http://localhost:3000/health | grep -o "ok" || echo "FAIL")

if [ "$AUTH_HEALTH" = "ok" ] && [ "$APP_HEALTH" = "ok" ]; then
    echo -e "${GREEN}✅ Deployment successful!${NC}"
    echo -e "${GREEN}Auth Service: OK${NC}"
    echo -e "${GREEN}secHTTPS App: OK${NC}"
else
    echo -e "${RED}❌ Deployment failed! Rolling back...${NC}"
    sudo cp -r $BACKUP_DIR/secHTTPS/* $DEPLOY_DIR/
    pm2 restart all
    exit 1
fi

echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
```

**Hacer ejecutable:**

```bash
chmod +x /var/www/secHTTPS/deploy.sh
```

**Ejecutar deployment:**

```bash
cd /var/www/secHTTPS
./deploy.sh
```

---

## 📝 PASO 7: Monitoreo y logs

### 7.1 Ver logs en tiempo real

```bash
# PM2 logs
pm2 logs auth-service --lines 100
pm2 logs sechttps-app --lines 100
pm2 logs --lines 50  # Todos los servicios

# Nginx logs
sudo tail -f /var/log/nginx/sechttps-access.log
sudo tail -f /var/log/nginx/sechttps-error.log

# PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-*.log
```

### 7.2 Monitoreo con PM2

```bash
# Dashboard interactivo
pm2 monit

# Status de los procesos
pm2 status

# Información detallada
pm2 show auth-service
pm2 show sechttps-app

# Métricas
pm2 describe auth-service
```

### 7.3 Configurar alertas (opcional)

```bash
# PM2 Plus (servicio de monitoreo gratuito de PM2)
pm2 link <secret-key> <public-key>
# Obtener keys en: https://app.pm2.io
```

---

## 📋 Checklist de deployment completo

```bash
✅ 1. Servidor Ubuntu preparado
   - Node.js 20 instalado
   - Nginx instalado
   - PostgreSQL instalado
   - PM2 instalado
   - Git instalado

✅ 2. Bases de datos configuradas
   - auth_db creada
   - sechttps_db creada
   - Usuario y permisos configurados

✅ 3. Repositorio clonado
   - Estructura monorepo en /var/www/secHTTPS
   - auth_APP configurado
   - secHTTPS_APP configurado

✅ 4. Variables de entorno
   - .env de auth_APP configurado
   - .env de secHTTPS_APP configurado
   - JWT secrets únicos en producción

✅ 5. Dependencias instaladas
   - npm install en auth_APP
   - npm install en secHTTPS_APP

✅ 6. Build de proyectos
   - npm run build en auth_APP
   - npm run build en secHTTPS_APP

✅ 7. Migraciones ejecutadas
   - npm run db:migrate en auth_APP
   - npm run db:migrate en secHTTPS_APP

✅ 8. PM2 configurado
   - Servicios iniciados
   - PM2 startup configurado
   - Logs funcionando

✅ 9. Nginx configurado
   - Archivo de configuración creado
   - Symlink activado
   - nginx -t pasando
   - Servicio reiniciado

✅ 10. SSL/HTTPS configurado
   - Dominio apuntando al servidor
   - Certbot ejecutado
   - Renovación automática configurada

✅ 11. Firewall configurado
   - Puertos 22, 80, 443 abiertos
   - UFW habilitado

✅ 12. Health checks pasando
   - https://api.miempresa.com/auth/health → OK
   - https://api.miempresa.com/api/health → OK
```

---

## 🧪 Testing de endpoints

```bash
# 1. Login (obtener token)
curl -X POST https://api.miempresa.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'

# Respuesta:
# {
#   "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
#   "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
#   "user": { "userId": "...", "username": "admin", "role": "admin" }
# }

# 2. Usar token para acceder a secHTTPS
curl -X GET https://api.miempresa.com/api/certif \
  -H "Authorization: Bearer <tu-access-token>"

# 3. Refresh token
curl -X POST https://api.miempresa.com/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "<tu-refresh-token>"}'
```

---

## 🔄 Workflow de desarrollo

### Desarrollo local

```bash
# Terminal 1 - Auth Service
cd auth_APP
npm run dev  # http://localhost:4000

# Terminal 2 - secHTTPS App
cd secHTTPS_APP
npm run dev  # http://localhost:3000
```

### Desarrollo con Docker

```bash
# Desde raíz del monorepo
docker-compose up -d

# Ver logs
docker-compose logs -f
```

### Deployment a producción

```bash
# Commit cambios
git add .
git commit -m "feat: nueva funcionalidad"
git push origin main

# SSH al servidor y ejecutar
cd /var/www/secHTTPS
./deploy.sh
```

---

## 📚 Recursos adicionales

- **JWT Best Practices**: https://jwt.io/introduction
- **Nginx Docs**: https://nginx.org/en/docs/
- **PM2 Docs**: https://pm2.keymetrics.io/docs/usage/quick-start/
- **Let's Encrypt**: https://letsencrypt.org/getting-started/
- **PostgreSQL Security**: https://www.postgresql.org/docs/current/auth-pg-hba-conf.html

---

## 🆘 Troubleshooting común

### Error: Cannot connect to auth-service from secHTTPS_APP

```bash
# Verificar que auth-service está corriendo
pm2 list
curl http://localhost:4000/health

# Verificar firewall interno
sudo iptables -L

# Verificar variable de entorno
echo $AUTH_SERVICE_URL
```

### Error: Token validation failed

```bash
# Verificar JWT secrets match entre servicios
# auth_APP/.env debe tener mismo JWT_ACCESS_SECRET que conoce secHTTPS
```

### Error: Nginx 502 Bad Gateway

```bash
# Verificar que los servicios están corriendo
pm2 status

# Ver logs de Nginx
sudo tail -f /var/log/nginx/sechttps-error.log

# Verificar puertos
sudo netstat -tlnp | grep -E '3000|4000'
```

---

**Fecha creación**: 2026-02-14  
**Versión**: 1.0  
**Autor**: GitHub Copilot
