import { Request, Response } from 'express';
import { CreateCertificateUseCase } from '../../../domain/usecases/certificates/CreateCertificateUseCase';
import { CreateCertificateDTO } from '../../../types/certificate';

export class CertificateController {
  constructor(private createCertificateUseCase: CreateCertificateUseCase) {}

  async createCertificate(req: Request, res: Response): Promise<void> {
    try {
      const data: CreateCertificateDTO = req.body;
      const certificate = await this.createCertificateUseCase.execute(data);
      res.status(201).json(certificate);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Error interno del servidor' });
      }
    }
  }
}
