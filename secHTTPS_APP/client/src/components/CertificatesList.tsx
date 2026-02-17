import { useState } from 'react';
import { trpc } from '../utils/trpc';
import { CertificateCard } from './CertificateCard';
import { CertificateFilters, CertificateFiltersValue } from './CertificateFilters';
import './CertificatesList.css';
import { LoadingOverlay } from './LoadingOverlay';

interface CertificatesListProps {
  onLogout: () => void;
  showServerError: boolean;
}

export function CertificatesList({ onLogout, showServerError }: Readonly<CertificatesListProps>) {
  const [filters, setFilters] = useState<CertificateFiltersValue>({});
  
  // Obtener lista de certificados con filtros (requiere autenticación)
  const certificatesQuery = trpc.certificate.getCertificates.useQuery(filters);

  const handleFiltersChange = (newFilters: CertificateFiltersValue) => {
    setFilters(newFilters);
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== undefined && value !== '');

  return (
    <section className="card">
      {/* Filtros */}
      <CertificateFilters onFiltersChange={handleFiltersChange} />
      
      {/* Contenedor con position relative para el overlay */}
      <div style={{ position: 'relative', minHeight: '200px' }}>
        {/* Loading overlay durante carga o filtrado */}
        {certificatesQuery.isFetching && (
          <LoadingOverlay 
            message={certificatesQuery.isLoading ? 'Cargando certificados...' : 'Aplicando filtros...'} 
          />
        )}
        
        {certificatesQuery.error && !showServerError && (
          <div className="error">
            {certificatesQuery.error.message?.toLowerCase().includes('unauthorized') ? (
              <>
                <p>Tu sesión ha expirado</p>
                <p>
                  <small>
                    <button onClick={onLogout} className="link-button">
                      Volver a iniciar sesión
                    </button>
                  </small>
                </p>
              </>
            ) : (
              <p>Error al cargar certificados</p>
            )}
          </div>
        )}
        
        {certificatesQuery.data && (
          <div>
            <p className="success">
              {hasActiveFilters ? (
                <>Mostrando {certificatesQuery.data.total} certificado{certificatesQuery.data.total === 1 ? '' : 's'} (filtrados)</>
              ) : (
                <>Total: {certificatesQuery.data.total} certificado{certificatesQuery.data.total === 1 ? '' : 's'}</>
              )}
            </p>
            
            {certificatesQuery.data.certificates.length === 0 ? (
              <p>{hasActiveFilters ? 'No hay certificados que coincidan con los filtros' : 'No hay certificados registrados'}</p>
            ) : (
              <div className="certificates-grid">
                {certificatesQuery.data.certificates.map((cert) => (
                  <CertificateCard key={cert.id} certificate={cert} />
                ))}
              </div>
            )}
            
            <button 
              onClick={() => certificatesQuery.refetch()}
              disabled={certificatesQuery.isRefetching}
              className="refresh-button"
            >
              {certificatesQuery.isRefetching ? 'Actualizando...' : '🔄 Actualizar'}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
