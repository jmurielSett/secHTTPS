# Instalación y despliegue en Ubuntu 24.04 LTS (Producción)

Guía paso a paso para poner en marcha el monorepo **secHTTPS** (auth_APP + secHTTPS_APP) en un servidor Ubuntu 24.04 desde cero, con **nginx como reverse proxy HTTPS en el puerto 8059**.

Solo los puertos **22** (SSH) y **8059** (HTTPS) quedan expuestos al exterior.

---

## 1. Requisitos previos del sistema

```bash
sudo apt update && sudo apt upgrade -y

# Herramientas básicas + nginx + openssl (git incluido)
sudo apt install -y curl wget git build-essential ca-certificates gnupg nginx openssl
```

> Para configurar identidad git (opcional en servidor): `git config --global user.name "Tu Nombre"`

---

## 2. Instalar Node.js 24 (vía nvm)

`nvm` permite gestionar múltiples versiones de Node sin conflictos con el sistema.

```bash
# Instalar nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Recargar el shell (o cerrar y abrir sesión)
source ~/.bashrc

# Verificar nvm
nvm --version

# Instalar Node.js 24
nvm install 24
nvm use 24
nvm alias default 24

# Verificar
node --version   # v24.13.0
npm  --version   # 11.9.0
```

---

## 3. Instalar Docker y Docker Compose

### 3.1 Docker Engine

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
docker --version          # Docker version 29.2.0
docker compose version    # Docker Compose version v5.0.2
```

### 3.2 Ejecutar Docker sin sudo (recomendado)

```bash
sudo usermod -aG docker $USER

# Cerrar sesión y volver a entrar para que tenga efecto
# Verificar:
docker ps
```

### 3.3 Arrancar Docker automáticamente al inicio

```bash
sudo systemctl enable docker
sudo systemctl start docker
```

---

## 4. Clonar el repositorio

```bash
cd /opt
git clone <URL_DEL_REPO> secHTTPS
cd secHTTPS
```

---

## 5. Levantar PostgreSQL
(copiar el docker-compose.yml al server primero: 
scp docker-compose.yml usuario@ip_del_servidor:/opt/secHTTPS/)
```bash
cd /opt/secHTTPS
docker compose up -d

# Verificar
docker compose ps
# secHTTPS-postgres   Up (healthy)

# Logs si hay problemas
docker compose logs postgres
```

> El puerto `5432` es **interno** — no se abre en el firewall.

---

## 6. Certificado SSL

Como el puerto `8059` no es estándar, se genera un certificado **autofirmado**.  
(Si tienes dominio público, ver apéndice Let's Encrypt al final.)

```bash
sudo mkdir -p /etc/nginx/ssl

sudo openssl req -x509 -nodes -days 3650 -newkey rsa:4096 \
  -keyout /etc/nginx/ssl/sechttps.key \
  -out    /etc/nginx/ssl/sechttps.crt \
  -subj   "/C=ES/ST=Barcelona/L=Sant Boi del Llobregat/O=secHTTPS/CN=scpdsigsam59.pssjd.local"

sudo chmod 600 /etc/nginx/ssl/sechttps.key
```

> Reemplaza `<IP_O_DOMINIO>` por la IP del servidor o el dominio.  
> Certificado válido 10 años. Los navegadores mostrarán aviso al ser autofirmado; acepta la excepción manualmente.

---

## 7. Configurar nginx

### 7.1 Crear la configuración del sitio

```bash
apt install -y nano

