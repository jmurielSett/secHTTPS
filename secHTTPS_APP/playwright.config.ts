import { defineConfig, devices } from '@playwright/test';

/**
 * Configuración de Playwright para tests E2E
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/e2e',
  
  /* Ejecutar tests en paralelo */
  fullyParallel: true,
  
  /* Fallar CI si dejaste test.only */
  forbidOnly: !!process.env.CI,
  
  /* Reintentar en CI */
  retries: process.env.CI ? 2 : 0,
  
  /* Paralelismo */
  workers: process.env.CI ? 1 : undefined,
  
  /* Reporter */
  reporter: 'html',
  
  /* Opciones compartidas para todos los tests */
  use: {
    /* URL base para usar en tests: page.goto('/') */
    baseURL: 'http://localhost:5173',
    
    /* Capturar screenshot en fallos */
    screenshot: 'only-on-failure',
    
    /* Capturar video en fallos */
    video: 'retain-on-failure',
    
    /* Trace para debugging */
    trace: 'on-first-retry',
  },

  /* Configurar proyectos para múltiples navegadores */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    // Descomentar para probar en más navegadores
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
  ],

  /* Servidor web local para tests */
  webServer: [
    {
      command: 'npm run dev',
      cwd: '../auth_APP',
      port: 4000,
      timeout: 120 * 1000,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm run dev',
      port: 3000, // Backend tRPC
      timeout: 120 * 1000,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm run dev:client',
      port: 5173, // Frontend React
      timeout: 120 * 1000,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
