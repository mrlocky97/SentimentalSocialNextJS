/**
 * Validation Utilities
 * Centralized validation functions to eliminate duplicate validation logic
 */

import { CampaignType, DataSource } from '../../types/campaign';

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 */
export function isValidPassword(password: string): boolean {
  // At least 8 characters, one uppercase, one lowercase, one number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
}

/**
 * Validate MongoDB ObjectId format
 */
export function isValidObjectId(id: string): boolean {
  const objectIdRegex = /^[0-9a-fA-F]{24}$/;
  return objectIdRegex.test(id);
}

/**
 * Validate campaign type
 */
export function isValidCampaignType(type: string): type is CampaignType {
  const validTypes: CampaignType[] = ['hashtag', 'keyword', 'mention', 'competitor'];
  return validTypes.includes(type as CampaignType);
}

/**
 * Validate data source
 */
export function isValidDataSource(source: string): source is DataSource {
  const validSources: DataSource[] = ['twitter', 'instagram', 'facebook', 'tiktok', 'linkedin'];
  return validSources.includes(source as DataSource);
}

/**
 * Validate hashtag format (should start with #)
 */
export function isValidHashtag(hashtag: string): boolean {
  return hashtag.startsWith('#') && hashtag.length > 1;
}

/**
 * Validate mention format (should start with @)
 */
export function isValidMention(mention: string): boolean {
  return mention.startsWith('@') && mention.length > 1;
}

/**
 * Validate date range (start date should be before end date)
 */
export function isValidDateRange(startDate: Date | string, endDate: Date | string): boolean {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;

  return start < end;
}

/**
 * Validate language code (ISO 639-1 format)
 */
export function isValidLanguageCode(code: string): boolean {
  const languageCodeRegex = /^[a-z]{2}$/;
  return languageCodeRegex.test(code);
}

/**
 * Validate coordinates (latitude and longitude)
 */
export function isValidCoordinates(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

/**
 * Validate sentiment score (should be between -1 and 1)
 */
export function isValidSentimentScore(score: number): boolean {
  return score >= -1 && score <= 1;
}

/**
 * Validate confidence score (should be between 0 and 1)
 */
export function isValidConfidenceScore(confidence: number): boolean {
  return confidence >= 0 && confidence <= 1;
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate username format (alphanumeric, underscores, hyphens)
 */
export function isValidUsername(username: string): boolean {
  const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
  return usernameRegex.test(username);
}

/**
 * Validate array of strings is not empty and all strings are valid
 */
export function isValidStringArray(arr: string[], validator?: (item: string) => boolean): boolean {
  if (!Array.isArray(arr) || arr.length === 0) return false;

  return arr.every((item) => {
    if (typeof item !== 'string' || item.trim().length === 0) return false;
    return validator ? validator(item) : true;
  });
}

/**
 * Validate pagination parameters
 */
export function isValidPaginationParams(page: number, limit: number): boolean {
  return page > 0 && limit > 0 && limit <= 100; // Max 100 items per page
}

/**
 * Sanitize string input (remove HTML tags and trim)
 */
export function sanitizeString(input: string): string {
  return input.replace(/<[^>]*>/g, '').trim();
}

/**
 * Validate and sanitize hashtags array
 */
export function validateAndSanitizeHashtags(hashtags: string[]): string[] {
  return hashtags
    .map((tag) => {
      const sanitized = sanitizeString(tag);
      return sanitized.startsWith('#') ? sanitized : `#${sanitized}`;
    })
    .filter((tag) => isValidHashtag(tag));
}

/**
 * Validate and sanitize mentions array
 */
export function validateAndSanitizeMentions(mentions: string[]): string[] {
  return mentions
    .map((mention) => {
      const sanitized = sanitizeString(mention);
      return sanitized.startsWith('@') ? sanitized : `@${sanitized}`;
    })
    .filter((mention) => isValidMention(mention));
}

/**
 * Validate request body has required fields
 */
export function validateRequiredFields<T extends Record<string, any>>(
  body: T,
  requiredFields: (keyof T)[]
): { isValid: boolean; missingFields: string[] } {
  const missingFields: string[] = [];

  requiredFields.forEach((field) => {
    if (!(field in body) || body[field] === undefined || body[field] === null) {
      missingFields.push(field.toString());
    }
  });

  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
}
