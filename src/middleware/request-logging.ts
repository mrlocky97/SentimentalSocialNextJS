/**
 * Request Logging Middleware
 * Integrates correlation tracking and structured logging with Express requests
 * Phase 6.1: Observability and Metrics Implementation
 */

import { NextFunction, Request, Response } from "express";
import { correlationService } from "../lib/observability/correlation";
import { apiLogger } from "../lib/observability/logger";

interface RequestWithLogging extends Request {
  correlationId?: string;
  requestId?: string;
  startTime?: number;
}

/**
 * Middleware for request correlation and logging
 */
export function requestLoggingMiddleware(
  req: RequestWithLogging,
  res: Response,
  next: NextFunction,
): void {
  const startTime = Date.now();
  req.startTime = startTime;

  // Initialize correlation context
  const context = correlationService.initializeContext(req);
  req.correlationId = context.correlationId;
  req.requestId = context.requestId;

  // Set correlation header in response
  res.setHeader("X-Correlation-ID", context.correlationId);
  res.setHeader("X-Request-ID", context.requestId);

  // Run the request within correlation context
  correlationService.runWithContext(context, () => {
    // Log incoming request
    apiLogger.info("Incoming request", {
      method: req.method,
      url: req.url,
      userAgent: req.headers["user-agent"],
      contentLength: req.headers["content-length"],
      contentType: req.headers["content-type"],
      userId: context.userId,
      ipAddress: context.ipAddress,
    });

    // Override res.json to log response
    const originalJson = res.json;
    res.json = function (body: any) {
      const responseTime = Date.now() - startTime;

      apiLogger.info("Outgoing response", {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        responseTime,
        contentType: res.getHeader("content-type"),
        userId: context.userId,
      });

      // Add performance metadata
      correlationService.addMetadata("responseTime", responseTime);
      correlationService.addMetadata("statusCode", res.statusCode);

      return originalJson.call(this, body);
    };

    // Override res.send to log response
    const originalSend = res.send;
    res.send = function (body: any) {
      const responseTime = Date.now() - startTime;

      if (res.statusCode >= 400) {
        apiLogger.error("Request completed with error", undefined, {
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          responseTime,
          userId: context.userId,
        });
      } else {
        apiLogger.info("Request completed successfully", {
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          responseTime,
          userId: context.userId,
        });
      }

      return originalSend.call(this, body);
    };

    // Handle response finish event
    res.on("finish", () => {
      const responseTime = Date.now() - startTime;

      apiLogger.debug("Response finished", {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        responseTime,
        contentLength: res.getHeader("content-length"),
        userId: context.userId,
      });
    });

    // Handle errors
    res.on("error", (error: Error) => {
      const responseTime = Date.now() - startTime;

      apiLogger.error("Response error", error, {
        method: req.method,
        url: req.url,
        responseTime,
        userId: context.userId,
      });
    });

    next();
  });
}

/**
 * Middleware for error logging with correlation context
 */
export function errorLoggingMiddleware(
  error: Error,
  req: RequestWithLogging,
  res: Response,
  next: NextFunction,
): void {
  const responseTime = req.startTime ? Date.now() - req.startTime : undefined;

  // Log error within correlation context if available
  const context = correlationService.getCurrentContext();
  if (context) {
    correlationService.runWithContext(context, () => {
      apiLogger.error("Unhandled request error", error, {
        method: req.method,
        url: req.url,
        responseTime,
        statusCode: res.statusCode,
        userId: context.userId,
        stack: error.stack,
      });
    });
  } else {
    apiLogger.error("Unhandled request error (no context)", error, {
      method: req.method,
      url: req.url,
      responseTime,
      statusCode: res.statusCode,
      correlationId: req.correlationId,
      requestId: req.requestId,
    });
  }

  next(error);
}

/**
 * Performance tracking middleware for slow requests
 */
export function performanceLoggingMiddleware(thresholdMs: number = 1000) {
  return (req: RequestWithLogging, res: Response, next: NextFunction): void => {
    const startTime = Date.now();

    res.on("finish", () => {
      const responseTime = Date.now() - startTime;

      if (responseTime > thresholdMs) {
        apiLogger.warn("Slow request detected", {
          method: req.method,
          url: req.url,
          responseTime,
          threshold: thresholdMs,
          statusCode: res.statusCode,
          correlationId: req.correlationId,
          requestId: req.requestId,
        });
      }
    });

    next();
  };
}
