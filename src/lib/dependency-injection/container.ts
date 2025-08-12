/**
 * Dependency Injection Container
 * Simple IoC container for managing service dependencies
 */

export interface ServiceContainer {
  register<T>(token: string | symbol, factory: () => T): void;
  registerSingleton<T>(token: string | symbol, factory: () => T): void;
  resolve<T>(token: string | symbol): T;
  has(token: string | symbol): boolean;
}

export class DIContainer implements ServiceContainer {
  private services = new Map<
    string | symbol,
    { factory: () => any; singleton: boolean; instance?: any }
  >();

  /**
   * Register a transient service (new instance every time)
   */
  register<T>(token: string | symbol, factory: () => T): void {
    this.services.set(token, { factory, singleton: false });
  }

  /**
   * Register a singleton service (same instance always)
   */
  registerSingleton<T>(token: string | symbol, factory: () => T): void {
    this.services.set(token, { factory, singleton: true });
  }

  /**
   * Resolve a service instance
   */
  resolve<T>(token: string | symbol): T {
    const service = this.services.get(token);
    if (!service) {
      throw new Error(`Service not registered: ${String(token)}`);
    }

    if (service.singleton) {
      if (!service.instance) {
        service.instance = service.factory();
      }
      return service.instance;
    }

    return service.factory();
  }

  /**
   * Check if a service is registered
   */
  has(token: string | symbol): boolean {
    return this.services.has(token);
  }

  /**
   * Clear all registrations (for testing)
   */
  clear(): void {
    this.services.clear();
  }

  /**
   * Get all registered service tokens
   */
  getRegistrations(): (string | symbol)[] {
    return Array.from(this.services.keys());
  }
}

// Global container instance
export const container = new DIContainer();

// Service tokens
export const TOKENS = {
  // Core Services
  SENTIMENT_ENGINE: Symbol('SentimentEngine'),
  SENTIMENT_ORCHESTRATOR: Symbol('SentimentOrchestrator'),
  SENTIMENT_MAPPERS: Symbol('SentimentMappers'),

  // Cache Services
  CACHE_SERVICE: Symbol('CacheService'),
  PERFORMANCE_CACHE: Symbol('PerformanceCache'),

  // Observability Services
  CORRELATION_SERVICE: Symbol('CorrelationService'),
  LOGGER_FACTORY: Symbol('LoggerFactory'),

  // Analysis Services
  NAIVE_BAYES_SERVICE: Symbol('NaiveBayesService'),
  HYBRID_ANALYZER: Symbol('HybridAnalyzer'),

  // Managers
  TWEET_SENTIMENT_MANAGER: Symbol('TweetSentimentManager'),
  MODEL_PERSISTENCE: Symbol('ModelPersistence'),

  // External Services
  TWITTER_AUTH_MANAGER: Symbol('TwitterAuthManager'),
  TWITTER_SCRAPER: Symbol('TwitterScraper'),
} as const;

/**
 * Decorator for dependency injection
 */
export function injectable<T extends new (...args: any[]) => any>(constructor: T) {
  return class extends constructor {
    constructor(...args: any[]) {
      super(...args);
    }
  };
}

/**
 * Property decorator for injecting dependencies
 */
export function inject(token: string | symbol) {
  return function (target: any, propertyKey: string) {
    Object.defineProperty(target, propertyKey, {
      get() {
        return container.resolve(token);
      },
      enumerable: true,
      configurable: true,
    });
  };
}
