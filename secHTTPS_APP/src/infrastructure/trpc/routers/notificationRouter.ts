/**
 * tRPC Notification Router
 * Expone los casos de uso de notificaciones a través de tRPC
 * 🔒 Solo accesible para usuarios con permiso notifications.read
 */
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { GetNotificationsUseCase } from '../../../domain/usecases/notifications/GetNotificationsUseCase';
import { NotificationResult } from '../../../types/notification';
import { ExpirationStatus } from '../../../types/shared';
import { protectedProcedure, router } from '../trpc';

/**
 * Roles que tienen permiso de lectura en notificaciones
 */
const NOTIFICATION_READ_ROLES = new Set(['admin', 'auditor']);

/**
 * Verifica si el usuario tiene el permiso indicado según sus roles
 */
function requireNotificationRead(roles: string[]): void {
  const allowed = roles.some(r => NOTIFICATION_READ_ROLES.has(r));
  if (!allowed) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'No tienes permiso para leer notificaciones (notifications.read)'
    });
  }
}

export const notificationRouter = router({
  /**
   * Obtener notificaciones de un certificado concreto
   * Query: /trpc/notification.getNotificationsByCertificate
   * 🔒 PROTEGIDO - Requiere permiso notifications.read
   */
  getNotificationsByCertificate: protectedProcedure
    .input(z.object({ certificateId: z.uuid() }))
    .query(async ({ input, ctx }) => {
      requireNotificationRead(ctx.roles ?? []);

      const useCase = new GetNotificationsUseCase(ctx.notificationRepository);
      const result = await useCase.execute({ certificateId: input.certificateId });
      // Ordenar por fecha descendente (más reciente primero)
      result.notifications.sort(
        (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()
      );
      return result;
    }),

  /**
   * Obtener todas las notificaciones con filtros opcionales
   * Query: /trpc/notification.getNotifications
   * 🔒 PROTEGIDO - Requiere permiso notifications.read
   */
  getNotifications: protectedProcedure
    .input(z.object({
      certificateId: z.uuid().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      expirationStatus: z.enum(['NORMAL', 'WARNING', 'EXPIRED'] as const).optional(),
      result: z.enum(['SENT', 'ERROR', 'FORCE'] as const).optional(),
    }).optional())
    .query(async ({ input, ctx }) => {
      requireNotificationRead(ctx.roles ?? []);

      const useCase = new GetNotificationsUseCase(ctx.notificationRepository);
      const result = await useCase.execute(input ? {
        ...input,
        expirationStatus: input.expirationStatus as ExpirationStatus | undefined,
        result: input.result as NotificationResult | undefined,
      } : {});
      result.notifications.sort(
        (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()
      );
      return result;
    }),
});

export type NotificationRouter = typeof notificationRouter;
