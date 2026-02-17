/**
 * Configuraciones compartidas del sistema de autenticación
 */

/**
 * Configuración de JWT tokens
 * NOTA: Tiempos reducidos para DESARROLLO/TESTING
 * Producción: ACCESS_EXPIRATION='15m', REFRESH_EXPIRATION='7d'
 */
export const JWT_CONFIG = {
  /** Duración del Access Token: 1 minuto (testing) */
  ACCESS_EXPIRATION: '1m',
  /** Duración del Refresh Token: 5 minutos (testing) */
  REFRESH_EXPIRATION: '5m',
  /** Duración en segundos del Access Token (usado para cache TTL) */
  ACCESS_EXPIRATION_SECONDS: 1 * 60 // 60 segundos = 1 minuto
} as const;

/**
 * Configuración de la cache en memoria
 * El TTL de la cache coincide con la duración del access token para mantener consistencia:
 * - Si el token es válido por 1 minuto, la cache de roles también debe serlo
 * - Invalidación automática al modificar roles vía endpoints /admin/*
 */
export const CACHE_CONFIG = {
  /** TTL de la cache en segundos (15 minutos = duración del Access Token) */
  TTL_SECONDS: JWT_CONFIG.ACCESS_EXPIRATION_SECONDS,
  /** Máximo número de entradas en cache (LRU eviction) */
  MAX_SIZE: 1000,
  /** Intervalo de limpieza automática en milisegundos (1 minuto) */
  CLEANUP_INTERVAL_MS: 60 * 1000
} as const;

/**
 * Configuración de logging
 * Controla qué mensajes se muestran según el nivel de log y entorno
 */
export const LOG_CONFIG = {
  /** Nivel de log actual (debug, info, warn, error) */
  LEVEL: (process.env.LOG_LEVEL || 'info') as 'debug' | 'info' | 'warn' | 'error',
  /** Habilitar logs de autenticación detallados */
  ENABLE_AUTH_LOGS: process.env.LOG_AUTH_ATTEMPTS === 'true' || process.env.NODE_ENV === 'development',
  /** Habilitar logs de LDAP detallados */
  ENABLE_LDAP_LOGS: process.env.LOG_LDAP_DEBUG === 'true' || process.env.NODE_ENV === 'development'
} as const;
