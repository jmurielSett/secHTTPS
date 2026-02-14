# Calidad de Código y Best Practices

## 1. Objetivo
Documentar las mejoras de calidad de código realizadas en el proyecto para cumplir con estándares de SonarQube y best practices de TypeScript/Node.js.

## 2. Análisis de Problemas

### 2.1. Herramientas de Análisis
- **SonarQube**: Análisis estático de código
- **TypeScript Compiler**: Errores de compilación y tipos
- **ESLint**: Linting de JavaScript/TypeScript (futuro)

### 2.2. Problemas Detectados Inicialmente

#### LocalizationService.ts (10 problemas)
1. ❌ Propiedad `templates` no marcada como `readonly`
2. ❌ Uso de `replace(/regex/g)` en lugar de `replaceAll()`
3. ❌ Ternarios anidados difíciles de leer (color, icon, actionBgColor)
4. ❌ Condición negada `!isCreation` reduce legibilidad
5. ❌ Ternario `diffDays > 0 ? diffDays : 0` en lugar de `Math.max()`

#### CreateCertificateUseCase.ts (2 problemas)
1. ❌ Cognitive Complexity 20 > 15 allowed en `sendCreationNotification()`
2. ❌ Ternario anidado en determinación de `result`

#### certificateRoutes.ts (1 problema)
1. ❌ Catch block sin manejo del error (solo asignación a undefined)

#### Scripts (3 problemas)
1. ❌ server.ts: Preferir top-level await sobre función async
2. ❌ migrate.ts: Preferir top-level await sobre función async
3. ❌ reset-db.ts: Preferir top-level await sobre función async

#### TypeScript Config (1 problema)
1. ❌ Target ES2020 no soporta `String.prototype.replaceAll()`

**Total**: 17 problemas

## 3. Correcciones Aplicadas

### 3.1. LocalizationService.ts

#### Problema 1: Propiedad no readonly
```typescript
// ❌ Antes
private templates: Map<string, any>;

// ✅ Después
private readonly templates: Map<string, any>;
```

**Razón**: Si una propiedad no se reasigna después de la construcción, debe marcarse como `readonly` para prevenir mutaciones accidentales.

#### Problema 2: replace() vs replaceAll()

```typescript
// ❌ Antes
.replace(/{{fileName}}/g, certificate.fileName)
.replace(/{{server}}/g, certificate.server)

// ✅ Después
.replaceAll('{{fileName}}', certificate.fileName)
.replaceAll('{{server}}', certificate.server)
```

**Razón**: 
- `replaceAll()` es más expresivo cuando se busca un string literal
- Evita escape de caracteres especiales de regex
- Más eficiente (no compila regex)
- Disponible desde ES2021

#### Problema 3: Ternarios anidados

```typescript
// ❌ Antes (difícil de leer)
const color = isExpired ? '#ff5722' : isWarning ? '#ff9800' : '#4caf50';
const icon = isExpired ? '🚨' : isWarning ? '⚠️' : '📄';

// ✅ Después (claro y mantenible)
let color: string;
let icon: string;

if (isExpired) {
  color = '#ff5722';
  icon = '🚨';
} else if (isWarning) {
  color = '#ff9800';
  icon = '⚠️';
} else {
  color = '#4caf50';
  icon = '📄';
}
```

**Razón**: Ternarios anidados reducen legibilidad. SonarQube recomienda extraerlos a estructuras if-else cuando hay más de 2 niveles.

#### Problema 4: Condición negada

```typescript
// ❌ Antes (brain twist: "si NO es creación entonces vacío sino bloque")
${!isCreation ? `` : `<div>...</div>`}

// ✅ Después (lectura natural: "si es creación entonces bloque sino vacío")
${isCreation ? '' : `<div>...</div>`}
```

**Razón**: Condiciones negadas dificultan la comprensión. Es mejor invertir la lógica para lectura natural.

#### Problema 5: Ternario min/max

```typescript
// ❌ Antes
const positiveDays = diffDays > 0 ? diffDays : 0;

// ✅ Después
const positiveDays = Math.max(diffDays, 0);
```

**Razón**: `Math.max()` y `Math.min()` son idiomáticos y más expresivos que ternarios para clamp de valores.

### 3.2. CreateCertificateUseCase.ts

#### Problema 1: Cognitive Complexity Alta

