/**
 * Metrics Controller
 * Provides endpoints for metrics collection and reporting
 * Phase 6.3: Observability and Metrics Implementation
 */

import { Request, Response } from "express";
import { systemLogger } from "../lib/observability/logger";
import { metricsRegistry } from "../lib/observability/metrics";
import {
  cacheMetrics,
  sentimentMetrics,
} from "../middleware/metrics.middleware";

/**
 * Metrics Controller
 * Handles metrics export and reporting endpoints
 */
export class MetricsController {
  private logger = systemLogger;

  /**
   * Get all metrics in Prometheus format
   * GET /metrics
   */
  async getPrometheusMetrics(req: Request, res: Response): Promise<void> {
    try {
      const startTime = performance.now();
      const snapshot = metricsRegistry.getSnapshot();

      let output = "";

      for (const [name, metric] of Object.entries(snapshot)) {
        // Add help text
        output += `# HELP ${name} ${metric.help}\n`;
        output += `# TYPE ${name} ${metric.type}\n`;

        // Add metric values
        for (const value of metric.values) {
          const labels = value.labels
            ? "{" +
              Object.entries(value.labels)
                .map(([k, v]) => `${k}="${v}"`)
                .join(",") +
              "}"
            : "";

          output += `${name}${labels} ${value.value} ${value.timestamp.getTime()}\n`;
        }

        output += "\n";
      }

      res.set("Content-Type", "text/plain; version=0.0.4; charset=utf-8");
      res.status(200).send(output);

      this.logger.info("Prometheus metrics exported", {
        metricsCount: Object.keys(snapshot).length,
        responseTime: performance.now() - startTime,
        endpoint: "/metrics",
      });
    } catch (error) {
      this.logger.error(
        "Error exporting Prometheus metrics",
        error instanceof Error ? error : new Error(String(error)),
      );
      res.status(500).json({
        status: "error",
        message: "Failed to export metrics",
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get metrics in JSON format
   * GET /metrics/json
   */
  async getJsonMetrics(req: Request, res: Response): Promise<void> {
    try {
      const startTime = performance.now();
      const snapshot = metricsRegistry.getSnapshot();
      const systemMetrics = metricsRegistry.getSystemMetrics();

      const response = {
        timestamp: new Date().toISOString(),
        system: systemMetrics,
        metrics: snapshot,
        summary: {
          totalMetrics: Object.keys(snapshot).length,
          collectionDuration: performance.now() - startTime,
        },
      };

      res.status(200).json(response);

      this.logger.info("JSON metrics exported", {
        metricsCount: Object.keys(snapshot).length,
        responseTime: performance.now() - startTime,
        endpoint: "/metrics/json",
      });
    } catch (error) {
      this.logger.error(
        "Error exporting JSON metrics",
        error instanceof Error ? error : new Error(String(error)),
      );
      res.status(500).json({
        status: "error",
        message: "Failed to export metrics",
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get system metrics only
   * GET /metrics/system
   */
  async getSystemMetrics(req: Request, res: Response): Promise<void> {
    try {
      const startTime = performance.now();
      const systemMetrics = metricsRegistry.getSystemMetrics();

      const response = {
        ...systemMetrics,
        responseTime: performance.now() - startTime,
      };

      res.status(200).json(response);

      this.logger.info("System metrics exported", {
        responseTime: performance.now() - startTime,
        endpoint: "/metrics/system",
      });
    } catch (error) {
      this.logger.error(
        "Error exporting system metrics",
        error instanceof Error ? error : new Error(String(error)),
      );
      res.status(500).json({
        status: "error",
        message: "Failed to export system metrics",
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get cache metrics summary
   * GET /metrics/cache
   */
  async getCacheMetrics(req: Request, res: Response): Promise<void> {
    try {
      const startTime = performance.now();
      const cacheType = (req.query.type as string) || "default";
      const summary = cacheMetrics.getSummary(cacheType);

      const response = {
        timestamp: new Date().toISOString(),
        cacheType,
        metrics: summary,
        responseTime: performance.now() - startTime,
      };

      res.status(200).json(response);

      this.logger.info("Cache metrics exported", {
        cacheType,
        hitRate: summary.hitRate,
        responseTime: performance.now() - startTime,
        endpoint: "/metrics/cache",
      });
    } catch (error) {
      this.logger.error(
        "Error exporting cache metrics",
        error instanceof Error ? error : new Error(String(error)),
      );
      res.status(500).json({
        status: "error",
        message: "Failed to export cache metrics",
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get sentiment analysis metrics
   * GET /metrics/sentiment
   */
  async getSentimentMetrics(req: Request, res: Response): Promise<void> {
    try {
      const startTime = performance.now();
      const summary = sentimentMetrics.getSummary();

      const response = {
        timestamp: new Date().toISOString(),
        metrics: summary,
        responseTime: performance.now() - startTime,
      };

      res.status(200).json(response);

      this.logger.info("Sentiment metrics exported", {
        totalAnalyses: summary.totalAnalyses,
        errorRate: summary.errorRate,
        responseTime: performance.now() - startTime,
        endpoint: "/metrics/sentiment",
      });
    } catch (error) {
      this.logger.error(
        "Error exporting sentiment metrics",
        error instanceof Error ? error : new Error(String(error)),
      );
      res.status(500).json({
        status: "error",
        message: "Failed to export sentiment metrics",
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get performance metrics for specific time window
   * GET /metrics/performance
   */
  async getPerformanceMetrics(req: Request, res: Response): Promise<void> {
    try {
      const startTime = performance.now();
      const windowMs = parseInt(req.query.window as string) || 300000; // 5 minutes default
      const snapshot = metricsRegistry.getSnapshot();

      // Filter metrics to only include performance-related ones
      const performanceMetrics = Object.fromEntries(
        Object.entries(snapshot).filter(
          ([name]) =>
            name.includes("duration") ||
            name.includes("latency") ||
            name.includes("response_time"),
        ),
      );

      const response = {
        timestamp: new Date().toISOString(),
        windowMs,
        metrics: performanceMetrics,
        summary: {
          metricsCount: Object.keys(performanceMetrics).length,
          collectionTime: performance.now() - startTime,
        },
      };

      res.status(200).json(response);

      this.logger.info("Performance metrics exported", {
        windowMs,
        metricsCount: Object.keys(performanceMetrics).length,
        responseTime: performance.now() - startTime,
        endpoint: "/metrics/performance",
      });
    } catch (error) {
      this.logger.error(
        "Error exporting performance metrics",
        error instanceof Error ? error : new Error(String(error)),
      );
      res.status(500).json({
        status: "error",
        message: "Failed to export performance metrics",
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get metrics summary with key statistics
   */
  async getMetricsSummary(req: Request, res: Response): Promise<void> {
    try {
      const snapshot = metricsRegistry.getSnapshot();
      const systemStats = metricsRegistry.getSystemMetrics();

      // Simple summary data
      const totalMetrics = Object.keys(snapshot).length;
      const httpRequestsMetric = metricsRegistry.getMetric(
        "http_requests_total",
      );
      const totalHttpRequests = httpRequestsMetric?.getValue() || 0;

      const summary = {
        status: "success",
        timestamp: new Date().toISOString(),
        summary: {
          totalMetrics,
          totalHttpRequests,
          systemHealth: {
            memoryUsage: systemStats.system.memory.used || 0,
            cpuUsage: systemStats.system.cpu.usage || 0,
            uptime: systemStats.system.process.uptime || 0,
          },
          cacheStats: {
            hitRate: 0, // Will be populated when middleware methods are available
            totalOperations: 0,
            size: 0,
          },
          sentimentStats: {
            totalAnalyses: 0, // Will be populated when middleware methods are available
            averageConfidence: 0,
            analysisTime: 0,
          },
        },
        endpoints: [
          "/metrics - Prometheus format",
          "/metrics/json - JSON format",
          "/metrics/system - System metrics only",
          "/metrics/cache - Cache metrics only",
          "/metrics/sentiment - Sentiment metrics only",
          "/metrics/performance - Performance metrics only",
          "/metrics/summary - This summary",
        ],
      };

      res.json(summary);
    } catch (error) {
      systemLogger.error(
        "Metrics summary error",
        error instanceof Error ? error : new Error(String(error)),
      );

      res.status(500).json({
        status: "error",
        message: "Internal server error",
      });
    }
  }

  /**
   * Reset a specific metric
   */
  async resetMetric(req: Request, res: Response): Promise<void> {
    try {
      const { metricName } = req.body;

      if (!metricName || typeof metricName !== "string") {
        res.status(400).json({
          status: "error",
          message: "Metric name is required",
        });
        return;
      }

      const success = metricsRegistry.resetMetric(metricName);

      if (!success) {
        res.status(404).json({
          status: "error",
          message: `Metric '${metricName}' not found`,
        });
        return;
      }

      systemLogger.info("Metric reset", { metricName });

      res.json({
        status: "success",
        message: `Metric '${metricName}' reset successfully`,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      systemLogger.error(
        "Reset metric error",
        error instanceof Error ? error : new Error(String(error)),
      );

      res.status(500).json({
        status: "error",
        message: "Internal server error",
      });
    }
  }
}
