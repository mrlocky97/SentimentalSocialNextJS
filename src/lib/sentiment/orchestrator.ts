/**
 * Sentiment Analysis Orchestrator
 *
 * This class acts as the integration point for the sentiment analysis engine.
 * It handles I/O-bound tasks like caching, logging, and data mapping (DTOs),
 * while delegating the core analysis to the pure SentimentAnalysisEngine.
 */
import { NaiveBayesTrainingExample } from '../../services/naive-bayes-sentiment.service';
import { SentimentAnalysisEngine } from './engine';
import { AnalysisRequest, AnalysisResult, SentimentOrchestrator, TweetDTO } from './types';

// A simple in-memory cache for demonstration purposes.
// In a production environment, this would be replaced with Redis, Memcached, etc.
const cache = new Map<string, AnalysisResult>();

export class SentimentAnalysisOrchestrator implements SentimentOrchestrator {
  private engine: SentimentAnalysisEngine;

  constructor() {
    this.engine = new SentimentAnalysisEngine();
    // In a real application, you would load a pre-trained model here.
    // this.loadPretrainedModel();
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
   * Analyzes a plain text string, using a cache to avoid re-computation.
   * @param request - The analysis request.
   * @returns The sentiment analysis result.
   */
  async analyzeText(request: AnalysisRequest): Promise<AnalysisResult> {
    const cacheKey = `text:${request.text}:${JSON.stringify(request.language)}`;
    if (cache.has(cacheKey)) {
      console.log(`[Orchestrator] Cache hit for key: ${cacheKey}`);
      return cache.get(cacheKey)!;
    }

    console.log(`[Orchestrator] Cache miss. Analyzing text: "${request.text.substring(0, 50)}..."`);
    try {
      const result = await this.engine.analyze(request);
      cache.set(cacheKey, result);
      return result;
    } catch (error) {
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
    if (cache.has(cacheKey)) {
      console.log(`[Orchestrator] Cache hit for tweet: ${tweet.id}`);
      const cachedResult = cache.get(cacheKey)!;
      return { ...cachedResult, tweetId: tweet.id };
    }

    console.log(`[Orchestrator] Cache miss. Analyzing tweet: ${tweet.id}`);
    const request: AnalysisRequest = {
      text: tweet.text,
      language: tweet.language,
    };

    try {
      const result = await this.engine.analyze(request);
      cache.set(cacheKey, result);
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
