import './ServerErrorModal.css';

interface ServerErrorModalProps {
  retryCount: number;
  isRetrying: boolean;
  maxRetries?: number;
  onRetry: () => void;
  onExit: () => void;
  ldapMessage?: string; // Si se proporciona, muestra error de LDAP en vez de conexión
}

function getModalIcon(isRetrying: boolean, isLastAttempt: boolean): string {
  if (isRetrying) return '⏳';
  if (isLastAttempt) return '🚫';
  return '⚠️';
}

function getModalTitle(isLdapMode: boolean, isRetrying: boolean, isLastAttempt: boolean): string {
  if (isRetrying) return isLdapMode ? 'Verificando LDAP...' : 'Conectando...';
  if (isLastAttempt) return isLdapMode ? 'LDAP No Disponible' : 'Conexión Fallida';
  return isLdapMode ? 'Servidor LDAP Inaccesible' : 'Servidor Inaccesible';
}

function getButtonLabel(isRetrying: boolean, isLastAttempt: boolean): string {
  if (isRetrying) return 'Verificando...';
  if (isLastAttempt) return '🚪 Salir';
  return '🔄 Reintentar';
}

function RetryingContent({ isLdapMode, currentAttempt, maxRetries, isLastRetry }: Readonly<{
  isLdapMode: boolean;
  currentAttempt: number;
  maxRetries: number;
  isLastRetry: boolean;
}>) {
  return (
    <>
      <div className="loading-spinner"></div>
      <p>{isLdapMode ? 'Verificando conectividad con el servidor LDAP...' : 'Intentando reconectar con el servidor...'}</p>
      <p className="retry-info">
        {isLastRetry ? 'Último intento...' : `Intento ${currentAttempt} de ${maxRetries}`}
      </p>
    </>
  );
}

function FinalFailureContent({ isLdapMode, ldapMessage, maxRetries }: Readonly<{
  isLdapMode: boolean;
  ldapMessage?: string;
  maxRetries: number;
}>) {
  return (
    <>
      <p>
        {isLdapMode
          ? ldapMessage
          : `No se ha podido establecer conexión con el servidor después de ${maxRetries} intentos.`}
      </p>
      <p className="final-message">
        Por favor, contacta al responsable de la aplicación para reportar el problema.
      </p>
    </>
  );
}

function InitialErrorContent({ isLdapMode, ldapMessage }: Readonly<{
  isLdapMode: boolean;
  ldapMessage?: string;
}>) {
  if (isLdapMode) {
    return (
      <>
        <p>{ldapMessage}</p>
        <p>Puedes reintentar si acabas de conectarte a la red corporativa (VPN).</p>
      </>
    );
  }
  return (
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

export function ServerErrorModal({
  retryCount,
  isRetrying,
  maxRetries = 3,
  onRetry,
  onExit,
  ldapMessage,
}: Readonly<ServerErrorModalProps>) {
  const isLastAttempt = retryCount >= maxRetries && !isRetrying;
  const currentAttempt = retryCount + 1;
  const isLastRetry = currentAttempt === maxRetries;
  const isLdapMode = Boolean(ldapMessage);

  const icon = getModalIcon(isRetrying, isLastAttempt);
  const title = getModalTitle(isLdapMode, isRetrying, isLastAttempt);
  const buttonLabel = getButtonLabel(isRetrying, isLastAttempt);

  return (
    <div className="modal-overlay">
      <div className={`modal-content ${isLastAttempt ? 'modal-danger' : 'modal-warning'}`}>
        <div className="modal-header-section">
          <div className="modal-icon">{icon}</div>
          <h2>{title}</h2>
        </div>

        <div className="modal-body-section">
          {isRetrying && (
            <RetryingContent
              isLdapMode={isLdapMode}
              currentAttempt={currentAttempt}
              maxRetries={maxRetries}
              isLastRetry={isLastRetry}
            />
          )}
          {!isRetrying && isLastAttempt && (
            <FinalFailureContent isLdapMode={isLdapMode} ldapMessage={ldapMessage} maxRetries={maxRetries} />
          )}
          {!isRetrying && !isLastAttempt && (
            <InitialErrorContent isLdapMode={isLdapMode} ldapMessage={ldapMessage} />
          )}

          <button
            onClick={isLastAttempt ? onExit : onRetry}
            className={isLastAttempt ? 'exit-button' : 'retry-button'}
            disabled={isRetrying}
          >
            {buttonLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
