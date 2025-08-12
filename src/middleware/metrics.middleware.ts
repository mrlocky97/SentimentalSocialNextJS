/**
 * Metrics Middleware for Express
 * Automatic collection of HTTP request metrics
 * Phase 6.3: Observability and Metrics Implementation
 */

import { NextFunction, Request, Response } from 'express';
import { systemLogger } from '../lib/observability/logger';
import { defaultMetrics, metricsRegistry } from '../lib/observability/metrics';

export interface MetricsMiddlewareOptions {
  collectDetailedMetrics?: boolean;
  excludePaths?: string[];
  enableCacheMetrics?: boolean;
  enableSentimentMetrics?: boolean;
}

/**
 * HTTP Metrics Middleware
 * Automatically collects request duration, count, and error metrics
 */
export function createMetricsMiddleware(
  options: MetricsMiddlewareOptions = {}
): (req: Request, res: Response, next: NextFunction) => void {
  const {
    collectDetailedMetrics = true,
    excludePaths = ['/health/live', '/health/ready'],
    enableCacheMetrics = true,
    enableSentimentMetrics = true,
  } = options;

  const logger = systemLogger;

  return (req: Request, res: Response, next: NextFunction) => {
    // Skip excluded paths
    if (excludePaths.some((path) => req.path.includes(path))) {
      return next();
    }

    const startTime = Date.now();
    const route = req.route?.path || req.path;

    // Track request start
    if (collectDetailedMetrics) {
      logger.debug('Request metrics collection started', {
        method: req.method,
        route,
        userAgent: req.get('User-Agent'),
      });
    }

    // Override res.end to capture metrics
    const originalEnd = res.end;
    res.end = function (...args: any[]) {
      const duration = Date.now() - startTime;
      const statusCode = res.statusCode.toString();

      try {
        // Increment total requests
        defaultMetrics.httpRequestsTotal.inc(1, {
          method: req.method,
          status_code: statusCode,
          route: route,
        });

        // Record request duration
        defaultMetrics.httpRequestDuration.observe(duration, {
          method: req.method,
          route: route,
        });

        // Track errors (4xx and 5xx)
        if (res.statusCode >= 400) {
          defaultMetrics.httpRequestsErrors.inc(1, {
            method: req.method,
            status_code: statusCode,
            route: route,
          });
        }

        // Log metrics collection
        if (collectDetailedMetrics) {
          logger.debug('Request metrics collected', {
            method: req.method,
            route,
            statusCode: res.statusCode,
            duration,
            timestamp: new Date(),
          });
        }
      } catch (error) {
        logger.error(
          'Error collecting request metrics',
          error instanceof Error ? error : new Error(String(error)),
          {
            method: req.method,
            route,
            statusCode: res.statusCode,
          }
        );
      }

      // Call original end method
      return originalEnd.apply(this, args as any);
    };

    next();
  };
}

/**
 * Cache Metrics Tracker
 * Tracks cache hits, misses, and size
 */
export class CacheMetricsTracker {
  private logger = systemLogger;

