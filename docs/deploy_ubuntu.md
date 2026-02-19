# Instalación y despliegue en Ubuntu 22.04 LTS

Guía paso a paso para poner en marcha el monorepo **secHTTPS** (auth_APP + secHTTPS_APP) en un servidor Ubuntu 22.04 desde cero.

---

## 1. Requisitos previos del sistema

```bash
# Actualizar paquetes del sistema
sudo apt update && sudo apt upgrade -y

# Herramientas básicas
sudo apt install -y curl wget git build-essential ca-certificates gnupg
```

---

## 2. Instalar Git

```bash
sudo apt install -y git

# Verificar instalación
git --version
# git version 2.34.x

# Configurar identidad (para commits desde el servidor, opcional)
git config --global user.name  "Tu Nombre"
git config --global user.email "tu@email.com"
```

---

## 3. Instalar Node.js 20 LTS (vía nvm — recomendado)

`nvm` permite gestionar múltiples versiones de Node sin conflictos con el sistema.

```bash
# Instalar nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Recargar el shell (o cerrar y abrir sesión)
source ~/.bashrc

# Verificar nvm
nvm --version

# Instalar Node.js 20 LTS
nvm install 20
nvm use 20
nvm alias default 20

# Verificar
node --version   # v20.x.x
npm  --version   # 10.x.x
```

---

## 4. Instalar Docker y Docker Compose

### 4.1 Docker Engine

```bash
# Añadir clave GPG oficial de Docker
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Añadir repositorio de Docker
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Instalar Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Verificar
docker --version          # Docker version 26.x.x
docker compose version    # Docker Compose version v2.x.x
```

### 4.2 Ejecutar Docker sin sudo (recomendado)

```bash
sudo usermod -aG docker $USER

# Cerrar sesión y volver a entrar para que tenga efecto
# Verificar:
docker ps
```

### 4.3 Arrancar Docker automáticamente al inicio

```bash
sudo systemctl enable docker
sudo systemctl start docker
```

---

## 5. Clonar el repositorio

```bash
# Elegir directorio de trabajo
cd /opt   # o ~/proyectos, o donde prefieras

# Clonar
git clone <URL_DEL_REPO> secHTTPS
cd secHTTPS

# Estructura esperada:
# secHTTPS/
# ├── auth_APP/
# ├── secHTTPS_APP/
# ├── docker-compose.yml
# └── ...
```

---

## 6. Levantar PostgreSQL

El `docker-compose.yml` en la raíz levanta el contenedor de PostgreSQL compartido por ambas apps.

```bash
# Desde la raíz del monorepo
cd /opt/secHTTPS

docker compose up -d

# Verificar que está corriendo y healthy
docker compose ps
# secHTTPS-postgres   Up (healthy)

# Ver logs si hay problemas
docker compose logs postgres
```

> **Puertos expuestos:** `5432` — asegúrate de que no esté bloqueado por el firewall del servidor.

---

## 7. Configurar auth_APP

### 7.1 Variables de entorno

```bash
cd /opt/secHTTPS/auth_APP

cp .env.example .env
nano .env   # o vim / vi
```

Valores **críticos** a ajustar:

```dotenv
# Credenciales del superusuario de PostgreSQL (del docker-compose.yml)
PG_ADMIN_USER=adminjmuriel
PG_ADMIN_PASSWORD=<el_configurado_en_docker>
PG_ADMIN_DB=postgresTEMP

# Credenciales de la app (se crean con las migraciones)
PG_HOST=localhost
PG_PORT=5432
PG_USER=auth
PG_PASSWORD=<elige_una_password_segura>
PG_DATABASE=auth_db

USE_POSTGRES=true

# JWT — mínimo 32 caracteres, DEBEN coincidir con secHTTPS_APP
JWT_ACCESS_SECRET=<cadena_aleatoria_min_32_caracteres>
JWT_REFRESH_SECRET=<cadena_aleatoria_min_32_caracteres>

# Usuario admin inicial
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@tudominio.com
ADMIN_PASSWORD=<password_segura>
```

### 7.2 Instalar dependencias y migrar

```bash
cd /opt/secHTTPS/auth_APP

npm install

# Crear base de datos, tablas, roles, usuario admin
npm run db:migrate
```

### 7.3 Probar el arranque

```bash
npm run dev
# Debe mostrar: 🚀 Auth Service listening on http://localhost:4000
# Ctrl+C para parar (luego usaremos PM2 en producción)
```

---

