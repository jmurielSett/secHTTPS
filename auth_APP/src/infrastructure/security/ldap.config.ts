import dotenv from 'dotenv';
import { LDAPServerConfig } from './LDAPAuthenticationProvider';

// Load environment variables BEFORE using them
dotenv.config();

/**
 * LDAP Configuration loaded from environment variables
 * Configure one or multiple LDAP/Active Directory servers in .env file
 * 
 * Example .env configuration:
 * ENABLE_LDAP=true
 * LDAP_SERVERS=[{"url":"ldap://ldap.example.com:389","baseDN":"dc=example,dc=com","userSearchBase":"ou=users,dc=example,dc=com","userSearchFilter":"(uid={{username}})","bindDN":"cn=admin,dc=example,dc=com","bindPassword":"admin_password","timeout":5000}]
 */

/**
 * Parse LDAP servers from environment variable
 */
function parseLDAPServers(): LDAPServerConfig[] {
  const ldapServersEnv = process.env.LDAP_SERVERS || '[]';
  
  try {
    const servers = JSON.parse(ldapServersEnv);
    
    if (!Array.isArray(servers)) {
      console.warn('[LDAP] LDAP_SERVERS must be a JSON array, got:', typeof servers);
      return [];
    }
    
    return servers;
  } catch (error) {
    console.error('[LDAP] Failed to parse LDAP_SERVERS from environment:', error);
    return [];
  }
}

export const LDAP_CONFIG: LDAPServerConfig[] = parseLDAPServers();

console.log('[LDAP Config] ENABLE_LDAP env var:', process.env.ENABLE_LDAP);
console.log('[LDAP Config] enableLDAP calculated:', process.env.ENABLE_LDAP === 'true');
console.log('[LDAP Config] LDAP servers found:', LDAP_CONFIG.length);

/**
 * Authentication Strategy Configuration
 */
export const AUTH_CONFIG = {
  // Enable LDAP authentication
  enableLDAP: process.env.ENABLE_LDAP === 'true',
  
  // Log authentication attempts (for debugging)
  logAuthAttempts: process.env.LOG_AUTH_ATTEMPTS === 'true' || true
};
