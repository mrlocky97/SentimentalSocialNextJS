/**
 * Redis Cache Service for Sentiment Analysis
 * Provides caching layer to improve performance and reduce computation
 */

import crypto from "crypto";

export interface CacheConfig {
  enabled: boolean;
  ttl: number; // Time to live in seconds
  maxKeys: number;
}

export interface CachedResult {
  data: any;
  timestamp: number;
  ttl: number;
}

export class MemoryCacheService {
  private cache = new Map<string, CachedResult>();
  private config: CacheConfig;

  constructor(
    config: CacheConfig = {
      enabled: true,
      ttl: 3600, // 1 hour
      maxKeys: 10000,
    },
  ) {
    this.config = config;

    // Cleanup expired entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Generate cache key from text and analysis parameters
   */
  private generateKey(text: string, params?: any): string {
    const normalizedText = text.toLowerCase().trim();
    const paramsString = params ? JSON.stringify(params) : "";
    return crypto
      .createHash("md5")
      .update(normalizedText + paramsString)
      .digest("hex");
  }

  /**
   * Get cached sentiment analysis result
   */
  get(text: string, params?: any): any | null {
    if (!this.config.enabled) return null;

    const key = this.generateKey(text, params);
    const cached = this.cache.get(key);

    if (!cached) return null;

    // Check if expired
    if (Date.now() - cached.timestamp > cached.ttl * 1000) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Store sentiment analysis result in cache
   */
  set(text: string, result: any, params?: any, customTtl?: number): void {
    if (!this.config.enabled) return;

    // Check cache size limit
    if (this.cache.size >= this.config.maxKeys) {
      this.evictOldest();
    }

    const key = this.generateKey(text, params);
    const ttl = customTtl || this.config.ttl;

    this.cache.set(key, {
      data: result,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Remove expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, cached] of this.cache) {
      if (now - cached.timestamp > cached.ttl * 1000) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Remove oldest entries when cache is full
   */
  private evictOldest(): void {
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

    // Remove oldest 10%
    const toRemove = Math.ceil(entries.length * 0.1);
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(entries[i][0]);
    }
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
  getStats(): {
    size: number;
    maxKeys: number;
    hitRate: number;
    enabled: boolean;
  } {
    return {
      size: this.cache.size,
      maxKeys: this.config.maxKeys,
      hitRate: this.hitRate || 0,
      enabled: this.config.enabled,
    };
  }

  private hitCount = 0;
  private missCount = 0;

  private get hitRate(): number {
    const total = this.hitCount + this.missCount;
    return total > 0 ? (this.hitCount / total) * 100 : 0;
  }

  /**
   * Wrapper for sentiment analysis with caching
   */
  async withCache<T>(
    text: string,
    analysisFunction: () => Promise<T>,
    params?: any,
    customTtl?: number,
  ): Promise<T> {
    // Try to get from cache first
    const cached = this.get(text, params);
    if (cached) {
      this.hitCount++;
      return cached;
    }

    // Not in cache, perform analysis
    this.missCount++;
    const result = await analysisFunction();

    // Store in cache
    this.set(text, result, params, customTtl);

    return result;
  }
}

// Export singleton instance
export const cacheService = new MemoryCacheService({
  enabled: true,
  ttl: 3600, // 1 hour
  maxKeys: 10000,
});

/**
 * Cache decorator for sentiment analysis methods
 */
export function Cached(ttl: number = 3600) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor,
  ) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const text = args[0]?.content || args[0]?.text || args[0];

      if (typeof text === "string") {
        return cacheService.withCache(
          text,
          () => method.apply(this, args),
          { method: propertyName, args: args.slice(1) },
          ttl,
        );
      }

      // If not cacheable, call original method
      return method.apply(this, args);
    };

    return descriptor;
  };
}
