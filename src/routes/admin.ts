/**
 * Admin Routes - Temporary endpoints for development
 * Remove in production
 */

import { Router } from 'express';
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
router.get('/users', async (req, res) => {
  try {
    const users = await userRepository.findMany();
    res.json({
      success: true,
      data: users,
      count: users.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to fetch users',
        code: 'FETCH_USERS_ERROR'
      }
    });
  }
});

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
router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await userRepository.delete(id);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'User not found',
          code: 'USER_NOT_FOUND'
        }
      });
    }

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to delete user',
        code: 'DELETE_USER_ERROR'
      }
    });
  }
});

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
router.post('/clear-users', async (req, res) => {
  try {
    // This would need to be implemented in the repository
    res.json({
      success: true,
      message: 'Clear users endpoint - implement if needed'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to clear users',
        code: 'CLEAR_USERS_ERROR'
      }
    });
  }
});

export default router;
