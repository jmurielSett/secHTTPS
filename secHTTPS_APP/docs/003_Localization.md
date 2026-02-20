# Sistema de Localización Multiidioma

## 1. Objetivo
Proporcionar notificaciones por email en el idioma preferido de cada responsable de certificados, soportando múltiples idiomas de forma escalable y mantenible.

## 2. Arquitectura

### 2.1. Componentes Principales

```
┌─────────────────────────────────────────────────────────────┐
│                    USE CASES LAYER                          │
│  CreateCertificateUseCase / SendCertificateNotificationsUC  │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ├─> LocalizationService (obtener contenido)
                 ├─> EmailService (enviar email)
                 └─> NotificationRepository (registrar envío)

┌─────────────────────────────────────────────────────────────┐
│              LocalizationService                            │
│  - getEmailContent(template, certificate, language)         │
│  - loadTemplate(language, template)                         │
│  - replaceVariables(content, data)                          │
│  - generatePlainTextVersion(htmlContent)                    │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────────────────┐
│         JSON Template Files (por idioma)                    │
│  /templates/es/certificate_creation.json                    │
│  /templates/en/certificate_creation.json                    │
│  /templates/ca/certificate_creation.json                    │
│  ...                                                        │
└─────────────────────────────────────────────────────────────┘
```

### 2.2. Flujo de Notificación

```
1. Trigger (creación certificado / scheduler)
   ↓
2. Obtener lista de responsibleContacts del certificado
   ↓
3. Por cada contacto:
   a. LocalizationService.getEmailContent(
        template: 'CERTIFICATE_CREATION',
        certificate: {...},
        language: contacto.language  // 'es', 'en', 'ca'
      )
   b. Cargar template JSON desde /templates/{language}/{template}.json
   c. Reemplazar variables dinámicas ({{fileName}}, {{server}}, etc.)
   d. Generar versiones HTML y texto plano
   e. EmailService.sendEmail(
        to: contacto.email,
        subject: contenido.subject,
        htmlBody: contenido.htmlBody,
        textBody: contenido.textBody
      )
   f. Registrar resultado individual
   ↓
4. NotificationRepository.save(resumen global con todos los envíos)
```

## 3. Modelo de Datos

### 3.1. ResponsibleContact
```typescript
interface ResponsibleContact {
  email: string;        // Dirección email válida
  language: string;     // 'es' | 'en' | 'ca'
  name?: string;        // Nombre opcional del contacto
}
```

### 3.2. SupportedLanguage
```typescript
enum SupportedLanguage {
  ES = 'es',  // Español (España/Latinoamérica)
  EN = 'en',  // English (Internacional)
  CA = 'ca',  // Català
}
```

### 3.3. EmailTemplate
```typescript
enum EmailTemplate {
  CERTIFICATE_CREATION = 'certificate_creation',
  CERTIFICATE_WARNING = 'certificate_warning',
  CERTIFICATE_EXPIRED = 'certificate_expired',
}
```

### 3.4. EmailContent
```typescript
interface EmailContent {
  subject: string;    // Asunto localizado
  htmlBody: string;   // Cuerpo HTML con estilos
  textBody: string;   // Versión texto plano (fallback)
}
```

## 4. Templates JSON

### 4.1. Estructura Base
```json
{
  "subject": "✅ Nuevo Certificado Registrado: {{fileName}}",
  "greeting": "Hola",
  "intro": "Se ha registrado un nuevo certificado SSL/TLS en el sistema de monitoreo.",
  "certificateDetails": "Detalles del Certificado",
  "fileName": "Archivo",
  "server": "Servidor",
  "client": "Cliente",
  "startDate": "Fecha de inicio",
  "expirationDate": "Fecha de expiración",
  "status": "Estado",
  "daysUntilExpiration": "Días hasta expiración",
  "monitoring": "Este certificado será monitoreado automáticamente...",
  "footer": "Este es un mensaje automático del sistema de gestión de certificados SSL/TLS."
}
```

### 4.2. Variables Disponibles

**Variables globales** (disponibles en todos los templates):
- `{{fileName}}`: Nombre del archivo del certificado
- `{{server}}`: Nombre del servidor
- `{{client}}`: Nombre del cliente propietario
- `{{startDate}}`: Fecha de inicio (formato localizado)
- `{{expirationDate}}`: Fecha de expiración (formato localizado)
- `{{status}}`: Estado del certificado (ACTIVE/DELETED)
- `{{filePath}}`: Ruta del archivo en el servidor
- `{{configPath}}`: Ruta del archivo de configuración

