/**
 * Validation Schemas
 * Input validation following Single Responsibility Principle
 */

import {
  isValidEmail,
  isValidPassword,
  isValidUsername,
  isValidObjectId,
  validateRequiredFields
} from '../utils/validation.utils';

// Simple validation functions (you can replace with Zod, Joi, etc.)

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export class Validator {
  static email(email: string): ValidationResult {
    const isValid = isValidEmail(email);

    return {
      isValid,
      errors: isValid ? [] : ['Invalid email format'],
    };
  }

  static username(username: string): ValidationResult {
    const isValid = isValidUsername(username);
    const errors: string[] = [];

    if (!isValid) {
      errors.push('Username must be 3-20 characters long and contain only letters, numbers, underscores, or hyphens');
    }

    return {
      isValid,
      errors,
    };
  }

  static password(password: string): ValidationResult {
    const isValid = isValidPassword(password);
    const errors: string[] = [];

    if (!isValid) {
      errors.push('Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  static postContent(content: string): ValidationResult {
    const errors: string[] = [];

    if (!content.trim()) {
      errors.push('Post content cannot be empty');
    }

    if (content.length > 2000) {
      errors.push('Post content must be less than 2000 characters');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  static displayName(displayName: string): ValidationResult {
    const errors: string[] = [];

    if (displayName.length < 1) {
      errors.push('Display name cannot be empty');
    }

    if (displayName.length > 50) {
      errors.push('Display name must be less than 50 characters');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  static bio(bio: string): ValidationResult {
    const errors: string[] = [];

    if (bio.length > 160) {
      errors.push('Bio must be less than 160 characters');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  static pagination(page: number, limit: number): ValidationResult {
    const errors: string[] = [];

    if (page < 1) {
      errors.push('Page must be greater than 0');
    }

    if (limit < 1) {
      errors.push('Limit must be greater than 0');
    }

    if (limit > 100) {
      errors.push('Limit must be less than or equal to 100');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Composite validation for user registration
  static userRegistration(data: {
    email: string;
    username: string;
    displayName: string;
    password: string;
  }): ValidationResult {
    const validations = [
      this.email(data.email),
      this.username(data.username),
      this.displayName(data.displayName),
      this.password(data.password),
    ];

    const allErrors = validations.flatMap(v => v.errors);

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
    };
  }
}
