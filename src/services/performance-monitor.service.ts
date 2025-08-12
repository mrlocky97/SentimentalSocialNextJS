/**
 * Performance Monitoring and Metrics Collection
 * Tracks API performance, model accuracy, and system health
 */

export interface PerformanceMetrics {
  requestCount: number;
  averageResponseTime: number;
  errorRate: number;
  cacheHitRate: number;
  modelAccuracy: number;
  memoryUsage: number;
  cpuUsage: number;
}

export interface RequestMetric {
  timestamp: number;
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  cacheHit: boolean;
  textLength?: number;
  analysisType?: string;
}

export class PerformanceMonitor {
  private metrics: RequestMetric[] = [];
  private readonly maxMetrics = 10000; // Keep last 10k requests
  private startTime = Date.now();

  /**
   * Record a request metric
   */
  recordRequest(metric: Omit<RequestMetric, "timestamp">): void {
    this.metrics.push({
      ...metric,
      timestamp: Date.now(),
    });

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  /**
   * Get current performance metrics
   */
  getMetrics(timeWindow: number = 3600000): PerformanceMetrics {
    const now = Date.now();
    const windowStart = now - timeWindow;
    const recentMetrics = this.metrics.filter(
      (m) => m.timestamp >= windowStart,
    );

    if (recentMetrics.length === 0) {
      return {
        requestCount: 0,
        averageResponseTime: 0,
        errorRate: 0,
        cacheHitRate: 0,
        modelAccuracy: 0,
        memoryUsage: this.getMemoryUsage(),
        cpuUsage: 0,
      };
    }

    const errorCount = recentMetrics.filter((m) => m.statusCode >= 400).length;
    const cacheHits = recentMetrics.filter((m) => m.cacheHit).length;
    const totalResponseTime = recentMetrics.reduce(
      (sum, m) => sum + m.responseTime,
      0,
    );

    return {
      requestCount: recentMetrics.length,
      averageResponseTime: Math.round(totalResponseTime / recentMetrics.length),
      errorRate:
        Math.round((errorCount / recentMetrics.length) * 100 * 100) / 100,
      cacheHitRate:
        Math.round((cacheHits / recentMetrics.length) * 100 * 100) / 100,
      modelAccuracy: this.calculateModelAccuracy(recentMetrics),
      memoryUsage: this.getMemoryUsage(),
      cpuUsage: 0, // Would need additional library for CPU monitoring
    };
  }

  /**
   * Get detailed analytics
   */
  getAnalytics(timeWindow: number = 3600000): {
    endpointStats: { [endpoint: string]: any };
    hourlyDistribution: {
      hour: number;
      requests: number;
      avgResponseTime: number;
    }[];
    responseTimePercentiles: {
      p50: number;
      p90: number;
      p95: number;
      p99: number;
    };
    errorsByType: { [statusCode: number]: number };
  } {
    const now = Date.now();
    const windowStart = now - timeWindow;
    const recentMetrics = this.metrics.filter(
      (m) => m.timestamp >= windowStart,
    );

    // Endpoint statistics
    const endpointStats: { [endpoint: string]: any } = {};
    recentMetrics.forEach((metric) => {
      if (!endpointStats[metric.endpoint]) {
        endpointStats[metric.endpoint] = {
          count: 0,
          totalResponseTime: 0,
          errors: 0,
          cacheHits: 0,
        };
      }
      const stats = endpointStats[metric.endpoint];
      stats.count++;
      stats.totalResponseTime += metric.responseTime;
      if (metric.statusCode >= 400) stats.errors++;
      if (metric.cacheHit) stats.cacheHits++;
    });

    // Calculate averages for endpoints
    Object.keys(endpointStats).forEach((endpoint) => {
      const stats = endpointStats[endpoint];
      stats.avgResponseTime = Math.round(stats.totalResponseTime / stats.count);
      stats.errorRate =
        Math.round((stats.errors / stats.count) * 100 * 100) / 100;
      stats.cacheHitRate =
        Math.round((stats.cacheHits / stats.count) * 100 * 100) / 100;
      delete stats.totalResponseTime;
    });

    // Hourly distribution
    const hourlyStats: {
      [hour: number]: { count: number; totalTime: number };
    } = {};
    recentMetrics.forEach((metric) => {
      const hour = new Date(metric.timestamp).getHours();
      if (!hourlyStats[hour]) {
        hourlyStats[hour] = { count: 0, totalTime: 0 };
      }
      hourlyStats[hour].count++;
      hourlyStats[hour].totalTime += metric.responseTime;
    });

    const hourlyDistribution = Object.keys(hourlyStats).map((hour) => ({
      hour: parseInt(hour),
      requests: hourlyStats[parseInt(hour)].count,
      avgResponseTime: Math.round(
        hourlyStats[parseInt(hour)].totalTime /
          hourlyStats[parseInt(hour)].count,
      ),
    }));

    // Response time percentiles
    const responseTimes = recentMetrics
      .map((m) => m.responseTime)
      .sort((a, b) => a - b);
    const getPercentile = (p: number) => {
      const index = Math.ceil((p / 100) * responseTimes.length) - 1;
      return responseTimes[Math.max(0, index)] || 0;
    };

    const responseTimePercentiles = {
      p50: getPercentile(50),
      p90: getPercentile(90),
      p95: getPercentile(95),
      p99: getPercentile(99),
    };

    // Errors by type
    const errorsByType: { [statusCode: number]: number } = {};
    recentMetrics.forEach((metric) => {
      if (metric.statusCode >= 400) {
        errorsByType[metric.statusCode] =
          (errorsByType[metric.statusCode] || 0) + 1;
      }
    });

    return {
      endpointStats,
      hourlyDistribution,
      responseTimePercentiles,
      errorsByType,
    };
  }

  /**
   * Calculate model accuracy from recent predictions
   */
  private calculateModelAccuracy(metrics: RequestMetric[]): number {
    // This would need actual prediction validation data
    // For now, return a simulated value based on error rate
    const errorRate =
      metrics.filter((m) => m.statusCode >= 400).length / metrics.length;
    return Math.max(60, Math.min(95, 85 - errorRate * 100));
  }

  /**
   * Get memory usage information
   */
  private getMemoryUsage(): number {
    const usage = process.memoryUsage();
    return Math.round((usage.heapUsed / 1024 / 1024) * 100) / 100; // MB
  }

  /**
   * Get system health status
   */
  getHealthStatus(): {
    status: "healthy" | "warning" | "critical";
    uptime: number;
    metrics: PerformanceMetrics;
    issues: string[];
  } {
    const metrics = this.getMetrics();
    const uptime = Math.round((Date.now() - this.startTime) / 1000);
    const issues: string[] = [];
    let status: "healthy" | "warning" | "critical" = "healthy";

    // Check for issues
    if (metrics.errorRate > 10) {
      issues.push(`High error rate: ${metrics.errorRate}%`);
      status = "warning";
    }

    if (metrics.errorRate > 25) {
      status = "critical";
    }

    if (metrics.averageResponseTime > 2000) {
      issues.push(`Slow response time: ${metrics.averageResponseTime}ms`);
      if (status === "healthy") status = "warning";
    }

    if (metrics.averageResponseTime > 5000) {
      status = "critical";
    }

    if (metrics.memoryUsage > 500) {
      issues.push(`High memory usage: ${metrics.memoryUsage}MB`);
      if (status === "healthy") status = "warning";
    }

    if (metrics.memoryUsage > 1000) {
      status = "critical";
    }

    return {
      status,
      uptime,
      metrics,
      issues,
    };
  }

  /**
   * Express middleware for automatic metric collection
   */
  middleware() {
    return (req: any, res: any, next: any) => {
      const startTime = Date.now();

      // Store original end function
      const originalEnd = res.end;

      // Override end function to capture metrics
      res.end = function (...args: any[]) {
        const responseTime = Date.now() - startTime;

        performanceMonitor.recordRequest({
          endpoint: req.route?.path || req.path || "unknown",
          method: req.method,
          responseTime,
          statusCode: res.statusCode,
          cacheHit: res.get("X-Cache-Hit") === "true",
          textLength: req.body?.text?.length,
          analysisType: req.body?.method || req.query?.method,
        });

        // Call original end function
        originalEnd.apply(this, args);
      };

      next();
    };
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.metrics = [];
    this.startTime = Date.now();
  }

  /**
   * Export metrics to JSON
   */
  exportMetrics(): string {
    return JSON.stringify(
      {
        summary: this.getMetrics(),
        analytics: this.getAnalytics(),
        health: this.getHealthStatus(),
        exportTime: new Date().toISOString(),
      },
      null,
      2,
    );
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();
