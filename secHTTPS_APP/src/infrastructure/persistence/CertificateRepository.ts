import { ICertificateRepository } from '../../domain/repositories/ICertificateRepository';
import { GetCertificatesFilters } from '../../domain/usecases/certificates/GetCertificatesUseCase';
import { Certificate } from '../../types/certificate';

export class InMemoryCertificateRepository implements ICertificateRepository {
  private readonly certificates = new Map<string, Certificate>();

  async save(certificate: Certificate): Promise<Certificate> {
    this.certificates.set(certificate.id, certificate);
    return certificate;
  }

  async findById(id: string): Promise<Certificate | null> {
    return this.certificates.get(id) || null;
  }

  async findAll(filters?: GetCertificatesFilters): Promise<Certificate[]> {
    let certificates = Array.from(this.certificates.values());

    if (!filters) {
      return certificates;
    }

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

    return certificates;
  }

  async update(certificate: Certificate): Promise<Certificate> {
    this.certificates.set(certificate.id, certificate);
    return certificate;
  }

  async delete(id: string): Promise<void> {
    this.certificates.delete(id);
  }
}
