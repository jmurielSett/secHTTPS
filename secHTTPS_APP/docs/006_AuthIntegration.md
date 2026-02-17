# Integración con auth_APP - Plan de Implementación

## 📋 Tareas a Realizar

### Fase 1: Backend - Middleware de Autenticación JWT

#### 1.1. Instalar dependencias
```bash
cd /c/Desarrollos/MASTER_IA/secHTTPS/secHTTPS_APP
npm install jsonwebtoken @types/jsonwebtoken
```

#### 1.2. Crear middleware de autenticación
**Archivo**: `src/infrastructure/middleware/authMiddleware.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: number;
    username: string;
    roles: string[];
  };
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const AUTH_APP_URL = process.env.AUTH_APP_URL || 'http://localhost:3001';

export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Extraer token del header Authorization
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const token = authHeader.split(' ')[1];

    // Opción 1: Verificar JWT localmente (más rápido)
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = {
      userId: decoded.userId,
      username: decoded.username,
      roles: decoded.roles || []
    };

    next();

    // Opción 2: Validar con auth_APP (más seguro, verifica revocación)
    // const response = await fetch(`${AUTH_APP_URL}/auth/verify`, {
    //   headers: { Authorization: `Bearer ${token}` }
    // });
    // if (!response.ok) {
    //   return res.status(401).json({ error: 'Invalid token' });
    // }
    // const userData = await response.json();
    // req.user = userData;
    // next();

  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
```

#### 1.3. Actualizar contexto tRPC
**Archivo**: `src/infrastructure/trpc/trpc.ts`

```typescript
export interface TRPCContext {
  certificateRepository: ICertificateRepository;
  notificationRepository: INotificationRepository;
  // Agregar datos de autenticación
  userId?: number;
  username?: string;
  roles?: string[];
  token?: string;
}

// Modificar initTRPC
const t = initTRPC.context<TRPCContext>().create();

// Crear procedimiento protegido
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
      username: ctx.username!
    }
  });
});
```

#### 1.4. Actualizar app.ts para extraer usuario del JWT
**Archivo**: `src/app.ts`

```typescript
import jwt from 'jsonwebtoken';

app.use('/trpc', trpcExpress.createExpressMiddleware({
  router: appRouter,
  createContext: ({ req }): TRPCContext => {
    let userId: number | undefined;
    let username: string | undefined;
    let roles: string[] | undefined;
    let token: string | undefined;

    // Extraer token del header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
      
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any;
        userId = decoded.userId;
        username = decoded.username;
        roles = decoded.roles || [];
      } catch (error) {
        // Token inválido - contexto sin usuario
        console.warn('Invalid JWT token:', error.message);
      }
    }

    return {
      certificateRepository,
      notificationRepository,
      userId,
      username,
      roles,
      token
    };
  }
}));
```

#### 1.5. Actualizar routers tRPC para usar protectedProcedure
**Archivo**: `src/infrastructure/trpc/routers/certificateRouter.ts`

```typescript
import { publicProcedure, protectedProcedure, router } from '../trpc';

export const certificateRouter = router({
  // Públicos (sin auth)
  hello: publicProcedure
    .input(z.object({ name: z.string().optional() }).optional())
    .query(({ input }) => ({ /* ... */ })),

  // Protegidos (requieren auth)
  getCertificates: protectedProcedure  // ← Cambiar a protectedProcedure
    .input(getCertificatesSchema)
    .query(async ({ input, ctx }) => {
      console.log(`User ${ctx.username} (${ctx.userId}) is fetching certificates`);
      const useCase = new GetCertificatesUseCase(ctx.certificateRepository);
      return await useCase.execute(input || {});
    }),
});
```

### Fase 2: Frontend - Implementar Login y Manejo de Token

#### 2.1. Crear componente de Login
**Archivo**: `client/src/components/Login.tsx`

```typescript
import { useState } from 'react';
import './Login.css';

interface LoginProps {
  onLoginSuccess: () => void;
}

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
      // Llamar a auth_APP
      const response = await fetch('http://localhost:3001/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Login failed');
      }

      const { accessToken, refreshToken, user } = await response.json();

      // Guardar tokens
      localStorage.setItem('token', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));

      // Redirigir al dashboard
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

#### 2.2. Actualizar App.tsx para manejar autenticación
**Archivo**: `client/src/App.tsx`

```typescript
import { useState, useEffect } from 'react';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Verificar si hay token al cargar la app
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);
    setIsLoading(false);
  }, []);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
  };

  if (isLoading) {
    return <div className="loading">Cargando...</div>;
  }

  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return <Dashboard onLogout={handleLogout} />;
}

