/**
 * Auth Handlers Module
 * Separated route handlers for authentication endpoints
 */

import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import {
  AuthenticationError,
  BusinessLogicError,
  ErrorCode,
  ResponseHelper,
  ValidationError,
} from "../../../core/errors";
import { tokenBlacklistService } from "../../../lib/security/token-blacklist";
import {
  AuthenticatedRequest,
  verifyRefreshToken,
  generateToken,
} from "../../../middleware/express-auth";
import { AuthService } from "../../../services/auth.service";
import { LoginRequest, RegisterRequest } from "../../../types/auth";

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
      throw new ValidationError(
        "Missing required fields",
        ErrorCode.INVALID_INPUT,
      );
    }

    if (registerData.password.length < 8) {
      throw new ValidationError(
        "Password must be at least 8 characters long",
        ErrorCode.INVALID_INPUT,
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(registerData.email)) {
      throw new ValidationError(
        "Invalid email format",
        ErrorCode.INVALID_INPUT,
      );
    }

    const result = await authService.register(registerData);

    ResponseHelper.success(res, {
      message: "User registered successfully",
      user: {
        id: result.user.id,
        email: result.user.email,
        displayName: result.user.displayName,
        username: result.user.username,
      },
      token: result.accessToken,
      refreshToken: (result as any).refreshToken,
    });
  } catch (error) {
    if (
      error instanceof ValidationError ||
      error instanceof BusinessLogicError
    ) {
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
      console.error("Registration error:", error);
      const response = {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: "Internal server error during registration",
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
      throw new ValidationError(
        "Email and password are required",
        ErrorCode.INVALID_INPUT,
      );
    }

    const result = await authService.login(loginData);

    ResponseHelper.success(res, {
      message: "Login successful",
      user: {
        id: result.user.id,
        email: result.user.email,
        displayName: result.user.displayName,
        username: result.user.username,
      },
      token: result.accessToken,
      refreshToken: (result as any).refreshToken,
    });
  } catch (error) {
    if (
      error instanceof AuthenticationError ||
      error instanceof ValidationError
    ) {
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
      console.error("Login error:", error);
      const response = {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: "Internal server error during login",
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
      throw new ValidationError(
        "Refresh token is required",
        ErrorCode.INVALID_TOKEN,
      );
    }

    // Define the expected payload type for the refresh token
    interface RefreshTokenPayload {
      userId: string;
      email: string;
      iat?: number;
      exp?: number;
      [key: string]: unknown;
    }

    // Verify refresh token using shared helper (ensures same secret as generation)
    const decoded = verifyRefreshToken(
      refreshToken,
    ) as RefreshTokenPayload | null;
    if (!decoded) {
      throw new ValidationError(
        "Invalid refresh token",
        ErrorCode.INVALID_TOKEN,
      );
    }

    // Check if token is blacklisted
    if (tokenBlacklistService.isTokenBlacklisted(refreshToken)) {
      throw new AuthenticationError(
        "Invalid refresh token",
        ErrorCode.INVALID_TOKEN,
      );
    }

    // Generate new access token using generator to keep signing consistent
    const tokenPayload = {
      id: (decoded as any).id || (decoded as any).userId,
      email: decoded.email,
      role: (decoded as any).role || "analyst",
      fullName: (decoded as any).fullName || "",
    };
    const newAccessToken = generateToken(tokenPayload as any);

    ResponseHelper.success(res, {
      message: "Token refreshed successfully",
      token: newAccessToken,
    });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      const response = {
        success: false,
        error: {
          code: ErrorCode.INVALID_TOKEN,
          message: "Invalid refresh token",
          timestamp: new Date().toISOString(),
        },
      };
      res.status(401).json(response);
    } else if (
      error instanceof ValidationError ||
      error instanceof AuthenticationError
    ) {
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
      console.error("Token refresh error:", error);
      const response = {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: "Internal server error during token refresh",
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
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (token) {
      // Extract expiration from token for blacklist
      try {
        interface DecodedTokenPayload {
          userId?: string;
          exp?: number;
          [key: string]: unknown;
        }
        const decoded = jwt.decode(token) as DecodedTokenPayload | null;
        const expiresAt = decoded?.exp
          ? new Date(decoded.exp * 1000)
          : new Date(Date.now() + 15 * 60 * 1000);
        tokenBlacklistService.blacklistToken(
          token,
          decoded?.userId || "unknown",
          expiresAt,
        );
      } catch {
        // If decode fails, blacklist for 15 minutes as fallback
        tokenBlacklistService.blacklistToken(
          token,
          "unknown",
          new Date(Date.now() + 15 * 60 * 1000),
        );
      }
    }

    ResponseHelper.success(res, {
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);
    const response = {
      success: false,
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message: "Internal server error during logout",
        timestamp: new Date().toISOString(),
      },
    };
    res.status(500).json(response);
  }
};

/**
 * Forgot password handler
 */
export const forgotPasswordHandler = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      throw new ValidationError("Email is required", ErrorCode.INVALID_INPUT);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new ValidationError(
        "Invalid email format",
        ErrorCode.INVALID_INPUT,
      );
    }

    // Use auth service to handle password reset request
    const result = await authService.requestPasswordReset(email);

    if (!result) {
      // Still return success to prevent email enumeration, but log the error
      console.error("Failed to send password reset email for:", email);
    }

    // Always return success message to prevent email enumeration
    ResponseHelper.success(res, {
      message:
        "If an account with that email exists, a password reset link has been sent.",
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
      console.error("Forgot password error:", error);
      const response = {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: "Internal server error",
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
export const resetPasswordHandler = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      throw new ValidationError(
        "Token and new password are required",
        ErrorCode.INVALID_INPUT,
      );
    }

    if (newPassword.length < 8) {
      throw new ValidationError(
        "Password must be at least 8 characters long",
        ErrorCode.INVALID_INPUT,
      );
    }

    // Use auth service to reset password
    await authService.resetPassword(token, newPassword);

    ResponseHelper.success(res, {
      message: "Password reset successfully",
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
    } else if (error instanceof Error) {
      // Handle service errors (like "Invalid reset token")
      const response = {
        success: false,
        error: {
          code: ErrorCode.BUSINESS_RULE_VIOLATION,
          message: error.message,
          timestamp: new Date().toISOString(),
        },
      };
      res.status(400).json(response);
    } else {
      console.error("Reset password error:", error);
      const response = {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: "Internal server error",
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
export const changePasswordHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new ValidationError(
        "Current password and new password are required",
        ErrorCode.INVALID_INPUT,
      );
    }

    if (newPassword.length < 8) {
      throw new ValidationError(
        "New password must be at least 8 characters long",
        ErrorCode.INVALID_INPUT,
      );
    }

    // Get user ID from authenticated request
    const userId = req.user?.id;
    if (!userId) {
      throw new AuthenticationError(
        "User not authenticated",
        ErrorCode.UNAUTHORIZED,
      );
    }

    // Use auth service to change password
    await authService.changePassword(userId, currentPassword, newPassword);

    ResponseHelper.success(res, {
      message: "Password changed successfully",
    });
  } catch (error) {
    if (
      error instanceof ValidationError ||
      error instanceof AuthenticationError
    ) {
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
      res
        .status(error instanceof AuthenticationError ? 401 : 400)
        .json(response);
    } else if (error instanceof Error) {
      // Handle service errors (like "Current password is incorrect")
      const response = {
        success: false,
        error: {
          code: ErrorCode.BUSINESS_RULE_VIOLATION,
          message: error.message,
          timestamp: new Date().toISOString(),
        },
      };

      // Return 401 for password validation errors, 400 for other business logic errors
      const statusCode = error.message.includes("Current password is incorrect")
        ? 401
        : 400;
      res.status(statusCode).json(response);
    } else {
      console.error("Change password error:", error);
      const response = {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: "Internal server error",
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
export const verifyEmailHandler = async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      throw new ValidationError(
        "Verification token is required",
        ErrorCode.INVALID_TOKEN,
      );
    }

    // Use auth service to verify email
    await authService.verifyEmail(token);

    ResponseHelper.success(res, {
      message: "Email verified successfully",
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
    } else if (error instanceof Error) {
      // Handle service errors (like "Invalid verification token")
      const response = {
        success: false,
        error: {
          code: ErrorCode.BUSINESS_RULE_VIOLATION,
          message: error.message,
          timestamp: new Date().toISOString(),
        },
      };
      res.status(400).json(response);
    } else {
      console.error("Email verification error:", error);
      const response = {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: "Internal server error",
          timestamp: new Date().toISOString(),
        },
      };
      res.status(500).json(response);
    }
  }
};
