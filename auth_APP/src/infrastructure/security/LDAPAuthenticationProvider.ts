import {
  AuthenticationResult,
  IAuthenticationProvider
} from '../../domain/services/IAuthenticationProvider';
import { ldapLog, logError, logWarn } from '../../utils/logger';

/**
 * LDAP Server Configuration
 */
export interface LDAPServerConfig {
  nameProvider?: string; // e.g., 'LDAP_SETTING_1' - name for authProvider field (defaults to url if not provided)
  url: string; // e.g., 'ldap://ldap.example.com:389'
  baseDN: string; // e.g., 'dc=example,dc=com'
  userSearchBase?: string; // e.g., 'ou=users,dc=example,dc=com'
  userSearchFilter?: string; // e.g., '(uid={{username}})' or '(sAMAccountName={{username}})'
  bindDN?: string; // Admin DN for search (if required)
  bindPassword?: string; // Admin password for search (if required)
  timeout?: number; // Connection timeout in ms (default: 5000)
}

/**
 * Context for LDAP authentication operations
 */
interface LDAPAuthContext {
  ldap: any;
  server: LDAPServerConfig;
  username: string;
  password: string;
  userSearchBase: string;
  searchFilter: string;
}

/**
 * LDAP Authentication Provider
 * Authenticates users against one or multiple LDAP/Active Directory servers
 * 
 * IMPORTANT: Requires 'ldapjs' package. Install with: npm install ldapjs @types/ldapjs
 */
export class LDAPAuthenticationProvider implements IAuthenticationProvider {
  readonly name: string;

  constructor(
    private readonly servers: LDAPServerConfig[],
    providerName: string = 'LDAP'
  ) {
    this.name = providerName;

    if (servers.length === 0) {
      throw new Error('At least one LDAP server must be configured');
    }
  }

