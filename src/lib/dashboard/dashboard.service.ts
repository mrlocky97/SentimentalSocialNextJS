/**
 * Dashboard API Service
 * Provides optimized APIs for external frontend consumption
 * Phase 6.4: Observability APIs for External Frontend
 */

import { systemLogger } from "../observability/logger";
import { metricsRegistry } from "../observability/metrics";

export interface DashboardMetrics {
  timestamp: string;
  system: {
    health: "healthy" | "warning" | "critical";
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    cpu: {
      usage: number;
    };
    uptime: number;
  };
  http: {
    totalRequests: number;
    requestsPerMinute: number;
    averageResponseTime: number;
    errorRate: number;
  };
  cache: {
    hitRate: number;
    hits: number;
    misses: number;
    size: number;
  };
  sentiment: {
    totalAnalyses: number;
    averageConfidence: number;
    averageTime: number;
    analysesPerMinute: number;
  };
}

export interface HistoricalMetrics {
  timestamps: string[];
  series: {
    requests: number[];
    responseTime: number[];
    memoryUsage: number[];
    cpuUsage: number[];
    cacheHitRate: number[];
    sentimentAnalyses: number[];
  };
}

export interface MetricsSummary {
  status: "healthy" | "warning" | "critical";
  uptime: number;
  totalRequests: number;
  totalSentimentAnalyses: number;
  averageResponseTime: number;
  systemLoad: number;
  lastUpdated: string;
}

