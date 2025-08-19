/**
 * Auth Routes Module
 * Modular authentication routes with separated handlers and middleware
 */

import { Router } from "express";
import { authenticateToken } from "../../../middleware/express-auth";
import {
  changePasswordHandler,
  forgotPasswordHandler,
  loginHandler,
  logoutHandler,
  refreshTokenHandler,
  registerHandler,
  resetPasswordHandler,
  verifyEmailHandler,
} from "./handlers";
import {
  authRateLimit,
  logAuthRequest,
  setAuthSecurityHeaders,
  validateLoginRequest,
  validatePasswordChangeRequest,
  validatePasswordResetRequest,
  validateRefreshTokenRequest,
  validateRegisterRequest,
} from "./middleware";

const router = Router();

// Apply security headers to all auth routes
router.use(setAuthSecurityHeaders);

// Apply request logging to all auth routes
router.use(logAuthRequest);

/**
 * @swagger
 * components:
 *   schemas:
 *     RegisterRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *         - displayName
 *         - username
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: user@example.com
 *         password:
 *           type: string
 *           minLength: 8
 *           example: SecurePassword123
 *         displayName:
 *           type: string
 *           minLength: 2
 *           maxLength: 50
 *           example: John Doe
 *         username:
 *           type: string
 *           minLength: 3
 *           maxLength: 20
 *           pattern: '^[a-zA-Z0-9_]+$'
 *           example: johndoe
 *         role:
 *           type: string
 *           enum: [USER, ADMIN]
 *           example: USER
 *
 *     LoginRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: user@example.com
 *         password:
 *           type: string
 *           example: SecurePassword123
 *         rememberMe:
 *           type: boolean
 *           example: false
 *
 *     AuthResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           properties:
 *             message:
 *               type: string
 *               example: Login successful
 *             user:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   example: 60f7b3b3b3b3b3b3b3b3b3b3
 *                 email:
 *                   type: string
 *                   example: user@example.com
 *                 displayName:
 *                   type: string
 *                   example: John Doe
 *                 username:
 *                   type: string
 *                   example: johndoe
 *             token:
 *               type: string
 *               example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 */

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       200:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Validation error
 *       409:
 *         description: User already exists
 *       429:
 *         description: Too many registration attempts
 *       500:
 *         description: Internal server error
 */
router.post(
  "/register",
  authRateLimit(3, 15 * 60 * 1000), // 3 attempts per 15 minutes
  validateRegisterRequest,
  registerHandler,
);

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Invalid credentials
 *       429:
 *         description: Too many login attempts
 *       500:
 *         description: Internal server error
 */
router.post(
  "/login",
  authRateLimit(5, 15 * 60 * 1000), // 5 attempts per 15 minutes
  validateLoginRequest,
  loginHandler,
);

/**
 * @swagger
 * /api/v1/auth/refresh:
 *   post:
 *     summary: Refresh access token
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
 *                 example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
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
 *                     message:
 *                       type: string
 *                       example: Token refreshed successfully
 *                     token:
 *                       type: string
 *                       example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *       401:
 *         description: Invalid refresh token
 *       429:
 *         description: Too many refresh attempts
 *       500:
 *         description: Internal server error
 */
router.post(
  "/refresh",
  authRateLimit(10, 15 * 60 * 1000), // 10 attempts per 15 minutes
  validateRefreshTokenRequest,
  refreshTokenHandler,
);

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
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
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: Logged out successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post("/logout", authenticateToken, logoutHandler);

/**
 * @swagger
 * /api/v1/auth/forgot-password:
 *   post:
 *     summary: Request password reset
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
 *                 example: user@example.com
 *     responses:
 *       200:
 *         description: Password reset email sent (or would be sent)
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
 *                     message:
 *                       type: string
 *                       example: If an account with that email exists, a password reset link has been sent.
 *       400:
 *         description: Validation error
 *       429:
 *         description: Too many password reset attempts
 *       500:
 *         description: Internal server error
 */
router.post(
  "/forgot-password",
  authRateLimit(3, 60 * 60 * 1000), // 3 attempts per hour
  forgotPasswordHandler,
);

/**
 * @swagger
 * /api/v1/auth/reset-password:
 *   post:
 *     summary: Reset password with token
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
 *                 example: reset-token-here
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *                 example: NewSecurePassword123
 *     responses:
 *       200:
 *         description: Password reset successfully
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
 *                     message:
 *                       type: string
 *                       example: Password reset successfully
 *       400:
 *         description: Validation error or invalid token
 *       429:
 *         description: Too many reset attempts
 *       500:
 *         description: Internal server error
 */
router.post(
  "/reset-password",
  authRateLimit(5, 60 * 60 * 1000), // 5 attempts per hour
  validatePasswordResetRequest,
  resetPasswordHandler,
);

/**
 * @swagger
 * /api/v1/auth/change-password:
 *   post:
 *     summary: Change user password
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
 *                 example: CurrentPassword123
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *                 example: NewSecurePassword123
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
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: Password changed successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Invalid current password or unauthorized
 *       429:
 *         description: Too many password change attempts
 *       500:
 *         description: Internal server error
 */
router.post(
  "/change-password",
  authenticateToken,
  authRateLimit(5, 60 * 60 * 1000), // 5 attempts per hour
  validatePasswordChangeRequest,
  changePasswordHandler,
);

/**
 * @swagger
 * /api/v1/auth/verify-email:
 *   post:
 *     summary: Verify user email
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 example: verification-token-here
 *     responses:
 *       200:
 *         description: Email verified successfully
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
 *                     message:
 *                       type: string
 *                       example: Email verified successfully
 *       400:
 *         description: Invalid verification token
 *       429:
 *         description: Too many verification attempts
 *       500:
 *         description: Internal server error
 */
router.post(
  "/verify-email",
  authRateLimit(10, 60 * 60 * 1000), // 10 attempts per hour
  verifyEmailHandler,
);

export default router;
