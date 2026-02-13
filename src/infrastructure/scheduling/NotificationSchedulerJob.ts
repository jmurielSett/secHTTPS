import cron, { ScheduledTask } from 'node-cron';
import { SendCertificateNotificationsUseCase } from '../../domain/usecases/notifications/SendCertificateNotificationsUseCase';

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
      console.warn('⚠️ Notification scheduler ya está en ejecución');
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

    console.log(`✅ Notification scheduler iniciado: ${this.cronExpression} (${process.env.TIMEZONE || 'Europe/Madrid'})`);
    this.logNextExecution();
  }

  /**
   * Detiene el scheduler
   */
  stop(): void {
    if (this.job) {
      this.job.stop();
      this.job = null;
      console.log('🛑 Notification scheduler detenido');
    }
  }

  /**
   * Ejecuta el proceso de notificaciones manualmente
   * (útil para testing o ejecución manual)
   */
  async executeNow(): Promise<void> {
    console.log('🔄 Ejecutando proceso de notificaciones manualmente...');
    await this.executeNotificationProcess();
  }

  /**
   * Ejecuta el UseCase y registra los resultados
   */
  private async executeNotificationProcess(): Promise<void> {
    const startTime = Date.now();
    console.log('\n' + '='.repeat(60));
    console.log('📧 Iniciando proceso de notificaciones de certificados');
    console.log('='.repeat(60));

    try {
      const summary = await this.useCase.execute();

      const duration = Date.now() - startTime;

      console.log('\n📊 Resumen de Ejecución:');
      console.log(`   Hora: ${new Date(summary.executedAt).toLocaleString()}`);
      console.log(`   Certificados verificados: ${summary.totalCertificatesChecked}`);
      console.log(`   Certificados pendientes: ${summary.totalCertificatesNeedingNotification}`);
      console.log(`   ✅ Notificaciones enviadas: ${summary.totalNotificationsSent}`);
      console.log(`   ❌ Notificaciones fallidas: ${summary.totalNotificationsFailed}`);
      console.log(`   ⏱️  Duración: ${duration}ms`);

      if (summary.results.length > 0) {
        console.log('\n📝 Detalle de Notificaciones:');
        for (const result of summary.results) {
          const icon = result.success ? '✅' : '❌';
          const status = result.success ? 'Enviado' : `Error: ${result.error}`;
          console.log(`   ${icon} ${result.certificateFileName} (${result.certificateId}): ${status}`);
        }
      } else {
        console.log('\n✨ No hay certificados que requieran notificación en este momento');
      }

      console.log('='.repeat(60));
      console.log('✅ Proceso de notificaciones completado exitosamente\n');
      
      this.logNextExecution();
    } catch (error) {
      console.error('\n❌ Error en proceso de notificaciones:', error);
      console.error('='.repeat(60) + '\n');
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
      console.log(`⏰ Próxima ejecución: ${next.toLocaleString()}\n`);
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
