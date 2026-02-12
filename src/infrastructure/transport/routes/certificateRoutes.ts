import { Router } from 'express';
import { CreateCertificateUseCase } from '../../../domain/usecases/certificates/CreateCertificateUseCase';
import { ICertificateRepository } from '../../persistence/CertificateRepository';
import { CertificateController } from '../controllers/CertificateController';

export function createCertificateRouter(certificateRepository: ICertificateRepository): Router {
  const router = Router();
  
  // Create use cases
  const createCertificateUseCase = new CreateCertificateUseCase(certificateRepository);
  
  // Create controller
  const certificateController = new CertificateController(createCertificateUseCase);
  
  // Register routes
  router.post('/', (req, res) => certificateController.createCertificate(req, res));
  
  return router;
}
