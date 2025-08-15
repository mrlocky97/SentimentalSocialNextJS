/**
 * Sentiment Analysis Middleware Module
 * Validation and processing middleware for sentiment routes
 */

import { NextFunction, Request, Response } from "express";
import { asyncHandler } from "../../../core/errors/error-handler";
import { ValidationError } from "../../../core/errors/error-types";

/**
 * Validate text input middleware
 */
export const validateTextInput = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { text } = req.body;

  if (!text || typeof text !== "string") {
    throw new ValidationError("Text is required and must be a string");
  }

  if (text.trim().length === 0) {
    throw new ValidationError("Text cannot be empty");
  }

  if (text.length > 5000) {
    throw new ValidationError("Text must be less than 5000 characters");
  }

  next();
};

/**
 * Validate multi-language text input middleware
 */
export const validateMultiLangInput = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { text, language } = req.body;

  if (!text || typeof text !== "string") {
    throw new ValidationError("Text is required and must be a string");
  }

  if (text.trim().length === 0) {
    throw new ValidationError("Text cannot be empty");
  }

  if (text.length > 5000) {
    throw new ValidationError("Text must be less than 5000 characters");
  }

  if (
    language &&
    !["en", "es", "fr", "de", "it", "pt", "auto"].includes(language)
  ) {
    throw new ValidationError(
      "Language must be one of: en, es, fr, de, it, pt, auto",
    );
  }

  next();
};

/**
 * Validate tweet input middleware - ROBUST VERSION
 */
export const validateTweetInput = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { tweet } = req.body;

    // Validar que tweet existe y es un objeto
    if (!tweet || typeof tweet !== "object" || Array.isArray(tweet)) {
      return res.status(400).json({
        success: false,
        error: "Tweet is required and must be an object",
        code: "INVALID_TWEET_FORMAT",
        timestamp: new Date().toISOString(),
      });
    }

    // Validar contenido del tweet
    if (!tweet.content || typeof tweet.content !== "string") {
      return res.status(400).json({
        success: false,
        error: "Tweet content is required and must be a string",
        code: "MISSING_CONTENT",
        timestamp: new Date().toISOString(),
      });
    }

    const content = tweet.content.trim();
    if (content.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Tweet content cannot be empty",
        code: "EMPTY_CONTENT",
        timestamp: new Date().toISOString(),
      });
    }

    if (content.length > 500) {
      // Más flexible que 280
      return res.status(400).json({
        success: false,
        error: "Tweet content must be less than 500 characters",
        code: "CONTENT_TOO_LONG",
        received: content.length,
        timestamp: new Date().toISOString(),
      });
    }

    // Normalizar ID: aceptar tanto 'id' como 'tweetId'
    const rawId = tweet.tweetId || tweet.id;
    if (!rawId || typeof rawId !== "string" || rawId.trim() === "") {
      return res.status(400).json({
        success: false,
        error: "Tweet must include 'id' or 'tweetId' as a non-empty string",
        code: "MISSING_ID",
        timestamp: new Date().toISOString(),
      });
    }

    // Normalizar: asegurar que tweetId existe
    if (!tweet.tweetId) {
      req.body.tweet.tweetId = rawId;
    }

    // Normalizar contenido
    req.body.tweet.content = content;

    next();
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: "Internal validation error",
      code: "VALIDATION_ERROR",
      details: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Validate batch tweets input middleware
 */
export const validateBatchInput = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { tweets } = req.body;

  if (!Array.isArray(tweets)) {
    throw new ValidationError("Tweets must be an array");
  }

  if (tweets.length === 0) {
    throw new ValidationError("At least one tweet is required");
  }

  if (tweets.length > 100) {
    throw new ValidationError("Maximum 100 tweets allowed per batch");
  }

  for (let i = 0; i < tweets.length; i++) {
    const tweet = tweets[i];

    if (!tweet || typeof tweet !== "object") {
      throw new ValidationError(`Tweet at index ${i} must be an object`);
    }

    if (!tweet.content || typeof tweet.content !== "string") {
      throw new ValidationError(`Tweet at index ${i} must have content string`);
    }

    if (tweet.content.trim().length === 0) {
      throw new ValidationError(`Tweet at index ${i} content cannot be empty`);
    }

    if (tweet.content.length > 280) {
      throw new ValidationError(
        `Tweet at index ${i} content must be less than 280 characters`,
      );
    }

    if (!tweet.tweetId || typeof tweet.tweetId !== "string") {
      throw new ValidationError(`Tweet at index ${i} must have tweetId string`);
    }
  }

  next();
};

/**
 * Validate method selection middleware
 */
export const validateMethodInput = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { text, method } = req.body;

  if (!text || typeof text !== "string") {
    throw new ValidationError("Text is required and must be a string");
  }

  if (text.trim().length === 0) {
    throw new ValidationError("Text cannot be empty");
  }

  if (text.length > 5000) {
    throw new ValidationError("Text must be less than 5000 characters");
  }

  if (!method || typeof method !== "string") {
    throw new ValidationError("Method is required and must be a string");
  }

  if (!["rule", "naive"].includes(method)) {
    throw new ValidationError('Method must be either "rule" or "naive"');
  }

  next();
};

