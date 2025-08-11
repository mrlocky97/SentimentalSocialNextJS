/**
 * Authentication Middleware
 * Following Single Responsibility Principle - only handles authentication
 */

import { NextFunction, Request, Response } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    username: string;
  };
}

/**
 * JWT Token verification (mock implementation)
 */
function verifyToken(token: string): { userId: string; email: string; username: string } | null {
  try {
    // In a real app, you would verify the JWT token here
    // For now, just return a mock user
    if (token === 'valid-token') {
      return {
        userId: '1',
        email: 'user@example.com',
        username: 'testuser',
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Authentication middleware
 */
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing or invalid authorization header',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const user = verifyToken(token);

    if (!user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Add user to request
    req.user = {
      id: user.userId,
      email: user.email,
      username: user.username,
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Optional authentication middleware (doesn't fail if no token)
 */
export function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const user = verifyToken(token);

      if (user) {
        req.user = {
          id: user.userId,
          email: user.email,
          username: user.username,
        };
      }
    }

    next();
  } catch (error) {
    console.error('Optional authentication error:', error);
    // Continue without authentication on error
    next();
  }
}

/**
 * Rate limiting middleware
 */
interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
}

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(options: RateLimitOptions) {
  return function (req: Request, res: Response, next: NextFunction): void {
    try {
      const clientIP =
        (req.headers['x-forwarded-for'] as string) ||
        (req.headers['x-real-ip'] as string) ||
        req.socket.remoteAddress ||
        'unknown';
      const now = Date.now();
      const key = `${clientIP}-${Math.floor(now / options.windowMs)}`;

      const current = rateLimitStore.get(key) || { count: 0, resetTime: now + options.windowMs };

      if (current.count >= options.maxRequests) {
        res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests, please try again later',
          },
          timestamp: new Date().toISOString(),
        });

        res.set({
          'X-RateLimit-Limit': options.maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': current.resetTime.toString(),
        });

        return;
      }

      current.count++;
      rateLimitStore.set(key, current);

      // Clean up old entries
      if (Math.random() < 0.01) {
        // 1% chance to clean up
        for (const [key, value] of rateLimitStore.entries()) {
          if (value.resetTime < now) {
            rateLimitStore.delete(key);
          }
        }
      }

      // Add rate limit headers
      res.set({
        'X-RateLimit-Limit': options.maxRequests.toString(),
        'X-RateLimit-Remaining': (options.maxRequests - current.count).toString(),
        'X-RateLimit-Reset': current.resetTime.toString(),
      });

      next();
    } catch (error) {
      console.error('Rate limiting error:', error);
      next();
    }
  };
}

/**
 * CORS middleware
 */
export function corsMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Set CORS headers
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Max-Age', '86400');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  next();
}
