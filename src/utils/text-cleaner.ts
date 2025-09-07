/**
 * Text Cleaning Utilities for Tweet Content Processing
 * Provides comprehensive text cleaning and normalization functions
 */

/**
 * Interface for text cleaning options
 */
export interface TextCleaningOptions {
  // Basic cleaning
  removeExtraSpaces?: boolean;
  trimWhitespace?: boolean;
  normalizeLineBreaks?: boolean;
  
  // Character cleaning
  removeEmojis?: boolean;
  removeSpecialChars?: boolean;
  normalizeUnicode?: boolean;
  
  // URL and mentions
  removeUrls?: boolean;
  removeMentions?: boolean;
  removeHashtags?: boolean;
  
  // Text formatting
  toLowerCase?: boolean;
  removeAccents?: boolean;
  preserveOriginalSpacing?: boolean;
  
  // Advanced cleaning
  removeRepeatedChars?: boolean;
  fixTypos?: boolean;
  removeStopWords?: boolean;
}

/**
 * Default cleaning options for tweet content
 */
export const DEFAULT_TWEET_CLEANING: TextCleaningOptions = {
  removeExtraSpaces: true,
  trimWhitespace: true,
  normalizeLineBreaks: true,
  removeEmojis: false, // Keep emojis for sentiment analysis
  removeSpecialChars: false,
  normalizeUnicode: true,
  removeUrls: false, // URLs are handled separately
  removeMentions: false, // Mentions are handled separately
  removeHashtags: false, // Hashtags are handled separately
  toLowerCase: false, // Preserve original case for better readability
  removeAccents: false,
  preserveOriginalSpacing: false,
  removeRepeatedChars: true,
  fixTypos: false,
  removeStopWords: false,
};

/**
 * Aggressive cleaning options for analytics processing
 */
export const AGGRESSIVE_CLEANING: TextCleaningOptions = {
  removeExtraSpaces: true,
  trimWhitespace: true,
  normalizeLineBreaks: true,
  removeEmojis: true,
  removeSpecialChars: true,
  normalizeUnicode: true,
  removeUrls: true,
  removeMentions: true,
  removeHashtags: true,
  toLowerCase: true,
  removeAccents: true,
  preserveOriginalSpacing: false,
  removeRepeatedChars: true,
  fixTypos: false,
  removeStopWords: true,
};

/**
 * Clean tweet content with specified options
 */
