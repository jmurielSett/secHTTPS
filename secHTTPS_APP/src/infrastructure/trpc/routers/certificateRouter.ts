/**
 * tRPC Certificate Router
 * Expone los casos de uso de certificados a través de tRPC
 */
import { z } from 'zod';
import { CreateCertificateUseCase } from '../../../domain/usecases/certificates/CreateCertificateUseCase';
import { GetCertificatesUseCase } from '../../../domain/usecases/certificates/GetCertificatesUseCase';
import { protectedProcedure, publicProcedure, router } from '../trpc';

/**
 * Schema de validación con Zod para filtros de certificados
 */
const getCertificatesSchema = z.object({
  client: z.string().optional(),
  server: z.string().optional(),
  fileName: z.string().optional(),
  responsibleEmail: z.string().optional(),
  status: z.enum(['ACTIVE', 'DELETED']).optional(),
  expirationStatus: z.enum(['NORMAL', 'WARNING', 'EXPIRED']).optional()
}).optional();

/**
 * Schema de validación para crear un certificado
 */
const createCertificateSchema = z.object({
  fileName: z.string().min(1, 'El nombre del archivo es obligatorio'),
  startDate: z.string().min(1, 'La fecha de inicio es obligatoria'),
  expirationDate: z.string().min(1, 'La fecha de expiración es obligatoria'),
  server: z.string().min(1, 'El servidor es obligatorio'),
  filePath: z.string().min(1, 'La ruta del archivo es obligatoria'),
  client: z.string().min(1, 'El cliente es obligatorio'),
  configPath: z.string().min(1, 'La ruta de configuración es obligatoria'),
  responsibleContacts: z.array(z.object({
    email: z.string().email(),
    language: z.string().min(2, 'El idioma debe ser un código ISO de 2 letras'),
    name: z.string().optional()
  })).min(1, 'Debe haber al menos un contacto responsable')
});

/**
 * Router de certificados
 */
export const certificateRouter = router({
  /**
   * Obtener lista de certificados con filtros opcionales
   * Query: /trpc/certificate.getCertificates
   * 🔒 PROTEGIDO - Requiere autenticación
   */
  getCertificates: protectedProcedure
    .input(getCertificatesSchema)
    .query(async ({ input, ctx }) => {
      console.log(`[tRPC] User ${ctx.username} (${ctx.userId}) fetching certificates`);
      
      // 🔧 TEMPORAL: Delay artificial para visualizar el loading overlay (remover en producción)
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const getCertificatesUseCase = new GetCertificatesUseCase(ctx.certificateRepository);
      
      // Zod validates the input schema, we can safely cast to use case filters
      const filters = input || {};
      const result = await getCertificatesUseCase.execute(filters as any);
      
      return result;
    }),

  /**
   * Crear un nuevo certificado
   * Mutation: /trpc/certificate.createCertificate
   * 🔒 PROTEGIDO - Requiere autenticación
   */
  createCertificate: protectedProcedure
    .input(createCertificateSchema)
    .mutation(async ({ input, ctx }) => {
      console.log(`[tRPC] User ${ctx.username} (${ctx.userId}) creating certificate`);
      
      const createCertificateUseCase = new CreateCertificateUseCase(
        ctx.certificateRepository,
        ctx.notificationRepository,
        undefined, // emailService - TODO: Agregar al contexto cuando esté disponible
        undefined  // localizationService - TODO: Agregar al contexto cuando esté disponible
      );
      
      const certificate = await createCertificateUseCase.execute(input);
      
      return certificate;
    }),

  /**   * Obtener datos del usuario actual (incluyendo roles del token JWT)
   * Query: /trpc/certificate.getCurrentUser
   * 🔒 PROTEGIDO - Requiere autenticación
   */
  getCurrentUser: protectedProcedure
    .query(({ ctx }) => {
      return {
        userId: ctx.userId,
        username: ctx.username,
        applicationName: ctx.applicationName,
        roles: ctx.roles || []
      };
    }),

  /**   * Health check simple para verificar que tRPC está funcionando
   * Query: /trpc/certificate.hello
   * ✅ PÚBLICO - No requiere autenticación
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
