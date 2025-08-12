/**
 * Health Check Controller
 * Provides health monitoring endpoints for system observability
 * Phase 6.2: Health Check System Integration
 */

import { Request, Response } from "express";
import {
  HealthCheckManager,
  HealthStatus,
  HealthCheckResult,
} from "../lib/health/health-check";
import { LoggerFactory } from "../lib/observability/logger";

// Type for system health report (same as HealthCheckManager.runAllChecks return type)
interface SystemHealthReport {
  status: HealthStatus;
  message: string;
  timestamp: Date;
  duration: number;
  checks: HealthCheckResult[];
  summary: {
    total: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
    critical: number;
  };
}

/**
 * Health Check Controller
 * Manages health monitoring endpoints with different levels of detail
 */
export class HealthController {
  private healthManager: HealthCheckManager;
  private logger = LoggerFactory.getLogger("HealthController");

  constructor() {
    this.healthManager = new HealthCheckManager();
  }

  /**
   * Basic health check endpoint
   * Returns simple status without detailed checks
   * GET /health
   */
  async basicHealth(req: Request, res: Response): Promise<void> {
    try {
      const startTime = performance.now();

      res.status(200).json({
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || "1.0.0",
        environment: process.env.NODE_ENV || "development",
        responseTime: `${(performance.now() - startTime).toFixed(2)}ms`,
      });

      this.logger.info("Basic health check performed", {
        responseTime: performance.now() - startTime,
        endpoint: "/health",
      });
    } catch (error) {
      this.logger.error(
        "Basic health check failed",
        error instanceof Error ? error : new Error(String(error)),
      );
      res.status(500).json({
        status: "error",
        message: "Health check failed",
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Detailed health check endpoint
   * Returns comprehensive system health status
   * GET /health/detailed
   */
  async detailedHealth(req: Request, res: Response): Promise<void> {
    try {
      const startTime = performance.now();

      const healthReport: SystemHealthReport =
        await this.healthManager.runAllChecks();

      // Determine HTTP status based on overall health
      let httpStatus = 200;
      if (healthReport.status === HealthStatus.DEGRADED) {
        httpStatus = 200; // Still operational but with issues
      } else if (healthReport.status === HealthStatus.UNHEALTHY) {
        httpStatus = 503; // Service unavailable
      }

      const response = {
        ...healthReport,
        responseTime: `${(performance.now() - startTime).toFixed(2)}ms`,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || "1.0.0",
        environment: process.env.NODE_ENV || "development",
      };

      res.status(httpStatus).json(response);

      this.logger.info("Detailed health check performed", {
        overallStatus: healthReport.status,
        unhealthyChecks: healthReport.checks.filter(
          (c) => c.status === HealthStatus.UNHEALTHY,
        ).length,
        totalChecks: healthReport.checks.length,
        responseTime: performance.now() - startTime,
        endpoint: "/health/detailed",
      });
    } catch (error) {
      this.logger.error(
        "Detailed health check failed",
        error instanceof Error ? error : new Error(String(error)),
      );
      res.status(500).json({
        status: HealthStatus.UNHEALTHY,
        message: "Health check system failure",
        timestamp: new Date().toISOString(),
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Critical systems health check
   * Returns status of only critical system components
   * GET /health/critical
   */
  async criticalHealth(req: Request, res: Response): Promise<void> {
    try {
      const startTime = performance.now();

      const healthReport: SystemHealthReport =
        await this.healthManager.runAllChecks();

      // Focus on critical checks (we need to determine which checks are critical)
      const criticalFailures = healthReport.summary.critical;
      const status =
        criticalFailures > 0 ? HealthStatus.UNHEALTHY : HealthStatus.HEALTHY;

      let httpStatus = 200;
      if (status === HealthStatus.UNHEALTHY) {
        httpStatus = 503; // Critical system failure
      }

      const response = {
        status,
        message: `${criticalFailures} critical system(s) failing`,
        checks: healthReport.checks.filter(
          (check) => check.status === HealthStatus.UNHEALTHY,
        ),
        summary: {
          total: healthReport.summary.total,
          healthy: healthReport.summary.healthy,
          unhealthy: healthReport.summary.unhealthy,
          critical: healthReport.summary.critical,
        },
        responseTime: `${(performance.now() - startTime).toFixed(2)}ms`,
        timestamp: new Date().toISOString(),
      };

      res.status(httpStatus).json(response);

      this.logger.info("Critical health check performed", {
        status,
        criticalFailures,
        totalChecks: healthReport.summary.total,
        responseTime: performance.now() - startTime,
        endpoint: "/health/critical",
      });
    } catch (error) {
      this.logger.error(
        "Critical health check failed",
        error instanceof Error ? error : new Error(String(error)),
      );
      res.status(500).json({
        status: HealthStatus.UNHEALTHY,
        message: "Critical health check system failure",
        timestamp: new Date().toISOString(),
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Live readiness probe
   * Simple endpoint for Kubernetes/Docker health checks
   * GET /health/ready
   */
  async readinessProbe(req: Request, res: Response): Promise<void> {
    try {
      // Quick critical system check using summary data
      const healthReport = await this.healthManager.runAllChecks();
      const criticalHealthy = healthReport.summary.critical === 0;

      if (criticalHealthy) {
        res.status(200).json({ status: "ready" });
      } else {
        res.status(503).json({ status: "not ready" });
      }

      this.logger.debug("Readiness probe performed", {
        ready: criticalHealthy,
        endpoint: "/health/ready",
      });
    } catch (error) {
      this.logger.error(
        "Readiness probe failed",
        error instanceof Error ? error : new Error(String(error)),
      );
      res.status(503).json({
        status: "not ready",
        errorMessage: "Probe failed",
      });
    }
  }

  /**
   * Liveness probe
   * Simplest endpoint to verify application is running
   * GET /health/live
   */
  async livenessProbe(req: Request, res: Response): Promise<void> {
    try {
      res.status(200).json({
        status: "alive",
        timestamp: new Date().toISOString(),
      });

      this.logger.debug("Liveness probe performed", {
        endpoint: "/health/live",
      });
    } catch (error) {
      this.logger.error(
        "Liveness probe failed",
        error instanceof Error ? error : new Error(String(error)),
      );
      res.status(500).json({
        status: "dead",
        errorMessage: "Probe failed",
      });
    }
  }
}
