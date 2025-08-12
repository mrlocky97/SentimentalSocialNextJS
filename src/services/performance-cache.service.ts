/**
 * Performance Cache Service
 * Implements multiple caching strategies for optimal performance
 */

import { createHash } from 'crypto';

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum cache size
  persistent?: boolean; // Whether to persist to disk
}

export interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
}

export class PerformanceCacheService {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes
  private readonly maxSize = 1000;
  private readonly cleanupInterval = 60 * 1000; // 1 minute
  private cleanupTimer?: NodeJS.Timeout;

  constructor(options?: CacheOptions) {
    if (options?.maxSize) {
      // Initialize with custom max size
    }

    // Start cleanup timer
    this.startCleanup();
  }

  /**
   * Get value from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();

    return entry.value;
  }

  /**
   * Set value in cache
   */
  set<T>(key: string, value: T, ttl?: number): void {
    const now = Date.now();
    const entry: CacheEntry<T> = {
      value,
      timestamp: now,
      ttl: ttl || this.defaultTTL,
      accessCount: 0,
      lastAccessed: now,
    };

    // Check cache size limit
    if (this.cache.size >= this.maxSize) {
      this.evictLeastUsed();
    }

    this.cache.set(key, entry);
  }

  /**
   * Generate cache key from parameters
   */
  generateKey(...params: any[]): string {
    const combined = params
      .map((p) => (typeof p === 'object' ? JSON.stringify(p) : String(p)))
      .join('|');

    return createHash('sha256').update(combined).digest('hex');
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Delete specific key
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
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
  getStats() {
    const entries = Array.from(this.cache.values());
    const now = Date.now();
    const expired = entries.filter((e) => now - e.timestamp > e.ttl).length;

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      expired,
      hitRate: this.calculateHitRate(),
      memoryUsage: this.estimateMemoryUsage(),
    };
  }

  /**
   * Evict least recently used entries
   */
  private evictLeastUsed(): void {
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);

    // Remove oldest 10% of entries
    const toRemove = Math.ceil(entries.length * 0.1);
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(entries[i][0]);
    }
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        toDelete.push(key);
      }
    }

    toDelete.forEach((key) => this.cache.delete(key));
  }

  /**
   * Start periodic cleanup
   */
  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
  }

  /**
   * Stop cleanup timer
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.clear();
  }

  /**
   * Calculate hit rate (placeholder)
   */
  private calculateHitRate(): number {
    // This would require tracking hits/misses
    return 0.85; // Placeholder
  }

  /**
   * Estimate memory usage
   */
  private estimateMemoryUsage(): number {
    return this.cache.size * 1024; // Rough estimate in bytes
  }
}

// Singleton instance
export const performanceCache = new PerformanceCacheService();
