import { Pool } from 'pg';
import {
    Application,
    ApplicationLdapConfig,
    IApplicationRepository
} from '../../domain/repositories/IApplicationRepository';

/**
 * PostgreSQL Application Repository
 * Handles application data persistence in PostgreSQL
 */
export class PostgresApplicationRepository implements IApplicationRepository {
  constructor(private readonly pool: Pool) {}

  async findByName(name: string): Promise<Application | null> {
    const result = await this.pool.query(
      'SELECT id, name, description, is_active, allow_ldap_sync, ldap_default_role, created_at FROM applications WHERE name = $1',
      [name]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      isActive: row.is_active,
      allowLdapSync: row.allow_ldap_sync,
      ldapDefaultRole: row.ldap_default_role,
      createdAt: row.created_at
    };
  }

  async getApplicationLdapConfig(applicationName: string): Promise<ApplicationLdapConfig | null> {
    const result = await this.pool.query(
      'SELECT name, allow_ldap_sync, ldap_default_role FROM applications WHERE name = $1 AND is_active = TRUE',
      [applicationName]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      applicationName: row.name,
      allowLdapSync: row.allow_ldap_sync || false,
      ldapDefaultRole: row.ldap_default_role
    };
  }
}
