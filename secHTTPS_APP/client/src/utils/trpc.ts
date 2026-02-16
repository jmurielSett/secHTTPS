/**
 * Configuración del cliente tRPC
 * Define la conexión con el backend y los tipos
 */
import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client';
import type { AppRouter } from '../../../src/infrastructure/trpc/routers';

/**
 * Cliente tRPC tipado con el router del backend
 */
export const trpc = createTRPCReact<AppRouter>();

/**
 * Configuración del cliente tRPC
 */
export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: 'http://localhost:3000/trpc',
    }),
  ],
});
