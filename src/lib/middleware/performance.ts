/**
 * Performance Middleware
 * Optimized middleware for compression, rate limiting, and performance monitoring
 */

import { Request, Response, NextFunction } from 'express';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { appConfig } from '../config/app';
import { appCache } from '../cache';
import { metricsService } from '../monitoring/metrics';

/**
 * Compression middleware with optimization
 */
export const compressionMiddleware = compression({
  level: appConfig.performance.compressionLevel,
  threshold: 1024, // Only compress responses > 1KB
  filter: (req: Request, res: Response) => {
    // Don't compress if explicitly disabled
    if (req.headers['x-no-compression']) {
      return false;
    }
    // Use compression for all compressible responses
    return compression.filter(req, res);
  },
});

/**
 * Smart rate limiting based on endpoint type
 */
export const createRateLimit = (options?: {
  windowMs?: number;
  max?: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}) => {
  const config = {
    windowMs: options?.windowMs || appConfig.api.rateLimit.windowMs,
    max: options?.max || appConfig.api.rateLimit.max,
    skipSuccessfulRequests: options?.skipSuccessfulRequests || false,
    skipFailedRequests: options?.skipFailedRequests || false,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => {
      // Use IP + User ID for authenticated requests
      const ip = req.ip || req.connection.remoteAddress || 'unknown';
      const userId = (req as any).user?.id;
      return userId ? `${ip}-${userId}` : ip;
    },
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        success: false,
        error: {
          message: 'Too many requests from this IP, please try again later',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil(config.windowMs / 1000),
          timestamp: new Date().toISOString(),
        },
      });
    },
  };

  return rateLimit(config);
};

/**
 * Different rate limits for different endpoint types
 */
export const authRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit auth attempts
});

export const scrapingRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // Limit scraping requests
});

export const analyticsRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // More lenient for analytics
});

/**
 * Performance monitoring middleware
 */
export const performanceMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  // Track request size
  const requestSize = parseInt(req.headers['content-length'] || '0', 10);
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const method = req.method;
    const url = req.originalUrl;
    const isSuccess = status < 400;
    
    // Record metrics
    metricsService.recordRequest(duration, isSuccess);
    
    // Log slow requests (> 1 second)
    if (duration > 1000) {
      console.warn(`Slow request: ${method} ${url} - ${duration}ms - ${status}`);
    }
    
    // Cache performance metrics
    const metricsKey = `perf_${method}_${url.split('?')[0]}`;
    const existingMetrics = appCache.get<any>(metricsKey) || {
      count: 0,
      totalDuration: 0,
      averageDuration: 0,
      maxDuration: 0,
      errors: 0,
    };
    
    existingMetrics.count++;
    existingMetrics.totalDuration += duration;
    existingMetrics.averageDuration = existingMetrics.totalDuration / existingMetrics.count;
    existingMetrics.maxDuration = Math.max(existingMetrics.maxDuration, duration);
    
    if (status >= 400) {
      existingMetrics.errors++;
    }
    
    // Cache metrics for 1 hour
    appCache.set(metricsKey, existingMetrics, 3600000);
    
    // Set performance headers
    res.setHeader('X-Response-Time', `${duration}ms`);
    res.setHeader('X-Request-Size', `${requestSize}b`);
  });
  
  next();
};

/**
 * Cache control middleware
 */
export const cacheControlMiddleware = (maxAge: number = 300) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method === 'GET') {
      res.setHeader('Cache-Control', `public, max-age=${maxAge}`);
      res.setHeader('ETag', `"${Date.now()}"`);
    } else {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
    next();
  };
};

/**
 * Request sanitization middleware
 */
export const sanitizeMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Remove potentially dangerous characters from query parameters
  if (req.query) {
    for (const key in req.query) {
      if (typeof req.query[key] === 'string') {
        req.query[key] = (req.query[key] as string)
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '');
      }
    }
  }
  
  next();
};

/**
 * Health check middleware that doesn't count towards rate limits
 */
export const healthCheckMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (req.path === '/health' || req.path === '/api/v1/health') {
    // Skip rate limiting for health checks
    return next();
  }
  next();
};
