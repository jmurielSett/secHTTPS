/**
 * tRPC App Router
 * Combina todos los routers de la aplicación
 */
import { router } from '../trpc';
import { certificateRouter } from './certificateRouter';

/**
 * Router principal de la aplicación
 * Todos los routers se exponen bajo su namespace:
 * - certificate.* -> operaciones de certificados
 * 
 * TODO: Agregar más routers según se necesiten:
 * - notification.* -> operaciones de notificaciones
 * - auth.* -> operaciones de autenticación (cuando se integre auth_APP)
 */
export const appRouter = router({
  certificate: certificateRouter
  // notification: notificationRouter,  // Futuro
  // auth: authRouter,                   // Futuro - integración con auth_APP
});

/**
 * Tipo del router para usar en el cliente
 * Esto habilita autocompletado e inferencia de tipos en el frontend
 */
export type AppRouter = typeof appRouter;
