import dotenv from 'dotenv';
import { defineConfig } from 'vitest/config';

// Cargar .env para que los tests puedan usar las mismas claves que el servidor
dotenv.config();

export default defineConfig({
  test: {
    env: {
      // Clave JWT para tests — lee del .env; fallback solo para CI sin .env
      JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET ?? 'test-jwt-secret-for-vitest-needs-32-chars!!',
    },
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
      '**/tests/e2e/**'
    ],
  },
});
