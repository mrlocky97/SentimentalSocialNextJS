/**
 * Reactive Twitter Scraper Wrapper - SIMPLIFIED
 * RxJS optimization wrapper using only the main TwitterRealScraperService
 */

import { Observable, BehaviorSubject, from } from "rxjs";
import { map, catchError, shareReplay, retry, timeout } from "rxjs/operators";
import { TwitterRealScraperService } from "../twitter-scraper.service";
import { Tweet } from "../../types/twitter";

export interface ScrapingRequest {
  id: string;
  query: string;
  options: any;
  priority: "urgent" | "high" | "medium" | "low";
  timestamp: Date;
  retryCount: number;
}

export interface ScrapingStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  cacheHitRate: number;
  averageResponseTime: number;
  tweetsPerSecond: number;
}

class ReactiveTwitterScraperWrapper {
  private coreService: TwitterRealScraperService;
  private stats$ = new BehaviorSubject<ScrapingStats>({
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    cacheHitRate: 0,
    averageResponseTime: 0,
    tweetsPerSecond: 0,
  });

  private cache = new Map<string, { data: Tweet[]; timestamp: Date }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.coreService = new TwitterRealScraperService();
  }

  // Submit scraping request with priority
  submitRequest(
    query: string,
    options: any = {},
    priority: "urgent" | "high" | "medium" | "low" = "medium",
  ): Observable<Tweet[]> {
    return from(this.processSingleRequest(query, options)).pipe(
      timeout(30000), // 30 second timeout
      retry(2),
      catchError((error) => {
        return from([]);
      }),
      shareReplay(1),
    );
  }

  private async processSingleRequest(
    query: string,
    options: any,
  ): Promise<Tweet[]> {
    const startTime = Date.now();

    // Check cache first
    const cacheKey = `${query}_${JSON.stringify(options)}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp.getTime() < this.CACHE_TTL) {
      this.updateCacheHit();
      return cached.data;
    }

    // Process with core service
    const result = await this.coreService.scrapeByHashtag(query, options);

    // Cache result
    this.cache.set(cacheKey, { data: result.tweets, timestamp: new Date() });

    // Update stats
    const processingTime = Date.now() - startTime;
    this.updateSuccessStats(processingTime, result.tweets.length);

    return result.tweets;
  }

  // Batch scraping
  batchScrape(
    queries: string[],
    options: any = {},
    priority: "urgent" | "high" | "medium" | "low" = "medium",
  ): Observable<Tweet[]> {
    return from(
      Promise.all(
        queries.map((query) => this.processSingleRequest(query, options)),
      ),
    ).pipe(
      map((results) => results.flat()),
      catchError((error) => {
        return from([]);
      }),
      shareReplay(1),
    );
  }

  // Get performance statistics
  getStats(): Observable<ScrapingStats> {
    return this.stats$.asObservable();
  }

  // Get monitoring data
  getMonitoringStream(): Observable<{
    activeRequests: number;
    queueLength: number;
    cacheSize: number;
    stats: ScrapingStats;
  }> {
    return this.stats$.pipe(
      map((stats) => ({
        activeRequests: 0,
        queueLength: 0,
        cacheSize: this.cache.size,
        stats,
      })),
    );
  }

  private updateCacheHit(): void {
    const current = this.stats$.value;
    this.stats$.next({
      ...current,
      cacheHitRate: current.cacheHitRate + 1,
    });
  }

  private updateSuccessStats(processingTime: number, tweetCount: number): void {
    const current = this.stats$.value;
    const newTotal = current.totalRequests + 1;

    this.stats$.next({
      ...current,
      totalRequests: newTotal,
      successfulRequests: current.successfulRequests + 1,
      averageResponseTime: (current.averageResponseTime + processingTime) / 2,
      tweetsPerSecond: tweetCount / (processingTime / 1000),
    });
  }

  private updateFailureStats(): void {
    const current = this.stats$.value;
    this.stats$.next({
      ...current,
      totalRequests: current.totalRequests + 1,
      failedRequests: current.failedRequests + 1,
    });
  }

  // Clean up resources
  shutdown(): void {
    this.stats$.complete();
    this.cache.clear();
  }
}

// Export singleton instance
export const reactiveTwitterScraper = new ReactiveTwitterScraperWrapper();
export default ReactiveTwitterScraperWrapper;
