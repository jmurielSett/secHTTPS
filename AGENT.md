# AGENT.md - Guía para Asistentes IA

## Propósito
Este documento sirve como punto de entrada para asistentes de IA que trabajen en este proyecto. Contiene referencias a toda la documentación técnica y decisiones de diseño que deben consultarse antes de implementar nuevas funcionalidades.

## 📋 Índice de Documentación

### Diseño y Arquitectura
Los documentos de diseño están numerados secuencialmente con 3 dígitos (`001`, `002`, `003`) seguidos de guión bajo y nombre en PascalCase. Se encuentran en la carpeta `/docs/`.

**Convención**: `NNN_NombreDescriptivo.md` donde NNN es el número de 3 dígitos.

#### [001_ApiDesign.md](./docs/001_ApiDesign.md)
- **Tema**: Diseño de la API REST de Gestión de Certificados SSL/TLS
- **Contenido**:
  - Modelo de datos de Certificados y Notificaciones
  - Endpoints y sus especificaciones
  - Reglas de negocio
  - Sistema de notificaciones por email (creación y expiración)
  - Validaciones y códigos de respuesta HTTP
- **Cuándo consultarlo**: Antes de implementar cualquier endpoint, modelo o lógica de negocio relacionada con certificados

#### [002_Testing.md](./docs/002_Testing.md)
- **Tema**: Estrategia de testing y configuración de Vitest
- **Contenido**:
  - Configuración de Vitest
  - Scripts de testing disponibles
  - Estructura y convenciones de tests
  - Buenas prácticas
  - Ejemplos de tests unitarios e integración
- **Cuándo consultarlo**: Antes de escribir tests o modificar la estrategia de testing

#### [003_DatabaseImplementation.md](./docs/003_DatabaseImplementation.md)
- **Tema**: Implementación de base de datos PostgreSQL
- **Contenido**:
  - Esquema de base de datos
  - Sistema de migraciones
  - Configuración de conexión
  - Repositorios PostgreSQL
- **Cuándo consultarlo**: Antes de modificar el esquema de BD o crear nuevas migraciones

#### [004_EnvironmentConfiguration.md](./docs/004_EnvironmentConfiguration.md)
- **Tema**: Configuración de variables de entorno
- **Contenido**:
  - Variables de entorno disponibles
  - Configuración de PostgreSQL
  - Configuración de SMTP
  - Configuración del scheduler
- **Cuándo consultarlo**: Antes de agregar nuevas variables de configuración

#### [005_NotificationSystem.md](./docs/005_NotificationSystem.md)
- **Tema**: Sistema de notificaciones automáticas por email
- **Contenido**:
  - Arquitectura del sistema de notificaciones
  - Flujo de creación de certificados con email inmediato
  - Flujo de notificaciones de expiración programadas (cron)
  - Configuración de SMTP (Gmail, Outlook, genérico)
  - Reglas de frecuencia (WARNING: 48h, EXPIRED: 24h)
  - Formato de emails (creación, warning, expired)
  - Troubleshooting y testing
- **Cuándo consultarlo**: Antes de modificar el sistema de notificaciones, cambiar emails, o configurar SMTP

## 🛠️ Stack Tecnológico

### Backend
- **Runtime**: Node.js
- **Lenguaje**: TypeScript
- **Framework Web**: Express 5.x
- **Testing**: Vitest 4.x

### Herramientas de Desarrollo
- **Compilador TypeScript**: tsc
- **Ejecución en desarrollo**: tsx
- **Package Manager**: npm

## 📁 Estructura del Proyecto

### Clean Architecture - Separación por Capas

El proyecto sigue una **arquitectura limpia** (Clean Architecture) con separación clara de responsabilidades:

```
src/
├── app.ts                    # Factory function: createApp() retorna Application
├── server.ts                 # Punto de entrada: startServer() async
│
├── domain/                   # Capa de Dominio (Lógica de Negocio)
│   ├── services/            # Interfaces de servicios (puertos)
│   │   ├── CertificateExpirationService.ts  # Cálculo de estados
│   │   └── IEmailService.ts                 # Interface para envío de emails
│   │
│   └── usecases/            # Casos de uso (Application Services)
│       ├── certificates/    # Casos de uso de certificados
│       │   ├── CreateCertificateUseCase.ts         # + Envío email creación
│       │   ├── GetCertificatesUseCase.ts
│       │   ├── GetCertificateByIdUseCase.ts
│       │   ├── UpdateCertificateUseCase.ts
│       │   └── UpdateCertificateStatusUseCase.ts
│       │
│       └── notifications/   # Casos de uso de notificaciones
│           ├── CreateNotificationUseCase.ts
│           ├── GetNotificationsUseCase.ts
│           ├── GetCertificateNotificationsUseCase.ts
│           └── SendCertificateNotificationsUseCase.ts  # Proceso automático
│
├── infrastructure/           # Capa de Infraestructura
│   ├── messaging/           # Servicios de mensajería
│   │   └── NodemailerEmailService.ts  # Implementación SMTP (IEmailService)
│   │
│   ├── scheduling/          # Programación de tareas
│   │   └── NotificationSchedulerJob.ts  # Cron para notificaciones
│   │
│   ├── persistence/         # Repositorios (acceso a datos)
│   │   ├── CertificateRepository.ts          # Interfaz + Implementaciones
│   │   ├── InMemoryCertificateRepository.ts
│   │   ├── PostgresCertificateRepository.ts
│   │   ├── NotificationRepository.ts         # Interfaz + Implementaciones
│   │   ├── InMemoryNotificationRepository.ts
│   │   └── PostgresNotificationRepository.ts
│   │
│   ├── database/            # Configuración de base de datos
│   │   ├── connection.ts    # Pool de conexiones
│   │   ├── migrator.ts      # Ejecutor de migraciones
│   │   └── migrations/      # Scripts SQL de migraciones
│   │
│   └── transport/           # Capa HTTP (Express)
│       ├── controllers/     # Controladores HTTP
│       │   ├── CertificateController.ts
│       │   └── NotificationController.ts
│       └── routes/          # Definición de rutas
│           ├── certificateRoutes.ts   # Factory: createCertificateRouter()
│           └── notificationRoutes.ts  # Factory: createNotificationRouter()
│
├── middleware/              # Middlewares de Express
│   ├── requestLogger.ts
│   ├── errorHandler.ts
│   └── auth.ts
│
├── types/                   # Tipos TypeScript compartidos
│   ├── certificate.ts       # Interface Certificate, DTOs
│   └── notification.ts
│
├── utils/                   # Utilidades y helpers
│   └── CertificateStatus.ts
│
└── tests/                   # Tests (separados del código)
    ├── integration/         # Tests de integración
    │   ├── certificates.test.ts
    │   └── notifications.test.ts
    │
    └── unit/                # Tests unitarios
        ├── math.test.ts
        ├── CertificateStatus.test.ts
        ├── CertificateValidator.test.ts
        └── SendCertificateNotificationsUseCase.test.ts
```

### Principios de la Arquitectura

#### 1. **app.ts** - Factory Pattern
```typescript
export function createApp(usePostgreSQL: boolean = false): Application {
  const app = express();
  
  // Middleware
  app.use(requestLogger);
  app.use(express.json());
  
  // Create repository (dependency injection)
  const repository = usePostgreSQL 
    ? new PostgreSQLCertificateRepository()
    : new InMemoryCertificateRepository();
    
  // Register routes
  app.use('/api/certif', createCertificateRouter(repository));
  
  return app;
}
```

#### 2. **server.ts** - Startup
```typescript
import { createApp } from './app';

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    const app = createApp(USE_POSTGRESQL);
    
    // Inicializaciones async (DB connection, etc.)
    await repository.connect();
    
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start:', error);
    process.exit(1);
  }
}

startServer();
```

#### 3. **Routes** - Factory con Dependency Injection
```typescript
export function createCertificateRouter(repository: IRepository): Router {
  const router = Router();
  
  // Create use cases with repository
  const createUseCase = new CreateCertificateUseCase(repository);
  const getUseCase = new GetCertificatesUseCase(repository);
  
  // Create controller with use cases
  const controller = new CertificateController(createUseCase, getUseCase);
  
  // Register routes
  router.post('/', (req, res) => controller.create(req, res));
  router.get('/', (req, res) => controller.getAll(req, res));
  
  return router;
}
```

