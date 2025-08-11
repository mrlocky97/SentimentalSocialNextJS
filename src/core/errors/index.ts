/**
 * Core Errors Module
 * Punto de entrada centralizado para el sistema de errores
 */

// Error Types and Base Classes
export * from './error-types';

// Sentiment Analysis Specific Errors
export * from './sentiment-errors';

// Centralized Error Handler
export * from './error-handler';

// Convenience re-exports for common patterns
export {
  SentimentErrorUtils as ErrorUtils,
  SentimentAnalysisErrorFactory as SentimentErrors,
} from './sentiment-errors';

export {
  ResponseHelper as ApiResponse,
  errorHandler as globalErrorHandler,
  setupGlobalErrorHandlers,
} from './error-handler';
