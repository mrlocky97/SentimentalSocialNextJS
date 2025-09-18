/**
 * Service Registration and Configuration
 * Central place to configure all dependency injections
 * 
 * 🛠️ REFACTORING: Updated to support unified sentiment architecture
 */

import { advancedCache } from "../cache/advanced-cache";
import { features } from "../config/feature-flags";
import { correlationService } from "../observability/correlation";
import { logger, LoggerFactory } from "../observability/logger";
import { SentimentAnalysisEngine } from "../sentiment/engine";
import { SentimentMappers } from "../sentiment/mappers";
import { SentimentAnalysisOrchestrator } from "../sentiment/orchestrator";
import { SentimentServiceFacade } from "../sentiment/sentiment-service-facade";
import { container, TOKENS } from "./container";

/**
 * Configure all service dependencies
 */
export function configureServices(): void {
  // 🎯 CORE SENTIMENT SERVICES (Post-Refactoring)
  container.registerSingleton(
    TOKENS.SENTIMENT_ENGINE,
    () => new SentimentAnalysisEngine(),
  );

  container.registerSingleton(TOKENS.SENTIMENT_ORCHESTRATOR, () => {
    return new SentimentAnalysisOrchestrator();
  });

  container.registerSingleton(TOKENS.SENTIMENT_MAPPERS, () => SentimentMappers);

  // 🏛️ LEGACY SERVICES (Compatibility layer)
  if (features.ENABLE_LEGACY_SENTIMENT_SERVICES) {
    container.registerSingleton(TOKENS.LEGACY_SENTIMENT_SERVICE, () => {
      logger.info("Registering legacy SentimentServiceFacade for compatibility");
      return new SentimentServiceFacade();
    });
  }

  // Advanced Cache System
  container.registerSingleton(TOKENS.CACHE_SERVICE, () => advancedCache);

  // Observability Services
  container.registerSingleton(
    TOKENS.CORRELATION_SERVICE,
    () => correlationService,
  );

  container.registerSingleton(TOKENS.LOGGER_FACTORY, () => LoggerFactory);

  logger.info("🔧 IoC Container configured", {
    totalServices: container.getRegistrations().length,
    useUnifiedOrchestrator: features.USE_UNIFIED_SENTIMENT_ORCHESTRATOR,
    legacyServicesEnabled: features.ENABLE_LEGACY_SENTIMENT_SERVICES,
    services: container.getRegistrations().map(token => String(token))
  });
}

/**
 * Get pre-configured orchestrator instance
 */
export function getOrchestrator(): SentimentAnalysisOrchestrator {
  return container.resolve<SentimentAnalysisOrchestrator>(
    TOKENS.SENTIMENT_ORCHESTRATOR,
  );
}

/**
 * Get pre-configured sentiment engine
 */
export function getSentimentEngine(): SentimentAnalysisEngine {
  return container.resolve<SentimentAnalysisEngine>(TOKENS.SENTIMENT_ENGINE);
}

/**
 * Get legacy sentiment service facade (if enabled)
 */
export function getLegacySentimentService(): SentimentServiceFacade | null {
  if (features.ENABLE_LEGACY_SENTIMENT_SERVICES && container.has(TOKENS.LEGACY_SENTIMENT_SERVICE)) {
    return container.resolve<SentimentServiceFacade>(TOKENS.LEGACY_SENTIMENT_SERVICE);
  }
  return null;
}

/**
 * Health check for IoC container
 */
export function checkContainerHealth(): {
  status: "healthy" | "unhealthy";
  services: number;
  registrations: string[];
  features: {
    unifiedOrchestrator: boolean;
    legacyServices: boolean;
  };
} {
  try {
    const registrations = container.getRegistrations();
    const registrationNames = registrations.map((token) => String(token));

    // Try to resolve core services
    container.resolve(TOKENS.SENTIMENT_ENGINE);
    container.resolve(TOKENS.SENTIMENT_ORCHESTRATOR);

    return {
      status: "healthy",
      services: registrations.length,
      registrations: registrationNames,
      features: {
        unifiedOrchestrator: features.USE_UNIFIED_SENTIMENT_ORCHESTRATOR,
        legacyServices: features.ENABLE_LEGACY_SENTIMENT_SERVICES
      }
    };
  } catch (error) {
    logger.error("IoC Container health check failed", error);
    return {
      status: "unhealthy",
      services: 0,
      registrations: [],
      features: {
        unifiedOrchestrator: false,
        legacyServices: false
      }
    };
  }
}
