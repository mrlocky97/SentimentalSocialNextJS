/**
 * Metrics Routes
 * Defines endpoints for metrics collection and reporting
 * Phase 6.3: Observability and Metrics Implementation
 */

import { Router } from "express";
import { MetricsController } from "../controllers/metrics.controller";
import { systemLogger } from "../lib/observability/logger";

/**
 * Configure metrics routes
 */
export function configureMetricsRoutes(): Router {
  const router = Router();
  const metricsController = new MetricsController();
  const logger = systemLogger;

  // Prometheus metrics endpoint
  router.get("/", async (req, res) => {
    try {
      await metricsController.getPrometheusMetrics(req, res);
    } catch (error) {
      logger.error(
        "Prometheus metrics route error",
        error instanceof Error ? error : new Error(String(error)),
      );
      res.status(500).json({
        status: "error",
        message: "Internal server error",
      });
    }
  });

  // JSON format metrics
  router.get("/json", async (req, res) => {
    try {
      await metricsController.getJsonMetrics(req, res);
    } catch (error) {
      logger.error(
        "JSON metrics route error",
        error instanceof Error ? error : new Error(String(error)),
      );
      res.status(500).json({
        status: "error",
        message: "Internal server error",
      });
    }
  });

  // System metrics only
  router.get("/system", async (req, res) => {
    try {
      await metricsController.getSystemMetrics(req, res);
    } catch (error) {
      logger.error(
        "System metrics route error",
        error instanceof Error ? error : new Error(String(error)),
      );
      res.status(500).json({
        status: "error",
        message: "Internal server error",
      });
    }
  });

  // Cache metrics
  router.get("/cache", async (req, res) => {
    try {
      await metricsController.getCacheMetrics(req, res);
    } catch (error) {
      logger.error(
        "Cache metrics route error",
        error instanceof Error ? error : new Error(String(error)),
      );
      res.status(500).json({
        status: "error",
        message: "Internal server error",
      });
    }
  });

  // Sentiment analysis metrics
  router.get("/sentiment", async (req, res) => {
    try {
      await metricsController.getSentimentMetrics(req, res);
    } catch (error) {
      logger.error(
        "Sentiment metrics route error",
        error instanceof Error ? error : new Error(String(error)),
      );
      res.status(500).json({
        status: "error",
        message: "Internal server error",
      });
    }
  });

  // Performance metrics
  router.get("/performance", async (req, res) => {
    try {
      await metricsController.getPerformanceMetrics(req, res);
    } catch (error) {
      logger.error(
        "Performance metrics route error",
        error instanceof Error ? error : new Error(String(error)),
      );
      res.status(500).json({
        status: "error",
        message: "Internal server error",
      });
    }
  });

  // Metrics summary
  router.get("/summary", async (req, res) => {
    try {
      await metricsController.getMetricsSummary(req, res);
    } catch (error) {
      logger.error(
        "Metrics summary route error",
        error instanceof Error ? error : new Error(String(error)),
      );
      res.status(500).json({
        status: "error",
        message: "Internal server error",
      });
    }
  });

  // Reset metric endpoint
  router.post("/reset", async (req, res) => {
    try {
      await metricsController.resetMetric(req, res);
    } catch (error) {
      logger.error(
        "Reset metric route error",
        error instanceof Error ? error : new Error(String(error)),
      );
      res.status(500).json({
        status: "error",
        message: "Internal server error",
      });
    }
  });
  
  // Cross-validation metrics endpoint
  router.get("/cv", async (req, res) => {
    try {
      await metricsController.getCrossValidationMetrics(req, res);
    } catch (error) {
      logger.error(
        "Cross-validation metrics route error",
        error instanceof Error ? error : new Error(String(error)),
      );
      res.status(500).json({
        status: "error",
        message: "Internal server error",
      });
    }
  });

  logger.info("Metrics routes configured", {
    endpoints: [
      "GET /metrics",
      "GET /metrics/json",
      "GET /metrics/system",
      "GET /metrics/cache",
      "GET /metrics/sentiment",
      "GET /metrics/performance",
      "GET /metrics/summary",
      "GET /metrics/cv",
      "POST /metrics/reset",
    ],
  });

  return router;
}

export default configureMetricsRoutes;
