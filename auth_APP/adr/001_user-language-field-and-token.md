# 001 — Añadir campo `language` al usuario, propagarlo en el JWT y exponer endpoint de cambio de idioma

**Fecha:** 2026-05-19
**Estado:** Aceptado

---

## Contexto

Las aplicaciones que consumen `auth_APP` (p.ej. `secHTTPS_APP`) necesitan mostrar la
interfaz en el idioma preferido del usuario. Actualmente no existe ningún campo de idioma
en el sistema: los tokens JWT no transportan preferencias de idioma, y cada aplicación
tendría que gestionar este dato de forma independiente (localStorage, cookie propia, base
de datos propia), lo que genera inconsistencia y duplicación.

Los idiomas disponibles en esta primera versión son:
- `ca` — Catalán (valor por defecto)
- `es` — Español

El sistema ya dispone de una tabla `auth.users` en PostgreSQL gestionada mediante
migraciones SQL versionadas (`000_`, `001_`, `002_`). Los tokens JWT incluyen `userId`,
`username`, roles y `authProvider`; se firman en `JWTService` y el payload está tipado
en `TokenPayload` (`src/types/user.ts`).

---

## Opciones consideradas

### Opción A: Cada aplicación cliente gestiona el idioma por su cuenta
- **Pros:** sin cambios en `auth_APP`.
- **Contras:** el idioma no es persistente entre dispositivos ni aplicaciones; duplicación
  de lógica; inconsistencia si el usuario usa varias apps del ecosistema.

### Opción B (elegida): Campo `language` en `auth.users`, propagado en el JWT, con endpoint de cambio
- **Pros:** fuente única de verdad; el idioma viaja en el token sin petición extra;
  cualquier app lo lee directamente del JWT; persistencia real en base de datos.
- **Contras:** requiere migración SQL, cambios en tipos, JWTService, controladores y rutas;
  los tokens emitidos antes del cambio no contendrán `lang` (sin impacto real ya que tienen
  TTL corto).

### Opción C: Tabla separada `user_preferences`
- **Pros:** más extensible para futuras preferencias.
- **Contras:** sobreingeniería para el caso actual; join adicional en cada login.

---

## Decisión

Se elige la **Opción B**: añadir la columna `language` directamente en `auth.users`,
incluir el campo `lang` en el payload JWT y exponer un endpoint protegido
`PATCH /users/:id/language` accesible tanto por el propio usuario como por administradores.

---

## Implementación

### 1. Migración SQL — `003_add_language_to_users.sql`

```sql
-- Migration: 003_add_language_to_users
SET search_path TO auth, public;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS language VARCHAR(10) NOT NULL DEFAULT 'ca';

-- Constraint: solo idiomas reconocidos
ALTER TABLE users
  ADD CONSTRAINT users_language_check
  CHECK (language IN ('ca', 'es'));
```

### 2. Tipo `User` — `src/types/user.ts`

Añadir `language` al interfaz `User` y a `CreateUserDTO`:

```ts
export interface User {
  // ...campos existentes...
  language: string; // 'ca' | 'es'
}

export interface CreateUserDTO {
  // ...campos existentes...
  language?: string; // opcional; el repositorio aplica 'ca' por defecto
}
```

Añadir `lang` al payload del token:

```ts
export interface TokenPayload {
  // ...campos existentes...
  lang: string;
}
```

### 3. Repositorios

- **`PostgresUserRepository`**: incluir `language` en `SELECT` y en `INSERT`. En
  `createUser` usar `DEFAULT` de la BD (o pasar `language ?? 'ca'`).
- **`InMemoryUserRepository`**: inicializar `language: 'ca'` en todos los usuarios de
  memoria (dev/test).

### 4. `JWTService.generateTokenPair`

Añadir parámetro `language: string` y propagarlo al payload como `lang`:

```ts
generateTokenPair(userId, username, applicationName?, roles?,
                  applications?, authProvider?, language = 'ca'): TokenPair
```

Payload resultante:
```json
{
  "userId": "42",
  "username": "jmuriel",
  "lang": "ca",
  "type": "access",
  ...
}
```

### 5. Endpoint de cambio de idioma

```
PATCH /api/users/:id/language
```

- **Autenticación:** token JWT válido (middleware `authenticateToken`).
- **Autorización:** el usuario solo puede cambiar su propio idioma **o** rol `admin`.
- **Body:** `{ "language": "es" }`
- **Validación:** solo valores en `['ca', 'es']`; rechazar con 400 en caso contrario.
- **Respuesta 200:** nuevo par de tokens con el `lang` ya actualizado:
  ```json
  {
    "message": "Idioma actualizado",
    "language": "es",
    "accessToken": "<nuevo_access_token>",
    "refreshToken": "<nuevo_refresh_token>"
  }
  ```

**Estrategia de invalidación del token anterior — emisión inmediata de nuevos tokens:**

Se elige emitir un nuevo par de tokens directamente en la respuesta del endpoint.
El cliente (app consumidora) **debe** reemplazar sus tokens almacenados con los recibidos.
De este modo:
- El nuevo `lang` está disponible de forma inmediata sin necesidad de re-login.
- El token anterior sigue siendo técnicamente válido hasta su TTL (≈15 min), pero el
  cliente ya no lo usa porque ha recibido uno nuevo.
- No se requiere blacklist, base de datos de tokens revocados ni Redis.

Alternativas descartadas:
- **`tokenVersion` en BD verificado en cada request:** rompe el modelo stateless del JWT;
  un query a BD por cada petición autenticada.
- **Blacklist con `jti`:** requiere infraestructura adicional (Redis o tabla) para un
  beneficio marginal dado el TTL corto del access token.

El cliente debe actualizar sus cookies/localStorage con los tokens nuevos recibidos.
Si el llamante es una app de backend (server-to-server), debe propagar los nuevos tokens
al cliente final en su próxima respuesta.

Ruta registrada en `adminRoutes.ts` o en una nueva `userRoutes.ts` si la ruta es de
autoservicio (no solo admin).

### 6. Propagación en aplicaciones consumidoras

Las apps que validan el token (p.ej. `secHTTPS_APP`) pueden leer `lang` del payload
decodificado sin ninguna petición adicional:

```ts
const lang = tokenPayload.lang ?? 'ca';
```

---

## Consecuencias

**Positivas:**
- Idioma persistente y centralizado en una sola fuente de verdad.
- Las apps consumidoras obtienen el idioma gratis al validar el token.
- Fácil extensión a nuevos idiomas: añadir valor al `CHECK` + nueva migración.

**Negativas / trade-offs asumidos:**
- El token anterior (con `lang` viejo) sigue siendo válido hasta su TTL (≈15 min) si el
  cliente no reemplaza los tokens. Las apps consumidoras **deben** actualizar sus tokens
  cuando reciben nuevos en la respuesta del endpoint de cambio de idioma.
- Los tokens existentes sin campo `lang` deben tratarse con fallback `?? 'ca'` en las
  apps consumidoras hasta que todos expiren.

**Neutras / acciones derivadas:**
- Actualizar scripts de creación de usuarios (`createEditorUser.ts`, etc.) para incluir
  `language` opcional.
- Actualizar `InMemoryUserRepository` para reflejar el campo en seeds de test.
- Documentar el nuevo campo en `docs/openapi.yaml`.
