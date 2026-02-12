import { ExpirationStatus } from './shared';

export enum CertificateStatus {
  ACTIVE = 'ACTIVE',
  DELETED = 'DELETED'
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
  responsibleEmails: string[];
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
  responsibleEmails: string[];
}

export interface UpdateCertificateDTO {
  fileName?: string;
  startDate?: string;
  expirationDate?: string;
  server?: string;
  filePath?: string;
  client?: string;
  configPath?: string;
  responsibleEmails?: string[];
}
