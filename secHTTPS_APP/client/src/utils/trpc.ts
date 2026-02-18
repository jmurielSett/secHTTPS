/**
 * Configuración del cliente tRPC
 * Define la conexión con el backend y los tipos
 */
import { httpBatchLink } from '@trpc/client';
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '../../../src/infrastructure/trpc/routers';
import { clientError, clientLog, clientWarn } from './logger';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
const AUTH_APP_URL = import.meta.env.VITE_AUTH_APP_URL || 'http://localhost:4000';

/**
 * Cliente tRPC tipado con el router del backend
 */
export const trpc = createTRPCReact<AppRouter>();

/**
 * Refresh automático de tokens cuando expiran
 * 🔒 SEGURO: No guarda datos sensibles en localStorage
 */
async function refreshTokens(): Promise<boolean> {
  try {
    const response = await fetch(`${AUTH_APP_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include', // Envía refreshToken cookie
    });

    if (!response.ok) {
      return false;
    }

    clientLog('Tokens renovados automáticamente');
    return true;
  } catch (error) {
    clientError('Error al renovar tokens', error);
    return false;
  }
}

/**
 * Custom fetch con retry automático en caso de 401
 */
async function fetchWithAutoRefresh(url: RequestInfo | URL, options?: RequestInit): Promise<Response> {
  const response = await fetch(url, {
    ...options,
    credentials: 'include',
  });

  // Si es 401 (token expirado), intentar refresh
  if (response.status === 401) {
    clientWarn('Access token expirado, intentando refresh');
    
    const refreshed = await refreshTokens();
    
    if (refreshed) {
      // Reintentar petición original con nuevo token
      clientLog('Reintentando petición original');
      return fetch(url, {
        ...options,
        credentials: 'include',
      });
    } else {
      // Refresh falló, limpiar sesión
      clientWarn('Refresh token expirado, cerrando sesión');
      localStorage.removeItem('hasSession');
      globalThis.location.href = '/?sessionExpired=true'; // Redirigir a login con aviso
    }
  }

  return response;
}

/**
 * Configuración del cliente tRPC con autenticación vía cookies y refresh automático
 */
export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: `${BACKEND_URL}/trpc`,
      fetch: fetchWithAutoRefresh,
    }),
  ],
});
