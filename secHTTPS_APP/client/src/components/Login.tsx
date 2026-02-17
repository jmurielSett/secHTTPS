import { useState } from 'react';
import './Login.css';

interface LoginProps {
  onLoginSuccess: () => void;
}

const AUTH_APP_URL = import.meta.env.VITE_AUTH_APP_URL || 'http://localhost:4000';
const APPLICATION_NAME = import.meta.env.VITE_APPLICATION_NAME || 'secHTTPS_APP';

export function Login({ onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
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
        const errorData = await response.json();
        throw new Error(errorData.error?.message || errorData.message || 'Login failed');
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

      console.log('✅ Login exitoso:', data.user.username);
      onLoginSuccess();

    } catch (err: any) {
      console.error('❌ Error en login:', err);
      setError(err.message || 'Error al conectar con el servidor de autenticación');
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
          <p className="app-name">Application: {APPLICATION_NAME}</p>
        </div>
        
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
              placeholder="jmuriel"
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
                <span className="spinner"></span>
                Iniciando sesión...
              </>
            ) : (
              'Iniciar Sesión'
            )}
          </button>
        </form>

        <div className="login-footer">
          <p>Sistema de gestión de certificados SSL/TLS</p>
          <p className="auth-info">
            🔐 Autenticación: {AUTH_APP_URL}
          </p>
        </div>
      </div>
    </div>
  );
}
