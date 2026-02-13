# Implementación de Base de Datos PostgreSQL

## Contexto del Proyecto

Este documento describe la implementación de persistencia con PostgreSQL para reemplazar el almacenamiento en memoria actual.

### Estado Actual (Rama: databaseFeature)

- **Backend**: Express + TypeScript con Clean Architecture
- **Persistencia actual**: In-Memory (InMemoryCertificateRepository, InMemoryNotificationRepository)
- **Tests**: 50 tests pasando (28 certificados + 13 notificaciones + 9 servicio)
- **Arquitectura**: Domain/UseCases, Infrastructure/Persistence, Infrastructure/Transport

### Estructura de Carpetas Actual

```
src/
  ├── app.ts
  ├── server.ts
  ├── domain/
  │   ├── services/
  │   │   └── CertificateExpirationService.ts
  │   └── usecases/
  │       ├── certificates/
  │       │   ├── CreateCertificateUseCase.ts
  │       │   ├── GetCertificatesUseCase.ts
  │       │   ├── GetCertificateByIdUseCase.ts
  │       │   ├── UpdateCertificateUseCase.ts
  │       │   └── UpdateCertificateStatusUseCase.ts
  │       └── notifications/
  │           ├── CreateNotificationUseCase.ts
  │           ├── GetNotificationsUseCase.ts
  │           └── GetCertificateNotificationsUseCase.ts
  ├── infrastructure/
  │   ├── middleware/
  │   │   └── requestLogger.ts
  │   ├── persistence/
  │   │   ├── CertificateRepository.ts (InMemory)
  │   │   └── NotificationRepository.ts (InMemory)
  │   └── transport/
  │       ├── controllers/
  │       ├── routes/
  │       └── middlewares/
  └── types/
      ├── certificate.ts
      ├── notification.ts
      ├── errors.ts
      └── shared.ts
```

## Decisión de Diseño: PostgreSQL Database

### Estructura de Base de Datos Normalizada

El diseño utiliza **4 tablas**:

1. **`certificates`** - Datos principales del certificado
2. **`certificate_responsible_emails`** - Emails responsables (1:N con certificates)
3. **`notifications`** - Datos principales de la notificación
4. **`notification_recipient_emails`** - Emails destinatarios (1:N con notifications)

**Ventajas de la normalización:**
- ✅ Integridad referencial nativa
- ✅ Búsquedas eficientes por email
- ✅ Sin parsing de JSON
- ✅ Más flexible para futuras queries (ej: "todos los certificados del email X")
- ✅ Mejor para índices y estadísticas de PostgreSQL

**Conversión en Repository:**
Los repositorios PostgreSQL hacen JOINs/queries adicionales y convierten las múltiples filas en arrays:
```
DB: certificate_id=1 → email=admin@empresa.com
    certificate_id=1 → email=devops@empresa.com

App: { id: 1, responsibleEmails: ['admin@empresa.com', 'devops@empresa.com'] }
```

### Requisitos

1. **Doble Entorno**:
   - Desarrollo: PostgreSQL en Docker
   - Producción: PostgreSQL existente en servidor
   - Configuración mediante variables de entorno

2. **Sin stored procedures**:
   - Solo CRUD básico
   - Sin procedures, functions complejas
   - Lógica de negocio en TypeScript

3. **Clean Architecture**:
   - Mantener interfaces de Repository
   - Implementación intercambiable (InMemory ↔ PostgreSQL)
   - Tests deben seguir funcionando

### Por qué PostgreSQL

- Base de datos open source, sin licencias
- Excelente soporte en Node.js con librería `pg`
- Docker ligero y rápido (~200MB vs 2-3GB de Oracle)
- Gran comunidad y documentación
- Fácil configuración y mantenimiento

## Plan de Implementación

### Fase 1: Configuración Docker y Dependencias

#### 1.1. Instalar dependencias Node.js

```bash
npm install pg dotenv
npm install -D @types/pg
```

#### 1.2. Crear docker-compose.yml

Establecer un servidor PostgreSQL en local para desarrollo y pruebas. En producción se utilizará el servidor PostgreSQL que tenga disponible el cliente, configurado mediante variables de entorno.

