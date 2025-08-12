/**
 * Centralized Error Handler
 * Manejador centralizado de errores con logging y respuestas HTTP
 */

import { NextFunction, Request, Response } from "express";
import {
  BaseError,
  ErrorSeverity,
  InternalServerError,
  ValidationError,
} from "./error-types";

/**
 * Configuración del manejador de errores
 */
interface ErrorHandlerConfig {
  enableDetailedErrors: boolean;
  enableStackTrace: boolean;
  enableErrorLogging: boolean;
  logLevel: "error" | "warn" | "info" | "debug";
}

/**
 * Respuesta de error estandardizada
 */
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    category: string;
    severity: string;
    timestamp: string;
    requestId?: string;
    suggestions?: string[];
    details?: any;
    stack?: string;
  };
}

/**
 * Manejador centralizado de errores
 */
export class CentralizedErrorHandler {
  private config: ErrorHandlerConfig;
  private logger: any; // Replace with your logger interface

  constructor(config: Partial<ErrorHandlerConfig> = {}) {
    this.config = {
      enableDetailedErrors: process.env.NODE_ENV === "development",
      enableStackTrace: process.env.NODE_ENV === "development",
      enableErrorLogging: true,
      logLevel: "error",
      ...config,
    };

    // Initialize logger (replace with your preferred logging library)
    this.logger = console;
  }

  /**
   * Middleware principal para Express
   */
  expressHandler = (
    err: any,
    req: Request,
    res: Response,
    next: NextFunction,
  ): void => {
    // Evitar doble procesamiento
    if (res.headersSent) {
      return next(err);
    }

    const processedError = this.processError(err, req);
    const response = this.createErrorResponse(processedError, req);

    // Log del error
    this.logError(processedError, req);

    // Enviar respuesta
    res.status(processedError.metadata.statusCode).json(response);
  };

  /**
   * Procesa y normaliza errores
   */
  private processError(error: any, req?: Request): BaseError {
    // Si ya es un BaseError, lo retornamos tal como está
    if (error instanceof BaseError) {
      return error;
    }

    // Convertir errores conocidos
    if (error.name === "ValidationError" && error.errors) {
      return new ValidationError("Validation failed", undefined, {
        operation: req?.path,
        additionalData: { validationErrors: error.errors },
      });
    }

    if (error.name === "MongoError" || error.name === "MongooseError") {
      return new InternalServerError("Database operation failed", undefined, {
        operation: req?.path,
        additionalData: { mongoError: error.code },
      });
    }

    if (error instanceof SyntaxError && "body" in error) {
      return new ValidationError("Invalid JSON format in request body");
    }

    // Error desconocido - convertir a InternalServerError
    return new InternalServerError(
      this.config.enableDetailedErrors
        ? error.message || "Internal server error"
        : "An unexpected error occurred",
      undefined,
      {
        operation: req?.path,
        additionalData: this.config.enableDetailedErrors
          ? { originalError: error }
          : undefined,
      },
      error,
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
