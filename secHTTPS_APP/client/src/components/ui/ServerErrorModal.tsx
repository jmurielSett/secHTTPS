import './ServerErrorModal.css';

interface ServerErrorModalProps {
  retryCount: number;
  isRetrying: boolean;
  maxRetries?: number;
  onRetry: () => void;
  onExit: () => void;
}

export function ServerErrorModal({
  retryCount,
  isRetrying,
  maxRetries = 3,
  onRetry,
  onExit,
}: Readonly<ServerErrorModalProps>) {
  const isLastAttempt = retryCount >= maxRetries && !isRetrying;
  const currentAttempt = retryCount + 1;
  const isLastRetry = currentAttempt === maxRetries;

  const icon = isRetrying ? '⏳' : isLastAttempt ? '🚫' : '⚠️';
  const title = isRetrying ? 'Conectando...' : isLastAttempt ? 'Conexión Fallida' : 'Servidor Inaccesible';

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
              <p className="retry-info">
                {isLastRetry ? 'Último intento...' : `Intento ${currentAttempt} de ${maxRetries}`}
              </p>
            </>
          ) : isLastAttempt ? (
            <>
              <p>
                No se ha podido establecer conexión con el servidor después de {maxRetries} intentos.
              </p>
              <p className="final-message">
                Por favor, contacta al responsable de la aplicación para reportar el problema.
              </p>
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
