# Sistema de Gestión de Certificados SSL/TLS

API REST para gestionar el ciclo de vida de certificados SSL/TLS con notificaciones multiidioma automáticas.

## 📋 Características

- ✅ **CRUD Completo** de certificados SSL/TLS
- ✅ **Monitoreo Automático** de expiración con 3 estados (NORMAL, WARNING, EXPIRED)
- ✅ **Notificaciones Multiidioma** por email (ES, EN, FR, DE)
- ✅ **Emails Individualizados** según idioma preferido de cada responsable
- ✅ **Sistema de Scheduler** para alertas automáticas
- ✅ **Persistencia Dual** (PostgreSQL o In-Memory)
- ✅ **Tests Completos** (58 tests - 100% pasando)
- ✅ **Código de Calidad** (SonarQube compliant)

## 🚀 Inicio Rápido

### Prerrequisitos

- Node.js 14+ (recomendado 18+)
- PostgreSQL 12+ (opcional, se puede usar in-memory)
- npm o yarn

### Instalación

```bash
# Clonar repositorio
git clone <repository-url>
cd secHTTPS

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tu configuración
```

### Configuración

Editar `.env` con tus valores:

```env
# Base de datos (opcional - por defecto usa InMemory)
USE_POSTGRES=false
DB_HOST=localhost
DB_PORT=5432
DB_NAME=certificates
DB_USER=postgres
DB_PASSWORD=postgres

# SMTP para envío de emails (opcional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu-email@gmail.com
SMTP_PASSWORD=tu-password

# Scheduler de notificaciones
ENABLE_SCHEDULER=true
CRON_EXPRESSION=0 8 * * *  # 8:00 AM diariamente

# Servidor
PORT=3000
```

### Ejecución

```bash
# Desarrollo con auto-reload
npm run dev

# Producción
npm run build
npm start

# Tests
npm test
npm test -- --run  # Una sola ejecución (CI)
npm test -- --coverage  # Con coverage

# Base de datos (si usas PostgreSQL)
npm run db:migrate  # Ejecutar migraciones
npm run db:reset    # Resetear base de datos
```

## 📚 Documentación

### Documentos Técnicos

- **[001_ApiDesign.md](docs/001_ApiDesign.md)** - Diseño completo de la API REST
  - Endpoints, modelos de datos, reglas de negocio
  - Sistema de notificaciones multiidioma
  - Códigos de respuesta y validaciones

- **[002_Testing.md](docs/002_Testing.md)** - Estrategia de testing
  - Configuración de Vitest
  - Tests unitarios e integración
  - Tests de localización multiidioma
  - Coverage y buenas prácticas

- **[003_Localization.md](docs/003_Localization.md)** - Sistema de localización
  - Arquitectura multiidioma
  - Templates JSON por idioma
  - Flujo de notificaciones personalizadas
  - Agregar nuevos idiomas

- **[004_CodeQuality.md](docs/004_CodeQuality.md)** - Calidad de código
  - Correcciones SonarQube aplicadas
  - Best practices TypeScript
  - Refactorings realizados
  - Checklist de code review

- **[openapi.yaml](docs/openapi.yaml)** - Especificación OpenAPI 3.0

## 🏗️ Arquitectura

### Estructura del Proyecto

```
secHTTPS/
├── src/
│   ├── domain/              # Lógica de negocio
│   │   ├── entities/        # Entidades del dominio
│   │   ├── repositories/    # Interfaces de repositorios
│   │   ├── services/        # Servicios de dominio
│   │   └── usecases/        # Casos de uso
│   ├── infrastructure/      # Implementaciones técnicas
│   │   ├── database/        # PostgreSQL, migraciones
│   │   ├── localization/    # Sistema multiidioma
│   │   ├── messaging/       # Envío de emails (Nodemailer)
│   │   ├── repositories/    # Repos PostgreSQL e InMemory
│   │   ├── scheduling/      # Cron job para notificaciones
│   │   └── transport/       # API REST (Express)
│   ├── types/               # Tipos TypeScript
│   ├── app.ts               # Configuración de Express
│   └── server.ts            # Punto de entrada
├── tests/                   # Tests de integración
├── docs/                    # Documentación técnica
└── package.json
```

