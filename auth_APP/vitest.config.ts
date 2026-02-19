import dotenv from 'dotenv';
import path from 'node:path';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

// Cargar .env antes de leer process.env (no sobreescribe vars del sistema)
dotenv.config();

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 15000,
    env: {
      // Lee del .env o del sistema; los valores por defecto son solo para
      // entornos de CI sin .env (usuario de prueba en memoria, no producción)
      ADMIN_PASSWORD: process.env.ADMIN_PASSWORD ?? 'Admin123',
      ADMIN_USERNAME: process.env.ADMIN_USERNAME ?? 'admin',
      ADMIN_EMAIL:    process.env.ADMIN_EMAIL    ?? 'admin@auth.com'
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', 'tests/']
    }
  }
});