#### 4. **Controllers** - Manejo de HTTP
```typescript
export class CertificateController {
  constructor(
    private createUseCase: CreateCertificateUseCase,
    private getUseCase: GetCertificatesUseCase
  ) {}

  async create(req: Request, res: Response): Promise<void> {
    try {
      const cert = await this.createUseCase.execute(req.body);
      res.status(201).json(cert);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
}
```

#### 5. **Use Cases** - Lógica de Negocio
```typescript
export class CreateCertificateUseCase {
  constructor(private repository: IRepository) {}

  async execute(data: CreateDTO): Promise<Certificate> {
    this.validate(data);
    
    const cert: Certificate = {
      id: randomUUID(),
      ...data,
      status: 'ACTIVE',
      expirationStatus: this.calculateStatus(data.expirationDate),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return await this.repository.save(cert);
  }
  
  private validate(data: CreateDTO): void {
    if (!data.fileName) throw new Error('fileName required');
    // más validaciones...
  }
}
```

#### 6. **Repository** - Abstracción de Datos
```typescript
export interface IRepository {
  connect(): Promise<void>;
  save(cert: Certificate): Promise<Certificate>;
  findById(id: string): Promise<Certificate | null>;
  findAll(filters?: Filters): Promise<Certificate[]>;
  update(cert: Certificate): Promise<Certificate>;
  delete(id: string): Promise<void>;
}

export class InMemoryRepository implements IRepository {
  private certs = new Map<string, Certificate>();
  
  async save(cert: Certificate): Promise<Certificate> {
    this.certs.set(cert.id, cert);
    return cert;
  }
  // más métodos...
}
```

### Flujo de una Request

```
HTTP Request
    ↓
[Route] createCertificateRouter()
    ↓
[Controller] CertificateController.create()
    ↓
[Use Case] CreateCertificateUseCase.execute()
    ↓
[Repository] IRepository.save()
    ↓
[Database] PostgreSQL / In-Memory
    ↓
HTTP Response
```

### Ventajas de Esta Arquitectura

1. **Testabilidad**: Puedes testear use cases sin levantar servidor HTTP
2. **Dependency Injection**: Los repositorios se inyectan, fácil cambiar implementación
3. **Separación de Concerns**: HTTP, lógica de negocio y datos están separados
4. **Escalabilidad**: Fácil agregar nuevos casos de uso o cambiar persistencia
5. **Reutilización**: `createApp()` sirve para tests, serverless, multiple servers, etc.

### Estructura de Carpetas (Anterior - Legacy)

```
secHTTPS/
├── docs/               # Documentación técnica y diseño
│   ├── 001_ApiDesign.md    # Diseño API (puede existir como 001_api-design.md)
│   ├── 002_Testing.md      # Testing (puede existir como 0002-testing.md)
│   ├── OpenApi.yaml        # Especificación (puede existir como openapi.yaml)
│   └── AGENT.md            # Este archivo (en raíz)
├── src/               # Código fuente (archivos en PascalCase)
│   ├── server.ts      # Punto de entrada del servidor
│   └── utils/         # Utilidades y helpers
├── dist/              # Código compilado (generado)
├── tsconfig.json      # Configuración TypeScript
└── package.json       # Dependencias y scripts
```

**Nota**: Migrar gradualmente de la estructura legacy a Clean Architecture.

## 🚀 Scripts Disponibles

```bash
# Desarrollo
npm run dev            # Ejecutar servidor en modo desarrollo con hot-reload

# Build y Producción
npm run build          # Compilar TypeScript a JavaScript
npm start              # Ejecutar versión compilada

# Testing
npm test               # Ejecutar tests en modo watch
npm test -- --run      # Ejecutar tests una vez (CI)
npm run test:ui        # Abrir interfaz gráfica de tests
npm run test:coverage  # Generar reporte de coverage
```

## 🎯 Flujo de Trabajo Recomendado

### Al Implementar Nueva Funcionalidad
1. **Consultar documentación relevante** en `/docs/`
2. **Verificar que no exista** similar funcionalidad
3. **Escribir el test primero** (TDD recomendado)
4. **Implementar la funcionalidad**
5. **Ejecutar tests**: `npm test -- --run`
6. **Actualizar/crear documentación** si es necesario

