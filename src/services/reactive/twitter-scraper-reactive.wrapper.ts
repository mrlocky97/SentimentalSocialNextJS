/**
 * Reactive Twitter Scraper Wrapper
 * RxJS optimization wrapper for the core TwitterScraperService
 */

import { Observable, Subject, BehaviorSubject, timer, combineLatest } from 'rxjs';
import { 
  map, 
  filter, 
  mergeMap, 
  catchError, 
  retry, 
  tap, 
  shareReplay, 
  throttleTime, 
  debounceTime,
  take,
  timeout
} from 'rxjs/operators';
import { TwitterScraperService } from '../twitter-scraper.service';
import { Tweet } from '../../types/twitter';

export interface ScrapingRequest {
  id: string;
  query: string;
  options: any;
  priority: 'urgent' | 'high' | 'medium' | 'low';
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
  private coreService: TwitterScraperService;
  private requestQueue$ = new Subject<ScrapingRequest>();
  private stats$ = new BehaviorSubject<ScrapingStats>({
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    cacheHitRate: 0,
    averageResponseTime: 0,
    tweetsPerSecond: 0
  });
  
  private cache = new Map<string, { data: Tweet[], timestamp: Date }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CONCURRENT = 3;
  private readonly RETRY_ATTEMPTS = 3;

  constructor() {
    this.coreService = new TwitterScraperService();
    this.initializeProcessing();
  }

  /**
   * Initialize reactive processing pipeline
   */
  private initializeProcessing(): void {
    // Priority queue processing
    this.requestQueue$.pipe(
      // Group by priority
      map(request => ({ ...request, weight: this.getPriorityWeight(request.priority) })),
      // Throttle high-frequency requests
      throttleTime(100),
      // Process with concurrency control
      mergeMap(request => this.processRequest(request), this.MAX_CONCURRENT),
      // Share results
      shareReplay(1)
    ).subscribe({
      next: (result) => this.updateStats(result),
      error: (error) => console.error('Processing pipeline error:', error)
    });
  }

  /**
   * Submit scraping request with priority
   */
  submitRequest(query: string, options: any = {}, priority: 'urgent' | 'high' | 'medium' | 'low' = 'medium'): Observable<Tweet[]> {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const cacheKey = `${query}_${JSON.stringify(options)}`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp.getTime()) < this.CACHE_TTL) {
      return new Observable(subscriber => {
        subscriber.next(cached.data);
        subscriber.complete();
        this.updateCacheHit();
      });
    }

    const request: ScrapingRequest = {
      id: requestId,
      query,
      options,
      priority,
      timestamp: new Date(),
      retryCount: 0
    };

    // Queue request
    this.requestQueue$.next(request);

    // Return observable that will emit when request is processed
    return new Observable<Tweet[]>(subscriber => {
      this.processRequest(request).subscribe({
        next: (tweets) => {
          // Cache result
          this.cache.set(cacheKey, { data: tweets, timestamp: new Date() });
          subscriber.next(tweets);
          subscriber.complete();
        },
        error: (error) => subscriber.error(error)
      });
    });
  }

  /**
   * Process individual request with retries and error handling
   */
  private processRequest(request: ScrapingRequest): Observable<Tweet[]> {
    const startTime = Date.now();
    
    return new Observable<Tweet[]>(subscriber => {
      this.coreService.scrapeByHashtag(request.query, request.options)
        .then((result: any) => {
          const tweets = result.tweets || [];
          const processingTime = Date.now() - startTime;
          subscriber.next(tweets);
          subscriber.complete();
          this.updateSuccessStats(processingTime, tweets.length);
        })
        .catch((error: any) => {
          subscriber.error(error);
          this.updateFailureStats();
        });
    }).pipe(
      timeout(30000), // 30 second timeout
      retry({
        count: this.RETRY_ATTEMPTS,
        delay: (error, retryCount) => {
          request.retryCount = retryCount;
          return timer(Math.pow(2, retryCount) * 1000); // Exponential backoff
        }
      }),
      catchError(error => {
        console.error(`Request ${request.id} failed after ${this.RETRY_ATTEMPTS} retries:`, error);
        return [];
      })
    );
  }

  /**
   * Get real-time performance statistics
   */
  getStats(): Observable<ScrapingStats> {
    return this.stats$.asObservable();
  }

  /**
   * Batch scraping with intelligent queuing
   */
  batchScrape(queries: string[], options: any = {}, priority: 'urgent' | 'high' | 'medium' | 'low' = 'medium'): Observable<Tweet[]> {
    const requests$ = queries.map(query => 
      this.submitRequest(query, options, priority).pipe(
        catchError(() => []) // Continue with empty array on individual failures
      )
    );

    return combineLatest(requests$).pipe(
      map(results => results.flat()), // Flatten all results
      debounceTime(500) // Wait for batch to stabilize
    );
  }

  /**
   * Real-time monitoring stream
   */
  getMonitoringStream(): Observable<{
    activeRequests: number;
    queueLength: number;
    cacheSize: number;
    stats: ScrapingStats;
  }> {
    return timer(0, 1000).pipe(
      map(() => ({
        activeRequests: 0, // Would track active requests in real implementation
        queueLength: 0,    // Would track queue length
        cacheSize: this.cache.size,
        stats: this.stats$.value
      }))
    );
  }

  /**
   * Clean up resources
   */
  shutdown(): void {
    this.requestQueue$.complete();
    this.stats$.complete();
    this.cache.clear();
  }

  // Helper methods
  private getPriorityWeight(priority: string): number {
    const weights: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
    return weights[priority] || 2;
  }

  private updateStats(result: any): void {
    const current = this.stats$.value;
    this.stats$.next({
      ...current,
      totalRequests: current.totalRequests + 1
    });
  }

  private updateSuccessStats(processingTime: number, tweetCount: number): void {
    const current = this.stats$.value;
    const newSuccessful = current.successfulRequests + 1;
    const newAvgTime = ((current.averageResponseTime * current.successfulRequests) + processingTime) / newSuccessful;
    
    this.stats$.next({
      ...current,
      successfulRequests: newSuccessful,
      averageResponseTime: newAvgTime,
      tweetsPerSecond: current.tweetsPerSecond + (tweetCount / (processingTime / 1000))
    });
  }

  private updateFailureStats(): void {
    const current = this.stats$.value;
    this.stats$.next({
      ...current,
      failedRequests: current.failedRequests + 1
    });
  }

  private updateCacheHit(): void {
    const current = this.stats$.value;
    const totalRequests = current.totalRequests + 1;
    const cacheHits = Math.floor(current.cacheHitRate * current.totalRequests) + 1;
    
    this.stats$.next({
      ...current,
      totalRequests,
      cacheHitRate: cacheHits / totalRequests
    });
  }
}

// Export singleton instance
export const reactiveTwitterScraper = new ReactiveTwitterScraperWrapper();
