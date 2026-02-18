import './CertificateCard.css';

interface Contact {
  email: string;
}

interface Certificate {
  id: string;
  fileName: string;
  client: string;
  server: string;
  status: string;
  expirationStatus: string;
  startDate: string;
  expirationDate: string;
  responsibleContacts: Contact[];
}

interface CertificateCardProps {
  certificate: Certificate;
  onClick?: () => void;
}

export function CertificateCard({ certificate, onClick }: Readonly<CertificateCardProps>) {
  const getExpirationTooltip = (status: string) => {
    switch (status.toUpperCase()) {
      case 'NORMAL':
        return 'Certificado vigente: El certificado está activo y lejos de su fecha de expiración';
      case 'WARNING':
        return 'Próximo a vencer: El certificado está cerca de su fecha de expiración y requiere atención';
      case 'EXPIRED':
        return 'Certificado vencido: El certificado ha expirado y debe renovarse inmediatamente';
      default:
        return 'Estado de expiración del certificado';
    }
  };

  return (
    <div 
      className="certificate-card" 
      onClick={onClick} 
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()} 
      role="button"
      tabIndex={onClick ? 0 : undefined}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <h3 title={certificate.fileName}>{certificate.fileName}</h3>
      
      {/* Header con badge de expiración */}
      <div className="cert-header">
        <span 
          className={`expiration-badge ${certificate.expirationStatus.toLowerCase()}`}
          title={getExpirationTooltip(certificate.expirationStatus)}
        >
          {certificate.expirationStatus}
        </span>
      </div>
      
      {/* Datos en grid de 2 columnas */}
      <div className="cert-info">
        <div className="cert-row">
          <span className="cert-label">Cliente:</span>
          <span className="cert-value" title={certificate.client}>{certificate.client}</span>
        </div>
        <div className="cert-row">
          <span className="cert-label">Servidor:</span>
          <span className="cert-value" title={certificate.server}>{certificate.server}</span>
        </div>
        <div className="cert-row">
          <span className="cert-label">Inicio:</span>
          <span className="cert-value">{new Date(certificate.startDate).toLocaleDateString()}</span>
        </div>
        <div className="cert-row">
          <span className="cert-label">Expira:</span>
          <span className="cert-value">{new Date(certificate.expirationDate).toLocaleDateString()}</span>
        </div>
        <div className="cert-row cert-row-full">
          <span className="cert-label">Contactos:</span>
          <span className="cert-value" title={certificate.responsibleContacts.map((c) => c.email).join(', ')}>
            {certificate.responsibleContacts.map((c) => c.email).join(', ')}
          </span>
        </div>
      </div>
    </div>
  );
}
