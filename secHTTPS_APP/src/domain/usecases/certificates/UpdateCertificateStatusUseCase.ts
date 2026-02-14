import { Certificate, CertificateStatus } from '../../../types/certificate';
import { ErrorCode, NotFoundError, ValidationError } from '../../../types/errors';
import { ICertificateRepository } from '../../repositories/ICertificateRepository';

export interface UpdateCertificateStatusDTO {
  status: CertificateStatus;
}

export class UpdateCertificateStatusUseCase {
  constructor(private readonly certificateRepository: ICertificateRepository) {}

  async execute(id: string, data: UpdateCertificateStatusDTO): Promise<Certificate> {
    // Validar que el status sea DELETED
    if (data.status !== CertificateStatus.DELETED) {
      throw new ValidationError(
        ErrorCode.INVALID_STATUS,
        'Solo se permite cambiar el estado a DELETED'
      );
    }

    // Buscar el certificado
    const certificate = await this.certificateRepository.findById(id);
    
    if (!certificate) {
      throw new NotFoundError(
        ErrorCode.CERTIFICATE_NOT_FOUND,
        'Certificado no encontrado'
      );
    }

    // Verificar que no esté ya eliminado
    if (certificate.status === CertificateStatus.DELETED) {
      throw new ValidationError(
        ErrorCode.CERTIFICATE_ALREADY_DELETED,
        'El certificado ya está eliminado'
      );
    }

    // Actualizar el status
    const updatedCertificate: Certificate = {
      ...certificate,
      status: CertificateStatus.DELETED,
      updatedAt: new Date().toISOString()
    };

    // Guardar y retornar
    return await this.certificateRepository.update(updatedCertificate);
  }
}
