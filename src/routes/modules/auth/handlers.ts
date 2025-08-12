/**
 * Auth Handlers Module
 * Separated route handlers for authentication endpoints
 */

import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import {
  AuthenticationError,
  BusinessLogicError,
  ErrorCode,
  ResponseHelper,
  ValidationError,
} from '../../../core/errors';
import { tokenBlacklistService } from '../../../lib/security/token-blacklist';
import { AuthenticatedRequest } from '../../../middleware/express-auth';
import { AuthService } from '../../../services/auth.service';
import { LoginRequest, RegisterRequest } from '../../../types/auth';

const authService = new AuthService();

/**
 * Register new user handler
 */
export const registerHandler = async (req: Request, res: Response) => {
  try {
    const registerData: RegisterRequest = req.body;

    // Basic validation
    if (
      !registerData.email ||
      !registerData.password ||
      !registerData.displayName ||
      !registerData.username
    ) {
      throw new ValidationError('Missing required fields', ErrorCode.INVALID_INPUT);
    }

    if (registerData.password.length < 8) {
      throw new ValidationError(
        'Password must be at least 8 characters long',
        ErrorCode.INVALID_INPUT
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(registerData.email)) {
      throw new ValidationError('Invalid email format', ErrorCode.INVALID_INPUT);
    }

    const result = await authService.register(registerData);

    ResponseHelper.success(res, {
      message: 'User registered successfully',
      user: {
        id: result.user.id,
        email: result.user.email,
        displayName: result.user.displayName,
        username: result.user.username,
      },
      token: result.accessToken,
    });
  } catch (error) {
    if (error instanceof ValidationError || error instanceof BusinessLogicError) {
      const response = {
        success: false,
        error: {
          code: error.metadata.code,
          message: error.message,
          category: error.metadata.category,
          severity: error.metadata.severity,
          timestamp: error.timestamp.toISOString(),
        },
      };
      res.status(400).json(response);
    } else {
      console.error('Registration error:', error);
      const response = {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Internal server error during registration',
          timestamp: new Date().toISOString(),
        },
      };
      res.status(500).json(response);
    }
  }
};

/**
 * Login user handler
 */
export const loginHandler = async (req: Request, res: Response) => {
  try {
    const loginData: LoginRequest = req.body;

    if (!loginData.email || !loginData.password) {
      throw new ValidationError('Email and password are required', ErrorCode.INVALID_INPUT);
    }

    const result = await authService.login(loginData);

    ResponseHelper.success(res, {
      message: 'Login successful',
      user: {
        id: result.user.id,
        email: result.user.email,
        displayName: result.user.displayName,
        username: result.user.username,
      },
      token: result.accessToken,
    });
  } catch (error) {
    if (error instanceof AuthenticationError || error instanceof ValidationError) {
      const response = {
        success: false,
        error: {
          code: error.metadata.code,
          message: error.message,
          category: error.metadata.category,
          severity: error.metadata.severity,
          timestamp: error.timestamp.toISOString(),
        },
      };
      res.status(401).json(response);
    } else {
      console.error('Login error:', error);
      const response = {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Internal server error during login',
          timestamp: new Date().toISOString(),
        },
      };
      res.status(500).json(response);
    }
  }
};

/**
 * Refresh token handler
 */
export const refreshTokenHandler = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new ValidationError('Refresh token is required', ErrorCode.INVALID_TOKEN);
    }

    // Verify refresh token
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret'
    ) as any;

    // Check if token is blacklisted
    if (tokenBlacklistService.isTokenBlacklisted(refreshToken)) {
      throw new AuthenticationError('Invalid refresh token', ErrorCode.INVALID_TOKEN);
    }

    // Generate new access token
    const newAccessToken = jwt.sign(
      { userId: decoded.userId, email: decoded.email },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '15m' }
    );

    ResponseHelper.success(res, {
      message: 'Token refreshed successfully',
      token: newAccessToken,
    });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      const response = {
        success: false,
        error: {
          code: ErrorCode.INVALID_TOKEN,
          message: 'Invalid refresh token',
          timestamp: new Date().toISOString(),
        },
      };
      res.status(401).json(response);
    } else if (error instanceof ValidationError || error instanceof AuthenticationError) {
      const response = {
        success: false,
        error: {
          code: error.metadata.code,
          message: error.message,
          category: error.metadata.category,
          severity: error.metadata.severity,
          timestamp: error.timestamp.toISOString(),
        },
      };
      res.status(401).json(response);
    } else {
      console.error('Token refresh error:', error);
      const response = {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Internal server error during token refresh',
          timestamp: new Date().toISOString(),
        },
      };
      res.status(500).json(response);
    }
  }
};

