/**
 * Scraping Enums
 * Enumeraciones para el sistema de scraping de Twitter
 */

/**
 * Tipos de scraping disponibles
 * Define los diferentes métodos de scraping que soporta el sistema
 */
export enum ScrapingType {
  HASHTAG = 'hashtag', // Scraping por hashtag (#ejemplo)
  USER = 'user', // Scraping de tweets de un usuario específico
  SEARCH = 'search', // Búsqueda general de tweets
}

/**
 * Prioridades para requests de scraping
 * Gestiona la cola de prioridades en el sistema reactivo
 */
export enum ScrapingPriority {
  URGENT = 'urgent', // Máxima prioridad - procesamiento inmediato
  HIGH = 'high', // Alta prioridad - procesamiento rápido
  MEDIUM = 'medium', // Prioridad normal - procesamiento estándar
  LOW = 'low', // Baja prioridad - procesamiento diferido
}

/**
 * Estados del servicio de scraping
 * Para monitoreo y control del estado del sistema
 */
export enum ServiceStatus {
  OPERATIONAL = 'operational', // Servicio funcionando normalmente
  LIMITED = 'limited', // Servicio con limitaciones (rate limit, etc.)
  MAINTENANCE = 'maintenance', // Servicio en mantenimiento
}

/**
 * Estados de autenticación
 * Para gestionar el estado de la autenticación con Twitter
 */
export enum AuthenticationStatus {
  AUTHENTICATED = 'authenticated', // Autenticado correctamente
  FAILED = 'failed', // Falló la autenticación
  PENDING = 'pending', // Autenticación en proceso
  EXPIRED = 'expired', // Token/sesión expirada
  BLOCKED = 'blocked', // Cuenta bloqueada temporalmente
}

/**
 * Estados de Rate Limit
 * Para gestionar los límites de velocidad de requests
 */
export enum RateLimitStatus {
  AVAILABLE = 'available', // Requests disponibles
  LIMITED = 'limited', // Rate limit activo
  EXCEEDED = 'exceeded', // Límite excedido
  RESET_PENDING = 'reset_pending', // Esperando reset del límite
}

/**
 * Tipos de error en scraping
 * Categorización de errores para mejor manejo
 */
export enum ScrapingErrorType {
  AUTHENTICATION_ERROR = 'authentication_error',
  RATE_LIMIT_ERROR = 'rate_limit_error',
  NETWORK_ERROR = 'network_error',
  PARSING_ERROR = 'parsing_error',
  VALIDATION_ERROR = 'validation_error',
  TIMEOUT_ERROR = 'timeout_error',
  UNKNOWN_ERROR = 'unknown_error',
}

/**
 * Calidades de scraping
 * Define el nivel de detalle y velocidad del scraping
 */
export enum ScrapingQuality {
  FAST = 'fast', // Scraping rápido con menos detalles
  BALANCED = 'balanced', // Balance entre velocidad y detalle
  DETAILED = 'detailed', // Scraping detallado más lento
  PREMIUM = 'premium', // Máximo detalle y análisis
}

/**
 * Idiomas soportados para scraping
 * Filtros de idioma para el scraping de tweets
 */
export enum SupportedLanguage {
  ENGLISH = 'en',
  SPANISH = 'es',
  FRENCH = 'fr',
  GERMAN = 'de',
}
