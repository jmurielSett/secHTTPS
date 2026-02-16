# Autenticación Híbrida LDAP + Base de Datos

## 📋 Descripción

El sistema soporta autenticación con fallback automático:
1. **LDAP/Active Directory** (prioridad alta)
2. **Base de Datos Local** (fallback)

## 🚀 Configuración

### 1. Instalar dependencias

```bash
npm install ldapjs @types/ldapjs
```

### 2. Configurar variables de entorno (.env)

```bash
# Habilitar LDAP
ENABLE_LDAP=true

# Configurar servidores LDAP (JSON array)
LDAP_SERVERS=[{"url":"ldap://ldap.example.com:389","baseDN":"dc=example,dc=com","userSearchBase":"ou=users,dc=example,dc=com","userSearchFilter":"(uid={{username}})","timeout":5000}]
```

#### Ejemplos de configuración:

**OpenLDAP:**
```bash
LDAP_SERVERS=[{"url":"ldap://ldap.company.com:389","baseDN":"dc=company,dc=com","userSearchBase":"ou=employees,dc=company,dc=com","userSearchFilter":"(uid={{username}})","bindDN":"cn=admin,dc=company,dc=com","bindPassword":"admin_password","timeout":5000}]
```

**Active Directory:**
```bash
LDAP_SERVERS=[{"url":"ldap://ad.company.com:389","baseDN":"dc=company,dc=com","userSearchBase":"ou=employees,dc=company,dc=com","userSearchFilter":"(sAMAccountName={{username}})","bindDN":"CN=Service Account,OU=Service Accounts,DC=company,DC=com","bindPassword":"service_password","timeout":5000}]
```

**Múltiples servidores (failover):**
```bash
LDAP_SERVERS=[{"url":"ldap://ldap1.company.com:389","baseDN":"dc=company,dc=com","userSearchBase":"ou=users,dc=company,dc=com","userSearchFilter":"(uid={{username}})","timeout":3000},{"url":"ldap://ldap2.company.com:389","baseDN":"dc=company,dc=com","userSearchBase":"ou=users,dc=company,dc=com","userSearchFilter":"(uid={{username}})","timeout":3000}]
```

### 3. Configurar aplicaciones para LDAP auto-sync

La auto-creación de usuarios LDAP se controla **por aplicación** en la base de datos:

```sql
-- Permitir auto-creación de usuarios LDAP con rol 'viewer'
UPDATE applications 
SET allow_ldap_sync = TRUE, ldap_default_role = 'viewer' 
WHERE name = 'secHTTPS_APP';

-- Denegar auto-creación (usuarios deben ser creados manualmente)
UPDATE applications 
SET allow_ldap_sync = FALSE 
WHERE name = 'secure_app';
```

## 🔄 Flujos de Autenticación

### Escenario 1: Usuario LDAP, aplicación permite auto-sync

```
POST /auth/login
{
  "username": "jdoe",
  "password": "ldap_password",
  "applicationName": "secHTTPS_APP"
}

1. ✅ LDAP autentica
2. ❓ Usuario existe en BD? → NO
3. ✅ Aplicación permite LDAP sync? → SÍ (allow_ldap_sync=TRUE)
4. ✅ Usuario creado en BD
5. ✅ Rol 'viewer' asignado (ldap_default_role)
6. ✅ Login exitoso con JWT
```

### Escenario 2: Usuario LDAP, aplicación NO permite auto-sync

```
POST /auth/login
{
  "username": "jdoe",
  "password": "ldap_password",
  "applicationName": "secure_app"
}

1. ✅ LDAP autentica
2. ❓ Usuario existe en BD? → NO
3. ❌ Aplicación permite LDAP sync? → NO (allow_ldap_sync=FALSE)
4. ❌ Error: "User authenticated but not authorized for application"
```

### Escenario 3: Usuario existe en LDAP y BD

```
1. ✅ LDAP autentica
2. ✅ Usuario encontrado en BD
3. ✅ Verificar roles en BD
4. ✅ Login exitoso con JWT
```

### Escenario 4: LDAP falla, fallback a BD

```
1. ❌ LDAP no disponible o credenciales no válidas en LDAP
2. ✅ Intentar autenticación con BD
3. ✅ Login exitoso con JWT (si credenciales son válidas en BD)
```

## 🔐 Gestión de Aplicaciones

### Permitir auto-creación con rol específico

```sql
UPDATE applications 
SET 
  allow_ldap_sync = TRUE,
  ldap_default_role = 'viewer'  -- o 'user', 'editor', 'admin'
WHERE name = 'myApp';
```

### Permitir auto-creación sin rol (admin asigna después)

```sql
UPDATE applications 
SET 
  allow_ldap_sync = TRUE,
  ldap_default_role = NULL
WHERE name = 'myApp';
```

### Denegar auto-creación

```sql
UPDATE applications 
SET allow_ldap_sync = FALSE 
WHERE name = 'secure_app';
```

### Crear nueva aplicación con LDAP sync

```sql
INSERT INTO applications 
  (name, description, is_active, allow_ldap_sync, ldap_default_role)
VALUES 
  ('new_app', 'Nueva aplicación', TRUE, TRUE, 'viewer');
```

## 📊 Logs

```
[Auth] LDAP authentication enabled with 2 server(s)
[Auth] Database authentication enabled
[Auth] Using PostgreSQL application repository
[Auth] Attempting authentication with provider: LDAP
[Auth] Authentication successful with provider: LDAP
[Auth] Created user jdoe in database with ID: 123
[Auth] Assigned role 'viewer' to user jdoe in 'secHTTPS_APP'
```

## 🔧 Solución de Problemas

### ldapjs module not found
```bash
npm install ldapjs @types/ldapjs
```

### Error al parsear LDAP_SERVERS
Verificar que el JSON en .env sea válido (sin saltos de línea, comillas correctas)

### Connection timeout
- Verificar conectividad al servidor LDAP
- Aumentar timeout en configuración
- Verificar firewall/puertos (389 LDAP, 636 LDAPS)

### Usuario autenticado pero sin acceso
- Verificar que la aplicación tenga `allow_ldap_sync = TRUE`
- Verificar que el rol especificado en `ldap_default_role` exista en la tabla `roles`

## 📝 Recomendaciones

### Para Producción
```bash
ENABLE_LDAP=true
LDAP_SERVERS=[{"url":"ldap://ldap.prod.com:389",...}]
LOG_AUTH_ATTEMPTS=false
```

```sql
-- Apps públicas: permitir con rol básico
UPDATE applications SET allow_ldap_sync = TRUE, ldap_default_role = 'viewer' 
WHERE name IN ('public_portal', 'dashboard');

-- Apps sensibles: requerir aprobación manual
UPDATE applications SET allow_ldap_sync = FALSE 
WHERE name IN ('admin_console', 'finance_app');
```

### Para Desarrollo
```bash
ENABLE_LDAP=false
LOG_AUTH_ATTEMPTS=true
```

### JWT includes authProvider

El token JWT incluye información sobre qué proveedor autenticó al usuario:

```json
{
  "userId": "123",
  "username": "jdoe",
  "authProvider": "LDAP",  // o "DATABASE"
  "type": "access"
}
```

Esto permite saber en tiempo de ejecución si el usuario se autenticó vía LDAP o BD local.

## 📚 Referencias

- [ldapjs](http://ldapjs.org/)
- [OpenLDAP](https://www.openldap.org/)
- [Active Directory LDAP](https://docs.microsoft.com/en-us/windows/win32/ad/active-directory-ldap)