export default App;
```

#### 2.3. Actualizar cliente tRPC para enviar token
**Archivo**: `client/src/utils/trpc.ts`

```typescript
export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: 'http://localhost:3000/trpc',
      headers() {
        const token = localStorage.getItem('token');
        return {
          authorization: token ? `Bearer ${token}` : '',
        };
      },
    }),
  ],
});
```

#### 2.4. Manejar errores 401 (token expirado)
**Archivo**: `client/src/utils/trpc.ts` (mejorado)

```typescript
import { httpBatchLink } from '@trpc/client';
import { createTRPCReact } from '@trpc/react-query';

export const trpc = createTRPCReact<AppRouter>();

export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: 'http://localhost:3000/trpc',
      headers() {
        const token = localStorage.getItem('token');
        return {
          authorization: token ? `Bearer ${token}` : '',
        };
      },
      fetch(url, options) {
        return fetch(url, options).then(async (response) => {
          // Si es 401, token expirado - logout automático
          if (response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            window.location.href = '/'; // Redirigir a login
          }
          return response;
        });
      },
    }),
  ],
});
```

### Fase 3: Variables de Entorno

#### 3.1. Actualizar .env de secHTTPS_APP
```bash
# JWT Configuration
JWT_SECRET=your-super-secret-key-change-in-production
AUTH_APP_URL=http://localhost:3001
```

#### 3.2. Actualizar .env.example
Agregar las mismas variables al ejemplo.

### Fase 4: Testing

#### 4.1. Test sin autenticación
```bash
curl http://localhost:3000/trpc/certificate.getCertificates?batch=1&input=%7B%7D
# Esperado: {"error": {"code": "UNAUTHORIZED", ...}}
```

#### 4.2. Test con autenticación
```bash
# 1. Login en auth_APP
TOKEN=$(curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}' \
  | jq -r '.accessToken')

# 2. Llamar con token
curl http://localhost:3000/trpc/certificate.getCertificates?batch=1&input=%7B%7D \
  -H "Authorization: Bearer $TOKEN"
# Esperado: Lista de certificados
```

## 🎯 Respuestas a tus preguntas

### 1. ¿El login es sin segurizar pero el resto sí?
✅ **Correcto**:
- `POST /auth/login` → **Público** (obviamente, necesitas login para obtener el token)
- Todos los demás endpoints → **Protegidos** (requieren JWT válido)

### 2. ¿Quién genera la página de login?
✅ **El FRONTEND (React)** genera y muestra el login
- Si `localStorage` no tiene token → Muestra `<Login />`
- Si tiene token → Muestra `<Dashboard />`

### 3. ¿El login muestra el error producido?
✅ **Sí**, el componente Login muestra errores:
```typescript
// Si falla el login
catch (err: any) {
  setError(err.message); // "Invalid credentials", "User not found", etc.
}

// En el JSX
{error && <div className="error-message">⚠️ {error}</div>}
```

## 📊 Diagrama de Flujo Completo

```
┌──────────────┐
│ auth_APP     │ Puerto 3001
│ (LDAP/JWT)   │ - Login
└──────┬───────┘ - Verify Token
       │
       │ Valida credenciales
       │ Genera JWT
       │
┌──────▼───────────────────────┐
│ secHTTPS_APP (Backend)       │ Puerto 3000
│ - Middleware JWT             │
│ - tRPC protectedProcedure    │
│ - Extrae userId del token    │
└──────┬───────────────────────┘
       │
       │ Devuelve datos si JWT válido
       │
┌──────▼───────────────────────┐
│ secHTTPS_APP (Frontend)      │ Puerto 5174
│ - Componente Login           │
│ - localStorage para token    │
│ - Headers: Bearer {token}    │
└──────────────────────────────┘
```

## ✅ Orden de Implementación Recomendado

1. **Backend primero** (Fase 1): Middleware + tRPC context
2. **Frontend después** (Fase 2): Login component + token management
3. **Variables de entorno** (Fase 3)
4. **Testing** (Fase 4)

¿Quieres que empiece implementando alguna de estas fases?