/**
 * Logout handler
 */
export const logoutHandler = (req: AuthenticatedRequest, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (token) {
      // Extract expiration from token for blacklist
      try {
        const decoded = jwt.decode(token) as any;
        const expiresAt = decoded?.exp
          ? new Date(decoded.exp * 1000)
          : new Date(Date.now() + 15 * 60 * 1000);
        tokenBlacklistService.blacklistToken(token, decoded?.userId || 'unknown', expiresAt);
      } catch {
        // If decode fails, blacklist for 15 minutes as fallback
        tokenBlacklistService.blacklistToken(
          token,
          'unknown',
          new Date(Date.now() + 15 * 60 * 1000)
        );
      }
    }

    ResponseHelper.success(res, {
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    const response = {
      success: false,
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message: 'Internal server error during logout',
        timestamp: new Date().toISOString(),
      },
    };
    res.status(500).json(response);
  }
};

/**
 * Forgot password handler
 */
export const forgotPasswordHandler = (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      throw new ValidationError('Email is required', ErrorCode.INVALID_INPUT);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new ValidationError('Invalid email format', ErrorCode.INVALID_INPUT);
    }

    // TODO: Implement actual password reset logic
    // For now, return success regardless to prevent email enumeration
    ResponseHelper.success(res, {
      message: 'If an account with that email exists, a password reset link has been sent.',
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      const response = {
        success: false,
        error: {
          code: error.metadata.code,
          message: error.message,
          category: error.metadata.category,
          severity: error.metadata.severity,
          timestamp: error.timestamp.toISOString(),
        },
      };
      res.status(400).json(response);
    } else {
      console.error('Forgot password error:', error);
      const response = {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Internal server error',
          timestamp: new Date().toISOString(),
        },
      };
      res.status(500).json(response);
    }
  }
};

/**
 * Reset password handler
 */
export const resetPasswordHandler = (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      throw new ValidationError('Token and new password are required', ErrorCode.INVALID_INPUT);
    }

    if (newPassword.length < 8) {
      throw new ValidationError(
        'Password must be at least 8 characters long',
        ErrorCode.INVALID_INPUT
      );
    }

    // TODO: Implement actual password reset logic
    ResponseHelper.success(res, {
      message: 'Password reset successfully',
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      const response = {
        success: false,
        error: {
          code: error.metadata.code,
          message: error.message,
          category: error.metadata.category,
          severity: error.metadata.severity,
          timestamp: error.timestamp.toISOString(),
        },
      };
      res.status(400).json(response);
    } else {
      console.error('Reset password error:', error);
      const response = {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Internal server error',
          timestamp: new Date().toISOString(),
        },
      };
      res.status(500).json(response);
    }
  }
};

/**
 * Change password handler
 */
export const changePasswordHandler = (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new ValidationError(
        'Current password and new password are required',
        ErrorCode.INVALID_INPUT
      );
    }

    if (newPassword.length < 8) {
      throw new ValidationError(
        'New password must be at least 8 characters long',
        ErrorCode.INVALID_INPUT
      );
    }

    // TODO: Implement actual password change logic
    ResponseHelper.success(res, {
      message: 'Password changed successfully',
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      const response = {
        success: false,
        error: {
          code: error.metadata.code,
          message: error.message,
          category: error.metadata.category,
          severity: error.metadata.severity,
          timestamp: error.timestamp.toISOString(),
        },
      };
      res.status(400).json(response);
    } else {
      console.error('Change password error:', error);
      const response = {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Internal server error',
          timestamp: new Date().toISOString(),
        },
      };
      res.status(500).json(response);
    }
  }
};

/**
 * Verify email handler
 */
export const verifyEmailHandler = (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      throw new ValidationError('Verification token is required', ErrorCode.INVALID_TOKEN);
    }

    // TODO: Implement actual email verification logic
    ResponseHelper.success(res, {
      message: 'Email verified successfully',
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      const response = {
        success: false,
        error: {
          code: error.metadata.code,
          message: error.message,
          category: error.metadata.category,
          severity: error.metadata.severity,
          timestamp: error.timestamp.toISOString(),
        },
      };
      res.status(400).json(response);
    } else {
      console.error('Email verification error:', error);
      const response = {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Internal server error',
          timestamp: new Date().toISOString(),
        },
      };
      res.status(500).json(response);
    }
  }
};