/**
 * Validate training data input middleware
 */
export const validateTrainingInput = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { examples, saveModel } = req.body;

  if (!Array.isArray(examples)) {
    throw new ValidationError("Examples must be an array");
  }

  if (examples.length < 10) {
    throw new ValidationError("At least 10 examples are required");
  }

  if (examples.length > 10000) {
    throw new ValidationError("Maximum 10000 examples allowed");
  }

  for (let i = 0; i < examples.length; i++) {
    const example = examples[i];

    if (!example || typeof example !== "object") {
      throw new ValidationError(`Example at index ${i} must be an object`);
    }

    if (!example.text || typeof example.text !== "string") {
      throw new ValidationError(`Example at index ${i} must have text string`);
    }

    if (example.text.trim().length === 0) {
      throw new ValidationError(`Example at index ${i} text cannot be empty`);
    }

    if (example.text.length > 1000) {
      throw new ValidationError(
        `Example at index ${i} text must be less than 1000 characters`,
      );
    }

    if (!example.label || typeof example.label !== "string") {
      throw new ValidationError(`Example at index ${i} must have label string`);
    }

    if (!["positive", "negative", "neutral"].includes(example.label)) {
      throw new ValidationError(
        `Example at index ${i} label must be positive, negative, or neutral`,
      );
    }
  }

  if (saveModel !== undefined && typeof saveModel !== "boolean") {
    throw new ValidationError("saveModel must be a boolean");
  }

  next();
};

/**
 * Rate limiting middleware for sentiment analysis
 */
export const sentimentRateLimit = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    // Basic rate limiting - in production, use Redis or similar
    const clientId = req.ip || "unknown";
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute window
    const maxRequests = 60; // Max 60 requests per minute

    // In production, this would be stored in Redis
    const requestKey = `sentiment_rate_${clientId}`;

    // Simple in-memory rate limiting (not suitable for production clusters)
    const globalStore = global as any;
    if (!globalStore.rateLimitStore) {
      globalStore.rateLimitStore = new Map();
    }

    const clientRequests = globalStore.rateLimitStore.get(requestKey) || {
      count: 0,
      resetTime: now + windowMs,
    };

    if (now > clientRequests.resetTime) {
      clientRequests.count = 1;
      clientRequests.resetTime = now + windowMs;
    } else {
      clientRequests.count++;
    }

    globalStore.rateLimitStore.set(requestKey, clientRequests);

    if (clientRequests.count > maxRequests) {
      return res.status(429).json({
        success: false,
        error: "Too many requests. Rate limit exceeded.",
        retryAfter: Math.ceil((clientRequests.resetTime - now) / 1000),
        limit: maxRequests,
        windowMs: windowMs / 1000,
      });
    }

    // Add rate limit headers
    res.set({
      "X-RateLimit-Limit": maxRequests.toString(),
      "X-RateLimit-Remaining": Math.max(
        0,
        maxRequests - clientRequests.count,
      ).toString(),
      "X-RateLimit-Reset": Math.ceil(
        clientRequests.resetTime / 1000,
      ).toString(),
    });

    next();
  },
);

/**
 * Content type validation middleware - FIXED VERSION
 */
export const validateContentType = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Only validate POST/PUT/PATCH requests
  if (!["POST", "PUT", "PATCH"].includes(req.method)) {
    return next();
  }

  const contentType = req.get("Content-Type") || "";
  const isJson = contentType.toLowerCase().includes("application/json");

  if (!isJson) {
    return res.status(400).json({
      success: false,
      error: "Content-Type must be application/json",
      received: contentType || "none",
      timestamp: new Date().toISOString(),
    });
  }

  next();
};

/**
 * Request size limitation middleware
 */
export const limitRequestSize = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const contentLength = parseInt(req.get("content-length") || "0", 10);
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (contentLength > maxSize) {
    return res.status(413).json({
      success: false,
      error: "Request entity too large",
      maxSize: `${maxSize / (1024 * 1024)}MB`,
      received: `${Math.round((contentLength / (1024 * 1024)) * 100) / 100}MB`,
    });
  }
  next();
};

/**
 * API version middleware
 */
export const setApiVersion = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  res.set("X-API-Version", "3.0.0");
  res.set("X-Service", "SentimentalSocial-API");
  next();
};

import { logger } from "../../../lib/observability/logger";
/**
 * Request logging middleware
 */
export const logSentimentRequest = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const startTime = Date.now();

  // Log request
  logger.info(`🔍 Sentiment Request: ${req.method} ${req.path}`, {
    meta: {
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      timestamp: new Date().toISOString(),
    },
  });

  // Override res.json to log response
  const originalJson = res.json.bind(res);
  res.json = function (body: any) {
    const duration = Date.now() - startTime;
    logger.info(`✅ Sentiment Response: ${res.statusCode} in ${duration}ms`);
    return originalJson(body);
  };

  next();
};

/**
 * Security headers middleware
 */
export const setSentimentSecurityHeaders = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  res.set({
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Cache-Control": "no-cache, no-store, must-revalidate",
    Pragma: "no-cache",
    Expires: "0",
  });
  next();
};
