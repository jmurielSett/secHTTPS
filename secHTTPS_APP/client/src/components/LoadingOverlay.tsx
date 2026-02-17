import './LoadingOverlay.css';

interface LoadingOverlayProps {
  message?: string;
}

export function LoadingOverlay({ message = 'Cargando...' }: Readonly<LoadingOverlayProps>) {
  return (
    <div className="loading-overlay">
      <div className="loading-content">
        <div className="loading-spinner"></div>
        <p>{message}</p>
      </div>
    </div>
  );
}
