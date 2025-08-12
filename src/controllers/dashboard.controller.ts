/**
 * Dashboard Controller
 * REST API endpoints for external frontend dashboard consumption
 * Phase 6.4: Observability APIs for External Frontend
 */

import { Request, Response } from "express";
import { dashboardService } from "../lib/dashboard/dashboard.service";
import { systemLogger } from "../lib/observability/logger";

export class DashboardController {
  /**
   * Get current dashboard metrics
   * GET /api/v1/dashboard/metrics
   */
  async getCurrentMetrics(req: Request, res: Response): Promise<void> {
    try {
      const startTime = performance.now();
      const metrics = dashboardService.getCurrentMetrics();

      res.json({
        success: true,
        data: metrics,
        responseTime: Math.round(performance.now() - startTime),
        timestamp: new Date().toISOString(),
      });

      systemLogger.info("Dashboard current metrics exported", {
        responseTime: performance.now() - startTime,
        endpoint: "/api/v1/dashboard/metrics",
      });
    } catch (error) {
      systemLogger.error(
        "Error getting current dashboard metrics",
        error instanceof Error ? error : new Error(String(error)),
      );

      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to get current metrics",
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get historical metrics for charts
   * GET /api/v1/dashboard/historical?timeRange=1h|6h|24h
   */
  async getHistoricalMetrics(req: Request, res: Response): Promise<void> {
    try {
      const startTime = performance.now();
      const timeRange = (req.query.timeRange as string) || "1h";

      if (!["1h", "6h", "24h"].includes(timeRange)) {
        res.status(400).json({
          success: false,
          error: "Invalid time range",
          message: "Time range must be one of: 1h, 6h, 24h",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const historicalData = dashboardService.getHistoricalMetrics(
        timeRange as "1h" | "6h" | "24h",
      );

      res.json({
        success: true,
        data: historicalData,
        timeRange,
        responseTime: Math.round(performance.now() - startTime),
        timestamp: new Date().toISOString(),
      });

      systemLogger.info("Dashboard historical metrics exported", {
        timeRange,
        dataPoints: historicalData.timestamps.length,
        responseTime: performance.now() - startTime,
        endpoint: "/api/v1/dashboard/historical",
      });
    } catch (error) {
      systemLogger.error(
        "Error getting historical dashboard metrics",
        error instanceof Error ? error : new Error(String(error)),
      );

      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to get historical metrics",
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get metrics summary for overview
   * GET /api/v1/dashboard/summary
   */
  async getMetricsSummary(req: Request, res: Response): Promise<void> {
    try {
      const startTime = performance.now();
      const summary = dashboardService.getMetricsSummary();

      res.json({
        success: true,
        data: summary,
        responseTime: Math.round(performance.now() - startTime),
        timestamp: new Date().toISOString(),
      });

      systemLogger.info("Dashboard summary exported", {
        status: summary.status,
        responseTime: performance.now() - startTime,
        endpoint: "/api/v1/dashboard/summary",
      });
    } catch (error) {
      systemLogger.error(
        "Error getting dashboard summary",
        error instanceof Error ? error : new Error(String(error)),
      );

      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to get metrics summary",
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Server-Sent Events stream for real-time metrics
   * GET /api/v1/dashboard/stream
   */
  async streamMetrics(req: Request, res: Response): Promise<void> {
    try {
      // Set SSE headers
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "Cache-Control, Content-Type, Authorization",
      });

      systemLogger.info("Dashboard SSE stream started", {
        clientIP: req.ip,
        userAgent: req.get("User-Agent"),
      });

      // Send initial metrics
      const initialMetrics = dashboardService.getCurrentMetrics();
      res.write(`data: ${JSON.stringify(initialMetrics)}\n\n`);

      // Set up interval for periodic updates
      const interval = setInterval(() => {
        try {
          const metrics = dashboardService.getCurrentMetrics();
          res.write(`data: ${JSON.stringify(metrics)}\n\n`);
        } catch (error) {
          systemLogger.error("Error in SSE metrics stream", error as Error);
          clearInterval(interval);
          res.end();
        }
      }, 5000); // Send updates every 5 seconds

      // Handle client disconnect
      req.on("close", () => {
        clearInterval(interval);
        systemLogger.info("Dashboard SSE stream closed");
        res.end();
      });

      // Handle errors
      res.on("error", (error) => {
        systemLogger.error("SSE stream error", error);
        clearInterval(interval);
        res.end();
      });
    } catch (error) {
      systemLogger.error(
        "Error starting dashboard SSE stream",
        error instanceof Error ? error : new Error(String(error)),
      );

      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to start metrics stream",
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get available metrics endpoints info
   * GET /api/v1/dashboard/info
   */
  async getDashboardInfo(req: Request, res: Response): Promise<void> {
    try {
      const info = {
        service: "SentimentalSocial Dashboard API",
        version: "1.0.0",
        endpoints: {
          current: {
            method: "GET",
            path: "/api/v1/dashboard/metrics",
            description: "Get current real-time metrics",
          },
          historical: {
            method: "GET",
            path: "/api/v1/dashboard/historical",
            description: "Get historical metrics for charts",
            parameters: {
              timeRange: ["1h", "6h", "24h"],
            },
          },
          summary: {
            method: "GET",
            path: "/api/v1/dashboard/summary",
            description: "Get metrics overview summary",
          },
          stream: {
            method: "GET",
            path: "/api/v1/dashboard/stream",
            description: "Server-Sent Events stream for real-time updates",
          },
          info: {
            method: "GET",
            path: "/api/v1/dashboard/info",
            description: "This endpoint - API information",
          },
        },
        features: [
          "Real-time system metrics",
          "Historical data for charts",
          "HTTP request analytics",
          "Cache performance metrics",
          "Sentiment analysis statistics",
          "Server-Sent Events streaming",
          "CORS enabled for external frontends",
        ],
        sampleUsage: {
          javascript: `
// Get current metrics
fetch('/api/v1/dashboard/metrics')
  .then(response => response.json())
  .then(data => console.log(data));

// Get historical data for charts
fetch('/api/v1/dashboard/historical?timeRange=1h')
  .then(response => response.json())
  .then(data => {
    // data.data.series contains arrays ready for Chart.js
    console.log(data.data.series);
  });

// Real-time updates with SSE
const eventSource = new EventSource('/api/v1/dashboard/stream');
eventSource.onmessage = function(event) {
  const metrics = JSON.parse(event.data);
  console.log('Real-time metrics:', metrics);
};
          `,
        },
        timestamp: new Date().toISOString(),
      };

      res.json({
        success: true,
        data: info,
      });
    } catch (error) {
      systemLogger.error(
        "Error getting dashboard info",
        error instanceof Error ? error : new Error(String(error)),
      );

      res.status(500).json({
        success: false,
        error: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  }
}
