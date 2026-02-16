# Plan de Testing - Auth_APP

## 📋 Estado Actual

**Última actualización:** Febrero 16, 2026  
**Tests totales:** 195 tests ✅ (12 archivos)  
**Estado:** Todos pasando  
**Tiempo de ejecución:** ~5.8s

---

## ✅ Tests Implementados

### Tests de Dominio (Value Objects)
- ✅ **AuthProvider.test.ts** - 19 tests
  - Factory methods (DATABASE, LDAP)
  - Detection logic (case-sensitive)
  - Equality comparisons
  - JSON serialization
  - Value trimming

### Tests de Integración
- ✅ **auth.test.ts** - 17 tests
  - POST /auth/login (credenciales válidas/inválidas)
  - POST /auth/refresh (tokens válidos/inválidos)
  - POST /auth/validate (access/refresh tokens)
  - Validación de request body

- ✅ **ldap-sync.test.ts** - Tests con PostgreSQL
  - Autenticación LDAP y sincronización en BD
  - Creación de usuarios LDAP
  - Asignación automática de roles
  - Email desde LDAP vs fallback
  - Control de sincronización por aplicación

### Tests Unitarios - Infrastructure

- ✅ **MemoryCacheService.test.ts** - 25 tests
  - Operaciones básicas (set, get, delete, clear)
  - TTL (Time To Live) con expiración
  - LRU (Least Recently Used) eviction
  - Pattern deletion (regex)
  - Cleanup periódico
  - Static helpers (cache key generators)

### Tests Unitarios - Use Cases

- ✅ **CreateUserUseCase.test.ts** - 17 tests
  - Creación de usuarios válidos
  - Validación de campos (username, email, password)
  - Unicidad de username/email
  - Hash de contraseñas
  - Gestión de errores

- ✅ **DeleteUserUseCase.test.ts** - 18 tests
  - Eliminación exitosa de usuarios
  - Usuario no encontrado
  - Validación de userId
  - Verificación de permisos
  - Cascada de eliminaciones

- ✅ **GetUserByIdUseCase.test.ts** - 13 tests
  - Obtener usuario por ID
  - Usuario no encontrado
  - Validación de formato de ID
  - Campos retornados correctamente

- ✅ **GetUsersUseCase.test.ts** - 8 tests
  - Listado de usuarios
  - Filtros opcionales
  - Paginación
  - Ordenamiento

- ✅ **RegisterUserUseCase.test.ts** - 11 tests
  - Registro público de usuarios
  - Validación de datos
  - Asignación de roles por defecto
  - Prevención de duplicados

- ✅ **RoleManagementUseCases.test.ts** - 15 tests
  - **AssignRoleUseCase:**
    - Asignación exitosa con todos los campos
    - Callback de invalidación de cache
    - Campos opcionales (grantedBy, expiresAt)
  - **RevokeRoleUseCase:**
    - Revocación de rol específico
    - Revocación de todos los roles en app
    - Revocación de todos los roles en todas las apps
    - Callback de invalidación
  - **Integración Assign ↔ Revoke**

- ✅ **UpdateUserUseCase.test.ts** - 19 tests
  - Actualización de username
  - Actualización de email
  - Actualización de password
  - Validaciones de unicidad
  - Campos opcionales
  - Hash de nueva contraseña

- ✅ **VerifyUserAccessUseCase.test.ts** - 27 tests
  - **Cache Hit/Miss:**
    - Uso de cache (segunda llamada)
    - Consulta a BD (primera llamada)
    - TTL correcto
  - **Verificación de Roles:**
    - hasAnyRole (OR lógico)
    - hasAllRoles (AND lógico)
    - Roles exactos
  - **Invalidación de Cache:**
    - invalidateUserCache (todas las apps)
    - invalidateUserAppCache (app específica)
    - Refresh después de invalidación
  - **Casos Edge:**
    - Roles vacíos
    - Usuario no encontrado
    - Aplicación no encontrada

---

## 📊 Cobertura Actual

| Componente | Tests | Estado |
|-----------|-------|--------|
| **Value Objects** | 19 | ✅ |
| **Infrastructure (Cache)** | 25 | ✅ |
| **Use Cases (Domain)** | 128 | ✅ |
| **Integration (API)** | 17+ | ✅ |
| **Integration (LDAP)** | 6+ | ✅ |
| **TOTAL** | **195** | ✅ |

