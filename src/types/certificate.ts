export type CertificateStatus = 'ACTIVE' | 'DELETED';
export type ExpirationStatus = 'NORMAL' | 'WARNING' | 'EXPIRED';

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
