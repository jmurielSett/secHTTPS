/**
 * tRPC App Router
 * Combina todos los routers de la aplicación
 */
import { router } from '../trpc';
import { certificateRouter } from './certificateRouter';
import { notificationRouter } from './notificationRouter';

/**
 * Router principal de la aplicación
 * Todos los routers se exponen bajo su namespace:
 * - certificate.* -> operaciones de certificados
 * - notification.* -> operaciones de notificaciones (requiere notifications.read)
 */
export const appRouter = router({
  certificate: certificateRouter,
  notification: notificationRouter
  // auth: authRouter,  // Futuro - integración con auth_APP
});

/**
 * Tipo del router para usar en el cliente
 * Esto habilita autocompletado e inferencia de tipos en el frontend
 */
export type AppRouter = typeof appRouter;