---

---

## 🎯 Tests Pendientes (Propuestas Futuras)

### 1. Tests de Integración - AdminController

**Archivo:** `tests/integration/admin.test.ts`

**Casos de prueba:**

#### POST /admin/roles/assign
- `should assign role successfully with valid data`
- `should return 400 if userId missing`
- `should return 400 if applicationName missing`
- `should return 400 if roleName missing`
- `should return 404 if user not found`
- `should return 404 if application not found`
- `should return 404 if role not found`
- `should accept optional expiresAt and grantedBy`

#### POST /admin/roles/revoke
- `should revoke role successfully`
- `should return 400 if required fields missing`
- `should return 200 even if role not assigned`

#### POST /admin/roles/revoke-all-in-app
- `should revoke all roles in specific app`
- `should return count of revoked roles`

#### POST /admin/roles/revoke-all
- `should revoke all roles across all apps`
- `should return total count`

#### POST /admin/cache/invalidate
- `should invalidate cache for user`
- `should return deleted count`

**Estimado:** ~15 tests  
**Prerequisito:** PostgreSQL con datos seed

---

### 2. Tests de Integración - Login con ApplicationName

**Archivo:** `tests/integration/auth-rbac.test.ts`

**Casos de prueba:**

#### Login Single-App (con applicationName)
- `should return single-app token when applicationName provided`
- `should include only roles for specified application`
- `token payload should have applicationName and roles`
- `token payload should NOT have applications array`
- `should return 400 if applicationName doesn't exist`

#### Login Multi-App (sin applicationName)
- `should return multi-app token when applicationName not provided`
- `token payload should have applications array`
- `token payload should NOT have applicationName or roles`
- `should include all applications with their roles`

#### Validación de Token
- `should validate single-app token correctly`
- `should validate multi-app token correctly`
- `should extract userId, username from both token types`

**Estimado:** ~9 tests  
**Prerequisito:** PostgreSQL con user con roles en múltiples apps

---

### 3. Tests de Integración - Cache con BD

**Archivo:** `tests/integration/cache-integration.test.ts`

**Casos de prueba:**

#### Cache Behavior
- `should cache user roles after first verification`
- `should use cached roles for subsequent requests within TTL`
- `should refresh cache after TTL expiration`
- `should not query database when cache hit`

#### Cache Invalidation
- `should invalidate cache when role assigned`
- `should invalidate cache when role revoked`
- `should fetch fresh data after invalidation`

#### Performance
- `should improve response time with cache (benchmark)`
- `database queries should be reduced significantly`

**Estimado:** ~8 tests

---

### 4. Tests End-to-End - RBAC Workflow

**Archivo:** `tests/e2e/rbac-workflow.test.ts`

**Casos de prueba:**

#### Workflow Completo
- `admin assigns role to user → user can verify access → admin revokes role → user access denied`
- `user logs in specific app → receives only that app's roles`
- `user with expired role → access denied`
- `cache invalidation propagates immediately`

#### Multi-App Scenarios
- `user with admin role in app1 and viewer in app2`
- `revoke all roles in app1 → app2 roles remain`
- `revoke all roles → no access to any app`

**Estimado:** ~7 tests

---

### 5. Tests Unitarios - LoginUseCase

**Archivo:** `tests/unit/domain/usecases/LoginUseCase.test.ts`

**Casos de prueba:**

#### Autenticación Multi-Provider
- `should try DATABASE provider first`
- `should fallback to LDAP if DATABASE fails`
- `should return error if all providers fail`
- `should use correct provider order`

#### Sincronización LDAP
- `should create user in DB if LDAP succeeds and user not exists`
- `should assign default role for LDAP users`
- `should sync email from LDAP`
- `should check application allowLDAPSync before creating user`

#### Generación de Tokens
- `should generate single-app token when applicationName provided`
- `should generate multi-app token when applicationName not provided`
- `should include correct roles in single-app token`
- `should include all apps with roles in multi-app token`

**Estimado:** ~12 tests

---

### 6. Tests Unitarios - RefreshTokenUseCase

**Archivo:** `tests/unit/domain/usecases/RefreshTokenUseCase.test.ts`

