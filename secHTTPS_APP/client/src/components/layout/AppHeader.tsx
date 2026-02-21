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
        <p>Gestión de certificados SSL/TLS - v1.0.0</p>
      </div>
      <div className="user-info">
        <span className="user-badge">👤 {username || 'Usuario'}</span>
        <button onClick={onLogout} className="logout-button">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Cerrar Sesión
        </button>
      </div>
    </header>
  );
}
