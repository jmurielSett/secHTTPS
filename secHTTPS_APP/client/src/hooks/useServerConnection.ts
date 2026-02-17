import { useEffect, useState } from 'react';

interface UseServerConnectionProps {
  errors: unknown[];
  refetchFunctions: (() => Promise<any>)[];
}

interface UseServerConnectionReturn {
  showServerError: boolean;
  isRetrying: boolean;
  retryCount: number;
  handleRetry: () => Promise<void>;
  resetRetryCount: () => void;
}

/**
 * Custom hook para detectar errores de servidor y manejar reintentos
 */
export function useServerConnection({
  errors,
  refetchFunctions
}: UseServerConnectionProps): UseServerConnectionReturn {
  const [showServerError, setShowServerError] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Función para detectar si un error es de red/conexión
  const isNetworkError = (error: unknown): boolean => {
    if (!error) return false;
    
    let errorMsg = '';
    if (error instanceof Error) {
      errorMsg = error.message.toLowerCase();
    } else if (typeof error === 'object' && error !== null && 'message' in error) {
      errorMsg = String((error as { message: unknown }).message).toLowerCase();
    } else if (typeof error === 'string') {
      errorMsg = error.toLowerCase();
    } else {
      return false;
    }
    
    return (
      errorMsg.includes('failed to fetch') ||
      errorMsg.includes('network') ||
      errorMsg.includes('econnrefused') ||
      errorMsg.includes('timeout') ||
      errorMsg.includes('connection')
    );
  };

  // Detectar errores de servidor (red, conexión)
  useEffect(() => {
    const hasNetworkError = errors.some(error => isNetworkError(error));
    setShowServerError(hasNetworkError);
  }, [errors]);

  // Manejar reintentos
  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      const results = await Promise.all(refetchFunctions.map(fn => fn()));
      
      // Verificar si algún refetch falló
      const hasError = results.some(result => result.isError);
      
      if (hasError) {
        setRetryCount(prev => prev + 1);
      } else {
        setShowServerError(false);
        setRetryCount(0);
      }
    } catch (error) {
      setRetryCount(prev => prev + 1);
      console.error('Error al reintentar:', error);
    } finally {
      setIsRetrying(false);
    }
  };

  const resetRetryCount = () => {
    setRetryCount(0);
  };

  return {
    showServerError,
    isRetrying,
    retryCount,
    handleRetry,
    resetRetryCount
  };
}
