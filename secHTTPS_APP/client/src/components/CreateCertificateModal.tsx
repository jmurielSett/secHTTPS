import React, { useRef, useState } from 'react';
import { CertificateForm, CertificateFormData, CertificateFormHandle } from './CertificateForm';
import './CreateCertificateModal.css';

interface ResponsibleContact {
  email: string;
  language: string;
  name?: string;
}

interface CreateCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: CreateCertificateData) => Promise<void>;
}

export type CreateCertificateData = CertificateFormData;

const getLanguageFlag = (lang: string): string => {
  const flags: Record<string, string> = {
    'es': '🇪🇸',
    'en': '🇬🇧',
    'fr': '🇫🇷',
    'de': '🇩🇪',
    'it': '🇮🇹',
    'pt': '🇵🇹'
  };
  return flags[lang.toLowerCase()] || '🌐';
};

const getLanguageName = (lang: string): string => {
  const names: Record<string, string> = {
    'es': 'Español',
    'en': 'English',
    'fr': 'Français',
    'de': 'Deutsch',
    'it': 'Italiano',
    'pt': 'Português'
  };
  return names[lang.toLowerCase()] || lang;
};

export const CreateCertificateModal: React.FC<CreateCertificateModalProps> = ({ isOpen, onClose, onCreate }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formRef = useRef<CertificateFormHandle>(null);
  if (!isOpen) return null;

  return (
    <div className="create-certificate-modal-overlay">
      <dialog className="create-certificate-modal-content" open>
        <div className="create-modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <h2>✨ Crear Nuevo Certificado</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              className="create-btn"
              type="button"
              onClick={() => formRef.current?.submit()}
              disabled={isSubmitting}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <span style={{ fontSize: '1.1em', lineHeight: 1, display: 'inline-block' }}>💾</span>
              <span style={{ display: 'inline-block' }}>Crear Certificado</span>
            </button>
            <button className="close-button" onClick={onClose}>×</button>
          </div>
        </div>
        <div className="create-modal-body">
          <CertificateForm
            ref={formRef}
            initialData={{
              fileName: '',
              startDate: '',
              expirationDate: '',
              server: '',
              filePath: '',
              client: '',
              configPath: '',
              responsibleContacts: [],
            }}
            isSubmitting={isSubmitting}
            submitLabel="Crear Certificado"
            onCancel={onClose}
            onSubmit={async (data: CertificateFormData) => {
              setIsSubmitting(true);
              try {
                await onCreate(data);
                onClose();
              } catch (error) {
                alert('Error al crear el certificado. Inténtelo de nuevo.');
                console.error('Error al crear certificado:', error);
              } finally {
                setIsSubmitting(false);
              }
            }}
          />
        </div>
      </dialog>
    </div>
  );
};
