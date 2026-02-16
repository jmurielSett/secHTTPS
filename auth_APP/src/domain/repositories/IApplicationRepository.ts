export interface Application {
  id?: number;
  name: string;
  description?: string;
  isActive?: boolean;
  allowLdapSync?: boolean;
  ldapDefaultRole?: string | null;
  createdAt?: string;
}

export interface ApplicationLdapConfig {
  applicationName: string;
  allowLdapSync: boolean;
  ldapDefaultRole: string | null;
}

/**
 * Application Repository Interface
 * Contract for application persistence operations
 */
export interface IApplicationRepository {
  /**
   * Finds an application by name
   * @param name - Application name
   * @returns Application if found, null otherwise
   */
  findByName(name: string): Promise<Application | null>;

  /**
   * Gets LDAP sync configuration for an application
   * @param applicationName - Application name
   * @returns LDAP configuration if application found, null otherwise
   */
  getApplicationLdapConfig(applicationName: string): Promise<ApplicationLdapConfig | null>;
}