### Capas de Arquitectura Hexagonal

```
┌─────────────────────────────────────────┐
│         API REST (Express)              │
│    /api/certif, /api/notif              │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│           USE CASES LAYER               │
│  CreateCertificateUseCase               │
│  SendCertificateNotificationsUseCase    │
│  Get/Update/Delete UseCases             │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│          DOMAIN SERVICES                │
│  CertificateExpirationService           │
│  LocalizationService                    │
│  EmailService                           │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│         REPOSITORIES LAYER              │
│  PostgreSQLRepository                   │
│  InMemoryRepository                     │
└─────────────────────────────────────────┘
```

## 🔑 API Endpoints

### Certificados

```http
GET    /api/certif                    # Listar certificados (con filtros)
POST   /api/certif                    # Crear certificado
GET    /api/certif/:id                # Obtener por ID
PUT    /api/certif/:id                # Actualizar certificado
PATCH  /api/certif/:id/status         # Cambiar estado a DELETED
GET    /api/certif/:id/notifications  # Notificaciones del certificado
```

### Notificaciones

```http
GET    /api/notif                     # Listar notificaciones (con filtros)
POST   /api/notif                     # Registrar notificación enviada
```

### Ejemplo de Creación de Certificado

```bash
curl -X POST http://localhost:3000/api/certif \
  -H "Content-Type: application/json" \
  -d '{
    "fileName": "example.com.crt",
    "startDate": "2026-01-01",
    "expirationDate": "2027-01-01",
    "server": "web-prod-01",
    "filePath": "/etc/ssl/certs/example.com.crt",
    "client": "Empresa XYZ",
    "configPath": "/etc/nginx/sites-available/example.com",
    "responsibleContacts": [
      {
        "email": "admin@empresa.com",
        "language": "es",
        "name": "Juan Pérez"
      },
      {
        "email": "devops@empresa.com",
        "language": "en"
      }
    ]
  }'
```

## 🌍 Sistema Multiidioma

### Idiomas Soportados

- 🇪🇸 **Español** (es) - Idioma por defecto
- 🇬🇧 **English** (en) - Internacional
- 🇫🇷 **Français** (fr) - Francia
- 🇩🇪 **Deutsch** (de) - Alemania

### Características de Localización

- ✅ **Emails individuales**: Cada contacto recibe su email en su idioma
- ✅ **Templates JSON**: Traducibles sin tocar código
- ✅ **3 tipos de emails**: Creación, Advertencia (WARNING), Expirado (EXPIRED)
- ✅ **Formato profesional**: HTML responsive con colores según severidad
- ✅ **Fallback automático**: Usa español si el idioma no está disponible

### Estructura de ResponsibleContact

```typescript
{
  email: "admin@empresa.com",   // Obligatorio
  language: "es",                // Obligatorio: es|en|fr|de
  name: "Juan Pérez"             // Opcional
}
```

## 📊 Testing

### Estadísticas

- **Test Files**: 6 archivos
- **Total Tests**: 58 tests
- **Estado**: ✅ 100% pasando
- **Tiempo**: ~1.3 segundos
- **Framework**: Vitest 4.0.18

### Ejecución de Tests

```bash
# Modo watch (desarrollo)
npm test

# Una sola ejecución
npm test -- --run

# Con coverage
npm test -- --coverage

# Con interfaz gráfica
npm run test:ui
```

### Distribución

```
✓ CertificateExpirationService    (9 tests)  - Estados de expiración
✓ SendNotificationsUseCase         (8 tests)  - Envío multiidioma
✓ API Certificates                 (28 tests) - Endpoints REST
✓ API Notifications                (8 tests)  - Endpoints REST
✓ CertificateValidator             (4 tests)  - Validaciones
✓ CertificateStatus                (1 test)   - Transformaciones
```

