/**
 * Core Validators Module
 * Validadores centralizados para toda la aplicación
 */

import { SentimentErrors } from '../errors';

/**
 * Resultado de validación
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Opciones de validación
 */
export interface ValidationOptions {
  strict?: boolean;
  allowEmpty?: boolean;
  maxLength?: number;
  minLength?: number;
}

/**
 * Validador base
 */
export abstract class BaseValidator {
  /**
   * Crea resultado de validación exitoso
   */
  protected static createSuccessResult(): ValidationResult {
    return {
      isValid: true,
      errors: [],
      warnings: [],
    };
  }

  /**
   * Crea resultado de validación con errores
   */
  protected static createErrorResult(errors: string[], warnings: string[] = []): ValidationResult {
    return {
      isValid: false,
      errors,
      warnings,
    };
  }

  /**
   * Valida que un valor no sea nulo o indefinido
   */
  protected static validateRequired(value: any, fieldName: string): string[] {
    const errors: string[] = [];

    if (value === null || value === undefined) {
      errors.push(`${fieldName} is required`);
    }

    return errors;
  }

  /**
   * Valida longitud de string
   */
  protected static validateStringLength(
    value: string,
    fieldName: string,
    options: { min?: number; max?: number } = {}
  ): string[] {
    const errors: string[] = [];

    if (typeof value !== 'string') {
      errors.push(`${fieldName} must be a string`);
      return errors;
    }

    if (options.min && value.length < options.min) {
      errors.push(`${fieldName} must be at least ${options.min} characters long`);
    }

    if (options.max && value.length > options.max) {
      errors.push(`${fieldName} must be no more than ${options.max} characters long`);
    }

    return errors;
  }

  /**
   * Valida que un número esté en un rango
   */
  protected static validateNumberRange(
    value: number,
    fieldName: string,
    min?: number,
    max?: number
  ): string[] {
    const errors: string[] = [];

    if (typeof value !== 'number' || isNaN(value)) {
      errors.push(`${fieldName} must be a valid number`);
      return errors;
    }

    if (min !== undefined && value < min) {
      errors.push(`${fieldName} must be at least ${min}`);
    }

    if (max !== undefined && value > max) {
      errors.push(`${fieldName} must be no more than ${max}`);
    }

    return errors;
  }

  /**
   * Valida que un valor esté en una lista de opciones válidas
   */
  protected static validateEnum<T>(value: T, fieldName: string, validOptions: T[]): string[] {
    const errors: string[] = [];

    if (!validOptions.includes(value)) {
      errors.push(`${fieldName} must be one of: ${validOptions.join(', ')}`);
    }

    return errors;
  }

  /**
   * Valida formato de email
   */
  protected static validateEmail(email: string, fieldName: string = 'email'): string[] {
    const errors: string[] = [];

    if (typeof email !== 'string') {
      errors.push(`${fieldName} must be a string`);
      return errors;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.push(`${fieldName} must be a valid email address`);
    }

    return errors;
  }

  /**
   * Valida URL
   */
  protected static validateURL(url: string, fieldName: string = 'url'): string[] {
    const errors: string[] = [];

    if (typeof url !== 'string') {
      errors.push(`${fieldName} must be a string`);
      return errors;
    }

    try {
      new URL(url);
    } catch {
      errors.push(`${fieldName} must be a valid URL`);
    }

    return errors;
  }
}

/**
 * Validador para tweets
 */
export class TweetValidator extends BaseValidator {
  /**
   * Valida objeto tweet completo
   */
  static validate(tweet: any, options: ValidationOptions = {}): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validaciones básicas
    errors.push(...this.validateRequired(tweet, 'tweet'));

    if (!tweet) {
      return this.createErrorResult(errors, warnings);
    }

    // Validar ID
    if (!tweet.id && !tweet.tweetId) {
      errors.push('Tweet must have an id or tweetId');
    } else if (tweet.id === '' && tweet.tweetId === '') {
      errors.push('Tweet ID cannot be empty');
    }

    // Validar contenido
    const content = tweet.content || tweet.text;
    if (!content) {
      errors.push('Tweet must have content or text');
    } else {
      errors.push(
        ...this.validateStringLength(content, 'content', {
          min: options.minLength || 1,
          max: options.maxLength || 5000,
        })
      );

      // Advertencias para contenido sospechoso
      if (content.length > 280) {
        warnings.push('Tweet content exceeds typical Twitter character limit');
      }

      if (this.isSpamlike(content)) {
        warnings.push('Tweet content appears spam-like');
      }
    }

