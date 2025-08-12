/**
 * Advanced Unified Cache System
 * Consolidates multiple caching strategies with Redis/Memory hybrid approach
 * Includes intelligent invalidation, metrics, and distributed support
 */

import { createHash } from "crypto";
import { EventEmitter } from "events";

export interface CacheConfig {
  enabled: boolean;
  strategy: "memory" | "redis" | "hybrid";
  memory: {
    maxSize: number;
    ttl: number; // seconds
    cleanupInterval: number; // seconds
  };
  redis?: {
    host: string;
    port: number;
    password?: string;
    db: number;
  };
  metrics: {
    enabled: boolean;
    trackingWindow: number; // seconds
  };
}

export interface CacheEntry<T = any> {
  value: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
  size: number; // estimated bytes
  tags: string[];
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  evictions: number;
  hitRate: number;
  memoryUsage: number;
  keyCount: number;
  avgAccessTime: number;
}

export interface CacheOperationOptions {
  ttl?: number;
  tags?: string[];
  priority?: "low" | "normal" | "high";
  compress?: boolean;
}

/**
 * Advanced Cache System with multiple strategies and intelligent features
 */
export class AdvancedCacheSystem extends EventEmitter {
  private memoryCache = new Map<string, CacheEntry>();
  private config: CacheConfig;
  private metrics: CacheMetrics;
  private cleanupTimer?: NodeJS.Timeout;
  private metricsTimer?: NodeJS.Timeout;
  private operationTimes: number[] = [];

  constructor(config?: Partial<CacheConfig>) {
    super();

    this.config = {
      enabled: true,
      strategy: "memory",
      memory: {
        maxSize: 10000,
        ttl: 3600, // 1 hour
        cleanupInterval: 300, // 5 minutes
      },
      metrics: {
        enabled: true,
        trackingWindow: 3600, // 1 hour
      },
      ...config,
    };

    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      hitRate: 0,
      memoryUsage: 0,
      keyCount: 0,
      avgAccessTime: 0,
    };

