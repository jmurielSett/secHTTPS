# Diseño API REST - Gestión de Certificados SSL/TLS

## 1. Objetivo
API REST para gestionar el ciclo de vida de certificados SSL/TLS instalados en servidores web, permitiendo su creación, consulta, modificación de estado y monitorización de su expiración.

## 2. Modelo de Datos

### Certificado (Certificate)
```json
{
  "id": "string (UUID)",
  "fileName": "string",
  "startDate": "date (ISO 8601)",
  "expirationDate": "date (ISO 8601)",
  "server": "string",
  "filePath": "string (path en servidor)",
  "client": "string (empresa propietaria)",
  "configPath": "string (path del archivo de configuración)",
  "responsibleEmails": ["string"],
  "status": "ACTIVE | DELETED",
  "expirationStatus": "NORMAL | WARNING | EXPIRED",
  "createdAt": "datetime (ISO 8601)",
  "updatedAt": "datetime (ISO 8601)"
}
```

### Estados
- **Estado del certificado**: `ACTIVE` (por defecto), `DELETED`
- **Estado de expiración** (calculado automáticamente):
  - `NORMAL`: Más de 7 días para caducar
  - `WARNING`: 7 días o menos para caducar
  - `EXPIRED`: Fecha caducidad superada

### NotificacionEmail (EmailNotification)
```json
{
  "id": "string (UUID)",
  "certificateId": "string (UUID)",
  "sentAt": "datetime (ISO 8601)",
  "recipientEmails": ["string"],
  "subject": "string",
  "expirationStatusAtTime": "WARNING | EXPIRED",
  "result": "SENT | ERROR",
  "errorMessage": "string (opcional)"
}
```

**Descripción**:
- Registro de cada email enviado por el sistema de notificaciones
- Se crea automáticamente cuando el sistema detecta certificados próximos a expirar o expirados
- Permite auditar las notificaciones enviadas

## 3. Endpoints Propuestos

### 3.1. Crear Certificado
```
POST /api/certif
Content-Type: application/json

Body:
{
  "fileName": "example.com.crt",
  "startDate": "2026-01-01",
  "expirationDate": "2027-01-01",
  "server": "web-prod-01",
  "filePath": "/etc/ssl/certs/example.com.crt",
  "client": "Empresa XYZ",
  "configPath": "/etc/nginx/sites-available/example.com",
  "responsibleEmails": ["admin@empresa.com", "devops@empresa.com"]
}

Response 201:
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "fileName": "example.com.crt",
  ...
  "status": "ACTIVE",
  "expirationStatus": "NORMAL",
  "createdAt": "2026-02-08T10:00:00Z",
  "updatedAt": "2026-02-08T10:00:00Z"
}
```

### 3.2. Listar y Filtrar Certificados
```
GET /api/certif?client={client}&server={server}&fileName={fileName}&status={ACTIVE|DELETED}&expirationStatus={NORMAL|WARNING|EXPIRED}

Response 200:
{
  "total": 10,
  "certificates": [...]
}
```

**Parámetros de consulta (query params)**:
- `client`: Filtrar por nombre del cliente
- `server`: Filtrar por nombre del servidor
- `fileName`: Filtrar por nombre del fichero del certificado
- `status`: Filtrar por estado (`ACTIVE`, `DELETED`)
- `expirationStatus`: Filtrar por estado de expiración (`NORMAL`, `WARNING`, `EXPIRED`)

Todos los parámetros son opcionales y combinables.

### 3.3. Obtener Certificado por ID
```
GET /api/certif/{id}

Response 200:
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "fileName": "example.com.crt",
  ...
}

Response 404:
{
  "error": "Certificado no encontrado"
}
```

### 3.4. Modificar Estado a Eliminado
```
PATCH /api/certif/{id}/status
Content-Type: application/json

Body:
{
  "status": "DELETED"
}

Response 200:
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "status": "DELETED",
  ...
}

Response 400 (si ya está eliminado):
{
  "error": "No se puede modificar un certificado eliminado"
}
```

### 3.5. Actualizar Datos del Certificado
```
PUT /api/certif/{id}
Content-Type: application/json

Body:
{
  "fileName": "nuevo-nombre.crt",
  "expirationDate": "2027-06-01",
  "responsibleEmails": ["nuevo@empresa.com"]
}

Response 200:
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  ...
}

Response 400 (si está eliminado):
{
  "error": "No se puede modificar un certificado eliminado"
}
```

### 3.6. Listar Notificaciones Enviadas
```
GET /api/notif?certificateId={id}&startDate={date}&endDate={date}&expirationStatus={WARNING|EXPIRED}&result={SENT|ERROR}

Response 200:
{
  "total": 25,
  "notifications": [
    {
      "id": "abc123...",
      "certificateId": "123e4567...",
      "sentAt": "2026-02-08T08:30:00Z",
      "recipientEmails": ["admin@empresa.com"],
      "subject": "Certificado example.com.crt expirará en 5 días",
      "expirationStatusAtTime": "WARNING",
      "result": "SENT",
      "errorMessage": null
    }
  ]
}
```

