/**
 * User Routes with Swagger Documentation
 * API routes for user management with comprehensive documentation
 */

import { Router } from 'express';
import { MongoUserRepository } from '../repositories/mongo-user.repository';
import { authenticateToken, requireRole } from '../middleware/express-auth';
import { CreateUserRequest, UpdateUserRequest, UserRole } from '../types/user';

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
router.get('/', authenticateToken, requireRole(['admin', 'manager']), async (req, res) => {
    try {
        const { page = 1, limit = 20, role, organizationId, isActive } = req.query;

        // Build filter object with proper typing
        interface UserFilter {
            role?: UserRole;
            organizationId?: string;
            isActive?: boolean;
        }

        const filter: UserFilter = {};
        if (role) filter.role = role as UserRole;
        if (organizationId) filter.organizationId = organizationId as string;
        if (isActive !== undefined) filter.isActive = isActive === 'true';

        // Convert pagination params
        const pageNum = parseInt(page as string);
        const limitNum = parseInt(limit as string);
        const offset = (pageNum - 1) * limitNum;

        // Get users with pagination
        const users = await userRepository.findMany(filter, {
            offset,
            limit: limitNum,
            sortBy: 'createdAt',
            sortOrder: 'desc'
        });

        // Get total count for pagination
        const total = await userRepository.count(filter);
        const totalPages = Math.ceil(total / limitNum);

        res.json({
            success: true,
            data: users,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages,
                hasNext: pageNum < totalPages,
                hasPrev: pageNum > 1
            }
        });
    } catch (error: unknown) {
        console.error('Error fetching users:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Failed to fetch users',
                code: 'FETCH_USERS_ERROR',
                timestamp: new Date().toISOString()
            }
        });
    }
});

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
router.post('/', authenticateToken, requireRole(['admin']), async (req, res) => {
    try {
        const userData: CreateUserRequest = req.body;

        // Validate required fields
        if (!userData.email || !userData.password || !userData.displayName || !userData.username) {
            return res.status(400).json({
                success: false,
                error: {
                    message: 'Missing required fields',
                    code: 'MISSING_REQUIRED_FIELDS',
                    details: {
                        required: ['email', 'password', 'displayName', 'username'],
                        provided: Object.keys(req.body)
                    },
                    timestamp: new Date().toISOString()
                }
            });
        }

        // Create user
        const newUser = await userRepository.create(userData);

        res.status(201).json({
            success: true,
            data: newUser,
            message: 'User created successfully'
        });
    } catch (error: unknown) {
        console.error('Error creating user:', error);

        if (error instanceof Error && error.message === 'EMAIL_OR_USERNAME_EXISTS') {
            return res.status(409).json({
                success: false,
                error: {
                    message: 'Email or username already exists',
                    code: 'EMAIL_OR_USERNAME_EXISTS',
                    timestamp: new Date().toISOString()
                }
            });
        }

        res.status(500).json({
            success: false,
            error: {
                message: 'Failed to create user',
                code: 'CREATE_USER_ERROR',
                timestamp: new Date().toISOString()
            }
        });
    }
});

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
router.get('/:id', authenticateToken, requireRole(['admin', 'manager']), async (req, res) => {
    try {
        const { id } = req.params;

        // Validate MongoDB ObjectId format (basic validation)
        if (!id || id.length !== 24) {
            return res.status(400).json({
                success: false,
                error: {
                    message: 'Invalid user ID format',
                    code: 'INVALID_USER_ID',
                    timestamp: new Date().toISOString()
                }
            });
        }

        const user = await userRepository.findById(id);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: {
                    message: 'User not found',
                    code: 'USER_NOT_FOUND',
                    timestamp: new Date().toISOString()
                }
            });
        }

        res.json({
            success: true,
            data: user
        });
    } catch (error: unknown) {
        console.error('Error fetching user:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Failed to fetch user',
                code: 'FETCH_USER_ERROR',
                timestamp: new Date().toISOString()
            }
        });
    }
});

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
router.put('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
    try {
        const { id } = req.params;
        const updateData: UpdateUserRequest = req.body;

        // Validate MongoDB ObjectId format
        if (!id || id.length !== 24) {
            return res.status(400).json({
                success: false,
                error: {
                    message: 'Invalid user ID format',
                    code: 'INVALID_USER_ID',
                    timestamp: new Date().toISOString()
                }
            });
        }

        // Remove password from update data (should use separate endpoint for password changes)
        if ('password' in updateData) {
            delete updateData.password;
        }

        // Update user
        const updatedUser = await userRepository.update(id, updateData);

        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                error: {
                    message: 'User not found',
                    code: 'USER_NOT_FOUND',
                    timestamp: new Date().toISOString()
                }
            });
        }

        res.json({
            success: true,
            data: updatedUser,
            message: 'User updated successfully'
        });
    } catch (error: unknown) {
        console.error('Error updating user:', error);

        if (error instanceof Error && error.message === 'EMAIL_OR_USERNAME_EXISTS') {
            return res.status(409).json({
                success: false,
                error: {
                    message: 'Email or username already exists',
                    code: 'EMAIL_OR_USERNAME_EXISTS',
                    timestamp: new Date().toISOString()
                }
            });
        }

        res.status(500).json({
            success: false,
            error: {
                message: 'Failed to update user',
                code: 'UPDATE_USER_ERROR',
                timestamp: new Date().toISOString()
            }
        });
    }
});

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
router.delete('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
    try {
        const { id } = req.params;

        // Validate MongoDB ObjectId format
        if (!id || id.length !== 24) {
            return res.status(400).json({
                success: false,
                error: {
                    message: 'Invalid user ID format',
                    code: 'INVALID_USER_ID',
                    timestamp: new Date().toISOString()
                }
            });
        }

        // Check if user exists before deletion
        const existingUser = await userRepository.findById(id);
        if (!existingUser) {
            return res.status(404).json({
                success: false,
                error: {
                    message: 'User not found',
                    code: 'USER_NOT_FOUND',
                    timestamp: new Date().toISOString()
                }
            });
        }

        // Perform soft delete (deactivate user) instead of hard delete
        const deactivatedUser = await userRepository.update(id, {
            isActive: false
        });

        if (!deactivatedUser) {
            return res.status(500).json({
                success: false,
                error: {
                    message: 'Failed to deactivate user',
                    code: 'DEACTIVATE_USER_ERROR',
                    timestamp: new Date().toISOString()
                }
            });
        }

        res.json({
            success: true,
            message: 'User deactivated successfully',
            data: { id, isActive: false }
        });
    } catch (error: unknown) {
        console.error('Error deleting user:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Failed to delete user',
                code: 'DELETE_USER_ERROR',
                timestamp: new Date().toISOString()
            }
        });
    }
});

export default router;