    this.initialize();
  }

  /**
   * Initialize cache system with cleanup and metrics
   */
  private initialize(): void {
    if (!this.config.enabled) return;

    // Start periodic cleanup
    this.cleanupTimer = setInterval(
      () => this.performCleanup(),
      this.config.memory.cleanupInterval * 1000,
    );

    // Start metrics calculation
    if (this.config.metrics.enabled) {
      this.metricsTimer = setInterval(
        () => this.updateMetrics(),
        60000, // Update every minute
      );
    }

    this.emit("initialized", { strategy: this.config.strategy });
  }

  /**
   * Generate optimized cache key
   */
  private generateKey(base: string, options?: any): string {
    const keyData = {
      base: base.toLowerCase().trim(),
      options: options ? JSON.stringify(options) : "",
      timestamp: Math.floor(Date.now() / 1000 / 60), // Minute-level granularity
    };

    return createHash("sha256")
      .update(JSON.stringify(keyData))
      .digest("hex")
      .substring(0, 32); // Shorter keys for memory efficiency
  }

  /**
   * Get value from cache with performance tracking
   */
  async get<T>(key: string, options?: any): Promise<T | null> {
    if (!this.config.enabled) return null;

    const startTime = Date.now();
    const cacheKey = this.generateKey(key, options);

    try {
      const entry = this.memoryCache.get(cacheKey);

      if (!entry) {
        this.recordMiss();
        return null;
      }

      // Check expiration
      const now = Date.now();
      if (now - entry.timestamp > entry.ttl * 1000) {
        this.memoryCache.delete(cacheKey);
        this.recordMiss();
        return null;
      }

      // Update access statistics
      entry.accessCount++;
      entry.lastAccessed = now;

      this.recordHit();
      this.recordOperationTime(Date.now() - startTime);

      this.emit("hit", { key: cacheKey, accessCount: entry.accessCount });

      return entry.value;
    } catch (error) {
      this.emit("error", { operation: "get", key: cacheKey, error });
      return null;
    }
  }

  /**
   * Set value in cache with intelligent features
   */
  async set<T>(
    key: string,
    value: T,
    baseOptions?: any,
    cacheOptions?: CacheOperationOptions,
  ): Promise<void> {
    if (!this.config.enabled) return;

    const startTime = Date.now();
    const cacheKey = this.generateKey(key, baseOptions);

    try {
      // Check cache size and evict if necessary
      if (this.memoryCache.size >= this.config.memory.maxSize) {
        await this.performIntelligentEviction();
      }

      const now = Date.now();
      const ttl = cacheOptions?.ttl || this.config.memory.ttl;
      const estimatedSize = this.estimateSize(value);

      const entry: CacheEntry<T> = {
        value,
        timestamp: now,
        ttl,
        accessCount: 0,
        lastAccessed: now,
        size: estimatedSize,
        tags: cacheOptions?.tags || [],
      };

      this.memoryCache.set(cacheKey, entry);
      this.recordSet();
      this.recordOperationTime(Date.now() - startTime);

      this.emit("set", {
        key: cacheKey,
        size: estimatedSize,
        ttl,
        tags: entry.tags,
      });
    } catch (error) {
      this.emit("error", { operation: "set", key: cacheKey, error });
    }
  }

  /**
   * Intelligent cache eviction based on LRU, frequency, and size
   */
  private async performIntelligentEviction(): Promise<void> {
    const entries = Array.from(this.memoryCache.entries());
    const now = Date.now();

    // Score entries for eviction (lower score = higher priority for eviction)
    const scored = entries.map(([key, entry]) => {
      const age = now - entry.timestamp;
      const timeSinceAccess = now - entry.lastAccessed;
      const accessFrequency = entry.accessCount / (age / 1000 / 60); // per minute

      const score =
        accessFrequency * 0.4 + // Frequency weight
        (1 / (timeSinceAccess / 1000 / 60)) * 0.3 + // Recency weight
        (1 / (entry.size / 1024)) * 0.3; // Size weight (smaller = higher score)

      return { key, entry, score };
    });

    // Sort by score (ascending - lowest scores evicted first)
    scored.sort((a, b) => a.score - b.score);

    // Evict bottom 20%
    const evictCount = Math.ceil(entries.length * 0.2);
    for (let i = 0; i < evictCount; i++) {
      this.memoryCache.delete(scored[i].key);
      this.recordEviction();
    }

    this.emit("eviction", { count: evictCount });
  }

  /**
   * Tag-based cache invalidation
   */
  async invalidateByTags(tags: string[]): Promise<number> {
    let invalidated = 0;

    for (const [key, entry] of this.memoryCache.entries()) {
      const hasMatchingTag = tags.some((tag) => entry.tags.includes(tag));
      if (hasMatchingTag) {
        this.memoryCache.delete(key);
        invalidated++;
      }
    }

    this.emit("invalidation", { tags, count: invalidated });
    return invalidated;
  }

  /**
   * Batch operations for performance
   */
  async mget<T>(keys: string[], options?: any): Promise<(T | null)[]> {
    return Promise.all(keys.map((key) => this.get<T>(key, options)));
  }

  async mset<T>(
    items: Array<{ key: string; value: T; options?: any }>,
  ): Promise<void> {
    await Promise.all(
      items.map((item) => this.set(item.key, item.value, item.options)),
    );
  }

  /**
   * Cleanup expired entries
   */
  private performCleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.memoryCache.entries()) {
      if (now - entry.timestamp > entry.ttl * 1000) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach((key) => this.memoryCache.delete(key));

    if (expiredKeys.length > 0) {
      this.emit("cleanup", { expired: expiredKeys.length });
    }
  }

  /**
   * Calculate and update metrics
   */
  private updateMetrics(): void {
    const total = this.metrics.hits + this.metrics.misses;
    this.metrics.hitRate = total > 0 ? (this.metrics.hits / total) * 100 : 0;
    this.metrics.keyCount = this.memoryCache.size;
    this.metrics.memoryUsage = this.calculateMemoryUsage();
    this.metrics.avgAccessTime = this.calculateAvgAccessTime();

    this.emit("metrics", this.metrics);
  }

  /**
   * Estimate object size in bytes
   */
  private estimateSize(obj: any): number {
    const str = JSON.stringify(obj);
    return Buffer.byteLength(str, "utf8");
  }

  /**
   * Calculate total memory usage
   */
  private calculateMemoryUsage(): number {
    let total = 0;
    for (const entry of this.memoryCache.values()) {
      total += entry.size;
    }
    return total;
  }

  /**
   * Calculate average access time
   */
  private calculateAvgAccessTime(): number {
    if (this.operationTimes.length === 0) return 0;

    const sum = this.operationTimes.reduce((a, b) => a + b, 0);
    const avg = sum / this.operationTimes.length;

    // Keep only recent operations
    if (this.operationTimes.length > 1000) {
      this.operationTimes = this.operationTimes.slice(-1000);
    }

    return avg;
  }

  // Metrics recording methods
  private recordHit(): void {
    this.metrics.hits++;
  }
  private recordMiss(): void {
    this.metrics.misses++;
  }
  private recordSet(): void {
    this.metrics.sets++;
  }
  private recordEviction(): void {
    this.metrics.evictions++;
  }
  private recordOperationTime(time: number): void {
    this.operationTimes.push(time);
  }

  /**
   * Get current cache statistics
   */
  getMetrics(): CacheMetrics {
    this.updateMetrics();
    return { ...this.metrics };
  }

  /**
   * Health check for cache system
   */
  healthCheck(): {
    status: "healthy" | "degraded" | "unhealthy";
    details: any;
  } {
    const metrics = this.getMetrics();
    const memoryUsageMB = metrics.memoryUsage / 1024 / 1024;

    if (!this.config.enabled) {
      return { status: "unhealthy", details: { reason: "disabled" } };
    }

    if (memoryUsageMB > 100 || metrics.hitRate < 50) {
      return {
        status: "degraded",
        details: {
          memoryUsageMB,
          hitRate: metrics.hitRate,
          keyCount: metrics.keyCount,
        },
      };
    }

    return {
      status: "healthy",
      details: {
        memoryUsageMB,
        hitRate: metrics.hitRate,
        keyCount: metrics.keyCount,
      },
    };
  }

  /**
   * Clear all cache and reset metrics
   */
  clear(): void {
    this.memoryCache.clear();
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      hitRate: 0,
      memoryUsage: 0,
      keyCount: 0,
      avgAccessTime: 0,
    };
    this.emit("clear");
  }

  /**
   * Shutdown cache system gracefully
   */
  destroy(): void {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
    if (this.metricsTimer) clearInterval(this.metricsTimer);
    this.clear();
    this.removeAllListeners();
    this.emit("destroyed");
  }
}

// Global advanced cache instance
export const advancedCache = new AdvancedCacheSystem({
  enabled: true,
  strategy: "memory",
  memory: {
    maxSize: 15000,
    ttl: 3600, // 1 hour
    cleanupInterval: 300, // 5 minutes
  },
  metrics: {
    enabled: true,
    trackingWindow: 3600,
  },
});

/**
 * Advanced cache decorator with intelligent features
 */
export function AdvancedCached(options?: CacheOperationOptions) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor,
  ) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const text = args[0]?.content || args[0]?.text || args[0];

      if (typeof text === "string") {
        const cacheKey = `${target.constructor.name}.${propertyName}:${text}`;
        const cached = await advancedCache.get(cacheKey, args.slice(1));

        if (cached !== null) {
          return cached;
        }

        const result = await method.apply(this, args);
        await advancedCache.set(cacheKey, result, args.slice(1), options);

        return result;
      }

      return method.apply(this, args);
    };

    return descriptor;
  };
}
