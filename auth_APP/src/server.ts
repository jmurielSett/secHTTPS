import { createApp } from './app';
import { CACHE_CONFIG, JWT_CONFIG } from './types/shared';
import { logError, logInfo } from './utils/logger';

const PORT = process.env.PORT || 4000;
const USE_POSTGRES = process.env.USE_POSTGRES === 'true';

// Using IIFE for async execution in CommonJS
// eslint-disable-next-line @typescript-eslint/no-floating-promises
(async () => {
  try {
    logInfo('🚀 Starting Auth Service...');
    
    // Create app with configured repositories (handles DB connection internally)
    const { app } = await createApp(USE_POSTGRES);

    // Start HTTP server
    app.listen(PORT, () => {
      logInfo(`✅ Auth Service running on http://localhost:${PORT}`);
      logInfo(`📦 Using ${USE_POSTGRES ? 'PostgreSQL' : 'In-Memory'} repository`);
      logInfo(`🔐 JWT Access Token: ${JWT_CONFIG.ACCESS_EXPIRATION}`);
      logInfo(`🔐 JWT Refresh Token: ${JWT_CONFIG.REFRESH_EXPIRATION}`);
      logInfo(`💾 Cache TTL: ${CACHE_CONFIG.TTL_SECONDS}s (${CACHE_CONFIG.TTL_SECONDS / 60} min)`);
    });
  } catch (err) {
    logError('❌ Failed to start Auth Service:', err instanceof Error ? err : undefined);
    process.exit(1);
  }
})();