  async authenticate(username: string, password: string): Promise<AuthenticationResult> {
    ldapLog(`[${this.name}] 🔍 Attempting LDAP authentication for user: ${username}`);
    ldapLog(`[${this.name}] 📊 Will try ${this.servers.length} server(s)`);
    
    // Try each LDAP server in order until one succeeds
    for (let i = 0; i < this.servers.length; i++) {
      const server = this.servers[i];
      ldapLog(`[${this.name}] 🌐 Server ${i + 1}/${this.servers.length}: ${server.url}`);
      
      try {
        const result = await this.authenticateAgainstServer(server, username, password);
        if (result.success) {
          ldapLog(`[${this.name}] ✅ Authentication successful on server ${server.url}`);
          return result;
        } else {
          ldapLog(`[${this.name}] ⚠️  Authentication failed on ${server.url}: ${result.error}`);
        }
      } catch (err) {
        logError(`[${this.name}] ❌ Exception on ${server.url}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        // Continue to next server
      }
    }

    ldapLog(`[${this.name}] ❌ Failed on all ${this.servers.length} server(s)`);
    return {
      success: false,
      error: `Failed to authenticate against all ${this.servers.length} LDAP server(s)`
    };
  }

  private async authenticateAgainstServer(
    server: LDAPServerConfig,
    username: string,
    password: string
  ): Promise<AuthenticationResult> {
    ldapLog(`[${this.name}]   📍 Connecting to: ${server.url}`);
    ldapLog(`[${this.name}]   🔍 Search base: ${server.userSearchBase || server.baseDN}`);
    ldapLog(`[${this.name}]   🔍 Search filter: ${server.userSearchFilter}`);
    
    try {
      const ldap = await this.loadLdapModule();
      const userSearchBase = server.userSearchBase || server.baseDN;
      const searchFilter = (server.userSearchFilter || '(uid={{username}})')
        .replace('{{username}}', username);

      const context: LDAPAuthContext = {
        ldap,
        server,
        username,
        password,
        userSearchBase,
        searchFilter
      };

      return await this.performLdapAuthentication(context);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'LDAP authentication failed'
      };
    }
  }

  /**
   * Performs LDAP authentication with bind and search
   */
  private async performLdapAuthentication(context: LDAPAuthContext): Promise<AuthenticationResult> {
    return await new Promise<AuthenticationResult>((resolve) => {
      const client = context.ldap.createClient({
        url: context.server.url,
        timeout: context.server.timeout || 5000,
        connectTimeout: context.server.timeout || 5000
      });

      client.on('error', (err: any) => {
        logError(`[${this.name}]   ❌ Connection error: ${err.message}`);
        client.unbind();
        resolve({
          success: false,
          error: `Connection failed: ${err.message}`
        });
      });

      const bindDN = context.server.bindDN || `uid=${context.username},${context.userSearchBase}`;
      const bindPassword = context.server.bindDN ? context.server.bindPassword : context.password;

      ldapLog(`[${this.name}]   🔐 Binding as: ${context.server.bindDN ? 'admin' : 'user directly'}`);
      
      client.bind(bindDN, bindPassword || '', (bindErr: any) => {
        if (bindErr) {
          ldapLog(`[${this.name}]   ❌ Bind failed: ${bindErr.message}`);
          client.unbind();
          resolve({
            success: false,
            error: `LDAP bind failed: ${bindErr.message}`
          });
          return;
        }

        ldapLog(`[${this.name}]   ✅ Bind successful, searching for user...`);
        this.searchAndAuthenticateUser(client, context, resolve);
      });
    });
  }

  /**
   * Searches for user and authenticates with their credentials
   */
  private searchAndAuthenticateUser(
    client: any,
    context: LDAPAuthContext,
    resolve: (value: AuthenticationResult) => void
  ): void {
    client.search(context.userSearchBase, {
      filter: context.searchFilter,
      scope: 'sub',
      attributes: ['uid', 'cn', 'mail', 'sAMAccountName', 'userPrincipalName']
    }, (searchErr: any, searchRes: any) => {
      if (searchErr) {
        logError(`[${this.name}]   ❌ Search error: ${searchErr.message}`);
        client.unbind();
        resolve({
          success: false,
          error: `LDAP search failed: ${searchErr.message}`
        });
        return;
      }

      let userDN: string | null = null;
      let userAttributes: any = {};
      let foundCount = 0;

      searchRes.on('searchEntry', (entry: any) => {
        foundCount++;
        userDN = String(entry.objectName || entry.dn || '');
        userAttributes = this.extractUserAttributes(entry);
        
        ldapLog(`[${this.name}]   ✅ Found user: ${userDN}`);
        ldapLog(`[${this.name}]   📧 Email: ${userAttributes.mail || 'not found'}`);
      });

      searchRes.on('end', () => {
        if (!userDN) {
          ldapLog(`[${this.name}]   ⚠️  User not found (searched ${foundCount} entries)`);
          client.unbind();
          resolve({
            success: false,
            error: 'User not found in LDAP'
          });
          return;
        }

        this.authenticateUserCredentials(client, context, userDN, userAttributes, resolve);
      });

      searchRes.on('error', (err: any) => {
        client.unbind();
        resolve({
          success: false,
          error: `LDAP search error: ${err.message}`
        });
      });
    });
  }

  /**
   * Extracts user attributes from LDAP entry
   */
  private extractUserAttributes(entry: any): any {
    if (entry.object) {
      return entry.object;
    }
    
    if (Array.isArray(entry.attributes)) {
      const attributes: any = {};
      entry.attributes.forEach((attr: any) => {
        if (attr.type && attr.values && attr.values.length > 0) {
          attributes[attr.type] = attr.values[0];
        }
      });
      return attributes;
    }
    
    return entry.attributes || {};
  }

  /**
   * Authenticates user with their actual credentials
   */
  private authenticateUserCredentials(
    searchClient: any,
    context: LDAPAuthContext,
    userDN: string,
    userAttributes: any,
    resolve: (value: AuthenticationResult) => void
  ): void {
    ldapLog(`[${this.name}]   🔐 Authenticating user with their credentials...`);
    
    const userPassword = String(context.password || '');
    if (!userPassword || userPassword.length === 0) {
      ldapLog(`[${this.name}]   ❌ Empty or invalid password`);
      searchClient.unbind();
      resolve({
        success: false,
        error: 'Empty password provided'
      });
      return;
    }

    const userClient = context.ldap.createClient({
      url: context.server.url,
      timeout: context.server.timeout || 5000
    });

    userClient.on('error', (err: any) => {
      ldapLog(`[${this.name}]   ❌ User client error: ${err.message}`);
    });

    ldapLog(`[${this.name}]   🔗 Binding user: ${userDN}`);
    userClient.bind(userDN, userPassword, (authErr: any) => {
      userClient.unbind();
      searchClient.unbind();

      if (authErr) {
        ldapLog(`[${this.name}]   ❌ User authentication failed: ${authErr.message}`);
        resolve({
          success: false,
          error: 'Invalid LDAP credentials'
        });
        return;
      }

      ldapLog(`[${this.name}]   ✅ User authenticated successfully!`);

      resolve({
        success: true,
        username: userAttributes.uid || userAttributes.sAMAccountName || context.username,
        email: userAttributes.mail || userAttributes.userPrincipalName,
        userId: userAttributes.uid || context.username,
        providerDetails: context.server.nameProvider || context.server.url
      });
    });
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.loadLdapModule();
      return this.servers.length > 0;
    } catch {
      logWarn('[LDAP] ldapjs module not installed. LDAP authentication disabled.');
      logWarn('[LDAP] Install with: npm install ldapjs @types/ldapjs');
      return false;
    }
  }

  private async loadLdapModule(): Promise<any> {
    try {
      // Dynamic import to avoid errors if ldapjs is not installed
      const ldapModule = await import('ldapjs');
      // Handle both CommonJS (default) and ES6 module formats
      return ldapModule.default || ldapModule;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`ldapjs module not found: ${message}. Install with: npm install ldapjs @types/ldapjs`);
    }
  }
}
