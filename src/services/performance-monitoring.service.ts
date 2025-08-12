/**
 * Performance Monitoring Service
 * Tracks and reports application performance metrics
 */

import { performanceCache } from './performance-cache.service';
import { queryOptimizer } from './query-optimization.service';

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  category: 'response_time' | 'throughput' | 'resource_usage' | 'error_rate';
  tags?: Record<string, string>;
}

export interface PerformanceReport {
  timeRange: { start: Date; end: Date };
  summary: {
    avgResponseTime: number;
    p95ResponseTime: number;
    requestsPerSecond: number;
    errorRate: number;
    cacheHitRate: number;
  };
  trends: {
    responseTime: Array<{ timestamp: Date; value: number }>;
    throughput: Array<{ timestamp: Date; value: number }>;
    errors: Array<{ timestamp: Date; value: number }>;
  };
  recommendations: string[];
}

export class PerformanceMonitoringService {
  private metrics: PerformanceMetric[] = [];
  private readonly maxMetrics = 10000;
  private monitoringInterval?: NodeJS.Timeout;

  constructor() {
    this.startMonitoring();
  }

  /**
   * Record a performance metric
   */
  recordMetric(
    name: string,
    value: number,
    unit: string,
    category: PerformanceMetric['category'],
    tags?: Record<string, string>
  ): void {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: new Date(),
      category,
      tags,
    };

    this.metrics.push(metric);

    // Keep metrics within limit
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  /**
   * Measure function execution time
   */
  async measureExecutionTime<T>(
    name: string,
    fn: () => Promise<T>,
    tags?: Record<string, string>
  ): Promise<T> {
    const startTime = Date.now();
    try {
      const result = await fn();
      const executionTime = Date.now() - startTime;

      this.recordMetric(name, executionTime, 'ms', 'response_time', tags);

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;

      this.recordMetric(`${name}_error`, executionTime, 'ms', 'error_rate', {
        ...tags,
        error: 'true',
      });

      throw error;
    }
  }

  /**
   * Track API endpoint performance
   */
  trackEndpoint(
    method: string,
    path: string,
    statusCode: number,
    responseTime: number,
    requestSize?: number,
    responseSize?: number
  ): void {
    const tags = {
      method,
      path,
      status_code: statusCode.toString(),
      status_class: `${Math.floor(statusCode / 100)}xx`,
    };

    this.recordMetric('api_response_time', responseTime, 'ms', 'response_time', tags);
    this.recordMetric('api_requests', 1, 'count', 'throughput', tags);

    if (requestSize) {
      this.recordMetric('request_size', requestSize, 'bytes', 'resource_usage', tags);
    }

    if (responseSize) {
      this.recordMetric('response_size', responseSize, 'bytes', 'resource_usage', tags);
    }

    if (statusCode >= 400) {
      this.recordMetric('api_errors', 1, 'count', 'error_rate', tags);
    }
  }

  /**
   * Generate performance report
   */
  generateReport(timeRange?: { start: Date; end: Date }): PerformanceReport {
    const now = new Date();
    const range = timeRange || {
      start: new Date(now.getTime() - 24 * 60 * 60 * 1000), // Last 24 hours
      end: now,
    };

    const filteredMetrics = this.metrics.filter(
      (m) => m.timestamp >= range.start && m.timestamp <= range.end
    );

    const responseTimeMetrics = filteredMetrics.filter((m) => m.category === 'response_time');
    const throughputMetrics = filteredMetrics.filter((m) => m.category === 'throughput');
    const errorMetrics = filteredMetrics.filter((m) => m.category === 'error_rate');

    // Calculate summary statistics
    const responseTimes = responseTimeMetrics.map((m) => m.value);
    const avgResponseTime =
      responseTimes.length > 0
        ? responseTimes.reduce((sum, val) => sum + val, 0) / responseTimes.length
        : 0;

    const p95ResponseTime = this.calculatePercentile(responseTimes, 95);

    const totalRequests = throughputMetrics.reduce((sum, m) => sum + m.value, 0);
    const timeRangeHours = (range.end.getTime() - range.start.getTime()) / (1000 * 60 * 60);
    const requestsPerSecond = totalRequests / (timeRangeHours * 3600);

    const totalErrors = errorMetrics.reduce((sum, m) => sum + m.value, 0);
    const errorRate = totalRequests > 0 ? totalErrors / totalRequests : 0;

    // const cacheStats = performanceCache.getStats();
    const queryStats = queryOptimizer.getMetrics();

    return {
      timeRange: range,
      summary: {
        avgResponseTime,
        p95ResponseTime,
        requestsPerSecond,
        errorRate,
        cacheHitRate: queryStats.cacheHitRate,
      },
      trends: {
        responseTime: this.aggregateMetricsByTime(responseTimeMetrics, 'hour'),
        throughput: this.aggregateMetricsByTime(throughputMetrics, 'hour'),
        errors: this.aggregateMetricsByTime(errorMetrics, 'hour'),
      },
      recommendations: this.generateRecommendations({
        avgResponseTime,
        p95ResponseTime,
        errorRate,
        cacheHitRate: queryStats.cacheHitRate,
      }),
    };
  }

