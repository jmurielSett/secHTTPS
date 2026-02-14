import { Request, Response } from 'express';
import { CreateNotificationUseCase } from '../../../domain/usecases/notifications/CreateNotificationUseCase';
import { GetNotificationsFilters, GetNotificationsUseCase } from '../../../domain/usecases/notifications/GetNotificationsUseCase';
import { AppError, InternalError } from '../../../types/errors';
import { CreateNotificationDTO, NotificationResult } from '../../../types/notification';
import { ExpirationStatus } from '../../../types/shared';

export class NotificationController {
  constructor(
    private readonly createNotificationUseCase: CreateNotificationUseCase,
    private readonly getNotificationsUseCase: GetNotificationsUseCase
  ) {}

  async createNotification(req: Request, res: Response): Promise<void> {
    try {
      const data: CreateNotificationDTO = req.body;
      const notification = await this.createNotificationUseCase.execute(data);
      res.status(201).json(notification);
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json(error.toJSON());
      } else {
        const internalError = new InternalError();
        res.status(internalError.statusCode).json(internalError.toJSON());
      }
    }
  }

  async getNotifications(req: Request, res: Response): Promise<void> {
    try {
      const filters: GetNotificationsFilters = {};

      if (req.query.certificateId) {
        filters.certificateId = req.query.certificateId as string;
      }

      if (req.query.startDate) {
        filters.startDate = req.query.startDate as string;
      }

      if (req.query.endDate) {
        filters.endDate = req.query.endDate as string;
      }

      if (req.query.expirationStatus) {
        filters.expirationStatus = req.query.expirationStatus as ExpirationStatus.WARNING | ExpirationStatus.EXPIRED;
      }

      if (req.query.result) {
        filters.result = req.query.result as NotificationResult;
      }

      const result = await this.getNotificationsUseCase.execute(filters);
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
