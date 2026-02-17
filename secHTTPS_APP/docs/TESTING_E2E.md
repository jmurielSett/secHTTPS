# Playwright E2E Testing

## 🎭 Tests End-to-End con Playwright

Este proyecto usa **Playwright** para tests E2E (interfaz completa con Chromium).

### 📦 Instalación

```bash
npm install -D @playwright/test
npx playwright install chromium
```

### ▶️ Ejecutar Tests

```bash
# Ejecutar todos los tests E2E (headless)
npm run test:e2e

# Ver tests en UI interactiva
npm run test:e2e:ui

# Ejecutar con navegador visible
npm run test:e2e:headed

# Debug paso a paso
npm run test:e2e:debug

# Ver reporte HTML
npm run test:e2e:report
```

### 📁 Estructura

```
tests/
  ├── e2e/               # Tests E2E con Playwright
  │   └── example.spec.ts
  ├── integration/       # Tests de integración con Vitest
  └── unit/             # Tests unitarios con Vitest
```

### ✍️ Escribir Tests E2E

```typescript
import { test, expect } from '@playwright/test';

test('should display certificate filters', async ({ page }) => {
  // Navegar a la página
  await page.goto('/');
  
  // Login
  await page.fill('input[name="username"]', 'testuser');
  await page.fill('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  
  // Verificar que se muestran los filtros
  await expect(page.locator('.certificate-filters')).toBeVisible();
  
  // Aplicar filtro
  await page.fill('#filter-client', 'Acme');
  
  // Verificar resultado
  await expect(page.locator('.success')).toContainText('filtrados');
});
```

### 🎯 Diferencias con Vitest

| **Vitest** | **Playwright** |
|-----------|---------------|
| Tests unitarios e integración | Tests E2E (UI completa) |
| Mock de APIs | Servidor real corriendo |
| Rápido (~ms) | Más lento (~segundos) |
| Sin navegador | Con Chromium real |

### 🔧 Configuración

La configuración está en `playwright.config.ts` y automáticamente:
- Inicia `auth_APP` (puerto 4000)
- Inicia backend tRPC (puerto 3000)
- Inicia frontend React (puerto 5173)
- Ejecuta los tests
- Cierra los servicios

### 📊 Reportes

Después de ejecutar tests, abre el reporte HTML:
```bash
npm run test:e2e:report
```

Los videos y screenshots de fallos se guardan en `test-results/`.

### 🌐 Múltiples Navegadores

En `playwright.config.ts` puedes descomentar para probar en:
- ✅ Chromium (por defecto)
- Firefox
- WebKit (Safari)
- Mobile Chrome/Safari

### 🐛 Debug

Para debugear un test paso a paso:
```bash
npm run test:e2e:debug
```

Se abrirá el inspector de Playwright donde puedes:
- Ver cada paso
- Pausar/continuar
- Inspeccionar el DOM
- Ver el network
