import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // No necesitamos proxy porque tRPC usa fetch directamente
      // pero lo dejamos por si acaso queremos llamar a REST API
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
})
