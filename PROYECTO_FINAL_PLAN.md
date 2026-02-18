# Plan Proyecto Final de Máster — secHTTPS / auth_APP

> **Documento de referencia** para limpiar el código, preparar la entrega y generar documentación.
> Actualizado: 18/02/2026

---

## 1. Requisitos de Entrega (del PDF)

| Requisito | Estado | Notas |
|---|---|---|
| README.md completo | ❌ pendiente | Ver sección 5 para la plantilla |
| Código en GitHub | ✅ | Branch `featureNotificationsList` mezclado en main |
| URL de despliegue (live) | ❌ pendiente | Ver sección 6 |
| Slides de presentación | ❌ pendiente | Google Slides / Canva |
| Formulario entregado | ❌ pendiente | En la lección del Proyecto Final |

**Criterios de evaluación prioritarios:**
- Originalidad e historia del producto
- Buenas prácticas: **arquitectura, seguridad, testing**
- Código bien estructurado y con sentido (IA supervisada)
- No se valorará positivamente código masivo sin organizar

---

## 2. Descripción del Proyecto

### auth_APP (servicio de autenticación)
**Propósito:** Microservicio REST de autenticación y autorización multi-proveedor para el ecosistema secHTTPS.

**Qué hace:**
- Autenticación multi-proveedor: LDAP/Active Directory con fallback a base de datos local
- Emisión y renovación de JWT (access + refresh token, httpOnly cookies)
- RBAC: asignación/revocación de roles por aplicación y usuario, con soporte de expiración
- Cache de verificación de acceso (MemoryCacheService, TTL configurable)
- Gestión de usuarios (CRUD admin)
- Protección contra accesos caducados y tokens inválidos

**Stack técnico:**
- Runtime: Node.js + TypeScript (target ES2021, strict mode)
- Framework: Express v5
- Auth: jsonwebtoken, bcrypt, ldapjs
- DB: PostgreSQL (pg), con InMemory fallback para dev/test
- Testing: Vitest + Supertest
- Infra: Docker Compose

**Patrón arquitectónico:** Clean Architecture / Hexagonal
```
domain/          → entidades, value objects, interfaces (ports), use cases
infrastructure/  → implementaciones (adapters): BD, JWT, LDAP, bcrypt, cache, HTTP
```

### secHTTPS_APP (aplicación de gestión de certificados)
**Propósito:** Aplicación web para gestionar certificados SSL/TLS con notificaciones automáticas de expiración.

**Stack:** React + TypeScript + Vite (frontend) · tRPC + Express + PostgreSQL (backend) · node-cron

---

## 3. Estado del Código — Issues por Prioridad (auth_APP)

### 🔴 Críticos (afectan seguridad o comportamiento incorrecto)

| # | Fichero | Problema | Fix |
|---|---|---|---|
| C1 | `src/infrastructure/transport/routes/adminRoutes.ts` | **Rutas `/admin/**` sin autenticación ni autorización** — cualquier cliente puede asignar/revocar roles o crear/borrar usuarios | Añadir middleware `authenticateToken` + `requireRole('admin')` en el router |
| C2 | `src/infrastructure/middleware/errorHandler.ts` | `DomainError` no se maneja — errores como `DUPLICATE_USERNAME` devuelven `500` en vez de `409` | Añadir caso `instanceof DomainError` mapeando su `.code` al status HTTP correcto |

### 🟠 Altos (calidad / buenas prácticas)

| # | Fichero | Problema | Fix |
|---|---|---|---|
| A1 | `src/app.ts` | Password de admin hardcodeada `'Admin123'` como fallback si falta `.env` | Eliminar el fallback; lanzar error si `ADMIN_PASSWORD` no está definida en producción |
| A2 | `src/domain/usecases/RoleManagementUseCases.ts` | Violación Clean Architecture: `pg.Pool` directamente en un use case de dominio | Crear `IRoleRepository` en domain + `PostgresRoleRepository` en infrastructure |
| A3 | `src/infrastructure/transport/routes/authRoutes.ts` | El `invalidateCache` del sync LDAP es un stub (solo `console.log`) — la caché no se invalida al sincronizar roles LDAP | Pasar la instancia real de `MemoryCacheService` |
| A4 | `src/domain/usecases/RefreshTokenUseCase.ts` | Filtra mensajes internos de JWT al cliente en el error | Usar mensaje genérico: `'Invalid or expired refresh token'` |

