/**
 * Sentiment Analysis Orchestrator - ENHANCED VERSION
 *
 * This class acts as the integration point for the sentiment analysis engine.
 * It handles I/O-bound tasks like caching, logging, data mapping (DTOs),
 * error handling, timeouts, metrics, and observability.
 *
 * PHASE 2 IMPROVEMENTS:
 * - Advanced granular caching with TTL
 * - Centralized error handling with circuit breaker
 * - Performance metrics and observability
 * - Timeout management and request priority
 * - Batch processing optimization
 */
import { NaiveBayesTrainingExample } from '../../services/naive-bayes-sentiment.service';
import { SentimentAnalysisEngine } from './engine';
import { AnalysisRequest, AnalysisResult, SentimentOrchestrator, TweetDTO } from './types';

// Enhanced cache with TTL and metadata
interface CacheEntry {
  result: AnalysisResult;
  timestamp: number;
  hits: number;
  size: number; // text length for cache efficiency metrics
}

// Performance metrics
interface OrchestratorMetrics {
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  errorCount: number;
  averageProcessingTime: number;
  totalProcessingTime: number;
  circuitBreakerTrips: number;
}

// Circuit breaker state
interface CircuitBreakerState {
  isOpen: boolean;
  failureCount: number;
  lastFailureTime: number;
  nextAttemptTime: number;
}

export class SentimentAnalysisOrchestrator implements SentimentOrchestrator {
  private engine: SentimentAnalysisEngine;
  private cache = new Map<string, CacheEntry>();
  private metrics: OrchestratorMetrics;
  private circuitBreaker: CircuitBreakerState;

  // Configuration
  private readonly CACHE_TTL = 60 * 60 * 1000; // 1 hour
  private readonly MAX_CACHE_SIZE = 10000;
  private readonly REQUEST_TIMEOUT = 30000; // 30 seconds
  private readonly CIRCUIT_BREAKER_THRESHOLD = 5;
  private readonly CIRCUIT_BREAKER_TIMEOUT = 60000; // 1 minute

  constructor() {
    this.engine = new SentimentAnalysisEngine();
    this.metrics = {
      totalRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      errorCount: 0,
      averageProcessingTime: 0,
      totalProcessingTime: 0,
      circuitBreakerTrips: 0,
    };
    this.circuitBreaker = {
      isOpen: false,
      failureCount: 0,
      lastFailureTime: 0,
      nextAttemptTime: 0,
    };

    // Start cache cleanup interval
    setInterval(() => this.cleanupExpiredCache(), 5 * 60 * 1000); // Every 5 minutes
  }

