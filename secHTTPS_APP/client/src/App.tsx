import './App.css';
import { trpc } from './utils/trpc';

function App() {
  // Llamada simple para verificar conexión
  const helloQuery = trpc.certificate.hello.useQuery({ name: 'SecHTTPS' });

  // Obtener lista de certificados
  const certificatesQuery = trpc.certificate.getCertificates.useQuery();

  return (
    <div className="App">
      <header className="app-header">
        <h1>🔒 SecHTTPS - Certificate Manager</h1>
        <p>Gestión de certificados SSL/TLS con tRPC</p>
      </header>

      <main className="app-main">
        {/* Health Check */}
        <section className="card">
          <h2>Estado de Conexión</h2>
          {helloQuery.isLoading && <p>Conectando...</p>}
          {helloQuery.error && (
            <p className="error">Error: {helloQuery.error.message}</p>
          )}
          {helloQuery.data && (
            <div className="success">
              <p>{helloQuery.data.message}</p>
              <small>{helloQuery.data.timestamp}</small>
            </div>
          )}
        </section>

        {/* Lista de Certificados */}
        <section className="card">
          <h2>Certificados</h2>
          {certificatesQuery.isLoading && <p>Cargando certificados...</p>}
          {certificatesQuery.error && (
            <p className="error">Error: {certificatesQuery.error.message}</p>
          )}
          {certificatesQuery.data && (
            <div>
              <p className="success">
                Total: {certificatesQuery.data.total} certificados
              </p>
              
              {certificatesQuery.data.certificates.length === 0 ? (
                <p>No hay certificados registrados</p>
              ) : (
                <div className="certificates-grid">
                  {certificatesQuery.data.certificates.map((cert) => (
                    <div key={cert.id} className="certificate-card">
                      <h3>{cert.fileName}</h3>
                      <div className="cert-info">
                        <p><strong>Cliente:</strong> {cert.client}</p>
                        <p><strong>Servidor:</strong> {cert.server}</p>
                        <p><strong>Estado:</strong> <span className={`status-badge ${cert.status.toLowerCase()}`}>{cert.status}</span></p>
                        <p><strong>Expiración:</strong> <span className={`expiration-badge ${cert.expirationStatus.toLowerCase()}`}>{cert.expirationStatus}</span></p>
                        <p><strong>Fecha inicio:</strong> {new Date(cert.startDate).toLocaleDateString()}</p>
                        <p><strong>Fecha expiración:</strong> {new Date(cert.expirationDate).toLocaleDateString()}</p>
                        <p><strong>Contactos:</strong> {cert.responsibleContacts.map((c) => c.email).join(', ')}</p>
                      </div>
                    </div>
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
        </section>
      </main>

      <footer className="app-footer">
        <p>Powered by tRPC + React + TypeScript</p>
      </footer>
    </div>
  );
}

export default App;
