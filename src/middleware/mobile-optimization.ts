/**
 * Mobile Optimization Middleware
 * Optimizes responses for mobile devices and reduces bandwidth usage
 */

import compression from "compression";
import { NextFunction, Request, Response } from "express";

export interface MobileOptimizedResponse {
  compact?: boolean;
  essential?: boolean;
  bandwidth?: "low" | "medium" | "high";
}

/**
 * Detect mobile devices and apply optimization
 */
export const mobileDetectionMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const userAgent = req.get("User-Agent") || "";
  const isMobile =
    /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      userAgent,
    );

  // Add mobile context to request
  (req as any).isMobile = isMobile;
  (req as any).deviceType = isMobile ? "mobile" : "desktop";

  // Set response headers for mobile optimization
  if (isMobile) {
    res.setHeader("X-Device-Type", "mobile");
    res.setHeader("Cache-Control", "public, max-age=3600"); // Extended cache for mobile
  }

  next();
};

/**
 * Compress responses based on device type
 */
export const adaptiveCompressionMiddleware = compression({
  filter: (req: Request, res: Response) => {
    const isMobile = (req as any).isMobile;

    // Always compress for mobile devices
    if (isMobile) return true;

    // Use default compression logic for desktop
    return compression.filter(req, res);
  },
  level: 6, // Set a default compression level (cannot be a function)
});

/**
 * Optimize JSON responses for mobile
 */
export const mobileResponseOptimizer = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const isMobile = (req as any).isMobile;

  if (isMobile && req.path.includes("/api/v1/sentiment/")) {
    // Override json method to optimize responses
    const originalJson = res.json;

    res.json = function (obj: any) {
      // Optimize sentiment analysis responses for mobile
      if (obj.success && obj.data) {
        const optimizedData = optimizeSentimentResponseForMobile(obj.data);
        return originalJson.call(this, { ...obj, data: optimizedData });
      }

      return originalJson.call(this, obj);
    };
  }

  next();
};

/**
 * Optimize sentiment analysis responses for mobile devices
 */
function optimizeSentimentResponseForMobile(data: any): any {
  // For single sentiment analysis
  if (data.finalPrediction) {
    return {
      sentiment: data.finalPrediction.label,
      confidence: Math.round(data.finalPrediction.confidence * 100) / 100,
      score: Math.round(data.finalPrediction.score * 100) / 100,
      consensus: {
        agreement: Math.round(data.consensus.agreement * 100) / 100,
        explanation: data.consensus.explanation,
      },
      // Include only essential model predictions
      models: data.modelPredictions?.slice(0, 3).map((pred: any) => ({
        method: pred.method,
        label: pred.label,
        confidence: Math.round(pred.confidence * 100) / 100,
      })),
    };
  }

  // For batch analysis
  if (data.analyses && Array.isArray(data.analyses)) {
    return {
      ...data,
      analyses: data.analyses.map((analysis: any) => ({
        tweetId: analysis.tweetId,
        sentiment: {
          label: analysis.analysis.sentiment.label,
          confidence:
            Math.round(analysis.analysis.sentiment.confidence * 100) / 100,
          score: Math.round(analysis.analysis.sentiment.score * 100) / 100,
        },
      })),
    };
  }

  // For statistics and other responses, keep essential data only
  if (data.statistics) {
    return {
      summary: data.summary,
      sentimentCounts: data.statistics.sentimentCounts,
      averageSentiment:
        Math.round(data.statistics.averageSentiment * 100) / 100,
    };
  }

  return data;
}

/**
 * Rate limiting specifically for mobile devices
 */
export const mobileRateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: (req: Request) => {
    const isMobile = (req as any).isMobile;

    // More lenient rate limiting for mobile (considering slower connections)
    return isMobile ? 200 : 100;
  },
  message: {
    success: false,
    error: {
      message: "Too many requests from this device. Please try again later.",
      code: "RATE_LIMIT_EXCEEDED",
      retryAfter: "15 minutes",
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
};

/**
 * Lightweight response for mobile health checks
 */
export const mobileHealthResponse = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const isMobile = (req as any).isMobile;

  if (isMobile && req.path === "/health") {
    return res.status(200).json({
      status: "OK",
      timestamp: new Date().toISOString(),
      mobile: true,
    });
  }

  next();
};
