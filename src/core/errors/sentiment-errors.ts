/**
 * Sentiment Analysis Specific Errors
 * Errores especializados para operaciones de análisis de sentimiento
 */

import {
  BusinessLogicError,
  ErrorCode,
  InternalServerError,
  NotFoundError,
  ServiceUnavailableError,
  ValidationError,
} from "./error-types";

/**
 * Factory para crear errores específicos de análisis de sentimiento
 */
export class SentimentAnalysisErrorFactory {
  /**
   * Error de tweet inválido
   */
  static invalidTweet(details?: any): ValidationError {
    return new ValidationError(
      "Tweet object with content is required",
      ErrorCode.INVALID_TWEET_FORMAT,
      {
        operation: "tweet_validation",
        component: "sentiment_analysis",
        additionalData: details,
      },
      [
        "Ensure tweet object contains required fields: id, content, author",
        "Verify tweet content is not empty",
        "Check tweet author information is complete",
      ],
    );
  }

  /**
   * Error de texto inválido
   */
  static invalidText(text?: string): ValidationError {
    return new ValidationError(
      "Text string is required and cannot be empty",
      ErrorCode.INVALID_TEXT_FORMAT,
      {
        operation: "text_validation",
        component: "sentiment_analysis",
        additionalData: { providedText: text?.substring(0, 50) || "null" },
      },
      [
        "Provide a non-empty text string",
        "Text should contain at least 3 characters",
        "Remove excessive whitespace",
      ],
    );
  }

  /**
   * Error de lote inválido
   */
  static invalidBatch(
    receivedCount?: number,
    maxAllowed: number = 100,
  ): ValidationError {
    const message =
      receivedCount && receivedCount > maxAllowed
        ? `Maximum ${maxAllowed} items allowed per batch. Received: ${receivedCount}`
        : "Array of items is required for batch processing";

    return new ValidationError(
      message,
      ErrorCode.INVALID_BATCH_SIZE,
      {
        operation: "batch_validation",
        component: "sentiment_analysis",
        additionalData: { receivedCount, maxAllowed },
      },
      [
        `Split batch into smaller chunks of ${maxAllowed} items or less`,
        "Ensure array is not empty",
        "Verify all items in batch are valid",
      ],
    );
  }

  /**
   * Error de datos de entrenamiento inválidos
   */
  static invalidTrainingData(examples?: any[]): ValidationError {
    return new ValidationError(
      "Training data must be an array of examples with text and label",
      ErrorCode.INVALID_TRAINING_DATA,
      {
        operation: "training_validation",
        component: "sentiment_analysis",
        additionalData: { providedExamples: examples?.length || 0 },
      },
      [
        "Provide array of training examples",
        'Each example must have "text" and "label" fields',
        "Label must be one of: positive, negative, neutral",
        "Text must be non-empty string",
      ],
    );
  }

  /**
   * Error de método de sentimiento inválido
   */
  static invalidSentimentMethod(method: string): ValidationError {
    return new ValidationError(
      `Invalid sentiment analysis method: ${method}`,
      ErrorCode.INVALID_SENTIMENT_METHOD,
      {
        operation: "method_validation",
        component: "sentiment_analysis",
        additionalData: { providedMethod: method },
      },
      [
        "Use one of the supported methods: rule, naive, hybrid",
        "Check method name spelling",
        "Verify method is available in current configuration",
      ],
    );
  }

  /**
   * Error de procesamiento del modelo
   */
  static modelProcessingError(
    operation: string,
    originalError: Error,
  ): BusinessLogicError {
    return new BusinessLogicError(
      `Failed to ${operation}: ${originalError.message}`,
      ErrorCode.MODEL_PROCESSING_ERROR,
      {
        operation: `model_${operation}`,
        component: "sentiment_analysis",
        additionalData: {
          originalError: originalError.message,
          errorType: originalError.constructor.name,
        },
      },
      [
        "Check model is properly initialized",
        "Verify input data format",
        "Ensure sufficient system resources",
      ],
    );
  }

  /**
   * Error de análisis fallido
   */
  static analysisFailed(text: string, cause?: Error): BusinessLogicError {
    return new BusinessLogicError(
      "Sentiment analysis failed to process text",
      ErrorCode.ANALYSIS_FAILED,
      {
        operation: "sentiment_analysis",
        component: "sentiment_analysis",
        additionalData: {
          textLength: text.length,
          textPreview: text.substring(0, 100),
          cause: cause?.message,
        },
      },
      [
        "Try with different text input",
        "Check text encoding and special characters",
        "Retry with simplified text",
      ],
    );
  }

  /**
   * Error de entrenamiento fallido
   */
  static trainingFailed(
    exampleCount: number,
    cause?: Error,
  ): BusinessLogicError {
    return new BusinessLogicError(
      "Model training failed",
      ErrorCode.TRAINING_FAILED,
      {
        operation: "model_training",
        component: "sentiment_analysis",
        additionalData: {
          exampleCount,
          cause: cause?.message,
        },
      },
      [
        "Provide more training examples (minimum 10 per label)",
        "Ensure balanced dataset across sentiment labels",
        "Check training data quality and format",
      ],
    );
  }

