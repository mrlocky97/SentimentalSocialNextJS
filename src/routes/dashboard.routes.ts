/**
 * Dashboard Routes
 * API routes for external frontend dashboard consumption
 * Phase 6.4: Observability APIs for External Frontend
 */

import { Router } from "express";
import { DashboardController } from "../controllers/dashboard.controller";
import { systemLogger } from "../lib/observability/logger";

/**
 * Configure dashboard API routes
 */
export function configureDashboardRoutes(): Router {
  const router = Router();
  const dashboardController = new DashboardController();

  /**
   * @swagger
   * /api/v1/dashboard/overview:
   *   get:
   *     tags: [Dashboard]
   *     summary: Get dashboard overview
   *     description: Get comprehensive dashboard overview with system status, alerts, and quick stats
   *     responses:
   *       200:
   *         description: Dashboard overview retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: object
   *                   properties:
   *                     systemSummary:
   *                       type: object
   *                       properties:
   *                         status:
   *                           type: string
   *                           enum: [healthy, warning, critical]
   *                         uptime:
   *                           type: number
   *                         version:
   *                           type: string
   *                         lastRestart:
   *                           type: string
   *                           format: date-time
   *                     alerts:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           level:
   *                             type: string
   *                             enum: [info, warning, error]
   *                           message:
   *                             type: string
   *                           timestamp:
   *                             type: string
   *                             format: date-time
   *                     quickStats:
   *                       type: object
   *                       properties:
   *                         totalRequests:
   *                           type: number
   *                         activeUsers:
   *                           type: number
   *                         sentimentAnalyses:
   *                           type: number
   *                         errorRate:
   *                           type: number
   *                     serviceStatus:
   *                       type: object
   *                       properties:
   *                         database:
   *                           type: string
   *                           enum: [healthy, degraded, down]
   *                         sentiment:
   *                           type: string
   *                           enum: [healthy, degraded, down]
   *                         scraping:
   *                           type: string
   *                           enum: [healthy, degraded, down]
   *                 message:
   *                   type: string
   *                   example: "Dashboard overview retrieved successfully"
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: false
   *                 error:
   *                   type: string
   *                   example: "Internal server error"
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   */
  // Dashboard overview endpoint
  router.get("/overview", async (req, res) => {
    try {
      await dashboardController.getOverview(req, res);
    } catch (error) {
      systemLogger.error(
        "Dashboard overview route error",
        error instanceof Error ? error : new Error(String(error)),
      );
      res.status(500).json({
        success: false,
        error: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  /**
   * @swagger
   * /api/v1/dashboard/metrics:
   *   get:
   *     tags: [Dashboard]
   *     summary: Get current metrics
   *     description: Get current system metrics and performance data
   *     responses:
   *       200:
   *         description: Current metrics retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: object
   *                   properties:
   *                     performance:
   *                       type: object
   *                       properties:
   *                         responseTime:
   *                           type: number
   *                         throughput:
   *                           type: number
   *                         errorRate:
   *                           type: number
   *                     system:
   *                       type: object
   *                       properties:
   *                         cpu:
   *                           type: number
   *                         memory:
   *                           type: number
   *                         disk:
   *                           type: number
   *                     api:
   *                       type: object
   *                       properties:
   *                         totalRequests:
   *                           type: number
   *                         activeUsers:
   *                           type: number
   *                 message:
   *                   type: string
   *       500:
   *         description: Internal server error
   */
  // Current metrics endpoint
  router.get("/metrics", async (req, res) => {
    try {
      await dashboardController.getCurrentMetrics(req, res);
    } catch (error) {
      systemLogger.error(
        "Dashboard metrics route error",
        error instanceof Error ? error : new Error(String(error)),
      );
      res.status(500).json({
        success: false,
        error: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  /**
   * @swagger
   * /api/v1/dashboard/historical:
   *   get:
   *     tags: [Dashboard]
   *     summary: Get historical metrics
   *     description: Get historical performance metrics and trends
   *     parameters:
   *       - in: query
   *         name: period
   *         schema:
   *           type: string
   *           enum: [1h, 6h, 24h, 7d, 30d]
   *           default: 24h
   *         description: Time period for historical data
   *       - in: query
   *         name: metric
   *         schema:
   *           type: string
   *           enum: [response_time, throughput, error_rate, cpu, memory]
   *         description: Specific metric to retrieve
   *     responses:
   *       200:
   *         description: Historical metrics retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *                   properties:
   *                     period:
   *                       type: string
   *                     dataPoints:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           timestamp:
   *                             type: string
   *                             format: date-time
   *                           value:
   *                             type: number
   *                 message:
   *                   type: string
   */
  // Historical metrics endpoint
  router.get("/historical", async (req, res) => {
    try {
      await dashboardController.getHistoricalMetrics(req, res);
    } catch (error) {
      systemLogger.error(
        "Dashboard historical route error",
        error instanceof Error ? error : new Error(String(error)),
      );
      res.status(500).json({
        success: false,
        error: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Metrics summary endpoint
  router.get("/summary", async (req, res) => {
    try {
      await dashboardController.getMetricsSummary(req, res);
    } catch (error) {
      systemLogger.error(
        "Dashboard summary route error",
        error instanceof Error ? error : new Error(String(error)),
      );
      res.status(500).json({
        success: false,
        error: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Server-Sent Events stream endpoint
  router.get("/stream", async (req, res) => {
    try {
      await dashboardController.streamMetrics(req, res);
    } catch (error) {
      systemLogger.error(
        "Dashboard stream route error",
        error instanceof Error ? error : new Error(String(error)),
      );
      res.status(500).json({
        success: false,
        error: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // API info endpoint
  router.get("/info", async (req, res) => {
    try {
      await dashboardController.getDashboardInfo(req, res);
    } catch (error) {
      systemLogger.error(
        "Dashboard info route error",
        error instanceof Error ? error : new Error(String(error)),
      );
      res.status(500).json({
        success: false,
        error: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  systemLogger.info("Dashboard API routes configured", {
    endpoints: [
      "GET /api/v1/dashboard/metrics",
      "GET /api/v1/dashboard/historical",
      "GET /api/v1/dashboard/summary",
      "GET /api/v1/dashboard/stream",
      "GET /api/v1/dashboard/info",
    ],
  });

  return router;
}

export default configureDashboardRoutes;
