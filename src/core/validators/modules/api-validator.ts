/**
 * API Validator Module
 * Specialized validator for API requests and responses
 */

import { BaseValidator, ValidationOptions, ValidationResult } from './base-validator';

/**
 * Validador especializado para requests y responses de API
 */
export class APIValidator extends BaseValidator {
  /**
   * Valida request de análisis por username
   */
  static validateUsernameRequest(request: any, options: ValidationOptions = {}): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    errors.push(...this.validateRequired(request, 'username request'));

    if (!request) {
      return this.createErrorResult(errors, warnings);
    }

    // Validar username
    if (!request.username) {
      errors.push('Username is required');
    } else {
      errors.push(
        ...this.validateStringLength(request.username, 'username', {
          min: 1,
          max: 50,
        })
      );

      if (!/^[a-zA-Z0-9_]+$/.test(request.username)) {
        errors.push('Username contains invalid characters');
      }
    }

    // Validar count opcional
    if (request.count !== undefined) {
      errors.push(
        ...this.validateNumberRange(request.count, 'count', {
          min: 1,
          max: 100,
        })
      );
    }

    // Validar opciones
    if (request.options) {
      errors.push(...this.validateCommonOptions(request.options));
    }

    return errors.length > 0
      ? this.createErrorResult(errors, warnings)
      : { isValid: true, errors: [], warnings };
  }

  /**
   * Valida request de análisis por texto
   */
  static validateTextRequest(request: any, options: ValidationOptions = {}): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    errors.push(...this.validateRequired(request, 'text request'));

    if (!request) {
      return this.createErrorResult(errors, warnings);
    }

    // Validar texto
    if (!request.text) {
      errors.push('Text is required');
    } else {
      errors.push(
        ...this.validateStringLength(request.text, 'text', {
          min: options.minLength || 1,
          max: options.maxLength || 10000,
        })
      );
    }

    // Validar opciones
    if (request.options) {
      errors.push(...this.validateCommonOptions(request.options));
    }

    return errors.length > 0
      ? this.createErrorResult(errors, warnings)
      : { isValid: true, errors: [], warnings };
  }

  /**
   * Valida request de análisis batch
   */
  static validateBatchRequest(request: any, options: ValidationOptions = {}): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    errors.push(...this.validateRequired(request, 'batch request'));

    if (!request) {
      return this.createErrorResult(errors, warnings);
    }

    // Validar items
    if (!request.items || !Array.isArray(request.items)) {
      errors.push('Items array is required');
    } else {
      if (request.items.length === 0) {
        errors.push('Items array cannot be empty');
      }

      if (request.items.length > 100) {
        errors.push('Too many items in batch (max 100)');
      }

      // Validar cada item
      for (let i = 0; i < request.items.length; i++) {
        const item = request.items[i];

        if (item.username) {
          const usernameResult = this.validateUsernameRequest(item, options);
          if (!usernameResult.isValid) {
            errors.push(...usernameResult.errors.map((error) => `Item ${i}: ${error}`));
          }
        } else if (item.text) {
          const textResult = this.validateTextRequest(item, options);
          if (!textResult.isValid) {
            errors.push(...textResult.errors.map((error) => `Item ${i}: ${error}`));
          }
        } else {
          errors.push(`Item ${i}: Must have either username or text`);
        }
      }
    }

    return errors.length > 0
      ? this.createErrorResult(errors, warnings)
      : { isValid: true, errors: [], warnings };
  }

  /**
   * Valida response de API
   */
  static validateAPIResponse(response: any, options: ValidationOptions = {}): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    errors.push(...this.validateRequired(response, 'API response'));

    if (!response) {
      return this.createErrorResult(errors, warnings);
    }

    // Validar estructura básica
    if (response.success === undefined) {
      errors.push('Response must have success property');
    }

    if (!response.data && response.success) {
      errors.push('Successful response must have data');
    }

    if (response.error && response.success) {
      warnings.push('Response has both success=true and error property');
    }

    // Validar metadata
    if (response.metadata) {
      errors.push(...this.validateResponseMetadata(response.metadata));
    }

    return errors.length > 0
      ? this.createErrorResult(errors, warnings)
      : { isValid: true, errors: [], warnings };
  }

  /**
   * Valida opciones comunes de requests
   */
  private static validateCommonOptions(options: any): string[] {
    const errors: string[] = [];

    if (options.includeMetrics !== undefined && typeof options.includeMetrics !== 'boolean') {
      errors.push('includeMetrics must be a boolean');
    }

    if (options.language && typeof options.language !== 'string') {
      errors.push('language must be a string');
    }

    if (options.model && typeof options.model !== 'string') {
      errors.push('model must be a string');
    }

    if (options.threshold !== undefined) {
      errors.push(
        ...this.validateNumberRange(options.threshold, 'threshold', {
          min: 0,
          max: 1,
        })
      );
    }

    return errors;
  }

  /**
   * Valida metadata de response
   */
  private static validateResponseMetadata(metadata: any): string[] {
    const errors: string[] = [];

    if (metadata.processingTime !== undefined) {
      errors.push(
        ...this.validateNumberRange(metadata.processingTime, 'processingTime', {
          min: 0,
          max: 300000, // 5 minutos máximo
        })
      );
    }

    if (metadata.requestId && typeof metadata.requestId !== 'string') {
      errors.push('requestId must be a string');
    }

    if (metadata.model && typeof metadata.model !== 'string') {
      errors.push('model must be a string');
    }

    if (metadata.confidence !== undefined) {
      errors.push(
        ...this.validateNumberRange(metadata.confidence, 'confidence', {
          min: 0,
          max: 1,
        })
      );
    }

    return errors;
  }

  /**
   * Valida query parameters de GET requests
   */
  static validateQueryParams(params: any, allowedParams: string[] = []): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!params) {
      return { isValid: true, errors: [], warnings };
    }

    // Validar parámetros permitidos
    const paramKeys = Object.keys(params);

    for (const key of paramKeys) {
      if (allowedParams.length > 0 && !allowedParams.includes(key)) {
        warnings.push(`Unknown parameter: ${key}`);
      }
    }

    // Validar parámetros comunes
    if (params.limit !== undefined) {
      const limit = parseInt(params.limit);
      if (isNaN(limit) || limit < 1 || limit > 100) {
        errors.push('limit must be a number between 1 and 100');
      }
    }

    if (params.offset !== undefined) {
      const offset = parseInt(params.offset);
      if (isNaN(offset) || offset < 0) {
        errors.push('offset must be a non-negative number');
      }
    }

    return errors.length > 0
      ? this.createErrorResult(errors, warnings)
      : { isValid: true, errors: [], warnings };
  }
}
