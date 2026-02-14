# Testing - Estrategia y Configuración

## 1. Objetivo
Asegurar la calidad del código mediante tests automatizados, utilizando Vitest como framework de testing para TypeScript.

## 2. Estrategia de Persistencia en Tests

### 2.1. Tests SIEMPRE usan InMemory

**Importante:** Los tests de integración SIEMPRE utilizan repositorios InMemory, **independientemente** de la variable de entorno `USE_POSTGRES`.

```typescript
// tests/integration/certificates.test.ts
beforeEach(async () => {
  app = await createApp();  // Sin parámetro = InMemory por defecto
});
```

### 2.2. ¿Por qué InMemory?

✅ **Velocidad:** 50 tests completos en ~1 segundo  
✅ **Sin dependencias:** No requiere PostgreSQL corriendo  
✅ **Aislamiento:** Cada test tiene su propia memoria limpia  
✅ **Confiabilidad:** Sin conflictos de datos entre tests  
✅ **Simplicidad:** No necesita setup/teardown de base de datos  
✅ **CI/CD:** Se ejecutan en cualquier ambiente sin configuración

### 2.3. ¿Cuándo se usa PostgreSQL?

La variable `USE_POSTGRES=true` SOLO afecta al servidor en desarrollo/producción:

```bash
# Servidor con PostgreSQL
USE_POSTGRES=true npm run dev

# Tests SIEMPRE InMemory (ignoran USE_POSTGRES)
npm test
```

### 2.4. Tests con PostgreSQL (NO recomendado)

Si necesitaras tests con base de datos real, tendrías que:

1. Modificar el código de los tests:
```typescript
beforeEach(async () => {
  const usePostgres = process.env.USE_POSTGRES === 'true';
  app = await createApp(usePostgres);
  // Limpiar tablas entre tests
});
```

2. Configurar:
- Base de datos de test separada
- Scripts de limpieza (DELETE o ROLLBACK)
- Setup/teardown global

**Recomendación:** Mantén los tests en InMemory. Son más rápidos, simples y confiables.

## 3. Framework de Testing

### 3.1. Vitest
- **Framework seleccionado**: Vitest (v4.0.18)
- **Motivos**:
  - Compatible nativamente con TypeScript y ESM
  - Rápido y moderno, compatible con la API de Jest
  - Hot Module Replacement para tests
  - Interfaz UI integrada
  - Coverage integrado

### 3.2. Instalación
```bash
npm install --save-dev vitest
```

## 4. Scripts de Testing

### 4.1. Comandos Disponibles
```json
{
  "test": "vitest",                    // Ejecutar tests en modo watch
  "test:watch": "vitest --watch",      // Modo watch explícito
  "test:ui": "vitest --ui",            // Interfaz gráfica
  "test:coverage": "vitest --coverage" // Coverage report
}
```

### 4.2. Uso
```bash
# Ejecutar tests en modo watch
npm test

# Ejecutar tests una vez (CI)
npm test -- --run

# Ejecutar con interfaz gráfica
npm run test:ui

# Generar reporte de coverage
npm run test:coverage
```

## 5. Estructura de Tests

### 4.1. Convención de Nombres
- Archivos de test: `*.test.ts` o `*.spec.ts`
- Ubicación: Junto al archivo que testean en `/src`
- Ejemplo: 
  - Código: `src/utils/math.ts`
  - Test: `src/utils/math.test.ts`

### 4.2. Estructura de un Test
```typescript
import { describe, it, expect } from 'vitest';
import { funcionATestear } from './modulo';

describe('Nombre del módulo o funcionalidad', () => {
  describe('nombreFuncion', () => {
    it('debería hacer X cuando Y', () => {
      // Arrange (Preparar)
      const input = 'valor';
      
      // Act (Actuar)
      const result = funcionATestear(input);
      
      // Assert (Verificar)
      expect(result).toBe('esperado');
    });
  });
});
```

## 6. Tipos de Tests

### 5.1. Tests Unitarios
- **Objetivo**: Testear funciones y métodos aislados
- **Ubicación**: Junto al código fuente en `/src`
- **Ejemplo**: Validadores, utilidades, servicios de negocio
- **Tests actuales**:
  - `CertificateExpirationService.test.ts`: Cálculo de estados de expiración
  - `CertificateValidator.test.ts`: Validación de datos de certificados
  - `CertificateStatus.test.ts`: Transformación de estados
  - `math.test.ts`: Utilidades matemáticas (ejemplo didáctico)

### 5.2. Tests de Integración
- **Objetivo**: Testear la interacción entre módulos y APIs
- **Ubicación**: `/tests/integration/` (futuro) o junto a código en `/src`
- **Ejemplo**: APIs REST, repositorios, flujos completos de casos de uso
- **Tests actuales**:
  - `certificates.test.ts`: Endpoints de API de certificados
  - `notifications.test.ts`: Endpoints de API de notificaciones
  - `SendCertificateNotificationsUseCase.test.ts`: Caso de uso de envío de notificaciones

