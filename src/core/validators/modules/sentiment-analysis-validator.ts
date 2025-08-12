/**
 * Sentiment Analysis Validator Module
 * Specialized validator for sentiment analysis requests and results
 */

import { Label } from '../../../enums/sentiment.enum';
import { BaseValidator, ValidationOptions, ValidationResult } from './base-validator';

/**
 * Validador especializado para análisis de sentimientos
 */
export class SentimentAnalysisValidator extends BaseValidator {
  /**
   * Valida request de análisis de sentimientos
   */
  static validateAnalysisRequest(request: any, options: ValidationOptions = {}): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validar request básico
    errors.push(...this.validateRequired(request, 'analysis request'));

    if (!request) {
      return this.createErrorResult(errors, warnings);
    }

    // Validar texto
    if (request.text) {
      errors.push(...this.validateText(request.text, options));
    } else if (request.texts && Array.isArray(request.texts)) {
      errors.push(...this.validateTextArray(request.texts, options));
    } else {
      errors.push('Request must contain either text or texts array');
    }

    // Validar opciones
    if (request.options) {
      errors.push(...this.validateAnalysisOptions(request.options));
    }

    return errors.length > 0
      ? this.createErrorResult(errors, warnings)
      : { isValid: true, errors: [], warnings };
  }

  /**
   * Valida resultado de análisis de sentimientos
   */
  static validateAnalysisResult(result: any, options: ValidationOptions = {}): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    errors.push(...this.validateRequired(result, 'analysis result'));

    if (!result) {
      return this.createErrorResult(errors, warnings);
    }

    // Validar sentimiento
    if (!result.sentiment) {
      errors.push('Result must have sentiment property');
    } else {
      errors.push(...this.validateEnum(result.sentiment, 'sentiment', Object.values(Label)));
    }

    // Validar confianza
    if (result.confidence !== undefined) {
      errors.push(...this.validateNumberRange(result.confidence, 'confidence', { min: 0, max: 1 }));
    }

    // Validar scores detallados
    if (result.scores) {
      errors.push(...this.validateScores(result.scores));
    }

    return errors.length > 0
      ? this.createErrorResult(errors, warnings)
      : { isValid: true, errors: [], warnings };
  }

  /**
   * Valida texto para análisis
   */
  private static validateText(text: string, options: ValidationOptions): string[] {
    const errors: string[] = [];

    errors.push(
      ...this.validateStringLength(text, 'text', {
        min: options.minLength || 1,
        max: options.maxLength || 10000,
      })
    );

    return errors;
  }

  /**
   * Valida array de textos
   */
  private static validateTextArray(texts: any[], options: ValidationOptions): string[] {
    const errors: string[] = [];

    if (texts.length === 0) {
      errors.push('Texts array cannot be empty');
      return errors;
    }

    if (texts.length > 1000) {
      errors.push('Too many texts in batch (max 1000)');
    }

    for (let i = 0; i < texts.length; i++) {
      if (typeof texts[i] !== 'string') {
        errors.push(`Text at index ${i} must be a string`);
      } else {
        errors.push(...this.validateText(texts[i], options).map((error) => `Text ${i}: ${error}`));
      }
    }

    return errors;
  }

  /**
   * Valida opciones de análisis
   */
  private static validateAnalysisOptions(options: any): string[] {
    const errors: string[] = [];

    if (options.language && typeof options.language !== 'string') {
      errors.push('Language option must be a string');
    }

    if (options.model && typeof options.model !== 'string') {
      errors.push('Model option must be a string');
    }

    if (options.threshold !== undefined) {
      errors.push(...this.validateNumberRange(options.threshold, 'threshold', { min: 0, max: 1 }));
    }

    return errors;
  }

  /**
   * Valida scores de sentimientos
   */
  private static validateScores(scores: any): string[] {
    const errors: string[] = [];

    const requiredScores = ['positive', 'negative', 'neutral'];

    for (const score of requiredScores) {
      if (scores[score] === undefined) {
        errors.push(`Scores must include ${score} value`);
      } else {
        errors.push(
          ...this.validateNumberRange(scores[score], `scores.${score}`, { min: 0, max: 1 })
        );
      }
    }

    // Validar que los scores sumen aproximadamente 1
    const total = scores.positive + scores.negative + scores.neutral;
    if (Math.abs(total - 1) > 0.01) {
      errors.push('Sentiment scores should sum to approximately 1.0');
    }

    return errors;
  }

  /**
   * Valida configuración de modelo
   */
  static validateModelConfig(config: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    errors.push(...this.validateRequired(config, 'model config'));

    if (!config) {
      return this.createErrorResult(errors, warnings);
    }

    // Validar configuraciones específicas
    if (config.type) {
      const validTypes = ['naive-bayes', 'svm', 'neural', 'hybrid'];
      errors.push(...this.validateEnum(config.type, 'type', validTypes));
    }

    if (config.threshold !== undefined) {
      errors.push(...this.validateNumberRange(config.threshold, 'threshold', { min: 0, max: 1 }));
    }

    if (config.features && !Array.isArray(config.features)) {
      errors.push('Features must be an array');
    }

    return errors.length > 0
      ? this.createErrorResult(errors, warnings)
      : { isValid: true, errors: [], warnings };
  }
}