### Al Modificar Funcionalidad Existente
1. **Leer el código actual** y sus tests
2. **Consultar el diseño original** en los docs
3. **Actualizar tests** si es necesario
4. **Realizar cambios**
5. **Verificar que todos los tests pasen**
6. **Actualizar documentación** si cambian contratos o comportamiento

### Al Agregar Nuevo Design Doc
1. **Crear archivo**: `docs/NNN_NombreDescriptivo.md` (con 3 dígitos y PascalCase)
2. **Seguir estructura**: Objetivo, Contenido, Ejemplos
3. **Actualizar este AGENT.md** añadiendo entrada en el índice
4. **Mantener numeración secuencial** (001, 002, 003...)

## 📝 Convenciones de Código

### TypeScript
- Usar tipos explícitos cuando mejore la claridad
- Interfaces para contratos públicos
- Usar `async/await` en lugar de callbacks o `.then()`

### Naming
- **Archivos de código**: PascalCase (`UserService.ts`, `CertificateModel.ts`)
- **Archivos de docs**: Numeración 3 dígitos + `_` + PascalCase (`001_ApiDesign.md`, `002_Testing.md`)
- **Archivos de configuración**: kebab-case o como está establecido (`tsconfig.json`, `package.json`)
- **Clases**: PascalCase (`UserService`)
- **Funciones/Variables**: camelCase (`getUserById`)
- **Constantes**: SCREAMING_SNAKE_CASE (`MAX_RETRIES`)
- **Interfaces**: PascalCase, sin prefijo I (`User`, no `IUser`)

### Tests
- **Archivos**: `*.test.ts` junto al código que testean (con PascalCase si el archivo base lo usa)
- **Describe**: Nombre del módulo o clase
- **It**: Frase descriptiva que empiece con "debería"
- Patrón **Arrange-Act-Assert**

## 🔒 Reglas de Negocio Críticas

Estas reglas están documentadas en [001_ApiDesign.md](./docs/001_ApiDesign.md) pero se resaltan aquí por su importancia:

1. **Certificados eliminados NO pueden modificarse**
2. **Estado de expiración es calculado automáticamente**:
   - NORMAL: > 7 días
   - WARNING: ≤ 7 días
   - EXPIRED: fecha caducidad superada
3. **Notificaciones de email**:
   - WARNING: cada 2 días
   - EXPIRED: cada día
   - NO enviar a certificados DELETED
4. **Eliminación lógica**: Nunca eliminar físicamente certificados

**Enums en inglés**: Todos los estados del sistema usan nomenclatura en inglés:
- Estados de certificado: `ACTIVE`, `DELETED`
- Estados de expiración: `NORMAL`, `WARNING`, `EXPIRED`
- Resultados de notificación: `SENT`, `ERROR`

## 🔄 Versionado de Documentación

- Los documentos de diseño se numeran secuencialmente con 3 dígitos: `001`, `002`, `003`...
- Formato: `NNN_NombreDescriptivo.md` (ej: `001_ApiDesign.md`, `002_Testing.md`)
- NO modificar números existentes
- Al deprecar un documento, añadir nota al inicio con referencia al nuevo
- Mantener historial en git

**Ejemplo de nuevo documento**: `003_Authentication.md`

## 📚 Referencias Externas

- [Express Documentation](https://expressjs.com/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vitest Documentation](https://vitest.dev/)
- [OpenAPI Specification](https://swagger.io/specification/)

## 🤖 Notas para IA

### Antes de Implementar
- **SIEMPRE** leer los documentos relevantes en `/docs/`
- Verificar coherencia con diseños existentes
- Seguir convenciones establecidas
- No asumir; consultar documentación

### Al Generar Código
- Incluir tipos TypeScript completos
- Escribir tests junto al código
- Documentar funciones públicas con JSDoc
- Seguir estructura de carpetas establecida

### Al Documentar
- Usar formato `NNN_NombreDescriptivo.md` para design docs
- Ser conciso pero completo
- Incluir ejemplos prácticos
- Mantener formato consistente con docs existentes
- Actualizar este AGENT.md si creas nuevo design doc

---

**Última actualización**: 2026-02-08
**Versión**: 1.0
