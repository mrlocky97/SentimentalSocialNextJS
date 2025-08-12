/**
 * Auth Middleware Module
 * Specialized middleware for authentication routes
 */

import { NextFunction, Request, Response } from "express";
import { ErrorCode, ValidationError } from "../../../core/errors";
import { LoginRequest, RegisterRequest } from "../../../types/auth";

/**
 * Rate limiting middleware for authentication endpoints
 */
export const authRateLimit = (
  limit: number = 5,
  windowMs: number = 15 * 60 * 1000,
) => {
  const attempts = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip + ":" + req.path;
    const now = Date.now();
    const current = attempts.get(key);

    if (current) {
      if (now > current.resetTime) {
        // Reset window
        attempts.set(key, { count: 1, resetTime: now + windowMs });
      } else if (current.count >= limit) {
        return res.status(429).json({
          success: false,
          error: {
            code: ErrorCode.RATE_LIMIT_EXCEEDED,
            message:
              "Too many authentication attempts. Please try again later.",
            timestamp: new Date().toISOString(),
          },
        });
      } else {
        current.count++;
      }
    } else {
      attempts.set(key, { count: 1, resetTime: now + windowMs });
    }

    next();
  };
};

/**
 * Validation middleware for registration
 */
export const validateRegisterRequest = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email, password, displayName, username }: RegisterRequest =
      req.body;

    if (!email || !password || !displayName || !username) {
      throw new ValidationError(
        "Missing required fields",
        ErrorCode.INVALID_INPUT,
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new ValidationError(
        "Invalid email format",
        ErrorCode.INVALID_INPUT,
      );
    }

    // Password validation
    if (password.length < 8) {
      throw new ValidationError(
        "Password must be at least 8 characters long",
        ErrorCode.INVALID_INPUT,
      );
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      throw new ValidationError(
        "Password must contain at least one uppercase letter, one lowercase letter, and one number",
        ErrorCode.INVALID_INPUT,
      );
    }

    // Username validation
    if (username.length < 3 || username.length > 20) {
      throw new ValidationError(
        "Username must be between 3 and 20 characters",
        ErrorCode.INVALID_INPUT,
      );
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      throw new ValidationError(
        "Username can only contain letters, numbers, and underscores",
        ErrorCode.INVALID_INPUT,
      );
    }

    // Display name validation
    if (displayName.length < 2 || displayName.length > 50) {
      throw new ValidationError(
        "Display name must be between 2 and 50 characters",
        ErrorCode.INVALID_INPUT,
      );
    }

    next();
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
      next(error);
    }
  }
};

/**
 * Validation middleware for login
 */
export const validateLoginRequest = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email, password }: LoginRequest = req.body;

    if (!email || !password) {
      throw new ValidationError(
        "Email and password are required",
        ErrorCode.INVALID_INPUT,
      );
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new ValidationError(
        "Invalid email format",
        ErrorCode.INVALID_INPUT,
      );
    }

    next();
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
      next(error);
    }
  }
};

/**
 * Validation middleware for password reset
 */
export const validatePasswordResetRequest = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
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

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
      throw new ValidationError(
        "Password must contain at least one uppercase letter, one lowercase letter, and one number",
        ErrorCode.INVALID_INPUT,
      );
    }

    next();
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
      next(error);
    }
  }
};

/**
 * Validation middleware for password change
 */
export const validatePasswordChangeRequest = (
  req: Request,
  res: Response,
  next: NextFunction,
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

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
      throw new ValidationError(
        "New password must contain at least one uppercase letter, one lowercase letter, and one number",
        ErrorCode.INVALID_INPUT,
      );
    }

    if (currentPassword === newPassword) {
      throw new ValidationError(
        "New password must be different from current password",
        ErrorCode.INVALID_INPUT,
      );
    }

    next();
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
      next(error);
    }
  }
};

/**
 * Validation middleware for refresh token
 */
export const validateRefreshTokenRequest = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new ValidationError(
        "Refresh token is required",
        ErrorCode.INVALID_TOKEN,
      );
    }

    if (typeof refreshToken !== "string" || refreshToken.trim().length === 0) {
      throw new ValidationError(
        "Invalid refresh token format",
        ErrorCode.INVALID_TOKEN,
      );
    }

    next();
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
      res.status(401).json(response);
    } else {
      next(error);
    }
  }
};

/**
 * Security headers middleware for auth routes
 */
export const setAuthSecurityHeaders = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Prevent caching of auth responses
  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, private",
  );
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  // Security headers
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");

  next();
};

/**
 * Request logging middleware for auth endpoints
 */
export const logAuthRequest = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const startTime = Date.now();
  const originalSend = res.send;

  res.send = function (body) {
    const duration = Date.now() - startTime;
    const logData: any = {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get("user-agent"),
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    };

    // Don't log sensitive data
    if (req.method === "POST" && req.body) {
      const safeBody = { ...req.body };
      if (safeBody.password) safeBody.password = "[REDACTED]";
      if (safeBody.currentPassword) safeBody.currentPassword = "[REDACTED]";
      if (safeBody.newPassword) safeBody.newPassword = "[REDACTED]";
      logData.body = safeBody;
    }

    console.log(`🔐 Auth Request:`, logData);
    return originalSend.call(this, body);
  };

  next();
};