### 🟡 Medios (limpieza y consistencia)

| # | Fichero | Problema | Fix |
|---|---|---|---|
| M1 | `src/server.ts` | 5x `console.log` | Reemplazar por `logger` del proyecto |
| M2 | `src/app.ts` | 7x `console.log` + `🔍 DEBUG:` en código de producción | Reemplazar por `logger` / eliminar debug |
| M3 | `src/infrastructure/transport/routes/authRoutes.ts` | 5x `console.log` | Reemplazar por `logger` |
| M4 | `src/domain/usecases/RoleManagementUseCases.ts` | 4x `console.log` en dominio | Usar `logger` |
| M5 | `src/infrastructure/transport/controllers/AuthController.ts` | TTL de cookies hardcodeado (no usa `JWT_CONFIG`); `secure` inline en cada `res.cookie()` | Extraer a constante/helper |
| M6 | `src/domain/usecases/LoginUseCase.ts` | Lanza `new Error('Invalid credentials')` en vez de `DomainError` | Usar `DomainError` |
| M7 | `src/infrastructure/cache/MemoryCacheService.ts` | `setInterval` nunca se limpia — fuga de timers en tests | Guardar referencia + exponer `stop()` |
| M8 | `src/domain/usecases/RegisterUserUseCase.ts` | `passwordHash: undefined as any` | Usar tipo `Omit<User, 'passwordHash'>` |
| M9 | `src/infrastructure/persistence/InMemoryUserRepository.ts` | Nombres de app hardcodeados; `getUserRolesByApplication` ignora el parámetro `applicationName` | Arreglar para que los tests sean fiables |

### 🔵 Bajos (estilo/deuda técnica)

| # | Fichero | Problema | Fix |
|---|---|---|---|
| L1 | `package.json` | `@types/cookie-parser`, `@types/cors`, `@types/ldapjs` en `dependencies` | Mover a `devDependencies` |
| L2 | `LoginUseCase.ts`, `RefreshTokenUseCase.ts` | Rutas de import redundantes (`../../domain/...` desde dentro de `domain/usecases/`) | Simplificar a rutas relativas cortas |
| L3 | `PostgresUserRepository.ts` | `SELECT *` en queries; sin paginación en `findAll()` | Listar columnas explícitamente |
| L4 | `MemoryCacheService.ts` | Campo `hitRate` en `getStats()` siempre `undefined` | Implementar o eliminar del tipo |
| L5 | `ldap.config.ts` | `logInfo()` se ejecuta en el import del módulo | Mover a función lazy |

---

## 4. Tests — Cobertura Actual y Gaps

### ✅ Tests que ya existen
```
tests/unit/domain/usecases/
  CreateUserUseCase.test.ts
  DeleteUserUseCase.test.ts
  GetUserByIdUseCase.test.ts
  GetUsersUseCase.test.ts
  RegisterUserUseCase.test.ts
  RoleManagementUseCases.test.ts
  UpdateUserUseCase.test.ts
  VerifyUserAccessUseCase.test.ts
tests/unit/infrastructure/cache/
  MemoryCacheService.test.ts
tests/domain/
  AuthProvider.test.ts
tests/integration/
  auth.test.ts
  ldap-sync.test.ts
```

### ❌ Tests que faltan (por impacto)

| Prioridad | Fichero a testear | Por qué es importante |
|---|---|---|
| Alta | `LoginUseCase.ts` | Ruta más crítica de la app, sin test unitario |
| Alta | `RefreshTokenUseCase.ts` | Gestión de tokens — sin test |
| Alta | `errorHandler.ts` | Comportamiento de errores HTTP — sin test |
| Alta | `JWTService.ts` | Generación/verificación de tokens — sin test |
| Media | `Email.ts`, `Password.ts`, `Username.ts`, `UserId.ts` | Value objects con reglas de negocio — sin test |
| Media | `AuthController.ts` | Controlador HTTP principal — sin test |
| Baja | `PasswordHasher.ts`, `DatabaseAuthenticationProvider.ts` | Implementaciones de seguridad |