### 5.3. Tests E2E (Futuro)
- **Objetivo**: Testear flujos completos de usuario
- **Framework**: Por definir (Playwright, Cypress)
- **Ubicación**: `/e2e/`

## 7. Estrategia de Testing para la API

### 6.1. Prioridades
1. **Lógica de negocio** (alta prioridad)
   - Cálculo de estado de expiración
   - Validaciones de certificados
   - Reglas de negocio (no modificar eliminados, etc.)

2. **Endpoints de API** (media prioridad)
   - Tests de integración con supertest
   - Validación de responses
   - Códigos de estado HTTP

3. **Utilidades y helpers** (baja prioridad)
   - Formateo de fechas
   - Parsers
   - Validadores genéricos

### 6.2. Coverage Objetivo
- **Meta inicial**: 70% de coverage
- **Meta a largo plazo**: 85% de coverage
- **Excluir de coverage**:
  - Archivos de configuración
  - Punto de entrada (server.ts)
  - Tipos y interfaces

## 8. Matchers Comunes de Vitest

### 7.1. Comparación
```typescript
expect(valor).toBe(5);              // Igualdad estricta (===)
expect(objeto).toEqual({a: 1});     // Igualdad profunda
expect(valor).toBeCloseTo(3.8, 1);  // Números decimales
expect(valor).toBeNull();           // null
expect(valor).toBeUndefined();      // undefined
expect(valor).toBeTruthy();         // truthy
expect(valor).toBeFalsy();          // falsy
```

### 7.2. Arrays y Objetos
```typescript
expect(array).toContain(item);           // Contiene elemento
expect(array).toHaveLength(3);           // Longitud
expect(objeto).toHaveProperty('key');    // Tiene propiedad
expect(array).toEqual(expect.arrayContaining([1, 2])); // Contiene subarreglo
```

### 7.3. Strings
```typescript
expect(string).toMatch(/regex/);         // Coincide con regex
expect(string).toContain('substring');   // Contiene substring
```

### 7.4. Excepciones
```typescript
expect(() => funcion()).toThrow();            // Lanza error
expect(() => funcion()).toThrow(ErrorType);   // Lanza error específico
expect(() => funcion()).toThrow('mensaje');   // Mensaje específico
```

## 9. Tests de Localización Multiidioma

### 8.1. Objetivo
Verificar que el sistema genera emails correctos en diferentes idiomas según el contacto responsable.

### 8.2. Estructura de Tests

```typescript
describe('LocalizationService', () => {
  describe('getEmailContent', () => {
    it('debería generar contenido en español para language=es', () => {
      const content = localizationService.getEmailContent(
        EmailTemplate.CERTIFICATE_CREATION,
        certificate,
        SupportedLanguage.ES
      );
      
      expect(content.subject).toContain('Nuevo Certificado Registrado');
      expect(content.htmlBody).toContain('Detalles del Certificado');
      expect(content.textBody).toContain('Servidor:');
    });

    it('debería generar contenido en inglés para language=en', () => {
      const content = localizationService.getEmailContent(
        EmailTemplate.CERTIFICATE_CREATION,
        certificate,
        SupportedLanguage.EN
      );
      
      expect(content.subject).toContain('New Certificate Registered');
      expect(content.htmlBody).toContain('Certificate Details');
      expect(content.textBody).toContain('Server:');
    });

    it('debería usar español como fallback si idioma no existe', () => {
      const content = localizationService.getEmailContent(
        EmailTemplate.CERTIFICATE_CREATION,
        certificate,
        'xx' as SupportedLanguage // Idioma no soportado
      );
      
      expect(content.subject).toContain('Nuevo Certificado'); // Español
    });
  });
});

describe('CreateCertificateUseCase - Multiidioma', () => {
  it('debería enviar emails individuales a diferentes idiomas', async () => {
    const certificate = {
      ...validCertificate,
      responsibleContacts: [
        { email: 'admin@es.com', language: 'es', name: 'Juan' },
        { email: 'admin@en.com', language: 'en', name: 'John' }
      ]
    };

    await createCertificateUseCase.execute(certificate);

    // Verificar que se enviaron 2 emails
    expect(mockEmailService.sendEmail).toHaveBeenCalledTimes(2);
    
    // Verificar contenido en español
    const [emailEs] = mockEmailService.sendEmail.mock.calls[0];
    expect(emailEs).toBe('admin@es.com');
    expect(mockEmailService.sendEmail.mock.calls[0][1]).toContain('Nuevo');
    
    // Verificar contenido en inglés
    const [emailEn] = mockEmailService.sendEmail.mock.calls[1];
    expect(emailEn).toBe('admin@en.com');
    expect(mockEmailService.sendEmail.mock.calls[1][1]).toContain('New');
  });
});
```

