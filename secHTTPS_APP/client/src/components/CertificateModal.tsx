import { useState } from 'react';
import { CertificateStatus } from '../../../src/types/certificate';
import { ExpirationStatus } from '../../../src/types/shared';
import './CertificateModal.css';

interface ResponsibleContact {
  email: string;
  language: string;
  name?: string;
}

interface Certificate {
  id: string;
  fileName: string;
  client: string;
  server: string;
  startDate: string;
  expirationDate: string;
  filePath: string;
  configPath: string;
  status: CertificateStatus;
  expirationStatus: ExpirationStatus;
  responsibleContacts: ResponsibleContact[];
  createdAt: string;
  updatedAt: string;
}

interface CertificateModalProps {
  certificate: Certificate | null;
  onClose: () => void;
  canUpdate?: boolean;
  canDelete?: boolean;
}

const getLanguageFlag = (languageCode: string): string => {
  const languageToFlag: Record<string, string> = {
    'es': '🇪🇸',
    'en': '🇬🇧',
    'fr': '🇫🇷',
    'de': '🇩🇪',
    'it': '🇮🇹',
    'pt': '🇵🇹',
    'nl': '🇳🇱',
    'pl': '🇵🇱',
    'ru': '🇷🇺',
    'ja': '🇯🇵',
    'zh': '🇨🇳',
    'ko': '🇰🇷',
  };
  return languageToFlag[languageCode.toLowerCase()] || '🌐';
};

const getLanguageName = (languageCode: string): string => {
  const languageNames: Record<string, string> = {
    'es': 'Español',
    'en': 'English',
    'fr': 'Français',
    'de': 'Deutsch',
    'it': 'Italiano',
    'pt': 'Português',
    'nl': 'Nederlands',
    'pl': 'Polski',
    'ru': 'Русский',
    'ja': '日本語',
    'zh': '中文',
    'ko': '한국어',
  };
  return languageNames[languageCode.toLowerCase()] || languageCode.toUpperCase();
};

