import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  root: './client',
  envDir: '../', // Busca .env en la raíz del proyecto (no en client/)
  server: {
    port: 5173,
  },
});
