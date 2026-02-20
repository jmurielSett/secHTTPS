# Authentication vs Authorization

## 🔐 Autenticación (Stateless - JWT)

**ValidateTokenUseCase** - Solo valida el token:
- ✅ Firma correcta
- ✅ No expirado
- ✅ Formato válido

**NO verifica:**
- ❌ Si el usuario aún existe en BD
- ❌ Si los roles han sido revocados
- ❌ Si el usuario fue desactivado

### Ejemplo de uso:
```typescript
// Solo valida token
const tokenData = validateTokenUseCase.execute(accessToken);
// tokenData contiene lo que el usuario tenía al momento de login
```

**Ventaja:** Muy rápido (no consulta BD), escalable

**Desventaja:** Roles pueden estar desactualizados hasta que expire el token

---

## 🛡️ Autorización (Stateful - Database)

**VerifyUserAccessUseCase** - Verifica permisos actuales contra BD:
- ✅ Usuario existe
- ✅ Usuario está activo
- ✅ Roles actuales en la aplicación
- ✅ Roles no han sido revocados

### Ejemplo de uso:
```typescript
// 1. Primero valida token
const tokenData = validateTokenUseCase.execute(accessToken);

// 2. Luego verifica permisos actuales
const hasAccess = await verifyUserAccessUseCase.execute(
  tokenData.userId,
  'secHTTPS_APP',
  'admin'
);

if (!hasAccess) {
  throw new Error('Access denied');
}
```

**Ventaja:** Siempre actualizado, puede revocar acceso inmediatamente

**Desventaja:** Más lento (consulta BD en cada request)

---

## 🎯 ¿Cuándo usar cada uno?

### Usar solo Autenticación (ValidateTokenUseCase)
- ✅ Endpoints públicos donde solo necesitas saber quién es el usuario
- ✅ Aplicaciones donde performance es crítica
- ✅ Cuando los tokens tienen TTL corto (5-15 min)

### Usar Autenticación + Autorización (+ VerifyUserAccessUseCase)
- ✅ Endpoints críticos (delete, update permisos, etc.)
- ✅ Cuando necesitas revocar acceso inmediatamente
- ✅ Aplicaciones con requisitos de seguridad altos
- ✅ Tokens con TTL largo (>1 hora)

---

## 📋 Ejemplo completo de Middleware

```typescript
// middleware/requireRole.ts
export function requireRole(appName: string, roleName: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // 1. Validar token (stateless)
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const tokenData = validateTokenUseCase.execute(token);

      // 2. Verificar permisos actuales (stateful)
      const hasAccess = await verifyUserAccessUseCase.execute(
        tokenData.userId,
        appName,
        roleName
      );

      if (!hasAccess) {
        return res.status(403).json({ 
          error: 'Access denied',
          message: `User does not have '${roleName}' role in '${appName}'`
        });
      }

      // 3. Adjuntar datos del usuario al request
      req.user = tokenData;
      next();
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  };
}

// Uso en rutas
router.delete('/certificates/:id', 
  requireRole('secHTTPS_APP', 'admin'),
  deleteCertificateHandler
);
```

---

## ⚠️ Escenarios de Seguridad

### Escenario 1: Usuario con token válido pero rol revocado
```
1. Usuario hace login → JWT con role: ["admin"]
2. Admin revoca rol del usuario en BD
3. Usuario usa token antiguo:
   - ValidateTokenUseCase ✅ Token válido
   - VerifyUserAccessUseCase ❌ Sin acceso (consultó BD)
4. Resultado: 403 Forbidden
```

### Escenario 2: Token expirado pero usuario aún tiene permisos
```
1. Usuario hace login → JWT expira después de 15 min
2. Después de 20 min, usuario intenta acceder:
   - ValidateTokenUseCase ❌ Token expirado
3. Resultado: 401 Unauthorized (debe hacer refresh)
```

### Escenario 3: Solo validación de token (no verifica BD)
```
1. Usuario hace login → JWT con role: ["admin"]
2. Admin revoca rol del usuario en BD
3. Usuario usa token antiguo con solo ValidateTokenUseCase:
   - ValidateTokenUseCase ✅ Token válido
4. Resultado: 200 OK (⚠️ acceso con rol revocado hasta que expire el token)
```

---

## 💡 Recomendación Final

**Balance entre seguridad y performance:**

1. **Endpoints de lectura** → Solo ValidateTokenUseCase
2. **Endpoints de escritura/críticos** → ValidateTokenUseCase + VerifyUserAccessUseCase
3. **Tokens con TTL corto (15min)** → Menor riesgo de roles desactualizados
4. **Cache del check de autorización** → `MemoryCacheService` con TTL 15 min (coincide con el access token), invalidación automática al asignar/revocar roles vía `/admin/*`

```typescript
// El sistema ya implementa esto en VerifyUserAccessUseCase:
// - Cache hit: devuelve roles desde memoria (sin consultar BD)
// - Cache miss: consulta BD, almacena con TTL de 900s (15 min)
// - Invalidación automática al modificar roles vía /admin/roles/*
const hasAccess = await verifyUserAccessUseCase.execute(
  tokenData.userId,
  appName,
  requiredRole
);
```
