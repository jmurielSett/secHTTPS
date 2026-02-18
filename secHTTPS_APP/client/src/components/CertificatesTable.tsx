import { useState } from 'react';
import { ExpirationStatus } from '../../../src/types/shared';
import './CertificatesTable.css';

interface Contact {
  email: string;
  name?: string;
}

interface Certificate {
  id: string;
  fileName: string;
  client: string;
  server: string;
  startDate: string;
  expirationDate: string;
  expirationStatus: ExpirationStatus;
  responsibleContacts: Contact[];
}

interface CertificatesTableProps {
  certificates: Certificate[];
  onRowClick?: (certificate: Certificate) => void;
}

type SortKey = 'fileName' | 'client' | 'server' | 'expirationDate' | 'expirationStatus';
type SortDirection = 'asc' | 'desc';

function SortIcon({ columnKey, sortKey, sortDirection }: Readonly<{ columnKey: SortKey; sortKey: SortKey; sortDirection: SortDirection }>) {
  if (sortKey !== columnKey) {
    return <span className="sort-icon">⇅</span>;
  }
  return <span className="sort-icon active">{sortDirection === 'asc' ? '↑' : '↓'}</span>;
}

export function CertificatesTable({ certificates, onRowClick }: Readonly<CertificatesTableProps>) {
  const [sortKey, setSortKey] = useState<SortKey>('expirationDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const sortedCertificates = [...certificates].sort((a, b) => {
    let aValue: any = a[sortKey];
    let bValue: any = b[sortKey];

    if (sortKey === 'expirationDate') {
      aValue = new Date(aValue).getTime();
      bValue = new Date(bValue).getTime();
    } else if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getExpirationClass = (status: ExpirationStatus) => {
    switch (status) {
      case ExpirationStatus.NORMAL:
        return 'badge normal';
      case ExpirationStatus.WARNING:
        return 'badge warning';
      case ExpirationStatus.EXPIRED:
        return 'badge expired';
      default:
        return 'badge normal';
    }
  };

  return (
    <div className="table-container">
      <table className="certificates-table">
        <thead>
          <tr>
            <th onClick={() => handleSort('fileName')} className="sortable">
              Nombre <SortIcon columnKey="fileName" sortKey={sortKey} sortDirection={sortDirection} />
            </th>
            <th onClick={() => handleSort('client')} className="sortable">
              Cliente <SortIcon columnKey="client" sortKey={sortKey} sortDirection={sortDirection} />
            </th>
            <th onClick={() => handleSort('server')} className="sortable">
              Servidor <SortIcon columnKey="server" sortKey={sortKey} sortDirection={sortDirection} />
            </th>
            <th onClick={() => handleSort('expirationDate')} className="sortable">
              F. Expiración <SortIcon columnKey="expirationDate" sortKey={sortKey} sortDirection={sortDirection} />
            </th>
            <th onClick={() => handleSort('expirationStatus')} className="sortable">
              Estado <SortIcon columnKey="expirationStatus" sortKey={sortKey} sortDirection={sortDirection} />
            </th>
            <th>Responsables</th>
          </tr>
        </thead>
        <tbody>
          {sortedCertificates.map((cert) => (
            <tr 
              key={cert.id}
              onClick={() => onRowClick?.(cert)}
              style={{ cursor: onRowClick ? 'pointer' : 'default' }}
              className="table-row-clickable"
            >
              <td className="file-cell" title={cert.fileName}>
                {cert.fileName}
              </td>
              <td>{cert.client}</td>
              <td>{cert.server}</td>
              <td>
                {formatDate(cert.expirationDate)}
              </td>
              <td>
                <span className={getExpirationClass(cert.expirationStatus)}>
                  {cert.expirationStatus}
                </span>
              </td>
              <td className="contacts-cell">
                {cert.responsibleContacts.slice(0, 2).map((contact) => (
                  <div key={contact.email} title={contact.email}>
                    {contact.email}
                  </div>
                ))}
                {cert.responsibleContacts.length > 2 && (
                  <small className="more-contacts">+{cert.responsibleContacts.length - 2} más</small>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
