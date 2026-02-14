import { Certificate, CertificateStatus } from '../../../types/certificate';
import { ExpirationStatus } from '../../../types/shared';
import { ICertificateRepository } from '../../repositories/ICertificateRepository';

export interface GetCertificatesFilters {
  client?: string;
  server?: string;
  fileName?: string;
  status?: CertificateStatus;
  expirationStatus?: ExpirationStatus;
}

export interface GetCertificatesResponse {
  total: number;
  certificates: Certificate[];
}

export class GetCertificatesUseCase {
  constructor(private readonly certificateRepository: ICertificateRepository) {}

  async execute(filters: GetCertificatesFilters): Promise<GetCertificatesResponse> {
    // El filtrado se realiza en el repository (a nivel de BD para PostgreSQL)
    const certificates = await this.certificateRepository.findAll(filters);

    return {
      total: certificates.length,
      certificates
    };
  }
}
