# Probar la guía de despliegue en un contenedor Ubuntu local

Simula el servidor de producción Ubuntu 24.04 usando Docker local, siguiendo los mismos pasos de `deploy_ubuntu.md`.

---

## 1. Arrancar el contenedor

Ejecuta desde **PowerShell** (no Git Bash, para evitar problemas con rutas):

```powershell
docker run -it `
  --name sechttps-prod-test `
  --hostname ubuntu-prod `
  --privileged `
  -p 8059:8059 `
  ubuntu:24.04 `
  /bin/bash
```

> **Nota Windows:** No se monta el socket Docker porque Docker Desktop usa una named pipe, no un socket Unix. El PostgreSQL se levanta desde el host Windows (ver paso 2).

| Opción | Motivo |
|--------|--------|
| `--privileged` | Permite instalar y arrancar nginx sin systemd completo |
| `-p 8059:8059` | El puerto queda accesible desde `https://localhost:8059` en tu máquina |

---

## 2. Preparación inicial

### 2a. Desde Windows (antes de seguir la guía) — levantar PostgreSQL

Abre una **segunda terminal PowerShell** en tu máquina y ejecuta:

```powershell
cd C:\Desarrollos\MASTER_IA\secHTTPS
docker compose up -d
```

El contenedor PostgreSQL corre en tu Docker de Windows. El contenedor Ubuntu lo alcanza mediante `host.docker.internal`.

### 2b. Dentro del contenedor — herramientas base

Desde el prompt `root@ubuntu-prod:/#`:

```bash
apt update && apt install -y sudo curl wget
```

A partir de aquí **sigue la guía `deploy_ubuntu.md` desde el paso 1** con las diferencias indicadas abajo.

> **Importante:** en todos los ficheros `.env`, cambia `PG_HOST=localhost` por:
> ```dotenv
> PG_HOST=host.docker.internal
> ```
> Esto es necesario porque PostgreSQL corre en el Docker del host Windows, no dentro del contenedor Ubuntu.

---

## 3. Diferencias respecto al servidor real

| Paso de la guía | Qué hacer en el contenedor |
|-----------------|---------------------------|
| `systemctl enable nginx` / `systemctl start nginx` | Reemplazar por `nginx` (arranque directo, sin systemd) |
| `sudo nginx -t && sudo systemctl reload nginx` | `nginx -t && nginx -s reload` |
| `pm2 startup` | **Omitir** — no hay systemd; PM2 no sobrevive al reiniciar el contenedor |
| `sudo ufw enable` | **Ignorar** — el firewall lo gestiona el host |
| `docker compose up -d` | Ejecutar desde **Windows** (fuera del contenedor); usar `PG_HOST=host.docker.internal` en los `.env` |

---

## 4. Acceso desde el navegador

Una vez completada la instalación, abre en tu máquina:

```
https://localhost:8059
```

El navegador mostrará aviso de certificado autofirmado → acepta la excepción.

---

## 5. Gestión del contenedor

### Salir sin parar el contenedor
```bash
# Dentro del contenedor: Ctrl+P, Ctrl+Q
```

### Reconectar
```bash
docker start -ai sechttps-prod-test
```

### Inspeccionar puertos y estado
```bash
docker ps
docker inspect sechttps-prod-test
```

### Eliminar el contenedor cuando termines
```bash
docker rm -f sechttps-prod-test
```

> Los contenedores PostgreSQL levantados desde dentro quedarán en tu Docker del host. Límpialos con:
> ```bash
> docker compose -f /ruta/al/secHTTPS/docker-compose.yml down
> ```
