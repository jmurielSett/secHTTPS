import './AppHeader.css';

interface AppHeaderProps {
  username?: string;
  onLogout: () => void;
}

export function AppHeader({ username, onLogout }: Readonly<AppHeaderProps>) {
  return (
    <header className="app-header">
      <div>
        <h1>🔒 SecHTTPS - Certificate Manager</h1>
        <p>Gestión de certificados SSL/TLS con tRPC</p>
      </div>
      <div className="user-info">
        <span className="user-badge">👤 {username || 'Usuario'}</span>
        <button onClick={onLogout} className="logout-button">
          Cerrar Sesión
        </button>
      </div>
    </header>
  );
}