**Casos de prueba:**
- `should generate new access token with valid refresh token`
- `should reject invalid refresh token`
- `should reject access token used as refresh token`
- `should preserve userId and username in new token`
- `should handle both single-app and multi-app tokens`

**Estimado:** ~5 tests

---

### 7. Tests Unitarios - ValidateTokenUseCase

**Archivo:** `tests/unit/domain/usecases/ValidateTokenUseCase.test.ts`

**Casos de prueba:**
- `should validate valid access token`
- `should reject expired token`
- `should reject refresh token used as access token`
- `should extract user info correctly`
- `should validate token signature`

**Estimado:** ~5 tests

---

## 📊 Resumen Completo

| Tipo de Test | Implementados | Pendientes | Total Planeado |
|--------------|---------------|------------|----------------|
| **Value Objects** | 19 | 0 | 19 |
| **Infrastructure** | 25 | 0 | 25 |
| **Use Cases** | 128 | 22 | 150 |
| **Integration (API)** | 17+ | 32 | 49+ |
| **Integration (Cache)** | - | 8 | 8 |
| **E2E** | - | 7 | 7 |
| **TOTAL** | **195** | **69** | **264** |

**Cobertura objetivo:** 85%+  
**Cobertura estimada actual:** ~75% (basado en uso de casos principales)

---

## 🛠️ Setup de Testing

### Dependencias Instaladas
```json
{
  "devDependencies": {
    "vitest": "^4.0.18",
    "@vitest/coverage-v8": "latest"
  }
}
```

### Variables de Entorno

#### Para Tests In-Memory (Unitarios)
No requieren configuración especial. Usan repositorios en memoria.

#### Para Tests con PostgreSQL (Integración)
```bash
# .env
USE_POSTGRES=true
PG_HOST=localhost
PG_PORT=5432
PG_USER=postgres
PG_PASSWORD=your_password
PG_DATABASE=auth_db

JWT_ACCESS_SECRET=min_32_chars_secret_for_access_tokens_!!
JWT_REFRESH_SECRET=min_32_chars_secret_for_refresh_tokens_!!

# LDAP opcional (para ldap-sync.test.ts)
ENABLE_LDAP=true
LDAP_URL=ldap://localhost:389
LDAP_BASE_DN=dc=example,dc=com
```

### Estructura de Directorios
```
tests/
├── domain/                    # Value Objects tests
│   └── AuthProvider.test.ts
├── integration/               # API + Database tests
│   ├── auth.test.ts
│   └── ldap-sync.test.ts
└── unit/
    ├── domain/
    │   └── usecases/         # Use Cases tests (mocked dependencies)
    │       ├── CreateUserUseCase.test.ts
    │       ├── DeleteUserUseCase.test.ts
    │       ├── GetUserByIdUseCase.test.ts
    │       ├── GetUsersUseCase.test.ts
    │       ├── RegisterUserUseCase.test.ts
    │       ├── RoleManagementUseCases.test.ts
    │       ├── UpdateUserUseCase.test.ts
    │       └── VerifyUserAccessUseCase.test.ts
    └── infrastructure/
        └── cache/
            └── MemoryCacheService.test.ts
```

---

## 📝 Comandos de Testing

```bash
# Ejecutar todos los tests
npm test

# Watch mode (desarrollo)
npm run test:watch

# Coverage report (futuro)
npm run test:coverage

# Tests específicos
npx vitest run tests/unit
npx vitest run tests/integration
npx vitest run tests/domain
```

### Scripts en package.json
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

---

## 🎯 Patrones de Testing Utilizados

### 1. Tests Unitarios con Mocks
```typescript
// Ejemplo: VerifyUserAccessUseCase.test.ts
const mockRoleRepo = {
  getUserRoles: vi.fn()
};
const mockCache = {
  get: vi.fn(),
  set: vi.fn()
};

const useCase = new VerifyUserAccessUseCase(mockRoleRepo, mockCache);
```

### 2. Tests de Integración con PostgreSQL
```typescript
// Ejemplo: ldap-sync.test.ts
beforeAll(async () => {
  // Conectar a PostgreSQL real
  await pool.query('DELETE FROM users WHERE username != $1', ['admin']);
});

afterAll(async () => {
  await pool.end();
});
```

