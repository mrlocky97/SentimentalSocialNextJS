/**
 * Authentication Routes with Swagger Documentation
 * API routes for user authentication and authorization
 */

import { Router } from 'express';
import { AuthService, RegisterRequest, LoginRequest } from '../services/auth.service';
import { authenticateToken, AuthenticatedRequest } from '../middleware/express-auth';

const router = Router();
const authService = new AuthService();

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User authentication and authorization endpoints
 */

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Register a new user
 *     description: Create a new user account in the system
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - displayName
 *               - username
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *                 example: "john.doe@example.com"
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 description: User's password (minimum 8 characters)
 *                 example: "SecurePassword123!"
 *               fullName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 description: User's full name
 *                 example: "John Doe"
 *               company:
 *                 type: string
 *                 maxLength: 100
 *                 description: User's company name
 *                 example: "Acme Corporation"
 *               role:
 *                 type: string
 *                 enum: [viewer, analyst, manager, admin]
 *                 default: analyst
 *                 description: User's role in the system
 *               acceptTerms:
 *                 type: boolean
 *                 description: User accepts terms and conditions
 *                 example: true
 *           examples:
 *             analyst_user:
 *               summary: Analyst user registration
 *               value:
 *                 email: "analyst@company.com"
 *                 password: "AnalystPass123!"
 *                 fullName: "Jane Smith"
 *                 company: "Marketing Analytics Co"
 *                 role: "analyst"
 *                 acceptTerms: true
 *             manager_user:
 *               summary: Manager user registration
 *               value:
 *                 email: "manager@company.com"
 *                 password: "ManagerPass123!"
 *                 fullName: "Robert Johnson"
 *                 company: "Enterprise Solutions"
 *                 role: "manager"
 *                 acceptTerms: true
 *     responses:
 *       201:
 *         description: User registered successfully
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
 *                       allOf:
 *                         - $ref: '#/components/schemas/User'
 *                         - type: object
 *                           properties:
 *                             password:
 *                               description: Password is excluded from response
 *                     accessToken:
 *                       type: string
 *                       description: JWT access token
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                     refreshToken:
 *                       type: string
 *                       description: JWT refresh token
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                     expiresIn:
 *                       type: integer
 *                       description: Token expiration time in seconds
 *                       example: 3600
 *                 message:
 *                   type: string
 *                   example: "User registered successfully"
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
 *                   success: false
 *                   error:
 *                     message: "Validation failed"
 *                     details:
 *                       - field: "email"
 *                         message: "Invalid email format"
 *                       - field: "password"
 *                         message: "Password must be at least 8 characters"
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
 *                   success: false
 *                   error:
 *                     message: "User with this email already exists"
 *                     code: "USER_ALREADY_EXISTS"
 */
