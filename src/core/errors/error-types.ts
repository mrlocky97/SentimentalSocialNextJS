/**
 * Core Error Types and Classes
 * Sistema centralizado de errores para toda la aplicación
 */

/**
 * Códigos de error estandardizados
 */
export enum ErrorCode {
  // Validation Errors (400)
  INVALID_INPUT = "INVALID_INPUT",
  INVALID_TWEET_FORMAT = "INVALID_TWEET_FORMAT",
  INVALID_TEXT_FORMAT = "INVALID_TEXT_FORMAT",
  INVALID_BATCH_SIZE = "INVALID_BATCH_SIZE",
  INVALID_TRAINING_DATA = "INVALID_TRAINING_DATA",
  INVALID_SENTIMENT_METHOD = "INVALID_SENTIMENT_METHOD",

  // Authentication Errors (401)
  UNAUTHORIZED = "UNAUTHORIZED",
  INVALID_TOKEN = "INVALID_TOKEN",
  TOKEN_EXPIRED = "TOKEN_EXPIRED",

  // Authorization Errors (403)
  FORBIDDEN = "FORBIDDEN",
  INSUFFICIENT_PERMISSIONS = "INSUFFICIENT_PERMISSIONS",

  // Not Found Errors (404)
  RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND",
  TWEET_NOT_FOUND = "TWEET_NOT_FOUND",
  USER_NOT_FOUND = "USER_NOT_FOUND",
  MODEL_NOT_FOUND = "MODEL_NOT_FOUND",

  // Business Logic Errors (422)
  BUSINESS_RULE_VIOLATION = "BUSINESS_RULE_VIOLATION",
  MODEL_PROCESSING_ERROR = "MODEL_PROCESSING_ERROR",
  ANALYSIS_FAILED = "ANALYSIS_FAILED",
  TRAINING_FAILED = "TRAINING_FAILED",

  // Rate Limiting (429)
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
  QUOTA_EXCEEDED = "QUOTA_EXCEEDED",

  // Internal Server Errors (500)
  INTERNAL_ERROR = "INTERNAL_ERROR",
  DATABASE_ERROR = "DATABASE_ERROR",
  EXTERNAL_SERVICE_ERROR = "EXTERNAL_SERVICE_ERROR",
  CONFIGURATION_ERROR = "CONFIGURATION_ERROR",

  // Service Unavailable (503)
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
  MODEL_UNAVAILABLE = "MODEL_UNAVAILABLE",
  ANALYSIS_ENGINE_UNAVAILABLE = "ANALYSIS_ENGINE_UNAVAILABLE",
}

/**
 * Categorías de error para logging y monitoreo
 */
export enum ErrorCategory {
  VALIDATION = "VALIDATION",
  AUTHENTICATION = "AUTHENTICATION",
  AUTHORIZATION = "AUTHORIZATION",
  BUSINESS_LOGIC = "BUSINESS_LOGIC",
  EXTERNAL_SERVICE = "EXTERNAL_SERVICE",
  INFRASTRUCTURE = "INFRASTRUCTURE",
  UNKNOWN = "UNKNOWN",
}

/**
 * Severidad del error para alertas y monitoreo
 */
export enum ErrorSeverity {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

/**
 * Contexto adicional para errores
 */
export interface ErrorContext {
  userId?: string;
  requestId?: string;
  timestamp?: string;
  operation?: string;
  component?: string;
  additionalData?: Record<string, any>;
}

/**
 * Metadatos del error para debugging
 */
export interface ErrorMetadata {
  code: ErrorCode;
  category: ErrorCategory;
  severity: ErrorSeverity;
  statusCode: number;
  isOperational: boolean;
  context?: ErrorContext;
  suggestions?: string[];
  documentation?: string;
}

/**
 * Clase base para errores de aplicación
 */
export abstract class BaseError extends Error {
  public readonly metadata: ErrorMetadata;
  public readonly timestamp: Date;

