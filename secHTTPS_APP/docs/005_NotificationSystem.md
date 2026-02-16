# Sistema de Notificaciones Automáticas

## Índice
1. [Visión General](#1-visión-general)
2. [Arquitectura](#2-arquitectura)
3. [Componentes](#3-componentes)
4. [Flujo de Ejecución](#4-flujo-de-ejecución)
5. [Configuración](#5-configuración)
6. [Reglas de Negocio](#6-reglas-de-negocio)
7. [Formato de Emails](#7-formato-de-emails)
8. [Troubleshooting](#8-troubleshooting)
9. [Testing](#9-testing)

---

## 1. Visión General

El sistema de notificaciones envía automáticamente emails a los responsables en dos casos:

### A. Notificaciones de Creación
- Se envía **inmediatamente** al crear un certificado
- Confirma el registro exitoso en el sistema
- Informa sobre el monitoreo automático
- **Estado**: `expirationStatusAtTime = NORMAL`

### B. Notificaciones de Expiración
- Se envían **periódicamente** cuando:
  - Un certificado está próximo a expirar (**WARNING**: ≤ 7 días)
  - Un certificado ya ha expirado (**EXPIRED**)

### Características Principales
- ✅ **Ejecución automática** programada con cron (para expiración)
- ✅ **Envío inmediato** al crear certificados
- ✅ **Frecuencia inteligente**: diferentes intervalos según severidad
- ✅ **Emails profesionales** con formato HTML y texto plano
- ✅ **Registro completo** de todas las notificaciones enviadas (SENT y ERROR)
- ✅ **Arquitectura limpia** con separación de responsabilidades
- ✅ **Configurable** vía variables de entorno

---

## 2. Arquitectura

El sistema sigue los principios de **Clean Architecture** / **Hexagonal Architecture**:

```
┌─────────────────────────────────────────────────────────────┐
│  INFRASTRUCTURE LAYER                                       │
│                                                             │
│  ┌─────────────────────┐      ┌────────────────────────┐  │
│  │ NotificationScheduler│      │ NodemailerEmailService │  │
│  │ (node-cron)          │──────│ (SMTP)                 │  │
│  └──────────┬───────────┘      └────────┬───────────────┘  │
│             │                           │                  │
│             │ invoca                    │ implementa       │
│             ▼                           ▼                  │
└─────────────┼───────────────────────────┼──────────────────┘
              │                           │
┌─────────────┼───────────────────────────┼──────────────────┐
│  DOMAIN LAYER                          │                  │
│             │                           │                  │
│  ┌──────────▼──────────────┐  ┌────────▼──────────┐      │
│  │ SendCertificate         │  │ IEmailService     │      │
│  │ NotificationsUseCase    │  │ (interface)       │      │
│  └──────────┬──────────────┘  └───────────────────┘      │
│             │                                              │
│             │ usa                                          │
│             ▼                                              │
│  ┌──────────────────────┐    ┌──────────────────────┐    │
│  │ ICertificateRepository│    │ INotificationRepository│  │
│  └──────────────────────┘    └──────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Justificación de la Arquitectura

#### ¿Por qué el scheduler está en Infrastructure?
- El scheduler (`node-cron`) es un **detalle técnico** de implementación
- El dominio no debe conocer cómo se programa la ejecución (cron, eventos, etc.)
- Facilita cambiar la tecnología de scheduling sin tocar el dominio

#### ¿Por qué el servicio de email está en Infrastructure?
- El envío de emails (SMTP, nodemailer) es un **detalle de implementación**
- El dominio solo conoce la **interface** `IEmailService`
- Permite cambiar de proveedor (nodemailer → SendGrid → AWS SES) sin modificar el UseCase

#### ¿Por qué existe un UseCase?
- Orquesta la **lógica de negocio completa**:
  1. Consultar certificados
  2. Aplicar reglas de frecuencia
  3. Enviar emails
  4. Guardar registros
- Es **testeable** sin dependencias técnicas (mocks)
- Es **reutilizable** desde diferentes puntos de entrada (cron, API, CLI)

---

## 3. Componentes

### 3.1. Domain Layer

#### IEmailService (Interface)
**Ubicación**: `src/domain/services/IEmailService.ts`

```typescript
export interface IEmailService {
  sendExpirationAlert(certificate: Certificate): Promise<void>;
  sendCertificateCreationNotification(certificate: Certificate): Promise<void>;
  verifyConnection(): Promise<boolean>;
}
```

**Responsabilidad**: Define el contrato para cualquier implementación de envío de emails.

**Métodos**:
- `sendExpirationAlert()`: Envía email cuando un certificado está por expirar o expiró
- `sendCertificateCreationNotification()`: Envía email al crear un certificado nuevo
- `verifyConnection()`: Valida que la configuración SMTP es correcta

---

#### SendCertificateNotificationsUseCase
**Ubicación**: `src/domain/usecases/notifications/SendCertificateNotificationsUseCase.ts`

**Responsabilidades**:
1. Consultar certificados WARNING y EXPIRED activos
2. Filtrar certificados según tiempo desde última notificación
3. Coordinar envío de emails
4. Guardar registros de notificaciones (exitosas y fallidas)
5. Retornar resumen de ejecución

**Dependencias inyectadas**:
- `ICertificateRepository`
- `INotificationRepository`
- `IEmailService`

**Constantes de frecuencia** (definidas en `src/types/shared.ts`):
```typescript
export const NOTIFICATION_FREQUENCY = {
  WARNING_HOURS: 48,   // 48 horas (2 días)
  EXPIRED_HOURS: 24    // 24 horas (1 día)
} as const;
```

**Método principal**:
```typescript
async execute(): Promise<NotificationSummary>
```

**Retorna**:
```typescript
interface NotificationSummary {
  executedAt: string;
  totalCertificatesChecked: number;
  totalCertificatesNeedingNotification: number;
  totalNotificationsSent: number;
  totalNotificationsFailed: number;
  results: NotificationResultDetail[];
}
```

---

### 3.2. Infrastructure Layer

#### NodemailerEmailService
**Ubicación**: `src/infrastructure/messaging/NodemailerEmailService.ts`

**Responsabilidades**:
1. Implementar `IEmailService`
2. Configurar transporter de nodemailer con SMTP
3. Construir emails HTML y texto plano
4. Gestionar errores de envío

**Configuración** (de `.env`):
```typescript
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
SMTP_FROM=noreply@sechttps.local
SYSTEM_NAME=SecHTTPS Monitor
```

**Características del email**:
- ✅ HTML responsivo con estilos inline
- ✅ Texto plano alternativo (fallback)
- ✅ Colores según severidad (rojo: EXPIRED, naranja: WARNING)
- ✅ Información completa del certificado
- ✅ Emojis para mejor visualización
- ✅ Compatible con todos los clientes de email

---

#### NotificationSchedulerJob
**Ubicación**: `src/infrastructure/scheduling/NotificationSchedulerJob.ts`

**Responsabilidades**:
1. Programar ejecuciones con `node-cron`
2. Invocar el UseCase periódicamente
3. Registrar resultados en consola
4. Manejar errores sin interrumpir el servicio

**Configuración** (de `.env`):
```typescript
CRON_EXPRESSION=0 8 * * *        // Cada día a las 8:00 AM
TIMEZONE=Europe/Madrid            // Zona horaria
ENABLE_SCHEDULER=true             // Activar/desactivar
```

**Métodos**:
- `start()`: Inicia el scheduler
- `stop()`: Detiene el scheduler
- `executeNow()`: Ejecuta manualmente (útil para testing)
- `getStatus()`: Obtiene estado actual

**Logs generados**:
```
✅ Notification scheduler iniciado: 0 8 * * * (Europe/Madrid)
⏰ Próxima ejecución: 14/02/2026, 8:00:00

============================================================
📧 Iniciando proceso de notificaciones de certificados
============================================================

📊 Resumen de Ejecución:
   Hora: 13/02/2026, 8:00:00
   Certificados verificados: 15
   Certificados pendientes: 3
   ✅ Notificaciones enviadas: 3
   ❌ Notificaciones fallidas: 0
   ⏱️  Duración: 1234ms

📝 Detalle de Notificaciones:
   ✅ warning.crt (cert-id-1): Enviado
   ✅ expired.crt (cert-id-2): Enviado
   ✅ test.crt (cert-id-3): Enviado
============================================================
✅ Proceso de notificaciones completado exitosamente
```

---

## 4. Flujo de Ejecución

### 4.1. Flujo de Creación de Certificados (Notificación Inmediata)

```
┌──────────────────┐
│  HTTP POST       │
│  /api/certif     │
└────────┬─────────┘
         │
         ▼
┌────────────────────────────────────────────────────────┐
│  CertificateController.createCertificate()             │
└────────┬───────────────────────────────────────────────┘
         │
         ▼
┌───────────────────────────────────────────────────────┐
│  CreateCertificateUseCase.execute(data)               │
├───────────────────────────────────────────────────────┤
│  1. Validar datos (campos requeridos, emails, fechas) │
│                                                        │
│  2. Crear objeto Certificate con:                     │
│     - id (UUID generado)                              │
│     - status = ACTIVE                                 │
│     - expirationStatus = calculado                    │
│     - timestamps                                      │
│                                                        │
│  3. Guardar en repositorio                            │
│     certificate = certificateRepository.save(cert)    │
│                                                        │
│  4. Enviar email de notificación (async - no bloquea) │
│     a. emailService.sendCertificateCreationNotification()│
│     b. Registrar en notificationRepository:           │
│        - expirationStatusAtTime = cert.expirationStatus│
│        - result = SENT o ERROR                        │
│        - errorMessage si falló                        │
│     c. Si falla: Log error pero NO interrumpir        │
│                                                        │
│  5. Retornar certificado creado                       │
└────────┬──────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────┐
│  Response 201 con          │
│  certificado creado        │
└────────────────────────────┘
```

**Notas importantes**:
- ✅ El envío de email es **asíncrono** y **no bloquea** la respuesta HTTP
- ✅ Si falla el email, el certificado **SÍ se crea** (solo se registra el error)
- ✅ La notificación **siempre se registra** en BD (SENT o ERROR)
- ✅ Esto garantiza trazabilidad completa

---

### 4.2. Flujo de Notificaciones de Expiración (Programado)

```
┌──────────────────┐
│  CRON TRIGGER    │
│  (cada día 8AM)  │
└────────┬─────────┘
         │
         ▼
┌────────────────────────────────────────────────────────┐
│  NotificationSchedulerJob.executeNotificationProcess() │
└────────┬───────────────────────────────────────────────┘
         │
         ▼
┌───────────────────────────────────────────────────────┐
│  SendCertificateNotificationsUseCase.execute()        │
├───────────────────────────────────────────────────────┤
│  1. Consultar certificados WARNING + EXPIRED activos  │
│     certificateRepository.findAll({ status: ACTIVE,   │
│                                     expirationStatus: WARNING })│
│                                                        │
│  2. Filtrar por frecuencia de notificación            │
│     - No enviar si última notificación < 48h (WARNING)│
│     - No enviar si última notificación < 24h (EXPIRED)│
│                                                        │
│  3. Para cada certificado pendiente:                  │
│     a. emailService.sendExpirationAlert(cert)         │
│     b. Si éxito:                                      │
│        - Guardar notificación con result=SENT         │
│     c. Si error:                                      │
│        - Guardar notificación con result=ERROR        │
│        - Incluir mensaje de error                     │
│                                                        │
│  4. Retornar resumen con estadísticas                 │
└────────┬──────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────┐
│  Log resultados en consola │
│  Mostrar próxima ejecución │
└────────────────────────────┘
```

### Diagrama de Secuencia

```
Cron         Scheduler          UseCase         CertRepo    NotifRepo   EmailService
 │               │                 │               │            │            │
 │─ trigger ────▶│                 │               │            │            │
 │               │                 │               │            │            │
 │               │─ execute() ────▶│               │            │            │
 │               │                 │               │            │            │
 │               │                 │─ findAll(WARNING) ───────▶│            │
 │               │                 │◀──────────────────────────│            │
 │               │                 │               │            │            │
 │               │                 │─ findAll(EXPIRED) ────────▶│            │
 │               │                 │◀──────────────────────────│            │
 │               │                 │               │            │            │
 │               │                 │─ findLastByCertificateId()─────────▶   │
 │               │                 │◀───────────────────────────────────│   │
 │               │                 │               │            │            │
 │               │                 │──────── sendAlert() ──────────────────▶│
 │               │                 │◀────────────────────────────────────────│
 │               │                 │               │            │            │
 │               │                 │─────── save(notification) ─────────▶   │
 │               │                 │◀───────────────────────────────────│   │
 │               │                 │               │            │            │
 │               │◀─ summary ──────│               │            │            │
 │               │                 │               │            │            │
 │               │─ log results    │               │            │            │
```

---

## 5. Configuración

### 5.1. Variables de Entorno

Agregar al archivo `.env`:

```dotenv
# SMTP Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
SMTP_FROM=noreply@sechttps.local
SYSTEM_NAME=SecHTTPS Monitor

# Notification Scheduler Configuration
CRON_EXPRESSION=0 8 * * *
TIMEZONE=Europe/Madrid
ENABLE_SCHEDULER=true
```

### 5.2. Configuración de SMTP

#### Gmail
1. Activar **verificación en 2 pasos** en tu cuenta de Google
2. Generar una **contraseña de aplicación**:
   - Ve a https://myaccount.google.com/apppasswords
   - Selecciona "Correo" y "Otro dispositivo"
   - Copia la contraseña generada
3. Usar en `.env`:
   ```dotenv
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=tu_email@gmail.com
   SMTP_PASSWORD=tu_contraseña_de_aplicacion
   ```

#### Microsoft 365 / Outlook
```dotenv
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu_email@outlook.com
SMTP_PASSWORD=tu_contraseña
```

#### SMTP Genérico
```dotenv
SMTP_HOST=smtp.tudominio.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noreply@tudominio.com
SMTP_PASSWORD=tu_contraseña_smtp
```

**Puerto 465 (SSL)**:
```dotenv
SMTP_PORT=465
SMTP_SECURE=true
```

### 5.3. Expresiones Cron

Sintaxis: `minuto hora día mes día_semana`

**Ejemplos comunes**:
```
0 8 * * *       → Cada día a las 8:00 AM
30 9 * * *      → Cada día a las 9:30 AM
0 */6 * * *     → Cada 6 horas
0 0 * * 1       → Cada lunes a medianoche
0 8 * * 1-5     → Lunes a Viernes a las 8:00 AM
```

**Herramienta útil**: https://crontab.guru/

### 5.4. Zonas Horarias

Valores comunes para `TIMEZONE`:
```
Europe/Madrid       → España (CET/CEST)
Europe/London       → Reino Unido (GMT/BST)
America/New_York    → Nueva York (EST/EDT)
America/Los_Angeles → California (PST/PDT)
UTC                 → Tiempo Universal
```

**Lista completa**: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones

---

## 6. Reglas de Negocio

### 6.1. Estados de Certificados y Notificaciones

| Estado | Condición | Acción | Tipo de Notificación |
|--------|-----------|--------|------------------------|
| **NORMAL** | Más de 7 días para expirar | Solo en creación | Creación (inmediata) |
| **WARNING** | 7 días o menos para expirar | Notificar cada 48 horas | Expiración (programada) |
| **EXPIRED** | Fecha de expiración superada | Notificar cada 24 horas | Expiración (programada) |

### 6.2. Notificaciones de Creación

#### Cuándo se envía
- **Inmediatamente** después de crear un certificado (POST /api/certif)
- **Independiente** del estado de expiración

#### Registro en BD
- Se guarda en `notifications` con:
  - `expirationStatusAtTime`: Estado actual del certificado (NORMAL, WARNING, EXPIRED)
  - `result`: SENT o ERROR
  - `errorMessage`: Mensaje de error si falló
- Se registra **SIEMPRE**, incluso si el envío falla
- Si falla el envío, la creación del certificado **NO se interrumpe**

#### Propósito
- Confirmar el registro en el sistema
- Informar a los responsables
- Dejar constancia de la comunicación inicial
- Auditoría completa desde el inicio

### 6.3. Frecuencia de Notificaciones de Expiración

#### WARNING (7 días o menos)
- **Frecuencia**: Cada **48 horas** (2 días)
- **Razón**: Balance entre informar y no saturar

**Ejemplo**:
```
Día 1 (7 días restantes): ✅ Enviar notificación
Día 2 (6 días restantes): ❌ No enviar (< 48h)
Día 3 (5 días restantes): ✅ Enviar notificación
Día 4 (4 días restantes): ❌ No enviar (< 48h)
```

#### EXPIRED (ya expiró)
- **Frecuencia**: Cada **24 horas** (1 día)
- **Razón**: Máxima urgencia, requiere acción inmediata

**Ejemplo**:
```
Día -1 (expiró ayer):  ✅ Enviar notificación
Día -2 (expiró hace 2): ✅ Enviar notificación
Día -3 (expiró hace 3): ✅ Enviar notificación
```

### 6.4. Certificados Excluidos de Notificaciones de Expiración

**NO se envían notificaciones de expiración para**:
- Certificados con `status = DELETED`
- Certificados con `expirationStatus = NORMAL` (por scheduler automático)

**Nota**: Las notificaciones de creación se envían para **todos** los certificados al ser creados, independientemente de su estado.

---

## 7. Formato de Emails

### 7.1. Email de Creación

**Asunto**:
```
✅ Nuevo Certificado Registrado: example.com.crt
```

**Contenido** (HTML + texto plano):
- ✅ Icono de éxito (verde)
- Información completa del certificado:
  - Archivo, servidor, cliente
  - Fechas de inicio y expiración
  - Días de validez
  - Rutas (filePath, configPath)
  - Estado (ACTIVE)
- Mensaje informativo sobre monitoreo automático
- Footer con timestamp

**Color de fondo**: Verde (#4caf50) - Indica operación exitosa

**Cuándo se envía**: Inmediatamente al crear el certificado

---

### 7.2. Email WARNING

**Asunto**:
```
⚠️ Alerta: Certificado example.com.crt expira en 5 día(s)
```

**Contenido** (HTML + texto plano):
- ⚠️ Icono de advertencia (naranja)
- Información completa del certificado
- Fecha de expiración destacada
- Mensaje de acción requerida
- Footer con timestamp

### 7.3. Email EXPIRED

**Asunto**:
```
⚠️ URGENTE: Certificado example.com.crt EXPIRADO
```

**Contenido** (HTML + texto plano):
- 🔴 Icono de error crítico (rojo)
- Información completa del certificado
- Mensaje de urgencia destacado
- Alerta de posible interrupción del servicio
- Footer con timestamp

**Color de fondo**: Rojo (#d32f2f) - Máxima urgencia

**Cuándo se envía**: Cada 24 horas mientras el certificado esté expirado

---

### 7.4. Destinatarios

Los emails se envían a todos los emails en el campo `responsibleEmails` del certificado:
```json
{
  "responsibleEmails": [
    "admin@empresa.com",
    "security@empresa.com",
    "devops@empresa.com"
  ]
}
```

---

## 8. Troubleshooting

### 8.1. El scheduler no inicia

**Síntoma**:
```
ℹ️ Notification scheduler is disabled (ENABLE_SCHEDULER=false)
```

**Solución**:
```dotenv
ENABLE_SCHEDULER=true
```

---

### 8.2. SMTP configuration is invalid

**Síntoma**:
```
⚠️ SMTP configuration is invalid. Scheduler will not be started.
⚠️ Please check your SMTP settings in .env file.
```

**Causas comunes**:
1. Variables SMTP faltantes
2. Credenciales incorrectas
3. Puerto bloqueado por firewall
4. Gmail sin contraseña de aplicación

**Solución**:
1. Verificar que existen: `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD`
2. Probar credenciales manualmente
3. Verificar puerto 587 o 465 abierto
4. Usar contraseña de aplicación en Gmail

---

### 8.3. Error al enviar emails

**Síntoma** (en logs):
```
❌ Error al enviar email para certificado cert-id-1: { Error: ... }
```

**Registro en base de datos**:
- Notificación guardada con `result = ERROR`
- `errorMessage` contiene detalles del error

**Causas comunes**:
1. **SMTP timeout**: Aumentar `connectionTimeout` en código
2. **Authentication failed**: Verificar credenciales
3. **Rate limit exceeded**: Reducir frecuencia o cambiar proveedor
4. **Network error**: Verificar conectividad

---

### 8.4. No se envían notificaciones

**Verificar**:

1. **¿Hay certificados WARNING/EXPIRED activos?**
   ```bash
   curl http://localhost:3000/api/certif?expirationStatus=WARNING
   ```

2. **¿Se ejecutó el cron?**
   - Verificar logs de consola
   - Buscar línea: `📧 Iniciando proceso de notificaciones`

3. **¿Ya se envió notificación recientemente?**
   ```bash
   curl http://localhost:3000/api/notif?certificateId=cert-id
   ```
   - Si última notificación < 48h (WARNING) o < 24h (EXPIRED), no se envía

4. **¿Scheduler habilitado?**
   ```bash
   ENABLE_SCHEDULER=true
   ```

---

### 8.5. Ejecutar proceso manualmente

Para testing o emergencias:

```typescript
// En consola Node.js o crear script temporal
import { SendCertificateNotificationsUseCase } from './domain/usecases/...';

const useCase = new SendCertificateNotificationsUseCase(...);
const result = await useCase.execute();
console.log(result);
```

O agregar endpoint temporal en la API:
```typescript
router.post('/api/admin/trigger-notifications', async (req, res) => {
  const summary = await notificationUseCase.execute();
  res.json(summary);
});
```

---

## 9. Testing

### 9.1. Tests Unitarios

**Ubicación**: `tests/unit/SendCertificateNotificationsUseCase.test.ts`

**Cobertura**:
- ✅ Envío a certificados sin notificaciones previas
- ✅ Respeto de frecuencia WARNING (48h)
- ✅ Respeto de frecuencia EXPIRED (24h)
- ✅ Registro de notificaciones ERROR
- ✅ Exclusión de certificados DELETED
- ✅ Caso sin certificados pendientes

**Ejecutar**:
```bash
npm run test:run -- SendCertificateNotificationsUseCase
```

### 9.2. Tests de Integración

**Ubicación**: `tests/integration/notifications.test.ts`

**Cobertura**:
- ✅ API `/api/notif` (creación y consulta de notificaciones)
- ✅ Integración con repositorios

**Ejecutar**:
```bash
npm run test:run -- notifications.test
```

### 9.3. Test Manual del Scheduler

1. **Configurar ejecución frecuente**:
   ```dotenv
   CRON_EXPRESSION=*/2 * * * *  # Cada 2 minutos
   ```

2. **Iniciar servidor**:
   ```bash
   npm run dev
   ```

3. **Observar logs**:
   ```
   ✅ Notification scheduler iniciado: */2 * * * * (Europe/Madrid)
   ⏰ Próxima ejecución: ...
   ```

4. **Esperar 2 minutos** y verificar ejecución

5. **Restaurar configuración**:
   ```dotenv
   CRON_EXPRESSION=0 8 * * *
   ```

### 9.4. Test de Email Real

#### A. Test de Notificación de Creación

1. **Configurar SMTP válido en `.env`**:
   ```dotenv
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=tu_email@gmail.com
   SMTP_PASSWORD=tu_contraseña_de_aplicacion
   ```

2. **Iniciar servidor**:
   ```bash
   npm run dev
   ```

3. **Crear certificado de prueba**:
   ```bash
   curl -X POST http://localhost:3000/api/certif \
     -H "Content-Type: application/json" \
     -d '{
       "fileName": "test-creation.crt",
       "startDate": "2026-01-01",
       "expirationDate": "2027-01-01",
       "server": "test-server",
       "filePath": "/etc/ssl/test.crt",
       "client": "Test Client",
       "configPath": "/etc/nginx/test",
       "responsibleEmails": ["tu_email@gmail.com"]
     }'
   ```

4. **Verificar**:
   - ✅ Email recibido con asunto: "✅ Nuevo Certificado Registrado: test-creation.crt"
   - ✅ Registro en BD:
     ```sql
     SELECT * FROM notifications 
     WHERE certificate_id = '{id_del_certificado}'
     AND expiration_status_at_time = 'NORMAL';
     ```

---

#### B. Test de Notificaciones de Expiración

1. **Configurar SMTP de desarrollo** (ej: Mailtrap.io):
   ```dotenv
   SMTP_HOST=smtp.mailtrap.io
   SMTP_PORT=2525
   SMTP_USER=your_mailtrap_user
   SMTP_PASSWORD=your_mailtrap_password
   ```

2. **Crear certificado de prueba**:
   ```bash
   curl -X POST http://localhost:3000/api/certif \
     -H "Content-Type: application/json" \
     -d '{
       "fileName": "test-warning.crt",
       "startDate": "2026-01-01",
       "expirationDate": "2026-02-18",
       "server": "test-server",
       "filePath": "/tmp/test.crt",
       "client": "Test Client",
       "configPath": "/tmp/nginx.conf",
       "responsibleEmails": ["tu_email@test.com"]
     }'
   ```

3. **Ejecutar scheduler manualmente** o esperar cron

4. **Verificar email** en bandeja de entrada (o Mailtrap)

---

## Resumen de Archivos Creados/Modificados

```
src/
  domain/
    services/
      IEmailService.ts                              ← Interface (puerto) - ACTUALIZADO
                                                       + sendCertificateCreationNotification()
    usecases/
      certificates/
        CreateCertificateUseCase.ts                 ← ACTUALIZADO
                                                       + Envío de email de creación
                                                       + Registro de notificación en BD
      notifications/
        SendCertificateNotificationsUseCase.ts      ← Lógica de negocio (expiración)

  infrastructure/
    messaging/
      NodemailerEmailService.ts                     ← Implementación SMTP - ACTUALIZADO
                                                       + sendCertificateCreationNotification()
                                                       + buildCreationHtmlContent()
                                                       + buildCreationTextContent()
    scheduling/
      NotificationSchedulerJob.ts                   ← Scheduler con node-cron
    
    transport/
      routes/
        certificateRoutes.ts                        ← ACTUALIZADO
                                                       + Inyección de INotificationRepository

tests/
  unit/
    SendCertificateNotificationsUseCase.test.ts     ← Tests unitarios - ACTUALIZADO
                                                       + Mock de sendCertificateCreationNotification()

docs/
  001_ApiDesign.md                                  ← ACTUALIZADO
                                                       + Documentación de notificaciones de creación
  005_NotificationSystem.md                         ← Este documento - ACTUALIZADO
```

---

## Tipos de Notificaciones Implementadas

| Tipo | Trigger | Estado en BD | Frecuencia | Email |
|------|---------|--------------|------------|-------|
| **Creación** | POST /api/certif | `expirationStatusAtTime` = NORMAL/WARNING/EXPIRED | Inmediata (1 vez) | ✅ Verde |
| **Expiración WARNING** | Scheduler (cron) | `expirationStatusAtTime` = WARNING | Cada 48 horas | ⚠️ Naranja |
| **Expiración EXPIRED** | Scheduler (cron) | `expirationStatusAtTime` = EXPIRED | Cada 24 horas | 🔴 Rojo |
      NodemailerEmailService.ts                     ← Implementación SMTP
    scheduling/
      NotificationSchedulerJob.ts                   ← Scheduler con node-cron

tests/
  unit/
    SendCertificateNotificationsUseCase.test.ts     ← Tests unitarios

docs/
  005_NotificationSystem.md                         ← Este documento
```

---

## Próximos Pasos

- [ ] Implementar templates personalizables (Handlebars)
- [ ] Agregar soporte para SMS (Twilio)
- [ ] Dashboard de notificaciones en frontend
- [ ] Webhooks para integraciones externas (Slack, Teams)
- [ ] Configurar notificaciones por cliente/servidor
- [ ] Retry automático de notificaciones fallidas
