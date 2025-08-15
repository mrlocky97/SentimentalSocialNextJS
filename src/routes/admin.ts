/**
 * Admin import { cacheService } from '../lib/cache/cache-migration';outes - System monitoring and management endpoints
 */

import { Router } from "express";
import {
  asyncHandler,
  ErrorCode,
  InternalServerError,
  NotFoundError,
  ResponseHelper,
} from "../core/errors";
import { MongoUserRepository } from "../repositories/mongo-user.repository";
import { cacheService } from "../services/cache.service";
import { performanceMonitor } from "../services/performance-monitor.service";

const router = Router();
const userRepository = new MongoUserRepository();

/**
 * @swagger
 * /api/v1/admin/users:
 *   get:
 *     tags: [Admin]
 *     summary: Get all users (Development only)
 *     description: List all users in the database. Remove in production.
 *     responses:
 *       200:
 *         description: List of all users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 */
router.get(
  "/users",
  asyncHandler(async (req: any, res: any) => {
    const users = await userRepository.findMany();
    ResponseHelper.success(
      res,
      {
        users,
        count: users.length,
      },
      "Users retrieved successfully",
    );
  }),
);

/**
 * @swagger
 * /api/v1/admin/users/{id}:
 *   delete:
 *     tags: [Admin]
 *     summary: Delete user (Development only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deleted successfully
 */
router.delete(
  "/users/:id",
  asyncHandler(async (req: any, res: any) => {
    const { id } = req.params;
    const deleted = await userRepository.delete(id);

    if (!deleted) {
      throw new NotFoundError("User not found", ErrorCode.USER_NOT_FOUND, {
        operation: "delete_user",
        additionalData: { userId: id },
      });
    }

    ResponseHelper.success(res, null, "User deleted successfully");
  }),
);

/**
 * @swagger
 * /api/v1/admin/clear-users:
 *   post:
 *     tags: [Admin]
 *     summary: Clear all users (Development only)
 *     description: Delete all users from database. DANGEROUS - Development only!
 *     responses:
 *       200:
 *         description: All users cleared
 */
router.post(
  "/clear-users",
  asyncHandler(async () => {
    // This would need to be implemented in the repository
    throw new InternalServerError(
      "Clear users functionality not implemented",
      ErrorCode.CONFIGURATION_ERROR,
      {
        operation: "clear_users",
        additionalData: { reason: "Method not implemented in repository" },
      },
    );
  }),
);

/**
 * Enhanced monitoring endpoints
 */

// System health endpoint
router.get("/health", (req, res) => {
  try {
    const healthStatus = performanceMonitor.getHealthStatus();
    res.status(healthStatus.status === "critical" ? 503 : 200).json({
      success: true,
      data: healthStatus,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, error: "Health check failed. " + error });
  }
});

// Performance metrics endpoint
router.get("/metrics", (req, res) => {
  try {
    const timeWindow = parseInt(req.query.timeWindow as string) || 3600000;
    const metrics = performanceMonitor.getMetrics(timeWindow);
    res.json({ success: true, data: metrics });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, error: "Metrics retrieval failed. " + error });
  }
});

// Cache statistics endpoint
router.get("/cache-stats", (req, res) => {
  try {
    const stats = cacheService.getStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Cache stats retrieval failed. " + error,
    });
  }
});

// Clear cache endpoint
router.post("/clear-cache", (req, res) => {
  try {
    cacheService.clear();
    res.json({ success: true, message: "Cache cleared successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, error: "Cache clear failed." + error });
  }
});

export default router;
