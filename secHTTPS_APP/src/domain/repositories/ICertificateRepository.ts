import { Certificate } from '../../types/certificate';
import { GetCertificatesFilters } from '../usecases/certificates/GetCertificatesUseCase';

/**
 * Interfaz del repositorio de certificados
 * Define el contrato que debe cumplir cualquier implementación de persistencia
 * (Inversión de Dependencias - Clean Architecture)
 */
export interface ICertificateRepository {
  save(certificate: Certificate): Promise<Certificate>;
  findById(id: string): Promise<Certificate | null>;
  findAll(filters?: GetCertificatesFilters): Promise<Certificate[]>;
  update(certificate: Certificate): Promise<Certificate>;
  delete(id: string): Promise<void>;
}
