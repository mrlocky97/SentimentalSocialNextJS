/**
 * Centralized Error Handler
 * Manejador centralizado de errores con logging y respuestas HTTP
 */

import { NextFunction, Request, Response } from "express";
import {
  BaseError,
  BusinessLogicError,
  ErrorHandlerConfig,
  ErrorResponse,
  ErrorSeverity,
  InternalServerError,
  KnownError,
  ValidationError,
} from "./error-types";

/**
 * Express route handler tipado
 */
export type ExpressHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<void> | void;

/**
 * Express async handler tipado
 */
export type AsyncExpressHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<void>;

// ==================== ERROR HANDLER CLASS ====================

/**
 * Manejador centralizado de errores
 */
export class CentralizedErrorHandler {
  private config: ErrorHandlerConfig;
  private logger: Console;

  constructor(config: Partial<ErrorHandlerConfig> = {}) {
    this.config = {
      enableDetailedErrors: process.env.NODE_ENV === "development",
      enableStackTrace: process.env.NODE_ENV === "development",
      enableErrorLogging: true,
      logLevel: "error",
      ...config,
    };

    this.logger = console;
  }

  /**
   * Middleware principal para Express
   */
  expressHandler = (
    err: unknown,
    req: Request,
    res: Response,
    next: NextFunction,
  ): void => {
    if (res.headersSent) {
      return next(err);
    }

    const processedError = this.processError(err, req);
    const response = this.createErrorResponse(processedError, req);

    this.logError(processedError, req);
    res.status(processedError.metadata.statusCode).json(response);
  };

  /**
   * Procesa y normaliza errores
   */
  private processError(error: unknown, req?: Request): BaseError {
    if (error instanceof BaseError) {
      return error;
    }

    const knownError = error as KnownError;

    // Errores de validación de Mongoose/Express
    if (knownError.name === "ValidationError" && knownError.errors) {
      return new ValidationError("Validation failed", undefined, {
        operation: req?.path,
        additionalData: { validationErrors: knownError.errors },
      });
    }

    // Errores de MongoDB
    if (
      knownError.name === "MongoError" ||
      knownError.name === "MongooseError"
    ) {
      return new InternalServerError("Database operation failed", undefined, {
        operation: req?.path,
        additionalData: { mongoError: knownError.code },
      });
    }

    // Errores de JSON parsing
    if (error instanceof SyntaxError && "body" in error) {
      return new ValidationError("Invalid JSON format in request body");
    }

    // Error genérico
    const genericError = error as Error;
    return new InternalServerError(
      this.config.enableDetailedErrors
        ? genericError.message || "Internal server error"
        : "An unexpected error occurred",
      undefined,
      {
        operation: req?.path,
        additionalData: this.config.enableDetailedErrors
          ? { originalError: genericError.message }
          : undefined,
      },
      genericError,
    );
  }

  /**
   * Crea la respuesta de error estandardizada
   */
  private createErrorResponse(error: BaseError, req?: Request): ErrorResponse {
    const response: ErrorResponse = {
      success: false,
      error: {
        code: error.metadata.code,
        message: error.message,
        category: error.metadata.category,
        severity: error.metadata.severity,
        timestamp: error.timestamp.toISOString(),
        requestId: req?.headers["x-request-id"] as string,
      },
    };

    // Agregar sugerencias si existen
    if (error.metadata.suggestions) {
      response.error.suggestions = error.metadata.suggestions;
    }

    // Agregar detalles en desarrollo
    if (
      this.config.enableDetailedErrors &&
      error.metadata.context?.additionalData
    ) {
      response.error.details = error.metadata.context.additionalData;
    }

    // Agregar stack trace en desarrollo
    if (this.config.enableStackTrace && error.stack) {
      response.error.stack = error.stack;
    }

    return response;
  }

