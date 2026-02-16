/**
 * tRPC Certificate Router
 * Expone los casos de uso de certificados a través de tRPC
 */
import { z } from 'zod';
import { GetCertificatesUseCase } from '../../../domain/usecases/certificates/GetCertificatesUseCase';
import { publicProcedure, router } from '../trpc';

/**
 * Schema de validación con Zod para filtros de certificados
 */
const getCertificatesSchema = z.object({
  client: z.string().optional(),
  server: z.string().optional(),
  fileName: z.string().optional(),
  status: z.enum(['ACTIVE', 'DELETED']).optional(),
  expirationStatus: z.enum(['NORMAL', 'WARNING', 'EXPIRED']).optional()
}).optional();

/**
 * Router de certificados
 */
export const certificateRouter = router({
  /**
   * Obtener lista de certificados con filtros opcionales
   * Query: /trpc/certificate.getCertificates
   */
  getCertificates: publicProcedure
    .input(getCertificatesSchema)
    .query(async ({ input, ctx }) => {
      const getCertificatesUseCase = new GetCertificatesUseCase(ctx.certificateRepository);
      
      // Zod validates the input schema, we can safely cast to use case filters
      const filters = input || {};
      const result = await getCertificatesUseCase.execute(filters as any);
      
      return result;
    }),

  /**
   * Health check simple para verificar que tRPC está funcionando
   * Query: /trpc/certificate.hello
   */
  hello: publicProcedure
    .input(z.object({ name: z.string().optional() }).optional())
    .query(({ input }) => {
      const name = input?.name || 'World';
      return {
        message: `Hello ${name} from tRPC! 🚀`,
        timestamp: new Date().toISOString(),
        status: 'connected'
      };
    })
});

export type CertificateRouter = typeof certificateRouter;
