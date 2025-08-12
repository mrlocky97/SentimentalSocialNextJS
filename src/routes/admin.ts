/**
 * Admin Routes - Temporary endpoints for development
 * Remove in production
 */

import { Router } from 'express';
import {
  ErrorCode,
  errorHandler,
  InternalServerError,
  NotFoundError,
  ResponseHelper,
} from '../core/errors';
import { MongoUserRepository } from '../repositories/mongo-user.repository';

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
  '/users',
  errorHandler.expressAsyncWrapper(async (req, res) => {
    const users = await userRepository.findMany();
    ResponseHelper.success(
      res,
      {
        users,
        count: users.length,
      },
      'Users retrieved successfully'
    );
  })
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
  '/users/:id',
  errorHandler.expressAsyncWrapper(async (req, res) => {
    const { id } = req.params;
    const deleted = await userRepository.delete(id);

    if (!deleted) {
      throw new NotFoundError('User not found', ErrorCode.USER_NOT_FOUND, {
        operation: 'delete_user',
        additionalData: { userId: id },
      });
    }

    ResponseHelper.success(res, null, 'User deleted successfully');
  })
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
  '/clear-users',
  errorHandler.expressAsyncWrapper(async () => {
    // This would need to be implemented in the repository
    throw new InternalServerError(
      'Clear users functionality not implemented',
      ErrorCode.CONFIGURATION_ERROR,
      {
        operation: 'clear_users',
        additionalData: { reason: 'Method not implemented in repository' },
      }
    );
  })
);

export default router;
