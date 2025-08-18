// Centralized configuration for scraping module
// Keeps magic numbers and arrays out of helpers/handlers for easier testing & tuning

export const SCRAPING_CONFIG = {
  CONCURRENCY: {
    MAX_CONCURRENT_BY_IP: 1,
    INFLIGHT_TTL_MS: 2 * 60 * 1000, // 2 minutes
  },
  LIMITS: {
    MIN_TWEETS: 1, // Mínimo tweets por request
    MAX_TWEETS: 1000, // Máximo tweets por request
    DEFAULT_TWEETS: 50, // Default si no se especifica
  },
  SANITIZATION: {
    HASHTAG_MAX: 50, // Máximo caracteres para hashtags
    USER_MAX: 15, // Máximo caracteres para usernames
    QUERY_MAX: 120, // Máximo caracteres para queries
    PATTERNS: {
      HASHTAG: /[^a-zA-Z0-9_]/g, // Solo alfanuméricos y _
      USERNAME: /^[A-Za-z0-9_]{1,15}$/, // Formato válido de usuario
      QUERY_SAFE: /[^a-zA-Z0-9_#@\s-]/g, // Caracteres seguros para búsqueda
    },
  },
  LANGUAGES: ["en", "es", "fr", "de"] as const,
} as const;

export type SupportedLanguage = (typeof SCRAPING_CONFIG.LANGUAGES)[number];

export const isSupportedLanguage = (lang: string): lang is SupportedLanguage =>
  SCRAPING_CONFIG.LANGUAGES.includes(lang as SupportedLanguage);

// Utility sanitizers (pure) using config — can be imported elsewhere if needed
export const Sanitizers = {
  hashtag(raw: string) {
    const trimmed = (raw || "").trim().replace(/^#/, "");
    return trimmed
      .replace(SCRAPING_CONFIG.SANITIZATION.PATTERNS.HASHTAG, "")
      .slice(0, SCRAPING_CONFIG.SANITIZATION.HASHTAG_MAX);
  }, // Limpia hashtags
  username(raw: string) {
    return (raw || "")
      .trim()
      .replace(/^@/, "")
      .slice(0, SCRAPING_CONFIG.SANITIZATION.USER_MAX);
  }, // Limpia usernames
  query(raw: string) {
    const trimmed = (raw || "")
      .trim()
      .slice(0, SCRAPING_CONFIG.SANITIZATION.QUERY_MAX);
    return trimmed
      .replace(SCRAPING_CONFIG.SANITIZATION.PATTERNS.QUERY_SAFE, "")
      .replace(/\s+/g, " ");
  }, // Limpia queries
};