router.post('/register', async (req, res) => {
    try {
        // Validate request body
        const { email, password, displayName, username, role }: RegisterRequest = req.body;

        if (!email || !password || !displayName || !username) {
            return res.status(400).json({
                success: false,
                error: {
                    message: 'Missing required fields',
                    code: 'MISSING_REQUIRED_FIELDS',
                    details: {
                        required: ['email', 'password', 'displayName', 'username'],
                        provided: Object.keys(req.body),
                    },
                    timestamp: new Date().toISOString(),
                },
            });
        }

        // Validate email format
        if (!authService.validateEmail(email)) {
            return res.status(400).json({
                success: false,
                error: {
                    message: 'Invalid email format',
                    code: 'INVALID_EMAIL_FORMAT',
                    timestamp: new Date().toISOString(),
                },
            });
        }

        // Validate password strength
        const passwordValidation = authService.validatePassword(password);
        if (!passwordValidation.isValid) {
            return res.status(400).json({
                success: false,
                error: {
                    message: 'Password does not meet requirements',
                    code: 'WEAK_PASSWORD',
                    details: passwordValidation.errors,
                    timestamp: new Date().toISOString(),
                },
            });
        }

        // Register user
        const result = await authService.register({
            email,
            password,
            displayName,
            username,
            role,
        });

        res.status(201).json({
            success: true,
            data: result,
            message: 'User registered successfully',
        });
    } catch (error) {
        console.error('Registration error:', error);

        if (error instanceof Error) {
            if (error.message === 'User with this email already exists') {
                return res.status(409).json({
                    success: false,
                    error: {
                        message: error.message,
                        code: 'USER_ALREADY_EXISTS',
                        timestamp: new Date().toISOString(),
                    },
                });
            }

            if (error.message === 'EMAIL_OR_USERNAME_EXISTS') {
                return res.status(409).json({
                    success: false,
                    error: {
                        message: 'Email or username already exists',
                        code: 'EMAIL_OR_USERNAME_EXISTS',
                        timestamp: new Date().toISOString(),
                    },
                });
            }
        }

        res.status(500).json({
            success: false,
            error: {
                message: 'Internal server error during registration',
                code: 'REGISTRATION_ERROR',
                timestamp: new Date().toISOString(),
            },
        });
    }
});

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: User login
 *     description: Authenticate user and return access tokens
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *                 example: "john.doe@example.com"
 *               password:
 *                 type: string
 *                 description: User's password
 *                 example: "SecurePassword123!"
 *               rememberMe:
 *                 type: boolean
 *                 default: false
 *                 description: Extended session duration
 *           examples:
 *             standard_login:
 *               summary: Standard login
 *               value:
 *                 email: "analyst@company.com"
 *                 password: "AnalystPass123!"
 *                 rememberMe: false
 *             extended_login:
 *               summary: Extended session login
 *               value:
 *                 email: "manager@company.com"
 *                 password: "ManagerPass123!"
 *                 rememberMe: true
 *     responses:
 *       200:
 *         description: Login successful
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
 *                       allOf:
 *                         - $ref: '#/components/schemas/User'
 *                         - type: object
 *                           properties:
 *                             password:
 *                               description: Password is excluded from response
 *                     accessToken:
 *                       type: string
 *                       description: JWT access token
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                     refreshToken:
 *                       type: string
 *                       description: JWT refresh token
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                     expiresIn:
 *                       type: integer
 *                       description: Token expiration time in seconds
 *                       example: 3600
 *                     lastLogin:
 *                       type: string
 *                       format: date-time
 *                       description: Previous login timestamp
 *                       example: "2024-01-14T08:30:00Z"
 *                 message:
 *                   type: string
 *                   example: "Login successful"
 *       401:
 *         description: Unauthorized - invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               invalid_credentials:
 *                 summary: Invalid credentials
 *                 value:
 *                   success: false
 *                   error:
 *                     message: "Invalid email or password"
 *                     code: "INVALID_CREDENTIALS"
 *               account_locked:
 *                 summary: Account locked
 *                 value:
 *                   success: false
 *                   error:
 *                     message: "Account locked due to multiple failed login attempts"
 *                     code: "ACCOUNT_LOCKED"
 *                     details:
 *                       unlockAt: "2024-01-15T11:30:00Z"
 *       400:
 *         description: Bad request - validation errors
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/login', async (req, res) => {
    try {
        // Validate request body
        const { email, password, rememberMe }: LoginRequest = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: {
                    message: 'Email and password are required',
                    code: 'MISSING_CREDENTIALS',
                    timestamp: new Date().toISOString(),
                },
            });
        }

        // Attempt login
        const result = await authService.login({
            email,
            password,
            rememberMe,
        });

        res.json({
            success: true,
            data: result,
            message: 'Login successful',
        });
    } catch (error) {
        console.error('Login error:', error);

        if (error instanceof Error) {
            if (error.message === 'Invalid email or password') {
                return res.status(401).json({
                    success: false,
                    error: {
                        message: error.message,
                        code: 'INVALID_CREDENTIALS',
                        timestamp: new Date().toISOString(),
                    },
                });
            }

            if (error.message === 'Account is deactivated. Please contact support.') {
                return res.status(401).json({
                    success: false,
                    error: {
                        message: error.message,
                        code: 'ACCOUNT_DEACTIVATED',
                        timestamp: new Date().toISOString(),
                    },
                });
            }
        }

        res.status(500).json({
            success: false,
            error: {
                message: 'Internal server error during login',
                code: 'LOGIN_ERROR',
                timestamp: new Date().toISOString(),
            },
        });
    }
});

