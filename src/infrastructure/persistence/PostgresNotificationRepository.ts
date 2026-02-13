import { randomUUID } from 'node:crypto';
import { GetNotificationsFilters } from '../../domain/usecases/notifications/GetNotificationsUseCase';
import { Notification } from '../../types/notification';
import { getPool } from '../database/connection';
import { INotificationRepository } from './NotificationRepository';

export class PostgresNotificationRepository implements INotificationRepository {
  
  async save(notification: Notification): Promise<Notification> {
    const client = await getPool().connect();
    
    try {
      await client.query('BEGIN');
      
      // Insert notification
      const insertNotificationQuery = `
        INSERT INTO notifications (
          id, certificate_id, sent_at, subject, 
          expiration_status_at_time, result, error_message
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;
      
      await client.query(insertNotificationQuery, [
        notification.id,
        notification.certificateId,
        notification.sentAt,
        notification.subject,
        notification.expirationStatusAtTime,
        notification.result,
        notification.errorMessage
      ]);
      
      // Insert recipient emails
      if (notification.recipientEmails && notification.recipientEmails.length > 0) {
        const insertEmailQuery = `
          INSERT INTO notification_recipient_emails (id, notification_id, email)
          VALUES ($1, $2, $3)
        `;
        
        for (const email of notification.recipientEmails) {
          await client.query(insertEmailQuery, [
            randomUUID(),
            notification.id,
            email
          ]);
        }
      }
      
      await client.query('COMMIT');
      return notification;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async findByCertificateId(certificateId: string): Promise<Notification[]> {
    const query = `
      SELECT 
        n.*,
        e.email
      FROM notifications n
      LEFT JOIN notification_recipient_emails e ON n.id = e.notification_id
      WHERE n.certificate_id = $1
      ORDER BY n.sent_at DESC
    `;
    
    const result = await getPool().query(query, [certificateId]);
    
    if (result.rows.length === 0) {
      return [];
    }
    
    return this.groupNotifications(result.rows);
  }

  async findAll(filters?: GetNotificationsFilters): Promise<Notification[]> {
    let query = `
      SELECT 
        n.*,
        e.email
      FROM notifications n
      LEFT JOIN notification_recipient_emails e ON n.id = e.notification_id
    `;
    
    const conditions: string[] = [];
    const values: any[] = [];
    let paramCounter = 1;

    if (filters?.certificateId) {
      conditions.push(`n.certificate_id = $${paramCounter}`);
      values.push(filters.certificateId);
      paramCounter++;
    }

    if (filters?.result) {
      conditions.push(`n.result = $${paramCounter}`);
      values.push(filters.result);
      paramCounter++;
    }

    if (filters?.expirationStatus) {
      conditions.push(`n.expiration_status_at_time = $${paramCounter}`);
      values.push(filters.expirationStatus);
      paramCounter++;
    }

    if (filters?.startDate) {
      conditions.push(`n.sent_at >= $${paramCounter}`);
      values.push(filters.startDate);
      paramCounter++;
    }

    if (filters?.endDate) {
      conditions.push(`n.sent_at <= $${paramCounter}`);
      values.push(filters.endDate);
      paramCounter++;
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY n.sent_at DESC';
    
    const result = await getPool().query(query, values);
    
    if (result.rows.length === 0) {
      return [];
    }
    
    return this.groupNotifications(result.rows);
  }

  /**
   * Maps database rows to a single Notification object
   * Handles multiple rows with the same notification but different emails
   */
  private mapRowsToNotification(rows: any[]): Notification {
    const firstRow = rows[0];
    
    const recipientEmails = rows
      .map(row => row.email)
      .filter((email): email is string => email !== null);
    
    return {
      id: firstRow.id,
      certificateId: firstRow.certificate_id,
      sentAt: firstRow.sent_at,
      recipientEmails,
      subject: firstRow.subject,
      expirationStatusAtTime: firstRow.expiration_status_at_time,
      result: firstRow.result,
      errorMessage: firstRow.error_message
    };
  }

  /**
   * Groups multiple rows into Notification objects
   * Handles JOIN results where one notification can have multiple email rows
   */
  private groupNotifications(rows: any[]): Notification[] {
    const notificationMap = new Map<string, any[]>();
    
    // Group rows by notification id
    for (const row of rows) {
      const notifId = row.id;
      if (!notificationMap.has(notifId)) {
        notificationMap.set(notifId, []);
      }
      notificationMap.get(notifId)!.push(row);
    }
    
    // Convert each group to a Notification object
    const notifications: Notification[] = [];
    for (const [_, notifRows] of notificationMap) {
      notifications.push(this.mapRowsToNotification(notifRows));
    }
    
    return notifications;
  }
}
