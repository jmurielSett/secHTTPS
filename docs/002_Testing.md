# Testing - Estrategia y Configuración

## 1. Objetivo
Asegurar la calidad del código mediante tests automatizados, utilizando Vitest como framework de testing para TypeScript.

## 2. Framework de Testing

### 2.1. Vitest
- **Framework seleccionado**: Vitest (v4.0.18)
- **Motivos**:
  - Compatible nativamente con TypeScript y ESM
  - Rápido y moderno, compatible con la API de Jest
  - Hot Module Replacement para tests
  - Interfaz UI integrada
  - Coverage integrado

### 2.2. Instalación
```bash
npm install --save-dev vitest
```

## 3. Scripts de Testing

### 3.1. Comandos Disponibles
```json
{
  "test": "vitest",                    // Ejecutar tests en modo watch
  "test:watch": "vitest --watch",      // Modo watch explícito
  "test:ui": "vitest --ui",            // Interfaz gráfica
  "test:coverage": "vitest --coverage" // Coverage report
}
```

### 3.2. Uso
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

## 4. Estructura de Tests

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

## 5. Tipos de Tests

### 5.1. Tests Unitarios
- **Objetivo**: Testear funciones y métodos aislados
- **Ubicación**: Junto al código fuente
- **Ejemplo**: Validadores, utilidades, servicios de negocio

### 5.2. Tests de Integración
- **Objetivo**: Testear la interacción entre módulos
- **Ubicación**: `/src/tests/integration/`
- **Ejemplo**: APIs, bases de datos, servicios externos

### 5.3. Tests E2E (Futuro)
- **Objetivo**: Testear flujos completos de usuario
- **Framework**: Por definir (Playwright, Cypress)
- **Ubicación**: `/e2e/`

## 6. Estrategia de Testing para la API

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

## 7. Matchers Comunes de Vitest

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

## 8. Mocking (Futuro)

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

## 9. Ejemplo Práctico

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

## 10. Buenas Prácticas

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

## 11. Integración Continua (Futuro)

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

## 12. Recursos

- [Documentación oficial de Vitest](https://vitest.dev/)
- [Guía de testing de JavaScript](https://javascript.info/testing)
- [Test-Driven Development (TDD)](https://martinfowler.com/bliki/TestDrivenDevelopment.html)