sudo nano /etc/nginx/sites-available/sechttps
```

Contenido completo:

```nginx
server {
    listen 8059 ssl;
    listen [::]:8059 ssl;

    server_name <IP_O_DOMINIO>;

    ssl_certificate     /etc/nginx/ssl/sechttps.crt;
    ssl_certificate_key /etc/nginx/ssl/sechttps.key;

    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;
    ssl_session_cache   shared:SSL:10m;
    ssl_session_timeout 10m;

    # Cabeceras de seguridad
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options    nosniff always;
    add_header X-Frame-Options           SAMEORIGIN always;

    # ── auth_APP ─────────────────────────────────────────────
    location /auth/ {
        proxy_pass         http://127.0.0.1:4000/auth/;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }

    # ── secHTTPS_APP — tRPC ──────────────────────────────────
    location /trpc/ {
        proxy_pass         http://127.0.0.1:3000/trpc/;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade           $http_upgrade;
        proxy_set_header   Connection        "upgrade";
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }

    # ── secHTTPS_APP — REST API ──────────────────────────────
    location /api/ {
        proxy_pass         http://127.0.0.1:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }

    # ── React SPA (archivos estáticos) ───────────────────────
    root /opt/secHTTPS/secHTTPS_APP/client/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Caché de assets compilados
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 7.2 Activar y verificar

```bash
# Activar sitio
sudo ln -sf /etc/nginx/sites-available/sechttps /etc/nginx/sites-enabled/sechttps

# Desactivar sitio por defecto
sudo rm -f /etc/nginx/sites-enabled/default

# Verificar sintaxis
sudo nginx -t
# nginx: configuration file /etc/nginx/nginx.conf test is successful

# Aplicar y activar inicio automático
sudo systemctl reload nginx
sudo systemctl enable nginx
```

---

## 8. Configurar auth_APP (producción)

### 8.1 Variables de entorno

```bash
cd /opt/secHTTPS/auth_APP
cp .env.example .env
nano .env
```

```dotenv
# PostgreSQL — superusuario (del docker-compose.yml)
PG_ADMIN_USER=adminjmuriel
PG_ADMIN_PASSWORD=<el_configurado_en_docker>
PG_ADMIN_DB=postgresTEMP

# PostgreSQL — app
PG_HOST=localhost
PG_PORT=5432
PG_USER=auth
PG_PASSWORD=<password_segura>
PG_DATABASE=auth_db

USE_POSTGRES=true
PORT=4000
NODE_ENV=production

# JWT — mínimo 32 caracteres, DEBEN coincidir con secHTTPS_APP
JWT_ACCESS_SECRET=<cadena_aleatoria_min_32_caracteres>
JWT_REFRESH_SECRET=<cadena_aleatoria_min_32_caracteres>

# CORS — URL pública de la app (nginx)
CLIENT_URL=https://<IP_O_DOMINIO>:8059

# Usuario admin inicial
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@tudominio.com
ADMIN_PASSWORD=<password_segura>
```

o copiar el .env para ese entorno (desde powershell)
```bash
docker cp /c/Desarrollos/MASTER_IA/.env_miDocker_auth_StBoi sechttps-prod-test:/opt/secHTTPS/auth_APP/.env
```

### 8.2 Instalar dependencias, migrar y compilar

```bash
cd /opt/secHTTPS/auth_APP
npm install
npm run db:migrate
npm run build
```

---

## 9. Configurar secHTTPS_APP (producción)

### 9.1 Variables de entorno

```bash
cd /opt/secHTTPS/secHTTPS_APP
cp .env.example .env
nano .env
```

```dotenv
# PostgreSQL — superusuario
PG_ADMIN_USER=adminjmuriel
PG_ADMIN_PASSWORD=<el_configurado_en_docker>
PG_ADMIN_DB=postgresTEMP

# PostgreSQL — app
PG_HOST=localhost
PG_PORT=5432
PG_USER=sechttps
PG_PASSWORD=<password_segura>
PG_DATABASE=sechttps_db

PORT=3000
USE_POSTGRES=true
NODE_ENV=production

# CORS — URL pública (nginx)
CLIENT_URL=https://<IP_O_DOMINIO>:8059

# JWT — DEBEN ser idénticos a los de auth_APP
JWT_ACCESS_SECRET=<misma_cadena_que_en_auth_APP>
JWT_REFRESH_SECRET=<misma_cadena_que_en_auth_APP>

# URL interna entre servicios (no pasa por nginx)
AUTH_APP_URL=http://localhost:4000

# Variables del cliente React (se compilan en el build — usar URL pública con nginx)
# Ambas apuntan a nginx:8059 porque nginx enruta /auth/* y /api/* a cada servicio
VITE_AUTH_APP_URL=https://<IP_O_DOMINIO>:8059
VITE_BACKEND_URL=https://<IP_O_DOMINIO>:8059
VITE_APPLICATION_NAME=secHTTPS_APP

# SMTP
SMTP_HOST=smtp.tudominio.com
SMTP_PORT=587
SMTP_USER=notificaciones@tudominio.com
SMTP_PASSWORD=<password_smtp>
```
o copiar el .env para ese entorno (desde powershell)
```bash
docker cp /c/Desarrollos/MASTER_IA/.env_miDocker_secHTTPS_StBoi sechttps-prod-test:/opt/secHTTPS/secHTTPS_APP/.env
```

> **Importante:** `VITE_AUTH_APP_URL` y `VITE_BACKEND_URL` apuntan ambas a `https://<IP>:8059` porque nginx enruta `/auth/*` → auth_APP y `/api/*` + `/trpc/*` → secHTTPS_APP. El navegador solo necesita conocer un único punto de entrada.

### 9.2 Instalar dependencias, migrar y compilar

```bash
cd /opt/secHTTPS/secHTTPS_APP
npm install
npm run db:migrate

# Compilar backend TypeScript → dist/
npm run build

# Compilar frontend React → client/dist/  (REQUIERE que .env esté configurado)
npm run build:client
```

> nginx servirá los archivos estáticos de `client/dist/` directamente. No se levanta servidor Vite en producción.

---

## 10. Ejecución en producción con PM2

### 10.1 Instalar PM2

```bash
npm install -g pm2
```

### 10.2 Arrancar ambas apps

```bash
# auth_APP (ya compilada en el paso 8.2)
cd /opt/secHTTPS/auth_APP
pm2 start dist/server.js --name auth_APP

# secHTTPS_APP (ya compilada en el paso 9.2)
cd /opt/secHTTPS/secHTTPS_APP
pm2 start dist/server.js --name secHTTPS_server
```

### 10.3 Activar inicio automático con el sistema

```bash
pm2 save
pm2 startup
# El comando muestra una línea que debes ejecutar con sudo, por ejemplo:
# sudo env PATH=$PATH:/home/user/.nvm/versions/node/v24.13.0/bin pm2 startup systemd -u user --hp /home/user
```

### 10.4 Comandos útiles de PM2

```bash
pm2 list                   # estado de todos los procesos
pm2 logs auth_APP          # logs en tiempo real
pm2 logs secHTTPS_server
pm2 restart auth_APP
pm2 stop secHTTPS_server
```

---

## 11. Firewall (ufw)

Solo dos puertos expuestos. Los servicios internos (3000, 4000, 5432) no se abren:

```bash
sudo ufw allow OpenSSH   # puerto 22
sudo ufw allow 8059      # nginx HTTPS — único punto de entrada
sudo ufw enable
sudo ufw status
```

```
To                         Action      From
--                         ------      ----
OpenSSH                    ALLOW       Anywhere
8059                       ALLOW       Anywhere
```

> Los puertos `3000` (secHTTPS_APP), `4000` (auth_APP) y `5432` (PostgreSQL) son internos y **no deben abrirse**.

---

## 12. Verificación final
(desde powershell)
docker compose ps
# → secHTTPS-postgres  Up (healthy)

# 2. PM2
pm2 list
# auth_APP        online
# secHTTPS_server online

# 3. nginx (desde win solo nginx)
sudo systemctl status nginx
comprobar el estado:
ps aux | grep nginx
# debe mostrar: nginx: master process y nginx: worker process

# 4. Sin token → 401 (confirma que la protección funciona)
curl -sk -o /dev/null -w "%{http_code}" https://<IP_O_DOMINIO>:8059/api/certif
# → 401

# 5. Login y comprobación con token
TOKEN=$(curl -sk -X POST https://<IP_O_DOMINIO>:8059/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"<ADMIN_PASSWORD>"}' \
  | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

curl -sk -H "Authorization: Bearer $TOKEN" https://<IP_O_DOMINIO>:8059/api/certif
# → [] (array vacío — sin certificados aún)

# 6. Frontend accesible
curl -sk -o /dev/null -w "%{http_code}" https://<IP_O_DOMINIO>:8059/
# → 200
```

---

## 13. Actualizar la aplicación (deploys futuros)

```bash
cd /opt/secHTTPS
git pull

# Si cambió auth_APP:
cd auth_APP && npm install && npm run build && pm2 restart auth_APP

# Si cambió el backend de secHTTPS_APP:
cd ../secHTTPS_APP && npm install && npm run build && pm2 restart secHTTPS_server

# Si cambió el frontend (client/):
cd secHTTPS_APP && npm run build:client
# nginx recoge los nuevos estáticos automáticamente (sin reiniciar)
```

---

## Apéndice: Let's Encrypt (si tienes dominio)

Si el servidor tiene un dominio público y puedes abrir el puerto 80 temporalmente:

```bash
sudo apt install -y certbot python3-certbot-nginx

# Abrir puerto 80 temporalmente
sudo ufw allow 80

# Obtener certificado
sudo certbot --nginx -d tudominio.com

# Cerrar puerto 80
sudo ufw delete allow 80
```

Edita `/etc/nginx/sites-available/sechttps` y reemplaza `ssl_certificate` / `ssl_certificate_key` por:
```nginx
ssl_certificate     /etc/letsencrypt/live/tudominio.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/tudominio.com/privkey.pem;
```

La renovación automática la gestiona el timer instalado por certbot:
```bash
sudo systemctl status certbot.timer
```
