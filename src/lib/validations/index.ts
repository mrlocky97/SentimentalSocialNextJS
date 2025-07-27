/**
 * Validation Schemas
 * Input validation following Single Responsibility Principle
 */

// Simple validation functions (you can replace with Zod, Joi, etc.)

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export class Validator {
  static email(email: string): ValidationResult {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = emailRegex.test(email);

    return {
      isValid,
      errors: isValid ? [] : ['Invalid email format'],
    };
  }

  static username(username: string): ValidationResult {
    const errors: string[] = [];

    if (username.length < 3) {
      errors.push('Username must be at least 3 characters long');
    }

    if (username.length > 30) {
      errors.push('Username must be less than 30 characters');
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      errors.push('Username can only contain letters, numbers, and underscores');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  static password(password: string): ValidationResult {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (password.length > 128) {
      errors.push('Password must be less than 128 characters');
    }

    if (!/(?=.*[a-z])/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/(?=.*[A-Z])/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/(?=.*\d)/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/(?=.*[@$!%*?&])/.test(password)) {
      errors.push('Password must contain at least one special character');
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