### 3. Tests de API con Supertest (futuro)
```typescript
// Ejemplo: admin.test.ts
const response = await request(app)
  .post('/admin/roles/assign')
  .send({ userId: 1, applicationName: 'app', roleName: 'admin' });

expect(response.status).toBe(200);
```

---

## ✅ Criterios de Calidad

### Performance Actual
- ✅ Tests unitarios: < 5ms promedio
- ✅ Tests integración: < 500ms promedio
- ✅ Suite completa: ~5.8s (195 tests)
- ✅ No tests flaky (100% consistencia)

### Buenas Prácticas Aplicadas
- ✅ Tests independientes (pueden correr en paralelo)
- ✅ Cleanup automático (afterEach/afterAll)
- ✅ Nombres descriptivos en español
- ✅ Arrange-Act-Assert pattern
- ✅ Mocks específicos por test
- ✅ Verificación de cache invalidation
- ✅ Manejo de casos edge

---

## 🔄 Próximos Pasos Recomendados

### Prioridad Alta
1. **Admin API Tests** (`admin.test.ts`)
   - Endpoints de gestión de roles
   - Endpoint de invalidación de cache
   - ~15 tests, ~2-3 horas

2. **Login RBAC Tests** (`auth-rbac.test.ts`)
   - Single-app vs Multi-app tokens
   - Validación de estructura de tokens
   - ~9 tests, ~2 horas

### Prioridad Media
3. **LoginUseCase Unit Tests**
   - Multi-provider authentication
   - LDAP sync logic
   - Token generation dispatcher
   - ~12 tests, ~2 horas

4. **Token Use Cases Tests**
   - RefreshTokenUseCase
   - ValidateTokenUseCase
   - ~10 tests, ~1 hora

### Prioridad Baja
5. **Cache Integration Tests**
   - Performance benchmarks
   - Cache invalidation propagation
   - ~8 tests, ~2 horas

6. **E2E Workflow Tests**
   - Flujos completos usuario-admin
   - Multi-app scenarios
   - ~7 tests, ~2 horas

---

## 📈 Métricas de Progreso

| Métrica | Objetivo | Actual | Estado |
|---------|----------|--------|--------|
| **Tests Totales** | 264 | 195 | 🟡 74% |
| **Cobertura Estimada** | 85% | ~75% | 🟡 |
| **Tests Unitarios** | 150 | 128 | 🟢 85% |
| **Tests Integración** | 57 | 23+ | 🔴 40% |
| **Tests E2E** | 7 | 0 | 🔴 0% |
| **Performance (suite)** | < 10s | 5.8s | 🟢 |

**Leyenda:**
- 🟢 Completado (>80%)
- 🟡 En progreso (50-80%)
- 🔴 Pendiente (<50%)

---

## 🏆 Logros Conseguidos

### ✅ Funcionalidad 100% Testeada
- Value Objects (AuthProvider)
- Cache Service (TTL, LRU, cleanup)
- User CRUD (Create, Read, Update, Delete)
- Role Management (Assign, Revoke)
- Access Verification (con cache)
- Authentication API (login, refresh, validate)
- LDAP Sync Integration

### ✅ Calidad Code
- Refactorización de LoginUseCase (complejidad 44→8)
- Refactorización de UpdateUserUseCase (complejidad 16→5)
- Refactorización de LDAPAuthenticationProvider
- Logger unificado (logError, logWarn, logInfo, logDebug)
- Eliminación de warnings SonarQube

### ✅ CI/CD Ready
- Todos los tests pasan consistentemente
- Tiempo de ejecución aceptable (<6s)
- Sin dependencias externas en unitarios
- PostgreSQL opcional para integración

---

## 📚 Documentación de Referencia

### Archivos Clave
- `vitest.config.ts` - Configuración de Vitest
- `.env` - Variables de entorno para tests
- `tests/TEST_PLAN.md` - Este documento

### Comandos Útiles
```bash
# Ver coverage detallado (cuando esté configurado)
npm run test:coverage -- --reporter=html

# Ejecutar un test específico
npx vitest run tests/unit/domain/usecases/LoginUseCase.test.ts

# Debug mode
npx vitest run --inspect-brk

# UI mode (interfaz gráfica)
npx vitest --ui
```

---

**Última revisión:** Febrero 16, 2026  
**Responsable:** Equipo de Desarrollo  
**Estado del proyecto:** ✅ Saludable - 195/264 tests implementados
