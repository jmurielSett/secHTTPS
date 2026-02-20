Arquitetura:

1. **Regla de dependencias**: flechas hacia dentro (dominio en el centro).
2. **Dominio puro**: VO/Entidades con invariantes, sin IO ni frameworks.
3. **Casos de uso** orquestan (DTO in/out, errores tipados, eventos).
4. **Puertos** expresan necesidades; adaptadores expresan tecnología.
5. **Composición explícita** en el borde (sin magia, sin service locator).
6. **DTOs fuera**; Entidades/VOs dentro.
7. **Errores como tipos** en application; excepciones solo para invariantes en dominio.
8. **Tests por niveles**: dominio → aceptación → contratos → e2e/smoke.
9. **Observabilidad** como puerto (logger) y eventos **fiables** (Outbox).
10. **IA como copiloto**, no como piloto: siempre validamos con arquitectura.

## Actualizar servidor

```bash
cd /opt/secHTTPS
git pull
```

Si falla con:

```bash
error: Your local changes to the following files would be overwritten by merge:
        auth_APP/package-lock.json
        secHTTPS_APP/package-lock.json
```

Ejecutar:

```bash
git checkout -- auth_APP/package-lock.json secHTTPS_APP/package-lock.json
git pull
```

restart el server:

```bash
# 2. Actualizar, compilar y reiniciar auth_APP
cd auth_APP && npm install && npm run build && pm2 restart auth_APP

# 3. Actualizar, compilar y reiniciar secHTTPS_APP
cd ../secHTTPS_APP && npm install && npm run build && pm2 restart secHTTPS_server
```

Verificar todo ok:

```bash
pm2 list
pm2 logs auth_APP --lines 30
```

probar

```bash
https://scpdsigsam59.pssjd.local:8059/
```

Para conectar con la BBDD del Docker del servidor: 

antes del npm run dev ejecutar: (LA TERMINAL SE HA DE QUEDAR ABIERTA, y luego ejecutas el npm run dev en otra)

```bash
ssh -N -L 5432:localhost:5432 pssjd@scpdsigsam59.pssjd.local
```

Modificaciones por entorno:

```bash
CLIENT_URL=http://localhost:5173 o CLIENT_URL=https://scpdsigsam59.pssjd.local:8059

VITE_AUTH_APP_URL=http://localhost:4000
VITE_BACKEND_URL=http://localhost:3000
o
VITE_AUTH_APP_URL=https://scpdsigsam59.pssjd.local:8059
VITE_BACKEND_URL=https://scpdsigsam59.pssjd.local:8059
```