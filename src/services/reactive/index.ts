/**
 * Reactive Services Index
 * Central export point for all reactive services and utilities
 */

// Import services first
import { switchMap } from "rxjs/operators";
import { logger } from "../../lib/observability/logger";
import { autoOptimizationSystem } from "./auto-optimization-system";
import { notificationSystem } from "./notification-system";
import { predictiveAnalyticsSystem } from "./predictive-analytics-system";
import { reactiveOrchestrator } from "./reactive-orchestrator";
import { reactiveSentimentAnalyzer } from "./sentiment-analysis-reactive.wrapper";
import { reactiveTwitterScraper } from "./twitter-scraper-reactive.wrapper";

// Export reactive services
export {
    autoOptimizationSystem, notificationSystem, predictiveAnalyticsSystem,
    reactiveOrchestrator, reactiveSentimentAnalyzer, reactiveTwitterScraper
};

// Export key types
    export type {
        OptimizationResult,
        OptimizationStats, OptimizationTask
    } from "./auto-optimization-system";

export type {
    PredictionRequest,
    PredictionResult, PredictiveStats, TrendAnalysis
} from "./predictive-analytics-system";

export type {
    OrchestratorStats, ServiceStatus, SystemHealth, Workflow,
    WorkflowStep
} from "./reactive-orchestrator";

/**
 * Reactive Services Configuration
 */
export interface ReactiveConfig {
  enableCaching: boolean;
  enableMetrics: boolean;
  enableNotifications: boolean;
  maxConcurrentRequests: number;
  retryAttempts: number;
  cacheTimeout: number;
}

/**
 * Default configuration for reactive services
 */
export const defaultReactiveConfig: ReactiveConfig = {
  enableCaching: true,
  enableMetrics: true,
  enableNotifications: true,
  maxConcurrentRequests: 10,
  retryAttempts: 3,
  cacheTimeout: 300000, // 5 minutes
};

/**
 * Initialize all reactive services with configuration
 */
export function initializeReactiveServices(
  config: Partial<ReactiveConfig> = {},
): void {
  const finalConfig = { ...defaultReactiveConfig, ...config };

  logger.info("Initializing Reactive Services Suite", { config: finalConfig });
  logger.info("Twitter Scraper Reactive Wrapper ready");
  logger.info("Sentiment Analysis Reactive Wrapper ready");
  logger.info("Notification System ready");
  logger.info("Auto Optimization System ready");
  logger.info("Predictive Analytics System ready");
  logger.info("Reactive Orchestrator ready");
  logger.info("All Reactive Services initialized successfully");
}

/**
 * Get comprehensive system status
 */
export async function getSystemStatus(): Promise<{
  services: { name: string; status: string; uptime: number }[];
  overall: string;
  timestamp: Date;
}> {
  return new Promise((resolve) => {
  reactiveOrchestrator.getSystemHealth().subscribe((health: any) => {
      resolve({
    services: health.services.map((s: any) => ({
          name: s.name,
          status: s.status,
          uptime: s.uptime,
        })),
        overall: health.overall,
        timestamp: health.timestamp,
      });
    });
  });
}

/**
 * Utility function to create a complete social media optimization workflow
 */
export function createSocialMediaWorkflow(
  campaignId: string,
  hashtags: string[],
  content: string,
) {
  return reactiveOrchestrator.createOptimizationWorkflow(campaignId, {
    hashtags,
    content,
    optimizationTargets: ["engagement", "reach", "sentiment"],
  });
}

/**
 * Quick start function for basic sentiment monitoring
 */
export function startSentimentMonitoring(keywords: string[]) {
  // Scrape tweets for keywords
  const scrapeResult$ = reactiveTwitterScraper.batchScrape(
    keywords,
    {},
    "medium",
  );

  // Analyze sentiment
  const sentimentResult$ = scrapeResult$.pipe(
    switchMap((tweets: any[]) =>
      reactiveSentimentAnalyzer.analyzeTweetsBatch(tweets),
    ),
  );

  // Send notifications for negative sentiment
  sentimentResult$.subscribe((results: any[]) => {
    const negativeResults = results.filter(
      (r: any) => r.sentiment && r.sentiment.score < -0.5,
    );
    if (negativeResults.length > 0) {
      notificationSystem.sendWarning(
        "Negative Sentiment Alert",
        `Found ${negativeResults.length} negative mentions`,
        { keywords, negativeCount: negativeResults.length },
      );
    }
  });

  return sentimentResult$;
}

// Re-export RxJS utilities
export {
    catchError, debounceTime,
    distinctUntilChanged, filter, map, mergeMap, retry, shareReplay, switchMap
} from "rxjs/operators";

export {
    BehaviorSubject,
    combineLatest,
    merge, Observable,
    Subject, timer
} from "rxjs";

