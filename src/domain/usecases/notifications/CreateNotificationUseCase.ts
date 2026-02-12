import { randomUUID } from 'node:crypto';
import { ICertificateRepository } from '../../../infrastructure/persistence/CertificateRepository';
import { INotificationRepository } from '../../../infrastructure/persistence/NotificationRepository';
import { ErrorCode, NotFoundError, ValidationError } from '../../../types/errors';
import { CreateNotificationDTO, Notification, NotificationResult } from '../../../types/notification';

export class CreateNotificationUseCase {
  constructor(
    private readonly certificateRepository: ICertificateRepository,
    private readonly notificationRepository: INotificationRepository
  ) {}

  async execute(dto: CreateNotificationDTO): Promise<Notification> {
    // Validar campos requeridos
    if(!dto.certificateId || !dto.recipientEmails || !dto.subject || 
       dto.expirationStatusAtTime === undefined || !dto.result) {
      throw new ValidationError(ErrorCode.REQUIRED_FIELDS, 'Faltan campos obligatorios');
    }

    // Validar que certificateId sea UUID válido
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(dto.certificateId)) {
      throw new ValidationError(ErrorCode.INVALID_UUID, 'certificateId debe ser un UUID válido');
    }

    // Validar que recipientEmails no esté vacío
    if (!Array.isArray(dto.recipientEmails) || dto.recipientEmails.length === 0) {
      throw new ValidationError(ErrorCode.INVALID_EMAIL_LIST, 'recipientEmails debe contener al menos un email');
    }

    // Validar que si result es ERROR, errorMessage sea obligatorio
    if (dto.result === NotificationResult.ERROR && !dto.errorMessage) {
      throw new ValidationError(
        ErrorCode.ERROR_MESSAGE_REQUIRED,
        'errorMessage es obligatorio cuando result es ERROR'
      );
    }

    // Verificar que el certificado existe
    const certificate = await this.certificateRepository.findById(dto.certificateId);
    if (!certificate) {
      throw new NotFoundError(ErrorCode.CERTIFICATE_NOT_FOUND, `Certificado con id ${dto.certificateId} no encontrado`);
    }

    // Crear la notificación
    const notification: Notification = {
      id: randomUUID(),
      certificateId: dto.certificateId,
      sentAt: new Date().toISOString(),
      recipientEmails: dto.recipientEmails,
      subject: dto.subject,
      expirationStatusAtTime: dto.expirationStatusAtTime,
      result: dto.result,
      errorMessage: dto.errorMessage || null
    };

    return await this.notificationRepository.save(notification);
  }
}
