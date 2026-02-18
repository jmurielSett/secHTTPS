import { useRef, useState } from 'react';
import { CertificateStatus } from '../../../src/types/certificate';
import { ExpirationStatus } from '../../../src/types/shared';
import { trpc } from '../utils/trpc';
import { CertificateForm, CertificateFormData, CertificateFormHandle } from './CertificateForm';
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


export function CertificateModal({ certificate, onClose, canUpdate, canDelete }: Readonly<CertificateModalProps>) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const utils = trpc.useUtils?.() || {};
  const updateCertificateMutation = trpc.certificate.updateCertificate.useMutation();
  // Removed unused showAddContact state
  const formRef = useRef<CertificateFormHandle>(null);

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

  // (Legacy) Add contact logic is not used in edit mode, handled by CertificateForm

  return (
    <div className="certificate-modal-overlay">
      <dialog className="certificate-modal-content" open>
        <div className="modal-header">
          <h2>📄 {certificate.fileName}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {isEditing ? (
          <div className="create-certificate-modal-overlay">
            <div className="create-certificate-modal-content" role="dialog" aria-modal="true">
              <div className="create-modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                <h2 style={{ color: '#6c63ff', fontWeight: 600, fontSize: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span role="img" aria-label="Editar">✏️</span> Editar Certificado
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button
                    className="create-btn"
                    type="button"
                    onClick={() => formRef.current?.submit()}
                    disabled={isSubmitting || updateCertificateMutation.status === 'pending'}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <span style={{ fontSize: '1.1em', lineHeight: 1, display: 'inline-block' }}>💾</span>
                    <span style={{ display: 'inline-block' }}>Guardar Cambios</span>
                  </button>
                  <button className="close-button" onClick={() => setIsEditing(false)}>×</button>
                </div>
              </div>
              <div className="create-modal-body">
                <CertificateForm
                  ref={formRef}
                  initialData={{
                    fileName: certificate.fileName,
                    client: certificate.client,
                    server: certificate.server,
                    startDate: certificate.startDate.split('T')[0],
                    expirationDate: certificate.expirationDate.split('T')[0],
                    filePath: certificate.filePath,
                    configPath: certificate.configPath,
                    responsibleContacts: certificate.responsibleContacts,
                  }}
                  isSubmitting={isSubmitting || updateCertificateMutation.status === 'pending'}
                  submitLabel="Guardar Cambios"
                  onCancel={() => setIsEditing(false)}
                  onSubmit={async (data: CertificateFormData) => {
                                      // readonly={false} (default is false)
                    setIsSubmitting(true);
                    try {
                      await updateCertificateMutation.mutateAsync({
                        id: certificate.id,
                        data: {
                          ...data,
                        },
                      });
                      setIsEditing(false);
                      if (utils.certificate?.getCertificates?.invalidate) {
                        await utils.certificate.getCertificates.invalidate();
                      }
                    } catch (err) {
                      alert('Error al actualizar el certificado. Inténtalo de nuevo.');
                      console.error('Error al actualizar certificado', err);
                    } finally {
                      setIsSubmitting(false);
                    }
                  }}
                />
              </div>
            </div>
          </div>
        ) : (
          <>
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
                      {(() => {
                        if (certificate.expirationStatus === ExpirationStatus.EXPIRED) return '⚠️ ';
                        if (certificate.expirationStatus === ExpirationStatus.WARNING) return '⏰ ';
                        return '✓ ';
                      })()}
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
                </div>
                <div className="contacts-table-wrapper">
                  <table className="contacts-table">
                    <thead>
                      <tr>
                        <th>Idioma</th>
                        <th>Nombre</th>
                        <th>Email</th>
                      </tr>
                    </thead>
                    <tbody>
                      {certificate.responsibleContacts.length === 0 ? (
                        <tr>
                          <td colSpan={3} style={{ textAlign: 'center', color: '#888', padding: 12 }}>No hay responsables asignados.</td>
                        </tr>
                      ) : (
                        certificate.responsibleContacts.map((contact, idx) => (
                          <tr key={contact.email + idx}>
                            <td>{getLanguageFlag(contact.language)} {getLanguageName(contact.language)}</td>
                            <td>{contact.name || <span style={{ color: '#aaa' }}>(Sin nombre)</span>}</td>
                            <td>{contact.email}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
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
              {canUpdate && (
                <button className="add-contact-btn" style={{ fontWeight: 600, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8 }} onClick={() => setIsEditing(true)}>
                  <span style={{ fontSize: 20, lineHeight: 1, display: 'inline-block' }}>✏️</span>
                  Editar
                </button>
              )}
              {canDelete && (
                <button className="btn-danger">🗑️ Eliminar Certificado</button>
              )}
            </div>
          </>
        )}
      </dialog>
    </div>
  );
}