  /**
   * Get real-time metrics
   */
  getRealTimeMetrics(): {
    current: Record<string, number>;
    recent: Record<string, number[]>;
  } {
    const now = new Date();
    const lastMinute = new Date(now.getTime() - 60 * 1000);
    const last5Minutes = new Date(now.getTime() - 5 * 60 * 1000);

    const recentMetrics = this.metrics.filter((m) => m.timestamp >= lastMinute);
    const last5MinMetrics = this.metrics.filter((m) => m.timestamp >= last5Minutes);

    const current: Record<string, number> = {};
    const recent: Record<string, number[]> = {};

    // Calculate current values (last minute)
    recentMetrics.forEach((metric) => {
      if (!current[metric.name]) {
        current[metric.name] = 0;
      }
      current[metric.name] += metric.value;
    });

    // Calculate recent trends (last 5 minutes)
    last5MinMetrics.forEach((metric) => {
      if (!recent[metric.name]) {
        recent[metric.name] = [];
      }
      recent[metric.name].push(metric.value);
    });

    return { current, recent };
  }

  /**
   * Start automatic monitoring
   */
  private startMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, 60000); // Every minute
  }

  /**
   * Collect system-level metrics
   */
  private collectSystemMetrics(): void {
    // Memory usage
    const memUsage = process.memoryUsage();
    this.recordMetric('memory_heap_used', memUsage.heapUsed, 'bytes', 'resource_usage');
    this.recordMetric('memory_heap_total', memUsage.heapTotal, 'bytes', 'resource_usage');
    this.recordMetric('memory_rss', memUsage.rss, 'bytes', 'resource_usage');

    // CPU usage (simplified)
    const cpuUsage = process.cpuUsage();
    this.recordMetric('cpu_user', cpuUsage.user, 'microseconds', 'resource_usage');
    this.recordMetric('cpu_system', cpuUsage.system, 'microseconds', 'resource_usage');

    // Event loop lag (simplified)
    const start = Date.now();
    setImmediate(() => {
      const lag = Date.now() - start;
      this.recordMetric('event_loop_lag', lag, 'ms', 'response_time');
    });

    // Cache metrics
    const cacheStats = performanceCache.getStats();
    this.recordMetric('cache_size', cacheStats.size, 'count', 'resource_usage');
    this.recordMetric('cache_hit_rate', cacheStats.hitRate, 'percentage', 'throughput');
  }

  /**
   * Calculate percentile from array of numbers
   */
  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;

    const sorted = values.slice().sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Aggregate metrics by time interval
   */
  private aggregateMetricsByTime(
    metrics: PerformanceMetric[],
    interval: 'minute' | 'hour' | 'day'
  ): Array<{ timestamp: Date; value: number }> {
    const intervalMs = {
      minute: 60 * 1000,
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
    }[interval];

    const groups = new Map<number, number[]>();

    metrics.forEach((metric) => {
      const bucketTime = Math.floor(metric.timestamp.getTime() / intervalMs) * intervalMs;
      if (!groups.has(bucketTime)) {
        groups.set(bucketTime, []);
      }
      groups.get(bucketTime)!.push(metric.value);
    });

    return Array.from(groups.entries()).map(([timestamp, values]) => ({
      timestamp: new Date(timestamp),
      value: values.reduce((sum, val) => sum + val, 0) / values.length,
    }));
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(summary: {
    avgResponseTime: number;
    p95ResponseTime: number;
    errorRate: number;
    cacheHitRate: number;
  }): string[] {
    const recommendations: string[] = [];

    if (summary.avgResponseTime > 1000) {
      recommendations.push(
        'Average response time is high (>1s). Consider optimizing slow queries.'
      );
    }

    if (summary.p95ResponseTime > 2000) {
      recommendations.push(
        '95th percentile response time is very high (>2s). Investigate performance bottlenecks.'
      );
    }

    if (summary.errorRate > 0.05) {
      recommendations.push('Error rate is high (>5%). Check error logs and fix failing endpoints.');
    }

    if (summary.cacheHitRate < 0.7) {
      recommendations.push(
        'Cache hit rate is low (<70%). Review caching strategy and TTL settings.'
      );
    }

    if (recommendations.length === 0) {
      recommendations.push(
        'Performance metrics look good! Keep monitoring for continued optimization.'
      );
    }

    return recommendations;
  }

  /**
   * Stop monitoring and cleanup
   */
  destroy(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    this.metrics = [];
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitoringService();
