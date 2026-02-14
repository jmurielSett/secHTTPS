import { ExpirationStatus } from './shared';

export enum CertificateStatus {
  ACTIVE = 'ACTIVE',
  DELETED = 'DELETED'
}

/**
 * Represents a responsible contact for a certificate with language preference
 */
export interface ResponsibleContact {
  email: string;
  language: string;  // ISO 639-1 language code: 'es', 'en', 'fr', 'de', etc.
  name?: string;     // Optional: contact name for personalization
}

export interface Certificate {
  id: string;
  fileName: string;
  startDate: string;
  expirationDate: string;
  server: string;
  filePath: string;
  client: string;
  configPath: string;
  responsibleContacts: ResponsibleContact[];
  status: CertificateStatus;
  expirationStatus: ExpirationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCertificateDTO {
  fileName: string;
  startDate: string;
  expirationDate: string;
  server: string;
  filePath: string;
  client: string;
  configPath: string;
  responsibleContacts: ResponsibleContact[];
}

export interface UpdateCertificateDTO {
  fileName?: string;
  startDate?: string;
  expirationDate?: string;
  server?: string;
  filePath?: string;
  client?: string;
  configPath?: string;
  responsibleContacts?: ResponsibleContact[];
}
