/**
 * Logger del cliente (browser)
 * En producción (import.meta.env.PROD) los mensajes debug/info se suprimen.
 * Los errores siempre se emiten para no perder información crítica.
 */

const isDev = import.meta.env.DEV;

export function clientLog(message: string): void {
  if (isDev) {
    console.log(`[INFO]  ${message}`);
  }
}

export function clientWarn(message: string): void {
  if (isDev) {
    console.warn(`[WARN]  ${message}`);
  }
}

export function clientError(message: string, error?: unknown): void {
  // Los errores siempre se emiten (dev y prod) para no silenciar fallos reales
  console.error(`[ERROR] ${message}`, error ?? '');
}