El `docker-compose.yml` implementado solo levanta un contenedor PostgreSQL ligero para facilitar el desarrollo local. No incluye scripts de inicialización automática ya que se utiliza el sistema de migraciones controladas descrito en la sección "Sistema de Migraciones (IMPLEMENTADO)".

#### 1.3. Crear archivos de migración SQL

> **Nota:** Este enfoque de scripts SQL auto-ejecutados por Docker (`database/init/`) ha sido **reemplazado por el Sistema de Migraciones Profesional**.
>
> Los scripts SQL ahora están en `src/infrastructure/database/migrations/` y se ejecutan mediante el comando `npm run db:migrate`.
>
> **Consulta la sección "Sistema de Migraciones (IMPLEMENTADO)"** más abajo para ver la implementación actual con los archivos:
> - `001_create_certificates_table.sql`
> - `002_create_notifications_table.sql`
>
> Este sistema proporciona control de versiones, idempotencia y tracking de migraciones ejecutadas.

#### 1.4. Variables de entorno

**.env.example** (plantilla para el repositorio)
```env
# PostgreSQL Database Configuration
PG_HOST=localhost
PG_PORT=5432
PG_USER=username
PG_PASSWORD=password
PG_DATABASE=database_name

# Application Configuration
PORT=3000
NODE_ENV=development

# Repository Mode
# Set to 'true' to use PostgreSQL, 'false' for InMemory (default: false)
USE_POSTGRES=false
```

**.env.development** (desarrollo local con Docker)
```env
# PostgreSQL Development (Docker)
PG_HOST=localhost
PG_PORT=5432
PG_USER=xxxx
PG_PASSWORD=xxxx
PG_DATABASE=xxxx

# Application
PORT=3000
NODE_ENV=development

# Repository Mode
USE_POSTGRES=false
```

**.env** (producción - a crear en el futuro)
```env
# PostgreSQL Production (Servidor del cliente)
PG_HOST=postgres-server.empresa.com
PG_PORT=5432
PG_USER=<production_user>
PG_PASSWORD=<production_password>
PG_DATABASE=xxxx

# Application
PORT=3000
NODE_ENV=production

# Repository Mode
USE_POSTGRES=true
```

> **Nota:** Los archivos `.env.development` y `.env` no se suben a Git (incluidos en `.gitignore`). Solo `.env.example` se versiona como plantilla.

### Fase 2: Implementar Capa de Conexión

#### 2.1. Crear configuración de base de datos

**src/infrastructure/database/config.ts**
```typescript
import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export function getDatabaseConfig(): PoolConfig {
  const user = process.env.PG_USER;
  const password = process.env.PG_PASSWORD;
  const host = process.env.PG_HOST;
  const port = process.env.PG_PORT;
  const database = process.env.PG_DATABASE;

  if (!user || !password || !host || !port || !database) {
    throw new Error('Missing required PostgreSQL connection environment variables');
  }

  return {
    user,
    password,
    host,
    port: parseInt(port, 10),
    database,
    min: 1,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  };
}

let pool: Pool | null = null;

export async function initializePool(): Promise<Pool> {
  if (pool) {
    return pool;
  }

  const config = getDatabaseConfig();
  pool = new Pool(config);
  
  // Test connection
  try {
    const client = await pool.connect();
    client.release();
    console.log('✅ PostgreSQL connection pool initialized');
  } catch (error) {
    console.error('❌ Failed to initialize PostgreSQL pool:', error);
    throw error;
  }
  
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('✅ PostgreSQL connection pool closed');
  }
}

export function getPool(): Pool {
  if (!pool) {
    throw new Error('Database pool not initialized. Call initializePool() first.');
  }
  return pool;
}
```

### Fase 3: Implementar PostgreSQL Repositories

#### 3.1. PostgresCertificateRepository

**src/infrastructure/persistence/PostgresCertificateRepository.ts**

Debe implementar la interfaz `ICertificateRepository` existente:
- `create(data: CreateCertificateDTO): Promise<Certificate>`
- `findAll(filters?: GetCertificatesFilters): Promise<Certificate[]>`
- `findById(id: string): Promise<Certificate | null>`
- `update(id: string, data: UpdateCertificateDTO): Promise<Certificate | null>`
- `updateStatus(id: string, status: CertificateStatus): Promise<Certificate | null>`

