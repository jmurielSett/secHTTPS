import {
    AuthenticationResult,
    IAuthenticationProvider
} from '../../domain/services/IAuthenticationProvider';

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
    console.log(`[${this.name}] 🔍 Attempting LDAP authentication for user: ${username}`);
    console.log(`[${this.name}] 📊 Will try ${this.servers.length} server(s)`);
    
    // Try each LDAP server in order until one succeeds
    for (let i = 0; i < this.servers.length; i++) {
      const server = this.servers[i];
      console.log(`[${this.name}] 🌐 Server ${i + 1}/${this.servers.length}: ${server.url}`);
      
      try {
        const result = await this.authenticateAgainstServer(server, username, password);
        if (result.success) {
          console.log(`[${this.name}] ✅ Authentication successful on server ${server.url}`);
          return result;
        } else {
          console.log(`[${this.name}] ⚠️  Authentication failed on ${server.url}: ${result.error}`);
        }
      } catch (error) {
        console.error(`[${this.name}] ❌ Exception on ${server.url}:`, 
          error instanceof Error ? error.message : 'Unknown error'
        );
        // Continue to next server
      }
    }

    console.log(`[${this.name}] ❌ Failed on all ${this.servers.length} server(s)`);
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
    console.log(`[${this.name}]   📍 Connecting to: ${server.url}`);
    console.log(`[${this.name}]   🔍 Search base: ${server.userSearchBase || server.baseDN}`);
    console.log(`[${this.name}]   🔍 Search filter: ${server.userSearchFilter}`);
    
    try {
      // Dynamically import ldapjs (will fail gracefully if not installed)
      const ldap = await this.loadLdapModule();

      return await new Promise<AuthenticationResult>((resolve) => {
        const client = ldap.createClient({
          url: server.url,
          timeout: server.timeout || 5000,
          connectTimeout: server.timeout || 5000
        });

        // Handle connection errors
        client.on('error', (err: any) => {
          console.error(`[${this.name}]   ❌ Connection error: ${err.message}`);
          client.unbind();
          resolve({
            success: false,
            error: `Connection failed: ${err.message}`
          });
        });

        const userSearchBase = server.userSearchBase || server.baseDN;
        const searchFilter = (server.userSearchFilter || '(uid={{username}})')
          .replace('{{username}}', username);

        // Bind with admin credentials if provided (for search)
        const bindDN = server.bindDN || `uid=${username},${userSearchBase}`;
        const bindPassword = server.bindDN ? server.bindPassword : password;

        console.log(`[${this.name}]   🔐 Binding as: ${server.bindDN ? 'admin' : 'user directly'}`);
        
        client.bind(bindDN, bindPassword || '', (bindErr: any) => {
          if (bindErr) {
            console.error(`[${this.name}]   ❌ Bind failed: ${bindErr.message}`);
            client.unbind();
            resolve({
              success: false,
              error: `LDAP bind failed: ${bindErr.message}`
            });
            return;
          }

          console.log(`[${this.name}]   ✅ Bind successful, searching for user...`);

          // Search for user
          client.search(userSearchBase, {
            filter: searchFilter,
            scope: 'sub',
            attributes: ['uid', 'cn', 'mail', 'sAMAccountName', 'userPrincipalName']
          }, (searchErr: any, searchRes: any) => {
            if (searchErr) {
              console.error(`[${this.name}]   ❌ Search error: ${searchErr.message}`);
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
              // Ensure userDN is a proper string (not an object or buffer)
              userDN = String(entry.objectName || entry.dn || '');
              
              // Convert LDAP attributes array to object
              if (entry.object) {
                userAttributes = entry.object;
              } else if (Array.isArray(entry.attributes)) {
                // Convert array [{type: 'mail', values: ['email@domain.com']}] to {mail: 'email@domain.com'}
                userAttributes = {};
                entry.attributes.forEach((attr: any) => {
                  if (attr.type && attr.values && attr.values.length > 0) {
                    userAttributes[attr.type] = attr.values[0]; // Take first value
                  }
                });
              } else {
                userAttributes = entry.attributes || {};
              }
              
              console.log(`[${this.name}]   ✅ Found user: ${userDN}`);
              console.log(`[${this.name}]   📧 Email: ${userAttributes.mail || 'not found'}`);
            });

            searchRes.on('end', () => {
              if (!userDN) {
                console.log(`[${this.name}]   ⚠️  User not found (searched ${foundCount} entries)`);
                client.unbind();
                resolve({
                  success: false,
                  error: 'User not found in LDAP'
                });
                return;
              }

              console.log(`[${this.name}]   🔐 Authenticating user with their credentials...`);
              console.log(`[${this.name}]   🔍 Password type: ${typeof password}, length: ${password?.length}`);

              // Ensure password is a valid string
              const userPassword = String(password || '');
              if (!userPassword || userPassword.length === 0) {
                console.error(`[${this.name}]   ❌ Empty or invalid password`);
                client.unbind();
                resolve({
                  success: false,
                  error: 'Empty password provided'
                });
                return;
              }

              // Now authenticate with user's credentials
              const userClient = ldap.createClient({
                url: server.url,
                timeout: server.timeout || 5000
              });

              userClient.on('error', (err: any) => {
                console.error(`[${this.name}]   ❌ User client error: ${err.message}`);
              });

              console.log(`[${this.name}]   🔗 Binding user: ${userDN}`);
              userClient.bind(userDN, userPassword, (authErr: any) => {
                userClient.unbind();
                client.unbind();

                if (authErr) {
                  console.error(`[${this.name}]   ❌ User authentication failed: ${authErr.message}`);
                  resolve({
                    success: false,
                    error: 'Invalid LDAP credentials'
                  });
                  return;
                }

                console.log(`[${this.name}]   ✅ User authenticated successfully!`);

                // Successful authentication
                resolve({
                  success: true,
                  username: userAttributes.uid || userAttributes.sAMAccountName || username,
                  email: userAttributes.mail || userAttributes.userPrincipalName,
                  userId: userAttributes.uid || username,
                  providerDetails: server.nameProvider || server.url // Use nameProvider if configured, fallback to URL
                });
              });
            });

            searchRes.on('error', (err: any) => {
              client.unbind();
              resolve({
                success: false,
                error: `LDAP search error: ${err.message}`
              });
            });
          });
        });
      });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'LDAP authentication failed'
      };
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.loadLdapModule();
      return this.servers.length > 0;
    } catch {
      console.warn('[LDAP] ldapjs module not installed. LDAP authentication disabled.');
      console.warn('[LDAP] Install with: npm install ldapjs @types/ldapjs');
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