export function cleanTweetContent(
  content: string,
  options: TextCleaningOptions = DEFAULT_TWEET_CLEANING,
): string {
  if (!content || typeof content !== 'string') {
    return '';
  }

  let cleanedContent = content;

  // Basic cleaning
  if (options.trimWhitespace) {
    cleanedContent = cleanedContent.trim();
  }

  if (options.normalizeLineBreaks) {
    cleanedContent = cleanedContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  }

  if (options.normalizeUnicode) {
    cleanedContent = cleanedContent.normalize('NFC');
  }

  // Remove URLs
  if (options.removeUrls) {
    cleanedContent = cleanedContent.replace(
      /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/g,
      '',
    );
    // Remove t.co links and similar
    cleanedContent = cleanedContent.replace(/\bt\.co\/\w+/g, '');
    cleanedContent = cleanedContent.replace(/\bbit\.ly\/\w+/g, '');
  }

  // Remove mentions
  if (options.removeMentions) {
    cleanedContent = cleanedContent.replace(/@\w+/g, '');
  }

  // Remove hashtags
  if (options.removeHashtags) {
    cleanedContent = cleanedContent.replace(/#\w+/g, '');
  }

  // Remove emojis
  if (options.removeEmojis) {
    cleanedContent = cleanedContent.replace(
      /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu,
      '',
    );
  }

  // Remove special characters (but preserve basic punctuation)
  if (options.removeSpecialChars) {
    cleanedContent = cleanedContent.replace(/[^\w\s.!?,;:'"'-]/g, '');
  }

  // Remove repeated characters (like "sooooo" -> "so")
  if (options.removeRepeatedChars) {
    cleanedContent = cleanedContent.replace(/(.)\1{3,}/g, '$1$1');
  }

  // Convert to lowercase
  if (options.toLowerCase) {
    cleanedContent = cleanedContent.toLowerCase();
  }

  // Remove accents
  if (options.removeAccents) {
    cleanedContent = cleanedContent
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  // Remove extra spaces
  if (options.removeExtraSpaces) {
    cleanedContent = cleanedContent.replace(/\s+/g, ' ');
  }

  // Final trim
  if (options.trimWhitespace) {
    cleanedContent = cleanedContent.trim();
  }

  return cleanedContent;
}

/**
 * Sanitize tweet content for database storage
 * Applies basic cleaning while preserving content integrity
 */
export function sanitizeTweetForStorage(content: string): string {
  return cleanTweetContent(content, {
    removeExtraSpaces: true,
    trimWhitespace: true,
    normalizeLineBreaks: true,
    normalizeUnicode: true,
    removeRepeatedChars: true,
    // Preserve most content for analysis
    removeEmojis: false,
    removeSpecialChars: false,
    removeUrls: false,
    removeMentions: false,
    removeHashtags: false,
    toLowerCase: false,
    removeAccents: false,
  });
}

/**
 * Clean tweet content for sentiment analysis
 * More aggressive cleaning while preserving meaningful content
 */
export function cleanTweetForSentiment(content: string): string {
  return cleanTweetContent(content, {
    removeExtraSpaces: true,
    trimWhitespace: true,
    normalizeLineBreaks: true,
    normalizeUnicode: true,
    removeRepeatedChars: true,
    removeSpecialChars: true,
    // Keep some elements for sentiment context
    removeEmojis: false, // Emojis provide sentiment context
    removeUrls: true,
    removeMentions: false, // Mentions can indicate positive/negative sentiment
    removeHashtags: false, // Hashtags can indicate sentiment
    toLowerCase: true,
    removeAccents: true,
  });
}

/**
 * Extract clean text for search indexing
 * Aggressive cleaning for better search performance
 */
export function cleanTweetForSearch(content: string): string {
  return cleanTweetContent(content, AGGRESSIVE_CLEANING);
}

/**
 * Validate and clean tweet content
 * Returns cleaned content or throws error if invalid
 */
export function validateAndCleanTweet(content: string): string {
  if (!content || typeof content !== 'string') {
    throw new Error('Tweet content must be a non-empty string');
  }

  const cleaned = sanitizeTweetForStorage(content);
  
  if (cleaned.length === 0) {
    throw new Error('Tweet content cannot be empty after cleaning');
  }

  if (cleaned.length > 4000) { // Twitter max + buffer
    throw new Error('Tweet content too long after cleaning');
  }

  return cleaned;
}

/**
 * Check if text contains potentially problematic content
 */
export function containsProblematicContent(content: string): boolean {
  const problematicPatterns = [
    // eslint-disable-next-line no-control-regex
    /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, // Control characters
    /\uFEFF/g, // Byte order mark
    /[\uD800-\uDFFF]/g, // Unpaired surrogates
  ];

  return problematicPatterns.some(pattern => pattern.test(content));
}

/**
 * Remove problematic characters that could cause database issues
 */
export function removeProblematicChars(content: string): string {
  return content
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '') // Control characters
    .replace(/\uFEFF/g, '') // Byte order mark
    .replace(/[\uD800-\uDFFF]/g, ''); // Unpaired surrogates
}

/**
 * Comprehensive tweet content processor for database storage
 * Combines validation, cleaning, and sanitization
 * Removes URLs and hashtags for cleaner storage
 */
export function processTweetContent(content: string): string {
  try {
    // Step 1: Basic validation
    if (!content || typeof content !== 'string') {
      return '';
    }

    // Step 2: Remove problematic characters
    let processed = removeProblematicChars(content);

    // Step 3: Remove URLs and hashtags for database storage
    processed = cleanTweetContent(processed, {
      removeExtraSpaces: true,
      trimWhitespace: true,
      normalizeLineBreaks: true,
      normalizeUnicode: true,
      removeRepeatedChars: true,
      removeUrls: true,        // ✅ Remove URLs
      removeHashtags: true,    // ✅ Remove hashtags
      // Keep other content for context
      removeEmojis: false,
      removeSpecialChars: false,
      removeMentions: false,   // Keep mentions for context
      toLowerCase: false,
      removeAccents: false,
    });

    // Step 4: Final validation
    if (processed.length === 0) {
      return content.trim(); // Return original if cleaning resulted in empty string
    }

    return processed;
  } catch {
    // Fallback to basic cleaning if processing fails
    return content?.trim() || '';
  }
}
