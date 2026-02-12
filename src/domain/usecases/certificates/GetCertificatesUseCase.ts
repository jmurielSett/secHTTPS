import { ICertificateRepository } from '../../../infrastructure/persistence/CertificateRepository';
import { Certificate, CertificateStatus } from '../../../types/certificate';
import { ExpirationStatus } from '../../../types/shared';

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
    // Obtener todos los certificados
    let certificates = await this.certificateRepository.findAll();

    // Aplicar filtros
    if (filters.client) {
      certificates = certificates.filter(cert => cert.client === filters.client);
    }

    if (filters.server) {
      certificates = certificates.filter(cert => cert.server === filters.server);
    }

    if (filters.fileName) {
      certificates = certificates.filter(cert => cert.fileName === filters.fileName);
    }

    if (filters.status) {
      certificates = certificates.filter(cert => cert.status === filters.status);
    }

    if (filters.expirationStatus) {
      certificates = certificates.filter(cert => cert.expirationStatus === filters.expirationStatus);
    }

    return {
      total: certificates.length,
      certificates
    };
  }
}
