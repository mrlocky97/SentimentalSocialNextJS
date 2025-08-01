/**
 * Reactive Sentiment Analysis Wrapper
 * RxJS optimization wrapper for sentiment analysis with batch processing and caching
 */

import { Observable, Subject, BehaviorSubject, timer, from } from 'rxjs';
import { 
  map, 
  mergeMap, 
  catchError, 
  shareReplay, 
  bufferTime, 
  filter,
  tap,
  retry,
  timeout
} from 'rxjs/operators';
import { TweetSentimentAnalysisManager } from '../tweet-sentiment-analysis.manager';
import { Tweet } from '../../types/twitter';

export interface SentimentAnalysisRequest {
  id: string;
  tweet: Tweet;
  timestamp: Date;
  priority: 'high' | 'normal' | 'low';
}

export interface SentimentStats {
  totalAnalyzed: number;
  averageProcessingTime: number;
  batchesProcessed: number;
  cacheHitRate: number;
  tweetsPerSecond: number;
}

class ReactiveSentimentAnalysisWrapper {
  private coreService: TweetSentimentAnalysisManager;
  private analysisQueue$ = new Subject<SentimentAnalysisRequest>();
  private stats$ = new BehaviorSubject<SentimentStats>({
    totalAnalyzed: 0,
    averageProcessingTime: 0,
    batchesProcessed: 0,
    cacheHitRate: 0,
    tweetsPerSecond: 0
  });

  private cache = new Map<string, any>();
  private readonly CACHE_TTL = 10 * 60 * 1000; // 10 minutes
  private readonly BATCH_SIZE = 10;
  private readonly BATCH_TIME = 2000; // 2 seconds

  constructor() {
    this.coreService = new TweetSentimentAnalysisManager();
    this.initializeBatchProcessing();
  }

  /**
   * Initialize batch processing pipeline
   */
  private initializeBatchProcessing(): void {
    this.analysisQueue$.pipe(
      // Buffer tweets for batch processing
      bufferTime(this.BATCH_TIME, null, this.BATCH_SIZE),
      filter(batch => batch.length > 0),
      // Process batches
      mergeMap(batch => this.processBatch(batch), 2), // Max 2 concurrent batches
      shareReplay(1)
    ).subscribe({
      next: (results) => this.updateBatchStats(results),
      error: (error) => console.error('Batch processing error:', error)
    });
  }

  /**
   * Analyze single tweet with caching
   */
  analyzeTweet(tweet: Tweet, priority: 'high' | 'normal' | 'low' = 'normal'): Observable<any> {
    const cacheKey = `sentiment_${tweet.id}_${tweet.content.slice(0, 50)}`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
      this.updateCacheHit();
      return new Observable(subscriber => {
        subscriber.next(cached.data);
        subscriber.complete();
      });
    }

    // Create analysis request
    const request: SentimentAnalysisRequest = {
      id: `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tweet,
      timestamp: new Date(),
      priority
    };

    // Queue for batch processing
    this.analysisQueue$.next(request);

    // Return observable for this specific analysis
    return new Observable(subscriber => {
      this.performSingleAnalysis(tweet).subscribe({
        next: (result) => {
          // Cache result
          this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
          subscriber.next(result);
          subscriber.complete();
        },
        error: (error) => subscriber.error(error)
      });
    });
  }

  /**
   * Analyze multiple tweets efficiently
   */
  analyzeTweetsBatch(tweets: Tweet[]): Observable<any[]> {
    const batchStart = Date.now();
    
    return from(tweets).pipe(
      mergeMap(tweet => this.analyzeTweet(tweet, 'normal'), 5), // Process 5 at a time
      bufferTime(5000), // Collect results for 5 seconds
      filter(results => results.length > 0),
      map(results => {
        const processingTime = Date.now() - batchStart;
        this.updateProcessingStats(results.length, processingTime);
        return results;
      })
    );
  }

  /**
   * Real-time sentiment monitoring stream
   */
  getMonitoringStream(): Observable<{
    queueLength: number;
    cacheSize: number;
    stats: SentimentStats;
    recentAnalyses: number;
  }> {
    return timer(0, 2000).pipe(
      map(() => ({
        queueLength: 0, // Would track queue in real implementation
        cacheSize: this.cache.size,
        stats: this.stats$.value,
        recentAnalyses: this.getRecentAnalysesCount()
      }))
    );
  }

  /**
   * Get performance statistics
   */
  getStats(): Observable<SentimentStats> {
    return this.stats$.asObservable();
  }

  /**
   * Process batch of analysis requests
   */
  private processBatch(batch: SentimentAnalysisRequest[]): Observable<any> {
    const batchStart = Date.now();
    
    return from(batch).pipe(
      mergeMap(request => this.performSingleAnalysis(request.tweet), 3),
      bufferTime(1000),
      filter(results => results.length > 0),
      map(results => {
        const processingTime = Date.now() - batchStart;
        return { results, processingTime, batchSize: batch.length };
      }),
      tap(data => this.updateBatchStats(data))
    );
  }

  /**
   * Perform single tweet analysis
   */
  private performSingleAnalysis(tweet: Tweet): Observable<any> {
    return new Observable(subscriber => {
      this.coreService.analyzeTweet(tweet)
        .then(result => {
          subscriber.next(result);
          subscriber.complete();
        })
        .catch(error => subscriber.error(error));
    }).pipe(
      timeout(10000), // 10 second timeout
      retry(2), // Retry twice on failure
      catchError(error => {
        console.error('Sentiment analysis failed:', error);
        return [{ error: 'Analysis failed', tweetId: tweet.id }];
      })
    );
  }

  /**
   * Clean up resources
   */
  shutdown(): void {
    this.analysisQueue$.complete();
    this.stats$.complete();
    this.cache.clear();
  }

  // Helper methods
  private updateBatchStats(data: any): void {
    const current = this.stats$.value;
    const newBatches = current.batchesProcessed + 1;
    
    this.stats$.next({
      ...current,
      batchesProcessed: newBatches,
      totalAnalyzed: current.totalAnalyzed + (data.batchSize || 1)
    });
  }

  private updateProcessingStats(count: number, processingTime: number): void {
    const current = this.stats$.value;
    const newTotal = current.totalAnalyzed + count;
    const newAvgTime = ((current.averageProcessingTime * current.totalAnalyzed) + processingTime) / newTotal;
    const tweetsPerSec = count / (processingTime / 1000);
    
    this.stats$.next({
      ...current,
      totalAnalyzed: newTotal,
      averageProcessingTime: newAvgTime,
      tweetsPerSecond: ((current.tweetsPerSecond * current.totalAnalyzed) + (tweetsPerSec * count)) / newTotal
    });
  }

  private updateCacheHit(): void {
    const current = this.stats$.value;
    const totalRequests = current.totalAnalyzed + 1;
    const cacheHits = Math.floor(current.cacheHitRate * current.totalAnalyzed) + 1;
    
    this.stats$.next({
      ...current,
      cacheHitRate: cacheHits / totalRequests
    });
  }

  private getRecentAnalysesCount(): number {
    // In real implementation, would track recent analyses
    return Math.floor(Math.random() * 10);
  }
}

// Export singleton instance
export const reactiveSentimentAnalyzer = new ReactiveSentimentAnalysisWrapper();
