/**
 * Simple In-Memory Cache Implementation
 * For caching frequent API responses and computation results
 */

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export class MemoryCache {
  private cache = new Map<string, CacheItem<any>>();
  private defaultTtl: number;

  constructor(defaultTtl: number = 3600000) {
    // 1 hour default
    this.defaultTtl = defaultTtl;
  }

  /**
   * Set cache item with optional TTL
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTtl,
    };
    this.cache.set(key, item);
  }

  /**
   * Get cache item if not expired
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    const now = Date.now();
    if (now - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data as T;
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Delete cache item
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
    let totalSize = 0;
    let expiredCount = 0;
    const now = Date.now();

    for (const [key, item] of this.cache) {
      totalSize++;
      if (now - item.timestamp > item.ttl) {
        console.log(key);
        expiredCount++;
      }
    }

    return {
      totalItems: totalSize,
      expiredItems: expiredCount,
      activeItems: totalSize - expiredCount,
    };
  }

  /**
   * Clean expired items
   */
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [k, item] of this.cache) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(k);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Get or set pattern (memoization)
   */
  async getOrSet<T>(key: string, factory: () => Promise<T> | T, ttl?: number): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const data = await factory();
    this.set(key, data, ttl);
    return data;
  }
}

// Export singleton instance
export const appCache = new MemoryCache();

// Cache decorators for methods
export function Cacheable(ttl?: number) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cacheKey = `${target.constructor.name}.${propertyName}.${JSON.stringify(args)}`;

      return appCache.getOrSet(cacheKey, () => method.apply(this, args), ttl);
    };

    return descriptor;
  };
}
