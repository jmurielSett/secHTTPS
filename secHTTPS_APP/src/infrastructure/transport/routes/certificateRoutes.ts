import { Router } from 'express';
import { ICertificateRepository } from '../../../domain/repositories/ICertificateRepository';
import { INotificationRepository } from '../../../domain/repositories/INotificationRepository';
import { CertificateExpirationService } from '../../../domain/services/CertificateExpirationService';
import { IEmailService } from '../../../domain/services/IEmailService';
import { ILocalizationService } from '../../../domain/services/ILocalizationService';
import { CreateCertificateUseCase } from '../../../domain/usecases/certificates/CreateCertificateUseCase';
import { GetCertificateByIdUseCase } from '../../../domain/usecases/certificates/GetCertificateByIdUseCase';
import { GetCertificatesUseCase } from '../../../domain/usecases/certificates/GetCertificatesUseCase';
import { UpdateCertificateStatusUseCase } from '../../../domain/usecases/certificates/UpdateCertificateStatusUseCase';
import { UpdateCertificateUseCase } from '../../../domain/usecases/certificates/UpdateCertificateUseCase';
import { GetCertificateNotificationsUseCase } from '../../../domain/usecases/notifications/GetCertificateNotificationsUseCase';
import { LocalizationService } from '../../localization/LocalizationService';
import { NodemailerEmailService } from '../../messaging/NodemailerEmailService';
import { authMiddleware } from '../../middleware/authMiddleware';
import { CertificateController } from '../controllers/CertificateController';

export function createCertificateRouter(
  certificateRepository: ICertificateRepository,
  notificationRepository: INotificationRepository
): Router {
  const router = Router();
  
  // Create services
  const expirationService = new CertificateExpirationService();
  const localizationService: ILocalizationService = new LocalizationService();
  
  // Try to create email service (optional - only if SMTP is configured)
  let emailService: IEmailService | undefined;
  try {
    emailService = new NodemailerEmailService();
    console.log('✅ Email service configurado para notificaciones de certificados creados');
  } catch (error) {
    console.log('⚠️ Email service no disponible para notificaciones de creación (SMTP no configurado)');
    console.error('Error al inicializar servicio de email:', error);
    emailService = undefined;
  }
  
  // Create use cases
  const createCertificateUseCase = new CreateCertificateUseCase(
    certificateRepository,
    notificationRepository,
    emailService,
    localizationService
  );
  const getCertificatesUseCase = new GetCertificatesUseCase(certificateRepository);
  const getCertificateByIdUseCase = new GetCertificateByIdUseCase(certificateRepository);
  const updateCertificateUseCase = new UpdateCertificateUseCase(certificateRepository, expirationService);
  const updateCertificateStatusUseCase = new UpdateCertificateStatusUseCase(certificateRepository);
  const getCertificateNotificationsUseCase = new GetCertificateNotificationsUseCase(
    certificateRepository,
    notificationRepository
  );
  
  // Create controller
  const certificateController = new CertificateController(
    createCertificateUseCase,
    getCertificatesUseCase,
    getCertificateByIdUseCase,
    updateCertificateUseCase,
    updateCertificateStatusUseCase,
    getCertificateNotificationsUseCase
  );
  
  // Register routes — all protected by JWT
  router.get('/', authMiddleware, (req, res) => certificateController.getCertificates(req, res));
  router.get('/:id', authMiddleware, (req, res) => certificateController.getCertificateById(req, res));
  router.get('/:id/notifications', authMiddleware, (req, res) => certificateController.getCertificateNotifications(req, res));
  router.post('/', authMiddleware, (req, res) => certificateController.createCertificate(req, res));
  router.put('/:id', authMiddleware, (req, res) => certificateController.updateCertificate(req, res));
  router.patch('/:id/status', authMiddleware, (req, res) => certificateController.updateCertificateStatus(req, res));
  
  return router;
}
