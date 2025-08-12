/**
 * Cache Migration Service
 * Provides compatibility layer between old cache services and new AdvancedCacheSystem
 * Phase 5: Advanced Cache System Implementation
 */

import { AdvancedCacheSystem } from "./advanced-cache";
import { container, TOKENS } from "../dependency-injection/container";

/**
 * Compatibility wrapper for MemoryCacheService interface
 */
export class CacheServiceCompat {
  private advancedCache: AdvancedCacheSystem;

  constructor() {
    this.advancedCache = container.resolve<AdvancedCacheSystem>(
      TOKENS.CACHE_SERVICE,
    );
  }

  /**
   * Set cache entry with TTL
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    await this.advancedCache.set(key, value, {
      ttl: ttl ? ttl * 1000 : undefined, // Convert seconds to milliseconds
      tags: ["legacy-cache"],
    });
  }

  /**
   * Get cached value
   */
  async get<T>(key: string): Promise<T | null> {
    return await this.advancedCache.get<T>(key);
  }

  /**
   * Check if key exists
   */
  async has(key: string): Promise<boolean> {
    const value = await this.advancedCache.get(key);
    return value !== null;
  }

  /**
   * Delete cache entry
   */
  async delete(key: string): Promise<void> {
    await this.advancedCache.invalidateByTags([`key:${key}`]);
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    await this.advancedCache.invalidateByTags(["legacy-cache"]);
  }

  /**
   * Get cache size
   */
  getSize(): number {
    const metrics = this.advancedCache.getMetrics();
    return metrics.keyCount;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const metrics = this.advancedCache.getMetrics();
    return {
      hitRate: metrics.hitRate,
      totalRequests: metrics.hits + metrics.misses,
      totalHits: metrics.hits,
      totalMisses: metrics.misses,
      size: metrics.keyCount,
      memoryUsage: metrics.memoryUsage,
    };
  }

  /**
   * Generate cache key (compatibility method)
   */
  generateKey(prefix: string, ...parts: string[]): string {
    return `${prefix}:${parts.join(":")}`;
  }
}

/**
 * Compatibility wrapper for PerformanceCacheService interface
 */
export class PerformanceCacheCompat {
  private advancedCache: AdvancedCacheSystem;

  constructor() {
    this.advancedCache = container.resolve<AdvancedCacheSystem>(
      TOKENS.CACHE_SERVICE,
    );
  }

  /**
   * Set with TTL in milliseconds
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    await this.advancedCache.set(key, value, {
      ttl: ttl,
      tags: ["performance-cache"],
    });
  }

  /**
   * Get cached value
   */
  async get<T>(key: string): Promise<T | null> {
    return await this.advancedCache.get<T>(key);
  }

  /**
   * Delete cache entry
   */
  async delete(key: string): Promise<void> {
    await this.advancedCache.invalidateByTags([`key:${key}`]);
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    await this.advancedCache.invalidateByTags(["performance-cache"]);
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const metrics = this.advancedCache.getMetrics();
    return {
      size: metrics.keyCount,
      hitRate: metrics.hitRate,
      memoryUsage: metrics.memoryUsage,
      evictionCount: metrics.evictions,
    };
  }

  /**
   * Cleanup expired entries
   */
  cleanup(): void {
    // AdvancedCacheSystem handles this automatically
  }
}

// Export singleton instances for compatibility
export const cacheService = new CacheServiceCompat();
export const performanceCache = new PerformanceCacheCompat();
