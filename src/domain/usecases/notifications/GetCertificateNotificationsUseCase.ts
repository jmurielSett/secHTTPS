import { ICertificateRepository } from '../../../infrastructure/persistence/CertificateRepository';
import { INotificationRepository } from '../../../infrastructure/persistence/NotificationRepository';
import { ErrorCode, NotFoundError, ValidationError } from '../../../types/errors';
import { Notification } from '../../../types/notification';

export class GetCertificateNotificationsUseCase {
  constructor(
    private readonly certificateRepository: ICertificateRepository,
    private readonly notificationRepository: INotificationRepository
  ) {}

  async execute(certificateId: string): Promise<{ total: number; notifications: Notification[] }> {
    // Validar que el ID sea un UUID válido
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(certificateId)) {
      throw new ValidationError(
        ErrorCode.INVALID_UUID,
        'El ID proporcionado no es un UUID válido'
      );
    }

    // Verificar que el certificado existe
    const certificate = await this.certificateRepository.findById(certificateId);
    if (!certificate) {
      throw new NotFoundError(
        ErrorCode.CERTIFICATE_NOT_FOUND,
        `Certificado con ID ${certificateId} no encontrado`
      );
    }

    // Obtener todas las notificaciones del certificado
    const notifications = await this.notificationRepository.findByCertificateId(certificateId);

    return {
      total: notifications.length,
      notifications
    };
  }
}
