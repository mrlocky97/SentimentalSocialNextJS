/**
 * Core Validators Module - Refactored
 * Modular validators with improved maintainability
 */

// Re-export all modular validators
export {
  APIValidator,
  BaseValidator,
  SentimentAnalysisValidator,
  TweetValidator,
  validateAnalysisRequest,
  validateAnalysisResult,
  validateAPIResponse,
  validateBatchRequest,
  validateTextRequest,
  validateTweet,
  validateTweetBatch,
  validateUsernameRequest,
  ValidatorFactory,
  Validators,
} from "./new-index";

export type { ValidationOptions, ValidationResult } from "./new-index";

/**
 * Main validation entry point for backward compatibility
 */
import { ValidatorFactory } from "./new-index";

export default ValidatorFactory;
