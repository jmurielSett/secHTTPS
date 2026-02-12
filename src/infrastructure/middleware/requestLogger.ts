import { NextFunction, Request, Response } from 'express';

/**
 * Middleware para registrar información de cada petición HTTP
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  // Capturar el método finish de la respuesta para loggear cuando termine
  const originalSend = res.send;
  res.send = function (body): Response {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;

    // Determinar el emoji según el código de estado
    const statusEmoji = getStatusEmoji(statusCode);

    // Log de la petición con información relevante
    console.log(
      `${statusEmoji} [${timestamp}] ${req.method} ${req.originalUrl} - ${statusCode} - ${duration}ms`
    );

    // Si hay query params, loggearlos también
    if (Object.keys(req.query).length > 0) {
      console.log(`   Query params:`, req.query);
    }

    // Restaurar el método original y llamarlo
    return originalSend.call(this, body);
  };

  next();
}

/**
 * Devuelve un emoji según el código de estado HTTP
 */
function getStatusEmoji(statusCode: number): string {
  if (statusCode >= 200 && statusCode < 300) return '✅';
  if (statusCode >= 300 && statusCode < 400) return '➡️';
  if (statusCode >= 400 && statusCode < 500) return '⚠️';
  if (statusCode >= 500) return '❌';
  return 'ℹ️';
}
