# Scripts de Creación de Usuarios

Scripts para crear usuarios de prueba en la base de datos `auth_db` con diferentes roles para la aplicación `secHTTPS_APP`.

## 🔑 Roles Disponibles

| Rol | Permisos | Usuario por defecto |
|-----|----------|---------------------|
| **admin** | Acceso completo (CRUD + notificaciones) | `admin` / `Admin123` |
| **editor** | Crear, leer, actualizar certificados | `editor` / `Editor123` |
| **viewer** | Solo lectura de certificados | `viewer` / `Viewer123` |
| **auditor** | Leer certificados + leer notificaciones | `auditor` / `Auditor123` |

## 📋 Requisitos Previos

1. Base de datos PostgreSQL corriendo en Docker
2. Migraciones ejecutadas (`npm run migrate`)
3. Variables de entorno configuradas en `.env`

## 🚀 Uso

### Opción 1: Usar scripts npm (recomendado)

```bash
cd auth_APP

# Crear usuario viewer (solo lectura)
npm run user:create:viewer

# Crear usuario editor (crear/editar)
npm run user:create:editor

# Crear usuario auditor (leer + notificaciones)
npm run user:create:auditor
```

### Opción 2: Ejecutar directamente con tsx

```bash
cd auth_APP

# Crear usuario viewer
npx tsx src/scripts/createViewerUser.ts

# Crear usuario editor
npx tsx src/scripts/createEditorUser.ts

# Crear usuario auditor
npx tsx src/scripts/createAuditorUser.ts
```

### Usuario Viewer (solo lectura)

**Credenciales por defecto:**
- Username: `viewer`
- Password: `Viewer123`
- Rol: `viewer` (solo lectura)

### Usuario Editor (crear/editar)

**Credenciales por defecto:**
- Username: `editor`
- Password: `Editor123`
- Rol: `editor` (crear, leer, actualizar)

### Usuario Auditor (leer + notificaciones)

**Credenciales por defecto:**
- Username: `auditor`
- Password: `Auditor123`
- Rol: `auditor` (leer certificados + notificaciones)

## 🔧 Personalización

Para crear un usuario con configuración personalizada, edita las constantes en el script correspondiente:

```typescript
const viewerConfig: ViewerUserConfig = {
  username: 'tu_usuario',      // Nombre de usuario
  email: 'email@ejemplo.com',  // Email
  password: 'TuPass123',       // Contraseña (debe tener mayúscula, minúscula y número)
  applicationName: 'secHTTPS_APP',
  roleName: 'viewer'           // Rol deseado
};
```

## 📊 Verificación

Después de ejecutar el script, puedes verificar que el usuario fue creado:

```bash
# Conectar a la base de datos
docker exec -it <container_id> psql -U auth -d auth_db

# Verificar usuario y roles
SELECT u.username, a.name as application, r.name as role
FROM user_application_roles uar
JOIN users u ON uar.user_id = u.id
JOIN applications a ON uar.application_id = a.id
JOIN roles r ON uar.role_id = r.id
WHERE u.username = 'viewer';
```

## 🧪 Probar Login

Accede a [http://localhost:5173](http://localhost:5173) y prueba con las credenciales generadas.

**Verificar permisos por rol:**
- **viewer**: Solo ve botones de lectura, no puede crear/editar/eliminar
- **editor**: Puede crear y editar certificados, NO puede eliminar
- **auditor**: Lectura de certificados + acceso a notificaciones
- **admin**: Acceso completo (ya existe por defecto)

## 🔒 Seguridad

- Las contraseñas se almacenan hasheadas con bcrypt
- Todos los usuarios usan autenticación `DATABASE`
- El script verifica si el usuario ya existe antes de crearlo
- Las contraseñas deben cumplir la política: mayúscula + minúscula + número

## ⚠️ Notas

- Los scripts conectan a la base de datos usando las credenciales del archivo `.env`
- Si el usuario ya existe, el script NO lo sobrescribe
- Los roles deben existir previamente (creados en las migraciones)
- La aplicación `secHTTPS_APP` debe existir en la tabla `applications`