    // Validar autor
    if (!tweet.author) {
      errors.push('Tweet must have author information');
    } else {
      const authorErrors = this.validateAuthor(tweet.author);
      errors.push(...authorErrors);
    }

    // Validar métricas
    if (tweet.metrics) {
      const metricsErrors = this.validateMetrics(tweet.metrics);
      errors.push(...metricsErrors);
    }

    // Validar arrays opcionales
    if (tweet.hashtags && !Array.isArray(tweet.hashtags)) {
      errors.push('hashtags must be an array');
    }

    if (tweet.mentions && !Array.isArray(tweet.mentions)) {
      errors.push('mentions must be an array');
    }

    if (tweet.urls && !Array.isArray(tweet.urls)) {
      errors.push('urls must be an array');
    }

    return errors.length > 0
      ? this.createErrorResult(errors, warnings)
      : this.createSuccessResult();
  }

  /**
   * Valida autor del tweet
   */
  private static validateAuthor(author: any): string[] {
    const errors: string[] = [];

    if (!author.username) {
      errors.push('Author must have username');
    } else {
      errors.push(
        ...this.validateStringLength(author.username, 'author.username', { min: 1, max: 50 })
      );
    }

    if (author.followersCount !== undefined) {
      errors.push(...this.validateNumberRange(author.followersCount, 'author.followersCount', 0));
    }

    if (author.followingCount !== undefined) {
      errors.push(...this.validateNumberRange(author.followingCount, 'author.followingCount', 0));
    }

    return errors;
  }

  /**
   * Valida métricas del tweet
   */
  private static validateMetrics(metrics: any): string[] {
    const errors: string[] = [];

    if (metrics.likes !== undefined) {
      errors.push(...this.validateNumberRange(metrics.likes, 'metrics.likes', 0));
    }

    if (metrics.retweets !== undefined) {
      errors.push(...this.validateNumberRange(metrics.retweets, 'metrics.retweets', 0));
    }

    if (metrics.replies !== undefined) {
      errors.push(...this.validateNumberRange(metrics.replies, 'metrics.replies', 0));
    }

    return errors;
  }

  /**
   * Detecta contenido spam-like
   */
  private static isSpamlike(content: string): boolean {
    const text = content.toLowerCase();

    // Demasiados hashtags
    const hashtagCount = (text.match(/#/g) || []).length;
    if (hashtagCount > 10) return true;

    // Demasiadas URLs
    const urlCount = (text.match(/https?:\/\//g) || []).length;
    if (urlCount > 3) return true;

    // Repetición excesiva
    const words = text.split(/\s+/);
    const uniqueWords = new Set(words);
    if (words.length > 10 && uniqueWords.size / words.length < 0.3) return true;

    return false;
  }

  /**
   * Valida lote de tweets
   */
  static validateBatch(tweets: any[], options: ValidationOptions = {}): ValidationResult {
    if (!Array.isArray(tweets)) {
      return this.createErrorResult(['Input must be an array of tweets']);
    }

    if (tweets.length === 0) {
      return this.createErrorResult(['Array cannot be empty']);
    }

    if (tweets.length > 100) {
      return this.createErrorResult([`Maximum 100 tweets allowed, received ${tweets.length}`]);
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    tweets.forEach((tweet, index) => {
      const result = this.validate(tweet, options);
      if (!result.isValid) {
        errors.push(...result.errors.map((error) => `Tweet ${index}: ${error}`));
      }
      warnings.push(...result.warnings.map((warning) => `Tweet ${index}: ${warning}`));
    });

    return errors.length > 0
      ? this.createErrorResult(errors, warnings)
      : this.createSuccessResult();
  }
}

/**
 * Validador para análisis de sentimiento
 */
export class SentimentAnalysisValidator extends BaseValidator {
  /**
   * Valida texto para análisis
   */
  static validateText(text: any, options: ValidationOptions = {}): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validar que existe
    errors.push(...this.validateRequired(text, 'text'));

    if (!text) {
      return this.createErrorResult(errors, warnings);
    }

    // Validar que es string
    if (typeof text !== 'string') {
      errors.push('Text must be a string');
      return this.createErrorResult(errors, warnings);
    }

    // Validar longitud
    errors.push(
      ...this.validateStringLength(text, 'text', {
        min: options.minLength || 1,
        max: options.maxLength || 5000,
      })
    );

    // Advertencias
    if (text.trim().length < 3) {
      warnings.push('Very short text may not provide accurate sentiment analysis');
    }

    if (text.length > 1000) {
      warnings.push('Long text may be truncated during analysis');
    }

    if (!/[a-zA-Z]/.test(text)) {
      warnings.push('Text contains no alphabetic characters');
    }

    return errors.length > 0
      ? this.createErrorResult(errors, warnings)
      : this.createSuccessResult();
  }

  /**
   * Valida método de análisis
   */
  static validateMethod(method: any): ValidationResult {
    const validMethods = ['rule', 'naive', 'hybrid', 'advanced'];
    const errors = this.validateEnum(method, 'method', validMethods);

    return errors.length > 0 ? this.createErrorResult(errors) : this.createSuccessResult();
  }

  /**
   * Valida datos de entrenamiento
   */
  static validateTrainingData(examples: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!Array.isArray(examples)) {
      return this.createErrorResult(['Training data must be an array']);
    }

    if (examples.length === 0) {
      return this.createErrorResult(['Training data cannot be empty']);
    }

    if (examples.length < 10) {
      warnings.push('Training data should have at least 10 examples for better accuracy');
    }

    const labelCounts = { positive: 0, negative: 0, neutral: 0 };

    examples.forEach((example, index) => {
      if (!example.text || typeof example.text !== 'string') {
        errors.push(`Example ${index}: text is required and must be a string`);
      }

      if (!example.label) {
        errors.push(`Example ${index}: label is required`);
      } else {
        const validLabels = ['positive', 'negative', 'neutral'];
        if (!validLabels.includes(example.label)) {
          errors.push(`Example ${index}: label must be one of ${validLabels.join(', ')}`);
        } else {
          labelCounts[example.label as keyof typeof labelCounts]++;
        }
      }
    });

    // Verificar balance de datos
    const total = examples.length;
    Object.entries(labelCounts).forEach(([label, count]) => {
      const percentage = (count / total) * 100;
      if (percentage < 20) {
        warnings.push(
          `Label '${label}' represents only ${percentage.toFixed(1)}% of training data`
        );
      }
    });

    return errors.length > 0
      ? this.createErrorResult(errors, warnings)
      : this.createSuccessResult();
  }
}

/**
 * Validador para parámetros de API
 */
export class APIValidator extends BaseValidator {
  /**
   * Valida parámetros de paginación
   */
  static validatePagination(page?: any, limit?: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (page !== undefined) {
      if (typeof page !== 'number' || page < 1) {
        errors.push('Page must be a positive integer');
      }
    }

    if (limit !== undefined) {
      if (typeof limit !== 'number' || limit < 1) {
        errors.push('Limit must be a positive integer');
      } else if (limit > 100) {
        errors.push('Limit cannot exceed 100');
      } else if (limit > 50) {
        warnings.push('Large page sizes may impact performance');
      }
    }

    return errors.length > 0
      ? this.createErrorResult(errors, warnings)
      : this.createSuccessResult();
  }

  /**
   * Valida filtros de búsqueda
   */
  static validateSearchFilters(filters: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!filters) {
      return this.createSuccessResult();
    }

    if (filters.startDate && filters.endDate) {
      const start = new Date(filters.startDate);
      const end = new Date(filters.endDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        errors.push('Invalid date format in filters');
      } else if (start > end) {
        errors.push('Start date cannot be after end date');
      } else if (end.getTime() - start.getTime() > 90 * 24 * 60 * 60 * 1000) {
        warnings.push('Date range exceeds 90 days, consider narrowing for better performance');
      }
    }

    if (filters.sentiment) {
      const validSentiments = ['positive', 'negative', 'neutral'];
      if (!validSentiments.includes(filters.sentiment)) {
        errors.push(`Sentiment filter must be one of: ${validSentiments.join(', ')}`);
      }
    }

    return errors.length > 0
      ? this.createErrorResult(errors, warnings)
      : this.createSuccessResult();
  }
}

/**
 * Utilidades de validación
 */
export class ValidationUtils {
  /**
   * Combina múltiples resultados de validación
   */
  static combineResults(...results: ValidationResult[]): ValidationResult {
    const allErrors = results.flatMap((r) => r.errors);
    const allWarnings = results.flatMap((r) => r.warnings);

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings,
    };
  }

  /**
   * Convierte resultado de validación a error de aplicación
   */
  static resultToError(result: ValidationResult, context?: string) {
    if (result.isValid) return null;

    const message = context
      ? `Validation failed for ${context}: ${result.errors.join(', ')}`
      : `Validation failed: ${result.errors.join(', ')}`;

    return SentimentErrors.invalidText(message);
  }

  /**
   * Valida y lanza error si no es válido
   */
  static validateOrThrow(result: ValidationResult, context?: string): void {
    if (!result.isValid) {
      const error = this.resultToError(result, context);
      if (error) throw error;
    }
  }
}
