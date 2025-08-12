/**
 * User Management Routes
 * API endpoints for user CRUD operations and management
 */

import { Router } from 'express';
import {
  BusinessLogicError,
  ErrorCode,
  errorHandler,
  NotFoundError,
  ResponseHelper,
  ValidationError,
} from '../core/errors';
import { Order } from '../enums/api.enum';
import { authenticateToken, requireRole } from '../middleware/express-auth';
import { MongoUserRepository } from '../repositories/mongo-user.repository';
import { CreateUserRequest, UpdateUserRequest } from '../types/user';

const router = Router();
const userRepository = new MongoUserRepository();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management and authentication
 */

/**
 * @swagger
 * /api/v1/users:
 *   get:
 *     summary: Get all users
 *     description: Retrieve a paginated list of users with filtering options
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of users per page
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [admin, manager, analyst, onlyView, client]
 *         description: Filter by user role
 *       - in: query
 *         name: organizationId
 *         schema:
 *           type: string
 *         description: Filter by organization ID
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by username or display name
 *     responses:
 *       200:
 *         description: Successfully retrieved users
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/PaginatedResponse'
 *                 - type: object
 *                   properties:
 *                     items:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  '/',
  authenticateToken,
  requireRole(['admin', 'manager']),
  errorHandler.expressAsyncWrapper(async (req, res) => {
    const { page = 1, limit = 20, role, organizationId, isActive } = req.query;

    // Build filter object with proper typing
    const filter: any = {};
    if (role) filter.role = role as string;
    if (organizationId) filter.organizationId = organizationId as string;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    // Convert pagination params
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    // Validate pagination parameters
    if (isNaN(pageNum) || pageNum < 1) {
      throw new ValidationError(
        'Invalid page number',
        ErrorCode.INVALID_INPUT,
        {
          operation: 'user_pagination',
          additionalData: { page },
        },
        ['Page must be a positive integer']
      );
    }

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      throw new ValidationError(
        'Invalid limit value',
        ErrorCode.INVALID_INPUT,
        {
          operation: 'user_pagination',
          additionalData: { limit },
        },
        ['Limit must be between 1 and 100']
      );
    }

    const offset = (pageNum - 1) * limitNum;

    // Get users with pagination
    const users = await userRepository.findMany(filter, {
      offset,
      limit: limitNum,
      sortBy: 'createdAt',
      sortOrder: Order.DESC,
    });

    // Get total count for pagination
    const total = await userRepository.count(filter);
    const totalPages = Math.ceil(total / limitNum);

    ResponseHelper.success(res, {
      users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1,
      },
    });
  })
);

/**
 * @swagger
 * /api/v1/users:
 *   post:
 *     summary: Create a new user
 *     description: Create a new user account with specified role and permissions
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateUserRequest'
 *           examples:
 *             admin:
 *               summary: Create admin user
 *               value:
 *                 email: "admin@company.com"
 *                 username: "admin_user"
 *                 displayName: "System Administrator"
 *                 password: "securePassword123!"
 *                 role: "admin"
 *                 organizationId: "60d0fe4f5311236168a109cb"
 *             analyst:
 *               summary: Create analyst user
 *               value:
 *                 email: "analyst@company.com"
 *                 username: "data_analyst"
 *                 displayName: "Data Analyst"
 *                 password: "analystPassword456!"
 *                 role: "analyst"
 *                 organizationId: "60d0fe4f5311236168a109cb"
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *                 message:
 *                   type: string
 *                   example: "User created successfully"
 *       400:
 *         description: Bad request - validation errors
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               validation_error:
 *                 summary: Validation error
 *                 value:
 *                   error:
 *                     code: "VALIDATION_ERROR"
 *                     message: "Invalid input data"
 *                     details:
 *                       email: "Invalid email format"
 *                       password: "Password must be at least 8 characters"
 *                   timestamp: "2024-01-15T10:30:00Z"
 *                   path: "/api/v1/users"
 *       409:
 *         description: Conflict - user already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               user_exists:
 *                 summary: User already exists
 *                 value:
 *                   error:
 *                     code: "EMAIL_OR_USERNAME_EXISTS"
 *                     message: "User with this email or username already exists"
 *                   timestamp: "2024-01-15T10:30:00Z"
 *                   path: "/api/v1/users"
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/',
  authenticateToken,
  requireRole(['admin']),
  errorHandler.expressAsyncWrapper(async (req, res) => {
    const userData: CreateUserRequest = req.body;

    // Validate required fields
    if (!userData.email || !userData.password || !userData.displayName || !userData.username) {
      throw new ValidationError(
        'Missing required fields',
        ErrorCode.INVALID_INPUT,
        {
          operation: 'create_user',
          additionalData: {
            required: ['email', 'password', 'displayName', 'username'],
            provided: Object.keys(req.body),
          },
        },
        ['Please provide all required fields: email, password, displayName, username']
      );
    }

    // Create user
    try {
      const newUser = await userRepository.create(userData);
      ResponseHelper.created(res, newUser, 'User created successfully');
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'EMAIL_OR_USERNAME_EXISTS') {
        throw new BusinessLogicError(
          'Email or username already exists',
          ErrorCode.BUSINESS_RULE_VIOLATION,
          {
            operation: 'create_user',
            additionalData: { email: userData.email, username: userData.username },
          },
          ['Use a different email address', 'Use a different username']
        );
      }
      throw error;
    }
  })
);

/**
 * @swagger
 * /api/v1/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     description: Retrieve a specific user by their ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *         example: "60d0fe4f5311236168a109ca"
 *     responses:
 *       200:
 *         description: User found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/v1/users/profile:
 *   get:
 *     summary: Get current user profile
 *     description: Get the profile information of the currently authenticated user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
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
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  '/profile',
  authenticateToken,
  errorHandler.expressAsyncWrapper(async (req, res) => {
    const userId = (req as any).user.id;
    
    const user = await userRepository.findById(userId);
    
    if (!user) {
      throw new NotFoundError('User not found', ErrorCode.USER_NOT_FOUND, {
        operation: 'get_user_profile',
        additionalData: { userId },
      });
    }

    ResponseHelper.success(res, { user }, 'User profile retrieved successfully');
  })
);

/**
 * @swagger
 * /api/v1/users/profile:
 *   put:
 *     summary: Update current user profile
 *     description: Update the profile information of the currently authenticated user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               displayName:
 *                 type: string
 *                 description: User's display name
 *                 example: "John Doe"
 *               bio:
 *                 type: string
 *                 description: User's biography
 *                 example: "Software engineer passionate about AI"
 *               organizationId:
 *                 type: string
 *                 description: Organization ID
 *     responses:
 *       200:
 *         description: User profile updated successfully
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
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         description: Invalid input data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put(
  '/profile',
  authenticateToken,
  errorHandler.expressAsyncWrapper(async (req, res) => {
    const userId = (req as any).user.id;
    const updateData: Partial<UpdateUserRequest> = req.body;

    // Remove sensitive fields that shouldn't be updated via profile endpoint
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { role, permissions, isActive, ...profileData } = updateData as any;

    const updatedUser = await userRepository.update(userId, profileData);

    if (!updatedUser) {
      throw new NotFoundError('User not found', ErrorCode.USER_NOT_FOUND, {
        operation: 'update_user_profile',
        additionalData: { userId },
      });
    }

    ResponseHelper.success(res, { user: updatedUser }, 'User profile updated successfully');
  })
);

router.get(
  '/:id',
  authenticateToken,
  requireRole(['admin', 'manager']),
  errorHandler.expressAsyncWrapper(async (req, res) => {
    const { id } = req.params;

    // Validate MongoDB ObjectId format (basic validation)
    if (!id || id.length !== 24) {
      throw new ValidationError(
        'Invalid user ID format',
        ErrorCode.INVALID_INPUT,
        {
          operation: 'get_user_by_id',
          additionalData: { providedId: id },
        },
        ['Please provide a valid 24-character MongoDB ObjectId']
      );
    }

    const user = await userRepository.findById(id);

    if (!user) {
      throw new NotFoundError('User not found', ErrorCode.USER_NOT_FOUND, {
        operation: 'get_user_by_id',
        additionalData: { userId: id },
      });
    }

    ResponseHelper.success(res, user);
  })
);

/**
 * @swagger
 * /api/v1/users/{id}:
 *   put:
 *     summary: Update user
 *     description: Update an existing user's information
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               displayName:
 *                 type: string
 *                 maxLength: 50
 *                 example: "Updated Display Name"
 *               avatar:
 *                 type: string
 *                 format: uri
 *                 example: "https://example.com/new-avatar.jpg"
 *               role:
 *                 type: string
 *                 enum: [admin, manager, analyst, onlyView, client]
 *                 example: "manager"
 *               organizationId:
 *                 type: string
 *                 example: "60d0fe4f5311236168a109cb"
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *                 message:
 *                   type: string
 *                   example: "User updated successfully"
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put(
  '/:id',
  authenticateToken,
  requireRole(['admin']),
  errorHandler.expressAsyncWrapper(async (req, res) => {
    const { id } = req.params;
    const updateData: UpdateUserRequest = req.body;

    // Validate MongoDB ObjectId format
    if (!id || id.length !== 24) {
      throw new ValidationError(
        'Invalid user ID format',
        ErrorCode.INVALID_INPUT,
        {
          operation: 'update_user',
          additionalData: { providedId: id },
        },
        ['Please provide a valid 24-character MongoDB ObjectId']
      );
    }

    // Remove password from update data (should use separate endpoint for password changes)
    if ('password' in updateData) {
      delete updateData.password;
    }

    // Update user
    try {
      const updatedUser = await userRepository.update(id, updateData);

      if (!updatedUser) {
        throw new NotFoundError('User not found', ErrorCode.USER_NOT_FOUND, {
          operation: 'update_user',
          additionalData: { userId: id },
        });
      }

      ResponseHelper.success(res, updatedUser, 'User updated successfully');
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'EMAIL_OR_USERNAME_EXISTS') {
        throw new BusinessLogicError(
          'Email or username already exists',
          ErrorCode.BUSINESS_RULE_VIOLATION,
          {
            operation: 'update_user',
            additionalData: { userId: id, updateData },
          },
          ['Use a different email address', 'Use a different username']
        );
      }
      throw error;
    }
  })
);

/**
 * @swagger
 * /api/v1/users/{id}:
 *   delete:
 *     summary: Delete user
 *     description: Delete a user account (soft delete - deactivate)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "User deleted successfully"
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete(
  '/:id',
  authenticateToken,
  requireRole(['admin']),
  errorHandler.expressAsyncWrapper(async (req, res) => {
    const { id } = req.params;

    // Validate MongoDB ObjectId format
    if (!id || id.length !== 24) {
      throw new ValidationError(
        'Invalid user ID format',
        ErrorCode.INVALID_INPUT,
        {
          operation: 'delete_user',
          additionalData: { providedId: id },
        },
        ['Please provide a valid 24-character MongoDB ObjectId']
      );
    }

    // Check if user exists before deletion
    const existingUser = await userRepository.findById(id);
    if (!existingUser) {
      throw new NotFoundError('User not found', ErrorCode.USER_NOT_FOUND, {
        operation: 'delete_user',
        additionalData: { userId: id },
      });
    }

    // Perform soft delete (deactivate user) instead of hard delete
    const deactivatedUser = await userRepository.update(id, {
      isActive: false,
    });

    if (!deactivatedUser) {
      throw new BusinessLogicError(
        'Failed to deactivate user',
        ErrorCode.BUSINESS_RULE_VIOLATION,
        {
          operation: 'delete_user',
          additionalData: { userId: id, reason: 'deactivation_failed' },
        },
        ['Try again later', 'Contact system administrator if problem persists']
      );
    }

    ResponseHelper.success(res, { id, isActive: false }, 'User deactivated successfully');
  })
);

export default router;
