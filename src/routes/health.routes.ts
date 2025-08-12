/**
 * Health Check Routes
 * Defines all health monitoring endpoints for system observability
 * Phase 6.2: Health Check System Integration
 */

import { Router } from "express";
import { HealthController } from "../controllers/health.controller";
import { systemLogger } from "../lib/observability/logger";

/**
 * Configure health check routes
 * Sets up multiple health endpoints for different monitoring needs
 */
export function configureHealthRoutes(): Router {
  const router = Router();
  const healthController = new HealthController();
  const logger = systemLogger;

  // Basic health check - simple status endpoint
  router.get("/", async (req, res) => {
    try {
      await healthController.basicHealth(req, res);
    } catch (error) {
      logger.error(
        "Health route error",
        error instanceof Error ? error : new Error(String(error)),
      );
      res
        .status(500)
        .json({ status: "error", message: "Internal server error" });
    }
  });

  // Detailed health check - comprehensive system status
  router.get("/detailed", async (req, res) => {
    try {
      await healthController.detailedHealth(req, res);
    } catch (error) {
      logger.error(
        "Detailed health route error",
        error instanceof Error ? error : new Error(String(error)),
      );
      res
        .status(500)
        .json({ status: "error", message: "Internal server error" });
    }
  });

  // Critical systems health check
  router.get("/critical", async (req, res) => {
    try {
      await healthController.criticalHealth(req, res);
    } catch (error) {
      logger.error(
        "Critical health route error",
        error instanceof Error ? error : new Error(String(error)),
      );
      res
        .status(500)
        .json({ status: "error", message: "Internal server error" });
    }
  });

  // Kubernetes/Docker readiness probe
  router.get("/ready", async (req, res) => {
    try {
      await healthController.readinessProbe(req, res);
    } catch (error) {
      logger.error(
        "Readiness probe route error",
        error instanceof Error ? error : new Error(String(error)),
      );
      res.status(503).json({ status: "not ready", error: "Probe failed" });
    }
  });

  // Kubernetes/Docker liveness probe
  router.get("/live", async (req, res) => {
    try {
      await healthController.livenessProbe(req, res);
    } catch (error) {
      logger.error(
        "Liveness probe route error",
        error instanceof Error ? error : new Error(String(error)),
      );
      res.status(500).json({ status: "dead", error: "Probe failed" });
    }
  });

  logger.info("Health check routes configured", {
    endpoints: [
      "GET /health",
      "GET /health/detailed",
      "GET /health/critical",
      "GET /health/ready",
      "GET /health/live",
    ],
  });

  return router;
}

export default configureHealthRoutes;
