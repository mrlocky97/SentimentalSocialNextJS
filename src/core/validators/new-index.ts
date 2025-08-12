/**
 * Validators Module Index
 * Unified export for all validator modules
 */

// Base validator
export { BaseValidator } from './modules/base-validator';
export type { ValidationOptions, ValidationResult } from './modules/base-validator';

// Specialized validators
export { APIValidator } from './modules/api-validator';
export { SentimentAnalysisValidator } from './modules/sentiment-analysis-validator';
export { TweetValidator } from './modules/tweet-validator';

/**
 * Validator factory for convenient access
 */
import { APIValidator } from './modules/api-validator';
import { BaseValidator } from './modules/base-validator';
import { SentimentAnalysisValidator } from './modules/sentiment-analysis-validator';
import { TweetValidator } from './modules/tweet-validator';

export class ValidatorFactory {
  static get tweet() {
    return TweetValidator;
  }

  static get sentiment() {
    return SentimentAnalysisValidator;
  }

  static get api() {
    return APIValidator;
  }

  static get base() {
    return BaseValidator;
  }
}

/**
 * Legacy exports for backward compatibility
 * @deprecated Use specific validator classes instead
 */
export const Validators = {
  TweetValidator,
  SentimentAnalysisValidator,
  APIValidator,
  BaseValidator,
};

// Re-export commonly used validation functions
export const validateTweet = TweetValidator.validate.bind(TweetValidator);
export const validateTweetBatch = TweetValidator.validateBatch.bind(TweetValidator);
export const validateAnalysisRequest = SentimentAnalysisValidator.validateAnalysisRequest.bind(
  SentimentAnalysisValidator
);
export const validateAnalysisResult = SentimentAnalysisValidator.validateAnalysisResult.bind(
  SentimentAnalysisValidator
);
export const validateUsernameRequest = APIValidator.validateUsernameRequest.bind(APIValidator);
export const validateTextRequest = APIValidator.validateTextRequest.bind(APIValidator);
export const validateBatchRequest = APIValidator.validateBatchRequest.bind(APIValidator);
export const validateAPIResponse = APIValidator.validateAPIResponse.bind(APIValidator);