  /**
   * Log del error según severidad
   */
  private logError(error: BaseError, req?: Request): void {
    if (!this.config.enableErrorLogging) return;

    const logData = {
      error: {
        name: error.name,
        message: error.message,
        code: error.metadata.code,
        category: error.metadata.category,
        severity: error.metadata.severity,
        statusCode: error.metadata.statusCode,
        isOperational: error.metadata.isOperational,
      },
      request: req
        ? {
            method: req.method,
            url: req.url,
            userAgent: req.get("user-agent"),
            ip: req.ip,
            requestId: req.headers["x-request-id"],
          }
        : undefined,
      context: error.metadata.context,
      timestamp: error.timestamp.toISOString(),
      stack: this.config.enableStackTrace ? error.stack : undefined,
    };

    // Log según severidad
    switch (error.metadata.severity) {
      case ErrorSeverity.CRITICAL:
        this.logger.error("🚨 CRITICAL ERROR:", logData);
        break;
      case ErrorSeverity.HIGH:
        this.logger.error("❌ HIGH SEVERITY ERROR:", logData);
        break;
      case ErrorSeverity.MEDIUM:
        this.logger.warn("⚠️ MEDIUM SEVERITY ERROR:", logData);
        break;
      case ErrorSeverity.LOW:
        this.logger.info("ℹ️ LOW SEVERITY ERROR:", logData);
        break;
      default:
        this.logger.error("❓ UNKNOWN SEVERITY ERROR:", logData);
    }
  }

  /**
   * Handler para promises no manejadas
   */
  handleUnhandledRejection = (reason: any): void => {
    const error = new InternalServerError(
      "Unhandled Promise Rejection",
      undefined,
      {
        operation: "unhandled_rejection",
        additionalData: { reason: reason?.message || reason },
      },
    );

    this.logError(error);

    // En producción, considera cerrar el proceso gracefully
    if (process.env.NODE_ENV === "production") {
      console.log("Shutting down due to unhandled promise rejection");
      process.exit(1);
    }
  };

  /**
   * Handler para excepciones no capturadas
   */
  handleUncaughtException = (error: Error): void => {
    const processedError = new InternalServerError(
      "Uncaught Exception",
      undefined,
      {
        operation: "uncaught_exception",
        additionalData: { originalError: error.message },
      },
      error,
    );

    this.logError(processedError);

    console.log("Shutting down due to uncaught exception");
    process.exit(1);
  };

  /**
   * Handler 404 para rutas no encontradas
   */
  notFoundHandler = (req: Request, res: Response): void => {
    const error = new ValidationError(
      `Route not found: ${req.originalUrl}`,
      undefined,
      {
        operation: "route_not_found",
        additionalData: { method: req.method, url: req.originalUrl },
      },
    );

    const response = this.createErrorResponse(error, req);
    this.logError(error, req);
    res.status(404).json(response);
  };

  /**
   * Wrapper para funciones async
   */
  asyncWrapper = <T extends any[], R>(fn: (...args: T) => Promise<R>) => {
    return (...args: T): Promise<R> => {
      return fn(...args).catch((error) => {
        throw this.processError(error);
      });
    };
  };

  /**
   * Wrapper para Express route handlers
   */
  expressAsyncWrapper = (
    fn: (req: Request, res: Response, next: NextFunction) => Promise<any>,
  ) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  };
}

/**
 * Instancia global del manejador de errores
 */
export const errorHandler = new CentralizedErrorHandler();

/**
 * Helpers para respuestas exitosas
 */
