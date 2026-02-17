# 🎯 Inicio Rápido - tRPC Frontend

## ✅ ¿Qué se ha implementado?

### Backend (tRPC Server)
- ✅ Servidor tRPC integrado con Express
- ✅ Router de certificados (`certificate.getCertificates`, `certificate.hello`)
- ✅ CORS configurado para frontend
- ✅ Type-safety end-to-end
- ✅ Contexto preparado para autenticación futura

### Frontend (React + Vite)
- ✅ Cliente React con Vite
- ✅ Cliente tRPC configurado
- ✅ Página que muestra certificados
- ✅ Estilos modernos con gradientes
- ✅ Estados de carga y error
- ✅ Botón de actualización

---

## 🚀 Ejecutar el Proyecto

### 1️⃣ Levantar el Backend

```bash
# Desde la raíz del proyecto (secHTTPS_APP)
npm run dev
```

**El servidor estará en:** `http://localhost:3000`
- tRPC: `http://localhost:3000/trpc`
- REST: `http://localhost:3000/api/certif`

### 2️⃣ Levantar el Frontend

```bash
# En otra terminal
cd client
npm run dev
```

**El frontend estará en:** `http://localhost:5173`

### 3️⃣ Probar

Abre el navegador en `http://localhost:5173`

Verás:
- ✅ Estado de conexión (Hello World)
- 📋 Lista de certificados
- 🔄 Botón para actualizar

---

## 📁 Archivos Importantes

### Backend
```
src/infrastructure/trpc/
├── trpc.ts                          # Config base tRPC
└── routers/
    ├── index.ts                     # App Router
    └── certificateRouter.ts         # Router de certificados
```

### Frontend
```
client/src/
├── main.tsx                         # Entry point
├── App.tsx                          # Componente principal
└── utils/
    └── trpc.ts                      # Cliente tRPC
```

---

## 🔍 ¿Cómo funciona tRPC?

### Backend (Define los procedimientos)

```typescript
// src/infrastructure/trpc/routers/certificateRouter.ts
export const certificateRouter = router({
  getCertificates: publicProcedure
    .input(getCertificatesSchema)  // Validación con Zod
    .query(async ({ input, ctx }) => {
      // Llama al use case
      const result = await getCertificatesUseCase.execute(input);
      return result;
    })
});
```

### Frontend (Consume con type-safety)

```typescript
// client/src/App.tsx
function App() {
  // ⚡ Autocomplete y tipado automático!
  const { data, isLoading } = trpc.certificate.getCertificates.useQuery();
  
  // data es de tipo: { total: number; certificates: Certificate[] }
  return <div>{data?.total} certificados</div>;
}
```

**¡No necesitas escribir fetch, axios, ni gestionar tipos manualmente!**

---

## 🔐 Integración con auth_APP (Próximos pasos)

### 1. En el Backend

#### Modificar `src/infrastructure/trpc/trpc.ts`:
```typescript
// Descomentar y ajustar:
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({ ctx: { ...ctx, userId: ctx.userId } });
});
```

#### Modificar `src/app.ts`:
```typescript
app.use('/trpc', trpcExpress.createExpressMiddleware({
  router: appRouter,
  createContext: ({ req }): TRPCContext => {
    // Extraer token del header
    const token = req.headers.authorization?.split(' ')[1];
    
    // Validar token con auth_APP (JWT)
    const payload = verifyToken(token);
    
    return {
      certificateRepository,
      notificationRepository,
      userId: payload?.userId,
      username: payload?.username,
      token
    };
  }
}));
```

### 2. En el Cliente

#### Crear página de Login:
```typescript
// client/src/pages/Login.tsx
function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    // Llamar a auth_APP (REST o tRPC)
    const response = await fetch('http://localhost:3001/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    const { accessToken } = await response.json();
    
    // Guardar token
    localStorage.setItem('token', accessToken);
    
    // Redirigir
    window.location.href = '/';
  };
  
  return (/* formulario */);
}
```

#### Modificar `client/src/utils/trpc.ts`:
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

#### Proteger rutas:
```typescript
// client/src/App.tsx
function App() {
  const token = localStorage.getItem('token');
  
  if (!token) {
    return <Login />;
  }
  
  return <CertificatesDashboard />;
}
```

---

## 📝 Añadir Más Endpoints

### Backend

```typescript
// src/infrastructure/trpc/routers/certificateRouter.ts
export const certificateRouter = router({
  // ... existentes ...
  
  // Crear certificado (mutation)
  create: protectedProcedure
    .input(z.object({
      fileName: z.string(),
      startDate: z.string(),
      expirationDate: z.string(),
      // ... más campos
    }))
    .mutation(async ({ input, ctx }) => {
      const useCase = new CreateCertificateUseCase(ctx.certificateRepository);
      return await useCase.execute(input);
    }),
    
  // Obtener por ID
  getById: publicProcedure
    .input(z.string().uuid())
    .query(async ({ input, ctx }) => {
      const useCase = new GetCertificateByIdUseCase(ctx.certificateRepository);
      return await useCase.execute(input);
    })
});
```

### Frontend

```typescript
// Usar en componente
function CreateCertificateForm() {
  const createMutation = trpc.certificate.create.useMutation({
    onSuccess: () => {
      alert('Certificado creado!');
    }
  });

  const handleSubmit = (data) => {
    createMutation.mutate(data);
  };
  
  return (/* formulario */);
}
```

---

## 🎨 Personalizar UI

Los estilos están en:
- `client/src/App.css` - Estilos del componente principal
- `client/src/index.css` - Estilos globales

Puedes agregar:
- React Router para navegación
- Material-UI / Chakra UI para componentes
- Tailwind CSS para utility-first
- Zustand / Redux para estado global

---

## 🐛 Troubleshooting

### Error de CORS
```bash
# Verificar que CLIENT_URL está en .env
CLIENT_URL=http://localhost:5173
```

### Error de conexión tRPC
```bash
# Verificar que el backend está corriendo en puerto 3000
npm run dev

# Verificar URL en client/src/utils/trpc.ts
url: 'http://localhost:3000/trpc'
```

### Error de tipos
```bash
# Regenerar node_modules
cd client
rm -rf node_modules package-lock.json
npm install
```

---

## 📚 Recursos

- [tRPC Docs](https://trpc.io/docs)
- [React Query Docs](https://tanstack.com/query/latest)
- [Zod Validation](https://zod.dev)

---

**¡Listo para desarrollar! 🚀**
