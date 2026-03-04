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
  tlsOptions?: Record<string, any>; // e.g. { rejectUnauthorized: false } for self-signed certs on LDAPS
  useStartTLS?: boolean; // Upgrade plain LDAP port 389 to TLS via STARTTLS before binding
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
    let anyConnectionError = false;

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
          if (result.isConnectionError) {
            anyConnectionError = true;
          }
        }
      } catch (err) {
        logError(`[${this.name}] ❌ Exception on ${server.url}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        anyConnectionError = true; // exception = connection-level failure
      }
    }

    ldapLog(`[${this.name}] ❌ Failed on all ${this.servers.length} server(s)`);
    return {
      success: false,
      error: `Failed to authenticate against all ${this.servers.length} LDAP server(s)`,
      isConnectionError: anyConnectionError
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
        connectTimeout: context.server.timeout || 5000,
        ...(context.server.tlsOptions ? { tlsOptions: context.server.tlsOptions } : {})
      });

      client.on('error', (err: any) => {
        logError(`[${this.name}]   ❌ Connection error: ${err.message}`);
        client.unbind();
        resolve({
          success: false,
          error: `Connection failed: ${err.message}`,
          isConnectionError: true
        });
      });

      const bindDN = context.server.bindDN || `uid=${context.username},${context.userSearchBase}`;
      const bindPassword = context.server.bindDN ? context.server.bindPassword : context.password;

      ldapLog(`[${this.name}]   🔐 Binding as: ${context.server.bindDN ? 'admin' : 'user directly'}`);

      const doBind = () => {
        client.bind(bindDN, bindPassword || '', (bindErr: any) => {
          if (bindErr) {
            ldapLog(`[${this.name}]   ❌ Bind failed: ${bindErr.message}`);
            client.unbind();
            // Only LDAP error code 49 (InvalidCredentials) means valid connection + wrong password.
            // Every other error (timeout, ECONNRESET, socket hang up, refused, etc.) is infrastructure.
            const isCredentialError = bindErr.name === 'InvalidCredentialsError' ||
              bindErr.code === 49 ||
              /invalid credentials|AcceptSecurityContext/i.test(bindErr.message);
            resolve({
              success: false,
              error: `LDAP bind failed: ${bindErr.message}`,
              isConnectionError: !isCredentialError
            });
            return;
          }
          ldapLog(`[${this.name}]   ✅ Bind successful, searching for user...`);
          this.searchAndAuthenticateUser(client, context, resolve);
        });
      };

      if (context.server.useStartTLS) {
        ldapLog(`[${this.name}]   🔒 Upgrading to STARTTLS...`);
        client.starttls(context.server.tlsOptions || { rejectUnauthorized: false }, [], (tlsErr: any) => {
          if (tlsErr) {
            ldapLog(`[${this.name}]   ❌ STARTTLS failed: ${tlsErr.message}`);
            client.unbind();
            resolve({ success: false, error: `STARTTLS failed: ${tlsErr.message}` });
            return;
          }
          ldapLog(`[${this.name}]   ✅ STARTTLS established`);
          doBind();
        });
      } else {
        doBind();
      }
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
        // entry.objectName in ldapjs v2/v3 with AD may be an LdapDn object, not a plain string.
        // Use .toString() which LdapDn implements, or fall back to entry.dn.
        const rawDn = entry.objectName ?? entry.dn ?? '';
        userDN = (typeof rawDn === 'string') ? rawDn
               : (typeof rawDn.toString === 'function') ? rawDn.toString()
               : String(rawDn);
        // Strip any ldapjs wrapper prefix like "DN [LdapDn] " if present
        if (userDN && (userDN.startsWith('DN [') || userDN === '{}' || userDN === '[object Object]')) {
          // Try pojo or other representations
          userDN = entry.dn?.toString?.() ?? entry.objectName?.format?.() ?? '';
        }
        userAttributes = this.extractUserAttributes(entry);
        
        ldapLog(`[${this.name}]   ✅ Found user: ${userDN}`);
        ldapLog(`[${this.name}]   📧 Email: ${userAttributes.mail || userAttributes.userPrincipalName || 'not found'}`);
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
   * Extracts user attributes from LDAP entry.
   * Handles both ldapjs v2 (entry.object) and v3 (entry.attributes array)
   * and Active Directory responses where entry.object may be an empty/stub object.
   */
  private extractUserAttributes(entry: any): any {
    const attrs: any = {};

    // 1. Try entry.attributes array (ldapjs v2/v3 with AD)
    if (Array.isArray(entry.attributes) && entry.attributes.length > 0) {
      entry.attributes.forEach((attr: any) => {
        const key   = attr.type || attr.name;
        // ldapjs may store values as attr.values, attr.vals, or attr._vals
        const vals  = attr.values ?? attr.vals ?? attr._vals ?? [];
        if (key && Array.isArray(vals) && vals.length > 0) {
          attrs[key] = vals[0];
        } else if (key && typeof attr.value === 'string') {
          attrs[key] = attr.value;
        }
      });
    }

    // 2. Overlay with entry.object if it has real keys (ldapjs v2 populated object)
    if (entry.object && typeof entry.object === 'object') {
      const objKeys = Object.keys(entry.object).filter(k => k !== 'controls');
      if (objKeys.length > 0) {
        objKeys.forEach(k => { attrs[k] = entry.object[k]; });
      }
    }

    // 3. Fallback: entry.pojo (ldapjs v3)
    if (Object.keys(attrs).length === 0 && entry.pojo) {
      return entry.pojo;
    }

    return attrs;
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
      resolve({ success: false, error: 'Empty password provided' });
      return;
    }

    const userClient = context.ldap.createClient({
      url: context.server.url,
      timeout: context.server.timeout || 5000,
      ...(context.server.tlsOptions ? { tlsOptions: context.server.tlsOptions } : {})
    });

    userClient.on('error', (err: any) => {
      ldapLog(`[${this.name}]   ❌ User client error: ${err.message}`);
    });

    // AD supports binding with DN, UPN email, or UPN with domain from baseDN. Try all formats.
    const upn = userAttributes.userPrincipalName; // e.g. jordi.muriel@sjd.es (del AD)
    // Extract domain from baseDN: "dc=pssjd,dc=local" → "pssjd.local"
    const domainFromBaseDN = context.server.baseDN
      .split(',')
      .filter((p: string) => p.trim().toLowerCase().startsWith('dc='))
      .map((p: string) => p.trim().substring(3))
      .join('.');
    const upnDomain = domainFromBaseDN ? `${context.username}@${domainFromBaseDN}` : null; // e.g. jordi.muriel@pssjd.local

    const bindTargets: string[] = [];
    // 1st: UPN real del AD (userPrincipalName) - el más fiable si se ha extraído correctamente
    if (upn && typeof upn === 'string' && upn.includes('@')) bindTargets.push(upn);
    // 2nd: UPN derivado del baseDN (si difiere del anterior)
    if (upnDomain && upnDomain !== upn) bindTargets.push(upnDomain);
    // 3rd: DN completo del usuario (fallback)
    if (userDN && userDN.includes('=')) bindTargets.push(userDN);
    // Garantía mínima si todo falla (sin UPN ni DN válido)
    if (bindTargets.length === 0 && upnDomain) bindTargets.push(upnDomain);

    ldapLog(`[${this.name}]   🔗 Binding user (will try ${bindTargets.length} format(s)): ${bindTargets.join(' | ')}`);

    let anyUserConnectionError = false;

    const tryBind = (index: number): void => {
      if (index >= bindTargets.length) {
        userClient.unbind();
        searchClient.unbind();
        ldapLog(`[${this.name}]   ❌ User authentication failed with all bind formats`);
        // If all failures were connection errors (not wrong password), propagate as infrastructure error
        resolve({
          success: false,
          error: 'Invalid LDAP credentials',
          isConnectionError: anyUserConnectionError
        });
        return;
      }

      const bindTarget = bindTargets[index];
      ldapLog(`[${this.name}]   🔗 Trying bind format ${index + 1}/${bindTargets.length}: ${bindTarget}`);

      userClient.bind(bindTarget, userPassword, (authErr: any) => {
        if (authErr) {
          ldapLog(`[${this.name}]   ⚠️  Bind failed with format ${index + 1}: ${authErr.message}`);
          const isCredentialError = authErr.name === 'InvalidCredentialsError' ||
            authErr.code === 49 ||
            /invalid credentials|AcceptSecurityContext/i.test(authErr.message);
          if (isCredentialError) {
            // AD returns code 49 both for wrong password AND for unrecognized UPN format.
            // Only stop if this is the LAST format to try — otherwise continue with next format.
            const isLastFormat = index >= bindTargets.length - 1;
            if (isLastFormat) {
              anyUserConnectionError = false;
              userClient.unbind();
              searchClient.unbind();
              ldapLog(`[${this.name}]   ❌ Invalid user credentials on all formats (code 49)`);
              resolve({ success: false, error: 'Invalid LDAP credentials', isConnectionError: false });
              return;
            }
            ldapLog(`[${this.name}]   ↩️  code 49 on format ${index + 1} — trying next format (may be unrecognized UPN)`);
            tryBind(index + 1);
            return;
          }
          anyUserConnectionError = true;
          tryBind(index + 1);
          return;
        }

        userClient.unbind();
        searchClient.unbind();
        ldapLog(`[${this.name}]   ✅ User authenticated successfully with format ${index + 1}!`);

        resolve({
          success: true,
          username: userAttributes.uid || userAttributes.sAMAccountName || context.username,
          email: userAttributes.mail || userAttributes.userPrincipalName,
          userId: userAttributes.uid || context.username,
          providerDetails: context.server.nameProvider || context.server.url
        });
      });
    };

    // Apply STARTTLS before bind if configured
    if (context.server.useStartTLS) {
      ldapLog(`[${this.name}]   🔒 Upgrading user connection to STARTTLS...`);
      userClient.starttls(context.server.tlsOptions || { rejectUnauthorized: false }, [], (tlsErr: any) => {
        if (tlsErr) {
          ldapLog(`[${this.name}]   ❌ User STARTTLS failed: ${tlsErr.message}`);
          userClient.unbind();
          searchClient.unbind();
          resolve({ success: false, error: `STARTTLS failed: ${tlsErr.message}` });
          return;
        }
        ldapLog(`[${this.name}]   ✅ User STARTTLS established`);
        tryBind(0);
      });
    } else {
      tryBind(0);
    }
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