  constructor(message: string, metadata: ErrorMetadata, cause?: Error) {
    super(message);
    this.metadata = metadata;
    this.timestamp = new Date();
    this.name = this.constructor.name;

    if (cause) {
      this.stack = `${this.stack}\nCaused by: ${cause.stack}`;
    }

    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Retorna una representación JSON del error
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      metadata: this.metadata,
      timestamp: this.timestamp,
      stack: process.env.NODE_ENV === "development" ? this.stack : undefined,
    };
  }

  /**
   * Retorna si el error es operacional (esperado) o programático
   */
  isOperational(): boolean {
    return this.metadata.isOperational;
  }
}

/**
 * Error de validación (400)
 */
export class ValidationError extends BaseError {
  constructor(
    message: string,
    code: ErrorCode = ErrorCode.INVALID_INPUT,
    context?: ErrorContext,
    suggestions?: string[],
  ) {
    super(message, {
      code,
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.LOW,
      statusCode: 400,
      isOperational: true,
      context,
      suggestions,
    });
  }
}

/**
 * Error de autenticación (401)
 */
export class AuthenticationError extends BaseError {
  constructor(
    message: string,
    code: ErrorCode = ErrorCode.UNAUTHORIZED,
    context?: ErrorContext,
  ) {
    super(message, {
      code,
      category: ErrorCategory.AUTHENTICATION,
      severity: ErrorSeverity.MEDIUM,
      statusCode: 401,
      isOperational: true,
      context,
    });
  }
}

/**
 * Error de autorización (403)
 */
export class AuthorizationError extends BaseError {
  constructor(
    message: string,
    code: ErrorCode = ErrorCode.FORBIDDEN,
    context?: ErrorContext,
  ) {
    super(message, {
      code,
      category: ErrorCategory.AUTHORIZATION,
      severity: ErrorSeverity.MEDIUM,
      statusCode: 403,
      isOperational: true,
      context,
    });
  }
}

/**
 * Error de recurso no encontrado (404)
 */
export class NotFoundError extends BaseError {
  constructor(
    message: string,
    code: ErrorCode = ErrorCode.RESOURCE_NOT_FOUND,
    context?: ErrorContext,
  ) {
    super(message, {
      code,
      category: ErrorCategory.BUSINESS_LOGIC,
      severity: ErrorSeverity.LOW,
      statusCode: 404,
      isOperational: true,
      context,
    });
  }
}

/**
 * Error de lógica de negocio (422)
 */
export class BusinessLogicError extends BaseError {
  constructor(
    message: string,
    code: ErrorCode = ErrorCode.BUSINESS_RULE_VIOLATION,
    context?: ErrorContext,
    suggestions?: string[],
  ) {
    super(message, {
      code,
      category: ErrorCategory.BUSINESS_LOGIC,
      severity: ErrorSeverity.MEDIUM,
      statusCode: 422,
      isOperational: true,
      context,
      suggestions,
    });
  }
}

/**
 * Error de límite de tasa (429)
 */
export class RateLimitError extends BaseError {
  constructor(
    message: string,
    code: ErrorCode = ErrorCode.RATE_LIMIT_EXCEEDED,
    context?: ErrorContext,
  ) {
    super(message, {
      code,
      category: ErrorCategory.INFRASTRUCTURE,
      severity: ErrorSeverity.MEDIUM,
      statusCode: 429,
      isOperational: true,
      context,
    });
  }
}

/**
 * Error de servidor interno (500)
 */
export class InternalServerError extends BaseError {
  constructor(
    message: string,
    code: ErrorCode = ErrorCode.INTERNAL_ERROR,
    context?: ErrorContext,
    cause?: Error,
  ) {
    super(
      message,
      {
        code,
        category: ErrorCategory.INFRASTRUCTURE,
        severity: ErrorSeverity.HIGH,
        statusCode: 500,
        isOperational: false,
        context,
      },
      cause,
    );
  }
}

/**
 * Error de servicio no disponible (503)
 */
export class ServiceUnavailableError extends BaseError {
  constructor(
    message: string,
    code: ErrorCode = ErrorCode.SERVICE_UNAVAILABLE,
    context?: ErrorContext,
  ) {
    super(message, {
      code,
      category: ErrorCategory.EXTERNAL_SERVICE,
      severity: ErrorSeverity.HIGH,
      statusCode: 503,
      isOperational: true,
      context,
    });
  }
}
