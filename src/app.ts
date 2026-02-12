import express, { Application, Request, Response } from 'express';
import { InMemoryCertificateRepository } from './infrastructure/persistence/CertificateRepository';
import { createCertificateRouter } from './infrastructure/transport/routes/certificateRoutes';

export function createApp(): Application {
  const app = express();

  // Middleware para parsear JSON
  app.use(express.json());

  // Ruta GET simple que devuelve "hello world"
  app.get('/', (req: Request, res: Response) => {
    res.send('hello world');
  });

  // Crear repositorio
  const certificateRepository = new InMemoryCertificateRepository();

  // Registrar rutas de certificados
  app.use('/api/certif', createCertificateRouter(certificateRepository));

  return app;
}
