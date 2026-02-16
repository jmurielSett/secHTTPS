import { LOG_CONFIG } from '../types/shared';

/**
 * Sistema de logging condicional
 * Los logs solo se muestran según LOG_CONFIG
 */

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
} as const;

function shouldLog(level: keyof typeof LOG_LEVELS): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[LOG_CONFIG.LEVEL];
}

/**
 * Log de nivel debug (solo en desarrollo o LOG_LEVEL=debug)
 */
export function logDebug(message: string): void {
  if (shouldLog('debug')) {
    console.log(message);
  }
}

/**
 * Log de nivel info (información general)
 */
export function logInfo(message: string): void {
  if (shouldLog('info')) {
    console.log(message);
  }
}

/**
 * Log de nivel warning (advertencias)
 */
export function logWarn(message: string): void {
  if (shouldLog('warn')) {
    console.warn(message);
  }
}

/**
 * Log de nivel error (errores, siempre se muestra)
 */
export function logError(message: string, err?: Error): void {
  if (shouldLog('error')) {
    console.error(message, err || '');
  }
}

/**
 * Logs específicos de autenticación (controlados por LOG_AUTH_ATTEMPTS)
 */
export function authLog(message: string): void {
  if (LOG_CONFIG.ENABLE_AUTH_LOGS) {
    console.log(message);
  }
}

/**
 * Logs específicos de LDAP (controlados por LOG_LDAP_DEBUG)
 */
export function ldapLog(message: string): void {
  if (LOG_CONFIG.ENABLE_LDAP_LOGS) {
    console.log(message);
  }
}
