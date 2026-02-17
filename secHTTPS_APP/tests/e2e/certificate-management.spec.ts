import { expect, test } from '@playwright/test';

/**
 * Tests E2E para gestión de certificados SecHTTPS
 * Cubre autenticación y operaciones CRUD de certificados
 */

test.describe('Certificate Management', () => {
  test('should load login page', async ({ page }) => {
    await page.goto('/');
    
    // Verificar que el login se muestra
    await expect(page.locator('h1')).toContainText('SecHTTPS');
  });

  test('should login successfully', async ({ page }) => {
    await page.goto('/');
    
    // Llenar formulario de login
    await page.fill('#username', 'admin');
    await page.fill('#password', 'Admin123');
    
    // Click en login
    await page.click('button[type="submit"]');
    
    // Esperar navegación al dashboard (esperar que aparezca el título del dashboard)
    await expect(page.locator('h1')).toContainText('Certificate Manager', { timeout: 10000 });
  });

  test('should display certificates list', async ({ page }) => {
    // Primero hacer login
    await page.goto('/');
    await page.fill('#username', 'admin');
    await page.fill('#password', 'Admin123');
    await page.click('button[type="submit"]');
    
    // Esperar a que carguen los certificados
    await page.waitForSelector('.certificates-grid', { timeout: 10000 });
    
    // Verificar que hay al menos un certificado
    const certificates = await page.locator('.certificate-card').count();
    expect(certificates).toBeGreaterThan(0);
  });

  test('should filter certificates by client', async ({ page }) => {
    // Login
    await page.goto('/');
    await page.fill('#username', 'admin');
    await page.fill('#password', 'Admin123');
    await page.click('button[type="submit"]');
    
    // Esperar a que carguen los certificados
    await page.waitForSelector('.certificate-filters');
    
    // Aplicar filtro de cliente
    await page.fill('#filter-client', 'Acme');
    
    // Esperar a que se aplique el filtro
    await page.waitForTimeout(500);
    
    // Verificar que se muestra el mensaje de filtrado
    await expect(page.locator('.success')).toContainText('filtrados');
  });

  test('should clear filters', async ({ page }) => {
    // Login
    await page.goto('/');
    await page.fill('#username', 'admin');
    await page.fill('#password', 'Admin123');
    await page.click('button[type="submit"]');
    
    // Aplicar filtro
    await page.fill('#filter-client', 'Test');
    
    // Limpiar filtros
    await page.click('.clear-filters-btn');
    
    // Verificar que el input está vacío
    const value = await page.inputValue('#filter-client');
    expect(value).toBe('');
  });

  test('should logout successfully', async ({ page }) => {
    // Login
    await page.goto('/');
    await page.fill('#username', 'admin');
    await page.fill('#password', 'Admin123');
    await page.click('button[type="submit"]');
    
    // Click en logout
    await page.click('.logout-button');
    
    // Verificar que volvemos al login
    await expect(page.locator('h1')).toContainText('SecHTTPS');
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });
});