Consideraciones:
- Usar parametrized queries ($1, $2, etc.) para prevenir SQL injection
- **Emails en tabla separada**: 
  - Al crear: INSERT en `certificates` + múltiples INSERT en `certificate_responsible_emails`
  - Al consultar: JOIN o query adicional para obtener emails y convertir a `string[]`
  - Al actualizar emails: DELETE antiguos + INSERT nuevos en `certificate_responsible_emails`
- Calcular expirationStatus usando CertificateExpirationService
- Manejar fechas correctamente (ISO string ↔ PostgreSQL DATE)
- Usar transacciones para operaciones multi-tabla (certificate + emails)

**Ejemplo de query para findById con emails:**
```sql
SELECT 
  c.*,
  e.email
FROM certificates c
LEFT JOIN certificate_responsible_emails e ON c.id = e.certificate_id
WHERE c.id = $1
```
Luego agrupar las filas para construir el array `responsibleEmails: string[]`

#### 3.2. PostgresNotificationRepository

**src/infrastructure/persistence/PostgresNotificationRepository.ts**

Debe implementar la interfaz `INotificationRepository`:
- `create(data: CreateNotificationDTO): Promise<Notification>`
- `findAll(filters?: GetNotificationsFilters): Promise<Notification[]>`
- `findByCertificateId(certificateId: string): Promise<Notification[]>`

Consideraciones:
- Usar parametrized queries ($1, $2, etc.)
- **Emails en tabla separada**:
  - Al crear: INSERT en `notifications` + múltiples INSERT en `notification_recipient_emails`
  - Al consultar: JOIN o query adicional para obtener emails y convertir a `string[]`
- Filtros por certificateId, result, expirationStatus, startDate, endDate
- Ordenar por sent_at DESC
- Usar transacciones para operaciones multi-tabla (notification + emails)

**Ejemplo de query para findAll con emails:**
```sql
SELECT 
  n.*,
  e.email
FROM notifications n
LEFT JOIN notification_recipient_emails e ON n.id = e.notification_id
WHERE n.certificate_id = $1
ORDER BY n.sent_at DESC
```
Luego agrupar las filas para construir el array `recipientEmails: string[]` por cada notificación

### Fase 4: Modificar app.ts para usar PostgreSQL

**src/app.ts** debe:
1. Importar `initializePool` y repositories de PostgreSQL
2. Inicializar pool al arrancar
3. Decidir qué repositorio usar según una variable de entorno (opcional: USE_POSTGRES=true/false)
4. Inyectar repositorios PostgreSQL en lugar de InMemory

Pseudo-código:
```typescript
// Si USE_POSTGRES=true → PostgreSQL, sino → InMemory (para tests rápidos)
const usePostgres = process.env.USE_POSTGRES === 'true';

if (usePostgres) {
  await initializePool();
  certificateRepository = new PostgresCertificateRepository();
  notificationRepository = new PostgresNotificationRepository();
} else {
  certificateRepository = new InMemoryCertificateRepository();
  notificationRepository = new InMemoryNotificationRepository();
}
```

### Fase 5: Actualizar Tests

#### 5.1. Configuración de tests

**vitest.config.ts** - Los tests usan InMemory por defecto (rápido, sin dependencias externas).

Para tests con PostgreSQL real (opcional):
- Configurar `USE_POSTGRES=true` antes de ejecutar tests
- Usar base de datos de test separada para evitar contaminar datos de desarrollo

#### 5.2. Setup/Teardown

Si se implementan tests con PostgreSQL (opcional):
- `beforeAll()`: Conectar a BD, ejecutar migraciones, limpiar tablas
- `afterEach()`: Limpiar datos entre tests (DELETE o transacciones con ROLLBACK)
- `afterAll()`: Cerrar pool de conexiones

#### 5.3. Migrar tests existentes

Los 50 tests actuales deben seguir funcionando:
- Cambiar `createApp()` para que use PostgreSQL en tests
- Asegurar aislamiento entre tests (transacciones o limpieza)
- Mismas aserciones, diferente persistencia