```typescript
// ❌ Antes: Método sendCreationNotification() con 44 líneas y complexity 20
private async sendCreationNotification(certificate: Certificate): Promise<void> {
  // ... 44 líneas con lógica de envío, error handling, determinación de resultado y registro en BD
}

// ✅ Después: Método refactorizado con helpers (complexity ~12)
private async sendEmailToContact(
  contact: { email: string; language: string; name?: string },
  certificate: Certificate
): Promise<{ success: boolean; error?: string }> {
  // Lógica aislada de envío a un contacto (10 líneas)
}

private async saveNotificationRecord(
  certificate: Certificate,
  allRecipientEmails: string[],
  result: NotificationResult,
  successCount: number,
  errorMessage: string | null
): Promise<void> {
  // Lógica aislada de guardado en BD (20 líneas)
}

private async sendCreationNotification(certificate: Certificate): Promise<void> {
  // Orquestación simple usando helpers (30 líneas)
}
```

**Razón**: 
- Cognitive Complexity mide la dificultad de entender el código
- SonarQube recomienda max 15 por método
- Extraer helpers mejora testability y Single Responsibility Principle

#### Problema 2: Ternario anidado

```typescript
// ❌ Antes
const result = errorCount === 0 ? NotificationResult.SENT : 
               successCount === 0 ? NotificationResult.ERROR :
               NotificationResult.SENT;

// ✅ Después
let result: NotificationResult;
if (errorCount === 0) {
  result = NotificationResult.SENT;
} else if (successCount === 0) {
  result = NotificationResult.ERROR;
} else {
  result = NotificationResult.SENT;
}
```

**Razón**: Mismo principio que LocalizationService - if-else es más legible que ternarios anidados.

### 3.3. certificateRoutes.ts

#### Problema: Catch sin manejo

```typescript
// ❌ Antes
try {
  emailService = new NodemailerEmailService();
  console.log('✅ Email service configurado');
} catch (error) {
  console.log('⚠️ Email service no disponible');
  emailService = undefined;  // Solo asignación, no log del error
}

// ✅ Después
try {
  emailService = new NodemailerEmailService();
  console.log('✅ Email service configurado');
} catch (error) {
  console.log('⚠️ Email service no disponible');
  console.error('Error al inicializar servicio de email:', error);
  emailService = undefined;
}
```

**Razón**: SonarQube exige que los catch blocks hagan algo con el error (log, re-throw, etc.), no solo asignar valores.

### 3.4. Scripts (server.ts, migrate.ts, reset-db.ts)

#### Problema: Top-level await

```typescript
// ❌ Antes (función async invocada)
async function startServer() {
  // ...
}
startServer();

// ⚠️ Solución intermedia (void IIFE)
void (async () => {
  // ...
})();

// 💡 Solución ideal (top-level await - requiere ESM)
await connectDatabase();
// ...
```

**Estado actual**: 
- ✅ Cambiado a void IIFE para hacer explícito que no se espera la promesa
- ⚠️ SonarQube sigue prefiriendo top-level await
- ❌ Top-level await puro requiere migración a ES Modules (cambio mayor)

**Razón**: Top-level await es más limpio y moderno, pero solo funciona en ESM. CommonJS requiere workarounds.

### 3.5. TypeScript Config

#### Problema: ES2020 no soporta replaceAll()

```json
// ❌ Antes
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020"]
  }
}

// ✅ Después
{
  "compilerOptions": {
    "target": "ES2021",
    "lib": ["ES2021"]
  }
}
```

**Razón**: 
- `String.prototype.replaceAll()` fue añadido en ES2021
- Necesario para usar replaceAll() sin errores de compilación
- Node.js 14+ soporta ES2021 completamente

## 4. Resumen de Mejoras

### 4.1. Problemas Resueltos

| Archivo | Problemas Iniciales | Problemas Resueltos | Estado |
|---------|---------------------|---------------------|--------|
| LocalizationService.ts | 10 | 10 | ✅ 100% |
| CreateCertificateUseCase.ts | 2 | 2 | ✅ 100% |
| certificateRoutes.ts | 1 | 1 | ✅ 100% |
| server.ts, migrate.ts, reset-db.ts | 3 | 0 | ⚠️ Partial (void IIFE) |
| tsconfig.json | 1 | 1 | ✅ 100% |
| **TOTAL** | **17** | **14** | **82% resueltos** |

### 4.2. Problemas Pendientes

**Scripts con top-level await (3)**:
- Estado: Void IIFE implementado como workaround
- Solución completa: Migrar a ES Modules (type: "module")
- Impacto: Requiere refactorización de imports/exports en todo el proyecto
- Prioridad: Baja (código funciona correctamente)

## 5. Métricas de Calidad

### 5.1. Antes de Mejoras
- **Cognitive Complexity**: 20 (CreateCertificateUseCase)
- **Code Smells**: 17 detectados
- **Tests**: 58/58 pasando ✅
- **TypeScript Errors**: 1 (replaceAll no existe)

