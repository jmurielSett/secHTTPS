import './App.css';
import { Login } from './components/auth/Login';
import { CertificatesList } from './components/certificates/CertificatesList';
import { AppHeader } from './components/layout/AppHeader';
import { ServerErrorModal } from './components/ui/ServerErrorModal';
import { useAuth } from './hooks/useAuth';
import { useServerConnection } from './hooks/useServerConnection';
import { trpc } from './utils/trpc';

function Dashboard({ onLogout }: Readonly<{ onLogout: () => void }>) {
  // Llamada simple para verificar conexión
  const helloQuery = trpc.certificate.hello.useQuery({ name: 'SecHTTPS' });

  // Obtener lista de certificados (requiere autenticación)
  const certificatesQuery = trpc.certificate.getCertificates.useQuery();

  // Obtener datos del usuario desde useAuth
  const { user } = useAuth();

  // Usar hook personalizado para manejar errores de servidor y reintentos
  const {
    showServerError,
    isRetrying,
    retryCount,
    handleRetry
  } = useServerConnection({
    errors: [helloQuery.error, certificatesQuery.error],
    refetchFunctions: [
      () => helloQuery.refetch(),
      () => certificatesQuery.refetch()
    ]
  });

  return (
    <div className="App">
      {showServerError && (
        <ServerErrorModal
          retryCount={retryCount}
          isRetrying={isRetrying}
          onRetry={handleRetry}
          onExit={onLogout}
        />
      )}

      <AppHeader username={user?.username} onLogout={onLogout} />

      <main className="app-main">
        <CertificatesList onLogout={onLogout} showServerError={showServerError} />
      </main>

      <footer className="app-footer">
        <p>Powered by tRPC + React + TypeScript</p>
      </footer>
    </div>
  );
}


function App() {
  const { isAuthenticated, isLoading, handleLoginSuccess, handleLogout } = useAuth();

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
