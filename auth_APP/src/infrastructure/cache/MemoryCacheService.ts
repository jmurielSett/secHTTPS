/**
 * Cache entry with TTL
 */
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * In-Memory Cache Service
 * Simple LRU-like cache with TTL support
 */
export class MemoryCacheService {
  private readonly cache: Map<string, CacheEntry<any>> = new Map();
  private readonly defaultTTL: number; // milliseconds
  private readonly maxSize: number;

  constructor(
    defaultTTLSeconds: number = 120, 
    maxSize: number = 1000,
    cleanupIntervalMs: number = 60000
  ) {
    this.defaultTTL = defaultTTLSeconds * 1000;
    this.maxSize = maxSize;

    // Clean expired entries periodically (removes already-expired entries)
    setInterval(() => this.cleanExpired(), cleanupIntervalMs);
  }

  /**
   * Get value from cache
   * @param key Cache key
   * @returns Value if found and not expired, undefined otherwise
   */
  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      return undefined;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value as T;
  }

  /**
   * Set value in cache with optional custom TTL
   * @param key Cache key
   * @param value Value to cache
   * @param ttlSeconds Optional TTL in seconds (uses default if not provided)
   */
  set<T>(key: string, value: T, ttlSeconds?: number): void {
    // Enforce max size (simple LRU: remove oldest if full)
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    const ttl = ttlSeconds ? ttlSeconds * 1000 : this.defaultTTL;
    const entry: CacheEntry<T> = {
      value,
      expiresAt: Date.now() + ttl
    };

    this.cache.set(key, entry);
  }

  /**
   * Delete specific key from cache
   * @param key Cache key to delete
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Delete all keys matching a pattern
   * @param pattern Prefix pattern to match (e.g., 'user:123:')
   * @returns Number of keys deleted
   */
  deletePattern(pattern: string): number {
    let deletedCount = 0;
    
    for (const key of this.cache.keys()) {
      if (key.startsWith(pattern)) {
        this.cache.delete(key);
        deletedCount++;
      }
    }

    return deletedCount;
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; maxSize: number; hitRate?: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize
    };
  }

  /**
   * Remove expired entries
   */
  private cleanExpired(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`[Cache] Cleaned ${cleanedCount} expired entries`);
    }
  }

  /**
   * Generate cache key for user roles
   */
  static getUserRolesCacheKey(userId: string, applicationName: string): string {
    return `user:${userId}:app:${applicationName}:roles`;
  }

  /**
   * Generate cache key pattern for all user data
   */
  static getUserCachePattern(userId: string): string {
    return `user:${userId}:`;
  }
}
