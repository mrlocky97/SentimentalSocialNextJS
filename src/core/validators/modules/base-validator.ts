/**
 * Base Validator Module
 * Provides foundation for all validators with common utilities
 */

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
 * Validador base con utilidades comunes
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
  protected static createErrorResult(
    errors: string[],
    warnings: string[] = [],
  ): ValidationResult {
    return {
      isValid: false,
      errors,
      warnings,
    };
  }

  /**
   * Valida que un campo sea requerido
   */
  protected static validateRequired(value: any, fieldName: string): string[] {
    const errors: string[] = [];

    if (value === undefined || value === null) {
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
    options: { min?: number; max?: number } = {},
  ): string[] {
    const errors: string[] = [];

    if (typeof value !== "string") {
      errors.push(`${fieldName} must be a string`);
      return errors;
    }

    const { min = 0, max = Infinity } = options;

    if (value.length < min) {
      errors.push(`${fieldName} must be at least ${min} characters long`);
    }

    if (value.length > max) {
      errors.push(`${fieldName} must be at most ${max} characters long`);
    }

    return errors;
  }

  /**
   * Valida rango numérico
   */
  protected static validateNumberRange(
    value: number,
    fieldName: string,
    options: { min?: number; max?: number } = {},
  ): string[] {
    const errors: string[] = [];

    if (typeof value !== "number" || isNaN(value)) {
      errors.push(`${fieldName} must be a valid number`);
      return errors;
    }

    const { min = -Infinity, max = Infinity } = options;

    if (value < min) {
      errors.push(`${fieldName} must be at least ${min}`);
    }

    if (value > max) {
      errors.push(`${fieldName} must be at most ${max}`);
    }

    return errors;
  }

  /**
   * Valida enum
   */
  protected static validateEnum<T>(
    value: any,
    fieldName: string,
    allowedValues: T[],
  ): string[] {
    const errors: string[] = [];

    if (!allowedValues.includes(value)) {
      errors.push(`${fieldName} must be one of: ${allowedValues.join(", ")}`);
    }

    return errors;
  }

  /**
   * Valida email
   */
  protected static validateEmail(value: string, fieldName: string): string[] {
    const errors: string[] = [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (typeof value !== "string") {
      errors.push(`${fieldName} must be a string`);
      return errors;
    }

    if (!emailRegex.test(value)) {
      errors.push(`${fieldName} must be a valid email address`);
    }

    return errors;
  }

  /**
   * Valida URL
   */
  protected static validateURL(value: string, fieldName: string): string[] {
    const errors: string[] = [];

    if (typeof value !== "string") {
      errors.push(`${fieldName} must be a string`);
      return errors;
    }

    try {
      new URL(value);
    } catch {
      errors.push(`${fieldName} must be a valid URL`);
    }

    return errors;
  }
}
