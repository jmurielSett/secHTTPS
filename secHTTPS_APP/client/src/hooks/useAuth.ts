import { useEffect, useState } from 'react';
import { trpc } from '../utils/trpc';

const AUTH_APP_URL = import.meta.env.VITE_AUTH_APP_URL || 'http://localhost:4000';

interface UserData {
  userId: string;
  username: string;
  roles: string[];
  permissions: Record<string, string[]>; // 🔐 Nuevo: permisos calculados dinámicamente por el backend
}

interface UseAuthReturn {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserData | null;
  handleLoginSuccess: () => void;
  handleLogout: () => Promise<void>;
}

/**
 * Custom hook para manejar autenticación
 * 🔒 SEGURO: Los datos del usuario (incluyendo roles) se obtienen del token JWT
 * en httpOnly cookie, NO se guardan en localStorage
 */
export function useAuth(): UseAuthReturn {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Verificar si existe un flag de sesión en localStorage (solo para saber si intentar obtener usuario)
  const hasSession = localStorage.getItem('hasSession') === 'true';

  // Obtener datos del usuario desde el backend (lee el token JWT de la httpOnly cookie)
  // Solo hace la query si hay una sesión activa
  const userQuery = trpc.certificate.getCurrentUser.useQuery(undefined, {
    enabled: hasSession, // Solo ejecuta la query si hay sesión
    retry: false // No reintentar si falla (token expirado/inválido)
  });

  useEffect(() => {
    // Si la query falla (token expirado/inválido), limpiar sesión
    if (userQuery.isError && hasSession) {
      localStorage.removeItem('hasSession');
      setIsAuthenticated(false);
    }
    
    // Sincronizar estado de autenticación con la query
    if (userQuery.isSuccess && userQuery.data) {
      setIsAuthenticated(true);
    } else if (userQuery.isError) {
      setIsAuthenticated(false);
    }
    
    // Marcar como cargado cuando la query termine (o no esté habilitada)
    if (!hasSession || userQuery.isSuccess || userQuery.isError) {
      setIsLoading(false);
    }
  }, [userQuery.isSuccess, userQuery.isError, userQuery.data, hasSession]);

  const handleLoginSuccess = () => {
    // Marcar que hay una sesión activa
    localStorage.setItem('hasSession', 'true');
    setIsAuthenticated(true);
    // La query se ejecutará automáticamente cuando hasSession cambie
    userQuery.refetch();
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
      // Limpiar flag de sesión (NO guardamos datos sensibles)
      localStorage.removeItem('hasSession');
      
      // Navegar a la URL de login limpia (sin sessionExpired)
      // Esto previene que se muestre el mensaje de sesión expirada en logout manual
      globalThis.location.href = '/';
    }
  };

  return {
    isAuthenticated,
    isLoading: isLoading || userQuery.isLoading,
    user: userQuery.data || null,
    handleLoginSuccess,
    handleLogout
  };
}
