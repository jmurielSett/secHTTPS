import { MemoryCacheService } from '../../infrastructure/cache';
import { CACHE_CONFIG } from '../../types/shared';
import { IUserRepository } from '../repositories/IUserRepository';

/**
 * Verify User Access Use Case
 * 
 * Verifies that a user currently has access to a specific application and role
 * by checking the database (stateful check) with in-memory cache support.
 * 
 * Use this AFTER validating the JWT token to ensure permissions haven't been revoked.
 * 
 * Flow:
 * 1. Validate JWT token (stateless) → ValidateTokenUseCase
 * 2. Verify current permissions (stateful + cached) → VerifyUserAccessUseCase ← YOU ARE HERE
 * 
 * Cache behavior:
 * - Cache TTL: 2 minutes (configurable)
 * - Cache invalidation: Call invalidateUserCache() when roles change
 */
export class VerifyUserAccessUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly cacheService: MemoryCacheService
  ) {}

  /**
   * Verifies user has access to specific application and role
   * @param userId - User ID from validated token
   * @param applicationName - Application to check access for
   * @param requiredRole - Required role (optional, if not provided just checks app access)
   * @returns true if user has access, false otherwise
   */
  async execute(
    userId: string,
    applicationName: string,
    requiredRole?: string
  ): Promise<boolean> {
    // Try to get from cache first
    const cacheKey = MemoryCacheService.getUserRolesCacheKey(userId, applicationName);
    let currentRoles = this.cacheService.get<string[]>(cacheKey);

    // Cache miss: query database
    if (!currentRoles) {
      currentRoles = await this.userRepository.getUserRolesByApplication(
        userId,
        applicationName
      );

      // Store in cache (TTL: configurable from CACHE_CONFIG)
      this.cacheService.set(cacheKey, currentRoles, CACHE_CONFIG.TTL_SECONDS);
    }

    // No access if user has no roles in this application
    if (currentRoles.length === 0) {
      return false;
    }

    // If specific role required, check if user has it
    if (requiredRole) {
      return currentRoles.includes(requiredRole);
    }

    // If no specific role required, just having any role is enough
    return true;
  }

  /**
   * Verifies user has at least one of the specified roles
   * @param userId - User ID from validated token
   * @param applicationName - Application to check
   * @param allowedRoles - Array of acceptable roles
   * @returns true if user has any of the roles
   */
  async hasAnyRole(
    userId: string,
    applicationName: string,
    allowedRoles: string[]
  ): Promise<boolean> {
    // Try to get from cache first
    const cacheKey = MemoryCacheService.getUserRolesCacheKey(userId, applicationName);
    let currentRoles = this.cacheService.get<string[]>(cacheKey);

    // Cache miss: query database
    if (!currentRoles) {
      currentRoles = await this.userRepository.getUserRolesByApplication(
        userId,
        applicationName
      );

      // Store in cache
      this.cacheService.set(cacheKey, currentRoles, CACHE_CONFIG.TTL_SECONDS);
    }

    return currentRoles.some(role => allowedRoles.includes(role));
  }

  /**
   * Verifies user has all specified roles
   * @param userId - User ID from validated token
   * @param applicationName - Application to check
   * @param requiredRoles - Array of required roles
   * @returns true if user has all roles
   */
  async hasAllRoles(
    userId: string,
    applicationName: string,
    requiredRoles: string[]
  ): Promise<boolean> {
    // Try to get from cache first
    const cacheKey = MemoryCacheService.getUserRolesCacheKey(userId, applicationName);
    let currentRoles = this.cacheService.get<string[]>(cacheKey);

    // Cache miss: query database
    if (!currentRoles) {
      currentRoles = await this.userRepository.getUserRolesByApplication(
        userId,
        applicationName
      );

      // Store in cache
      this.cacheService.set(cacheKey, currentRoles, CACHE_CONFIG.TTL_SECONDS);
    }

    return requiredRoles.every(role => currentRoles.includes(role));
  }

  /**
   * Invalidates cache for a specific user
   * Call this after revoking or assigning roles
   * @param userId - User ID whose cache should be invalidated
   * @returns Number of cache entries deleted
   */
  invalidateUserCache(userId: string): number {
    const pattern = MemoryCacheService.getUserCachePattern(userId);
    const deletedCount = this.cacheService.deletePattern(pattern);
    
    console.log(`[Cache] Invalidated ${deletedCount} entries for user ${userId}`);
    
    return deletedCount;
  }

  /**
   * Invalidates cache for a specific user and application
   * More targeted invalidation
   */
  invalidateUserAppCache(userId: string, applicationName: string): boolean {
    const cacheKey = MemoryCacheService.getUserRolesCacheKey(userId, applicationName);
    const deleted = this.cacheService.delete(cacheKey);
    
    if (deleted) {
      console.log(`[Cache] Invalidated cache for user ${userId} in app ${applicationName}`);
    }
    
    return deleted;
  }
}
