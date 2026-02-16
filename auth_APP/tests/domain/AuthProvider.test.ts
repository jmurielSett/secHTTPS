import { describe, expect, it } from 'vitest';
import { AUTH_PROVIDER_DATABASE, AuthProvider } from '../../src/domain/value-objects/AuthProvider';

describe('AuthProvider Value Object', () => {
  describe('Factory methods', () => {
    it('debería crear provider DATABASE', () => {
      const provider = AuthProvider.database();
      
      expect(provider.value).toBe('DATABASE');
      expect(provider.isDatabase()).toBe(true);
      expect(provider.isLdap()).toBe(false);
      expect(provider.toString()).toBe('DATABASE');
    });

    it('debería crear desde string - DATABASE', () => {
      const database = AuthProvider.fromString('DATABASE');
      
      expect(database.isDatabase()).toBe(true);
      expect(database.isLdap()).toBe(false);
    });

    it('debería crear desde string - LDAP custom name', () => {
      const ldap = AuthProvider.fromString('LDAP_SETTING_1');
      
      expect(ldap.value).toBe('LDAP_SETTING_1');
      expect(ldap.isLdap()).toBe(true);
      expect(ldap.isDatabase()).toBe(false);
    });

    it('debería crear desde string - LDAP URL', () => {
      const ldap1 = AuthProvider.fromString('ldap://ldap.example.com:389');
      const ldap2 = AuthProvider.fromString('ldaps://secure.example.com');
      
      expect(ldap1.isLdap()).toBe(true);
      expect(ldap2.isLdap()).toBe(true);
      expect(ldap1.isDatabase()).toBe(false);
      expect(ldap2.isDatabase()).toBe(false);
    });

    it('debería aceptar cualquier string no vacío como LDAP', () => {
      const custom1 = AuthProvider.fromString('CORPORATE_LDAP');
      const custom2 = AuthProvider.fromString('AD_SERVER_01');
      
      expect(custom1.isLdap()).toBe(true);
      expect(custom2.isLdap()).toBe(true);
    });

    it('debería lanzar error con string vacío', () => {
      expect(() => AuthProvider.fromString(''))
        .toThrow('Authentication provider cannot be empty');
      
      expect(() => AuthProvider.fromString('   '))
        .toThrow('Authentication provider cannot be empty');
    });

    it('debería usar constante AUTH_PROVIDER_DATABASE', () => {
      const provider = AuthProvider.fromString(AUTH_PROVIDER_DATABASE);
      
      expect(provider.isDatabase()).toBe(true);
      expect(provider.value).toBe('DATABASE');
    });
  });

  describe('Detection logic', () => {
    it('solo DATABASE literal debería ser identificado como database', () => {
      expect(AuthProvider.fromString('DATABASE').isDatabase()).toBe(true);
      expect(AuthProvider.fromString('database').isDatabase()).toBe(false); // Case sensitive
      expect(AuthProvider.fromString('Database').isDatabase()).toBe(false);
    });

    it('cualquier cosa que no sea DATABASE es LDAP', () => {
      expect(AuthProvider.fromString('LDAP_SETTING_1').isLdap()).toBe(true);
      expect(AuthProvider.fromString('ldap://server').isLdap()).toBe(true);
      expect(AuthProvider.fromString('AD_CORPORATE').isLdap()).toBe(true);
      expect(AuthProvider.fromString('anything_else').isLdap()).toBe(true);
      expect(AuthProvider.fromString('DATABASE').isLdap()).toBe(false);
    });

    it('debería ser case-sensitive para DATABASE', () => {
      const provider1 = AuthProvider.fromString('database');
      const provider2 = AuthProvider.fromString('Database');
      
      // These are NOT database, they are LDAP (because not exact 'DATABASE')
      expect(provider1.isLdap()).toBe(true);
      expect(provider2.isLdap()).toBe(true);
    });
  });

  describe('Equality', () => {
    it('debería comparar providers iguales correctamente', () => {
      const db1 = AuthProvider.database();
      const db2 = AuthProvider.fromString('DATABASE');
      
      expect(db1.equals(db2)).toBe(true);
      expect(db2.equals(db1)).toBe(true);
    });

    it('debería comparar providers diferentes correctamente', () => {
      const ldap = AuthProvider.fromString('LDAP_SETTING_1');
      const database = AuthProvider.database();
      
      expect(ldap.equals(database)).toBe(false);
      expect(database.equals(ldap)).toBe(false);
    });

    it('debería comparar LDAP providers por valor', () => {
      const ldap1 = AuthProvider.fromString('LDAP_SETTING_1');
      const ldap2 = AuthProvider.fromString('LDAP_SETTING_1');
      const ldap3 = AuthProvider.fromString('LDAP_SETTING_2');
      
      expect(ldap1.equals(ldap2)).toBe(true);
      expect(ldap1.equals(ldap3)).toBe(false);
    });

    it('debería manejar comparación con null/undefined', () => {
      const provider = AuthProvider.database();
      
      expect(provider.equals(null)).toBe(false);
      expect(provider.equals(undefined)).toBe(false);
    });
  });

  describe('JSON Serialization', () => {
    it('debería serializar a JSON correctamente', () => {
      const ldap = AuthProvider.fromString('LDAP_SETTING_1');
      const database = AuthProvider.database();
      
      expect(JSON.stringify({ auth: ldap })).toBe('{"auth":"LDAP_SETTING_1"}');
      expect(JSON.stringify({ auth: database })).toBe('{"auth":"DATABASE"}');
    });

    it('debería mantener el valor correcto después de serialización', () => {
      const provider = AuthProvider.fromString('LDAP_CORPORATE');
      // eslint-disable-next-line unicorn/prefer-structured-clone
      const json = JSON.parse(JSON.stringify({ provider }));
      
      expect(json.provider).toBe('LDAP_CORPORATE');
    });

    it('debería serializar URLs de LDAP', () => {
      const provider = AuthProvider.fromString('ldap://ldap.example.com:389');
      // eslint-disable-next-line unicorn/prefer-structured-clone
      const json = JSON.parse(JSON.stringify({ provider }));
      
      expect(json.provider).toBe('ldap://ldap.example.com:389');
    });
  });

  describe('Value trimming', () => {
    it('debería hacer trim de espacios en blanco', () => {
      const provider = AuthProvider.fromString('  LDAP_SETTING_1  ');
      
      expect(provider.value).toBe('LDAP_SETTING_1');
    });

    it('debería hacer trim de DATABASE', () => {
      const provider = AuthProvider.fromString('  DATABASE  ');
      
      expect(provider.isDatabase()).toBe(true);
      expect(provider.value).toBe('DATABASE');
    });
  });
});