export class DashboardService {
  private static instance: DashboardService;
  private historicalData: Map<
    string,
    Array<{ timestamp: Date; value: number }>
  > = new Map();
  private readonly maxHistoryPoints = 100; // Keep last 100 data points
  private updateInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.initializeHistoricalTracking();
  }

  public static getInstance(): DashboardService {
    if (!DashboardService.instance) {
      DashboardService.instance = new DashboardService();
    }
    return DashboardService.instance;
  }

  /**
   * Initialize historical data tracking
   */
  private initializeHistoricalTracking(): void {
    // Start collecting historical data every 30 seconds
    this.updateInterval = setInterval(() => {
      this.collectHistoricalDataPoint();
    }, 30000);

    systemLogger.info("Dashboard service initialized with historical tracking");
  }

  /**
   * Collect a single historical data point
   */
  private collectHistoricalDataPoint(): void {
    try {
      const now = new Date();
      const systemMetrics = metricsRegistry.getSystemMetrics();

      // Collect key metrics
      const httpRequestsMetric = metricsRegistry.getMetric(
        "http_requests_total",
      );
      // memory & cpu metrics available via systemMetrics snapshot

      const dataPoints = {
        requests: httpRequestsMetric?.getValue() || 0,
        responseTime: 0, // Will be calculated from histogram
        memoryUsage:
          (systemMetrics.system.memory.used /
            systemMetrics.system.memory.total) *
          100,
        cpuUsage: systemMetrics.system.cpu.usage,
        cacheHitRate: 0, // Will be calculated from cache metrics
        sentimentAnalyses: 0, // Will be calculated from sentiment metrics
      };

      // Store each metric with timestamp
      Object.entries(dataPoints).forEach(([key, value]) => {
        if (!this.historicalData.has(key)) {
          this.historicalData.set(key, []);
        }

        const series = this.historicalData.get(key)!;
        series.push({ timestamp: now, value });

        // Keep only last N points
        if (series.length > this.maxHistoryPoints) {
          series.shift();
        }
      });
    } catch (error) {
      systemLogger.error(
        "Error collecting historical data point",
        error as Error,
      );
    }
  }

  /**
   * Get current dashboard metrics optimized for frontend
   */
  public getCurrentMetrics(): DashboardMetrics {
    try {
      const systemMetrics = metricsRegistry.getSystemMetrics();
      // const snapshot = metricsRegistry.getSnapshot(); // Not currently used

      // Calculate system health status
      const memoryPercentage =
        (systemMetrics.system.memory.used / systemMetrics.system.memory.total) *
        100;
      const cpuUsage = systemMetrics.system.cpu.usage;

      let systemHealth: "healthy" | "warning" | "critical" = "healthy";
      if (memoryPercentage > 90 || cpuUsage > 90) {
        systemHealth = "critical";
      } else if (memoryPercentage > 75 || cpuUsage > 75) {
        systemHealth = "warning";
      }

      // Get HTTP metrics
      const httpRequestsMetric = metricsRegistry.getMetric(
        "http_requests_total",
      );
      const totalRequests = httpRequestsMetric?.getValue() || 0;

      return {
        timestamp: new Date().toISOString(),
        system: {
          health: systemHealth,
          memory: {
            used: systemMetrics.system.memory.used,
            total: systemMetrics.system.memory.total,
            percentage: Math.round(memoryPercentage * 100) / 100,
          },
          cpu: {
            usage: Math.round(cpuUsage * 100) / 100,
          },
          uptime: systemMetrics.system.process.uptime,
        },
        http: {
          totalRequests,
          requestsPerMinute: this.calculateRequestsPerMinute(),
          averageResponseTime: this.calculateAverageResponseTime(),
          errorRate: this.calculateErrorRate(),
        },
        cache: {
          hitRate: this.calculateCacheHitRate(),
          hits: this.getCacheHits(),
          misses: this.getCacheMisses(),
          size: this.getCacheSize(),
        },
        sentiment: {
          totalAnalyses: this.getSentimentAnalysesTotal(),
          averageConfidence: this.getSentimentAverageConfidence(),
          averageTime: this.getSentimentAverageTime(),
          analysesPerMinute: this.calculateSentimentAnalysesPerMinute(),
        },
      };
    } catch (error) {
      systemLogger.error("Error getting current metrics", error as Error);
      throw error;
    }
  }

  /**
   * Get historical metrics for charts
   */
  public getHistoricalMetrics(
    timeRange: "1h" | "6h" | "24h" = "1h",
  ): HistoricalMetrics {
    try {
      const now = new Date();
      let cutoffTime: Date;

      switch (timeRange) {
        case "1h":
          cutoffTime = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case "6h":
          cutoffTime = new Date(now.getTime() - 6 * 60 * 60 * 1000);
          break;
        case "24h":
          cutoffTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        default:
          cutoffTime = new Date(now.getTime() - 60 * 60 * 1000);
      }

      // Filter data by time range
      const filteredData: Record<
        string,
        Array<{ timestamp: Date; value: number }>
      > = {};

      this.historicalData.forEach((series, key) => {
        filteredData[key] = series.filter(
          (point) => point.timestamp >= cutoffTime,
        );
      });

      // Extract timestamps and values
      const timestamps: string[] = [];
      const seriesData: Record<string, number[]> = {
        requests: [],
        responseTime: [],
        memoryUsage: [],
        cpuUsage: [],
        cacheHitRate: [],
        sentimentAnalyses: [],
      };

      // Get unique timestamps
      const allTimestamps = new Set<number>();
      Object.values(filteredData).forEach((series) => {
        series.forEach((point) => allTimestamps.add(point.timestamp.getTime()));
      });

      const sortedTimestamps = Array.from(allTimestamps).sort();

      sortedTimestamps.forEach((timestamp) => {
        timestamps.push(new Date(timestamp).toISOString());

        // For each metric, find the value at this timestamp or interpolate
        Object.keys(seriesData).forEach((metric) => {
          const series = filteredData[metric] || [];
          const point = series.find((p) => p.timestamp.getTime() === timestamp);
          seriesData[metric].push(point?.value || 0);
        });
      });

      return {
        timestamps,
        series: {
          requests: seriesData.requests,
          responseTime: seriesData.responseTime,
          memoryUsage: seriesData.memoryUsage,
          cpuUsage: seriesData.cpuUsage,
          cacheHitRate: seriesData.cacheHitRate,
          sentimentAnalyses: seriesData.sentimentAnalyses,
        },
      };
    } catch (error) {
      systemLogger.error("Error getting historical metrics", error as Error);
      throw error;
    }
  }

  /**
   * Get metrics summary for overview
   */
  public getMetricsSummary(): MetricsSummary {
    try {
      const current = this.getCurrentMetrics();

      let overallStatus: "healthy" | "warning" | "critical" =
        current.system.health;

      // Factor in error rate and response time
      if (
        current.http.errorRate > 5 ||
        current.http.averageResponseTime > 2000
      ) {
        overallStatus = overallStatus === "healthy" ? "warning" : "critical";
      }

      return {
        status: overallStatus,
        uptime: current.system.uptime,
        totalRequests: current.http.totalRequests,
        totalSentimentAnalyses: current.sentiment.totalAnalyses,
        averageResponseTime: current.http.averageResponseTime,
        systemLoad: Math.max(
          current.system.memory.percentage,
          current.system.cpu.usage,
        ),
        lastUpdated: current.timestamp,
      };
    } catch (error) {
      systemLogger.error("Error getting metrics summary", error as Error);
      throw error;
    }
  }

  // Helper methods for calculations
  private calculateRequestsPerMinute(): number {
    const series = this.historicalData.get("requests") || [];
    if (series.length < 2) return 0;

    const recent = series.slice(-2);
    const timeDiff =
      (recent[1].timestamp.getTime() - recent[0].timestamp.getTime()) / 1000;
    const requestDiff = recent[1].value - recent[0].value;

    return Math.round((requestDiff / timeDiff) * 60);
  }

  private calculateAverageResponseTime(): number {
    // This would be calculated from histogram data in a real implementation
    return 150; // Placeholder
  }

  private calculateErrorRate(): number {
    const errorsMetric = metricsRegistry.getMetric(
      "http_requests_errors_total",
    );
    const totalMetric = metricsRegistry.getMetric("http_requests_total");

    const errors = errorsMetric?.getValue() || 0;
    const total = totalMetric?.getValue() || 0;

    return total > 0 ? Math.round((errors / total) * 100 * 100) / 100 : 0;
  }

  private calculateCacheHitRate(): number {
    const hitsMetric = metricsRegistry.getMetric("cache_hits_total");
    const missesMetric = metricsRegistry.getMetric("cache_misses_total");

    const hits = hitsMetric?.getValue() || 0;
    const misses = missesMetric?.getValue() || 0;
    const total = hits + misses;

    return total > 0 ? Math.round((hits / total) * 100 * 100) / 100 : 0;
  }

  private getCacheHits(): number {
    return metricsRegistry.getMetric("cache_hits_total")?.getValue() || 0;
  }

  private getCacheMisses(): number {
    return metricsRegistry.getMetric("cache_misses_total")?.getValue() || 0;
  }

  private getCacheSize(): number {
    return metricsRegistry.getMetric("cache_size")?.getValue() || 0;
  }

  private getSentimentAnalysesTotal(): number {
    return (
      metricsRegistry.getMetric("sentiment_analysis_total")?.getValue() || 0
    );
  }

  private getSentimentAverageConfidence(): number {
    // This would be calculated from sentiment metrics in a real implementation
    return 85.5; // Placeholder
  }

  private getSentimentAverageTime(): number {
    // This would be calculated from histogram data in a real implementation
    return 120; // Placeholder
  }

  private calculateSentimentAnalysesPerMinute(): number {
    const series = this.historicalData.get("sentimentAnalyses") || [];
    if (series.length < 2) return 0;

    const recent = series.slice(-2);
    const timeDiff =
      (recent[1].timestamp.getTime() - recent[0].timestamp.getTime()) / 1000;
    const analysesDiff = recent[1].value - recent[0].value;

    return Math.round((analysesDiff / timeDiff) * 60);
  }

  /**
   * Get dashboard overview
   */
  public getOverview(): any {
    const currentMetrics = this.getCurrentMetrics();

    return {
      summary: {
        totalRequests: currentMetrics.http.totalRequests,
        totalAnalyses: currentMetrics.sentiment.totalAnalyses,
        systemHealth: currentMetrics.system.health,
        uptime: currentMetrics.system.uptime,
      },
      alerts: this.getSystemAlerts(),
      quickStats: {
        requestsPerMinute: currentMetrics.http.requestsPerMinute,
        averageResponseTime: currentMetrics.http.averageResponseTime,
        errorRate: currentMetrics.http.errorRate,
        memoryUsage: currentMetrics.system.memory.percentage,
      },
      services: {
        api: currentMetrics.system.health === "critical" ? "down" : "up",
        database: "up", // This could be enhanced with actual DB health check
        sentiment: "up",
        cache: currentMetrics.cache.hitRate > 0 ? "up" : "degraded",
      },
    };
  }

  private getSystemAlerts(): Array<{
    type: string;
    message: string;
    severity: string;
  }> {
    const alerts: Array<{ type: string; message: string; severity: string }> =
      [];
    const currentMetrics = this.getCurrentMetrics();

    if (currentMetrics.system.memory.percentage > 90) {
      alerts.push({
        type: "memory",
        message: "High memory usage detected",
        severity: "warning",
      });
    }

    if (currentMetrics.http.errorRate > 5) {
      alerts.push({
        type: "errors",
        message: "High error rate detected",
        severity: "critical",
      });
    }

    if (currentMetrics.cache.hitRate < 50) {
      alerts.push({
        type: "cache",
        message: "Low cache hit rate",
        severity: "warning",
      });
    }

    return alerts;
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.historicalData.clear();
    systemLogger.info("Dashboard service cleaned up");
  }
}

// Export singleton instance
export const dashboardService = DashboardService.getInstance();