### 8.3. Casos de Prueba Críticos

**Localización básica**:
- ✅ Generar contenido en cada idioma soportado (es, en, fr, de)
- ✅ Verificar asunto, cuerpo HTML y texto plano
- ✅ Fallback a español si idioma no existe

**Templates diferentes**:
- ✅ CERTIFICATE_CREATION: Mensaje de creación
- ✅ CERTIFICATE_WARNING: Advertencia de expiración próxima
- ✅ CERTIFICATE_EXPIRED: Certificado expirado

**Reemplazo de variables**:
- ✅ Variables globales: {{fileName}}, {{server}}, {{client}}, etc.
- ✅ Variables de expiración: {{daysUntilExpiration}}
- ✅ Formato de fechas según idioma

**Envío individual**:
- ✅ Un email por contacto (no CC/BCC masivo)
- ✅ Cada email en el idioma del contacto
- ✅ Registro de notificación con todos los destinatarios

**Error handling**:
- ✅ Si falla un envío, continúan los demás
- ✅ Notificación en BD registra éxitos y fallos
- ✅ ErrorMessage con detalles de fallos

## 10. Estadísticas Actuales

### 9.1. Coverage de Tests (Actualizado)
- **Test Files**: 6 archivos
- **Total Tests**: 58 tests
- **Estado**: ✅ 58/58 pasando (100%)
- **Tiempo de ejecución**: ~1.3 segundos

### 9.2. Distribución de Tests
```
✓ CertificateExpirationService.test.ts     (9 tests)  - Cálculo de estados
✓ SendCertificateNotificationsUseCase.test.ts (8 tests) - Envío notificaciones
✓ certificates.test.ts                     (28 tests) - API certificados
✓ notifications.test.ts                    (8 tests)  - API notificaciones
✓ CertificateValidator.test.ts             (4 tests)  - Validaciones
✓ CertificateStatus.test.ts                (1 test)   - Transformaciones
```

### 9.3. Áreas con Mayor Cobertura
- ✅ **API REST**: 36 tests de integración (endpoints completos)
- ✅ **Lógica de negocio**: 17 tests unitarios (servicios, validadores)
- ✅ **Casos de uso**: 8 tests (notificaciones multiidioma)

## 11. Mocking

### 8.1. Dependencias Externas
- Base de datos: Usar mocks o DB in-memory
- APIs externas: Mock con `vi.fn()` o MSW (Mock Service Worker)
- Sistema de archivos: Mock con `vi.mock('fs')`

### 8.2. Ejemplo de Mock
```typescript
import { vi } from 'vitest';

const mockFunction = vi.fn();
mockFunction.mockReturnValue('valor');
mockFunction.mockResolvedValue('promesa');
```

## 10. Ejemplo Práctico

### 9.1. Código: math.ts
```typescript
export function suma(a: number, b: number): number {
  return a + b;
}
```

### 9.2. Test: math.test.ts
```typescript
import { describe, it, expect } from 'vitest';
import { suma } from './math';

describe('Math Utils', () => {
  describe('suma', () => {
    it('debería sumar dos números positivos correctamente', () => {
      expect(suma(2, 3)).toBe(5);
    });

    it('debería sumar números negativos correctamente', () => {
      expect(suma(-2, -3)).toBe(-5);
    });

    it('debería manejar el cero correctamente', () => {
      expect(suma(5, 0)).toBe(5);
    });
  });
});
```

## 11. Buenas Prácticas

### 10.1. Nombres de Tests
- ✅ Descriptivos: "debería retornar error cuando el certificado está eliminado"
- ❌ Vagos: "test1", "funciona"

### 10.2. Tests Independientes
- Cada test debe poder ejecutarse de forma aislada
- No depender del orden de ejecución
- Limpiar estado después de cada test

### 10.3. Arrange-Act-Assert
```typescript
it('debería hacer X', () => {
  // Arrange: Preparar datos
  const input = crearDatos();
  
  // Act: Ejecutar acción
  const result = funcion(input);
  
  // Assert: Verificar resultado
  expect(result).toBe(esperado);
});
```

### 10.4. Un Test, Un Concepto
- Cada test debe verificar una sola cosa
- Si falla, debe ser claro qué falló

### 10.5. Tests Legibles
- Preferir claridad sobre brevedad
- Los tests son documentación viva del código

## 12. Integración Continua (Futuro)

### 11.1. GitHub Actions
```yaml
- name: Run tests
  run: npm test -- --run --coverage
```

### 11.2. Pre-commit Hook
```json
"husky": {
  "hooks": {
    "pre-commit": "npm test -- --run"
  }
}
```

## 13. Recursos

- [Documentación oficial de Vitest](https://vitest.dev/)
- [Guía de testing de JavaScript](https://javascript.info/testing)
- [Test-Driven Development (TDD)](https://martinfowler.com/bliki/TestDrivenDevelopment.html)
