import dotenv from 'dotenv';
dotenv.config();

import { createApp } from './app';
import { SendCertificateNotificationsUseCase } from './domain/usecases/notifications/SendCertificateNotificationsUseCase';
import { NodemailerEmailService } from './infrastructure/messaging/NodemailerEmailService';
import { NotificationSchedulerJob } from './infrastructure/scheduling/NotificationSchedulerJob';

const PORT = process.env.PORT || 3000;
const USE_POSTGRES = process.env.USE_POSTGRES === 'true';
const ENABLE_SCHEDULER = process.env.ENABLE_SCHEDULER !== 'false'; // Habilitado por defecto
const CRON_EXPRESSION = process.env.CRON_EXPRESSION || '0 8 * * *'; // 8:00 AM por defecto

async function startServer() {
  try {
    // Create app with configured repositories (handles DB connection internally)
    const { app, repositories } = await createApp(USE_POSTGRES);

    // Start HTTP server
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
      console.log(`Using ${USE_POSTGRES ? 'PostgreSQL' : 'In-Memory'} repository`);
    });

    // Initialize notification scheduler if enabled
    if (ENABLE_SCHEDULER) {
      try {
        // Verify SMTP configuration
        const emailService = new NodemailerEmailService();
        const isSmtpValid = await emailService.verifyConnection();

        if (isSmtpValid) {
          console.log(`✅ SMTP configurado correctamente (${process.env.SMTP_HOST})`);
          
          // Create UseCase with dependencies
          const notificationUseCase = new SendCertificateNotificationsUseCase(
            repositories.certificateRepository,
            repositories.notificationRepository,
            emailService
          );

          // Create and start scheduler
          const scheduler = new NotificationSchedulerJob(notificationUseCase, CRON_EXPRESSION);
          scheduler.start();

          // Graceful shutdown
          process.on('SIGINT', () => {
            console.log('\n🛑 Shutting down gracefully...');
            scheduler.stop();
            process.exit(0);
          });

          process.on('SIGTERM', () => {
            console.log('\n🛑 Shutting down gracefully...');
            scheduler.stop();
            process.exit(0);
          });
        } else {
          console.warn('⚠️ SMTP configuration is invalid. Scheduler will not be started.');
          console.warn('⚠️ Please check your SMTP settings in .env file.');
        }
      } catch (error) {
        console.error('❌ Error initializing notification scheduler:', error);
        console.warn('⚠️ Server will continue without automatic notifications.');
      }
    } else {
      console.log('ℹ️ Notification scheduler is disabled (ENABLE_SCHEDULER=false)');
    }
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
