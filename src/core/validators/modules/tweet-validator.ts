/**
 * Tweet Validator Module
 * Specialized validator for tweet data structures
 */

import {
  BaseValidator,
  ValidationOptions,
  ValidationResult,
} from "./base-validator";

/**
 * Validador especializado para tweets
 */
export class TweetValidator extends BaseValidator {
  /**
   * Valida objeto tweet completo
   */
  static validate(
    tweet: any,
    options: ValidationOptions = {},
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validaciones básicas
    errors.push(...this.validateRequired(tweet, "tweet"));

    if (!tweet) {
      return this.createErrorResult(errors, warnings);
    }

    // Validar estructura básica
    errors.push(...this.validateBasicStructure(tweet));

    // Validar contenido
    errors.push(...this.validateContent(tweet, options));

    // Validar autor
    errors.push(...this.validateAuthor(tweet.author));

    // Validar métricas opcionales
    if (tweet.metrics) {
      errors.push(...this.validateMetrics(tweet.metrics));
    }

    // Validar arrays opcionales
    errors.push(...this.validateOptionalArrays(tweet));

    // Generar warnings
    warnings.push(...this.generateWarnings(tweet));

    return errors.length > 0
      ? this.createErrorResult(errors, warnings)
      : { isValid: true, errors: [], warnings };
  }

  /**
   * Valida estructura básica del tweet
   */
  private static validateBasicStructure(tweet: any): string[] {
    const errors: string[] = [];

    // Validar ID
    if (!tweet.id && !tweet.tweetId) {
      errors.push("Tweet must have an id or tweetId");
    } else if (tweet.id === "" && tweet.tweetId === "") {
      errors.push("Tweet ID cannot be empty");
    }

    return errors;
  }

  /**
   * Valida contenido del tweet
   */
  private static validateContent(
    tweet: any,
    options: ValidationOptions,
  ): string[] {
    const errors: string[] = [];
    const content = tweet.content || tweet.text;

    if (!content) {
      errors.push("Tweet must have content or text");
      return errors;
    }

    errors.push(
      ...this.validateStringLength(content, "content", {
        min: options.minLength || 1,
        max: options.maxLength || 5000,
      }),
    );

    return errors;
  }

  /**
   * Valida autor del tweet
   */
  private static validateAuthor(author: any): string[] {
    const errors: string[] = [];

    if (!author) {
      errors.push("Tweet must have author information");
      return errors;
    }

    if (!author.username) {
      errors.push("Author must have username");
    } else {
      errors.push(
        ...this.validateStringLength(author.username, "author.username", {
          min: 1,
          max: 50,
        }),
      );
    }

    if (author.followersCount !== undefined) {
      errors.push(
        ...this.validateNumberRange(
          author.followersCount,
          "author.followersCount",
          {
            min: 0,
            max: 1000000000,
          },
        ),
      );
    }

    return errors;
  }

  /**
   * Valida métricas del tweet
   */
  private static validateMetrics(metrics: any): string[] {
    const errors: string[] = [];

    const numericFields = ["likes", "retweets", "replies", "quotes", "views"];

    for (const field of numericFields) {
      if (metrics[field] !== undefined) {
        errors.push(
          ...this.validateNumberRange(metrics[field], `metrics.${field}`, {
            min: 0,
            max: 1000000000,
          }),
        );
      }
    }

    return errors;
  }

  /**
   * Valida arrays opcionales
   */
  private static validateOptionalArrays(tweet: any): string[] {
    const errors: string[] = [];
    const arrayFields = ["hashtags", "mentions", "urls", "mediaUrls"];

    for (const field of arrayFields) {
      if (tweet[field] && !Array.isArray(tweet[field])) {
        errors.push(`${field} must be an array`);
      }
    }

    return errors;
  }

  /**
   * Genera warnings para contenido sospechoso
   */
  private static generateWarnings(tweet: any): string[] {
    const warnings: string[] = [];
    const content = tweet.content || tweet.text;

    if (content) {
      if (content.length > 280) {
        warnings.push("Tweet content exceeds typical Twitter character limit");
      }

      if (this.isSpamlike(content)) {
        warnings.push("Tweet content appears spam-like");
      }
    }

    return warnings;
  }

  /**
   * Detecta contenido tipo spam
   */
  private static isSpamlike(content: string): boolean {
    const spamPatterns = [
      /(.)\1{5,}/, // Caracteres repetidos
      /^[A-Z\s!]+$/, // Solo mayúsculas
      /(https?:\/\/[^\s]+.*){3,}/, // Múltiples URLs
    ];

    return spamPatterns.some((pattern) => pattern.test(content));
  }

  /**
   * Valida lote de tweets
   */
  static validateBatch(
    tweets: any[],
    options: ValidationOptions = {},
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!Array.isArray(tweets)) {
      return this.createErrorResult(["Tweets must be an array"]);
    }

    if (tweets.length === 0) {
      warnings.push("Empty tweet batch provided");
    }

    for (let i = 0; i < tweets.length; i++) {
      const result = this.validate(tweets[i], options);

      if (!result.isValid) {
        errors.push(...result.errors.map((error) => `Tweet ${i}: ${error}`));
      }

      warnings.push(
        ...result.warnings.map((warning) => `Tweet ${i}: ${warning}`),
      );
    }

    return errors.length > 0
      ? this.createErrorResult(errors, warnings)
      : { isValid: true, errors: [], warnings };
  }
}
