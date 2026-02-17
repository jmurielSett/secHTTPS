/**
 * Configuración del cliente tRPC
 * Define la conexión con el backend y los tipos
 */
import { httpBatchLink } from '@trpc/client';
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '../../../src/infrastructure/trpc/routers';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

/**
 * Cliente tRPC tipado con el router del backend
 */
export const trpc = createTRPCReact<AppRouter>();

/**
 * Configuración del cliente tRPC con autenticación vía cookies
 */
export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: `${BACKEND_URL}/trpc`,
      
      /**
       * Incluir cookies httpOnly en cada petición
       * CRÍTICO: credentials: 'include' permite enviar/recibir cookies cross-origin
       */
      fetch(url, options) {
        return fetch(url, {
          ...options,
          credentials: 'include',
        });
      },
    }),
  ],
});
