import { NextFunction, Request, Response } from 'express';

/**
 * Middleware para registrar información de cada petición HTTP
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  let logged = false; // Bandera para evitar logs duplicados

  // Función para loggear cuando termine la respuesta
  const logResponse = () => {
    if (logged) return; // Evitar logs duplicados
    logged = true;

    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    const statusEmoji = getStatusEmoji(statusCode);

    console.log(
      `${statusEmoji} [${timestamp}] ${req.method} ${req.originalUrl} - ${statusCode} - ${duration}ms`
    );

    if (Object.keys(req.query).length > 0) {
      console.log(`   Query params:`, req.query);
    }
  };

  // Interceptar res.send
  const originalSend = res.send;
  res.send = function (body): Response {
    logResponse();
    return originalSend.call(this, body);
  };

  // Interceptar res.json (método más común en APIs REST)
  const originalJson = res.json;
  res.json = function (body): Response {
    logResponse();
    return originalJson.call(this, body);
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
