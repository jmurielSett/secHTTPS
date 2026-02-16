/**
 * tRPC Base Configuration
 * Define el contexto y los procedimientos base para tRPC
 */
import { initTRPC } from '@trpc/server';
import { ICertificateRepository } from '../../domain/repositories/ICertificateRepository';
import { INotificationRepository } from '../../domain/repositories/INotificationRepository';

/**
 * Contexto de tRPC - contiene servicios y repositorios
 * disponibles para todos los routers
 */
export interface TRPCContext {
  certificateRepository: ICertificateRepository;
  notificationRepository: INotificationRepository;
  // TODO: Agregar cuando se integre auth_APP:
  // userId?: number;
  // username?: string;
  // token?: string;
}

/**
 * Inicialización de tRPC
 */
const t = initTRPC.context<TRPCContext>().create();

/**
 * Exportar helpers de tRPC
 */
export const router = t.router;
export const publicProcedure = t.procedure;

// TODO: Crear procedimientos protegidos cuando se integre auth_APP
// export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
//   if (!ctx.userId) {
//     throw new TRPCError({ code: 'UNAUTHORIZED' });
//   }
//   return next({ ctx: { ...ctx, userId: ctx.userId } });
// });
