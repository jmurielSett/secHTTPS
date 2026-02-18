import React, { useState } from 'react';
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

export interface CreateCertificateData {
  fileName: string;
  startDate: string;
  expirationDate: string;
  server: string;
  filePath: string;
  client: string;
  configPath: string;
  responsibleContacts: ResponsibleContact[];
}

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
  const [formData, setFormData] = useState<CreateCertificateData>({
    fileName: '',
    startDate: '',
    expirationDate: '',
    server: '',
    filePath: '',
    client: '',
    configPath: '',
    responsibleContacts: []
  });

  const [newContact, setNewContact] = useState<ResponsibleContact>({
    email: '',
    language: 'es',
    name: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const handleInputChange = (field: keyof CreateCertificateData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Limpiar error del campo cuando el usuario empieza a escribir
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleAddContact = () => {
    if (!newContact.email.trim()) {
      setErrors(prev => ({ ...prev, contactEmail: 'El email es obligatorio' }));
      return;
    }

    // Validar formato de email básico
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newContact.email)) {
      setErrors(prev => ({ ...prev, contactEmail: 'Email inválido' }));
      return;
    }

    setFormData(prev => ({
      ...prev,
      responsibleContacts: [...prev.responsibleContacts, { ...newContact }]
    }));

    setNewContact({ email: '', language: 'es', name: '' });
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.contactEmail;
      delete newErrors.responsibleContacts;
      return newErrors;
    });
  };

  const handleRemoveContact = (index: number) => {
    setFormData(prev => ({
      ...prev,
      responsibleContacts: prev.responsibleContacts.filter((_, i) => i !== index)
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.fileName.trim()) newErrors.fileName = 'Campo obligatorio';
    if (!formData.startDate) newErrors.startDate = 'Campo obligatorio';
    if (!formData.expirationDate) newErrors.expirationDate = 'Campo obligatorio';
    if (!formData.server.trim()) newErrors.server = 'Campo obligatorio';
    if (!formData.filePath.trim()) newErrors.filePath = 'Campo obligatorio';
    if (!formData.client.trim()) newErrors.client = 'Campo obligatorio';
    if (!formData.configPath.trim()) newErrors.configPath = 'Campo obligatorio';
    
    if (formData.responsibleContacts.length === 0) {
      newErrors.responsibleContacts = 'Debe agregar al menos un contacto responsable';
    }

    // Validar que expirationDate sea posterior a startDate
    if (formData.startDate && formData.expirationDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.expirationDate);
      if (end <= start) {
        newErrors.expirationDate = 'Debe ser posterior a la fecha de inicio';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await onCreate(formData);
      handleClose();
    } catch (error) {
      console.error('Error al crear certificado:', error);
      setErrors(prev => ({ ...prev, submit: 'Error al crear el certificado. Inténtelo de nuevo.' }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      fileName: '',
      startDate: '',
      expirationDate: '',
      server: '',
      filePath: '',
      client: '',
      configPath: '',
      responsibleContacts: []
    });
    setNewContact({ email: '', language: 'es', name: '' });
    setErrors({});
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div 
      className="create-certificate-modal-overlay"
    >
      <div 
        className="create-certificate-modal-content"
        role="dialog"
        aria-modal="true"
      >
        <div className="create-modal-header">
          <h2>✨ Crear Nuevo Certificado</h2>
          <button className="close-button" onClick={handleClose}>×</button>
        </div>

        <div className="create-modal-body">
          {/* Información del certificado */}
          <section className="form-section">
            <div className="form-grid">
              <div className="form-field">
                <label htmlFor="fileName">Nombre del archivo *</label>
                <input
                  id="fileName"
                  type="text"
                  value={formData.fileName}
                  onChange={(e) => handleInputChange('fileName', e.target.value)}
                  placeholder="certificado.crt"
                />
                {errors.fileName && <span className="error-message">{errors.fileName}</span>}
              </div>

              <div className="form-field">
                <label htmlFor="client">Cliente *</label>
                <input
                  id="client"
                  type="text"
                  value={formData.client}
                  onChange={(e) => handleInputChange('client', e.target.value)}
                  placeholder="Nombre del cliente"
                />
                {errors.client && <span className="error-message">{errors.client}</span>}
              </div>

              <div className="form-field">
                <label htmlFor="server">Servidor *</label>
                <input
                  id="server"
                  type="text"
                  value={formData.server}
                  onChange={(e) => handleInputChange('server', e.target.value)}
                  placeholder="server01.example.com"
                />
                {errors.server && <span className="error-message">{errors.server}</span>}
              </div>

              <div className="form-field">
                <label htmlFor="filePath">Ruta del archivo *</label>
                <input
                  id="filePath"
                  type="text"
                  value={formData.filePath}
                  onChange={(e) => handleInputChange('filePath', e.target.value)}
                  placeholder="/etc/ssl/certs/certificado.crt"
                />
                {errors.filePath && <span className="error-message">{errors.filePath}</span>}
              </div>

              <div className="form-field">
                <label htmlFor="configPath">Ruta de configuración *</label>
                <input
                  id="configPath"
                  type="text"
                  value={formData.configPath}
                  onChange={(e) => handleInputChange('configPath', e.target.value)}
                  placeholder="/etc/httpd/conf.d/ssl.conf"
                />
                {errors.configPath && <span className="error-message">{errors.configPath}</span>}
              </div>

              <div className="form-field">
                <label htmlFor="startDate">Fecha de inicio *</label>
                <input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleInputChange('startDate', e.target.value)}
                />
                {errors.startDate && <span className="error-message">{errors.startDate}</span>}
              </div>

              <div className="form-field">
                <label htmlFor="expirationDate">Fecha de expiración *</label>
                <input
                  id="expirationDate"
                  type="date"
                  value={formData.expirationDate}
                  onChange={(e) => handleInputChange('expirationDate', e.target.value)}
                />
                {errors.expirationDate && <span className="error-message">{errors.expirationDate}</span>}
              </div>
            </div>
          </section>

          {/* Contactos responsables */}
          <section className="form-section">
            <h3>👥 Contactos Responsables</h3>
            
            {formData.responsibleContacts.length > 0 && (
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
                    {formData.responsibleContacts.map((contact, index) => (
                      <tr key={`${contact.email}-${index}`}>
                        <td className="flag-cell">
                          <span className="flag" title={getLanguageName(contact.language)}>
                            {getLanguageFlag(contact.language)}
                          </span>
                        </td>
                        <td>{contact.name || '-'}</td>
                        <td>{contact.email}</td>
                        <td>
                          <button 
                            className="btn-icon"
                            onClick={() => handleRemoveContact(index)}
                            type="button"
                            title="Eliminar"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="add-contact-form">
              <div className="contact-form-row">
                <div className="form-field flex-2">
                  <label htmlFor="contactEmail">Email *</label>
                  <input
                    id="contactEmail"
                    type="email"
                    value={newContact.email}
                    onChange={(e) => setNewContact(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="responsable@example.com"
                  />
                  {errors.contactEmail && <span className="error-message">{errors.contactEmail}</span>}
                </div>

                <div className="form-field flex-1">
                  <label htmlFor="contactLanguage">Idioma *</label>
                  <select
                    id="contactLanguage"
                    value={newContact.language}
                    onChange={(e) => setNewContact(prev => ({ ...prev, language: e.target.value }))}
                  >
                    <option value="es">{getLanguageFlag('es')} Español</option>
                    <option value="en">{getLanguageFlag('en')} English</option>
                    <option value="fr">{getLanguageFlag('fr')} Français</option>
                    <option value="de">{getLanguageFlag('de')} Deutsch</option>
                    <option value="it">{getLanguageFlag('it')} Italiano</option>
                    <option value="pt">{getLanguageFlag('pt')} Português</option>
                  </select>
                </div>

                <div className="form-field flex-1">
                  <label htmlFor="contactName">Nombre (opcional)</label>
                  <input
                    id="contactName"
                    type="text"
                    value={newContact.name}
                    onChange={(e) => setNewContact(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Juan Pérez"
                  />
                </div>

                <button 
                  className="add-contact-btn"
                  onClick={handleAddContact}
                  type="button"
                >
                  + Agregar
                </button>
              </div>
            </div>
            {errors.responsibleContacts && (
              <span className="error-message">{errors.responsibleContacts}</span>
            )}
          </section>

          {errors.submit && (
            <div className="submit-error">
              {errors.submit}
            </div>
          )}
        </div>

        <div className="create-modal-footer">
          <button className="cancel-btn" onClick={handleClose} disabled={isSubmitting}>
            Cancelar
          </button>
          <button className="create-btn" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Creando...' : 'Crear Certificado'}
          </button>
        </div>
      </div>
    </div>
  );
};