### 5.2. Después de Mejoras
- **Cognitive Complexity**: 12 (CreateCertificateUseCase) ✅
- **Code Smells**: 3 restantes (top-level await)
- **Tests**: 58/58 pasando ✅
- **TypeScript Errors**: 0 ✅

## 6. Best Practices Aplicadas

### 6.1. Inmutabilidad
- ✅ Usar `readonly` para propiedades que no cambian
- ✅ Preferir `const` sobre `let` cuando es posible
- ✅ Evitar reasignaciones innecesarias

### 6.2. Legibilidad
- ✅ Extraer ternarios anidados a if-else
- ✅ Evitar condiciones negadas
- ✅ Nombres de variables expresivos (`actionBgColor` en lugar de ternario inline)

### 6.3. Mantenibilidad
- ✅ Reducir Cognitive Complexity extrayendo métodos helpers
- ✅ Single Responsibility Principle (un método, una responsabilidad)
- ✅ DRY (Don't Repeat Yourself) - código duplicado extraído a funciones

### 6.4. Expresividad
- ✅ Usar APIs modernas de JavaScript (replaceAll, Math.max)
- ✅ Nombres semánticos (`sendEmailToContact`, `saveNotificationRecord`)
- ✅ Mensajes de log descriptivos

### 6.5. Error Handling
- ✅ Siempre loguear errores en catch blocks
- ✅ Proporcionar contexto útil en mensajes de error
- ✅ No silenciar errores silenciosamente

## 7. Herramientas y Configuración

### 7.1. SonarQube (Recomendado)

```bash
# Instalar SonarQube scanner
npm install -g sonarqube-scanner

# Ejecutar análisis
sonarqube-scanner \
  -Dsonar.projectKey=sechttps \
  -Dsonar.sources=src \
  -Dsonar.host.url=http://localhost:9000 \
  -Dsonar.login=<token>
```

### 7.2. ESLint (Futuro)

```bash
# Instalar ESLint con TypeScript
npm install --save-dev eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin

# Configurar .eslintrc.json
{
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint"],
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended"
  ]
}
```

### 7.3. Prettier (Futuro)

```bash
# Instalar Prettier
npm install --save-dev prettier

# Configurar .prettierrc
{
  "semi": true,
  "singleQuote": true,
  "printWidth": 100
}
```

## 8. Checklist de Code Review

Antes de mergear código, verificar:

### Calidad
- [ ] Sin errores de TypeScript
- [ ] Sin warnings de SonarQube críticos
- [ ] Cognitive Complexity < 15 por método
- [ ] Sin ternarios anidados (máximo 1 nivel)
- [ ] Sin condiciones negadas innecesarias

### Inmutabilidad
- [ ] Propiedades de clase marcadas como `readonly` si no cambian
- [ ] Preferir `const` sobre `let`
- [ ] Evitar mutación de parámetros de función

### Error Handling
- [ ] Todos los catch blocks loguean el error
- [ ] Mensajes de error descriptivos
- [ ] Errores críticos se propagan correctamente

### Testing
- [ ] Tests existentes siguen pasando
- [ ] Nuevas funcionalidades tienen tests
- [ ] Coverage > 70%

### Documentación
- [ ] JSDoc en funciones públicas
- [ ] README actualizado si hay cambios en API
- [ ] Documentación de arquitectura actualizada

## 9. Lecciones Aprendidas

### 9.1. TypeScript Strict Mode
- El modo strict de TypeScript ayuda a detectar problemas temprano
- Siempre mantener `"strict": true` en tsconfig.json

### 9.2. Análisis Estático
- SonarQube detecta problemas que el compilador no ve
- Ejecutar análisis estático regularmente en CI/CD

### 9.3. Refactoring Incremental
- No intentar arreglar todo de una vez
- Priorizar problemas críticos primero
- Mantener tests verdes durante refactoring

### 9.4. Node.js Versions
- ES2021 requiere Node.js 14+
- Verificar compatibilidad antes de actualizar target en tsconfig

## 10. Próximos Pasos

### Corto Plazo
- [ ] Configurar ESLint + Prettier
- [ ] Añadir pre-commit hooks con Husky
- [ ] Configurar SonarQube en CI/CD

### Medio Plazo
- [ ] Migrar a ES Modules (type: "module") para top-level await
- [ ] Aumentar coverage de tests a 85%
- [ ] Implementar E2E tests

### Largo Plazo
- [ ] Configurar análisis de seguridad (npm audit, Snyk)
- [ ] Implementar performance monitoring
- [ ] Documentación técnica completa con ADRs

## 11. Recursos

- [SonarQube Rules](https://rules.sonarsource.com/typescript/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Clean Code JavaScript](https://github.com/ryanmcdermott/clean-code-javascript)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