### Fase 6: Scripts y Comandos

#### package.json

Añadir scripts:
```json
{
  "scripts": {
    "docker:up": "docker-compose up -d",
    "docker:down": "docker-compose down",
    "docker:logs": "docker-compose logs -f postgres",
    "db:reset": "npm run docker:down && docker volume rm sechttps_postgres-data 2>/dev/null || true && npm run docker:up"
  }
}
```

## Checklist de Implementación

### Preparación
- [ ] Instalar dependencias: `pg`, `dotenv`
- [ ] Crear `docker-compose.yml`
- [ ] ~~Crear script SQL `database/init/01_create_schema.sql`~~ → **Usar sistema de migraciones** (ver sección "Sistema de Migraciones (IMPLEMENTADO)")
- [ ] Crear archivos `.env.example` (plantilla) y `.env.development` (desarrollo local)
- [ ] Actualizar `.gitignore` para excluir `.env` y `.env.development` (mantener `.env.example`)

### Implementación
- [ ] Crear `src/infrastructure/database/config.ts` con pool de conexiones
- [ ] Implementar `PostgresCertificateRepository.ts`
- [ ] Implementar `PostgresNotificationRepository.ts`
- [ ] Modificar `src/app.ts` para soportar PostgreSQL y InMemory
- [ ] Añadir manejo de cierre graceful en `src/server.ts`

### Testing
- [ ] Tests usan InMemory por defecto (USE_POSTGRES=false)
- [ ] Crear helpers de setup/teardown si se usan tests con PostgreSQL (opcional)
- [ ] Ejecutar tests: `npm test -- --run`
- [ ] Verificar que los 50 tests siguen pasando

### Documentación
- [ ] Actualizar README.md con instrucciones Docker
- [ ] Documentar variables de entorno necesarias
- [ ] Crear archivo `.env.example`

### Validación Final
- [ ] Levantar Docker PostgreSQL: `npm run docker:up`
- [ ] Verificar conexión a PostgreSQL
- [ ] Ejecutar tests: `npm test -- --run`
- [ ] Probar endpoints manualmente con curl/Postman
- [ ] Verificar logs del middleware funcionan correctamente

## Comandos Útiles

### Docker
```bash
# Levantar PostgreSQL
docker-compose up -d

# Ver logs
docker-compose logs -f postgres

# Conectar a PostgreSQL manualmente
docker exec -it secHTTPS-postgres psql -U sechttps -d sechttps_db

# Bajar todo
docker-compose down -v  # -v elimina volúmenes
```

### Desarrollo
```bash
# Instalar dependencias
npm install

# Levantar servidor en modo watch
npm run dev

# Ejecutar tests
npm test -- --run

# Ver coverage
npm run test:coverage
```

## Problemas Comunes y Soluciones

### PostgreSQL Docker no arranca
- **Síntoma**: Container se reinicia constantemente
- **Solución**: Verificar logs con `docker-compose logs postgres`, asegurar puerto 5432 no está ocupado

### Error "ECONNREFUSED"
- **Síntoma**: No puede conectar a PostgreSQL
- **Solución**: PostgreSQL aún está inicializando (~5-10 segundos), esperar y verificar con `docker-compose logs postgres`

### Error "Cannot find module 'pg'"
- **Síntoma**: Node.js no encuentra pg
- **Solución**: `npm install pg @types/pg`

### Tests fallan con "Pool not initialized"
- **Síntoma**: Tests de integración fallan al arrancar
- **Solución**: Asegurar que `beforeAll()` llama a `initializePool()` y espera correctamente

### Datos no persisten entre reinicios
- **Síntoma**: Al reiniciar Docker, las tablas están vacías
- **Solución**: Normal, los init scripts solo crean estructura. Para datos persistentes usar volúmenes.

### Error "relation does not exist"
- **Síntoma**: Tablas no se crearon
- **Solución**: Verificar que el script SQL se ejecutó correctamente: `docker-compose logs postgres | grep "01_create_schema.sql"`

## Sistema de Migraciones (IMPLEMENTADO)

### Contexto y Decisión