/**
 * @swagger
 * /api/v1/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     description: Generate a new access token using refresh token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Valid refresh token
 *                 example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *     responses:
 *       200:
 *         description: Token refreshed successfully
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
 *                     accessToken:
 *                       type: string
 *                       description: New JWT access token
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                     refreshToken:
 *                       type: string
 *                       description: New JWT refresh token (optional)
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                     expiresIn:
 *                       type: integer
 *                       description: Token expiration time in seconds
 *                       example: 3600
 *                 message:
 *                   type: string
 *                   example: "Token refreshed successfully"
 *       401:
 *         description: Unauthorized - invalid or expired refresh token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               invalid_refresh_token:
 *                 summary: Invalid refresh token
 *                 value:
 *                   success: false
 *                   error:
 *                     message: "Invalid or expired refresh token"
 *                     code: "INVALID_REFRESH_TOKEN"
 */
router.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({
                success: false,
                error: {
                    message: 'Refresh token is required',
                    code: 'MISSING_REFRESH_TOKEN',
                    timestamp: new Date().toISOString(),
                },
            });
        }

        const result = await authService.refreshToken(refreshToken);

        res.json({
            success: true,
            data: result,
            message: 'Token refreshed successfully',
        });
    } catch (error) {
        console.error('Token refresh error:', error);

        res.status(401).json({
            success: false,
            error: {
                message: 'Invalid or expired refresh token',
                code: 'INVALID_REFRESH_TOKEN',
                timestamp: new Date().toISOString(),
            },
        });
    }
});

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: User logout
 *     description: Invalidate user session and tokens
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Refresh token to invalidate (optional)
 *                 example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *               logoutAllDevices:
 *                 type: boolean
 *                 default: false
 *                 description: Logout from all devices
 *     responses:
 *       200:
 *         description: Logout successful
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
 *                   example: "Logout successful"
 *                 data:
 *                   type: object
 *                   properties:
 *                     loggedOutAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-01-15T10:30:00Z"
 *                     tokensInvalidated:
 *                       type: integer
 *                       description: Number of tokens invalidated
 *                       example: 1
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/logout', authenticateToken, (req: AuthenticatedRequest, res) => {
    try {
        // In a real implementation, you would:
        // 1. Add the token to a blacklist
        // 2. Invalidate refresh tokens
        // 3. Log the logout event

        res.json({
            success: true,
            data: {
                loggedOutAt: new Date().toISOString(),
                tokensInvalidated: 1,
            },
            message: 'Logout successful',
        });
    } catch (error) {
        console.error('Logout error:', error);

        res.status(500).json({
            success: false,
            error: {
                message: 'Error during logout',
                code: 'LOGOUT_ERROR',
                timestamp: new Date().toISOString(),
            },
        });
    }
});

/**
 * @swagger
 * /api/v1/auth/forgot-password:
 *   post:
 *     summary: Request password reset
 *     description: Send password reset email to user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *                 example: "john.doe@example.com"
 *     responses:
 *       200:
 *         description: Password reset email sent (always returns success for security)
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
 *                   example: "If an account with this email exists, a password reset link has been sent"
 *                 data:
 *                   type: object
 *                   properties:
 *                     requestedAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-01-15T10:30:00Z"
 *       400:
 *         description: Bad request - validation errors
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Too many requests - rate limited
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               rate_limited:
 *                 summary: Rate limited
 *                 value:
 *                   success: false
 *                   error:
 *                     message: "Too many password reset requests. Please try again later"
 *                     code: "RATE_LIMITED"
 *                     details:
 *                       retryAfter: 300
 */
router.post('/forgot-password', (req, res) => {
    res.json({ message: 'Forgot password endpoint - not implemented yet' });
});

