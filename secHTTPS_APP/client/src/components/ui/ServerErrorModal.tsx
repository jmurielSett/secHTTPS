import './ServerErrorModal.css';

interface ServerErrorModalProps {
  retryCount: number;
  isRetrying: boolean;
  onRetry: () => void;
  onExit: () => void;
}

export function ServerErrorModal({ retryCount, isRetrying, onRetry, onExit }: Readonly<ServerErrorModalProps>) {
  const maxRetries = 3;
  const isLastAttempt = retryCount >= maxRetries && !isRetrying;
  
  // Calcular número de intento actual (durante el reintento)
  const currentAttempt = retryCount + 1;
  const isLastRetry = currentAttempt === maxRetries;

  // Calcular el estado del icono y título
  let icon = '⚠️';
  let title = 'Servidor Inaccesible';
  
  if (isRetrying) {
    icon = '⏳';
    title = 'Conectando...';
  } else if (isLastAttempt) {
    icon = '🚫';
    title = 'Conexión Fallida';
  }

  // Calcular etiqueta del botón
  let buttonLabel: string;
  if (isRetrying) {
    buttonLabel = 'Conectando...';
  } else if (isLastAttempt) {
    buttonLabel = '\uD83D\uDEAA Salir';
  } else {
    buttonLabel = '\uD83D\uDD04 Reintentar Conexión';
  }

  // Calcular contenido del cuerpo
  let bodyContent: JSX.Element;
  if (isRetrying) {
    bodyContent = (
      <>
        <div className="loading-spinner"></div>
        <p>Intentando reconectar con el servidor...</p>
        {isLastRetry ? (
          <p className="retry-info">Último intento...</p>
        ) : (
          <p className="retry-info">Intento {currentAttempt} de {maxRetries}</p>
        )}
      </>
    );
  } else if (isLastAttempt) {
    bodyContent = (
      <>
        <p>No se ha podido establecer conexión con el servidor después de {maxRetries} intentos.</p>
        <p className="final-message">Por favor, contacta al responsable de la aplicación para reportar el problema.</p>
      </>
    );
  } else {
    bodyContent = (
      <>
        <p>No se puede conectar con el servidor.</p>
        <p>Por favor, verifica que:</p>
        <ul className="error-checklist">
          <li>Tu conexión a internet funcione correctamente</li>
          <li>No haya problemas de red temporales</li>
        </ul>
      </>
    );
  }

  return (
    <div className="modal-overlay">
      <div className={`modal-content ${isLastAttempt ? 'modal-danger' : 'modal-warning'}`}>
        <div className="modal-header-section">
          <div className="modal-icon">{icon}</div>
          <h2>{title}</h2>
        </div>
        
        <div className="modal-body-section">
        {isRetrying ? (
          <>
            <div className="loading-spinner"></div>
            <p>Intentando reconectar con el servidor...</p>
            {isLastRetry ? (
              <p className="retry-info">Último intento...</p>
            ) : (
              <p className="retry-info">Intento {currentAttempt} de {maxRetries}</p>
            )}
          </>
        ) : isLastAttempt ? (
          <>
            <p>No se ha podido establecer conexión con el servidor después de {maxRetries} intentos.</p>
            <p className="final-message">Por favor, contacta al responsable de la aplicación para reportar el problema.</p>
          </>
        ) : (
          <>
            <p>No se puede conectar con el servidor.</p>
            <p>Por favor, verifica que:</p>
            <ul className="error-checklist">
              <li>Tu conexión a internet funcione correctamente</li>
              <li>No haya problemas de red temporales</li>
            </ul>
          </>
        )}
        
        <button 
          onClick={isLastAttempt ? onExit : onRetry} 
          className={isLastAttempt ? 'exit-button' : 'retry-button'}
          disabled={isRetrying}
        >
          {isRetrying ? 'Conectando...' : isLastAttempt ? '🚪 Salir' : '🔄 Reintentar Conexión'}
        </button>
        </div>
      </div>
    </div>
  );
}
