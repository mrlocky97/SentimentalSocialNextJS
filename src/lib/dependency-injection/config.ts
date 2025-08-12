/**
 * Service Registration and Configuration
 * Central place to configure all dependency injections
 */

import { advancedCache } from "../cache/advanced-cache";
import { correlationService } from "../observability/correlation";
import { LoggerFactory } from "../observability/logger";
import { SentimentAnalysisEngine } from "../sentiment/engine";
import { SentimentMappers } from "../sentiment/mappers";
import { SentimentAnalysisOrchestrator } from "../sentiment/orchestrator";
import { container, TOKENS } from "./container";

/**
 * Configure all service dependencies
 */
export function configureServices(): void {
  // Core Sentiment Services (Singletons for performance)
  container.registerSingleton(
    TOKENS.SENTIMENT_ENGINE,
    () => new SentimentAnalysisEngine(),
  );

  container.registerSingleton(TOKENS.SENTIMENT_ORCHESTRATOR, () => {
    return new SentimentAnalysisOrchestrator();
  });

  container.registerSingleton(TOKENS.SENTIMENT_MAPPERS, () => SentimentMappers);

  // Advanced Cache System
  container.registerSingleton(TOKENS.CACHE_SERVICE, () => advancedCache);

  // Observability Services
  container.registerSingleton(
    TOKENS.CORRELATION_SERVICE,
    () => correlationService,
  );

  container.registerSingleton(TOKENS.LOGGER_FACTORY, () => LoggerFactory);

  console.log(
    "🔧 IoC Container configured with",
    container.getRegistrations().length,
    "services",
  );
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
 * Health check for IoC container
 */
export function checkContainerHealth(): {
  status: "healthy" | "unhealthy";
  services: number;
  registrations: string[];
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
    };
  } catch {
    return {
      status: "unhealthy",
      services: 0,
      registrations: [],
    };
  }
}
