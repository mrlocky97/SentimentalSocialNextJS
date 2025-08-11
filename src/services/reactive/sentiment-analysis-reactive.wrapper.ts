/**
 * Reactive Sentiment Analysis Wrapper - SIMPLIFIED
 * RxJS optimization wrapper using only the main TweetSentimentAnalysisManager
 */

import { Observable, BehaviorSubject, from } from 'rxjs';
import { map, catchError, shareReplay, tap, retry, timeout } from 'rxjs/operators';
import { TweetSentimentAnalysisManager } from '../tweet-sentiment-analysis.manager.service';
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
  cacheHitRate: number;
  tweetsPerSecond: number;
}

class ReactiveSentimentAnalysisWrapper {
  private coreService: TweetSentimentAnalysisManager;
  private stats$ = new BehaviorSubject<SentimentStats>({
    totalAnalyzed: 0,
    averageProcessingTime: 0,
    cacheHitRate: 0,
    tweetsPerSecond: 0,
  });

  private cache = new Map<string, any>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private startTime = Date.now();

  constructor() {
    this.coreService = new TweetSentimentAnalysisManager();
  }

  // Simplified analysis method
  analyzeTweet(tweet: Tweet): Observable<any> {
    return from(this.processSingleTweet(tweet)).pipe(
      timeout(10000), // 10 second timeout
      retry(2),
      catchError((error) => {
        return from([{ error: 'Analysis failed', tweetId: tweet.id }]);
      }),
      shareReplay(1)
    );
  }

  private async processSingleTweet(tweet: Tweet): Promise<any> {
    const startTime = Date.now();

    // Check cache first
    const cached = this.getCacheResult(tweet.id);
    if (cached) {
      return cached;
    }

    // Process with core service
    const result = await this.coreService.analyzeTweet(tweet);

    // Cache result
    this.setCacheResult(tweet.id, result);

    // Update stats
    const processingTime = Date.now() - startTime;
    this.updateProcessingStats(1, processingTime);

    return result;
  }

  // Analyze multiple tweets
  analyzeTweetsBatch(tweets: Tweet[]): Observable<any[]> {
    return from(Promise.all(tweets.map((tweet) => this.processSingleTweet(tweet)))).pipe(
      catchError((error) => {
        return from([]);
      }),
      shareReplay(1)
    );
  }

  // Cache management
  private getCacheResult(tweetId: string): any | null {
    const cacheKey = `sentiment_${tweetId}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      this.updateCacheHit();
      return cached.data;
    }

    return null;
  }

  private setCacheResult(tweetId: string, result: any): void {
    const cacheKey = `sentiment_${tweetId}`;
    this.cache.set(cacheKey, {
      data: result,
      timestamp: Date.now(),
    });
  }

  private updateCacheHit(): void {
    const current = this.stats$.value;
    this.stats$.next({
      ...current,
      cacheHitRate: current.cacheHitRate + 1,
    });
  }

  private updateProcessingStats(count: number, processingTime: number): void {
    const current = this.stats$.value;
    const newTotal = current.totalAnalyzed + count;

    this.stats$.next({
      ...current,
      totalAnalyzed: newTotal,
      averageProcessingTime: (current.averageProcessingTime + processingTime) / 2,
      tweetsPerSecond: newTotal / ((Date.now() - this.startTime) / 1000),
    });
  }

  // Public API
  getStats(): Observable<SentimentStats> {
    return this.stats$.asObservable();
  }

  clearCache(): void {
    this.cache.clear();
  }

  // Cleanup
  destroy(): void {
    this.cache.clear();
    this.stats$.complete();
  }
}

// Export singleton instance
export const reactiveSentimentAnalyzer = new ReactiveSentimentAnalysisWrapper();
export default ReactiveSentimentAnalysisWrapper;
