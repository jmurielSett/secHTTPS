import cron, { ScheduledTask } from 'node-cron';
import { SendCertificateNotificationsUseCase } from '../../domain/usecases/notifications/SendCertificateNotificationsUseCase';
import { logError, logInfo, logWarn } from '../../utils/logger';

/**
 * Scheduler que ejecuta el proceso de notificaciones de certificados
 * usando node-cron para programar ejecuciones automáticas.
 * 
 * Este job se ejecuta diariamente a la hora configurada y:
 * 1. Busca certificados WARNING o EXPIRED
 * 2. Filtra los que necesitan notificación según frecuencia
 * 3. Envía emails y guarda registros
 */
export class NotificationSchedulerJob {
  private job: ScheduledTask | null = null;
  private readonly cronExpression: string;
  private readonly useCase: SendCertificateNotificationsUseCase;

  /**
   * @param useCase UseCase que ejecuta la lógica de notificaciones
   * @param cronExpression Expresión cron (por defecto '0 8 * * *' = cada día a las 8:00 AM)
   */
  constructor(
    useCase: SendCertificateNotificationsUseCase,
    cronExpression: string = '0 8 * * *'
  ) {
    this.cronExpression = cronExpression;
    this.useCase = useCase;
  }

  /**
   * Inicia el scheduler
   */
  start(): void {
    if (this.job) {
      logWarn('⚠️ Notification scheduler ya está en ejecución');
      return;
    }

    // Validar expresión cron
    if (!cron.validate(this.cronExpression)) {
      throw new Error(`Expresión cron inválida: ${this.cronExpression}`);
    }

    // Crear y programar el job
    this.job = cron.schedule(
      this.cronExpression,
      async () => {
        await this.executeNotificationProcess();
      },
      {
        timezone: process.env.TIMEZONE || 'Europe/Madrid' // Timezone configurable
      }
    );

    logInfo(`✅ Notification scheduler iniciado: ${this.cronExpression} (${process.env.TIMEZONE || 'Europe/Madrid'})`);
    this.logNextExecution();
  }

  /**
   * Detiene el scheduler
   */
  stop(): void {
    if (this.job) {
      this.job.stop();
      this.job = null;
      logInfo('🛑 Notification scheduler detenido');
    }
  }

  /**
   * Ejecuta el proceso de notificaciones manualmente
   * (útil para testing o ejecución manual)
   */
  async executeNow(): Promise<void> {
    logInfo('🔄 Ejecutando proceso de notificaciones manualmente...');
    await this.executeNotificationProcess();
  }

  /**
   * Ejecuta el UseCase y registra los resultados
   */
  private async executeNotificationProcess(): Promise<void> {
    const startTime = Date.now();
    logInfo('\n' + '='.repeat(60));
    logInfo('📧 Iniciando proceso de notificaciones de certificados');
    logInfo('='.repeat(60));

    try {
      const summary = await this.useCase.execute();

      const duration = Date.now() - startTime;

      logInfo('\n📊 Resumen de Ejecución:');
      logInfo(`   Hora: ${new Date(summary.executedAt).toLocaleString()}`);
      logInfo(`   Certificados verificados: ${summary.totalCertificatesChecked}`);
      logInfo(`   Certificados pendientes: ${summary.totalCertificatesNeedingNotification}`);
      logInfo(`   ✅ Notificaciones enviadas: ${summary.totalNotificationsSent}`);
      logInfo(`   ❌ Notificaciones fallidas: ${summary.totalNotificationsFailed}`);
      logInfo(`   ⏱️  Duración: ${duration}ms`);

      if (summary.results.length > 0) {
        logInfo('\n📝 Detalle de Notificaciones:');
        for (const result of summary.results) {
          const icon = result.success ? '✅' : '❌';
          const status = result.success ? 'Enviado' : `Error: ${result.error}`;
          logInfo(`   ${icon} ${result.certificateFileName} (${result.certificateId}): ${status}`);
        }
      } else {
        logInfo('\n✨ No hay certificados que requieran notificación en este momento');
      }

      logInfo('='.repeat(60));
      logInfo('✅ Proceso de notificaciones completado exitosamente\n');
      
      this.logNextExecution();
    } catch (error) {
      logError('\n❌ Error en proceso de notificaciones:', error instanceof Error ? error : undefined);
      logError('='.repeat(60));
    }
  }

  /**
   * Muestra información sobre la próxima ejecución programada
   */
  private logNextExecution(): void {
    if (!this.job) return;

    // Calcular próxima ejecución (aproximado)
    const next = this.getNextExecutionTime();
    if (next) {
      logInfo(`⏰ Próxima ejecución: ${next.toLocaleString()}\n`);
    }
  }

  /**
   * Calcula la próxima fecha de ejecución basada en la expresión cron
   * (Implementación simplificada para expresiones comunes)
   */
  private getNextExecutionTime(): Date | null {
    // Para expresiones como '0 8 * * *' (cada día a una hora específica)
    const parts = this.cronExpression.split(' ');
    if (parts.length !== 5) return null;

    const [minute, hour] = parts;
    
    // Si son valores específicos (no wildcards)
    if (minute !== '*' && hour !== '*') {
      const now = new Date();
      const next = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        Number.parseInt(hour),
        Number.parseInt(minute),
        0,
        0
      );

      // Si ya pasó hoy, programar para mañana
      if (next <= now) {
        next.setDate(next.getDate() + 1);
      }

      return next;
    }

    return null;
  }

  /**
   * Obtiene el estado actual del scheduler
   */
  getStatus(): { running: boolean; cronExpression: string; timezone: string } {
    return {
      running: this.job !== null,
      cronExpression: this.cronExpression,
      timezone: process.env.TIMEZONE || 'Europe/Madrid'
    };
  }
}
