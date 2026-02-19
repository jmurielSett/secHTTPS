# Sesión de prueba de despliegue — Contenedor Docker Ubuntu 24.04

Registro detallado de la sesión de validación completa del despliegue en producción.  
Contenedor: `sechttps-prod-test` | Imagen: `ubuntu:24.04` | Fecha: 2026-02-19

---

## Resultado final

| Verificación | Resultado |
|---|---|
| nginx HTTPS :8059 | ✅ |
| auth_APP login (cookies) | ✅ |
| secHTTPS_server API | ✅ 6 certificados |
| PostgreSQL (host Windows) | ✅ |
| Frontend React estático | ✅ 200 |

---

## 1. Arrancar el contenedor

> 💻 **Desde PowerShell (Windows)**

```powershell
docker run -it `
  --name sechttps-prod-test `
  --hostname ubuntu-prod `
  --privileged `
  -p 8059:8059 `
  ubuntu:24.04 `
  /bin/bash
```

---

## 2. Preparativos en el contenedor

> 🐧 **Dentro del contenedor** (`root@ubuntu-prod`)

```bash
apt update && apt install -y sudo curl wget git build-essential ca-certificates gnupg nginx openssl nano
```

> **Lección aprendida:** `nano` no viene preinstalado. Añadir `nano` al comando de instalación inicial.

---

## 3. Instalar Node.js 24 vía nvm

> 🐧 **Dentro del contenedor**

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 24
nvm use 24
nvm alias default 24
```

---

## 4. Clonar el repositorio

> 🐧 **Dentro del contenedor**

```bash
cd /opt
git clone <URL_DEL_REPO> secHTTPS
cd secHTTPS
```

---

## 5. PostgreSQL — desde Windows (no desde el contenedor)

> 💻 **Desde PowerShell (Windows)** — segunda terminal

```powershell
cd C:\Desarrollos\MASTER_IA\secHTTPS
docker compose up -d
docker compose ps
# → secHTTPS-postgres  Up (healthy)
```

> **Importante:** el contenedor Ubuntu no puede levantar su propio Docker. Se reutiliza el PostgreSQL del entorno de desarrollo que ya corre en Docker Desktop de Windows.

---

## 6. Certificado SSL autofirmado

> 🐧 **Dentro del contenedor**

```bash
mkdir -p /etc/nginx/ssl

openssl req -x509 -nodes -days 3650 -newkey rsa:4096 \
  -keyout /etc/nginx/ssl/sechttps.key \
  -out    /etc/nginx/ssl/sechttps.crt \
  -subj   "/C=ES/ST=Barcelona/L=Sant Boi del Llobregat/O=secHTTPS/CN=scpdsigsam59.pssjd.local"

chmod 600 /etc/nginx/ssl/sechttps.key
```

---

## 7. Configurar nginx

> 🐧 **Dentro del contenedor**

```bash
nano /etc/nginx/sites-available/sechttps
```

Contenido del fichero (solo el bloque `server { }`, sin la palabra `nginx` delante):

```nginx
server {
    listen 8059 ssl;
    listen [::]:8059 ssl;

    server_name localhost;

    ssl_certificate     /etc/nginx/ssl/sechttps.crt;
    ssl_certificate_key /etc/nginx/ssl/sechttps.key;

    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    location /auth/ {
        proxy_pass http://127.0.0.1:4000/auth/;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /trpc/ {
        proxy_pass http://127.0.0.1:3000/trpc/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade           $http_upgrade;
        proxy_set_header Connection        "upgrade";
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    root /opt/secHTTPS/secHTTPS_APP/client/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
ln -sf /etc/nginx/sites-available/sechttps /etc/nginx/sites-enabled/sechttps
rm -f /etc/nginx/sites-enabled/default

nginx -t
# → nginx: configuration file /etc/nginx/nginx.conf test is successful
```

> **Diferencia respecto al servidor real:** sin systemd → usar `nginx` para arrancar, `nginx -s reload` para recargar. **No** usar `systemctl`.

```bash
nginx
ps aux | grep nginx   # verifica master + worker process
```

---

## 8. Copiar los ficheros .env

> 💻 **Desde PowerShell (Windows)** — los `.env` no están en git

```powershell
docker cp C:\Desarrollos\MASTER_IA\.env_miDocker_auth_StBoi sechttps-prod-test:/opt/secHTTPS/auth_APP/.env
docker cp C:\Desarrollos\MASTER_IA\.env_miDocker_secHTTPS_StBoi sechttps-prod-test:/opt/secHTTPS/secHTTPS_APP/.env
```

> **Clave:** ambos `.env` deben tener `PG_HOST=host.docker.internal` (no `localhost`), ya que PostgreSQL corre en el Docker del host Windows, no en el contenedor Ubuntu.

---

## 9. Instalar dependencias y migrar la base de datos

> 🐧 **Dentro del contenedor**

```bash
# auth_APP
cd /opt/secHTTPS/auth_APP
npm install
npm run db:migrate
npm run build

# secHTTPS_APP
cd /opt/secHTTPS/secHTTPS_APP
npm install
npm run db:migrate
npm run build        # compila backend (dist/) + frontend (client/dist/)
```

> **Lección aprendida:** `npm install` muestra advertencias de paquetes deprecados y 5 vulnerabilidades de `ldapjs`. No bloquean el despliegue.

---

## 10. Instalar PM2 y arrancar las apps

> 🐧 **Dentro del contenedor**

```bash
npm install -g pm2

# Arrancar auth_APP
cd /opt/secHTTPS/auth_APP
pm2 start dist/server.js --name auth_APP

# Arrancar secHTTPS_server
cd /opt/secHTTPS/secHTTPS_APP
pm2 start dist/server.js --name secHTTPS_server

pm2 list
# auth_APP         online
# secHTTPS_server  online
```

> **Diferencia respecto al servidor real:** omitir `pm2 startup` y `pm2 save` — no hay systemd en el contenedor. PM2 no sobrevive a un reinicio del contenedor.

---

## 11. Firewall

> ⚠️ **Omitir en el contenedor** — `ufw` no está disponible. El firewall lo gestiona el host Windows/Docker.

En el **servidor real** ejecutar:
```bash
sudo ufw allow OpenSSH
sudo ufw allow 8059
sudo ufw enable
```

---

## 12. Problema encontrado y solución: ERR_MODULE_NOT_FOUND


### Actualizar en el contenedor

> 🐧 **Dentro del contenedor**

```bash
cd /opt/secHTTPS

# Si hay ficheros de build que git no dejaba actualizar:
git checkout -- secHTTPS_APP/client/tsconfig.app.tsbuildinfo
git pull

cd secHTTPS_APP
npm run build:server
pm2 restart secHTTPS_server
```

---

## 13. Verificación final

> 🐧 **Dentro del contenedor**

```bash
# 1. Sin token → 401
curl -sk -o /dev/null -w "%{http_code}" https://localhost:8059/api/certif
# → 401 ✅

# 2. Frontend React
curl -sk -o /dev/null -w "%{http_code}" https://localhost:8059/
# → 200 ✅

# 3. Login (tokens en cookies httpOnly)
curl -sk -X POST https://localhost:8059/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"<ADMIN_PASSWORD>"}' \
  -c /tmp/cookies.txt
# → {"success":true,"user":{...},"message":"Login successful, tokens stored in httpOnly cookies"} ✅

# 4. Llamada autenticada con cookie
curl -sk -b /tmp/cookies.txt https://localhost:8059/api/certif
# → {"total":6,"certificates":[...]} ✅
```
