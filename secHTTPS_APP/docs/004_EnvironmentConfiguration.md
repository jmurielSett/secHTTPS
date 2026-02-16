# Configuración de Variables de Entorno

Este documento explica cómo funciona el sistema de configuración mediante variables de entorno en el proyecto.

## Índice

1. [Conceptos Básicos](#conceptos-básicos)
2. [Archivos de Configuración](#archivos-de-configuración)
3. [Desarrollo Local](#desarrollo-local)
4. [Producción](#producción)
5. [Plataformas de Deployment](#plataformas-de-deployment)
6. [Variables Disponibles](#variables-disponibles)
7. [Seguridad](#seguridad)
8. [Troubleshooting](#troubleshooting)

---

## Conceptos Básicos

### ¿Qué son las Variables de Entorno?

Las variables de entorno son valores que el sistema operativo o plataforma proporciona a la aplicación en tiempo de ejecución. En Node.js se acceden mediante `process.env`.

```typescript
// El código es el mismo en todos los ambientes
const host = process.env.PG_HOST;
const password = process.env.PG_PASSWORD;
```

### Ventajas

✅ **Mismo código en todos los ambientes** - No hay cambios entre desarrollo/producción  
✅ **Sin credenciales en Git** - Las contraseñas no se commitean  
✅ **Fácil de cambiar** - Sin rebuild, solo cambias las variables  
✅ **Seguro** - Las credenciales están separadas del código  
✅ **Estándar de la industria** - Sigue [The Twelve-Factor App](https://12factor.net/config)

### Prioridad de Carga

El sistema respeta este orden de prioridad:

1. **Variables del sistema** (ya definidas en el ambiente)
2. **Archivo `.env`** (cargado por dotenv en desarrollo)
3. **Valores por defecto** en el código

> **Importante:** Si una variable ya existe en el sistema, NO se sobrescribe por el archivo .env

---

## Archivos de Configuración

### Archivos en el Proyecto

| Archivo | Propósito | ¿En Git? | ¿Cuándo se usa? |
|---------|-----------|----------|-----------------|
| `.env.example` | Plantilla de referencia | ✅ Sí | Documentación |
| `.env` | Configuración local | ❌ No | npm run dev, db:migrate, db:reset |
| `.env.local` | Override personal (opcional) | ❌ No | Configuraciones personales sin afectar .env |

### .env.example

```bash
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
USE_POSTGRES=false
```

**Propósito:** Documentar qué variables están disponibles. Tiene valores de ejemplo pero NO contraseñas reales.

### .env

```bash
# PostgreSQL Database Configuration
PG_HOST=localhost
PG_PORT=5432
PG_USER=sechttps
PG_PASSWORD=SecurePassword123
PG_DATABASE=sechttps_db

# Application Configuration
PORT=3000

# Repository Mode
USE_POSTGRES=false
```

**Propósito:** Configuración para desarrollo local. **NO se sube a Git**. Cada desarrollador crea su propio `.env` desde `.env.example`.

**Setup inicial:**
```bash
# Copiar desde la plantilla
cp .env.example .env

# Editar si necesitas cambiar credenciales (opcional)
# Por defecto funciona con docker-compose.yml
```

> **Nota:** El `.env` por defecto tiene credenciales para Docker Compose local (localhost). Son seguras para desarrollo, pero cada desarrollador puede personalizarlas sin afectar a otros.

---

## Desarrollo Local

### Configuración Inicial

1. **Crear archivo .env:**
   ```bash
   cp .env.example .env
   ```
   Por defecto funciona con las credenciales de Docker Compose

2. **Usar Docker Compose (recomendado):**
   ```bash
   npm run docker:up
   ```
   Docker crea automáticamente PostgreSQL con las credenciales de `.env`

3. **Ejecutar migraciones:**
   ```bash
   npm run db:migrate
   ```
   El script carga automáticamente `.env`

4. **Iniciar servidor:**
   ```bash
   npm run dev
   ```

### Cómo Funciona

Los scripts están configurados para cargar automáticamente `.env`:

```typescript
// src/scripts/migrate.ts
import dotenv from 'dotenv';

// Carga automática del archivo .env
dotenv.config();

// Ahora ya están disponibles
const host = process.env.PG_HOST;  // 'localhost'
```

> **Nota:** `dotenv.config()` sin parámetros busca automáticamente `.env` en la raíz del proyecto.

### Override Local (Opcional)

Si necesitas probar otras credenciales SIN modificar `.env`:

1. Crea un archivo `.env.local` (no se sube a Git):
   ```bash
   # .env.local tiene prioridad sobre .env
   PG_HOST=192.168.1.100
   PG_PASSWORD=OtraPassword
   ```

2. Carga ambos archivos:
   ```typescript
   dotenv.config({ path: '.env.local' });  // Primero el override
   dotenv.config();  // Luego el .env base
   ```

> **Tip:** Las variables del sistema siempre tienen prioridad máxima. Si una variable ya existe, no se sobrescribe.

---

## Producción

### ⚠️ NO Usar Archivos .env en Producción

En producción, las variables se definen **directamente en el servidor/plataforma**, NO mediante archivos `.env`.

### ¿Por Qué?

❌ **Problema con archivos .env en producción:**
- Las credenciales estarían en el filesystem del servidor
- Difícil rotar contraseñas (requiere rebuild)
- Riesgo de exposición si se accede al servidor
- No es escalable en múltiples instancias

✅ **Solución profesional:**
- Variables inyectadas por la infraestructura
- Secrets managers (AWS Secrets Manager, Azure Key Vault)
- ConfigMaps y Secrets (Kubernetes)
- Variables de entorno del servicio

### Tu Código NO Cambia

```typescript
// Este código funciona igual en desarrollo y producción
const host = process.env.PG_HOST;

// En desarrollo: lee de .env
// En producción: lee de variables del sistema
```

---

## Plataformas de Deployment

### 1. Servidor Linux/Unix Tradicional

#### Opción A: Definir antes de arrancar
```bash
# En el servidor de producción
export NODE_ENV=production
export PG_HOST=db.miempresa.com
export PG_DATABASE=sechttps_prod
export PG_USER=app_user
export PG_PASSWORD=SuperSecurePassword2024
export USE_POSTGRES=true
export PORT=8080

# Arrancar la aplicación
node dist/server.js
```

#### Opción B: Archivo de servicio systemd
```ini
# /etc/systemd/system/sechttps.service
[Unit]
Description=secHTTPS Certificate Manager
After=network.target

[Service]
Type=simple
User=appuser
WorkingDirectory=/opt/sechttps
Environment="NODE_ENV=production"
Environment="PG_HOST=db.miempresa.com"
Environment="PG_DATABASE=sechttps_prod"
Environment="PG_USER=app_user"
Environment="PG_PASSWORD=SuperSecurePassword2024"
Environment="USE_POSTGRES=true"
Environment="PORT=8080"
ExecStart=/usr/bin/node /opt/sechttps/dist/server.js
Restart=always

[Install]
WantedBy=multi-user.target
```

Activar el servicio:
```bash
sudo systemctl daemon-reload
sudo systemctl enable sechttps
sudo systemctl start sechttps
```

### 2. Docker

#### docker-compose.yml
```yaml
version: '3.8'

services:
  app:
    image: sechttps:latest
    environment:
      NODE_ENV: production
      PG_HOST: postgres
      PG_DATABASE: sechttps_prod
      PG_USER: app_user
      PG_PASSWORD: ${DB_PASSWORD}  # Lee de variable del host
      USE_POSTGRES: "true"
      PORT: 3000
    depends_on:
      - postgres
    ports:
      - "3000:3000"
  
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: sechttps_prod
      POSTGRES_USER: app_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data

volumes:
  postgres-data:
```

Ejecutar:
```bash
# Define la variable en el host
export DB_PASSWORD=SuperSecurePassword2024

# Levanta los servicios
docker-compose up -d
```

#### Dockerfile con variables
```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist

# Variables de entorno se pasan al ejecutar
# docker run -e PG_HOST=... -e PG_PASSWORD=...
EXPOSE 3000

CMD ["node", "dist/server.js"]
```

### 3. Kubernetes

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: db-credentials
type: Opaque
stringData:
  password: SuperSecurePassword2024
  user: app_user

---
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  PG_HOST: "postgres-service"
  PG_DATABASE: "sechttps_prod"
  PORT: "3000"
  USE_POSTGRES: "true"

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sechttps
spec:
  replicas: 3
  selector:
    matchLabels:
      app: sechttps
  template:
    metadata:
      labels:
        app: sechttps
    spec:
      containers:
      - name: sechttps
        image: sechttps:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: PG_HOST
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: PG_HOST
        - name: PG_DATABASE
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: PG_DATABASE
        - name: PG_USER
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: user
        - name: PG_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: password
        - name: USE_POSTGRES
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: USE_POSTGRES
        - name: PORT
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: PORT
```

### 4. Servicios Cloud PaaS

#### Heroku
```bash
# Configurar variables desde CLI
heroku config:set NODE_ENV=production
heroku config:set PG_HOST=ec2-xxx.compute-1.amazonaws.com
heroku config:set PG_DATABASE=d8fu7nqi1234
heroku config:set PG_USER=user_123
heroku config:set PG_PASSWORD=SuperSecure123
heroku config:set USE_POSTGRES=true

# Ver configuración actual
heroku config

# Deploy
git push heroku main
```

#### Vercel / Netlify
1. Panel web → Project Settings → Environment Variables
2. Añadir cada variable:
   - `NODE_ENV` = `production`
   - `PG_HOST` = `db.example.com`
   - `PG_PASSWORD` = `...`
3. Elegir ambiente: Production / Preview / Development
4. Guardar y redeploy

#### AWS Elastic Beanstalk
```bash
# Configurar desde CLI
eb setenv NODE_ENV=production \
         PG_HOST=db.xxx.rds.amazonaws.com \
         PG_DATABASE=sechttps_prod \
         PG_USER=app_user \
         PG_PASSWORD=SuperSecure \
         USE_POSTGRES=true

# O desde archivo .ebextensions/environment.config
option_settings:
  aws:elasticbeanstalk:application:environment:
    NODE_ENV: production
    PG_HOST: db.xxx.rds.amazonaws.com
    USE_POSTGRES: "true"
    # Password desde Secrets Manager (ver sección Secrets)
```

### 5. Secrets Managers (Más Seguro)

#### AWS Secrets Manager
```typescript
// En el código de producción
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

async function loadSecrets() {
  const client = new SecretsManagerClient({ region: 'us-east-1' });
  const response = await client.send(
    new GetSecretValueCommand({ SecretId: 'prod/sechttps/db' })
  );
  
  const secrets = JSON.parse(response.SecretString!);
  process.env.PG_PASSWORD = secrets.password;
  process.env.PG_USER = secrets.username;
}

// Cargar antes de iniciar el servidor
await loadSecrets();
const app = await createApp(true);
```

#### Azure Key Vault
```typescript
import { SecretClient } from '@azure/keyvault-secrets';
import { DefaultAzureCredential } from '@azure/identity';

const vaultUrl = 'https://my-vault.vault.azure.net';
const credential = new DefaultAzureCredential();
const client = new SecretClient(vaultUrl, credential);

const secret = await client.getSecret('PG-PASSWORD');
process.env.PG_PASSWORD = secret.value;
```

---

## Variables Disponibles

### Base de Datos PostgreSQL

| Variable | Descripción | Ejemplo | Requerido |
|----------|-------------|---------|-----------|
| `PG_HOST` | Host del servidor PostgreSQL | `localhost`, `db.example.com` | ✅ Sí |
| `PG_PORT` | Puerto del servidor | `5432` | ❌ No (default: 5432) |
| `PG_USER` | Usuario de la base de datos | `sechttps` | ✅ Sí |
| `PG_PASSWORD` | Contraseña | `SecurePassword123` | ✅ Sí |
| `PG_DATABASE` | Nombre de la base de datos | `sechttps_db` | ✅ Sí |

### Aplicación

| Variable | Descripción | Valores | Default |
|----------|-------------|---------|---------|
| `PORT` | Puerto del servidor Express | `3000`, `8080` | `3000` |
| `NODE_ENV` | Ambiente de ejecución | `development`, `production` | `development` |
| `USE_POSTGRES` | Tipo de persistencia | `true`, `false` | `false` |

### Validación

El sistema valida que las variables requeridas estén presentes al intentar conectar:

```typescript
// src/infrastructure/database/connection.ts
const getConfig = (): PoolConfig => {
  const host = process.env.PG_HOST;
  const database = process.env.PG_DATABASE;
  const user = process.env.PG_USER;
  const password = process.env.PG_PASSWORD;
  
  if (!host || !database || !user || !password) {
    throw new Error('Missing required PostgreSQL environment variables: PG_HOST, PG_DATABASE, PG_USER, PG_PASSWORD');
  }
  
  return { host, port, database, user, password, ... };
};
```

---

## Seguridad

### ✅ Buenas Prácticas

1. **Nunca commitear credenciales reales**
   - Usa `.env.example` con valores de ejemplo
   - Añade archivos sensibles a `.gitignore`

2. **Diferentes credenciales por ambiente**
   ```
   Desarrollo → sechttps / SecurePassword123 (Docker local)
   Staging → sechttps_stg / ComplexPassword456
   Producción → sechttps_prod / SuperSecurePassword789
   ```

3. **Usar secrets managers en producción**
   - AWS Secrets Manager
   - Azure Key Vault
   - HashiCorp Vault
   - GCP Secret Manager

4. **Rotar credenciales regularmente**
   - Cambiar passwords cada 90 días
   - Usar secrets managers con rotación automática

5. **Principio de mínimo privilegio**
   - Usuario de BD solo con permisos necesarios
   - No usar superusuario (postgres/root)

6. **Logs seguros**
   ```typescript
   // ❌ NUNCA
   console.log('Password:', process.env.PG_PASSWORD);
   
   // ✅ OK
   console.log('Connecting to database:', process.env.PG_HOST);
   ```

### ❌ Evitar

1. **Hardcodear credenciales en el código**
   ```typescript
   // ❌ NUNCA HACER ESTO
   const password = 'SuperSecret123';
   ```

2. **Subir archivos .env.production a Git**
   ```bash
   # .gitignore debe incluir:
   .env
   .env.production
   .env.local
   ```

3. **Compartir credenciales por email/Slack**
   - Usar secrets managers con permisos controlados
   - O herramientas como 1Password, LastPass

4. **Mismas credenciales en todos los ambientes**
   - Cada ambiente debe tener sus propias credenciales

5. **Exponer variables en logs de CI/CD**
   ```yaml
   # ❌ Malo
   - run: echo $PG_PASSWORD
   
   # ✅ Bien
   - run: echo "Password configured"
   ```

---

## Troubleshooting

### Error: "Missing required PostgreSQL environment variables"

**Síntomas:**
```
❌ Database connection failed: Error: Missing required PostgreSQL environment variables: 
PG_HOST, PG_DATABASE, PG_USER, PG_PASSWORD
```

**Causas y Soluciones:**

1. **Archivo .env no existe**
   ```bash
   # Verificar
   ls -la .env
   
   # Crear desde plantilla
   cp .env.example .env
   # Editar con credenciales correctas si es necesario
   ```

2. **Script no carga el archivo**
   ```typescript
   // Verificar que los scripts tengan:
   import dotenv from 'dotenv';
   dotenv.config();  // Carga .env automáticamente
   ```

3. **Variables del sistema sobrescriben**
   ```bash
   # Ver variables actuales
   printenv | grep PG_    # Linux/Mac
   set | findstr PG_      # Windows CMD
   
   # Limpiar si es necesario
   unset PG_HOST PG_DATABASE PG_USER PG_PASSWORD  # Linux/Mac
   ```

### Error: "password authentication failed"

**Síntomas:**
```
❌ Database connection failed: password authentication failed for user "sechttps"
```

**Soluciones:**

1. **Verificar credenciales en .env**
   ```bash
   cat .env
   # Verificar que coincidan con docker-compose.yml
   ```

2. **Reiniciar PostgreSQL**
   ```bash
   npm run docker:down
   npm run docker:up
   ```

3. **Verificar PostgreSQL está corriendo**
   ```bash
   docker ps | grep postgres
   npm run docker:logs
   ```

### Variables no se cargan

**Problema:** Las variables parecen no cargarse o tienen valores incorrectos.

**Diagnóstico:**
```typescript
// Añadir temporalmente para debug
console.log('PG_HOST:', process.env.PG_HOST);
console.log('PG_DATABASE:', process.env.PG_DATABASE);
console.log('All env keys:', Object.keys(process.env).filter(k => k.startsWith('PG_')));
```

**Soluciones:**

1. **Orden de prioridad**
   - Las variables del sistema NO se sobrescriben por .env
   - Si una variable ya existe, .env no la cambia

2. **Verificar que dotenv se ejecuta ANTES de usar las variables**
   ```typescript
   dotenv.config();  // Carga .env
   // AHORA ya puedes usar process.env.PG_HOST
   ```

3. **Path incorrecto al archivo (si usas path explícito)**
   ```typescript
   // ❌ Malo (relativo a donde se ejecuta)
   dotenv.config({ path: '.env' });
   
   // ✅ Mejor (absoluto desde el archivo)
   import path from 'node:path';
   dotenv.config({ 
     path: path.join(__dirname, '../../.env') 
   });
   
   // ✅ Más simple (busca automáticamente en raíz)
   dotenv.config();
   ```

### Tests y PostgreSQL

**Pregunta Frecuente:** ¿Si pongo `USE_POSTGRES=true` en `.env`, los tests usarán PostgreSQL?

**Respuesta:** NO. **Los tests SIEMPRE usan InMemory**, independientemente de `USE_POSTGRES`.

**Por qué:**
```typescript
// tests/integration/certificates.test.ts
beforeEach(async () => {
  app = await createApp();  // ❌ No lee USE_POSTGRES, usa default false
});
```

**Ventajas de tests en InMemory:**
✅ Rápidos: 50 tests en ~1 segundo  
✅ Sin setup: No necesitas PostgreSQL corriendo  
✅ Aislados: Cada test tiene su propia memoria limpia  
✅ Confiables: Sin conflictos de datos entre tests

**¿Cuándo se usa USE_POSTGRES=true?**

Solo para el servidor en desarrollo/producción:
```bash
# Servidor con PostgreSQL
USE_POSTGRES=true npm run dev

# Tests siempre InMemory (ignoran la variable)
npm test
```

**Si quisieras tests con PostgreSQL (NO recomendado):**

Tendrías que modificar el código de los tests:
```typescript
beforeEach(async () => {
  const usePostgres = process.env.USE_POSTGRES === 'true';
  app = await createApp(usePostgres);
  // + setup de limpieza de BD entre tests
});
```

Pero no es necesario ni recomendado. Los tests InMemory son suficientes y superiores.

### Puerto 5432 ya en uso

**Síntomas:**
```
Error starting userland proxy: listen tcp4 0.0.0.0:5432: bind: address already in use
```

**Soluciones:**

1. **Parar PostgreSQL local**
   ```bash
   # Linux
   sudo systemctl stop postgresql
   
   # Mac
   brew services stop postgresql
   
   # Windows
   net stop postgresql-x64-14
   ```

2. **Cambiar puerto en docker-compose.yml**
   ```yaml
   ports:
     - "5433:5432"  # Host:Container
   ```
   
   Y en .env:
   ```bash
   PG_PORT=5433
   ```

---

## Referencias

- [The Twelve-Factor App - Config](https://12factor.net/config)
- [dotenv Documentation](https://github.com/motdotla/dotenv)
- [Node.js Environment Variables](https://nodejs.org/en/learn/command-line/how-to-read-environment-variables-from-nodejs)
- [OWASP: Secure Configuration](https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html#rule-6-secrets-management)
