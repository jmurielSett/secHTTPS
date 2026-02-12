import { Certificate } from '../../types/certificate';

export interface ICertificateRepository {
  save(certificate: Certificate): Promise<Certificate>;
  findById(id: string): Promise<Certificate | null>;
  findAll(): Promise<Certificate[]>;
  update(certificate: Certificate): Promise<Certificate>;
  delete(id: string): Promise<void>;
}

export class InMemoryCertificateRepository implements ICertificateRepository {
  private certificates = new Map<string, Certificate>();

  async save(certificate: Certificate): Promise<Certificate> {
    this.certificates.set(certificate.id, certificate);
    return certificate;
  }

  async findById(id: string): Promise<Certificate | null> {
    return this.certificates.get(id) || null;
  }

  async findAll(): Promise<Certificate[]> {
    return Array.from(this.certificates.values());
  }

  async update(certificate: Certificate): Promise<Certificate> {
    this.certificates.set(certificate.id, certificate);
    return certificate;
  }

  async delete(id: string): Promise<void> {
    this.certificates.delete(id);
  }
}