En lugar de utilizar scripts SQL ejecutados automáticamente por Docker (`docker-entrypoint-initdb.d`), se ha implementado un **sistema profesional de migraciones controladas** .

**Ventajas del sistema de migraciones:**
- ✅ Control de versión del esquema de base de datos
- ✅ Prevención de ejecuciones duplicadas con tabla de control `migrations`
- ✅ Transacciones con rollback automático en caso de error
- ✅ Idempotencia: puedes ejecutar `npm run db:migrate` múltiples veces sin riesgo
- ✅ Historial de migraciones ejecutadas con timestamps
- ✅ Ejecución manual controlada (desarrollo, CI/CD, producción)
- ✅ Independiente de Docker: funciona en cualquier entorno PostgreSQL

### Arquitectura Implementada

#### Estructura de Archivos

```
src/
  ├── infrastructure/
  │   └── database/
  │       ├── connection.ts           # Pool de conexiones PostgreSQL
  │       ├── migrator.ts             # Clase DatabaseMigrator
  │       └── migrations/
  │           ├── 001_create_certificates_table.sql
  │           └── 002_create_notifications_table.sql
  └── scripts/
      ├── migrate.ts                  # Script para ejecutar migraciones
      └── reset-db.ts                 # Script para resetear base de datos
```

#### connection.ts - Pool de Conexiones

Exporta un pool de conexiones PostgreSQL configurado mediante variables de entorno con **inicialización lazy** (solo se crea cuando se usa):

```typescript
// Variables requeridas (validadas al conectar, no al importar):
// - PG_HOST
// - PG_PORT (default: 5432)
// - PG_USER
// - PG_PASSWORD
// - PG_DATABASE

export function getPool(): Pool;
export async function connectDatabase(): Promise<void>;
export async function closeDatabaseConnection(): Promise<void>;
export { getPool as pool }; // Compatibilidad con importaciones existentes
```

**Configuración del pool:**
- Max 10 conexiones simultáneas
- Timeout de idle: 30 segundos
- Timeout de conexión: 2 segundos

**Características importantes:**
- ✅ **Inicialización lazy**: El pool se crea solo cuando se llama `getPool()` o `connectDatabase()`
- ✅ **Validación bajo demanda**: Las variables de entorno se validan al conectar, no al importar el módulo
- ✅ **Tests sin PostgreSQL**: Permite que los tests usen InMemory sin necesitar configurar variables PG_*
- ✅ **Singleton**: Una única instancia del pool compartida por todos los repositories

#### migrator.ts - Clase DatabaseMigrator

La clase `DatabaseMigrator` gestiona todo el proceso de migraciones:

**Métodos:**

1. **`createMigrationsTable()`**
   - Crea la tabla de control `migrations` si no existe
   - Campos: `id`, `filename`, `executed_at`
   - Se ejecuta automáticamente al iniciar migraciones

2. **`getExecutedMigrations()`**
   - Consulta qué migraciones ya fueron ejecutadas
   - Retorna array de nombres de archivo (ej: `['001_create_certificates_table.sql']`)

3. **`executeMigration(filename)`**
   - Lee el archivo SQL desde `src/infrastructure/database/migrations/`
   - Ejecuta en una **transacción**:
     - BEGIN
     - Ejecutar SQL del archivo
     - INSERT en tabla `migrations`
     - COMMIT (o ROLLBACK si hay error)
   - Previene ejecución duplicada

4. **`runMigrations()`**
   - Orquesta el proceso completo:
     - Crea tabla `migrations`
     - Obtiene migraciones ejecutadas
     - Escanea directorio `migrations/`
     - Ejecuta solo las pendientes, en orden alfabético
     - Reporta éxito/error de cada migración

