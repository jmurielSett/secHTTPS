import { Router } from 'express';
import { CertificateExpirationService } from '../../../domain/services/CertificateExpirationService';
import { CreateCertificateUseCase } from '../../../domain/usecases/certificates/CreateCertificateUseCase';
import { GetCertificateByIdUseCase } from '../../../domain/usecases/certificates/GetCertificateByIdUseCase';
import { GetCertificatesUseCase } from '../../../domain/usecases/certificates/GetCertificatesUseCase';
import { UpdateCertificateStatusUseCase } from '../../../domain/usecases/certificates/UpdateCertificateStatusUseCase';
import { UpdateCertificateUseCase } from '../../../domain/usecases/certificates/UpdateCertificateUseCase';
import { GetCertificateNotificationsUseCase } from '../../../domain/usecases/notifications/GetCertificateNotificationsUseCase';
import { ICertificateRepository } from '../../persistence/CertificateRepository';
import { INotificationRepository } from '../../persistence/NotificationRepository';
import { CertificateController } from '../controllers/CertificateController';

export function createCertificateRouter(
  certificateRepository: ICertificateRepository,
  notificationRepository: INotificationRepository
): Router {
  const router = Router();
  
  // Create services
  const expirationService = new CertificateExpirationService();
  
  // Create use cases
  const createCertificateUseCase = new CreateCertificateUseCase(certificateRepository);
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
  
  // Register routes
  router.get('/', (req, res) => certificateController.getCertificates(req, res));
  router.get('/:id', (req, res) => certificateController.getCertificateById(req, res));
  router.get('/:id/notifications', (req, res) => certificateController.getCertificateNotifications(req, res));
  router.post('/', (req, res) => certificateController.createCertificate(req, res));
  router.put('/:id', (req, res) => certificateController.updateCertificate(req, res));
  router.patch('/:id/status', (req, res) => certificateController.updateCertificateStatus(req, res));
  
  return router;
}
