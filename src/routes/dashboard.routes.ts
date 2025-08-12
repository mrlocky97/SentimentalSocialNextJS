/**
 * Dashboard Routes
 * API routes for external frontend dashboard consumption
 * Phase 6.4: Observability APIs for External Frontend
 */

import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';
import { systemLogger } from '../lib/observability/logger';

/**
 * Configure dashboard API routes
 */
export function configureDashboardRoutes(): Router {
  const router = Router();
  const dashboardController = new DashboardController();

  // Current metrics endpoint
  router.get('/metrics', async (req, res) => {
    try {
      await dashboardController.getCurrentMetrics(req, res);
    } catch (error) {
      systemLogger.error(
        'Dashboard metrics route error',
        error instanceof Error ? error : new Error(String(error))
      );
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Historical metrics endpoint
  router.get('/historical', async (req, res) => {
    try {
      await dashboardController.getHistoricalMetrics(req, res);
    } catch (error) {
      systemLogger.error(
        'Dashboard historical route error',
        error instanceof Error ? error : new Error(String(error))
      );
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Metrics summary endpoint
  router.get('/summary', async (req, res) => {
    try {
      await dashboardController.getMetricsSummary(req, res);
    } catch (error) {
      systemLogger.error(
        'Dashboard summary route error',
        error instanceof Error ? error : new Error(String(error))
      );
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Server-Sent Events stream endpoint
  router.get('/stream', async (req, res) => {
    try {
      await dashboardController.streamMetrics(req, res);
    } catch (error) {
      systemLogger.error(
        'Dashboard stream route error',
        error instanceof Error ? error : new Error(String(error))
      );
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // API info endpoint
  router.get('/info', async (req, res) => {
    try {
      await dashboardController.getDashboardInfo(req, res);
    } catch (error) {
      systemLogger.error(
        'Dashboard info route error',
        error instanceof Error ? error : new Error(String(error))
      );
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString(),
      });
    }
  });

  systemLogger.info('Dashboard API routes configured', {
    endpoints: [
      'GET /api/v1/dashboard/metrics',
      'GET /api/v1/dashboard/historical',
      'GET /api/v1/dashboard/summary',
      'GET /api/v1/dashboard/stream',
      'GET /api/v1/dashboard/info',
    ],
  });

  return router;
}

export default configureDashboardRoutes;
