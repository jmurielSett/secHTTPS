/**
 * tRPC Base Configuration
 * Define el contexto y los procedimientos base para tRPC
 */
import { TRPCError, initTRPC } from '@trpc/server';
import { ICertificateRepository } from '../../domain/repositories/ICertificateRepository';
import { INotificationRepository } from '../../domain/repositories/INotificationRepository';

/**
 * Contexto de tRPC - contiene servicios y repositorios
 * disponibles para todos los routers
 */
export interface TRPCContext {
  certificateRepository: ICertificateRepository;
  notificationRepository: INotificationRepository;
  // Authentication data (from JWT in httpOnly cookie)
  userId?: string;
  username?: string;
  applicationName?: string;
  roles?: string[];
}

/**
 * Inicialización de tRPC
 */
const t = initTRPC.context<TRPCContext>().create();

/**
 * Exportar helpers de tRPC
 */
export const router = t.router;

/**
 * Procedimiento público - No requiere autenticación
 */
export const publicProcedure = t.procedure;

/**
 * Procedimiento protegido - Requiere autenticación válida
 * Verifica que el usuario esté autenticado (tiene userId en el contexto)
 */
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access this resource. Please authenticate first.'
    });
  }

  return next({
    ctx: {
      ...ctx,
      userId: ctx.userId,
      username: ctx.username!,
      applicationName: ctx.applicationName,
      roles: ctx.roles || []
    }
  });
});
