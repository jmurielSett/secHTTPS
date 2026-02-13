import { Certificate } from '../../../types/certificate';
import { ErrorCode, NotFoundError, ValidationError } from '../../../types/errors';
import { ICertificateRepository } from '../../repositories/ICertificateRepository';

export class GetCertificateByIdUseCase {
  constructor(private readonly certificateRepository: ICertificateRepository) {}

  async execute(id: string): Promise<Certificate> {
    // Validar que el ID sea un UUID válido
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw new ValidationError(
        ErrorCode.INVALID_UUID,
        'El ID proporcionado no es un UUID válido'
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

    return certificate;
  }
}
