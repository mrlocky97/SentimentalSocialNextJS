// Centralized configuration for scraping module
// Keeps magic numbers and arrays out of helpers/handlers for easier testing & tuning

export const SCRAPING_CONFIG = {
  CONCURRENCY: {
    MAX_CONCURRENT_BY_IP: 1,
    INFLIGHT_TTL_MS: 2 * 60 * 1000, // 2 minutes
  },
  LIMITS: {
    MIN_TWEETS: 1,
    MAX_TWEETS: 1000,
    DEFAULT_TWEETS: 50,
  },
  SANITIZATION: {
    HASHTAG_MAX: 50,
    USER_MAX: 15,
    QUERY_MAX: 120,
  },
  LANGUAGES: ["en", "es", "fr", "de"] as const,
} as const;

export type SupportedLanguage = (typeof SCRAPING_CONFIG.LANGUAGES)[number];
