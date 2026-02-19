import { forwardRef, SyntheticEvent, useImperativeHandle, useRef, useState } from 'react';
import './CreateCertificateModal.css';

export interface ResponsibleContact {
  email: string;
  language: string;
  name?: string;
}

export interface CertificateFormData {
  fileName: string;
  startDate: string;
  expirationDate: string;
  server: string;
  filePath: string;
  client: string;
  configPath: string;
  responsibleContacts: ResponsibleContact[];
}

export interface CertificateFormHandle {
  submit: () => void;
}

interface CertificateFormProps {
  initialData: CertificateFormData;
  onSubmit: (data: CertificateFormData) => void | Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  submitLabel?: string;
  readonly?: boolean;
}

export const CertificateForm = forwardRef<CertificateFormHandle, CertificateFormProps>(
  ({ initialData, onSubmit, onCancel, isSubmitting = false, submitLabel = 'Guardar', readonly = false }, ref) => {
    const [formData, setFormData] = useState<CertificateFormData>(initialData);
    const [newContact, setNewContact] = useState<ResponsibleContact>({ email: '', language: 'es', name: '' });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleInputChange = (field: keyof CertificateFormData, value: string) => {
      setFormData(prev => ({ ...prev, [field]: value }));
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
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newContact.email)) {
        setErrors(prev => ({ ...prev, contactEmail: 'Email inválido' }));
        return;
      }
      setFormData(prev => ({
        ...prev,
        responsibleContacts: [...prev.responsibleContacts, { ...newContact }],
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
        responsibleContacts: prev.responsibleContacts.filter((_, i) => i !== index),
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

    const formRef = useRef<HTMLFormElement>(null);
    const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!validateForm()) return;
      await onSubmit(formData);
    };
    useImperativeHandle(ref, () => ({
      submit: () => {
        if (formRef.current) {
          formRef.current.requestSubmit();
        }
      },
    }));

    return (
      <form className="certificate-form" ref={formRef} onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-field">
            <label htmlFor="fileName">Nombre del archivo *</label>
            <input id="fileName" type="text" value={formData.fileName} onChange={e => handleInputChange('fileName', e.target.value)} disabled={readonly} />
            {errors.fileName && <span className="error-message">{errors.fileName}</span>}
          </div>
          <div className="form-field">
            <label htmlFor="client">Cliente *</label>
            <input id="client" type="text" value={formData.client} onChange={e => handleInputChange('client', e.target.value)} disabled={readonly} />
            {errors.client && <span className="error-message">{errors.client}</span>}
          </div>
          <div className="form-field">
            <label htmlFor="server">Servidor *</label>
            <input id="server" type="text" value={formData.server} onChange={e => handleInputChange('server', e.target.value)} disabled={readonly} />
            {errors.server && <span className="error-message">{errors.server}</span>}
          </div>
          <div className="form-field">
            <label htmlFor="filePath">Ruta del archivo *</label>
            <input id="filePath" type="text" value={formData.filePath} onChange={e => handleInputChange('filePath', e.target.value)} disabled={readonly} />
            {errors.filePath && <span className="error-message">{errors.filePath}</span>}
          </div>
          <div className="form-field">
            <label htmlFor="configPath">Ruta de configuración *</label>
            <input id="configPath" type="text" value={formData.configPath} onChange={e => handleInputChange('configPath', e.target.value)} disabled={readonly} />
            {errors.configPath && <span className="error-message">{errors.configPath}</span>}
          </div>
          <div className="form-field">
            <label htmlFor="startDate">Fecha de inicio *</label>
            <input id="startDate" type="date" value={formData.startDate} onChange={e => handleInputChange('startDate', e.target.value)} disabled={readonly} />
            {errors.startDate && <span className="error-message">{errors.startDate}</span>}
          </div>
          <div className="form-field">
            <label htmlFor="expirationDate">Fecha de expiración *</label>
            <input id="expirationDate" type="date" value={formData.expirationDate} onChange={e => handleInputChange('expirationDate', e.target.value)} disabled={readonly} />
            {errors.expirationDate && <span className="error-message">{errors.expirationDate}</span>}
          </div>
        </div>
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
                    {!readonly && <th>Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {formData.responsibleContacts.map((contact, index) => (
                    <tr key={`${contact.email}-${index}`}>
                      <td>{contact.language}</td>
                      <td>{contact.name || '-'}</td>
                      <td>{contact.email}</td>
                      {!readonly && (
                        <td>
                          <button type="button" onClick={() => handleRemoveContact(index)}>
                            🗑️
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!readonly && (
            <div className="add-contact-form">
              <div className="contact-form-row">
                <div className="form-field flex-2">
                  <label htmlFor="contactEmail">Email *</label>
                  <input id="contactEmail" type="email" value={newContact.email} onChange={e => setNewContact(prev => ({ ...prev, email: e.target.value }))} />
                  {errors.contactEmail && <span className="error-message">{errors.contactEmail}</span>}
                </div>
                <div className="form-field flex-1">
                  <label htmlFor="contactLanguage">Idioma *</label>
                  <select id="contactLanguage" value={newContact.language} onChange={e => setNewContact(prev => ({ ...prev, language: e.target.value }))}>
                    <option value="es">Español</option>
                    <option value="en">English</option>
                    <option value="ca">Català</option>
                  </select>
                </div>
                <div className="form-field flex-1">
                  <label htmlFor="contactName">Nombre (opcional)</label>
                  <input id="contactName" type="text" value={newContact.name} onChange={e => setNewContact(prev => ({ ...prev, name: e.target.value }))} />
                </div>
                <button type="button" className="add-contact-btn" onClick={handleAddContact}>+ Agregar</button>
              </div>
            </div>
          )}
          {errors.responsibleContacts && <span className="error-message">{errors.responsibleContacts}</span>}
        </section>
        <div className="form-footer" style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginTop: '2.5rem' }}>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-start' }}>
            <button
              type="button"
              className="cancel-btn"
              onClick={onCancel}
              disabled={isSubmitting}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <span style={{display: 'inline-block', width: '1.5em', height: '1.5em', verticalAlign: 'middle'}}>
                <svg width="1.5em" height="1.5em" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style={{filter: 'drop-shadow(0 1px 2px rgba(239,68,68,0.12))'}}>
                  <circle cx="16" cy="16" r="15" fill="#f87171" stroke="#ef4444" strokeWidth="2"/>
                  <path d="M11 11L21 21M11 21L21 11" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
              </span>
              <span style={{display: 'inline-block'}}>Cancelar</span>
            </button>
          </div>
        </div>
      </form>
    );
  }
);
