/**
 * Configuraciones compartidas del sistema de autenticación
 */

/**
 * Configuración de JWT tokens
 */
export const JWT_CONFIG = {
  /** Duración del Access Token: 15 minutos */
  ACCESS_EXPIRATION: '15m',
  /** Duración del Refresh Token: 7 días */
  REFRESH_EXPIRATION: '7d',
  /** Duración en segundos del Access Token (usado para cache TTL) */
  ACCESS_EXPIRATION_SECONDS: 15 * 60 // 900 segundos = 15 minutos
} as const;

/**
 * Configuración de la cache en memoria
 * El TTL de la cache coincide con la duración del access token para mantener consistencia:
 * - Si el token es válido por 15 minutos, la cache de roles también debe serlo
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
