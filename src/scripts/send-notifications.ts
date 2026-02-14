import dotenv from 'dotenv';
import { SendCertificateNotificationsUseCase } from '../domain/usecases/notifications/SendCertificateNotificationsUseCase';
import { closeDatabaseConnection } from '../infrastructure/database/connection';
import { LocalizationService } from '../infrastructure/localization/LocalizationService';
import { NodemailerEmailService } from '../infrastructure/messaging/NodemailerEmailService';
import { InMemoryCertificateRepository } from '../infrastructure/persistence/CertificateRepository';
import { InMemoryNotificationRepository } from '../infrastructure/persistence/NotificationRepository';
import { PostgresCertificateRepository } from '../infrastructure/persistence/PostgresCertificateRepository';
import { PostgresNotificationRepository } from '../infrastructure/persistence/PostgresNotificationRepository';

// Load environment variables from .env
dotenv.config();

const USE_POSTGRES = process.env.USE_POSTGRES === 'true';

void (async () => {
  try {
    console.log('🚀 Starting manual certificate notification process...');
    console.log(`📦 Using ${USE_POSTGRES ? 'PostgreSQL' : 'In-Memory'} repository`);
    console.log('⚡ FORCE MODE: Ignoring frequency rules (saved as FORCE in database)');
    
    // Create repositories
    const certificateRepository = USE_POSTGRES 
      ? new PostgresCertificateRepository()
      : new InMemoryCertificateRepository();
    
    const notificationRepository = USE_POSTGRES
      ? new PostgresNotificationRepository()
      : new InMemoryNotificationRepository();

    // Create services
    let emailService;
    try {
      emailService = new NodemailerEmailService();
      const isSmtpValid = await emailService.verifyConnection();
      
      if (!isSmtpValid) {
        console.error('❌ SMTP configuration is invalid');
        console.error('⚠️  Please check your SMTP settings in .env file');
        process.exit(1);
      }
      
      console.log(`✅ SMTP configured correctly (${process.env.SMTP_HOST})`);
    } catch (error) {
      console.error('❌ Error initializing email service:', error);
      console.error('⚠️  Please check your SMTP configuration in .env file');
      process.exit(1);
    }

    const localizationService = new LocalizationService();
    
    // Create use case
    const sendNotificationsUseCase = new SendCertificateNotificationsUseCase(
      certificateRepository,
      notificationRepository,
      emailService,
      localizationService
    );

    // Execute notification process
    console.log('📨 Checking certificates and sending notifications...\n');
    const summary = await sendNotificationsUseCase.execute(true);

    // Display results
    console.log('\n📊 Notification Process Summary');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`⏰ Executed at: ${summary.executedAt}`);
    console.log(`🔍 Total certificates checked: ${summary.totalCertificatesChecked}`);
    console.log(`📧 Certificates needing notification: ${summary.totalCertificatesNeedingNotification}`);
    console.log(`✅ Notifications sent: ${summary.totalNotificationsSent}`);
    console.log(`❌ Notifications failed: ${summary.totalNotificationsFailed}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Display details if there are results
    if (summary.results.length > 0) {
      console.log('📋 Details by Certificate:');
      summary.results.forEach((result, index) => {
        const statusEmoji = result.success ? '✅' : '❌';
        console.log(`\n${index + 1}. ${statusEmoji} ${result.certificateFileName} (${result.certificateId})`);
        
        if (result.success) {
          console.log(`   ✅ Notification sent successfully`);
        } else {
          console.log(`   ❌ Failed: ${result.error}`);
        }
      });
    } else {
      console.log('ℹ️  No certificates require notification at this time');
    }

    console.log('\n✅ Notification process completed successfully');
  } catch (error) {
    console.error('\n❌ Notification process failed:', error);
    process.exit(1);
  } finally {
    if (USE_POSTGRES) {
      await closeDatabaseConnection();
    }
  }
})();
