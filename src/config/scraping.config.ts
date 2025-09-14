// Precompilación de expresiones regulares para mejor rendimiento
const REGEX = {
  LEADING_HASH_OR_AT: /^[#@]/,
  NON_ALPHANUMERIC_UNDERSCORE: /[^a-zA-Z0-9_]/g,
  MULTIPLE_WHITESPACE: /\s+/g,
  QUERY_UNSAFE: /[^a-zA-Z0-9_#@\s-]/g,
  VALID_USERNAME: /^[A-Za-z0-9_]{1,15}$/
} as const;

// Extracción de constantes para evitar accesos profundos repetidos
const {
  HASHTAG_MAX,
  USER_MAX,
  QUERY_MAX
} = {
  HASHTAG_MAX: 50,
  USER_MAX: 15, 
  QUERY_MAX: 120
};

// Utilidad para truncar strings
const truncate = (str: string, max: number) => 
  str.length > max ? str.substring(0, max) : str;

// Centralized configuration for scraping module
// Keeps magic numbers and arrays out of helpers/handlers for easier testing & tuning

export const SCRAPING_CONFIG = {
  CONCURRENCY: {
    MAX_CONCURRENT_BY_IP: 5, // Aumentado de 1 a 5 para mejor throughput
    INFLIGHT_TTL_MS: 5 * 60 * 1000, // Aumentado a 5 minutos para requests largos
  },
  LIMITS: {
    MIN_TWEETS: 1, // Mínimo tweets por request
    MAX_TWEETS: 1000, // Máximo tweets por request
    DEFAULT_TWEETS: 50, // Default si no se especifica
    CHUNK_SIZE: 100, // Nuevo: tamaño de chunk para requests grandes
  },
  SANITIZATION: {
    HASHTAG_MAX,
    USER_MAX, 
    QUERY_MAX,
    PATTERNS: REGEX,
  },
  LANGUAGES: ["en", "es", "fr", "de"] as const,
} as const;

export type SupportedLanguage = (typeof SCRAPING_CONFIG.LANGUAGES)[number];

export const isSupportedLanguage = (lang: string): lang is SupportedLanguage =>
  SCRAPING_CONFIG.LANGUAGES.includes(lang as SupportedLanguage);

// Utility sanitizers (pure) using config — can be imported elsewhere if needed
export const Sanitizers = {
  hashtag(raw: string) {
    if (!raw) return "";
    
    return raw
      .replace(REGEX.LEADING_HASH_OR_AT, "")
      .replace(REGEX.NON_ALPHANUMERIC_UNDERSCORE, "")
      .substring(0, HASHTAG_MAX);
  },
  
  username(raw: string) {
    if (!raw) return "";
    
    return raw
      .replace(REGEX.LEADING_HASH_OR_AT, "")
      .substring(0, USER_MAX);
  },
  
  query(raw: string) {
    if (!raw) return "";
    
    return truncate(
      raw
        .replace(REGEX.QUERY_UNSAFE, "")
        .replace(REGEX.MULTIPLE_WHITESPACE, " ")
        .trim(),
      QUERY_MAX
    );
  }
};