export function CertificateModal({ certificate, onClose, canUpdate = false, canDelete = false }: Readonly<CertificateModalProps>) {
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContact, setNewContact] = useState<ResponsibleContact>({
    email: '',
    language: 'es',
    name: ''
  });

  if (!certificate) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateOnly = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getExpirationTooltip = (status: ExpirationStatus) => {
    switch (status) {
      case ExpirationStatus.NORMAL:
        return 'Certificado vigente: El certificado está activo y lejos de su fecha de expiración';
      case ExpirationStatus.WARNING:
        return 'Próximo a vencer: El certificado está cerca de su fecha de expiración y requiere atención';
      case ExpirationStatus.EXPIRED:
        return 'Certificado vencido: El certificado ha expirado y debe renovarse inmediatamente';
      default:
        return 'Estado de expiración del certificado';
    }
  };

  const getExpirationLabel = (status: ExpirationStatus) => {
    switch (status) {
      case ExpirationStatus.NORMAL:
        return 'Normal';
      case ExpirationStatus.WARNING:
        return 'Próximo a expirar';
      case ExpirationStatus.EXPIRED:
        return 'Expirado';
      default:
        return status;
    }
  };

  const getExpirationClass = (status: ExpirationStatus) => {
    switch (status) {
      case ExpirationStatus.NORMAL:
        return 'badge-normal';
      case ExpirationStatus.WARNING:
        return 'badge-warning';
      case ExpirationStatus.EXPIRED:
        return 'badge-expired';
      default:
        return 'badge-normal';
    }
  };

  const handleAddContact = () => {
    if (newContact.email.trim()) {
      // TODO: Implementar lógica para añadir contacto
      console.log('Añadir contacto:', newContact);
      setNewContact({ email: '', language: 'es', name: '' });
      setShowAddContact(false);
    }
  };

  return (
    <div 
      className="certificate-modal-overlay"
    >
      <div 
        className="certificate-modal-content"
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-header">
          <h2>📄 {certificate.fileName}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* Estado y Expiración */}
          <div className="modal-section">
            <div className="status-badges-row">
              <div className="badge-group">
                <span className="badge-label">Expiración:</span>
                <span 
                  className={`expiration-badge ${getExpirationClass(certificate.expirationStatus)}`}
                  title={getExpirationTooltip(certificate.expirationStatus)}
                >
                  {certificate.expirationStatus === ExpirationStatus.EXPIRED ? '⚠️ ' : certificate.expirationStatus === ExpirationStatus.WARNING ? '⏰ ' : '✓ '}
                  {getExpirationLabel(certificate.expirationStatus)}
                </span>
              </div>
              <div className="badge-group">
                <span className="badge-label">Estado:</span>
                <span className={`status-badge ${certificate.status === CertificateStatus.ACTIVE ? 'active' : 'deleted'}`}>
                  {certificate.status === CertificateStatus.ACTIVE ? '✓ Activo' : '✕ Eliminado'}
                </span>
              </div>
            </div>
          </div>

          {/* Información general */}
          <div className="modal-section">
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">👤 Cliente</span>
                <span className="info-value">{certificate.client}</span>
              </div>
              <div className="info-item">
                <span className="info-label">🖥️ Servidor</span>
                <span className="info-value">{certificate.server}</span>
              </div>
              <div className="info-item">
                <span className="info-label">📅 Fecha inicio</span>
                <span className="info-value">{formatDateOnly(certificate.startDate)}</span>
              </div>
              <div className="info-item">
                <span className="info-label">⏰ Fecha expiración</span>
                <span className="info-value">{formatDateOnly(certificate.expirationDate)}</span>
              </div>
              <div className="info-item full-width">
                <span className="info-label">📂 Ruta archivo</span>
                <span className="info-value">{certificate.filePath}</span>
              </div>
              <div className="info-item full-width">
                <span className="info-label">⚙️ Ruta configuración</span>
                <span className="info-value">{certificate.configPath}</span>
              </div>
            </div>
          </div>

          {/* Responsables */}
          <div className="modal-section">
            <div className="section-header">
              <h3>👥 Responsables</h3>
              {canUpdate && (
                <button 
                  className="btn-add-contact" 
                  onClick={() => setShowAddContact(!showAddContact)}
                >
                  {showAddContact ? '✕ Cancelar' : '+ Añadir Responsable'}
                </button>
              )}
            </div>

            {/* Formulario añadir contacto */}
            {showAddContact && (
              <div className="add-contact-form">
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="contact-language">Idioma</label>
                    <select 
                      id="contact-language"
                      value={newContact.language}
                      onChange={(e) => setNewContact({...newContact, language: e.target.value})}
                    >
                      <option value="es">🇪🇸 Español</option>
                      <option value="en">🇬🇧 English</option>
                      <option value="fr">🇫🇷 Français</option>
                      <option value="de">🇩🇪 Deutsch</option>
                      <option value="it">🇮🇹 Italiano</option>
                      <option value="pt">🇵🇹 Português</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="contact-name">Nombre (opcional)</label>
                    <input 
                      id="contact-name"
                      type="text"
                      value={newContact.name}
                      onChange={(e) => setNewContact({...newContact, name: e.target.value})}
                      placeholder="Juan Pérez"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="contact-email">Email *</label>
                    <input 
                      id="contact-email"
                      type="email"
                      value={newContact.email}
                      onChange={(e) => setNewContact({...newContact, email: e.target.value})}
                      placeholder="contacto@ejemplo.com"
                      required
                    />
                  </div>
                </div>
                <button 
                  className="btn-save-contact" 
                  onClick={handleAddContact}
                  disabled={!canUpdate}
                >
                  ✓ Guardar Responsable
                </button>
              </div>
            )}

            {/* Tabla de responsables */}
            {certificate.responsibleContacts.length > 0 ? (
              <div className="contacts-table-wrapper">
                <table className="contacts-table">
                  <thead>
                    <tr>
                      <th>Idioma</th>
                      <th>Nombre</th>
                      <th>Email</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {certificate.responsibleContacts.map((contact) => (
                      <tr key={contact.email}>
                        <td className="flag-cell">
                          <span className="flag" title={getLanguageName(contact.language)}>
                            {getLanguageFlag(contact.language)}
                          </span>
                        </td>
                        <td>{contact.name || '-'}</td>
                        <td>{contact.email}</td>
                        <td>
                          {canUpdate && (
                            <button className="btn-icon" title="Eliminar">🗑️</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="no-contacts">No hay responsables asignados</p>
            )}
          </div>

          {/* Metadatos */}
          <div className="modal-section metadata">
            <div className="metadata-item">
              <span className="metadata-label">ID:</span>
              <span className="metadata-value">{certificate.id}</span>
            </div>
            <div className="metadata-item">
              <span className="metadata-label">Creado:</span>
              <span className="metadata-value">{formatDate(certificate.createdAt)}</span>
            </div>
            <div className="metadata-item">
              <span className="metadata-label">Actualizado:</span>
              <span className="metadata-value">{formatDate(certificate.updatedAt)}</span>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cerrar</button>
          {canDelete && (
            <button className="btn-danger">🗑️ Eliminar Certificado</button>
          )}
        </div>
      </div>
    </div>
  );
}