## 8. Configurar secHTTPS_APP

### 8.1 Variables de entorno

```bash
cd /opt/secHTTPS/secHTTPS_APP

cp .env.example .env
nano .env
```

Valores **críticos** a ajustar:

```dotenv
# Credenciales del superusuario de PostgreSQL
PG_ADMIN_USER=adminjmuriel
PG_ADMIN_PASSWORD=<el_configurado_en_docker>
PG_ADMIN_DB=postgresTEMP

# Credenciales de la app
PG_HOST=localhost
PG_PORT=5432
PG_USER=sechttps
PG_PASSWORD=<elige_una_password_segura>
PG_DATABASE=sechttps_db

PORT=3000
USE_POSTGRES=true

# CORS — URL donde se sirve el frontend
CLIENT_URL=http://<IP_O_DOMINIO_DEL_SERVIDOR>:5173

# JWT — DEBEN ser idénticos a los de auth_APP
JWT_ACCESS_SECRET=<misma_cadena_que_en_auth_APP>
JWT_REFRESH_SECRET=<misma_cadena_que_en_auth_APP>

# URLs de los servicios (ajustar con IP/dominio real si no es localhost)
AUTH_APP_URL=http://localhost:4000
VITE_AUTH_APP_URL=http://<IP_O_DOMINIO>:4000
VITE_BACKEND_URL=http://<IP_O_DOMINIO>:3000
VITE_APPLICATION_NAME=secHTTPS_APP

# SMTP (notificaciones por email)
SMTP_HOST=smtp.tudominio.com
SMTP_PORT=587
SMTP_USER=notificaciones@tudominio.com
SMTP_PASSWORD=<password_smtp>
```

> **Importante:** `VITE_*` son variables compiladas en el cliente. Si el servidor tiene IP pública o dominio, usar esa dirección (no `localhost`) para que el navegador del usuario pueda conectar.

### 8.2 Instalar dependencias y migrar

```bash
cd /opt/secHTTPS/secHTTPS_APP

npm install

# Crear base de datos sechttps_db y tablas
npm run db:migrate
```

### 8.3 Probar el arranque

```bash
npm run dev
# Servidor en http://localhost:3000
# Cliente en  http://localhost:5173
# Ctrl+C para parar
```

---

## 9. Ejecución en producción con PM2

En producción se recomienda compilar TypeScript y usar PM2 como gestor de procesos.

### 9.1 Instalar PM2

```bash
npm install -g pm2
```

### 9.2 Build y arranque de auth_APP

```bash
cd /opt/secHTTPS/auth_APP
npm run build
pm2 start dist/server.js --name auth_APP
```

### 9.3 Build y arranque de secHTTPS_APP (servidor)

```bash
cd /opt/secHTTPS/secHTTPS_APP
npm run build          # compila TypeScript del servidor

# Si también sirves el cliente desde el mismo servidor:
npm run build:client   # compila React con Vite

pm2 start dist/server.js --name secHTTPS_server
```

### 9.4 Guardar y activar inicio automático

```bash
pm2 save
pm2 startup            # sigue las instrucciones que muestre el comando
```

### 9.5 Comandos útiles de PM2

```bash
pm2 list               # ver estado de todos los procesos
pm2 logs auth_APP      # logs en tiempo real
pm2 restart auth_APP   # reiniciar
pm2 stop secHTTPS_server
```

---

## 10. Firewall (ufw)

Si el servidor tiene ufw activo, abrir los puertos necesarios:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 4000   # auth_APP
sudo ufw allow 3000   # secHTTPS_APP (API)
sudo ufw allow 5173   # secHTTPS_APP (cliente Vite dev)
# sudo ufw allow 80   # si sirves con nginx en producción
sudo ufw enable
sudo ufw status
```

---

## 11. Verificación final

```bash
# PostgreSQL responde
docker compose ps
# → secHTTPS-postgres  Up (healthy)

# auth_APP responde
curl http://localhost:4000/health
# → {"status":"ok"} (o similar)

# secHTTPS_APP responde
curl http://localhost:3000/api/certif
# → [] (array vacío — sin certificados aún)
```

---

## Resumen de comandos en orden

```bash
# 1. PostgreSQL
cd /opt/secHTTPS && docker compose up -d

# 2. auth_APP
cd auth_APP  && npm install && npm run db:migrate && npm run dev

# 3. secHTTPS_APP (en otra terminal)
cd ../secHTTPS_APP && npm install && npm run db:migrate && npm run dev
```
