import { useEffect, useState } from 'react';
import { clientError, clientLog } from '../../utils/logger';
import { ServerErrorModal } from '../ui/ServerErrorModal';
import './Login.css';

interface LoginProps {
  onLoginSuccess: () => void;
}

const AUTH_APP_URL = import.meta.env.VITE_AUTH_APP_URL || 'http://localhost:4000';
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
const APPLICATION_NAME = import.meta.env.VITE_APPLICATION_NAME || 'secHTTPS_APP';
const MAX_RETRY_ATTEMPTS = 3;
const MAX_LOGIN_ATTEMPTS = 10;
const LOCKOUT_DURATION_MS = 3 * 60 * 1000; // 3 minutos

export function Login({ onLoginSuccess }: Readonly<LoginProps>) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionExpiredMsg, setSessionExpiredMsg] = useState('');
  const [lastUsername, setLastUsername] = useState('');
  
  // Estados para el modal de errores de conexión
  const [showServerError, setShowServerError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [ldapErrorMessage, setLdapErrorMessage] = useState<string | undefined>(undefined);

  // Estados para rate limiting (bloqueo temporal)
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

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
        clientError('Error al parsear datos de usuario', e);
      }
    }

    // Cargar estado de bloqueo del localStorage
    const lockoutStr = localStorage.getItem('loginLockout');
    if (lockoutStr) {
      try {
        const lockout = JSON.parse(lockoutStr);
        const now = Date.now();
        
        if (lockout.until > now) {
          // Aún está bloqueado
          setLockoutUntil(lockout.until);
          setLoginAttempts(lockout.attempts);
          setTimeRemaining(Math.ceil((lockout.until - now) / 1000));
        } else {
          // El bloqueo ya expiró, limpiar
          localStorage.removeItem('loginLockout');
        }
      } catch (e) {
        clientError('Error al parsear lockout', e);
      }
    }
  }, []);

  // Temporizador para actualizar el tiempo restante de bloqueo
  useEffect(() => {
    if (!lockoutUntil) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = Math.ceil((lockoutUntil - now) / 1000);
      
      if (remaining <= 0) {
        // Bloqueo expirado
        setLockoutUntil(null);
        setLoginAttempts(0);
        setTimeRemaining(0);
        localStorage.removeItem('loginLockout');
      } else {
        setTimeRemaining(remaining);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lockoutUntil]);

  // Verificar conexión con el servidor backend
  const verifyBackendConnection = async () => {
    const backendResponse = await fetch(
      `${BACKEND_URL}/trpc/certificate.hello?batch=1&input={"0":{"json":{"name":"SecHTTPS"}}}`,
      {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      }
    );

    if (!backendResponse.ok) {
      throw new Error('Backend server not responding');
    }

    const userDataResponse = await fetch(`${BACKEND_URL}/trpc/certificate.getCurrentUser`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!userDataResponse.ok) {
      throw new Error('Cannot fetch user data from backend');
    }
  };

  // Manejar error de autenticación (incrementar contador y activar bloqueo si es necesario)
  const handleAuthError = (isRetryFromModal: boolean = false) => {
    // Si venimos del modal de error de servidor, no contar como intento de autenticación
    // Solo cerrar el modal y permitir que el usuario corrija las credenciales
    if (isRetryFromModal) {
      throw new Error('AUTH_FAILED_FROM_RETRY');
    }
    
    const newAttempts = loginAttempts + 1;
    setLoginAttempts(newAttempts);

    // Si alcanza el límite, activar bloqueo
    if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
      const lockoutTime = Date.now() + LOCKOUT_DURATION_MS;
      setLockoutUntil(lockoutTime);
      setTimeRemaining(Math.ceil(LOCKOUT_DURATION_MS / 1000));
      
      // Guardar en localStorage para persistir entre recargas
      localStorage.setItem('loginLockout', JSON.stringify({
        until: lockoutTime,
        attempts: newAttempts
      }));

      throw new Error('ACCOUNT_LOCKED');
    }

    // Mensaje genérico según OWASP - no revelar detalles específicos
    throw new Error('AUTH_FAILED');
  };

  // Resetear todos los contadores al tener login exitoso
  const resetCounters = () => {
    setRetryCount(0);
    setShowServerError(false);
    setLoginAttempts(0);
    setLdapErrorMessage(undefined);
    setLockoutUntil(null);
    setTimeRemaining(0);
    localStorage.removeItem('loginLockout');
    setError('');
  };

  const processLoginError = (err: any) => {
    clientError('Error en login', err);
    
    // Manejar bloqueo de cuenta
    if (err.message === 'ACCOUNT_LOCKED') {
      // Si venimos del modal de error de servidor, cerrarlo
      // porque ahora el servidor responde (pero cuenta bloqueada)
      if (showServerError) {
        setShowServerError(false);
        setRetryCount(0);
      }
      setError(''); // No mostrar error inline, el modal se encargará
      throw err;
    }

    // Detectar error de autenticación desde modal (no incrementa contador)
    if (err.message === 'AUTH_FAILED_FROM_RETRY') {
      // Cerrar modal de error de servidor porque ahora el servidor responde
      setShowServerError(false);
      setRetryCount(0);
      setError('Verifica tus credenciales e intenta nuevamente.');
      throw err;
    }

    // Detectar errores de autenticación fallida. Quitar: Te quedan ${attemptsLeft} ${attemptsLeft === 1 ? 'intento' : 'intentos'}
    if (err.message === 'AUTH_FAILED') {
      const attemptsLeft = MAX_LOGIN_ATTEMPTS - loginAttempts;
      if (attemptsLeft > 0) {
        setError(`Acceso incorrecto.`);
      }
      throw err;
    }

    // Error de infraestructura LDAP (no contar como intento de credenciales)
    if (err.message.startsWith('LDAP_UNAVAILABLE:')) {
      const ldapMessage = err.message.replace('LDAP_UNAVAILABLE:', '');
      const newRetryCount = retryCount + 1;
      setRetryCount(newRetryCount);
      setLdapErrorMessage(ldapMessage);
      setShowServerError(true);
      throw err;
    }
    
    // Detectar errores de conexión específicos
    const isConnectionError = 
      err.message === 'CONNECTION_ERROR' ||
      err.message.includes('Failed to fetch') || 
      err.name === 'TypeError' ||
      err.message.includes('Network') ||
      err.message.includes('fetch');
    
    if (isConnectionError) {
      // Incrementar contador de reintentos de conexión
      const newRetryCount = retryCount + 1;
      setRetryCount(newRetryCount);
      
      // Mostrar modal de error de servidor después del primer intento fallido
      if (newRetryCount >= 1) {
        setShowServerError(true);
      }
      
      setError('No se puede conectar con el servidor de autenticación.');
    } else {
      // Otros errores no esperados
      setError(err.message || 'Error de autenticación. Por favor, intenta nuevamente.');
    }
    
    throw err; // Re-throw para que el finally se ejecute
  };

  const attemptLogin = async (isRetryFromModal: boolean = false) => {
    // Verificar si está bloqueado
    if (lockoutUntil && Date.now() < lockoutUntil) {
      throw new Error('ACCOUNT_LOCKED');
    }

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
        // Intentar leer el mensaje de error del servidor
        let serverMessage = '';
        try {
          const errorBody = await response.json();
          serverMessage = errorBody?.error?.message || errorBody?.message || '';
        } catch {
          // Si no se puede parsear el body, usar mensaje genérico
        }

        // Error de infraestructura LDAP: no es un error de credenciales, es del servidor
        if (serverMessage.toLowerCase().includes('ldap') || serverMessage.toLowerCase().includes('not reachable')) {
          throw new Error(`LDAP_UNAVAILABLE:${serverMessage}`);
        }

        // Error de autenticación (credenciales incorrectas)
        handleAuthError(isRetryFromModal);
      }

      // ✅ Los tokens ya están en cookies httpOnly (enviadas por auth_APP)
      // NO guardamos datos sensibles en localStorage

      // Verificar conexión con el servidor backend antes de pasar al Dashboard
      try {
        await verifyBackendConnection();
      } catch (backendError: unknown) {
        clientError('Error al verificar conexión con backend', backendError);
        throw new Error('CONNECTION_ERROR'); // Marcador especial para errores de conexión
      }

      // 🔒 SEGURO: Solo guardamos un flag de sesión (sin datos sensibles)
      // Los roles y datos del usuario se obtienen del token httpOnly cookie
      localStorage.setItem('hasSession', 'true');

      clientLog('Login exitoso');
      
      // Resetear todos los contadores al tener éxito
      resetCounters();
      
      onLoginSuccess();

    } catch (err: any) {
      processLoginError(err);
    }
  };

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Verificar bloqueo antes de intentar login
    if (lockoutUntil && Date.now() < lockoutUntil) {
      return; // No hacer nada si está bloqueado
    }
    
    setError('');
    setIsLoading(true);

    try {
      await attemptLogin();
    } catch {
      // Error ya manejado en attemptLogin
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    setError('');
    
    try {
      // Marcar que es un reintento desde el modal
      await attemptLogin(true);
    } catch {
      // Error ya manejado en attemptLogin
    } finally {
      setIsRetrying(false);
    }
  };

  const handleExitAfterMaxRetries = () => {
    // Cerrar modal y resetear estados
    setShowServerError(false);
    setRetryCount(0);
    setError('No se pudo establecer conexión con el servidor. Por favor, intenta más tarde.');
  };

  // Helper para formatear el tiempo restante
  const formatTimeRemaining = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isLocked = lockoutUntil !== null && Date.now() < lockoutUntil;

  // Calcular contenido del botón de submit
  const getButtonContent = () => {
    if (isLocked) {
      return (
        <>
          <span>🔒</span>{' '}
          Bloqueado ({formatTimeRemaining(timeRemaining)})
        </>
      );
    }
    
    if (isLoading) {
      return (
        <>
          <span className="spinner"></span>{' '}
          Iniciando sesión...
        </>
      );
    }
    
    return 'Iniciar Sesión';
  };

  return (
    <div className="login-container">
      {showServerError && (
        <ServerErrorModal
          retryCount={retryCount}
          isRetrying={isRetrying}
          maxRetries={MAX_RETRY_ATTEMPTS}
          onRetry={handleRetry}
          onExit={handleExitAfterMaxRetries}
          ldapMessage={ldapErrorMessage}
        />
      )}
      
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
        
        {isLocked && (
          <div className="lockout-warning">
            <span className="lockout-icon">🔒</span>
            <div>
              <div className="lockout-title">Cuenta bloqueada temporalmente</div>
              <div>
                Demasiados intentos fallidos. Podrás intentar de nuevo en{' '}
                <strong>{formatTimeRemaining(timeRemaining)}</strong>
              </div>
            </div>
          </div>
        )}
        
        {error && !isLocked && (
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
              disabled={isLoading || isLocked}
              placeholder={lastUsername || ''}
              autoComplete="username"
              autoFocus
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
              disabled={isLoading || isLocked}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>

          <button type="submit" disabled={isLoading || isLocked} className="submit-button">
            {getButtonContent()}
          </button>
        </form>

        <div className="login-footer">
          <p>Sistema de gestión de certificados SSL/TLS</p>
        </div>
      </div>
    </div>
  );
}
