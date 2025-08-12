/**
 * Query Optimization Service
 * Optimizes database queries and API calls for better performance
 */

import { performanceCache } from "./performance-cache.service";

export interface QueryMetrics {
  executionTime: number;
  cacheHit: boolean;
  queryType: string;
  resultCount: number;
  timestamp: Date;
}

export interface OptimizationConfig {
  enableCaching: boolean;
  cacheTTL: number;
  batchSize: number;
  maxConcurrentQueries: number;
  enableMetrics: boolean;
}

export class QueryOptimizationService {
  private metrics: QueryMetrics[] = [];
  private activeQueries = new Set<string>();
  private queryQueue: Array<() => Promise<any>> = [];
  private config: OptimizationConfig = {
    enableCaching: true,
    cacheTTL: 5 * 60 * 1000, // 5 minutes
    batchSize: 10,
    maxConcurrentQueries: 5,
    enableMetrics: true,
  };

  constructor(config?: Partial<OptimizationConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  /**
   * Execute optimized query with caching and metrics
   */
  async executeQuery<T>(
    queryKey: string,
    queryFn: () => Promise<T>,
    options?: {
      ttl?: number;
      forceRefresh?: boolean;
      priority?: "high" | "normal" | "low";
    },
  ): Promise<T> {
    const startTime = Date.now();
    let cacheHit = false;
    let result: T | undefined;

    // Check cache first (unless force refresh)
    if (this.config.enableCaching && !options?.forceRefresh) {
      const cached = performanceCache.get<T>(queryKey);
      if (cached !== null) {
        result = cached;
        cacheHit = true;
      }
    }

    // Execute query if not cached
    if (!cacheHit) {
      // Check if we're at max concurrent queries
      if (this.activeQueries.size >= this.config.maxConcurrentQueries) {
        await this.waitForSlot();
      }

      this.activeQueries.add(queryKey);

      try {
        result = await queryFn();

        // Cache the result
        if (this.config.enableCaching) {
          const ttl = options?.ttl || this.config.cacheTTL;
          performanceCache.set(queryKey, result, ttl);
        }
      } finally {
        this.activeQueries.delete(queryKey);
        this.processQueue();
      }
    }

    // Record metrics
    if (this.config.enableMetrics && result !== undefined) {
      this.recordMetrics({
        executionTime: Date.now() - startTime,
        cacheHit,
        queryType: queryKey.split(":")[0] || "unknown",
        resultCount: this.getResultCount(result),
        timestamp: new Date(),
      });
    }

    return result!;
  }

  /**
   * Execute multiple queries in batches
   */
  async executeBatch<T>(
    queries: Array<{
      key: string;
      fn: () => Promise<T>;
      options?: { ttl?: number; priority?: "high" | "normal" | "low" };
    }>,
  ): Promise<T[]> {
    const results: T[] = [];
    const batches = this.createBatches(queries, this.config.batchSize);

    for (const batch of batches) {
      const batchPromises = batch.map((query) =>
        this.executeQuery(query.key, query.fn, query.options),
      );

      const batchResults = await Promise.allSettled(batchPromises);

      batchResults.forEach((result) => {
        if (result.status === "fulfilled") {
          results.push(result.value);
        } else {
          console.error("Batch query failed:", result.reason);
        }
      });
    }

    return results;
  }

  /**
   * Optimize database aggregations
   */
  async optimizeAggregation<T>(
    collection: string,
    pipeline: any[],
    options?: { allowDiskUse?: boolean; maxTimeMS?: number },
  ): Promise<T[]> {
    const queryKey = performanceCache.generateKey(
      "aggregation",
      collection,
      pipeline,
    );

    return this.executeQuery(
      queryKey,
      async () => {
        // Add optimization hints to pipeline
        const optimizedPipeline = this.optimizePipeline(pipeline);

        // Simulate aggregation execution (replace with actual MongoDB call)
        console.log("Executing optimized aggregation:", {
          collection,
          pipeline: optimizedPipeline,
          options,
        });

        // Return mock result for now
        return [] as T[];
      },
      { ttl: 10 * 60 * 1000 }, // 10 minutes for aggregations
    );
  }

  /**
   * Get query performance metrics
   */
  getMetrics(): {
    averageExecutionTime: number;
    cacheHitRate: number;
    queryTypes: Record<string, number>;
    slowQueries: QueryMetrics[];
  } {
    if (this.metrics.length === 0) {
      return {
        averageExecutionTime: 0,
        cacheHitRate: 0,
        queryTypes: {},
        slowQueries: [],
      };
    }

    const totalTime = this.metrics.reduce(
      (sum, metric) => sum + metric.executionTime,
      0,
    );
    const cacheHits = this.metrics.filter((m) => m.cacheHit).length;
    const queryTypes: Record<string, number> = {};

    this.metrics.forEach((metric) => {
      queryTypes[metric.queryType] = (queryTypes[metric.queryType] || 0) + 1;
    });

    const slowQueries = this.metrics
      .filter((m) => m.executionTime > 1000) // > 1 second
      .sort((a, b) => b.executionTime - a.executionTime)
      .slice(0, 10);

    return {
      averageExecutionTime: totalTime / this.metrics.length,
      cacheHitRate: cacheHits / this.metrics.length,
      queryTypes,
      slowQueries,
    };
  }

  /**
   * Clear all cached queries for a specific pattern
   */
  invalidateCache(pattern: string): void {
    // This would need access to cache internals
    console.log(`Invalidating cache for pattern: ${pattern}`);
  }

  /**
   * Wait for an available query slot
   */
  private async waitForSlot(): Promise<void> {
    return new Promise((resolve) => {
      const checkSlot = () => {
        if (this.activeQueries.size < this.config.maxConcurrentQueries) {
          resolve();
        } else {
          setTimeout(checkSlot, 10);
        }
      };
      checkSlot();
    });
  }

  /**
   * Process queued queries
   */
  private processQueue(): void {
    while (
      this.queryQueue.length > 0 &&
      this.activeQueries.size < this.config.maxConcurrentQueries
    ) {
      const queryFn = this.queryQueue.shift();
      if (queryFn) {
        queryFn();
      }
    }
  }

  /**
   * Create batches from queries array
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Optimize MongoDB aggregation pipeline
   */
  private optimizePipeline(pipeline: any[]): any[] {
    // Add $match stages early to reduce document count
    // Add $project stages to limit fields
    // Add $sort with $limit for better performance
    const optimized = [...pipeline];

    // Add indexing hints if available
    if (!optimized.some((stage) => stage.$hint)) {
      // Add appropriate index hints based on the pipeline
    }

    return optimized;
  }

  /**
   * Record query metrics
   */
  private recordMetrics(metrics: QueryMetrics): void {
    this.metrics.push(metrics);

    // Keep only last 1000 metrics to prevent memory bloat
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }
  }

  /**
   * Get result count from query result
   */
  private getResultCount(result: any): number {
    if (Array.isArray(result)) {
      return result.length;
    }
    if (result && typeof result === "object" && "count" in result) {
      return result.count;
    }
    return 1;
  }
}

// Singleton instance
export const queryOptimizer = new QueryOptimizationService();
