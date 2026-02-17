import { useEffect, useState } from 'react';
import './Login.css';

interface LoginProps {
  onLoginSuccess: () => void;
}

const AUTH_APP_URL = import.meta.env.VITE_AUTH_APP_URL || 'http://localhost:4000';
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
const APPLICATION_NAME = import.meta.env.VITE_APPLICATION_NAME || 'secHTTPS_APP';

export function Login({ onLoginSuccess }: Readonly<LoginProps>) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionExpiredMsg, setSessionExpiredMsg] = useState('');
  const [lastUsername, setLastUsername] = useState('');

  // Detectar si llegamos aquí por sesión expirada y obtener último usuario
  useEffect(() => {
    const params = new URLSearchParams(globalThis.location.search);
    if (params.get('sessionExpired') === 'true') {
      setSessionExpiredMsg('Tu sesión ha expirado. Inicia sesión para continuar.');
      // Limpiar parámetro de URL sin recargar
      globalThis.history.replaceState({}, '', globalThis.location.pathname);
    }
    
    // Obtener último usuario del localStorage
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.username) {
          setLastUsername(user.username);
          setUsername(user.username);
        }
      } catch (e) {
        console.error('Error al parsear datos de usuario:', e);
      }
    }
  }, []);

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Llamar a auth_APP con applicationName
      const response = await fetch(`${AUTH_APP_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // CRÍTICO: incluye cookies en la petición
        body: JSON.stringify({ 
          username, 
          password,
          applicationName: APPLICATION_NAME // Especifica la aplicación
        })
      });

      if (!response.ok) {
        // Mensaje genérico según OWASP - no revelar detalles específicos
        throw new Error('Error al iniciar sesión. Por favor, verifica tus datos e intenta nuevamente.');
      }

      const data = await response.json();

      // ✅ Los tokens ya están en cookies httpOnly (enviadas por auth_APP)
      // NO necesitamos guardar tokens en localStorage

      // Guardamos solo datos del usuario (no sensibles)
      localStorage.setItem('user', JSON.stringify({
        id: data.user.id,
        username: data.user.username,
        role: data.user.role
      }));

      // Verificar conexión con el servidor backend antes de pasar al Dashboard
      try {
        const backendResponse = await fetch(`${BACKEND_URL}/trpc/certificate.hello?batch=1&input={"0":{"json":{"name":"SecHTTPS"}}}`, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (!backendResponse.ok) {
          throw new Error('Backend server not responding');
        }
      } catch (backendError) {
        console.error('❌ Error al verificar conexión con backend');
        // Limpiar datos de usuario si no hay conexión con backend
        localStorage.removeItem('user');
        throw new Error('Servicio no disponible temporalmente. Por favor, contacte con el administrador.');
      }

      console.log('✅ Login exitoso');
      onLoginSuccess();

    } catch (err: any) {
      console.error('❌ Error en login');
      // Mensaje genérico según OWASP - no revelar detalles del sistema
      setError(err.message || 'Error de autenticación. Por favor, intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>🔒 SecHTTPS</h1>
          <h2>Certificate Manager</h2>
        </div>
        
        {sessionExpiredMsg && (
          <div className="info-message">
            <span className="info-icon">ℹ️</span>
            {sessionExpiredMsg}
          </div>
        )}
        
        {error && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Usuario</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
              placeholder={lastUsername || ''}
              autoComplete="username"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>

          <button type="submit" disabled={isLoading} className="submit-button">
            {isLoading ? (
              <>
                <span className="spinner"></span>{' '}
                Iniciando sesión...
              </>
            ) : (
              'Iniciar Sesión'
            )}
          </button>
        </form>

        <div className="login-footer">
          <p>Sistema de gestión de certificados SSL/TLS</p>
        </div>
      </div>
    </div>
  );
}
