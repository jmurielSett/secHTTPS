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

    // Búsqueda parcial: "empieza por" (case-insensitive)
    if (filters.client) {
      const searchTerm = filters.client.toLowerCase();
      certificates = certificates.filter(cert => 
        cert.client.toLowerCase().startsWith(searchTerm)
      );
    }

    if (filters.server) {
      const searchTerm = filters.server.toLowerCase();
      certificates = certificates.filter(cert => 
        cert.server.toLowerCase().startsWith(searchTerm)
      );
    }

    if (filters.fileName) {
      const searchTerm = filters.fileName.toLowerCase();
      certificates = certificates.filter(cert => 
        cert.fileName.toLowerCase().startsWith(searchTerm)
      );
    }

    if (filters.responsibleEmail) {
      const searchTerm = filters.responsibleEmail.toLowerCase();
      certificates = certificates.filter(cert =>
        cert.responsibleContacts.some(contact => 
          contact.email.toLowerCase().startsWith(searchTerm)
        )
      );
    }

    // Filtros exactos para enums
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