**Variables específicas de WARNING/EXPIRED**:
- `{{daysUntilExpiration}}`: Días restantes hasta expiración (puede ser negativo si expirado)
- `{{action.title}}`: Título del bloque de acción (solo WARNING/EXPIRED)
- `{{action.message}}`: Mensaje de acción recomendada (solo WARNING/EXPIRED)

### 4.3. Ubicación de Templates

```
src/infrastructure/localization/templates/
├── es/
│   ├── certificate_creation.json
│   ├── certificate_warning.json
│   └── certificate_expired.json
├── en/
│   ├── certificate_creation.json
│   ├── certificate_warning.json
│   └── certificate_expired.json
├── fr/
│   ├── certificate_creation.json
│   ├── certificate_warning.json
│   └── certificate_expired.json
└── de/
    ├── certificate_creation.json
    ├── certificate_warning.json
    └── certificate_expired.json
```

## 5. Implementación: LocalizationService

### 5.1. Responsabilidades
- Cargar templates JSON según idioma y tipo de notificación
- Reemplazar variables dinámicas con datos del certificado
- Generar HTML estructurado y responsive
- Generar versión texto plano como fallback
- Manejar fallback a español si el idioma no está disponible

### 5.2. Métodos Públicos

```typescript
class LocalizationService implements ILocalizationService {
  /**
   * Obtiene contenido localizado del email
   * @param template Tipo de template (CREATION, WARNING, EXPIRED)
   * @param certificate Datos del certificado
   * @param language Idioma del destinatario
   * @returns Contenido localizado (subject, htmlBody, textBody)
   */
  getEmailContent(
    template: EmailTemplate,
    certificate: Certificate,
    language: SupportedLanguage
  ): EmailContent;
}
```

