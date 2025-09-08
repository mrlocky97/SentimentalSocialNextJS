/**
 * Intelligent Rate Limiting for Sentiment Analysis API
 * Provides adaptive rate limiting based on user behavior and resource usage
 */

import { NextFunction, Request, Response } from "express";

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  skipSuccessfulRequests: boolean;
  skipFailedRequests: boolean;
  keyGenerator: (req: Request) => string;
  onLimitReached?: (req: Request, res: Response) => void;
}

export interface UserRateData {
  count: number;
  resetTime: number;
  blocked: boolean;
  consecutiveErrors: number;
  lastRequest: number;
}

export class IntelligentRateLimiter {
  private users = new Map<string, UserRateData>();
  private config: RateLimitConfig;

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100,
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      keyGenerator: (req) => req.ip || "unknown",
      ...config,
    };

    // Cleanup old entries every minute
    setInterval(() => this.cleanup(), 60 * 1000);
  }

  /**
   * Get or create user rate data
   */
  private getUserData(key: string): UserRateData {
    const now = Date.now();
    let userData = this.users.get(key);

    if (!userData || now >= userData.resetTime) {
      userData = {
        count: 0,
        resetTime: now + this.config.windowMs,
        blocked: false,
        consecutiveErrors: 0,
        lastRequest: now,
      };
      this.users.set(key, userData);
    }

    return userData;
  }

  /**
   * Adaptive rate limiting based on user behavior
   */
  private getAdaptiveLimit(userData: UserRateData): number {
    let limit = this.config.maxRequests;

    // Reduce limit for users with many errors
    if (userData.consecutiveErrors > 5) {
      limit = Math.floor(limit * 0.5); // 50% reduction
    } else if (userData.consecutiveErrors > 10) {
      limit = Math.floor(limit * 0.25); // 75% reduction
    }

    // Increase limit for well-behaved users
    const timeSinceLastRequest = Date.now() - userData.lastRequest;
    if (timeSinceLastRequest > 60000 && userData.consecutiveErrors === 0) {
      limit = Math.floor(limit * 1.25); // 25% increase
    }

    return Math.max(10, Math.min(limit, this.config.maxRequests * 2));
  }

  /**
   * Check if request should be rate limited
   */
  shouldLimit(
    req: Request,
    isError: boolean = false,
  ): {
    limited: boolean;
    remaining: number;
    resetTime: number;
    retryAfter: number;
  } {
    const key = this.config.keyGenerator(req);
    const userData = this.getUserData(key);
    const adaptiveLimit = this.getAdaptiveLimit(userData);

    // Update error tracking
    if (isError) {
      userData.consecutiveErrors++;
    } else {
      userData.consecutiveErrors = Math.max(0, userData.consecutiveErrors - 1);
    }

    userData.lastRequest = Date.now();

    // Check if should skip based on config
    if (
      (isError && this.config.skipFailedRequests) ||
      (!isError && this.config.skipSuccessfulRequests)
    ) {
      return {
        limited: false,
        remaining: adaptiveLimit - userData.count,
        resetTime: userData.resetTime,
        retryAfter: 0,
      };
    }

    // Check rate limit
    if (userData.count >= adaptiveLimit) {
      userData.blocked = true;
      const retryAfter = Math.ceil((userData.resetTime - Date.now()) / 1000);

      return {
        limited: true,
        remaining: 0,
        resetTime: userData.resetTime,
        retryAfter,
      };
    }

    userData.count++;
    userData.blocked = false;

    return {
      limited: false,
      remaining: adaptiveLimit - userData.count,
      resetTime: userData.resetTime,
      retryAfter: 0,
    };
  }

  /**
   * Express middleware factory
   */
  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const result = this.shouldLimit(req);

      // Add rate limit headers
      res.set({
        "X-RateLimit-Limit": this.config.maxRequests.toString(),
        "X-RateLimit-Remaining": result.remaining.toString(),
        "X-RateLimit-Reset": new Date(result.resetTime).toISOString(),
      });

      if (result.limited) {
        res.set("Retry-After", result.retryAfter.toString());

        if (this.config.onLimitReached) {
          this.config.onLimitReached(req, res);
        } else {
          res.status(429).json({
            success: false,
            error: "Too Many Requests",
            message: `Rate limit exceeded. Try again in ${result.retryAfter} seconds.`,
            retryAfter: result.retryAfter,
          });
        }
        return;
      }

      next();
    };
  }

  /**
   * Clean up expired user data
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, userData] of this.users) {
      if (now >= userData.resetTime) {
        this.users.delete(key);
      }
    }
  }

  /**
   * Get rate limit statistics
   */
  getStats(): {
    totalUsers: number;
    blockedUsers: number;
    avgRequestsPerUser: number;
  } {
    const users = Array.from(this.users.values());
    const blockedUsers = users.filter((u) => u.blocked).length;
    const avgRequests =
      users.length > 0
        ? users.reduce((sum, u) => sum + u.count, 0) / users.length
        : 0;

    return {
      totalUsers: users.length,
      blockedUsers,
      avgRequestsPerUser: Math.round(avgRequests * 100) / 100,
    };
  }

  /**
   * Reset rate limit for specific user
   */
  resetUser(key: string): void {
    this.users.delete(key);
  }

  /**
   * Block/unblock specific user
   */
  setUserBlocked(key: string, blocked: boolean): void {
    const userData = this.getUserData(key);
    userData.blocked = blocked;
    if (blocked) {
      userData.count = this.config.maxRequests; // Set to max to trigger limit
    }
  }
}

// Export different rate limiters for different endpoints
export const generalRateLimit = new IntelligentRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 500, // 500 requests per 15 min = supports ~30 users × 15-20 requests each
  keyGenerator: (req) => req.ip || "unknown",
});

export const heavyAnalysisRateLimit = new IntelligentRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  maxRequests: 90, // 90 requests per 5 min = supports 30 users × 3 heavy operations each
  keyGenerator: (req) => req.ip || "unknown",
});

export const batchRateLimit = new IntelligentRateLimiter({
  windowMs: 10 * 60 * 1000, // 10 minutes
  maxRequests: 60, // 60 requests per 10 min = supports 30 users × 2 batch operations each
  keyGenerator: (req) => req.ip || "unknown",
});

// Export middleware functions
export const generalRateLimitMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Skip rate limiting for scraping routes (they have their own rate limit)
  if (req.path.startsWith('/api/v1/scraping')) {
    return next();
  }
  
  return generalRateLimit.middleware()(req, res, next);
};

export const heavyAnalysisRateLimitMiddleware =
  heavyAnalysisRateLimit.middleware();
export const batchRateLimitMiddleware = batchRateLimit.middleware();