export class ResponseHelper {
  /**
   * Respuesta exitosa estandardizada
   */
  static success<T>(
    res: Response,
    data: T,
    message = "Operation successful",
    statusCode = 200,
  ): void {
    res.status(statusCode).json({
      success: true,
      data,
      message,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Respuesta de creación exitosa
   */
  static created<T>(
    res: Response,
    data: T,
    message = "Resource created successfully",
  ): void {
    ResponseHelper.success(res, data, message, 201);
  }

  /**
   * Respuesta sin contenido
   */
  static noContent(
    res: Response,
    message = "Operation completed successfully",
  ): void {
    res.status(204).json({
      success: true,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Configurar manejadores globales
 */
export function setupGlobalErrorHandlers(): void {
  process.on("unhandledRejection", errorHandler.handleUnhandledRejection);
  process.on("uncaughtException", errorHandler.handleUncaughtException);
}

type ErrorDetails = Record<string, unknown>;

const MAX_BATCH_SIZE = 100;

/**
 * Sentiment Analysis specific error handlers
 */
export class SentimentAnalysisError {
  private static baseError(
    message: string,
    details?: ErrorDetails,
  ): ValidationError {
    return new ValidationError(message, undefined, { additionalData: details });
  }

  /**
   * Handle tweet validation errors
   */
  static invalidTweet(details?: ErrorDetails): ValidationError {
    return this.baseError("Tweet object with content is required", {
      expected: {
        tweet: {
          tweetId: "string",
          content: "string (required)",
          author: {
            username: "string",
            verified: "boolean",
            followersCount: "number",
          },
          metrics: { likes: "number", retweets: "number", replies: "number" },
        },
      },
      ...details,
    });
  }

  /**
   * Handle text validation errors
   */
  static invalidText(details?: ErrorDetails): ValidationError {
    return this.baseError("Text string is required", {
      example: {
        text: "I love this product! It's amazing and works perfectly.",
      },
      ...details,
    });
  }

  /**
   * Handle batch processing errors
   */
  static invalidBatch(receivedCount?: number): ValidationError {
    const message =
      receivedCount && receivedCount > MAX_BATCH_SIZE
        ? `Maximum ${MAX_BATCH_SIZE} tweets allowed per batch request. Received: ${receivedCount}`
        : "Array of tweets is required";

    return this.baseError(message, {
      maxItems: MAX_BATCH_SIZE,
      receivedCount,
      example: {
        tweets: [
          {
            tweetId: "1",
            content: "I love this product!",
            author: { username: "user1" },
          },
          {
            tweetId: "2",
            content: "Not satisfied with the service",
            author: { username: "user2" },
          },
        ],
      },
    });
  }

  /**
   * Handle model training errors
   */
  static invalidTrainingData(details?: ErrorDetails): ValidationError {
    return this.baseError("Array of training examples is required", {
      example: {
        examples: [
          { text: "I love this product!", label: "positive" },
          { text: "This is terrible service", label: "negative" },
          { text: "The package arrived yesterday", label: "neutral" },
        ],
      },
      ...details,
    });
  }

  /**
   * Handle invalid training examples
   */
  static noValidTrainingExamples(): ValidationError {
    return this.baseError("No valid training examples provided", {
      requirements: {
        text: "Must be a non-empty string",
        label: "Must be one of: positive, negative, neutral",
      },
    });
  }

  /**
   * Handle analysis array validation errors
   */
  static invalidAnalysisArray(): ValidationError {
    return this.baseError("Array of sentiment analyses is required");
  }

  /**
   * Handle model processing errors
   */
  static modelProcessingError(
    operation: string,
    error: Error,
  ): BusinessLogicError {
    return new BusinessLogicError(`Failed to ${operation}`, undefined, {
      operation,
      additionalData: {
        originalError: error.message,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Handle sentiment method errors
   */
  static invalidSentimentMethod(method: string): ValidationError {
    return this.baseError(`Invalid sentiment analysis method: ${method}`, {
      validMethods: ["rule", "naive"],
      received: method,
    });
  }
}

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public details?: any;

  constructor(message: string, statusCode: number = 500, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Async handler wrapper for Express routes
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Helper para respuestas exitosas (backward compatibility)
 */
export const successResponse = (
  res: Response,
  data: any,
  message: string = "Operation successful",
  statusCode: number = 200,
): void => {
  ResponseHelper.success(res, data, message, statusCode);
};

/**
 * Helper para respuestas de error (backward compatibility)
 */
export const errorResponse = (res: Response, error: any): void => {
  const statusCode = error.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    error: {
      message: error.message || "Internal server error",
      code: error.code || "INTERNAL_ERROR",
      ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
    },
  });
};

/**
 * Handler principal de errores (backward compatibility)
 */
export const mainErrorHandler = errorHandler.expressHandler;

/**
 * Handler para rutas no encontradas (backward compatibility)
 */
export const notFoundHandler = errorHandler.notFoundHandler;
