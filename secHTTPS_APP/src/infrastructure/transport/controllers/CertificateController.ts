import { Request, Response } from 'express';
import { CreateCertificateUseCase } from '../../../domain/usecases/certificates/CreateCertificateUseCase';
import { GetCertificateByIdUseCase } from '../../../domain/usecases/certificates/GetCertificateByIdUseCase';
import { GetCertificatesUseCase } from '../../../domain/usecases/certificates/GetCertificatesUseCase';
import { UpdateCertificateStatusDTO, UpdateCertificateStatusUseCase } from '../../../domain/usecases/certificates/UpdateCertificateStatusUseCase';
import { UpdateCertificateUseCase } from '../../../domain/usecases/certificates/UpdateCertificateUseCase';
import { GetCertificateNotificationsUseCase } from '../../../domain/usecases/notifications/GetCertificateNotificationsUseCase';
import { CertificateStatus, CreateCertificateDTO, UpdateCertificateDTO } from '../../../types/certificate';
import { AppError, InternalError } from '../../../types/errors';
import { ExpirationStatus } from '../../../types/shared';

export class CertificateController {
  constructor(
    private readonly createCertificateUseCase: CreateCertificateUseCase,
    private readonly getCertificatesUseCase: GetCertificatesUseCase,
    private readonly getCertificateByIdUseCase: GetCertificateByIdUseCase,
    private readonly updateCertificateUseCase: UpdateCertificateUseCase,
    private readonly updateCertificateStatusUseCase: UpdateCertificateStatusUseCase,
    private readonly getCertificateNotificationsUseCase: GetCertificateNotificationsUseCase
  ) {}

  async createCertificate(req: Request, res: Response): Promise<void> {
    try {
      const data: CreateCertificateDTO = req.body;
      const certificate = await this.createCertificateUseCase.execute(data);
      res.status(201).json(certificate);
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json(error.toJSON());
      } else {
        const internalError = new InternalError();
        res.status(internalError.statusCode).json(internalError.toJSON());
      }
    }
  }

  async getCertificates(req: Request, res: Response): Promise<void> {
    try {
      const filters = {
        client: req.query.client as string | undefined,
        server: req.query.server as string | undefined,
        fileName: req.query.fileName as string | undefined,
        status: req.query.status as CertificateStatus | undefined,
        expirationStatus: req.query.expirationStatus as ExpirationStatus | undefined
      };

      const result = await this.getCertificatesUseCase.execute(filters);
      res.status(200).json(result);
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json(error.toJSON());
      } else {
        const internalError = new InternalError();
        res.status(internalError.statusCode).json(internalError.toJSON());
      }
    }
  }

  async getCertificateById(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const certificate = await this.getCertificateByIdUseCase.execute(id);
      res.status(200).json(certificate);
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json(error.toJSON());
      } else {
        const internalError = new InternalError();
        res.status(internalError.statusCode).json(internalError.toJSON());
      }
    }
  }

  async updateCertificate(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const data: UpdateCertificateDTO = req.body;
      const certificate = await this.updateCertificateUseCase.execute(id, data);
      res.status(200).json(certificate);
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json(error.toJSON());
      } else {
        const internalError = new InternalError();
        res.status(internalError.statusCode).json(internalError.toJSON());
      }
    }
  }

  async updateCertificateStatus(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const data: UpdateCertificateStatusDTO = req.body;
      const certificate = await this.updateCertificateStatusUseCase.execute(id, data);
      res.status(200).json(certificate);
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json(error.toJSON());
      } else {
        const internalError = new InternalError();
        res.status(internalError.statusCode).json(internalError.toJSON());
      }
    }
  }

  async getCertificateNotifications(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const result = await this.getCertificateNotificationsUseCase.execute(id);
      res.status(200).json(result);
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json(error.toJSON());
      } else {
        const internalError = new InternalError();
        res.status(internalError.statusCode).json(internalError.toJSON());
      }
    }
  }
}
