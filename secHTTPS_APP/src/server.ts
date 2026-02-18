import dotenv from 'dotenv';
dotenv.config();

import { createApp } from './app';
import { SendCertificateNotificationsUseCase } from './domain/usecases/notifications/SendCertificateNotificationsUseCase';
import { LocalizationService } from './infrastructure/localization/LocalizationService';
import { NodemailerEmailService } from './infrastructure/messaging/NodemailerEmailService';
import { NotificationSchedulerJob } from './infrastructure/scheduling/NotificationSchedulerJob';
import { logError, logInfo, logWarn } from './utils/logger';

const PORT = process.env.PORT || 3000;
const USE_POSTGRES = process.env.USE_POSTGRES === 'true';
const ENABLE_SCHEDULER = process.env.ENABLE_SCHEDULER !== 'false'; // Habilitado por defecto
const CRON_EXPRESSION = process.env.CRON_EXPRESSION || '0 8 * * *'; // 8:00 AM por defecto

void (async () => {
  try {
    // Create app with configured repositories (handles DB connection internally)
    const { app, repositories } = await createApp(USE_POSTGRES);

    // Start HTTP server
    app.listen(PORT, () => {
      logInfo(`Server is running on http://localhost:${PORT}`);
      logInfo(`Using ${USE_POSTGRES ? 'PostgreSQL' : 'In-Memory'} repository`);
    });

    // Initialize notification scheduler if enabled
    if (ENABLE_SCHEDULER) {
      try {
        // Verify SMTP configuration
        const emailService = new NodemailerEmailService();
        const isSmtpValid = await emailService.verifyConnection();

        if (isSmtpValid) {
          logInfo(`✅ SMTP configurado correctamente (${process.env.SMTP_HOST})`);
          
          // Create services
          const localizationService = new LocalizationService();
          
          // Create UseCase with dependencies
          const notificationUseCase = new SendCertificateNotificationsUseCase(
            repositories.certificateRepository,
            repositories.notificationRepository,
            emailService,
            localizationService
          );

          // Create and start scheduler
          const scheduler = new NotificationSchedulerJob(notificationUseCase, CRON_EXPRESSION);
          scheduler.start();

          // Graceful shutdown
          process.on('SIGINT', () => {
            logInfo('\n🛑 Shutting down gracefully...');
            scheduler.stop();
            process.exit(0);
          });

          process.on('SIGTERM', () => {
            logInfo('\n🛑 Shutting down gracefully...');
            scheduler.stop();
            process.exit(0);
          });
        } else {
          logWarn('⚠️ SMTP configuration is invalid. Scheduler will not be started.');
          logWarn('⚠️ Please check your SMTP settings in .env file.');
        }
      } catch (error) {
        logError('❌ Error initializing notification scheduler:', error instanceof Error ? error : undefined);
        logWarn('⚠️ Server will continue without automatic notifications.');
      }
    } else {
      logInfo('ℹ️ Notification scheduler is disabled (ENABLE_SCHEDULER=false)');
    }
  } catch (error) {
    logError('Failed to start server:', error instanceof Error ? error : undefined);
    process.exit(1);
  }
})();