### 5.3. Características
- ✅ **Carga lazy de templates**: Los templates se cargan al inicializar el servicio
- ✅ **Formato HTML profesional**: Estilos inline, responsive, colores según severidad
- ✅ **Iconos visuales**: 📄 (creación), ⚠️ (warning), 🚨 (expired)
- ✅ **Colores según contexto**:
  - Verde (#4caf50): Notificaciones de creación
  - Amarillo (#ffc107): Advertencias (WARNING)
  - Naranja (#ff9800): Certificados expirados (EXPIRED)
- ✅ **Texto plano alternativo**: Para clientes de email que no soportan HTML
- ✅ **Fechas localizadas**: Formato según idioma del destinatario

## 6. Emails Individuales vs Masivos

### 6.1. ¿Por qué emails individuales?

**Decisión de diseño**: Cada contacto recibe su propio email (no CC/BCC masivo)

**Ventajas**:
- ✅ **Localización**: Cada destinatario recibe el email en su idioma preferido
- ✅ **Privacidad**: Los responsables no ven los emails de otros contactos
- ✅ **Personalización**: Posibilidad de personalizar contenido por contacto (campo `name`)
- ✅ **Auditabilidad**: Registro individual de éxitos/fallos por destinatario
- ✅ **Confiabilidad**: Si falla un envío, los demás continúan

**Desventajas**:
- ⚠️ **Más envíos SMTP**: Un envío por contacto (ej: 5 contactos = 5 emails)
- ⚠️ **Ligeramente más lento**: Bucle secuencial de envíos

### 6.2. Registro de Notificaciones

Aunque los emails se envían **individualmente**, se registra **una sola notificación en BD** con:
- `recipientEmails`: Array con TODOS los emails notificados
- `result`: `SENT` si al menos uno fue exitoso, `ERROR` si todos fallaron
- `errorMessage`: Resumen con conteo de éxitos/fallos y detalles de errores

**Ejemplo**:
```json
{
  "certificateId": "abc-123",
  "recipientEmails": ["admin@empresa.com", "devops@empresa.com", "manager@empresa.com"],
  "subject": "✅ Nuevo Certificado Registrado: example.com.crt",
  "result": "SENT",
  "errorMessage": "2/3 enviados. Errores: SMTP connection timeout for manager@empresa.com"
}
```

## 7. Agregar Soporte para Nuevo Idioma

### 7.1. Pasos

1. **Actualizar `SupportedLanguage` enum**:
```typescript
// src/domain/services/ILocalizationService.ts
export enum SupportedLanguage {
  ES = 'es',
  EN = 'en',
  FR = 'fr',
  DE = 'de',
  IT = 'it',  // ← Nuevo idioma
}
```

2. **Crear directorio de templates**:
```bash
mkdir src/infrastructure/localization/templates/it
```

3. **Traducir templates JSON**:
```bash
# Copiar templates de referencia
cp templates/en/certificate_creation.json templates/it/certificate_creation.json
cp templates/en/certificate_warning.json templates/it/certificate_warning.json
cp templates/en/certificate_expired.json templates/it/certificate_expired.json

# Traducir contenido manualmente o con herramienta de traducción
```

4. **No se requieren cambios en código**: El LocalizationService detecta automáticamente los nuevos templates

5. **Crear tests**:
```typescript
it('debería generar contenido en italiano si language=it', () => {
  const content = localizationService.getEmailContent(
    EmailTemplate.CERTIFICATE_CREATION,
    certificate,
    SupportedLanguage.IT
  );
  expect(content.subject).toContain('Nuovo Certificato');
});
```

## 8. Consideraciones de Rendimiento

### 8.1. Carga de Templates
- ✅ Templates cargados una sola vez al inicializar LocalizationService
- ✅ Almacenados en memoria (Map<string, any>)
- ✅ No hay I/O de archivos en cada notificación

### 8.2. Generación de HTML
- ⚠️ Se genera HTML dinámicamente por cada email individual
- ✅ Operaciones de string simple (replaceAll), no hay parseo complejo
- ✅ Tiempo de generación: < 1ms por email

### 8.3. Envío de Emails
- ⚠️ Bloqueante: Los emails se envían secuencialmente (await en bucle)
- 💡 **Optimización futura**: Usar `Promise.all()` para envíos paralelos
- ⚠️ Considerar rate limiting si hay muchos destinatarios

## 9. Validaciones

### 9.1. Validación de ResponsibleContacts

```typescript
// En CreateCertificateUseCase
private validateResponsibleContacts(contacts: ResponsibleContact[]): void {
  if (!Array.isArray(contacts) || contacts.length === 0) {
    throw new ValidationError(
      ErrorCode.INVALID_EMAIL_LIST,
      'La lista de contactos responsables debe contener al menos un contacto válido'
    );
  }
  
  for (const contact of contacts) {
    if (!contact.email || !contact.language) {
      throw new ValidationError(
        ErrorCode.INVALID_EMAIL_LIST,
        'Cada contacto debe tener email y language'
      );
    }
  }
}
```

### 9.2. Fallback de Idioma

Si se especifica un idioma no soportado, el sistema usa **español (es)** como fallback:

```typescript
private loadTemplate(language: SupportedLanguage, template: EmailTemplate): any {
  const key = `${language}_${template}`;
  
  if (this.templates.has(key)) {
    return this.templates.get(key);
  }
  
  // Fallback a español
  console.warn(`Template ${template} no encontrado para idioma ${language}, usando 'es'`);
  return this.templates.get(`es_${template}`);
}
```

## 10. Testing

### 10.1. Tests de LocalizationService

```typescript
describe('LocalizationService', () => {
  it('debería generar contenido en español si language=es', () => {
    const content = localizationService.getEmailContent(
      EmailTemplate.CERTIFICATE_CREATION,
      certificate,
      SupportedLanguage.ES
    );
    expect(content.subject).toContain('Nuevo Certificado Registrado');
  });

  it('debería generar contenido en inglés si language=en', () => {
    const content = localizationService.getEmailContent(
      EmailTemplate.CERTIFICATE_CREATION,
      certificate,
      SupportedLanguage.EN
    );
    expect(content.subject).toContain('New Certificate Registered');
  });
});
```

### 10.2. Tests de Integración

```typescript
it('debería enviar emails individuales en idiomas diferentes', async () => {
  const certificate = {
    responsibleContacts: [
      { email: 'admin@es.com', language: 'es' },
      { email: 'admin@en.com', language: 'en' }
    ],
    ...
  };

  await createCertificateUseCase.execute(certificate);

  // Verificar que se enviaron 2 emails con contenido diferente
  expect(mockEmailService.sendEmail).toHaveBeenCalledTimes(2);
  expect(mockEmailService.sendEmail.mock.calls[0][1]).toContain('Nuevo');
  expect(mockEmailService.sendEmail.mock.calls[1][1]).toContain('New');
});
```

## 11. Recursos

- Código: `/src/infrastructure/localization/LocalizationService.ts`
- Templates: `/src/infrastructure/localization/templates/`
- Interfaz: `/src/domain/services/ILocalizationService.ts`
- Tests: `/src/infrastructure/localization/LocalizationService.test.ts` (futuro)
