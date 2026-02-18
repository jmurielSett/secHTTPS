import { useEffect, useRef, useState } from 'react';
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
  onDeleteSuccess?: (fileName: string) => void;
}

const getLanguageFlag = (languageCode: string): string => {
  const languageToFlag: Record<string, string> = {
    'es': '🇪🇸',
    'en': '🇬🇧',
    'fr': '🇫🇷',
  };
  return languageToFlag[languageCode.toLowerCase()] || '🌐';
};

const getLanguageName = (languageCode: string): string => {
  const languageNames: Record<string, string> = {
    'es': 'Español',
    'en': 'English',
    'fr': 'Français',
  };
  return languageNames[languageCode.toLowerCase()] || languageCode.toUpperCase();
};



export function CertificateModal({ certificate, onClose, canUpdate, canDelete, onDeleteSuccess }: Readonly<CertificateModalProps>) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localCertificate, setLocalCertificate] = useState(certificate);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const utils = trpc.useUtils?.() || {};
  const updateCertificateMutation = trpc.certificate.updateCertificate.useMutation();
  const deleteCertificateMutation = trpc.certificate.deleteCertificate.useMutation();
  const formRef = useRef<CertificateFormHandle>(null);

  // Keep localCertificate in sync if certificate prop changes
  useEffect(() => {
    if (certificate && certificate.id !== localCertificate?.id) {
      setLocalCertificate(certificate);
    } else if (!certificate) {
      setLocalCertificate(null);
    }
  }, [certificate]);

  if (!localCertificate) return null;

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteCertificateMutation.mutateAsync({ id: localCertificate.id });
      const name = localCertificate.fileName;
      setShowDeleteConfirm(false);
      if (utils.certificate?.getCertificates?.invalidate) {
        await utils.certificate.getCertificates.invalidate();
      }
      onClose();
      onDeleteSuccess?.(name);
    } catch {
      setDeleteError('Error al eliminar el certificado. Inténtalo de nuevo.');
    } finally {
      setIsDeleting(false);
    }
  };

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

  return (
    <>
      {/* Delete confirmation overlay */}
      {showDeleteConfirm && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.55)',
            zIndex: 2000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div style={{
            background: '#fff', borderRadius: 12,
            boxShadow: '0 8px 40px rgba(0,0,0,0.22)',
            padding: '36px 32px 28px',
            minWidth: 340, maxWidth: '90vw',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 44, marginBottom: 8 }}>🗑️</div>
            <h3 style={{ color: '#c0392b', marginBottom: 10, fontSize: 20 }}>¿Eliminar certificado?</h3>
            <p style={{ marginBottom: 6, color: '#333' }}>
              Vas a eliminar <strong>{localCertificate.fileName}</strong>.
            </p>
            <p style={{ marginBottom: 20, color: '#666', fontSize: 14 }}>
              Esta acción <strong>no se puede deshacer</strong>.
            </p>
            {deleteError && (
              <p style={{ color: '#c0392b', marginBottom: 14, fontSize: 14 }}>{deleteError}</p>
            )}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
              <button
                className="btn-secondary"
                onClick={() => { setShowDeleteConfirm(false); setDeleteError(null); }}
                disabled={isDeleting}
              >
                Cancelar
              </button>
              <button
                className="btn-danger"
                style={{ minWidth: 110 }}
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Eliminando...' : '🗑️ Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="create-certificate-modal-overlay">
      <div className="create-certificate-modal-content">
        {!isEditing && (
          <div className="modal-header">
            <h2>📄 {localCertificate.fileName}</h2>
            <button className="modal-close" onClick={() => {
              setIsEditing(false);
              setTimeout(() => {
                onClose();
              }, 0);
            }}>✕</button>
          </div>
        )}
        {isEditing ? (
          <>
            <div className="create-modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
              <h2 style={{ color: '#6c63ff', fontWeight: 600, fontSize: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 22 }}>✏️</span> Editar Certificado
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
                <button className="close-button" onClick={() => {
                  setIsEditing(false);
                  setTimeout(() => {
                    onClose();
                  }, 0);
                }}>×</button>
              </div>
            </div>
            <div className="create-modal-body">
              <CertificateForm
                ref={formRef}
                initialData={{
                  fileName: localCertificate.fileName,
                  client: localCertificate.client,
                  server: localCertificate.server,
                  startDate: localCertificate.startDate.split('T')[0],
                  expirationDate: localCertificate.expirationDate.split('T')[0],
                  filePath: localCertificate.filePath,
                  configPath: localCertificate.configPath,
                  responsibleContacts: localCertificate.responsibleContacts,
                }}
                isSubmitting={isSubmitting || updateCertificateMutation.status === 'pending'}
                submitLabel="Guardar Cambios"
                onCancel={() => setIsEditing(false)}
                onSubmit={async (data: CertificateFormData) => {
                  setIsSubmitting(true);
                  try {
                    await updateCertificateMutation.mutateAsync({
                      id: localCertificate.id,
                      data: {
                        ...data,
                      },
                    });
                    setLocalCertificate(prev => prev ? { ...prev, ...data } as Certificate : null);
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
          </>
        ) : (
          <>
            <div className="modal-body">
              {/* Estado y Expiración */}
              <div className="modal-section">
                <div className="status-badges-row">
                  <div className="badge-group">
                    <span className="badge-label">Expiración:</span>
                    <span 
                      className={`expiration-badge ${getExpirationClass(localCertificate.expirationStatus)}`}
                      title={getExpirationTooltip(localCertificate.expirationStatus)}
                    >
                      {(() => {
                        if (localCertificate.expirationStatus === ExpirationStatus.EXPIRED) return '⚠️ ';
                        if (localCertificate.expirationStatus === ExpirationStatus.WARNING) return '⏰ ';
                        return '✓ ';
                      })()}
                      {getExpirationLabel(localCertificate.expirationStatus)}
                    </span>
                  </div>
                  <div className="badge-group">
                    <span className="badge-label">Estado:</span>
                    <span className={`status-badge ${localCertificate.status === CertificateStatus.ACTIVE ? 'active' : 'deleted'}`}>
                      {localCertificate.status === CertificateStatus.ACTIVE ? '✓ Activo' : '✕ Eliminado'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Información general */}
              <div className="modal-section">
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">👤 Cliente</span>
                    <span className="info-value">{localCertificate.client}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">🖥️ Servidor</span>
                    <span className="info-value">{localCertificate.server}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">📅 Fecha inicio</span>
                    <span className="info-value">{formatDateOnly(localCertificate.startDate)}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">⏰ Fecha expiración</span>
                    <span className="info-value">{formatDateOnly(localCertificate.expirationDate)}</span>
                  </div>
                  <div className="info-item full-width">
                    <span className="info-label">📂 Ruta archivo</span>
                    <span className="info-value">{localCertificate.filePath}</span>
                  </div>
                  <div className="info-item full-width">
                    <span className="info-label">⚙️ Ruta configuración</span>
                    <span className="info-value">{localCertificate.configPath}</span>
                  </div>
                </div>
              </div>

              {/* Responsables */}
                <div className="modal-section">
                  <section className="form-section">
                    <h3 style={{ textAlign: 'center', margin: '2rem 0 1rem 0' }}>
                      👥 Contactos Responsables
                    </h3>
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
                        {localCertificate.responsibleContacts.length === 0 ? (
                        <tr>
                          <td colSpan={3} style={{ textAlign: 'center', color: '#888', padding: 12 }}>No hay responsables asignados.</td>
                        </tr>
                      ) : (
                          localCertificate.responsibleContacts.map((contact, idx) => (
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
                  </section>
              </div>

              {/* Metadatos */}
              <div className="modal-section metadata">
                <div className="metadata-item">
                  <span className="metadata-label">ID:</span>
                  <span className="metadata-value">{localCertificate.id}</span>
                </div>
                <div className="metadata-item">
                  <span className="metadata-label">Creado:</span>
                  <span className="metadata-value">{formatDate(localCertificate.createdAt)}</span>
                </div>
                <div className="metadata-item">
                  <span className="metadata-label">Actualizado:</span>
                  <span className="metadata-value">{formatDate(localCertificate.updatedAt)}</span>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => {
                setIsEditing(false);
                setTimeout(() => {
                  onClose();
                }, 0);
              }}>Cerrar</button>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                {canUpdate && (
                  <button className="btn-edit" onClick={() => setIsEditing(true)}>
                    <span style={{ fontSize: '1.1em', lineHeight: 1 }}>{'✏️'}</span>
                    {' '}Editar Certificado
                  </button>
                )}
                {canDelete && (
                  <button
                    className="btn-danger"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    🗑️ Eliminar Certificado
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
    </>
  );
}
