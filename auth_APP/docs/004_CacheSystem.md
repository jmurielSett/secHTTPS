# Cache System - In-Memory Role Caching

## 📋 Resumen

Sistema de cache en memoria para roles de usuario con invalidación automática al revocar/asignar permisos.

**Características:**
- ✅ TTL configurable (default: 15 minutos, coincide con Access Token)
- ✅ Tamaño máximo configurable (default: 1000 entradas)
- ✅ Limpieza automática de entradas expiradas cada 60 segundos
- ✅ Invalidación automática al modificar roles
- ✅ Invalidación manual por usuario o por usuario+app

---

## 🔧 Configuración

```typescript
// En src/types/shared.ts
export const CACHE_CONFIG = {
  TTL_SECONDS: 900,              // 15 minutos (coincide con Access Token)
  MAX_SIZE: 1000,                // Máximo número de entradas
  CLEANUP_INTERVAL_MS: 60000     // Limpieza cada 60 segundos
} as const;

// En app.ts
import { CACHE_CONFIG } from './types/shared';

const cacheService = new MemoryCacheService(
  CACHE_CONFIG.TTL_SECONDS,          // TTL: cuando expira cada entrada
  CACHE_CONFIG.MAX_SIZE,             // Máximo de entradas en memoria
  CACHE_CONFIG.CLEANUP_INTERVAL_MS   // Cada cuánto limpiar expirados
);
```

**⚠️ Importante sobre CLEANUP_INTERVAL_MS:**
- El cleanup **NO elimina antes de expirar**
- Solo elimina entradas que **ya expiraron** (garbage collection)
- Ejemplo: Entry expira en T=900s, cleanup detecta y elimina en T=960s
- El método `get()` también valida expiración (lazy deletion)

---

## 🚀 Endpoints Admin

### 1. Asignar Rol
```http
POST /admin/roles/assign
Content-Type: application/json

{
  "userId": "1",
  "applicationName": "secHTTPS_APP",
  "roleName": "admin",
  "grantedBy": "2",           // Opcional: ID del admin que otorga
  "expiresAt": "2026-12-31"   // Opcional: fecha de expiración
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Role 'admin' assigned to user 1 in 'secHTTPS_APP'"
}
```

**⚡ Cache:** Automáticamente invalida cache del usuario

---

### 2. Revocar Rol Específico
```http
POST /admin/roles/revoke
Content-Type: application/json

{
  "userId": "1",
  "applicationName": "secHTTPS_APP",
  "roleName": "admin"
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Role 'admin' revoked from user 1 in 'secHTTPS_APP'"
}
```

**⚡ Cache:** Automáticamente invalida cache del usuario

---

### 3. Revocar Todos los Roles en una App
```http
POST /admin/roles/revoke-all-in-app
Content-Type: application/json

{
  "userId": "1",
  "applicationName": "secHTTPS_APP"
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Revoked 3 roles from user 1 in 'secHTTPS_APP'",
  "revokedCount": 3
}
```

---

### 4. Revocar Todos los Roles
```http
POST /admin/roles/revoke-all
Content-Type: application/json

{
  "userId": "1"
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Revoked all 5 roles from user 1",
  "revokedCount": 5
}
```

---

### 5. Invalidar Cache Manualmente
```http
POST /admin/cache/invalidate
Content-Type: application/json

{
  "userId": "1"
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Invalidated 2 cache entries for user 1",
  "deletedCount": 2
}
```

**Útil cuando:**
- Se modifican roles directamente en BD (fuera de la API)
- Se necesita forzar recarga de permisos
- Debugging de problemas de cache

---

## 🔍 Flujo de Verificación con Cache

```typescript
// 1. Usuario hace request con JWT
const tokenData = validateTokenUseCase.execute(accessToken);

// 2. Verificar acceso (usa cache automáticamente)
const hasAccess = await verifyUserAccessUseCase.execute(
  tokenData.userId,
  'secHTTPS_APP',
  'admin'
);

// Internamente:
// - Busca en cache: user:1:app:secHTTPS_APP:roles
// - Si no existe (cache miss): consulta BD y almacena con TTL 900s (15 min)
// - Si existe (cache hit): retorna desde cache (sin consultar BD)
```

---

## 📊 Estadísticas de Cache

El servicio de cache mantiene estadísticas internas:

```typescript
const stats = cacheService.getStats();
console.log(stats);
// Output: { size: 45, maxSize: 1000 }
```

---

## ⏱️ Comportamiento TTL

### Cache Hit (dentro de TTL)
```
Request 1 (T=0s):     Cache miss → BD query → Cache store (TTL=900s = 15 min)
Request 2 (T=5min):   Cache hit  → No BD query ✅
Request 3 (T=10min):  Cache hit  → No BD query ✅
Request 4 (T=16min):  Cache miss → BD query → Cache store (expiró)
```

