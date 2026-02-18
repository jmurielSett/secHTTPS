import { useEffect, useState } from 'react';
import { CertificateStatus } from '../../../src/types/certificate';
import { ExpirationStatus } from '../../../src/types/shared';
import './CertificateFilters.css';

export interface CertificateFiltersValue {
  client?: string;
  server?: string;
  fileName?: string;
  responsibleEmail?: string;
  status?: CertificateStatus;
  expirationStatus?: ExpirationStatus;
}

interface CertificateFiltersProps {
  onFiltersChange: (filters: CertificateFiltersValue) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function CertificateFilters({ onFiltersChange, isCollapsed = false, onToggleCollapse }: Readonly<CertificateFiltersProps>) {
  const [filters, setFilters] = useState<CertificateFiltersValue>({ status: CertificateStatus.ACTIVE });

  // Notificar filtros iniciales al montar el componente
  useEffect(() => {
    onFiltersChange({ status: CertificateStatus.ACTIVE });
  }, []);

  const handleInputChange = (field: keyof CertificateFiltersValue, value: string) => {
    const newFilters = {
      ...filters,
      [field]: value || undefined
    };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleClearFilters = () => {
    setFilters({ status: CertificateStatus.ACTIVE });
    onFiltersChange({ status: CertificateStatus.ACTIVE });
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== undefined && value !== '');

  return (
    <div className="certificate-filters">
      <div className="filters-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {onToggleCollapse && (
            <button onClick={onToggleCollapse} className="collapse-btn" title={isCollapsed ? 'Expandir filtros' : 'Colapsar filtros'}>
              {isCollapsed ? '▼' : '▲'}
            </button>
          )}
          <h3>🔍 Certificados</h3>
        </div>
        {hasActiveFilters && (
          <button onClick={handleClearFilters} className="clear-filters-btn">
            Limpiar filtros
          </button>
        )}
      </div>

      {!isCollapsed && (
        <div className="filters-content">
        <div className="filters-inputs">
          <div className="filter-group">
            <input
              id="filter-fileName"
              type="text"
              placeholder="Nombre archivo"
              value={filters.fileName || ''}
              onChange={(e) => handleInputChange('fileName', e.target.value)}
            />
          </div>

          <div className="filter-group">
            <input
              id="filter-client"
              type="text"
              placeholder="Cliente"
              value={filters.client || ''}
              onChange={(e) => handleInputChange('client', e.target.value)}
            />
          </div>

          <div className="filter-group">
            <input
              id="filter-server"
              type="text"
              placeholder="Servidor"
              value={filters.server || ''}
              onChange={(e) => handleInputChange('server', e.target.value)}
            />
          </div>

          <div className="filter-group">
            <input
              id="filter-email"
              type="text"
              placeholder="Email responsable"
              value={filters.responsibleEmail || ''}
              onChange={(e) => handleInputChange('responsibleEmail', e.target.value)}
            />
          </div>
        </div>

        <div className="filters-controls">
          <div className="filter-group status-filter">
            <div className="status-toggle-switch">
              <span className={`toggle-label ${filters.status === CertificateStatus.ACTIVE ? 'active' : ''}`}>Activos</span>
              <button
                type="button"
                className={`toggle-switch ${filters.status === CertificateStatus.DELETED ? 'active' : ''}`}
                onClick={() => handleInputChange('status', filters.status === CertificateStatus.ACTIVE ? CertificateStatus.DELETED : CertificateStatus.ACTIVE)}
                aria-label="Toggle estado"
              >
                <span className="toggle-slider"></span>
              </button>
              <span className={`toggle-label ${filters.status === CertificateStatus.DELETED ? 'active' : ''}`}>Eliminados</span>
            </div>
          </div>

          <div className="filter-group expiration-filter">
            <div className="expiration-options">
              <label className="radio-option radio-all">
                <input
                  type="radio"
                  name="expirationStatus"
                  checked={filters.expirationStatus === undefined}
                  onChange={() => handleInputChange('expirationStatus', '')}
                />
                <span className="radio-custom"></span>
                <span className="radio-label">ALL</span>
              </label>
              
              <label className="radio-option radio-normal">
                <input
                  type="radio"
                  name="expirationStatus"
                  checked={filters.expirationStatus === ExpirationStatus.NORMAL}
                  onChange={() => handleInputChange('expirationStatus', ExpirationStatus.NORMAL)}
                />
                <span className="radio-custom"></span>
                <span className="radio-label">{ExpirationStatus.NORMAL}</span>
              </label>
              
              <label className="radio-option radio-warning">
                <input
                  type="radio"
                  name="expirationStatus"
                  checked={filters.expirationStatus === ExpirationStatus.WARNING}
                  onChange={() => handleInputChange('expirationStatus', ExpirationStatus.WARNING)}
                />
                <span className="radio-custom"></span>
                <span className="radio-label">{ExpirationStatus.WARNING}</span>
              </label>
              
              <label className="radio-option radio-expired">
                <input
                  type="radio"
                  name="expirationStatus"
                  checked={filters.expirationStatus === ExpirationStatus.EXPIRED}
                  onChange={() => handleInputChange('expirationStatus', ExpirationStatus.EXPIRED)}
                />
                <span className="radio-custom"></span>
                <span className="radio-label">{ExpirationStatus.EXPIRED}</span>
              </label>
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
