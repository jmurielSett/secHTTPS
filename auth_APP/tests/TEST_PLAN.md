# Plan de Testing - Auth_APP

## 📋 Estado Actual

**Tests existentes:**
- ✅ `tests/integration/auth.test.ts` - 17 tests de integración (login, refresh, validate)

**Funcionalidad sin tests:**
- ❌ MemoryCacheService (cache con TTL, LRU, cleanup)
- ❌ VerifyUserAccessUseCase (verificación con cache)
- ❌ RoleManagementUseCases (assign, revoke roles)
- ❌ AdminController (endpoints /admin/*)
- ❌ Login con applicationName opcional
- ❌ Sistema RBAC completo con PostgreSQL

---

## 🎯 Propuesta de Tests

### 1. Tests Unitarios - MemoryCacheService

**Archivo:** `tests/unit/infrastructure/cache/MemoryCacheService.test.ts`

**Casos de prueba:**

#### ✅ Operaciones Básicas
- `should set and get value from cache`
- `should return undefined for non-existent key`
- `should delete existing key and return true`
- `should return false when deleting non-existent key`
- `should clear all cache`

#### ✅ TTL (Time To Live)
- `should return undefined for expired entry`
- `should respect default TTL when not specified`
- `should use custom TTL when provided`
- `should not return expired entries even if still in Map`

#### ✅ LRU (Least Recently Used)
- `should evict oldest entry when maxSize reached`
- `should not evict when updating existing key`
- `should maintain maxSize limit`

#### ✅ Pattern Deletion
- `should delete all keys matching pattern`
- `should return correct count of deleted keys`
- `should not delete keys not matching pattern`

#### ✅ Cleanup Periódico
- `should clean expired entries automatically` (usando fake timers)
- `should not clean non-expired entries`
- `should log cleaned entries count`

#### ✅ Static Helpers
- `getUserRolesCacheKey should generate correct key format`
- `getUserCachePattern should generate correct pattern`

**Estimado:** ~15 tests

---

### 2. Tests Unitarios - VerifyUserAccessUseCase

**Archivo:** `tests/unit/domain/usecases/VerifyUserAccessUseCase.test.ts`

**Casos de prueba:**

#### ✅ Cache Hit (sin consultar BD)
- `should use cached roles on second call (cache hit)`
- `should not call repository when cache hit`
- `should return true when user has required role (cached)`

#### ✅ Cache Miss (consulta BD)
- `should fetch from repository on first call (cache miss)`
- `should store roles in cache after fetching`
- `should set correct TTL when caching`

#### ✅ Verificación de Roles
- `should return true when user has exact role`
- `should return false when user lacks role`
- `should verify hasAnyRole correctly with multiple roles`
- `should verify hasAllRoles correctly with required roles`

#### ✅ Invalidación de Cache
- `invalidateUserCache should delete all user entries`
- `invalidateUserAppCache should delete specific app entry`
- `should fetch fresh data after cache invalidation`

#### ✅ Casos Edge
- `should handle empty roles array`
- `should handle user not found`
- `should handle application not found`

**Estimado:** ~14 tests

---

### 3. Tests Unitarios - RoleManagementUseCases

**Archivo:** `tests/unit/domain/usecases/RoleManagementUseCases.test.ts`

**Casos de prueba:**

#### ✅ AssignRoleUseCase
- `should assign role successfully`
- `should call invalidateCache callback after assignment`
- `should validate user exists before assignment`
- `should validate application exists before assignment`
- `should validate role exists before assignment`
- `should handle expiresAt date correctly`
- `should handle grantedBy correctly`
- `should be idempotent (ON CONFLICT DO UPDATE)`

#### ✅ RevokeRoleUseCase
- `should revoke specific role successfully`
- `should call invalidateCache callback after revocation`
- `should return 0 if role not found`
- `should revoke all roles in app correctly`
- `should revoke all roles in all apps correctly`

**Estimado:** ~13 tests

---

### 4. Tests de Integración - AdminController

**Archivo:** `tests/integration/admin.test.ts`

**Casos de prueba:**

#### ✅ POST /admin/roles/assign
- `should assign role successfully with valid data`
- `should return 400 if userId missing`
- `should return 400 if applicationName missing`
- `should return 400 if roleName missing`
- `should return 404 if user not found`
- `should return 404 if application not found`
- `should return 404 if role not found`
- `should accept optional expiresAt and grantedBy`

#### ✅ POST /admin/roles/revoke
- `should revoke role successfully`
- `should return 400 if required fields missing`
- `should return 200 even if role not assigned`

#### ✅ POST /admin/roles/revoke-all-in-app
- `should revoke all roles in specific app`
- `should return count of revoked roles`

#### ✅ POST /admin/roles/revoke-all
- `should revoke all roles across all apps`
- `should return total count`

#### ✅ POST /admin/cache/invalidate
- `should invalidate cache for user`
- `should return deleted count`

**Estimado:** ~15 tests

**⚠️ Prerequisito:** Requiere PostgreSQL con datos seed

---

### 5. Tests de Integración - Login con ApplicationName

**Archivo:** `tests/integration/auth-rbac.test.ts`

**Casos de prueba:**

#### ✅ Login Single-App (con applicationName)
- `should return single-app token when applicationName provided`
- `should include only roles for specified application`
- `token payload should have applicationName and roles`
- `token payload should NOT have applications array`
- `should return 400 if applicationName doesn't exist`

#### ✅ Login Multi-App (sin applicationName)
- `should return multi-app token when applicationName not provided`
- `token payload should have applications array`
- `token payload should NOT have applicationName or roles`
- `should include all applications with their roles`

#### ✅ Validación de Token
- `should validate single-app token correctly`
- `should validate multi-app token correctly`
- `should extract userId, username from both token types`

**Estimado:** ~9 tests

**⚠️ Prerequisito:** Requiere PostgreSQL con:
- User con roles en múltiples apps
- Aplicaciones configuradas en BD

---

### 6. Tests de Integración - VerifyAccess con Cache

**Archivo:** `tests/integration/cache-integration.test.ts`

**Casos de prueba:**

#### ✅ Cache Behavior
- `should cache user roles after first verification`
- `should use cached roles for subsequent requests within TTL`
- `should refresh cache after TTL expiration`
- `should not query database when cache hit`

#### ✅ Cache Invalidation
- `should invalidate cache when role assigned`
- `should invalidate cache when role revoked`
- `should fetch fresh data after invalidation`

#### ✅ Performance
- `should improve response time with cache (benchmark)`
- `database queries should be reduced significantly`

**Estimado:** ~8 tests

**⚠️ Prerequisito:** Requiere PostgreSQL + mocks de tiempo

---

### 7. Tests End-to-End - RBAC Completo

**Archivo:** `tests/e2e/rbac-workflow.test.ts`

**Casos de prueba:**

#### ✅ Workflow Completo
- `admin assigns role to user → user can verify access → admin revokes role → user access denied`
- `user logs in specific app → receives only that app's roles`
- `user with expired role → access denied`
- `cache invalidation propagates immediately`

#### ✅ Multi-App Scenarios
- `user with admin role in app1 and viewer in app2`
- `revoke all roles in app1 → app2 roles remain`
- `revoke all roles → no access to any app`

**Estimado:** ~7 tests

**⚠️ Prerequisito:** Requiere:
- PostgreSQL con migración RBAC
- Seed de datos: users, apps, roles, permissions
- Tests secuenciales (no paralelos)

---

## 📊 Resumen de Cobertura

| Componente | Tests Unitarios | Tests Integración | E2E |
|-----------|----------------|-------------------|-----|
| **MemoryCacheService** | 15 | - | - |
| **VerifyUserAccessUseCase** | 14 | - | - |
| **RoleManagementUseCases** | 13 | - | - |
| **AdminController** | - | 15 | - |
| **Login with appName** | - | 9 | - |
| **Cache Integration** | - | 8 | - |
| **RBAC Workflow** | - | - | 7 |
| **Auth API (existente)** | - | 17 | - |
| **TOTAL** | **42** | **49** | **7** |

**Total general:** **98 tests** (actualmente: 17)

---

## 🛠️ Setup Necesario

### Para Tests Unitarios
```bash
npm install --save-dev vitest @vitest/coverage-v8
```

**No requieren:**
- Base de datos
- Variables de entorno
- Instancias externas

### Para Tests de Integración
Requieren PostgreSQL de testing:

```bash
# .env.test
USE_POSTGRES=true
PG_HOST=localhost
PG_PORT=5432
PG_USER=test_user
PG_PASSWORD=test_pass
PG_DATABASE=auth_test

JWT_ACCESS_SECRET=test_secret_min_32_chars_long_!!
JWT_REFRESH_SECRET=test_refresh_secret_min_32_chars_long_!!
```

**Setup scripts:**
- `beforeAll()`: Ejecutar migración + seed
- `afterAll()`: Limpiar BD test
- `beforeEach()`: Reset datos (si necesario)

### Para Tests E2E
- Docker Compose con PostgreSQL test
- Scripts de migración automatizados
- Seed data fixtures

---

## 🚀 Priorización

### Fase 1: Tests Críticos (Prioridad Alta)
1. ✅ **MemoryCacheService.test.ts** - Componente fundamental
2. ✅ **VerifyUserAccessUseCase.test.ts** - Lógica de negocio crítica
3. ✅ **RoleManagementUseCases.test.ts** - CRUD de roles

**Tiempo estimado:** 2-3 horas  
**Beneficio:** Cobertura de lógica core sin dependencias externas

### Fase 2: Tests Integración (Prioridad Media)
4. ✅ **admin.test.ts** - Endpoints admin
5. ✅ **auth-rbac.test.ts** - Login con applicationName
6. ✅ **cache-integration.test.ts** - Cache + BD

**Tiempo estimado:** 3-4 horas  
**Beneficio:** Validación de contratos API + integración cache/BD

### Fase 3: Tests E2E (Prioridad Baja)
7. ✅ **rbac-workflow.test.ts** - Workflows completos

**Tiempo estimado:** 2 horas  
**Beneficio:** Validación de escenarios reales de usuario

---

## 📝 Comandos de Testing

```bash
# Todos los tests
npm test

# Tests unitarios solamente
npm run test:unit

# Tests de integración
npm run test:integration

# Tests E2E
npm run test:e2e

# Coverage report
npm run test:coverage

# Watch mode (desarrollo)
npm run test:watch
```

Agregar en `package.json`:
```json
{
  "scripts": {
    "test": "vitest run",
    "test:unit": "vitest run tests/unit",
    "test:integration": "vitest run tests/integration",
    "test:e2e": "vitest run tests/e2e",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest"
  }
}
```

---

## 🎯 Criterios de Aceptación

### Cobertura Mínima
- **Unitarios:** 90%+ (lógica de negocio)
- **Integración:** 80%+ (endpoints críticos)
- **General:** 85%+

### Performance
- Tests unitarios: < 5ms cada uno
- Tests integración: < 100ms cada uno
- Tests E2E: < 1s cada uno
- Suite completa: < 30s

### Calidad
- ✅ No tests flaky (resultados consistentes)
- ✅ Tests independientes (pueden correr en paralelo)
- ✅ Cleanup adecuado (no side effects)
- ✅ Nombres descriptivos
- ✅ Documentación de casos edge

---

## ⚡ Implementación Recomendada

**Orden sugerido:**

1. **MemoryCacheService.test.ts** → Más rápido, sin dependencias
2. **VerifyUserAccessUseCase.test.ts** → Requiere mock de cache y repository
3. **RoleManagementUseCases.test.ts** → Requiere mocks similares
4. **auth-rbac.test.ts** → Actualización de tests existentes
5. **admin.test.ts** → Requiere BD test configurada
6. **cache-integration.test.ts** → Requiere BD + observabilidad
7. **rbac-workflow.test.ts** → Workflows completos

**Ventajas de este orden:**
- Feedback rápido (unitarios primero)
- Construcción incremental de fixtures
- Detección temprana de bugs de lógica
- Confianza antes de tests costosos (E2E)
