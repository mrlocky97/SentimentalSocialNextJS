/**
 * Core Module
 * Punto de entrada para todos los módulos core de la aplicación
 */

// Error handling system
export * from "./errors";

// Data mappers
export * from "./mappers";

// Validators
export * from "./validators";

// Convenience imports for common patterns
import {
  ApiResponse,
  SentimentErrors,
  globalErrorHandler,
  setupGlobalErrorHandlers,
} from "./errors";

import {
  APIBatchMapper,
  APITweetMapper,
  SentimentAnalysisMapper,
  TweetMapper,
  TweetNormalizer,
  TweetSentimentEnricher,
} from "./mappers";

import {
  APIValidator,
  SentimentAnalysisValidator,
  TweetValidator,
  ValidationUtils,
} from "./validators";

/**
 * Core utilities namespace
 */
export const Core = {
  // Error handling
  Errors: SentimentErrors,
  ErrorHandler: globalErrorHandler,
  Response: ApiResponse,
  setupErrorHandlers: setupGlobalErrorHandlers,

  // Data transformation
  Mappers: {
    Tweet: TweetMapper,
    TweetNormalizer,
    TweetSentimentEnricher,
    SentimentAnalysis: SentimentAnalysisMapper,
    API: {
      Tweet: APITweetMapper,
      Batch: APIBatchMapper,
    },
  },

  // Validation
  Validators: {
    Tweet: TweetValidator,
    SentimentAnalysis: SentimentAnalysisValidator,
    API: APIValidator,
    Utils: ValidationUtils,
  },
};

/**
 * Core initialization function
 */
export function initializeCore() {
  // Setup global error handlers
  setupGlobalErrorHandlers();

  console.log("🚀 Core modules initialized successfully");
  console.log("   ✅ Error handling system");
  console.log("   ✅ Data mappers");
  console.log("   ✅ Validators");
}
