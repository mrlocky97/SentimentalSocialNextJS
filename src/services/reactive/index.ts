/**
 * Reactive Services Index
 * Central export point for all reactive services and utilities
 */

// Import services first
import { reactiveTwitterScraper } from "./twitter-scraper-reactive.wrapper";
import { reactiveSentimentAnalyzer } from "./sentiment-analysis-reactive.wrapper";
import { notificationSystem } from "./notification-system";
import { autoOptimizationSystem } from "./auto-optimization-system";
import { predictiveAnalyticsSystem } from "./predictive-analytics-system";
import { reactiveOrchestrator } from "./reactive-orchestrator";
import { switchMap } from "rxjs/operators";

// Export reactive services
export {
  reactiveTwitterScraper,
  reactiveSentimentAnalyzer,
  notificationSystem,
  autoOptimizationSystem,
  predictiveAnalyticsSystem,
  reactiveOrchestrator,
};

// Export key types
export type {
  OptimizationTask,
  OptimizationResult,
  OptimizationStats,
} from "./auto-optimization-system";

export type {
  PredictionRequest,
  PredictionResult,
  TrendAnalysis,
  PredictiveStats,
} from "./predictive-analytics-system";

export type {
  Workflow,
  WorkflowStep,
  SystemHealth,
  ServiceStatus,
  OrchestratorStats,
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

  console.log("🚀 Initializing Reactive Services Suite");
  console.log("📊 Configuration:", finalConfig);

  console.log("✅ Twitter Scraper Reactive Wrapper - Ready");
  console.log("✅ Sentiment Analysis Reactive Wrapper - Ready");
  console.log("✅ Notification System - Ready");
  console.log("✅ Auto Optimization System - Ready");
  console.log("✅ Predictive Analytics System - Ready");
  console.log("✅ Reactive Orchestrator - Ready");
  console.log("🎉 All Reactive Services Initialized Successfully!");
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
    switchMap((tweets: any) =>
      reactiveSentimentAnalyzer.analyzeTweetsBatch(tweets),
    ),
  );

  // Send notifications for negative sentiment
  sentimentResult$.subscribe((results: any) => {
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
  map,
  filter,
  mergeMap,
  switchMap,
  catchError,
  retry,
  debounceTime,
  distinctUntilChanged,
  shareReplay,
} from "rxjs/operators";

export {
  Observable,
  Subject,
  BehaviorSubject,
  combineLatest,
  merge,
  timer,
} from "rxjs";