### Invalidación Manual
```
Request 1 (T=0s):    Cache miss → BD query → Cache store (TTL=900s = 15 min)
Request 2 (T=5min):  Cache hit  → No BD query ✅
Admin revoca rol:    Cache invalidada ❌
Request 3 (T=6min):  Cache miss → BD query (rol revocado detectado)
```

---

## 🎯 Escenarios de Uso

### Escenario 1: Usuario con roles en cache válidos
```
1. Login → JWT generado con roles actuales
2. Request protegido:
   - Validar JWT ✅
   - Verificar roles (cache hit) ✅
   - Sin consulta BD 🚀
3. Resultado: 200 OK (muy rápido)
```

### Escenario 2: Admin revoca rol
```
1. Usuario tiene cache con ["admin", "editor"]
2. Admin revoca "admin":
   POST /admin/roles/revoke
   → BD: rol eliminado
   → Cache: invalidada automáticamente
3. Siguiente request del usuario:
   - Validar JWT ✅ (aún tiene token válido)
   - Verificar roles (cache miss) 
   - BD query: ["editor"] (rol revocado detectado) ✅
4. Resultado: 403 Forbidden (no tiene rol "admin")
```

### Escenario 3: Cache expira naturalmente
```
1. Usuario tiene cache: ["admin"]
2. Pasan 121 segundos sin requests
3. Nuevo request:
   - Cache expirada (TTL=120s)
   - BD query: obtiene roles actuales
   - Nuevo cache store
4. Proceso transparente para el cliente
```

---

## 🛡️ Ventajas del Sistema

### Sin Cache
```
Cada request → BD query
100 requests/seg = 100 queries/seg
Alta carga en BD
Latencia: ~50-100ms por request
```

### Con Cache (TTL 15 min)
```
Primera request → BD query + cache store
Siguientes 15 min → cache hits (sin BD)
100 requests/seg = ~1 query cada 15 min
Baja carga en BD
Latencia: ~1-5ms por request (cache hit)
```

**Reducción de carga BD:** ~99%  
**Mejora de latencia:** 10-100x más rápido

---

## ⚠️ Consideraciones

### 1. Consistencia Eventual (dentro del TTL)
Si modificas roles directamente en BD (sin usar API), pueden pasar hasta 15 minutos hasta reflejarse.

**Solución:** Usar endpoint `/admin/cache/invalidate`

### 2. Memoria RAM
1000 entradas ≈ 50-100KB RAM (muy ligero)

Para cargas mayores, ajustar `maxSize`:
```typescript
const cacheService = new MemoryCacheService(120, 10000); // 10K entradas
```

### 3. Multi-Instancia
Cache es **local por instancia**. En un cluster con múltiples instancias, cada servidor tiene su propio cache.

**Para producción distribuida:** Usar Redis en lugar de MemoryCacheService.

---

## 🔄 Migración a Redis (Futuro)

Para entornos multi-instancia, reemplazar `MemoryCacheService` por `RedisCacheService`:

```typescript
// Mismo interfaz, diferente implementación
const cacheService = new RedisCacheService(
  process.env.REDIS_URL,
  CACHE_CONFIG.TTL_SECONDS  // 900 segundos
);

// Todo lo demás funciona igual
const verifyAccessUseCase = new VerifyUserAccessUseCase(
  userRepository,
  cacheService  // Drop-in replacement
);
```

**Ventajas Redis:**
- Cache compartido entre todas las instancias
- Persistencia opcional
- Pub/Sub para invalidación en tiempo real

---

## 📝 Logs del Sistema

```
[Cache] Cleaned 15 expired entries
[RBAC] Assigned role 'admin' to user 1 in secHTTPS_APP
[Cache] Invalidated 2 entries for user 1
[RBAC] Revoked role 'editor' from user 3 in auth_APP
[Cache] Invalidated 1 entries for user 3
```

---

## 🧪 Testing

```typescript
// Verificar que cache se invalida
const cacheService = new MemoryCacheService(
  CACHE_CONFIG.TTL_SECONDS,
  CACHE_CONFIG.MAX_SIZE
);
const verifyUseCase = new VerifyUserAccessUseCase(repo, cacheService);

// Primera llamada: cache miss
await verifyUseCase.execute('1', 'secHTTPS_APP', 'admin'); // BD query

// Segunda llamada: cache hit
await verifyUseCase.execute('1', 'secHTTPS_APP', 'admin'); // No BD query

// Invalidar
verifyUseCase.invalidateUserCache('1');

// Tercera llamada: cache miss (invalidado)
await verifyUseCase.execute('1', 'secHTTPS_APP', 'admin'); // BD query
```
