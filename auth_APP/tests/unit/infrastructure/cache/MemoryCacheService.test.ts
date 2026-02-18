import { MemoryCacheService } from '@/infrastructure/cache/MemoryCacheService';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('MemoryCacheService', () => {
  let cacheService: MemoryCacheService;

  beforeEach(() => {
    // Setup fake timers BEFORE creating service (so setInterval uses fake timers)
    vi.useFakeTimers();
    // TTL: 2 seconds, Max: 5 entries, Cleanup: 1 second
    cacheService = new MemoryCacheService(2, 5, 1000);
  });

  afterEach(() => {
    cacheService.stop();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Operaciones Básicas', () => {
    it('should set and get value from cache', () => {
      cacheService.set('key1', 'value1');
      const result = cacheService.get('key1');
      
      expect(result).toBe('value1');
    });

    it('should return undefined for non-existent key', () => {
      const result = cacheService.get('nonexistent');
      
      expect(result).toBeUndefined();
    });

    it('should store different types of values', () => {
      cacheService.set('string', 'text');
      cacheService.set('number', 42);
      cacheService.set('object', { foo: 'bar' });
      cacheService.set('array', [1, 2, 3]);

      expect(cacheService.get('string')).toBe('text');
      expect(cacheService.get('number')).toBe(42);
      expect(cacheService.get('object')).toEqual({ foo: 'bar' });
      expect(cacheService.get('array')).toEqual([1, 2, 3]);
    });

    it('should delete existing key and return true', () => {
      cacheService.set('key1', 'value1');
      const deleted = cacheService.delete('key1');
      
      expect(deleted).toBe(true);
      expect(cacheService.get('key1')).toBeUndefined();
    });

    it('should return false when deleting non-existent key', () => {
      const deleted = cacheService.delete('nonexistent');
      
      expect(deleted).toBe(false);
    });

    it('should clear all cache', () => {
      cacheService.set('key1', 'value1');
      cacheService.set('key2', 'value2');
      cacheService.set('key3', 'value3');
      
      cacheService.clear();
      
      expect(cacheService.get('key1')).toBeUndefined();
      expect(cacheService.get('key2')).toBeUndefined();
      expect(cacheService.get('key3')).toBeUndefined();
      expect(cacheService.getStats().size).toBe(0);
    });
  });

  describe('TTL (Time To Live)', () => {
    it('should return undefined for expired entry', () => {
      cacheService.set('key1', 'value1', 2); // 2 seconds TTL
      
      // Inmediatamente: debe existir
      expect(cacheService.get('key1')).toBe('value1');
      
      // Adelantar tiempo 2.5 segundos
      vi.advanceTimersByTime(2500);
      
      // Debe estar expirado
      expect(cacheService.get('key1')).toBeUndefined();
    });

    it('should respect default TTL when not specified', () => {
      cacheService.set('key1', 'value1'); // Sin TTL específico (usa default: 2s)
      
      expect(cacheService.get('key1')).toBe('value1');
      
      // Adelantar 1.5 segundos (aún válido)
      vi.advanceTimersByTime(1500);
      expect(cacheService.get('key1')).toBe('value1');
      
      // Adelantar 1 segundo más (total 2.5s, expirado)
      vi.advanceTimersByTime(1000);
      expect(cacheService.get('key1')).toBeUndefined();
    });

    it('should use custom TTL when provided', () => {
      cacheService.set('short', 'value1', 1); // 1 segundo
      cacheService.set('long', 'value2', 5);  // 5 segundos
      
      // Antes de 1 segundo: ambas válidas
      expect(cacheService.get('short')).toBe('value1');
      expect(cacheService.get('long')).toBe('value2');
      
      // Adelantar 1.5 segundos
      vi.advanceTimersByTime(1500);
      
      // short expirada, long aún válida
      expect(cacheService.get('short')).toBeUndefined();
      expect(cacheService.get('long')).toBe('value2');
      
      // Adelantar 4 segundos más (total 5.5s)
      vi.advanceTimersByTime(4000);
      
      // Ambas expiradas
      expect(cacheService.get('short')).toBeUndefined();
      expect(cacheService.get('long')).toBeUndefined();
    });

    it('should not return expired entries even if still in Map', () => {
      cacheService.set('key1', 'value1', 1);
      
      // Adelantar tiempo sin llamar cleanup
      vi.advanceTimersByTime(1500);
      
      // get() debe detectar expiración y eliminar
      const result = cacheService.get('key1');
      expect(result).toBeUndefined();
      
      // Verificar que se eliminó del Map
      const stats = cacheService.getStats();
      expect(stats.size).toBe(0);
    });
  });

  describe('LRU (Least Recently Used)', () => {
    it('should evict oldest entry when maxSize reached', () => {
      // Cache max: 5 entries
      cacheService.set('key1', 'value1');
      cacheService.set('key2', 'value2');
      cacheService.set('key3', 'value3');
      cacheService.set('key4', 'value4');
      cacheService.set('key5', 'value5');
      
      expect(cacheService.getStats().size).toBe(5);
      
      // Agregar 6ta entry: debe eliminar key1 (oldest)
      cacheService.set('key6', 'value6');
      
      expect(cacheService.getStats().size).toBe(5);
      expect(cacheService.get('key1')).toBeUndefined(); // Evicted
      expect(cacheService.get('key6')).toBe('value6');   // New entry
    });

    it('should not evict when updating existing key', () => {
      cacheService.set('key1', 'value1');
      cacheService.set('key2', 'value2');
      cacheService.set('key3', 'initial');
      cacheService.set('key4', 'value4');
      cacheService.set('key5', 'value5');
      
      // Actualizar key3 - intencional (reusing key to test update behavior)
      cacheService.set('key3', 'updated'); // eslint-disable-line sonarjs/no-duplicate-string
      
      expect(cacheService.getStats().size).toBe(5);
      expect(cacheService.get('key3')).toBe('updated');
      expect(cacheService.get('key1')).toBe('value1'); // No evicted
    });

    it('should maintain maxSize limit', () => {
      // Agregar 10 entries (max es 5)
      for (let i = 1; i <= 10; i++) {
        cacheService.set(`key${i}`, `value${i}`);
      }
      
      expect(cacheService.getStats().size).toBe(5);
      
      // Solo las últimas 5 deben existir
      expect(cacheService.get('key6')).toBe('value6');
      expect(cacheService.get('key7')).toBe('value7');
      expect(cacheService.get('key8')).toBe('value8');
      expect(cacheService.get('key9')).toBe('value9');
      expect(cacheService.get('key10')).toBe('value10');
      
      // Las primeras 5 fueron evicted
      expect(cacheService.get('key1')).toBeUndefined();
      expect(cacheService.get('key2')).toBeUndefined();
    });
  });

  describe('Pattern Deletion', () => {
    it('should delete all keys matching pattern', () => {
      cacheService.set('user:1:app:A:roles', ['admin']);
      cacheService.set('user:1:app:B:roles', ['viewer']);
      cacheService.set('user:2:app:A:roles', ['editor']);
      cacheService.set('other:key', 'value');
      
      const deletedCount = cacheService.deletePattern('user:1:');
      
      expect(deletedCount).toBe(2);
      expect(cacheService.get('user:1:app:A:roles')).toBeUndefined();
      expect(cacheService.get('user:1:app:B:roles')).toBeUndefined();
      expect(cacheService.get('user:2:app:A:roles')).toEqual(['editor']); // No deleted
      expect(cacheService.get('other:key')).toBe('value'); // No deleted
    });

    it('should return correct count of deleted keys', () => {
      cacheService.set('prefix:1', 'a');
      cacheService.set('prefix:2', 'b');
      cacheService.set('prefix:3', 'c');
      cacheService.set('other', 'd');
      
      const count = cacheService.deletePattern('prefix:');
      
      expect(count).toBe(3);
    });

    it('should return 0 when no keys match pattern', () => {
      cacheService.set('key1', 'value1');
      cacheService.set('key2', 'value2');
      
      const count = cacheService.deletePattern('nonexistent:');
      
      expect(count).toBe(0);
    });

    it('should not delete keys not matching pattern', () => {
      cacheService.set('match:1', 'a');
      cacheService.set('match:2', 'b');
      cacheService.set('nomatch:1', 'c');
      cacheService.set('different', 'd');
      
      cacheService.deletePattern('match:');
      
      expect(cacheService.get('nomatch:1')).toBe('c');
      expect(cacheService.get('different')).toBe('d');
    });
  });

  describe('Cleanup Periódico', () => {
    it('should clean expired entries automatically', () => {
      cacheService.set('key1', 'value1', 1); // 1 segundo
      cacheService.set('key2', 'value2', 1); // 1 segundo
      cacheService.set('key3', 'value3', 10); // 10 segundos
      
      expect(cacheService.getStats().size).toBe(3);
      
      // Adelantar 1.5 segundos (key1 y key2 expiran)
      vi.advanceTimersByTime(1500);
      
      // Aún en memoria (cleanup cada 1 segundo, próximo en t=2s)
      expect(cacheService.getStats().size).toBe(3);
      
      // Adelantar 0.5 segundos más (total 2s, trigger cleanup)
      vi.advanceTimersByTime(500);
      
      // Cleanup eliminó expirados
      expect(cacheService.getStats().size).toBe(1);
      expect(cacheService.get('key3')).toBe('value3');
    });

    it('should not clean non-expired entries', () => {
      cacheService.set('key1', 'value1', 10);
      cacheService.set('key2', 'value2', 10);
      
      // Adelantar 2 segundos (trigger cleanup pero nada expirado)
      vi.advanceTimersByTime(2000);
      
      expect(cacheService.getStats().size).toBe(2);
      expect(cacheService.get('key1')).toBe('value1');
      expect(cacheService.get('key2')).toBe('value2');
    });

    it('should not log if no entries cleaned', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      cacheService.set('key1', 'value1', 10);
      
      // Trigger cleanup sin entradas expiradas
      vi.advanceTimersByTime(1000);
      
      expect(consoleSpy).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('Static Helpers', () => {
    it('getUserRolesCacheKey should generate correct key format', () => {
      const key = MemoryCacheService.getUserRolesCacheKey('123', 'myApp');
      
      expect(key).toBe('user:123:app:myApp:roles');
    });

    it('getUserCachePattern should generate correct pattern', () => {
      const pattern = MemoryCacheService.getUserCachePattern('456');
      
      expect(pattern).toBe('user:456:');
    });

    it('generated keys should work with deletePattern', () => {
      const userId = '789';
      const key1 = MemoryCacheService.getUserRolesCacheKey(userId, 'app1');
      const key2 = MemoryCacheService.getUserRolesCacheKey(userId, 'app2');
      const pattern = MemoryCacheService.getUserCachePattern(userId);
      
      cacheService.set(key1, ['admin']);
      cacheService.set(key2, ['viewer']);
      cacheService.set('other:key', 'value');
      
      const count = cacheService.deletePattern(pattern);
      
      expect(count).toBe(2);
      expect(cacheService.get(key1)).toBeUndefined();
      expect(cacheService.get(key2)).toBeUndefined();
      expect(cacheService.get('other:key')).toBe('value');
    });
  });

  describe('Stats', () => {
    it('should return correct stats', () => {
      cacheService.set('key1', 'value1');
      cacheService.set('key2', 'value2');
      
      const stats = cacheService.getStats();
      
      expect(stats.size).toBe(2);
      expect(stats.maxSize).toBe(5);
    });

    it('should update size after operations', () => {
      expect(cacheService.getStats().size).toBe(0);
      
      cacheService.set('key1', 'value1');
      expect(cacheService.getStats().size).toBe(1);
      
      cacheService.set('key2', 'value2');
      expect(cacheService.getStats().size).toBe(2);
      
      cacheService.delete('key1');
      expect(cacheService.getStats().size).toBe(1);
      
      cacheService.clear();
      expect(cacheService.getStats().size).toBe(0);
    });
  });
});
