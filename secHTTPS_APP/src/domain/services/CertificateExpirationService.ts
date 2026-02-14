import { ExpirationStatus } from '../../types/shared';

/**
 * Servicio de dominio para calcular el estado de expiración de certificados
 * Regla de negocio: 
 * - EXPIRED: fecha de expiración ya pasó
 * - WARNING: expira en 7 días o menos
 * - NORMAL: expira en más de 7 días
 */
export class CertificateExpirationService {
  static calculateExpirationStatus(expirationDate: string): ExpirationStatus {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const expDate = new Date(expirationDate);
    expDate.setHours(0, 0, 0, 0);
    
    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return ExpirationStatus.EXPIRED;
    } else if (diffDays <= 7) {
      return ExpirationStatus.WARNING;
    } else {
      return ExpirationStatus.NORMAL;
    }
  }
}
