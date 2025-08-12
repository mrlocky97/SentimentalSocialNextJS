/**
 * System Metrics Service
 * Provides performance metrics and system monitoring
 */

import os from "os";
import { appCache } from "../cache";

export interface SystemMetrics {
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    cores: number;
    load: number[];
  };
  cache: {
    totalItems: number;
    activeItems: number;
    expiredItems: number;
  };
  requests: {
    total: number;
    successful: number;
    failed: number;
    averageResponseTime: number;
  };
}

export interface EndpointMetrics {
  path: string;
  method: string;
  count: number;
  totalDuration: number;
  averageDuration: number;
  maxDuration: number;
  errors: number;
  errorRate: number;
}

export class MetricsService {
  private static instance: MetricsService;
  private requestCounter = 0;
  private successCounter = 0;
  private failureCounter = 0;
  private totalResponseTime = 0;

  static getInstance(): MetricsService {
    if (!MetricsService.instance) {
      MetricsService.instance = new MetricsService();
    }
    return MetricsService.instance;
  }

  /**
   * Record a request metric
   */
  recordRequest(duration: number, success: boolean): void {
    this.requestCounter++;
    this.totalResponseTime += duration;

    if (success) {
      this.successCounter++;
    } else {
      this.failureCounter++;
    }
  }

  /**
   * Get current system metrics
   */
  getSystemMetrics(): SystemMetrics {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    return {
      uptime: process.uptime(),
      memory: {
        used: usedMem,
        total: totalMem,
        percentage: (usedMem / totalMem) * 100,
      },
      cpu: {
        cores: os.cpus().length,
        load: os.loadavg(),
      },
      cache: appCache.getStats(),
      requests: {
        total: this.requestCounter,
        successful: this.successCounter,
        failed: this.failureCounter,
        averageResponseTime:
          this.requestCounter > 0
            ? this.totalResponseTime / this.requestCounter
            : 0,
      },
    };
  }

  /**
   * Get endpoint-specific metrics
   */
  getEndpointMetrics(): EndpointMetrics[] {
    const metrics: EndpointMetrics[] = [];

    // This would normally iterate through stored metrics
    // For now, we'll return a placeholder
    return metrics;
  }

  /**
   * Get cache hit ratio
   */
  getCacheHitRatio(): number {
    const stats = appCache.getStats();
    const totalRequests = stats.totalItems + stats.expiredItems;

    return totalRequests > 0 ? (stats.activeItems / totalRequests) * 100 : 0;
  }

  /**
   * Check if system is healthy
   */
  isSystemHealthy(): {
    healthy: boolean;
    issues: string[];
    score: number;
  } {
    const metrics = this.getSystemMetrics();
    const issues: string[] = [];
    let score = 100;

    // Check memory usage
    if (metrics.memory.percentage > 90) {
      issues.push("High memory usage (>90%)");
      score -= 30;
    } else if (metrics.memory.percentage > 75) {
      issues.push("Moderate memory usage (>75%)");
      score -= 15;
    }

    // Check CPU load
    const avgLoad = metrics.cpu.load[0];
    const maxLoad = metrics.cpu.cores;
    if (avgLoad > maxLoad * 0.9) {
      issues.push("High CPU load");
      score -= 25;
    } else if (avgLoad > maxLoad * 0.7) {
      issues.push("Moderate CPU load");
      score -= 10;
    }

    // Check error rate
    const errorRate =
      metrics.requests.total > 0
        ? (metrics.requests.failed / metrics.requests.total) * 100
        : 0;

    if (errorRate > 10) {
      issues.push("High error rate (>10%)");
      score -= 20;
    } else if (errorRate > 5) {
      issues.push("Moderate error rate (>5%)");
      score -= 10;
    }

    // Check response time
    if (metrics.requests.averageResponseTime > 2000) {
      issues.push("Slow response times (>2s)");
      score -= 15;
    } else if (metrics.requests.averageResponseTime > 1000) {
      issues.push("Moderate response times (>1s)");
      score -= 5;
    }

    return {
      healthy: score >= 70,
      issues,
      score: Math.max(0, score),
    };
  }

  /**
   * Generate health report
   */
  generateHealthReport(): {
    status: "healthy" | "warning" | "critical";
    timestamp: string;
    uptime: string;
    metrics: SystemMetrics;
    health: {
      healthy: boolean;
      issues: string[];
      score: number;
    };
    recommendations: string[];
  } {
    const metrics = this.getSystemMetrics();
    const health = this.isSystemHealthy();
    const recommendations: string[] = [];

    // Generate recommendations based on metrics
    if (metrics.memory.percentage > 80) {
      recommendations.push("Consider implementing memory cleanup routines");
      recommendations.push("Monitor for memory leaks");
    }

    if (metrics.requests.averageResponseTime > 1000) {
      recommendations.push("Optimize slow endpoints");
      recommendations.push("Consider implementing response caching");
    }

    if (appCache.getStats().expiredItems > 100) {
      recommendations.push("Run cache cleanup to free memory");
    }

    const status: "healthy" | "warning" | "critical" =
      health.score >= 80
        ? "healthy"
        : health.score >= 60
          ? "warning"
          : "critical";

    return {
      status,
      timestamp: new Date().toISOString(),
      uptime: this.formatUptime(metrics.uptime),
      metrics,
      health,
      recommendations,
    };
  }

  /**
   * Format uptime for human readability
   */
  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  /**
   * Reset metrics (useful for testing)
   */
  reset(): void {
    this.requestCounter = 0;
    this.successCounter = 0;
    this.failureCounter = 0;
    this.totalResponseTime = 0;
    appCache.clear();
  }
}

// Export singleton instance
export const metricsService = MetricsService.getInstance();
