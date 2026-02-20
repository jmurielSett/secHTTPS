/**
 * Authentication Provider Interface
 * Allows different authentication strategies (LDAP, Database, OAuth, etc.)
 */
export interface AuthenticationResult {
  success: boolean;
  userId?: string;
  username?: string;
  email?: string;
  error?: string;
  providerDetails?: string; // e.g., 'ldap://192.168.1.8:389' for LDAP, 'DATABASE' for database
  isConnectionError?: boolean; // true when server is unreachable (timeout, network error)
  isLdapOnlyUser?: boolean; // true when user exists in DB with dummy_hash (LDAP-synced, cannot auth locally)
  isUserNotFoundInDb?: boolean; // true when user does not exist in local DB at all
  isDatabaseUser?: boolean; // true when user is a known local DB user (authProvider=DATABASE) and password is wrong
}

export interface IAuthenticationProvider {
  /**
   * Provider name for logging/debugging
   */
  readonly name: string;

  /**
   * Attempts to authenticate user with given credentials
   * @param username - User's username
   * @param password - User's password
   * @returns Authentication result
   */
  authenticate(username: string, password: string): Promise<AuthenticationResult>;

  /**
   * Check if provider is available/configured
   */
  isAvailable(): Promise<boolean>;
}