/**
 * @swagger
 * /api/v1/auth/reset-password:
 *   post:
 *     summary: Reset password
 *     description: Reset user password using reset token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newPassword
 *             properties:
 *               token:
 *                 type: string
 *                 description: Password reset token from email
 *                 example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *                 description: New password (minimum 8 characters)
 *                 example: "NewSecurePassword123!"
 *               confirmPassword:
 *                 type: string
 *                 description: Confirm new password (must match newPassword)
 *                 example: "NewSecurePassword123!"
 *     responses:
 *       200:
 *         description: Password reset successful
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
 *                   example: "Password reset successful"
 *                 data:
 *                   type: object
 *                   properties:
 *                     resetAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-01-15T10:30:00Z"
 *                     requiresLogin:
 *                       type: boolean
 *                       example: true
 *       400:
 *         description: Bad request - validation errors or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               invalid_token:
 *                 summary: Invalid or expired token
 *                 value:
 *                   success: false
 *                   error:
 *                     message: "Invalid or expired password reset token"
 *                     code: "INVALID_RESET_TOKEN"
 *               password_mismatch:
 *                 summary: Password confirmation mismatch
 *                 value:
 *                   success: false
 *                   error:
 *                     message: "Password confirmation does not match"
 *                     code: "PASSWORD_MISMATCH"
 */
router.post('/reset-password', (req, res) => {
    res.json({ message: 'Reset password endpoint - not implemented yet' });
});

/**
 * @swagger
 * /api/v1/auth/change-password:
 *   post:
 *     summary: Change password
 *     description: Change user password (requires authentication)
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 description: Current password
 *                 example: "CurrentPassword123!"
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *                 description: New password (minimum 8 characters)
 *                 example: "NewSecurePassword123!"
 *               confirmPassword:
 *                 type: string
 *                 description: Confirm new password (must match newPassword)
 *                 example: "NewSecurePassword123!"
 *     responses:
 *       200:
 *         description: Password changed successfully
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
 *                   example: "Password changed successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     changedAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-01-15T10:30:00Z"
 *                     requiresReauth:
 *                       type: boolean
 *                       description: Whether re-authentication is required
 *                       example: false
 *       400:
 *         description: Bad request - validation errors
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - invalid current password
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               invalid_current_password:
 *                 summary: Invalid current password
 *                 value:
 *                   success: false
 *                   error:
 *                     message: "Current password is incorrect"
 *                     code: "INVALID_CURRENT_PASSWORD"
 */
router.post('/change-password', (req, res) => {
    res.json({ message: 'Change password endpoint - not implemented yet' });
});

/**
 * @swagger
 * /api/v1/auth/verify-token:
 *   post:
 *     summary: Verify access token
 *     description: Verify if an access token is valid and return user info
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token is valid
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
 *                     valid:
 *                       type: boolean
 *                       example: true
 *                     user:
 *                       allOf:
 *                         - $ref: '#/components/schemas/User'
 *                         - type: object
 *                           properties:
 *                             password:
 *                               description: Password is excluded from response
 *                     tokenInfo:
 *                       type: object
 *                       properties:
 *                         issuedAt:
 *                           type: string
 *                           format: date-time
 *                           example: "2024-01-15T09:30:00Z"
 *                         expiresAt:
 *                           type: string
 *                           format: date-time
 *                           example: "2024-01-15T10:30:00Z"
 *                         remainingTime:
 *                           type: integer
 *                           description: Remaining time in seconds
 *                           example: 2400
 *                 message:
 *                   type: string
 *                   example: "Token is valid"
 *       401:
 *         description: Unauthorized - invalid or expired token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               invalid_token:
 *                 summary: Invalid token
 *                 value:
 *                   success: false
 *                   error:
 *                     message: "Invalid or expired access token"
 *                     code: "INVALID_ACCESS_TOKEN"
 */
router.post('/verify-token', authenticateToken, (req: AuthenticatedRequest, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: {
                    message: 'Invalid access token',
                    code: 'INVALID_ACCESS_TOKEN',
                    timestamp: new Date().toISOString(),
                },
            });
        }

        res.json({
            success: true,
            data: {
                valid: true,
                user: req.user,
                tokenInfo: {
                    issuedAt: new Date().toISOString(),
                    // In a real implementation, you would get this from the JWT payload
                    expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
                    remainingTime: 3600, // 1 hour in seconds
                },
            },
            message: 'Token is valid',
        });
    } catch (error) {
        console.error('Token verification error:', error);

        res.status(401).json({
            success: false,
            error: {
                message: 'Invalid or expired access token',
                code: 'INVALID_ACCESS_TOKEN',
                timestamp: new Date().toISOString(),
            },
        });
    }
});

export default router;