  /**
   * Record cache hit
   */
  recordHit(cacheType: string = 'default'): void {
    try {
      defaultMetrics.cacheHits.inc(1, { cache_type: cacheType });
      this.logger.debug('Cache hit recorded', { cacheType });
    } catch (error) {
      this.logger.error(
        'Error recording cache hit',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Record cache miss
   */
  recordMiss(cacheType: string = 'default'): void {
    try {
      defaultMetrics.cacheMisses.inc(1, { cache_type: cacheType });
      this.logger.debug('Cache miss recorded', { cacheType });
    } catch (error) {
      this.logger.error(
        'Error recording cache miss',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Update cache size
   */
  updateSize(size: number, cacheType: string = 'default'): void {
    try {
      defaultMetrics.cacheSize.set(size, { cache_type: cacheType });
      this.logger.debug('Cache size updated', { size, cacheType });
    } catch (error) {
      this.logger.error(
        'Error updating cache size',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Get cache metrics summary
   */
  getSummary(cacheType: string = 'default'): {
    hits: number;
    misses: number;
    hitRate: number;
    size: number;
  } {
    const hits = defaultMetrics.cacheHits.getValue({ cache_type: cacheType }) || 0;
    const misses = defaultMetrics.cacheMisses.getValue({ cache_type: cacheType }) || 0;
    const size = defaultMetrics.cacheSize.getValue({ cache_type: cacheType }) || 0;
    const total = hits + misses;
    const hitRate = total > 0 ? (hits / total) * 100 : 0;

    return { hits, misses, hitRate, size };
  }
}

/**
 * Sentiment Analysis Metrics Tracker
 */
export class SentimentMetricsTracker {
  private logger = systemLogger;

  /**
   * Record sentiment analysis
   */
  recordAnalysis(sentiment: string, language: string, duration: number): void {
    try {
      defaultMetrics.sentimentAnalysisTotal.inc(1, {
        sentiment,
        language,
      });

      defaultMetrics.sentimentAnalysisDuration.observe(duration, {
        language,
      });

      this.logger.debug('Sentiment analysis recorded', {
        sentiment,
        language,
        duration,
      });
    } catch (error) {
      this.logger.error(
        'Error recording sentiment analysis',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Record sentiment analysis error
   */
  recordError(errorType: string, language?: string): void {
    try {
      defaultMetrics.sentimentAnalysisErrors.inc(1, {
        error_type: errorType,
      });

      this.logger.debug('Sentiment analysis error recorded', {
        errorType,
        language,
      });
    } catch (error) {
      this.logger.error(
        'Error recording sentiment analysis error',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Get sentiment analysis metrics summary
   */
  getSummary(): {
    totalAnalyses: number;
    averageDuration: number;
    errorCount: number;
    errorRate: number;
  } {
    const totalAnalyses = defaultMetrics.sentimentAnalysisTotal.getValue() || 0;
    const errorCount = defaultMetrics.sentimentAnalysisErrors.getValue() || 0;
    const errorRate = totalAnalyses > 0 ? (errorCount / totalAnalyses) * 100 : 0;

    // Calculate average duration from recent values
    const durationValues = defaultMetrics.sentimentAnalysisDuration.getValues();
    const averageDuration =
      durationValues.length > 0
        ? durationValues.reduce((sum, v) => sum + v.value, 0) / durationValues.length
        : 0;

    return {
      totalAnalyses,
      averageDuration,
      errorCount,
      errorRate,
    };
  }
}

/**
 * Custom Metrics Collector
 * For application-specific metrics
 */
export class CustomMetricsCollector {
  private logger = systemLogger;

  /**
   * Create and track a custom counter
   */
  incrementCounter(
    name: string,
    help: string,
    value: number = 1,
    labels?: Record<string, string>
  ): void {
    try {
      const metric = metricsRegistry.getOrCreateMetric({
        name,
        type: 'counter' as any,
        help,
        labels: labels ? Object.keys(labels) : undefined,
      });

      metric.inc(value, labels);

      this.logger.debug('Custom counter incremented', {
        name,
        value,
        labels,
      });
    } catch (error) {
      this.logger.error(
        'Error incrementing custom counter',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Set a custom gauge value
   */
  setGauge(name: string, help: string, value: number, labels?: Record<string, string>): void {
    try {
      const metric = metricsRegistry.getOrCreateMetric({
        name,
        type: 'gauge' as any,
        help,
        labels: labels ? Object.keys(labels) : undefined,
      });

      metric.set(value, labels);

      this.logger.debug('Custom gauge set', {
        name,
        value,
        labels,
      });
    } catch (error) {
      this.logger.error(
        'Error setting custom gauge',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Observe a custom histogram value
   */
  observeHistogram(
    name: string,
    help: string,
    value: number,
    labels?: Record<string, string>
  ): void {
    try {
      const metric = metricsRegistry.getOrCreateMetric({
        name,
        type: 'histogram' as any,
        help,
        labels: labels ? Object.keys(labels) : undefined,
      });

      metric.observe(value, labels);

      this.logger.debug('Custom histogram observed', {
        name,
        value,
        labels,
      });
    } catch (error) {
      this.logger.error(
        'Error observing custom histogram',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }
}

// Create singleton instances
export const cacheMetrics = new CacheMetricsTracker();
export const sentimentMetrics = new SentimentMetricsTracker();
export const customMetrics = new CustomMetricsCollector();

// Export default middleware
export const metricsMiddleware = createMetricsMiddleware({
  collectDetailedMetrics: true,
  excludePaths: ['/health/live', '/health/ready', '/favicon.ico'],
  enableCacheMetrics: true,
  enableSentimentMetrics: true,
});

/**
 * Performance monitoring wrapper
 * Measures execution time of functions
 */
export function measurePerformance<T extends (...args: any[]) => any>(
  fn: T,
  metricName: string,
  labels?: Record<string, string>
): T {
  return ((...args: any[]) => {
    const start = Date.now();

    try {
      const result = fn(...args);

      // Handle async functions
      if (result && typeof result.then === 'function') {
        return result
          .then((value: any) => {
            const duration = Date.now() - start;
            customMetrics.observeHistogram(
              metricName,
              `Execution time for ${fn.name || 'anonymous function'}`,
              duration,
              labels
            );
            return value;
          })
          .catch((error: any) => {
            const duration = Date.now() - start;
            customMetrics.observeHistogram(
              metricName,
              `Execution time for ${fn.name || 'anonymous function'}`,
              duration,
              { ...labels, status: 'error' }
            );
            throw error;
          });
      } else {
        // Sync function
        const duration = Date.now() - start;
        customMetrics.observeHistogram(
          metricName,
          `Execution time for ${fn.name || 'anonymous function'}`,
          duration,
          labels
        );
        return result;
      }
    } catch (error) {
      const duration = Date.now() - start;
      customMetrics.observeHistogram(
        metricName,
        `Execution time for ${fn.name || 'anonymous function'}`,
        duration,
        { ...labels, status: 'error' }
      );
      throw error;
    }
  }) as T;
}
