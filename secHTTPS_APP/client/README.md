# 🚀 SecHTTPS con tRPC - Guía de Inicio

## 📋 Estructura del Proyecto

```
secHTTPS_APP/
├── src/                          # Backend (Express + tRPC)
│   ├── infrastructure/
│   │   └── trpc/                 # Configuración tRPC
│   │       ├── trpc.ts           # Base tRPC (contexto, procedures)
│   │       └── routers/
│   │           ├── index.ts      # App Router (combina todos los routers)
│   │           └── certificateRouter.ts  # Router de certificados
│   └── ...
├── client/                       # Frontend (React + Vite + tRPC)
│   ├── src/
│   │   ├── main.tsx             # Entry point con providers
│   │   ├── App.tsx              # Componente principal
│   │   └── utils/
│   │       └── trpc.ts          # Cliente tRPC
│   └── package.json
└── package.json
```

## 🔧 Instalación

### Backend (ya instalado)
```bash
npm install @trpc/server@next zod cors @types/cors
```

### Frontend
```bash
cd client
npm install
```

## ▶️ Ejecutar el Proyecto

### Opción 1: Ejecutar Backend y Frontend por Separado

#### Terminal 1 - Backend:
```bash
# Desde la raíz del proyecto (secHTTPS_APP)
npm run dev
```
El backend estará en: `http://localhost:3000`
- REST API: `http://localhost:3000/api/certif`
- tRPC endpoint: `http://localhost:3000/trpc`

#### Terminal 2 - Frontend:
```bash
cd client
npm run dev
```
El frontend estará en: `http://localhost:5173`

### Opción 2: Usar Modo PostgreSQL

```bash
# Levantar PostgreSQL
npm run docker:up

# Ejecutar migraciones
npm run db:migrate

# Ejecutar backend con PostgreSQL
npm run dev
```

## 🧪 Probar la Aplicación

1. **Abre el navegador** en `http://localhost:5173`
2. Verás:
   - ✅ Estado de conexión con tRPC
   - 📋 Lista de certificados (puede estar vacía si es in-memory)
   - 🔄 Botón para actualizar

## 📡 Endpoints tRPC Disponibles

### `certificate.hello`
- **Tipo:** Query
- **Descripción:** Health check simple
- **Input:** `{ name?: string }`
- **Output:** `{ message: string, timestamp: string, status: string }`

### `certificate.getCertificates`
- **Tipo:** Query
- **Descripción:** Obtiene lista de certificados con filtros opcionales
- **Input:** 
  ```typescript
  {
    client?: string;
    server?: string;
    fileName?: string;
    status?: CertificateStatus;
    expirationStatus?: ExpirationStatus;
  }
  ```
- **Output:**
  ```typescript
  {
    total: number;
    certificates: Certificate[];
  }
  ```

## 🎨 Características del Cliente

- ✅ **Type-safety end-to-end**: Los tipos del backend se infieren automáticamente en el frontend
- ✅ **React Query**: Caché automático, refetching, loading states
- ✅ **Diseño responsivo**: Grid adaptable para tarjetas de certificados
- ✅ **Estados visuales**: Badges de colores para status y expiración
- ✅ **Actualización manual**: Botón para refrescar datos

## 🔒 Integración Futura con auth_APP

### Backend (trpc.ts)
```typescript
// TODO: Descomentar cuando se integre
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({ ctx: { ...ctx, userId: ctx.userId } });
});
```

### Cliente (utils/trpc.ts)
```typescript
// TODO: Descomentar cuando se integre
headers() {
  const token = localStorage.getItem('token');
  return {
    authorization: token ? `Bearer ${token}` : '',
  };
}
```

### Contexto (TRPCContext)
```typescript
// TODO: Agregar cuando se integre
export interface TRPCContext {
  certificateRepository: ICertificateRepository;
  notificationRepository: INotificationRepository;
  userId?: number;      // ← De auth_APP
  username?: string;    // ← De auth_APP  
  token?: string;       // ← JWT de auth_APP
}
```

## 🧩 Próximos Pasos

### Corto Plazo
1. **Crear página de Login** que llame a `auth_APP`
2. **Almacenar JWT** en localStorage
3. **Agregar middleware de autenticación** en tRPC procedures
4. **Proteger rutas** con `protectedProcedure`

### Medio Plazo
1. **Agregar notificationRouter** para gestionar notificaciones
2. **Crear formulario de certificados** con mutations (create, update, delete)
3. **Implementar filtros avanzados** en la UI
4. **Agregar paginación** para listas grandes

### Largo Plazo
1. **Implementar RBAC** (Roles y permisos desde auth_APP)
2. **Dashboard con estadísticas** (certificados por expirar, etc.)
3. **Notificaciones en tiempo real** con WebSockets
4. **Modo oscuro/claro** con persistencia

## 📝 Ejemplo de Uso en el Cliente

```typescript
import { trpc } from './utils/trpc';

function MiComponente() {
  // Query simple
  const { data, isLoading, error } = trpc.certificate.getCertificates.useQuery();

  // Query con filtros
  const { data: expired } = trpc.certificate.getCertificates.useQuery({
    expirationStatus: 'EXPIRED'
  });

  // Mutation (cuando se agreguen)
  const createMutation = trpc.certificate.create.useMutation();

  const handleCreate = () => {
    createMutation.mutate({ fileName: 'test.crt', ... });
  };

  return <div>{/* ... */}</div>;
}
```

## 🛠️ Comandos Útiles

```bash
# Backend
npm run dev          # Desarrollo con hot-reload
npm run build        # Build de producción
npm run start        # Ejecutar build
npm test             # Tests

# Frontend (desde client/)
npm run dev          # Desarrollo con hot-reload
npm run build        # Build de producción
npm run preview      # Preview del build
npm run lint         # Linter

# Base de Datos
npm run docker:up    # Levantar PostgreSQL
npm run docker:down  # Detener PostgreSQL
npm run db:migrate   # Ejecutar migraciones
npm run db:reset     # Reset completo
```

## 📚 Recursos

- [tRPC Docs](https://trpc.io)
- [React Query Docs](https://tanstack.com/query)
- [Vite Docs](https://vitejs.dev)
- [Express Docs](https://expressjs.com)

---

**Estado:** ✅ Completamente funcional  
**Última actualización:** Febrero 16, 2026