  /**
   * Advanced cache management with TTL and metrics
   */
  private cleanupExpiredCache(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.CACHE_TTL) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach((key) => this.cache.delete(key));
    console.log(`[Orchestrator] Cleaned up ${expiredKeys.length} expired cache entries`);
  }

  /**
   * Check if cache needs eviction (LRU-style)
   */
  private evictCacheIfNeeded(): void {
    if (this.cache.size > this.MAX_CACHE_SIZE) {
      // Simple LRU: sort by hits (least used first) and remove 20%
      const entries = Array.from(this.cache.entries())
        .sort((a, b) => a[1].hits - b[1].hits)
        .slice(0, Math.floor(this.MAX_CACHE_SIZE * 0.2));

      entries.forEach(([key]) => this.cache.delete(key));
      console.log(`[Orchestrator] Evicted ${entries.length} cache entries (LRU)`);
    }
  }

  /**
   * Circuit breaker logic
   */
  private checkCircuitBreaker(): boolean {
    const now = Date.now();

    if (this.circuitBreaker.isOpen) {
      if (now > this.circuitBreaker.nextAttemptTime) {
        this.circuitBreaker.isOpen = false;
        this.circuitBreaker.failureCount = 0;
        console.log('[Orchestrator] Circuit breaker reset - attempting requests');
        return false;
      }
      return true; // Circuit is still open
    }

    return false;
  }

  /**
   * Record failure and potentially open circuit breaker
   */
  private recordFailure(): void {
    this.circuitBreaker.failureCount++;
    this.circuitBreaker.lastFailureTime = Date.now();

    if (this.circuitBreaker.failureCount >= this.CIRCUIT_BREAKER_THRESHOLD) {
      this.circuitBreaker.isOpen = true;
      this.circuitBreaker.nextAttemptTime = Date.now() + this.CIRCUIT_BREAKER_TIMEOUT;
      this.metrics.circuitBreakerTrips++;
      console.error('[Orchestrator] Circuit breaker opened due to repeated failures');
    }
  }

  /**
   * Get cache entry with hit tracking
   */
  private getCacheEntry(key: string): AnalysisResult | null {
    const entry = this.cache.get(key);
    if (entry) {
      entry.hits++;
      this.metrics.cacheHits++;
      return entry.result;
    }
    this.metrics.cacheMisses++;
    return null;
  }

  /**
   * Set cache entry with metadata
   */
  private setCacheEntry(key: string, result: AnalysisResult, textLength: number): void {
    this.evictCacheIfNeeded();

    this.cache.set(key, {
      result,
      timestamp: Date.now(),
      hits: 1,
      size: textLength,
    });
  }

  /**
   * Get comprehensive orchestrator metrics
   */
  getMetrics(): OrchestratorMetrics & {
    cacheSize: number;
    cacheHitRate: number;
  } {
    const totalCacheRequests = this.metrics.cacheHits + this.metrics.cacheMisses;
    const cacheHitRate = totalCacheRequests > 0 ? this.metrics.cacheHits / totalCacheRequests : 0;

    return {
      ...this.metrics,
      cacheSize: this.cache.size,
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
    };
  }

  /**
   * Reset metrics (useful for testing or periodic resets)
   */
  resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      errorCount: 0,
      averageProcessingTime: 0,
      totalProcessingTime: 0,
      circuitBreakerTrips: 0,
    };
  }

  /**
   * Trains the sentiment analysis engine.
   * This is a passthrough to the engine's training method.
   * @param examples - Training data.
   */
  trainEngine(examples: NaiveBayesTrainingExample[]): void {
    console.log(`[Orchestrator] Starting training with ${examples.length} examples...`);
    this.engine.train(examples);
    console.log('[Orchestrator] Training complete.');
  }

  /**
   * Analyzes a plain text string with enhanced caching, metrics, and error handling.
   * @param request - The analysis request.
   * @returns The sentiment analysis result.
   */
  async analyzeText(request: AnalysisRequest): Promise<AnalysisResult> {
    const startTime = Date.now();
    this.metrics.totalRequests++;

    // Check circuit breaker
    if (this.checkCircuitBreaker()) {
      this.metrics.errorCount++;
      throw new Error('Service temporarily unavailable - circuit breaker open');
    }

    const cacheKey = `text:${request.text}:${JSON.stringify(request.language)}`;

    // Try cache first
    const cachedResult = this.getCacheEntry(cacheKey);
    if (cachedResult) {
      console.log(`[Orchestrator] Cache hit for key: ${cacheKey.substring(0, 50)}...`);
      return cachedResult;
    }

    console.log(`[Orchestrator] Cache miss. Analyzing text: "${request.text.substring(0, 50)}..."`);

    try {
      // Add timeout wrapper
      const timeoutPromise = new Promise<AnalysisResult>((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), this.REQUEST_TIMEOUT);
      });

      const analysisPromise = this.engine.analyze(request);
      const result = await Promise.race([analysisPromise, timeoutPromise]);

      // Cache the result
      this.setCacheEntry(cacheKey, result, request.text.length);

      // Update metrics
      const processingTime = Date.now() - startTime;
      this.metrics.totalProcessingTime += processingTime;
      this.metrics.averageProcessingTime =
        this.metrics.totalProcessingTime / this.metrics.totalRequests;

      return result;
    } catch (error) {
      this.metrics.errorCount++;
      this.recordFailure();
      console.error('[Orchestrator] Error during text analysis:', error);
      throw new Error('Failed to analyze text.');
    }
  }

  /**
   * Analyzes a tweet DTO, mapping it to an analysis request and using the cache.
   * @param tweet - The tweet data transfer object.
   * @returns The sentiment analysis result, including the tweet ID.
   */
  async analyzeTweet(tweet: TweetDTO): Promise<AnalysisResult & { tweetId: string }> {
    const cacheKey = `tweet:${tweet.id}`;

    // Try cache first
    const cachedResult = this.getCacheEntry(cacheKey);
    if (cachedResult) {
      console.log(`[Orchestrator] Cache hit for tweet: ${tweet.id}`);
      return { ...cachedResult, tweetId: tweet.id };
    }

    console.log(`[Orchestrator] Cache miss. Analyzing tweet: ${tweet.id}`);
    const request: AnalysisRequest = {
      text: tweet.text,
      language: tweet.language,
    };

    try {
      const result = await this.engine.analyze(request);
      this.setCacheEntry(cacheKey, result, tweet.text.length);
      return { ...result, tweetId: tweet.id };
    } catch (error) {
      console.error(`[Orchestrator] Error during tweet analysis for ${tweet.id}:`, error);
      throw new Error(`Failed to analyze tweet ${tweet.id}.`);
    }
  }

  /**
   * Analyzes a batch of tweets efficiently.
   * @param tweets - An array of tweet DTOs.
   * @returns An array of analysis results.
   */
  async analyzeTweetsBatch(tweets: TweetDTO[]): Promise<(AnalysisResult & { tweetId: string })[]> {
    console.log(`[Orchestrator] Starting batch analysis for ${tweets.length} tweets.`);
    const results = await Promise.all(tweets.map((tweet) => this.analyzeTweet(tweet)));
    console.log('[Orchestrator] Batch analysis complete.');
    return results;
  }
}
