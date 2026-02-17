import { useEffect, useState } from 'react';
import './App.css';
import { Login } from './components/Login';
import { trpc } from './utils/trpc';

const AUTH_APP_URL = import.meta.env.VITE_AUTH_APP_URL || 'http://localhost:4000';

function Dashboard({ onLogout }: { onLogout: () => void }) {
  // Llamada simple para verificar conexión
  const helloQuery = trpc.certificate.hello.useQuery({ name: 'SecHTTPS' });

  // Obtener lista de certificados (requiere autenticación)
  const certificatesQuery = trpc.certificate.getCertificates.useQuery();

  // Obtener datos del usuario desde localStorage
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

  return (
    <div className="App">
      <header className="app-header">
        <div>
          <h1>🔒 SecHTTPS - Certificate Manager</h1>
          <p>Gestión de certificados SSL/TLS con tRPC</p>
        </div>
        <div className="user-info">
          <span className="user-badge">👤 {user?.username || 'Usuario'}</span>
          <button onClick={onLogout} className="logout-button">
            Cerrar Sesión
          </button>
        </div>
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
            <div className="error">
              <p>Error: {certificatesQuery.error.message}</p>
              {certificatesQuery.error.message.includes('UNAUTHORIZED') && (
                <p><small>Tu sesión ha expirado. <button onClick={onLogout} className="link-button">Volver a iniciar sesión</button></small></p>
              )}
            </div>
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

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Verificar si hay datos de usuario en localStorage
    const userStr = localStorage.getItem('user');
    setIsAuthenticated(!!userStr);
    setIsLoading(false);
  }, []);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    try {
      // Llamar a endpoint de logout en auth_APP (limpia cookies)
      await fetch(`${AUTH_APP_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Error en logout:', error);
    } finally {
      // Limpiar datos locales
      localStorage.removeItem('user');
      setIsAuthenticated(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh',
        fontSize: '1.2rem',
        color: '#666'
      }}>
        Cargando...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return <Dashboard onLogout={handleLogout} />;
}

export default App;
