import { useEffect, useState } from 'react';

const AUTH_APP_URL = import.meta.env.VITE_AUTH_APP_URL || 'http://localhost:4000';

interface UseAuthReturn {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: { username: string } | null;
  handleLoginSuccess: () => void;
  handleLogout: () => Promise<void>;
}

/**
 * Custom hook para manejar autenticación
 */
export function useAuth(): UseAuthReturn {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<{ username: string } | null>(null);

  useEffect(() => {
    // Verificar si hay datos de usuario en localStorage
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const userData = JSON.parse(userStr);
        setUser(userData);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Error al parsear datos de usuario:', error);
        localStorage.removeItem('user');
      }
    }
    setIsLoading(false);
  }, []);

  const handleLoginSuccess = () => {
    // Recargar datos del usuario
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const userData = JSON.parse(userStr);
        setUser(userData);
      } catch (error) {
        console.error('Error al parsear datos de usuario:', error);
      }
    }
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
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  return {
    isAuthenticated,
    isLoading,
    user,
    handleLoginSuccess,
    handleLogout
  };
}
