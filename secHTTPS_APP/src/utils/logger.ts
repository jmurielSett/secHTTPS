/**
 * Sistema de logging condicional para secHTTPS_APP
 * Usa LOG_LEVEL del entorno para filtrar mensajes
 * En producción se recomienda LOG_LEVEL=warn; en desarrollo LOG_LEVEL=debug
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function currentLevel(): LogLevel {
  const env = (process.env.LOG_LEVEL ?? 'info').toLowerCase();
  return (env in LOG_LEVELS ? env : 'info') as LogLevel;
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel()];
}

export function logDebug(message: string): void {
  if (shouldLog('debug')) {
    console.log(`[DEBUG] ${message}`);
  }
}

export function logInfo(message: string): void {
  if (shouldLog('info')) {
    console.log(`[INFO]  ${message}`);
  }
}

export function logWarn(message: string): void {
  if (shouldLog('warn')) {
    console.warn(`[WARN]  ${message}`);
  }
}

export function logError(message: string, err?: Error): void {
  if (shouldLog('error')) {
    console.error(`[ERROR] ${message}`, err ?? '');
  }
}