**Tabla de Control `migrations`:**
```sql
CREATE TABLE IF NOT EXISTS migrations (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(255) NOT NULL UNIQUE,
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Archivos de Migración SQL

**Nomenclatura:** `XXX_descripcion.sql` (donde XXX es número secuencial con ceros a la izquierda)

**001_create_certificates_table.sql:**
- CREATE TABLE `certificates` (11 campos)
- CREATE TABLE `certificate_responsible_emails` (relación 1:N)
- CREATE INDEX (5 índices total)
- COMMENT ON TABLE (documentación)

**002_create_notifications_table.sql:**
- CREATE TABLE `notifications` (7 campos)
- CREATE TABLE `notification_recipient_emails` (relación 1:N)
- CREATE INDEX (5 índices total)
- CHECK constraints para enums
- FOREIGN KEY con ON DELETE CASCADE

#### Scripts TypeScript Ejecutables

**src/scripts/migrate.ts:**
```typescript
import { connectDatabase, closeDatabaseConnection } from '../infrastructure/database/connection';
import { DatabaseMigrator } from '../infrastructure/database/migrator';

async function runMigrations() {
  try {
    console.log('🚀 Starting database migrations...');
    await connectDatabase();
    const migrator = new DatabaseMigrator();
    await migrator.runMigrations();
    console.log('✅ Database migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await closeDatabaseConnection();
  }
}

runMigrations();
```

**src/scripts/reset-db.ts:**
```typescript
// Elimina TODAS las tablas en orden inverso (por foreign keys)
// DROP TABLE IF EXISTS: notification_recipient_emails, notifications,
//                       certificate_responsible_emails, certificates, migrations
// Usa CASCADE por seguridad
// Muestra mensaje para ejecutar db:migrate después
```

### Comandos NPM

Agregados al `package.json`:

```json
{
  "scripts": {
    "db:migrate": "tsx src/scripts/migrate.ts",
    "db:reset": "tsx src/scripts/reset-db.ts"
  }
}
```

### Workflow de Uso

#### 1. Primera Vez (Crear Esquema)

```bash
# Levantar PostgreSQL en Docker
docker-compose up -d

# Ejecutar migraciones
npm run db:migrate
```

**Salida esperada:**
```
🚀 Starting database migrations...
✅ Migrations table created or already exists
📋 Found 2 migration files
⏭️  Skipping 001_create_certificates_table.sql (already executed)
⏭️  Skipping 002_create_notifications_table.sql (already executed)
✅ Database migrations completed successfully
```

#### 2. Resetear y Recrear (Desarrollo)

```bash
# Eliminar todo el esquema
npm run db:reset

# Recrear desde cero
npm run db:migrate
```

#### 3. Agregar Nueva Migración

1. Crear archivo: `src/infrastructure/database/migrations/003_add_certificate_notes.sql`
```sql
ALTER TABLE certificates ADD COLUMN notes TEXT;
CREATE INDEX idx_certificates_notes ON certificates(notes);
```

2. Ejecutar migraciones:
```bash
npm run db:migrate
```

**Salida esperada:**
```
🚀 Starting database migrations...
✅ Migrations table created or already exists
📋 Found 3 migration files
⏭️  Skipping 001_create_certificates_table.sql (already executed)
⏭️  Skipping 002_create_notifications_table.sql (already executed)
✅ Executing: 003_add_certificate_notes.sql
✅ Database migrations completed successfully
```

#### 4. CI/CD y Producción

```bash
# En pipeline de CI/CD, antes de desplegar:
npm run db:migrate

# En producción, con variables de entorno apuntando al servidor real:
PG_HOST=prod-server.empresa.com npm run db:migrate
```

### Ventajas vs Docker Auto-Init

| Característica | Docker Auto-Init | Sistema de Migraciones |
|----------------|------------------|------------------------|
| Primera ejecución | ✅ Automático | ⚙️ Manual (`db:migrate`) |
| Ejecución repetida | ❌ Error o skip | ✅ Idempotente |
| Control de versión | ❌ Sin tracking | ✅ Tabla `migrations` |
| Rollback | ❌ Manual | ✅ Automático en transacción |
| Orden garantizado | ⚠️ Alfabético básico | ✅ Alfabético + validación |
| Historial | ❌ Solo logs Docker | ✅ Tabla con timestamps |
| Producción | ❌ Difícil | ✅ Mismo comando |
| Testing | ⚠️ Reset complejo | ✅ `db:reset` + `db:migrate` |

### Tabla `migrations` - Ejemplo de Contenido

Después de ejecutar migraciones:

```sql
SELECT * FROM migrations;
```

| id | filename                            | executed_at          |
|----|-------------------------------------|----------------------|
| 1  | 001_create_certificates_table.sql   | 2026-02-12 14:30:00  |
| 2  | 002_create_notifications_table.sql  | 2026-02-12 14:30:01  |

### Dependencias Agregadas

```json
{
  "dependencies": {
    "pg": "^8.14.0"
  },
  "optionalDependencies": {
    "@types/pg": "^8.11.10"
  }
}
```

### Integración con Fase 1 del Plan Original

El sistema de migraciones **reemplaza** la sección 1.3 del plan original:

- ❌ ~~`database/init/01_create_schema.sql`~~ → ✅ `migrations/001_*.sql` y `migrations/002_*.sql`
- ❌ ~~Docker auto-ejecuta SQL~~ → ✅ `npm run db:migrate` ejecuta controladamente
- ✅ Mantiene sección 1.2: `docker-compose.yml` para levantar PostgreSQL (solo para desarrollo local)
- ✅ Mantiene sección 1.4: archivos `.env.example` (plantilla), `.env.development` (desarrollo), `.env` (producción - futuro)

### Pasos de Implementación (COMPLETADO)

- [x] Crear `src/infrastructure/database/connection.ts`
- [x] Crear `src/infrastructure/database/migrator.ts`
- [x] Crear `src/infrastructure/database/migrations/001_create_certificates_table.sql`
- [x] Crear `src/infrastructure/database/migrations/002_create_notifications_table.sql`
- [x] Crear `src/scripts/migrate.ts`
- [x] Crear `src/scripts/reset-db.ts`
- [x] Actualizar `package.json` con scripts `db:migrate` y `db:reset`
- [x] Agregar dependencias `pg` y `@types/pg`
- [x] Documentar sistema de migraciones

### Próximos Pasos

> **✅ IMPLEMENTACIÓN COMPLETADA**
>
> Todos los pasos principales del plan han sido implementados exitosamente:

1. ✅ **Instalar dependencias**: `pg` y `@types/pg` instalados
2. ✅ **Crear docker-compose.yml**: Implementado con PostgreSQL 16 Alpine
3. ✅ **Configurar archivos .env**: `.env.development`, `.env.example` creados
4. ✅ **Levantar PostgreSQL**: Funcionando con `docker-compose up -d`
5. ✅ **Sistema de migraciones**: Implementado con `npm run db:migrate` y `npm run db:reset`
6. ✅ **PostgresCertificateRepository**: Implementado con filtros SQL, transacciones, JOINs
7. ✅ **PostgresNotificationRepository**: Implementado completo
8. ✅ **Modificar app.ts**: Factory `createApp(usePostgres)` con selección de repositorios
9. ✅ **Tests funcionando**: 50/50 tests pasando con InMemory por defecto
10. ✅ **Arquitectura DRY**: server.ts llama createApp(), sin duplicación

**Estado actual:**
- PostgreSQL corriendo en Docker en puerto 5432
- Tablas creadas: certificates, certificate_responsible_emails, notifications, notification_recipient_emails, migrations
- Repositorios implementados con parametrized queries, transacciones y manejo de emails normalizados
- Sistema en producción listo para usarse con `USE_POSTGRES=true`

## Mejoras Futuras

- [ ] Implementar rollback de migraciones
- [ ] Tests de integración con PostgreSQL real (actualmente usan InMemory)
- [ ] Graceful shutdown con cierre de conexiones (SIGINT handler)
- [ ] Añadir índices adicionales según patrones de uso real
- [ ] Implementar backup/restore automatizado
- [ ] Monitoreo de queries lentas con EXPLAIN ANALYZE
- [ ] Connection pooling con PgBouncer para producción de alto tráfico

## Referencias

- [node-postgres (pg) Documentation](https://node-postgres.com/)
- [PostgreSQL Docker Official Image](https://hub.docker.com/_/postgres)
- [Clean Architecture with TypeScript](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [PostgreSQL Best Practices](https://wiki.postgresql.org/wiki/Don%27t_Do_This)

---

**Última actualización**: 2026-02-12  
**Rama actual**: `databaseFeature`  
**Estado**: Planificación completa - Listo para implementar
