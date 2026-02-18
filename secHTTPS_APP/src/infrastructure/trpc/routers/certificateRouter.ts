/**
 * tRPC Certificate Router
 * Expone los casos de uso de certificados a través de tRPC
 */
import { z } from 'zod';
import { CreateCertificateUseCase } from '../../../domain/usecases/certificates/CreateCertificateUseCase';
import { GetCertificatesUseCase } from '../../../domain/usecases/certificates/GetCertificatesUseCase';
import { protectedProcedure, publicProcedure, router } from '../trpc';

/**
 * Permission Matrix - Mirrors auth_APP database structure
 * This is the source of truth for UI permissions
 * ⚠️ IMPORTANT: Must match role_permissions in auth_APP database
 */
interface PermissionMatrix {
  [role: string]: {
    [resource: string]: string[];
  };
}

const PERMISSION_MATRIX: PermissionMatrix = {
  admin: {
    certificates: ['create', 'read', 'update', 'delete'],
    notifications: ['send', 'read']
  },
  editor: {
    certificates: ['create', 'read', 'update']
  },
  viewer: {
    certificates: ['read']
  },
  auditor: {
    certificates: ['read'],
    notifications: ['read']
  }
};

/**
 * Calculate user permissions based on their roles
 * @param roles - Array of role names from JWT token
 * @returns Object with permissions organized by resource
 */
function calculateUserPermissions(roles: string[]): Record<string, string[]> {
  const permissions: Record<string, Set<string>> = {};
  
  // Aggregate permissions from all user roles
  for (const role of roles) {
    const rolePermissions = PERMISSION_MATRIX[role];
    if (!rolePermissions) continue;
    
    for (const [resource, actions] of Object.entries(rolePermissions)) {
      if (!permissions[resource]) {
        permissions[resource] = new Set();
      }
      
      for (const action of actions) {
        permissions[resource].add(action);
      }
    }
  }
  
  // Convert Sets to Arrays
  const result: Record<string, string[]> = {};
  for (const [resource, actionsSet] of Object.entries(permissions)) {
    result[resource] = Array.from(actionsSet);
  }
  
  return result;
}

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
 * Schema de validación para actualizar un certificado (todos los campos opcionales)
 */
const updateCertificateSchema = z.object({
  fileName: z.string().optional(),
  startDate: z.string().optional(),
  expirationDate: z.string().optional(),
  server: z.string().optional(),
  filePath: z.string().optional(),
  client: z.string().optional(),
  configPath: z.string().optional(),
  responsibleContacts: z.array(z.object({
    email: z.string().email(),
    language: z.string().min(2, 'El idioma debe ser un código ISO de 2 letras'),
    name: z.string().optional()
  })).optional()
});

/**
 * Router de certificados
 */
export const certificateRouter = router({
  /**
   * Actualizar un certificado existente
   * Mutation: /trpc/certificate.updateCertificate
   * 🔒 PROTEGIDO - Requiere autenticación
   */
  updateCertificate: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      data: updateCertificateSchema
    }))
    .mutation(async ({ input, ctx }) => {
      console.log(`[tRPC] User ${ctx.username} (${ctx.userId}) updating certificate ${input.id}`);
      const updateCertificateUseCase = new (await import('../../../domain/usecases/certificates/UpdateCertificateUseCase')).UpdateCertificateUseCase(
        ctx.certificateRepository,
        ctx.expirationService
      );
      const certificate = await updateCertificateUseCase.execute(input.id, input.data);
      return certificate;
    }),

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

  /**
   * Obtener datos del usuario actual (incluyendo roles y permisos del token JWT)
   * Query: /trpc/certificate.getCurrentUser
   * 🔒 PROTEGIDO - Requiere autenticación
   * 🔐 SEGURO: Calcula permisos dinámicamente basado en roles del JWT
   */
  getCurrentUser: protectedProcedure
    .query(({ ctx }) => {
      const roles = ctx.roles || [];
      const permissions = calculateUserPermissions(roles);
      
      return {
        userId: ctx.userId,
        username: ctx.username,
        applicationName: ctx.applicationName,
        roles,
        permissions // 🔐 Solo envía los permisos del usuario actual
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