**Parámetros de consulta (query params)**:
- `certificateId`: Filtrar por ID del certificado
- `startDate`: Filtrar notificaciones desde esta fecha
- `endDate`: Filtrar notificaciones hasta esta fecha
- `expirationStatus`: Filtrar por estado de expiración en momento del envío (`WARNING`, `EXPIRED`)
- `result`: Filtrar por resultado del envío (`SENT`, `ERROR`)

Todos los parámetros son opcionales y combinables.

### 3.7. Obtener Notificaciones de un Certificado
```
GET /api/certif/{id}/notifications

Response 200:
{
  "total": 5,
  "notifications": [...]
}

Response 404:
{
  "error": "Certificado no encontrado"
}
```

### 3.8. Registrar Notificación Enviada
```
POST /api/notif
Content-Type: application/json

Body:
{
  "certificateId": "123e4567-e89b-12d3-a456-426614174000",
  "recipientEmails": ["admin@empresa.com", "devops@empresa.com"],
  "subject": "Certificado example.com.crt expirará en 3 días",
  "expirationStatusAtTime": "WARNING",
  "result": "SENT"
}

Response 201:
{
  "id": "abc123...",
  "certificateId": "123e4567...",
  "sentAt": "2026-02-08T10:15:00Z",
  "recipientEmails": ["admin@empresa.com", "devops@empresa.com"],
  "subject": "Certificado example.com.crt expirará en 3 días",
  "expirationStatusAtTime": "WARNING",
  "result": "SENT",
  "errorMessage": null
}
```

**Nota**: Este endpoint es usado principalmente por el sistema automático de notificaciones, pero puede utilizarse también para registrar envíos manuales.

## 4. Reglas de Negocio

### 4.1. Creación
- Al crear un certificado, el estado por defecto es `ACTIVE`
- El `expirationStatus` se calcula automáticamente según la `expirationDate`
- Todos los campos son obligatorios excepto se especifique lo contrario

### 4.2. Estado de Expiración (Calculado)
- **NORMAL**: `expirationDate - currentDate > 7 días`
- **WARNING**: `expirationDate - currentDate <= 7 días` y `expirationDate >= currentDate`
- **EXPIRED**: `currentDate > expirationDate`

### 4.3. Modificación
- Un certificado con `status = DELETED` **no puede ser modificado**
- El cambio de estado de `ACTIVE` a `DELETED` es permitido
- El cambio de estado de `DELETED` a `ACTIVE` **no está permitido**

### 4.4. Eliminación Lógica
- Los certificados no se eliminan físicamente de la base de datos
- Se utiliza eliminación lógica mediante el campo `status = DELETED`

### 4.5. Sistema de Notificaciones por Email
- **Frecuencia de envío**:
  - `WARNING`: Email cada **2 días** a los responsables
  - `EXPIRED`: Email **cada día** a los responsables
  - `NORMAL`: No se envían notificaciones
- **Destinatarios**: Emails definidos en el campo `responsibleEmails` del certificado
- **Certificados eliminados**: No se envían notificaciones a certificados con `status = DELETED`
- **Registro**: Cada envío (exitoso o fallido) se registra en la tabla de notificaciones
- **Implementación**: Un proceso programado (cron/scheduler) verifica periódicamente los certificados y envía las notificaciones según las reglas definidas
- **Prevención de duplicados**: El sistema verifica la última notificación enviada para respetar las frecuencias establecidas

## 5. Códigos de Respuesta HTTP

- `200 OK`: Operación exitosa
- `201 Created`: Certificado creado exitosamente
- `400 Bad Request`: Datos inválidos o regla de negocio violada
- `404 Not Found`: Certificado no encontrado
- `500 Internal Server Error`: Error del servidor

## 6. Validaciones

### Campos requeridos:
- `fileName`: string no vacío
- `startDate`: fecha válida
- `expirationDate`: fecha válida, debe ser posterior a `startDate`
- `server`: string no vacío
- `filePath`: string no vacío (path válido)
- `client`: string no vacío
- `configPath`: string no vacío (path válido)
- `responsibleEmails`: array con al menos un email válido

### Formato:
- Fechas en formato ISO 8601
- Emails con formato válido
- IDs como UUID v4

## 7. Sistema de Notificaciones

### 7.1. Objetivo
Alertar automáticamente a los responsables cuando un certificado está próximo a expirar o ha expirado, permitiendo actuar de forma proactiva.

### 7.2. Validaciones de Notificaciones

**Campos requeridos al registrar una notificación**:
- `certificateId`: UUID válido, debe existir en la base de datos
- `recipientEmails`: array con al menos un email válido
- `subject`: string no vacío
- `expirationStatusAtTime`: `WARNING` o `EXPIRED`
- `result`: `SENT` o `ERROR`

**Campos opcionales**:
- `errorMessage`: string, requerido solo si `result = ERROR`

### 7.3. Proceso Automático Recomendado
1. **Scheduler/Cron**: Ejecutar cada día a una hora específica (ej: 08:00 AM)
2. **Consultar certificados**: Obtener todos los certificados con `status = ACTIVE` y `expirationStatus IN (WARNING, EXPIRED)`
3. **Por cada certificado**:
   - Verificar última notificación enviada
   - Si `WARNING` y han pasado >= 2 días desde la última notificación: enviar email
   - Si `EXPIRED` y ha pasado >= 1 día desde la última notificación: enviar email
4. **Registrar resultado**: Crear un registro en `/api/notif` con el resultado del envío
