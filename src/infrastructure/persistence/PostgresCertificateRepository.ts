import { randomUUID } from 'node:crypto';
import { ICertificateRepository } from '../../domain/repositories/ICertificateRepository';
import { CertificateExpirationService } from '../../domain/services/CertificateExpirationService';
import { GetCertificatesFilters } from '../../domain/usecases/certificates/GetCertificatesUseCase';
import { Certificate, CertificateStatus } from '../../types/certificate';
import { getPool } from '../database/connection';

export class PostgresCertificateRepository implements ICertificateRepository {
  
  async save(certificate: Certificate): Promise<Certificate> {
    const client = await getPool().connect();
    
    try {
      await client.query('BEGIN');
      
      // Insert certificate
      const insertCertificateQuery = `
        INSERT INTO certificates (
          id, file_name, start_date, expiration_date, server, 
          file_path, client, config_path, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `;
      
      await client.query(insertCertificateQuery, [
        certificate.id,
        certificate.fileName,
        certificate.startDate,
        certificate.expirationDate,
        certificate.server,
        certificate.filePath,
        certificate.client,
        certificate.configPath,
        certificate.status,
        certificate.createdAt,
        certificate.updatedAt
      ]);
      
      // Insert responsible emails
      if (certificate.responsibleEmails && certificate.responsibleEmails.length > 0) {
        const insertEmailQuery = `
          INSERT INTO certificate_responsible_emails (id, certificate_id, email)
          VALUES ($1, $2, $3)
        `;
        
        for (const email of certificate.responsibleEmails) {
          await client.query(insertEmailQuery, [
            randomUUID(),
            certificate.id,
            email
          ]);
        }
      }
      
      await client.query('COMMIT');
      return certificate;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async findById(id: string): Promise<Certificate | null> {
    const query = `
      SELECT 
        c.*,
        e.email
      FROM certificates c
      LEFT JOIN certificate_responsible_emails e ON c.id = e.certificate_id
      WHERE c.id = $1
    `;
    
    const result = await getPool().query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowsToCertificate(result.rows);
  }

  async findAll(filters?: GetCertificatesFilters): Promise<Certificate[]> {
    let query = `
      SELECT 
        c.*,
        e.email
      FROM certificates c
      LEFT JOIN certificate_responsible_emails e ON c.id = e.certificate_id
    `;
    
    const conditions: string[] = [];
    const values: any[] = [];
    let paramCounter = 1;

    if (filters?.client) {
      conditions.push(`c.client = $${paramCounter}`);
      values.push(filters.client);
      paramCounter++;
    }

    if (filters?.server) {
      conditions.push(`c.server = $${paramCounter}`);
      values.push(filters.server);
      paramCounter++;
    }

    if (filters?.fileName) {
      conditions.push(`c.file_name = $${paramCounter}`);
      values.push(filters.fileName);
      paramCounter++;
    }

    if (filters?.status) {
      conditions.push(`c.status = $${paramCounter}`);
      values.push(filters.status);
      paramCounter++;
    }

    // Note: expirationStatus is calculated at runtime, not stored in DB
    // So we can't filter by it at SQL level

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY c.created_at DESC';
    
    const result = await getPool().query(query, values);
    
    if (result.rows.length === 0) {
      return [];
    }
    
    let certificates = this.groupCertificates(result.rows);

    // Apply expirationStatus filter after fetching (can't be done in SQL)
    if (filters?.expirationStatus) {
      certificates = certificates.filter(
        cert => cert.expirationStatus === filters.expirationStatus
      );
    }

    return certificates;
  }

  async update(certificate: Certificate): Promise<Certificate> {
    const client = await getPool().connect();
    
    try {
      await client.query('BEGIN');
      
      // Update certificate
      const updateCertificateQuery = `
        UPDATE certificates
        SET 
          file_name = $2,
          start_date = $3,
          expiration_date = $4,
          server = $5,
          file_path = $6,
          client = $7,
          config_path = $8,
          status = $9,
          updated_at = $10
        WHERE id = $1
      `;
      
      await client.query(updateCertificateQuery, [
        certificate.id,
        certificate.fileName,
        certificate.startDate,
        certificate.expirationDate,
        certificate.server,
        certificate.filePath,
        certificate.client,
        certificate.configPath,
        certificate.status,
        certificate.updatedAt
      ]);
      
      // Delete old emails
      await client.query(
        'DELETE FROM certificate_responsible_emails WHERE certificate_id = $1',
        [certificate.id]
      );
      
      // Insert new emails
      if (certificate.responsibleEmails && certificate.responsibleEmails.length > 0) {
        const insertEmailQuery = `
          INSERT INTO certificate_responsible_emails (id, certificate_id, email)
          VALUES ($1, $2, $3)
        `;
        
        for (const email of certificate.responsibleEmails) {
          await client.query(insertEmailQuery, [
            randomUUID(),
            certificate.id,
            email
          ]);
        }
      }
      
      await client.query('COMMIT');
      return certificate;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async delete(id: string): Promise<void> {
    // Soft delete: update status to DELETED
    const query = `
      UPDATE certificates
      SET status = $2, updated_at = $3
      WHERE id = $1
    `;
    
    await getPool().query(query, [
      id,
      CertificateStatus.DELETED,
      new Date().toISOString()
    ]);
  }

  /**
   * Maps database rows to a single Certificate object
   * Handles multiple rows with the same certificate but different emails
   */
  private mapRowsToCertificate(rows: any[]): Certificate {
    const firstRow = rows[0];
    
    const responsibleEmails = rows
      .map(row => row.email)
      .filter((email): email is string => email !== null);
    
    const expirationStatus = CertificateExpirationService.calculateExpirationStatus(
      firstRow.expiration_date
    );
    
    return {
      id: firstRow.id,
      fileName: firstRow.file_name,
      startDate: firstRow.start_date,
      expirationDate: firstRow.expiration_date,
      server: firstRow.server,
      filePath: firstRow.file_path,
      client: firstRow.client,
      configPath: firstRow.config_path,
      responsibleEmails,
      status: firstRow.status,
      expirationStatus,
      createdAt: firstRow.created_at,
      updatedAt: firstRow.updated_at
    };
  }

  /**
   * Groups multiple rows into Certificate objects
   * Handles JOIN results where one certificate can have multiple email rows
   */
  private groupCertificates(rows: any[]): Certificate[] {
    const certificateMap = new Map<string, any[]>();
    
    // Group rows by certificate id
    for (const row of rows) {
      const certId = row.id;
      if (!certificateMap.has(certId)) {
        certificateMap.set(certId, []);
      }
      certificateMap.get(certId)!.push(row);
    }
    
    // Convert each group to a Certificate object
    const certificates: Certificate[] = [];
    for (const [_, certRows] of certificateMap) {
      certificates.push(this.mapRowsToCertificate(certRows));
    }
    
    return certificates;
  }
}
