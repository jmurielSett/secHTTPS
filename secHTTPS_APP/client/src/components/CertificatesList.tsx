import { useState } from 'react';
import { CertificateStatus } from '../../../src/types/certificate';
import { usePermissions } from '../hooks/usePermissions';
import { trpc } from '../utils/trpc';
import { CertificateCard } from './CertificateCard';
import { CertificateFilters, CertificateFiltersValue } from './CertificateFilters';
import { CertificateModal } from './CertificateModal';
import './CertificatesList.css';
import { CertificatesTable } from './CertificatesTable';
import { CreateCertificateData, CreateCertificateModal } from './CreateCertificateModal';
import { LoadingOverlay } from './LoadingOverlay';

interface CertificatesListProps {
  onLogout: () => void;
  showServerError: boolean;
}

type ViewMode = 'cards' | 'table';

export function CertificatesList({ onLogout, showServerError }: Readonly<CertificatesListProps>) {
  const [filters, setFilters] = useState<CertificateFiltersValue>({});
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [filtersCollapsed, setFiltersCollapsed] = useState(true);
  const [selectedCertificate, setSelectedCertificate] = useState<any>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [deleteSuccessMsg, setDeleteSuccessMsg] = useState<string | null>(null);
  
  // Verificar permisos del usuario basados en roles del token JWT
  const { canCreateCertificates, canDeleteCertificates, canUpdateCertificates } = usePermissions();
  
  // Obtener lista de certificados con filtros (requiere autenticación)
  const certificatesQuery = trpc.certificate.getCertificates.useQuery(filters);

  // Mutation para crear certificado
  const createCertificateMutation = trpc.certificate.createCertificate.useMutation({
    onSuccess: () => {
      // Recargar la lista de certificados después de crear uno nuevo
      certificatesQuery.refetch();
    }
  });

  const handleFiltersChange = (newFilters: CertificateFiltersValue) => {
    setFilters(newFilters);
  };

  const handleCreateCertificate = () => {
    setIsCreateModalOpen(true);
  };

  const handleCreateSubmit = async (data: CreateCertificateData) => {
    await createCertificateMutation.mutateAsync(data);
  };

  const handleDeleteSuccess = (fileName: string) => {
    setSelectedCertificate(null);
    certificatesQuery.refetch();
    setDeleteSuccessMsg(`El certificado "${fileName}" se ha eliminado correctamente.`);
    setTimeout(() => setDeleteSuccessMsg(null), 5000);
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== undefined && value !== '');

  return (
    <section className="card certificates-section">
      {/* Header fijo: Filtros */}
      <div className="filters-sticky">
        <CertificateFilters 
          onFiltersChange={handleFiltersChange}
          isCollapsed={filtersCollapsed}
          onToggleCollapse={() => setFiltersCollapsed(!filtersCollapsed)}
        />
      </div>

      {/* Header fijo: Selector de vista y contador */}
      <div className="view-selector-sticky">
        <div className="view-selector-header">
          {certificatesQuery.data && (
            <div className="certificates-count">
              {hasActiveFilters ? (
                <>Mostrando {certificatesQuery.data.total} certificado{certificatesQuery.data.total === 1 ? '' : 's'}{' '}
                  {filters.status === CertificateStatus.ACTIVE && (
                    <span style={{ color: '#16a34a', fontWeight: 600 }}>activo{certificatesQuery.data.total === 1 ? '' : 's'}</span>
                  )}
                  {filters.status === CertificateStatus.DELETED && (
                    <span style={{ color: '#dc2626', fontWeight: 600 }}>eliminado{certificatesQuery.data.total === 1 ? '' : 's'}</span>
                  )}
                </>
              ) : (
                <>Total: {certificatesQuery.data.total} certificado{certificatesQuery.data.total === 1 ? '' : 's'}</>
              )}
            </div>
          )}
          
          <div className="view-controls">
            <button 
              onClick={() => certificatesQuery.refetch()}
              disabled={certificatesQuery.isRefetching}
              className="refresh-button-compact"
              title="Actualizar lista"
            >
              {certificatesQuery.isRefetching ? '⏳' : '🔄'}
            </button>
            
            <div className="view-toggle">
              <button
                className={`view-btn ${viewMode === 'cards' ? 'active' : ''}`}
                onClick={() => setViewMode('cards')}
                title="Vista de tarjetas"
              >
                📇 Cards
              </button>
              <button
                className={`view-btn ${viewMode === 'table' ? 'active' : ''}`}
                onClick={() => setViewMode('table')}
                title="Vista de tabla"
              >
                📊 Tabla
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Área scrollable: Lista de certificados */}
      <div className="certificates-scrollable">
        {/* Banner de eliminación exitosa */}
        {deleteSuccessMsg && (
          <div style={{
            background: '#e8f5e9', color: '#2e7d32', border: '1px solid #a5d6a7',
            borderRadius: 8, padding: '12px 18px', marginBottom: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
            fontSize: 14, fontWeight: 500,
          }}>
            <span>✅ {deleteSuccessMsg}</span>
            <button
              onClick={() => setDeleteSuccessMsg(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, lineHeight: 1, color: '#2e7d32' }}
              aria-label="Cerrar"
            >✕</button>
          </div>
        )}
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
              {certificatesQuery.data.certificates.length === 0 ? (
                <p className="empty-message">
                  {hasActiveFilters ? 'No hay certificados que coincidan con los filtros' : 'No hay certificados registrados'}
                </p>
              ) : (
                <>
                  {viewMode === 'cards' ? (
                    <div className="certificates-grid">
                      {certificatesQuery.data.certificates.map((cert) => (
                        <CertificateCard 
                          key={cert.id} 
                          certificate={cert}
                          onClick={() => setSelectedCertificate(cert)}
                        />
                      ))}
                    </div>
                  ) : (
                    <CertificatesTable 
                      certificates={certificatesQuery.data.certificates}
                      onRowClick={(cert) => setSelectedCertificate(cert)}
                    />
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal de detalle */}
      <CertificateModal 
        certificate={selectedCertificate}
        onClose={() => setSelectedCertificate(null)}
        canUpdate={canUpdateCertificates}
        canDelete={canDeleteCertificates}
        onDeleteSuccess={handleDeleteSuccess}
      />

      {/* Modal de creación */}
      <CreateCertificateModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateSubmit}
      />

      {/* Botón flotante para crear certificado - Solo visible si tiene permiso */}
      {canCreateCertificates && (
        <button 
          className="floating-button"
          onClick={handleCreateCertificate}
          title="Crear nuevo certificado"
          aria-label="Crear nuevo certificado"
        >
          <span style={{ transform: 'translateY(-2px)', display: 'block' }}>+</span>
        </button>
      )}
    </section>
  );
}