---

## 5. Plantilla README.md (para generar)

Cuando me pidas "genera el README", usaré esta estructura:

```
# auth_APP — Servicio de Autenticación y Autorización

## Descripción general
## Problema que resuelve
## Stack tecnológico
## Arquitectura (diagrama ASCII o Mermaid)
## Instalación y configuración
  - Prerrequisitos
  - Variables de entorno (.env)
  - Base de datos (Docker / migrate)
  - Arrancar en local
## Endpoints de la API (tabla)
## Estructura del proyecto
## Testing
  - Ejecutar tests
  - Cobertura
## Seguridad (RBAC, JWT, LDAP)
## Docker / Despliegue
## Decisiones de diseño
```

---

## 6. Despliegue (Live URL)

El PDF requiere una URL pública. Opciones sugeridas (por orden de facilidad):

| Opción | Coste | Esfuerzo |
|---|---|---|
| **Railway.app** | Gratis (500h/mes) | Docker Compose directo, muy fácil |
| **Render.com** | Gratis (spin-down) | `Dockerfile` existente |
| **Fly.io** | Gratis tier | `fly.toml` necesario |
| **VPS propio** | Variable | Docker Compose en servidor |

El `docker-compose.yml` ya existe en el proyecto — con Railway sería prácticamente inmediato.

---

## 7. Slides (Presentación)

Estructura sugerida (8-10 slides):
1. **Portada** — nombre, foto, fecha
2. **El problema** — "¿Por qué un servicio de auth?"
3. **La solución** — demo en vivo / capturas
4. **Arquitectura** — diagrama Clean Architecture
5. **Seguridad** — RBAC, JWT, LDAP, httpOnly cookies
6. **Testing** — cobertura, tipos de test
7. **IA en el proceso** — cómo se usó (Copilot, Claude)
8. **Despliegue** — stack, URL live
9. **Lo que aprendí / siguiente versión**
10. **Preguntas**

---

## 8. Orden de Tareas Recomendado

```
FASE 1 — Código limpio (1-2 días)
  [x] git tiene versión estable
  [ ] C1: Proteger rutas /admin con auth middleware
  [ ] C2: Manejar DomainError en errorHandler
  [ ] A1: Eliminar fallback password hardcodeada
  [ ] M1-M4: Reemplazar console.log con logger
  [ ] L1: Mover @types a devDependencies
  [ ] M7: Fix setInterval leak en MemoryCacheService

FASE 2 — Tests y calidad (1 día)
  [ ] Test: LoginUseCase
  [ ] Test: RefreshTokenUseCase  
  [ ] Test: errorHandler
  [ ] Test: Value objects (Email, Password, Username)
  [ ] Ejecutar suite completa sin errores

FASE 3 — Documentación (1 día)
  [ ] README.md raíz del workspace (secHTTPS global)
  [ ] README.md auth_APP
  [ ] README.md secHTTPS_APP
  [ ] Verificar .env.example actualizado

FASE 4 — Despliegue (½ día)
  [ ] Deploy en Railway/Render
  [ ] URL funcional y anotada

FASE 5 — Entrega (½ día)
  [ ] Slides (Canva/Google Slides)
  [ ] Formulario de entrega
```

---

## 9. Contexto para Futuras Peticiones

Cuando me pidas algo, usa estas frases clave para que entienda el contexto rápidamente:

- **"genera el README de auth_APP"** → usaré la plantilla de la sección 5 + el contexto de las secciones 2 y 3
- **"genera el README global de secHTTPS"** → descripción del monorepo con ambas apps
- **"aplica fix C1"** → proteger rutas admin
- **"aplica fix C2"** → DomainError en errorHandler
- **"genera los tests de LoginUseCase"** → test unitario del caso de uso
- **"aplica limpieza de console.logs"** → fixes M1-M4
- **"prepara el deploy en Railway"** → configuración de Railway

---

*Fichero mantenido como contexto de sesión — actualizar al completar cada fase.*