## 🛡️ Calidad de Código

### Métricas

- ✅ **SonarQube**: 14/17 problemas resueltos (82%)
- ✅ **TypeScript**: Strict mode activado
- ✅ **Cognitive Complexity**: < 15 por método
- ✅ **Target**: ES2021 (soporte replaceAll)

### Mejoras Aplicadas

- ✅ Propiedades `readonly` donde corresponde
- ✅ Uso de `replaceAll()` en lugar de `replace(/regex/g)`
- ✅ Ternarios anidados extraídos a if-else
- ✅ Condiciones negadas invertidas
- ✅ `Math.max()` en lugar de ternarios min/max
- ✅ Métodos helpers para reducir complejidad
- ✅ Error handling en todos los catch blocks

## 🔔 Sistema de Notificaciones

### Frecuencia de Envío

| Estado | Frecuencia | Descripción |
|--------|-----------|-------------|
| NORMAL | Solo creación | Email al registrar certificado |
| WARNING | Cada 2 días | ≤ 7 días para expirar |
| EXPIRED | Cada día | Certificado ya expirado |

### Scheduler

El sistema incluye un cron job que:
- ✅ Se ejecuta diariamente (configurable con `CRON_EXPRESSION`)
- ✅ Verifica certificados ACTIVE con WARNING o EXPIRED
- ✅ Envía emails individualizados por idioma
- ✅ Respeta frecuencias de envío
- ✅ Registra resultados en BD

### Activación/Desactivación

```env
# Activar scheduler (por defecto: true)
ENABLE_SCHEDULER=true

# Configurar horario (cron expression)
CRON_EXPRESSION=0 8 * * *  # 8:00 AM todos los días
```

## 🗄️ Base de Datos

### Modo In-Memory (Por Defecto)

```env
USE_POSTGRES=false
```

- ✅ Sin instalación de PostgreSQL
- ✅ Ideal para desarrollo y testing
- ✅ Datos volátiles (se pierden al reiniciar)

### Modo PostgreSQL

```env
USE_POSTGRES=true
DB_HOST=localhost
DB_PORT=5432
DB_NAME=certificates
DB_USER=postgres
DB_PASSWORD=postgres
```

```bash
# Ejecutar migraciones
npm run db:migrate

# Resetear base de datos
npm run db:reset
```

### Schema de Base de Datos

**Tablas principales**:
- `certificates`: Certificados SSL/TLS
- `certificate_responsible_emails`: Contactos responsables con idioma
- `notifications`: Historial de notificaciones enviadas
- `notification_recipient_emails`: Destinatarios por notificación
- `migrations`: Control de versiones del schema

## 🔧 Scripts Disponibles

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Servidor en modo desarrollo (auto-reload) |
| `npm start` | Servidor en modo producción |
| `npm run build` | Compilar TypeScript a JavaScript |
| `npm test` | Ejecutar tests en modo watch |
| `npm run db:migrate` | Ejecutar migraciones de BD |
| `npm run db:reset` | Resetear base de datos |

## 🤝 Contribuir

### Flujo de Trabajo

1. Fork del repositorio
2. Crear rama: `git checkout -b feature/nueva-funcionalidad`
3. Commit: `git commit -m 'feat: agregar nueva funcionalidad'`
4. Push: `git push origin feature/nueva-funcionalidad`
5. Pull Request

### Estándares de Código

- ✅ Tests deben pasar: `npm test -- --run`
- ✅ Sin errores de TypeScript: `npm run build`
- ✅ Seguir best practices de SonarQube
- ✅ Cognitive Complexity < 15
- ✅ Documentar funciones públicas con JSDoc

## 📜 Licencia

Este proyecto es de código abierto bajo licencia MIT.

## 📞 Soporte

Para preguntas o problemas:
- 📧 Email: support@example.com
- 📝 Issues: [GitHub Issues](https://github.com/user/repo/issues)
- 📚 Docs: [/docs](/docs)

---

**Desarrollado con ❤️ usando TypeScript, Express y Node.js**