  /**
   * Error de motor de análisis no disponible
   */
  static analysisEngineUnavailable(
    engineName?: string,
  ): ServiceUnavailableError {
    return new ServiceUnavailableError(
      `Sentiment analysis engine is temporarily unavailable: ${engineName || "unknown"}`,
      ErrorCode.ANALYSIS_ENGINE_UNAVAILABLE,
      {
        operation: "engine_access",
        component: "sentiment_analysis",
        additionalData: { engineName },
      },
    );
  }

  /**
   * Error de modelo no encontrado
   */
  static modelNotFound(modelName: string): NotFoundError {
    return new NotFoundError(
      `Sentiment analysis model not found: ${modelName}`,
      ErrorCode.MODEL_NOT_FOUND,
      {
        operation: "model_access",
        component: "sentiment_analysis",
        additionalData: { modelName },
      },
    );
  }

  /**
   * Error interno del motor de análisis
   */
  static engineInternalError(
    operation: string,
    cause: Error,
  ): InternalServerError {
    return new InternalServerError(
      `Internal error in sentiment analysis engine during ${operation}`,
      ErrorCode.INTERNAL_ERROR,
      {
        operation: `engine_${operation}`,
        component: "sentiment_analysis",
        additionalData: {
          engineOperation: operation,
          originalError: cause.message,
        },
      },
      cause,
    );
  }

  /**
   * Error de configuración del motor
   */
  static configurationError(
    configItem: string,
    expectedValue?: string,
  ): InternalServerError {
    return new InternalServerError(
      `Sentiment analysis configuration error: ${configItem}`,
      ErrorCode.CONFIGURATION_ERROR,
      {
        operation: "configuration_validation",
        component: "sentiment_analysis",
        additionalData: { configItem, expectedValue },
      },
    );
  }
  
  /**
   * Error genérico del modelo
   */
  static modelError(details?: any): BusinessLogicError {
    return new BusinessLogicError(
      "Model operation failed",
      ErrorCode.MODEL_PROCESSING_ERROR,
      {
        operation: "model_operation",
        component: "sentiment_analysis",
        additionalData: details,
      },
      [
        "Check model initialization parameters",
        "Verify TensorFlow dependencies are installed correctly",
        "Ensure model files are accessible",
        "Check system resources (memory, GPU availability)",
      ],
    );
  }

  /**
   * Error de array de análisis inválido
   */
  static invalidAnalysisArray(): ValidationError {
    return new ValidationError(
      "Array of sentiment analyses is required",
      ErrorCode.INVALID_INPUT,
      {
        operation: "analysis_array_validation",
        component: "sentiment_analysis",
      },
      [
        "Provide a non-empty array of sentiment analyses",
        "Ensure each analysis has required fields",
        "Verify analysis results are valid",
      ],
    );
  }
}

/**
 * Utilidades para manejo de errores de sentimiento
 */
export class SentimentErrorUtils {
  /**
   * Determina si un error es recuperable
   */
  static isRecoverable(error: Error): boolean {
    if (error instanceof ValidationError) return true;
    if (error instanceof BusinessLogicError) return true;
    if (error instanceof ServiceUnavailableError) return true;
    if (error instanceof NotFoundError) return false;
    if (error instanceof InternalServerError) return false;
    return false;
  }

  /**
   * Obtiene sugerencias de recuperación para un error
   */
  static getRecoverySuggestions(error: Error): string[] {
    if ("metadata" in error && "suggestions" in (error as any).metadata) {
      return (error as any).metadata.suggestions || [];
    }
    return [
      "Retry the operation",
      "Check input parameters",
      "Contact support if issue persists",
    ];
  }

  /**
   * Determina el tiempo de reintento recomendado
   */
  static getRetryDelay(error: Error, attemptNumber: number): number {
    if (error instanceof ValidationError) return 0; // No retry for validation errors
    if (error instanceof ServiceUnavailableError) {
      return Math.min(1000 * Math.pow(2, attemptNumber), 30000); // Exponential backoff, max 30s
    }
    if (error instanceof BusinessLogicError) return 1000; // 1 second for business logic errors
    return 5000; // 5 seconds default
  }

  /**
   * Formatea el error para logging
   */
  static formatForLogging(error: Error): Record<string, any> {
    const baseLog: Record<string, any> = {
      errorName: error.name,
      message: error.message,
      timestamp: new Date().toISOString(),
    };

    if ("metadata" in error) {
      const metadata = (error as any).metadata;
      baseLog.code = metadata.code;
      baseLog.category = metadata.category;
      baseLog.severity = metadata.severity;
      baseLog.statusCode = metadata.statusCode;
      baseLog.context = metadata.context;
    }

    if (process.env.NODE_ENV === "development") {
      baseLog.stack = error.stack;
    }

    return baseLog;
  }
}
