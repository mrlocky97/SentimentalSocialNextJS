/**
 * Twitter Real Scraper Service - OPTIMIZED v3.0
 * High-performance scraping with streamlined API and enhanced resource management
 * Focused on production-ready methods with strict type safety
 */

import { Label } from '../enums/sentiment.enum';
import { logger } from '../lib/observability/logger';
import { defaultMetrics } from '../lib/observability/metrics';
import {
  AuthenticationStatus,
  ScrapedTweetData,
  ScrapingConfig,
  ScrapingOptions,
  ScrapingResult,
  Tweet,
} from '../types/twitter';

// ==================== Constants & Configuration ====================
// Core configuration for production scraping
const LANGUAGE_PATTERNS = Object.freeze(
  new Map<string, RegExp>([
    ['es', /\b(?:el|la|de|en|que|y|es|se|no|por|con|para|muy|pero|más|como|este|otro|todo|hacer|estar)\b/i],
    ['pt', /\b(?:o|a|de|em|que|e|do|da|para|com|não|mais|por|muito|ser|ter|fazer|estar)\b/i],
    ['fr', /\b(?:le|la|de|et|à|un|il|être|avoir|que|pour|dans|sur|avec|ne|pas)\b/i],
    ['de', /\b(?:der|die|das|und|in|den|von|zu|ist|mit|sich|auf|für|als|sie|ein)\b/i],
  ])
);

const HASHTAG_REGEX = /#(\w+)/g;
const AUTH_ERROR_PATTERNS = /Forbidden|Authentication|not logged-in|Scraper is not logged-in/i;

const DEFAULT_CONFIG = Object.freeze({
  headless: true,
  timeout: 45000,
  delay: 2000,
  maxRetries: 1,
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
} as const satisfies Required<ScrapingConfig>);

const RATE_LIMIT_CONFIG = Object.freeze({
  maxRequestsPerHour: 50,
  resetIntervalMs: 3600000, // 1 hour
  maxLoginAttempts: 2,
  loginCooldownMs: 1800000, // 30 minutes
} as const);

// ==================== Types & Interfaces ====================
interface TwitterCredentials {
  readonly username: string;
  readonly password: string;
  readonly email: string;
}

interface RateLimitStatus {
  readonly isLimited: boolean;
  readonly remaining: number;
  readonly resetTime: Date;
  readonly requestCount: number;
  readonly isAuthenticated: boolean;
  readonly loginAttempts: number;
  readonly maxLoginAttempts: number;
  readonly cooldownRemaining: number;
  readonly canAttemptLogin: boolean;
}

// ==================== Utility Functions ====================
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const createDefaultSentiment = (now: Date) => Object.freeze({
  score: 0,
  label: Label.NEUTRAL,
  magnitude: 0,
  confidence: 1,
  keywords: [],
  analyzedAt: now,
  processingTime: 0,
});

const safeParseJson = (jsonString: string): Record<string, any> | null => {
  try {
    const parsed = JSON.parse(jsonString.trim());
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
};

const extractHashtags = (text: string): string[] => {
  const matches = text.match(HASHTAG_REGEX);
  return matches?.map((tag) => tag.substring(1)) ?? [];
};

const calculateEngagement = (metrics: Tweet['metrics']): number =>
  metrics.likes + metrics.retweets + metrics.replies + metrics.quotes;

const recordMetrics = (count: number, queryType: string): void => {
  try {
    defaultMetrics.tweetsScrapedTotal.inc(count, { source: 'twitter', queryType });
  } catch (error) {
    logger.warn('Failed to record metric', { error });
  }
};

// ==================== Main Service Class ====================
export class TwitterRealScraperService {
  private readonly config: Required<ScrapingConfig>;
  private readonly credentials: TwitterCredentials;

  // Rate limiting state
  private requestCount = 0;
  private lastResetTime = Date.now();
  private isRateLimited = false;
  private rateLimitResetTime = new Date();

  // Authentication state
  private scraper: any = null;
  private isAuthenticated = false;
  private loginAttempts = 0;
  private lastLoginAttempt = new Date(0);
  private authStatus: AuthenticationStatus = {
    isAuthenticated: false,
    lastCheck: new Date(),
    consecutiveFailures: 0,
    credentialsValid: false,
  };

  constructor(config: ScrapingConfig = {}) {
    this.config = Object.freeze({ ...DEFAULT_CONFIG, ...config });
    this.credentials = Object.freeze({
      username: process.env.TWITTER_USERNAME ?? '',
      password: process.env.TWITTER_PASSWORD ?? '',
      email: process.env.TWITTER_EMAIL ?? '',
    });

    this.validateConfiguration();
  }

  // ==================== Public API Methods ====================
  async scrapeByHashtag(hashtag: string, options: ScrapingOptions = {}): Promise<ScrapingResult> {
    return this.executeScraping('hashtag', hashtag, options, async (scraper, query, maxTweets) => {
      const searchResults = scraper.searchTweets(`#${query}`, maxTweets);
      return this.collectTweets(searchResults, maxTweets);
    });
  }

  async scrapeByUser(username: string, options: ScrapingOptions = {}): Promise<ScrapingResult> {
    return this.executeScraping('user', username, options, async (scraper, query, maxTweets) => {
      const userTweets = scraper.getTweets(query, maxTweets);
      return this.collectTweets(userTweets, maxTweets);
    });
  }

  /**
   * Scrape with exact count guarantee - will continue until exact number is found
   * @param type - 'user' | 'hashtag'
   * @param query - search query
   * @param exactCount - exact number of tweets needed
   * @param options - scraping options
   * @returns exactly exactCount tweets (or fewer if no more available)
   */
  async scrapeExactCount(
    type: 'user' | 'hashtag',
    query: string,
    exactCount: number,
    options: ScrapingOptions = {}
  ): Promise<ScrapingResult> {
    const enhancedOptions = { ...options, maxTweets: exactCount };
    
    if (type === 'user') {
      return this.scrapeByUser(query, enhancedOptions);
    } else {
      return this.scrapeByHashtag(query, enhancedOptions);
    }
  }

  getRateLimitStatus(): RateLimitStatus {
    const timeSinceLastAttempt = Date.now() - this.lastLoginAttempt.getTime();
    const cooldownRemaining = Math.max(0, RATE_LIMIT_CONFIG.loginCooldownMs - timeSinceLastAttempt);

    return Object.freeze({
      isLimited: this.isRateLimited,
      remaining: RATE_LIMIT_CONFIG.maxRequestsPerHour - this.requestCount,
      resetTime: this.rateLimitResetTime,
      requestCount: this.requestCount,
      isAuthenticated: this.isAuthenticated,
      loginAttempts: this.loginAttempts,
      maxLoginAttempts: RATE_LIMIT_CONFIG.maxLoginAttempts,
      cooldownRemaining: Math.ceil(cooldownRemaining / 60000),
      canAttemptLogin:
        this.loginAttempts < RATE_LIMIT_CONFIG.maxLoginAttempts || cooldownRemaining <= 0,
    });
  }

  getAuthenticationStatus(): AuthenticationStatus {
    return structuredClone(this.authStatus);
  }

  async checkAuthenticationHealth(): Promise<boolean> {
    if (!this.scraper || !this.isAuthenticated) {
      return false;
    }

    try {
      const isLoggedIn = await this.scraper.isLoggedIn();
      this.updateAuthStatus(isLoggedIn);
      return isLoggedIn;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Health check failed';
      this.updateAuthStatus(false, errorMessage);
      return false;
    }
  }


  /**
   * Adaptive scraping that continues until the exact number of tweets is found
   * or no more tweets are available
   * @param type - 'user' | 'hashtag'
   * @param query - search query
   * @param targetCount - exact number of tweets desired
   * @param options - scraping options
   * @returns scraping result with exactly targetCount tweets (or fewer if exhausted)
   */
  private async adaptiveScraping(
    type: string,
    query: string,
    targetCount: number,
    options: ScrapingOptions,
    scraperFunction: (scraper: any, query: string, maxTweets: number) => Promise<ScrapedTweetData[]>
  ): Promise<ScrapingResult> {
    const collectedTweets: Tweet[] = [];
    const seenIds = new Set<string>();
    const allErrors: string[] = [];
    let totalScraped = 0;
    let attempt = 1;
    const maxAttempts = 5; // Prevent infinite loops
    const batchSize = Math.max(targetCount, 20); // Always scrape at least 20 to account for filtering

    logger.info('Starting adaptive scraping', {
      type,
      query,
      targetCount,
      batchSize,
      maxAttempts,
      filters: {
        maxAgeHours: options.maxAgeHours,
        language: options.language,
        includeReplies: options.includeReplies,
      },
    });

    const scraper = await this.initializeScraper();

    while (collectedTweets.length < targetCount && attempt <= maxAttempts) {
      try {
        logger.info(`Adaptive scraping attempt ${attempt}/${maxAttempts}`, {
          currentCount: collectedTweets.length,
          targetCount,
          remaining: targetCount - collectedTweets.length,
        });

        await sleep(this.config.delay * attempt); // Increasing delay between attempts

        // Calculate how many more tweets to scrape
        const remainingNeeded = targetCount - collectedTweets.length;
        
        // Use adaptive batch sizing: scrape more if we're filtering heavily
        const adaptiveBatchSize = Math.min(
          1000, // API limit
          Math.max(
            batchSize,
            remainingNeeded * 3 // Scrape 3x more to account for filtering
          )
        );

        logger.debug('Executing scraping batch', {
          attempt,
          adaptiveBatchSize,
          remainingNeeded,
        });

        const batchData = await scraperFunction(scraper, query, adaptiveBatchSize);
        totalScraped += batchData.length;

        if (batchData.length === 0) {
          logger.info('No more tweets available from source', {
            attempt,
            totalFound: collectedTweets.length,
            targetCount,
          });
          break; // No more tweets available
        }

        // Process the batch with detailed stats
        const { tweets: processedTweets, stats } = this.processTweetsWithStats(batchData, options);

        // Filter out duplicates and add new tweets
        let newTweetsAdded = 0;
        for (const tweet of processedTweets) {
          if (!seenIds.has(tweet.id) && collectedTweets.length < targetCount) {
            seenIds.add(tweet.id);
            collectedTweets.push(tweet);
            newTweetsAdded++;
          }
        }

        logger.info(`Attempt ${attempt} completed`, {
          batchScraped: batchData.length,
          batchProcessed: processedTweets.length,
          newTweetsAdded,
          totalCollected: collectedTweets.length,
          targetCount,
          filteringStats: stats,
        });

        // If we got very few new tweets despite scraping many, we might be hitting limits
        if (batchData.length >= 10 && newTweetsAdded === 0) {
          logger.warn('No new tweets found despite successful scraping - may have exhausted unique content', {
            attempt,
            batchScraped: batchData.length,
            totalCollected: collectedTweets.length,
          });
          break;
        }

        // If we got exactly what we wanted, we're done
        if (collectedTweets.length >= targetCount) {
          logger.info('Target count reached!', {
            collected: collectedTweets.length,
            targetCount,
            attempts: attempt,
          });
          break;
        }

        attempt++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        allErrors.push(`Attempt ${attempt}: ${errorMessage}`);
        
        logger.warn(`Adaptive scraping attempt ${attempt} failed`, {
          error: errorMessage,
          currentCount: collectedTweets.length,
          targetCount,
        });

        // If it's an auth error, don't continue
        if (AUTH_ERROR_PATTERNS.test(errorMessage)) {
          logger.error('Authentication error in adaptive scraping', { error: errorMessage });
          throw error;
        }

        attempt++;
        // Add exponential backoff for retries
        await sleep(this.config.delay * Math.pow(2, attempt - 1));
      }
    }

    const finalResult = {
      tweets: collectedTweets.slice(0, targetCount), // Ensure exact count
      totalFound: totalScraped,
      totalScraped: collectedTweets.length,
      errors: allErrors,
      rateLimit: {
        remaining: RATE_LIMIT_CONFIG.maxRequestsPerHour - this.requestCount,
        resetTime: this.rateLimitResetTime,
      },
    };

    logger.info('Adaptive scraping completed', {
      requested: targetCount,
      collected: finalResult.tweets.length,
      totalAttempts: attempt - 1,
      totalScrapedFromSource: totalScraped,
      success: finalResult.tweets.length === targetCount,
      errors: allErrors.length,
    });

    recordMetrics(finalResult.tweets.length, type);
    this.requestCount++;

    return finalResult;
  }

  /**
   * Centralized scraping execution with adaptive behavior and error handling
   * @param type - 'user' | 'hashtag'
   * @param query query string (username or hashtag)
   * @param options scraping options
   * @param scraperFunction function that performs the actual scraping
   * @returns scraping result with exactly the requested number of tweets (or fewer if exhausted)
   */
  private async executeScraping(
    type: string,
    query: string,
    options: ScrapingOptions,
    scraperFunction: (scraper: any, query: string, maxTweets: number) => Promise<ScrapedTweetData[]>
  ): Promise<ScrapingResult> {
    try {
      this.validateRateLimit();
      
      const targetCount = Math.min(
        1000,
        Math.max(1, options.maxTweets ?? (type === 'user' ? 30 : 50))
      );

      logger.info('Starting scraping operation', {
        type,
        query,
        targetCount,
        options: {
          maxAgeHours: options.maxAgeHours,
          language: options.language,
          includeReplies: options.includeReplies,
        },
      });

      // Use adaptive scraping to get exactly the number requested
      const result = await this.adaptiveScraping(
        type,
        query,
        targetCount,
        options,
        scraperFunction
      );

      logger.info('Scraping operation completed', {
        type,
        query,
        requested: targetCount,
        scraped: result.totalFound,
        processed: result.totalScraped,
        delivered: result.tweets.length,
        success: result.tweets.length === targetCount,
        filteringEfficiency: result.totalFound > 0 
          ? `${Math.round((result.tweets.length / result.totalFound) * 100)}%`
          : '0%',
      });

      return result;
    } catch (error) {
      return this.handleScrapingError(error);
    }
  }

  /**
   * Collect tweets from an async iterable with a maximum limit
   * @param tweetIterator async iterable of scraped tweets
   * @param maxTweets maximum number of tweets to collect
   * @returns array of scraped tweet data
   */
  private async collectTweets(
    tweetIterator: AsyncIterable<any>,
    maxTweets: number
  ): Promise<ScrapedTweetData[]> {
    const scrapedTweets: ScrapedTweetData[] = [];

    try {
      for await (const [tweet, index] of this.withIndex(tweetIterator)) {
        if (index >= maxTweets) break;
        scrapedTweets.push(tweet);
      }
    } catch (error) {
      logger.warn('Error during tweet collection', { error });
    }

    return scrapedTweets;
  }

  private async *withIndex<T>(iterable: AsyncIterable<T>): AsyncGenerator<[T, number]> {
    let index = 0;
    for await (const item of iterable) {
      yield [item, index++];
    }
  }

  /**
   * Initialize and authenticate the scraper instance
   * @returns initialized and authenticated scraper instance
   */
  private async initializeScraper(): Promise<any> {
    if (this.scraper && this.isAuthenticated) {
      return this.scraper;
    }

    this.validateLoginAttempts();

    try {
      const { Scraper } = await import('@the-convocation/twitter-scraper');
      this.scraper = new Scraper();
      this.lastLoginAttempt = new Date();
      this.loginAttempts++;

      // Try cookie authentication first
      if (await this.tryAuthenticateWithCookies()) {
        this.updateAuthStatus(true);
        return this.scraper;
      }

      // Fallback to credentials
      await this.authenticateWithCredentials();
      this.updateAuthStatus(true);
      return this.scraper;
    } catch (error) {
      this.handleAuthFailure(error);
      throw error;
    }
  }

  /**
   * Attempt to authenticate using cookies from environment variable
   * @returns true if authentication succeeded, false otherwise
   */
  private async tryAuthenticateWithCookies(): Promise<boolean> {
    const cookiesEnv = process.env.TWITTER_COOKIES?.trim();
    if (!cookiesEnv || !this.scraper) {
      return false;
    }

    try {
      const cookiesObj = safeParseJson(cookiesEnv);
      if (!cookiesObj?.auth_token || !cookiesObj?.ct0) {
        logger.warn('Invalid cookie format: missing essential cookies');
        return false;
      }

      const cookieStrings = Object.entries(cookiesObj).map(
        ([name, value]) => `${name}=${value}; Domain=.x.com; Path=/`
      );

      if ('setCookies' in this.scraper && typeof this.scraper.setCookies === 'function') {
        await this.scraper.setCookies(cookieStrings);
      } else if ('withCookies' in this.scraper && typeof this.scraper.withCookies === 'function') {
        this.scraper = this.scraper.withCookies(cookieStrings);
      } else {
        return false;
      }

      this.isAuthenticated = await this.scraper.isLoggedIn().catch(() => false);
      return this.isAuthenticated;
    } catch (error) {
      logger.warn('Cookie authentication failed', { error });
      return false;
    }
  }

  private async authenticateWithCredentials(): Promise<void> {
    if (!this.scraper) {
      throw new Error('Scraper not initialized');
    }

    const { username, password, email } = this.credentials;
    if (!username || !password || !email) {
      throw new Error('Twitter credentials not configured in environment variables');
    }

    await sleep(2000); // Anti-detection delay
    await this.scraper.login(username, password, email);
    this.isAuthenticated = true;
  }

  /**
   * Process and normalize scraped tweets with efficient filtering
   * @param scrapedData - raw scraped tweet data
   * @param options - scraping options for filtering
   * @returns processed tweets and filtering statistics
   */
  private processTweetsWithStats(scrapedData: ScrapedTweetData[], options: ScrapingOptions): {
    tweets: Tweet[];
    stats: {
      inputCount: number;
      outputCount: number;
      filteredByAge: number;
      filteredByLanguage: number;
      failedToProcess: number;
      duplicatesFiltered: number;
    };
  } {
    const now = new Date();
    const maxAge = options.maxAgeHours ? options.maxAgeHours * 3600000 : Infinity;
    const shouldFilterLanguage = Boolean(options.language && options.language !== 'all');
    const targetLanguage = options.language;

    const processedTweets: Tweet[] = [];
    const seenIds = new Set<string>();
    
    // Initialize counters for efficient tracking
    const stats = {
      inputCount: scrapedData.length,
      outputCount: 0,
      filteredByAge: 0,
      filteredByLanguage: 0,
      failedToProcess: 0,
      duplicatesFiltered: 0,
    };

    for (const item of scrapedData) {
      try {
        const tweet = this.normalizeTweet(item, now);

        // Duplicate check - early exit for performance
        if (seenIds.has(tweet.id)) {
          stats.duplicatesFiltered++;
          continue;
        }
        seenIds.add(tweet.id);

        // Age filtering
        if (options.maxAgeHours && (now.getTime() - tweet.createdAt.getTime()) > maxAge) {
          stats.filteredByAge++;
          continue;
        }

        // Language filtering
        if (shouldFilterLanguage && tweet.language && 
            tweet.language !== 'unknown' && tweet.language !== targetLanguage) {
          stats.filteredByLanguage++;
          continue;
        }

        processedTweets.push(tweet);
      } catch {
        stats.failedToProcess++;
        // Create minimal fallback tweet if possible
        const fallbackTweet = this.createFallbackTweet(item, now);
        if (fallbackTweet && !seenIds.has(fallbackTweet.id)) {
          seenIds.add(fallbackTweet.id);
          processedTweets.push(fallbackTweet);
        }
      }
    }

    stats.outputCount = processedTweets.length;

    // Concise logging for production
    logger.debug('Tweet processing completed', {
      input: stats.inputCount,
      output: stats.outputCount,
      filtered: stats.inputCount - stats.outputCount,
    });

    // Record metrics efficiently
    try {
      defaultMetrics.tweetsProcessedTotal.inc(stats.outputCount, { pipeline: 'adaptive' });
    } catch {
      // Silent fail for metrics
    }

    return { tweets: processedTweets, stats };
  }

  /**
   * Legacy wrapper for backward compatibility
   * @param scrapedData - raw scraped tweet data
   * @param options - scraping options for filtering
   * @returns processed and normalized tweets
   */
  private processTweets(scrapedData: ScrapedTweetData[], options: ScrapingOptions): Tweet[] {
    const result = this.processTweetsWithStats(scrapedData, options);
    
    // Log summary for legacy calls
    logger.info('Tweet processing completed', {
      inputCount: result.stats.inputCount,
      outputCount: result.stats.outputCount,
      filteredByAge: result.stats.filteredByAge,
      filteredByLanguage: result.stats.filteredByLanguage,
      failedToProcess: result.stats.failedToProcess,
      duplicatesFiltered: result.stats.duplicatesFiltered,
    });

    return result.tweets;
  }

  /**
   * Normalize raw scraped tweet data into structured Tweet object - optimized version
   * @param data - raw scraped tweet data
   * @param now - current timestamp for reference
   * @returns normalized Tweet object
   */
  private normalizeTweet(data: ScrapedTweetData, now: Date): Tweet {
    // Core identifiers with optimized fallbacks
    const tweetId = data.id || data.__raw_UNSTABLE?.id_str || 
      `scraped_${now.getTime()}_${Math.random().toString(36).slice(2, 11)}`;
    const conversationId = data.conversationId || data.__raw_UNSTABLE?.conversation_id_str || tweetId;
    const content = data.text || data.content || data.full_text || data.__raw_UNSTABLE?.full_text || '';

    // Extract metrics efficiently
    const rawMetrics = {
      likes: data.likes || data.favorite_count || data.favoriteCount || data.__raw_UNSTABLE?.favorite_count || 0,
      retweets: data.retweets || data.retweet_count || data.retweetCount || data.__raw_UNSTABLE?.retweet_count || 0,
      replies: data.replies || data.reply_count || data.replyCount || data.__raw_UNSTABLE?.reply_count || 0,
      quotes: data.quote_count || data.quoteCount || data.__raw_UNSTABLE?.quote_count || 0,
      bookmarks: data.bookmarkCount || data.__raw_UNSTABLE?.bookmark_count || 0,
      views: data.views || Math.max(0, (data.likes || data.favorite_count || 0) * 10),
      engagement: 0,
    };
    rawMetrics.engagement = calculateEngagement(rawMetrics);

    // Extract media data once and destructure
    const { mediaUrls, photoData } = this.extractMediaData(data);

    return {
      id: tweetId,
      tweetId,
      conversationId,
      content,
      author: this.extractAuthorData(data, now),
      metrics: rawMetrics,
      hashtags: this.extractHashtags(data, content),
      mentions: this.extractMentions(data),
      urls: this.extractUrls(data),
      mediaUrls,
      photoData,
      isRetweet: Boolean(data.isRetweet || data.is_retweet || data.__raw_UNSTABLE?.retweeted),
      isReply: Boolean(data.isReply || content.startsWith('@') || 
        (data.__raw_UNSTABLE?.display_text_range && data.__raw_UNSTABLE?.display_text_range[0] > 0)),
      isQuote: Boolean(data.isQuoted || data.isQuote || data.is_quote_status || data.__raw_UNSTABLE?.is_quote_status),
      isEdited: Boolean(data.isEdited),
      isPinned: Boolean(data.isPin),
      isSensitive: Boolean(data.sensitiveContent || data.possibly_sensitive || data.__raw_UNSTABLE?.possibly_sensitive),
      language: this.detectTweetLanguage(data),
      location: this.extractLocationData(data),
      permanentUrl: data.permanentUrl,
      htmlContent: data.html,
      scrapedAt: now,
      createdAt: this.parseCreatedAtEnhanced(data, now),
      updatedAt: now,
      sentiment: createDefaultSentiment(now),
    };
  }

  /**
   * Extract and normalize author/user data from scraped tweet
   * @param data - raw scraped tweet data
   * @param now - current timestamp for reference
   * @returns normalized TwitterUser object
   */
  private extractAuthorData(data: ScrapedTweetData, now: Date) {
    // Extract user data from direct fields (preferred)
    const directUser =
      data.userId && data.username && data.name
        ? {
            id: data.userId,
            username: data.username,
            displayName: data.name,
          }
        : null;

    // Try multiple user data sources
    const user = directUser || data.user || (data as any).author || (data as any).account;

    if (!user) {
      return this.createDefaultAuthor(now);
    }

    return {
      id: user.id_str || user.id || user.userId || 'unknown',
      username: user.screen_name || user.username || user.handle || 'unknown',
      displayName: user.name || user.displayName || user.display_name || 'Unknown User',
      avatar: user.profile_image_url_https || user.profile_image_url || user.avatar || '',
      verified: Boolean(user.verified || user.is_verified),
      followersCount: Math.max(
        0,
        user.followers_count || user.followersCount || user.followers || 0
      ),
      followingCount: Math.max(
        0,
        user.following_count || user.followingCount || user.following || 0
      ),
      tweetsCount: Math.max(0, user.statuses_count || user.statusesCount || user.tweets_count || 0),
      location: user.location || '',
      bio: user.description || user.bio || '',
      website: user.url || user.website || '',
      joinedDate: now,
    };
  }

  /**
   * Create a minimal fallback tweet for items that failed to process normally
   * @param data - raw scraped tweet data
   * @param now - current timestamp
   * @returns minimal Tweet object or null if impossible to create
   */
  private createFallbackTweet(data: ScrapedTweetData, now: Date): Tweet | null {
    try {
      // Must have at least some content to be useful
      const content = data.text || data.content || data.full_text || '';
      if (!content.trim()) {
        return null;
      }

      const tweetId =
        data.id || `fallback_${now.getTime()}_${Math.random().toString(36).slice(2, 8)}`;

      return {
        id: tweetId,
        tweetId,
        conversationId: tweetId,
        content: content.trim(),
        author: this.createDefaultAuthor(now),
        metrics: {
          likes: 0,
          retweets: 0,
          replies: 0,
          quotes: 0,
          bookmarks: 0,
          views: 0,
          engagement: 0,
        },
        hashtags: extractHashtags(content),
        mentions: [],
        urls: [],
        mediaUrls: [],
        isRetweet: false,
        isReply: false,
        isQuote: false,
        isEdited: false,
        isPinned: false,
        isSensitive: false,
        language: 'unknown',
        scrapedAt: now,
        createdAt: now,
        updatedAt: now,
        sentiment: createDefaultSentiment(now),
      };
    } catch (error) {
      logger.error('Failed to create fallback tweet', { error });
      return null;
    }
  }

  private createDefaultAuthor(now: Date) {
    return Object.freeze({
      id: 'unknown',
      username: 'unknown',
      displayName: 'Unknown User',
      avatar: '',
      verified: false,
      followersCount: 0,
      followingCount: 0,
      tweetsCount: 0,
      location: '',
      bio: '',
      website: '',
      joinedDate: now,
    });
  }

  /**
   * Detect tweet language using multiple heuristics
   * @param data - raw scraped tweet data
   * @returns ISO language code or 'unknown'
   */
  private detectTweetLanguage(data: ScrapedTweetData): string {
    // Use provided language if available and valid
    if (data.lang && data.lang !== 'und') return data.lang;
    if (data.language && data.language !== 'und') return data.language;

    const text = (data.text ?? data.content ?? '').toLowerCase();
    if (!text.trim()) return 'unknown';

    // Pattern matching for common languages
    for (const [lang, pattern] of LANGUAGE_PATTERNS) {
      if (pattern.test(text)) return lang;
    }

    return 'unknown';
  }

  private parseCreatedAt(data: ScrapedTweetData, fallback: Date): Date {
    const createdAt = data.created_at ?? data.createdAt;
    if (!createdAt) return fallback;

    const parsed = new Date(createdAt);
    return Number.isNaN(parsed.getTime()) ? fallback : parsed;
  }

  private parseCreatedAtEnhanced(data: ScrapedTweetData, fallback: Date): Date {
    // Try multiple timestamp sources
    if (data.timeParsed) {
      const parsed = new Date(data.timeParsed);
      if (!isNaN(parsed.getTime())) return parsed;
    }

    if (data.timestamp) {
      // Handle both seconds and milliseconds timestamps
      const timestampMs = data.timestamp > 1e10 ? data.timestamp : data.timestamp * 1000;
      const parsed = new Date(timestampMs);
      if (!isNaN(parsed.getTime())) return parsed;
    }

    if (data.__raw_UNSTABLE?.created_at) {
      const parsed = new Date(data.__raw_UNSTABLE.created_at);
      if (!isNaN(parsed.getTime())) return parsed;
    }

    // Fallback to original method
    return this.parseCreatedAt(data, fallback);
  }

  private extractHashtags(data: ScrapedTweetData, content: string): string[] {
    const hashtags: string[] = [];

    // Extract from structured data
    if (data.hashtags) {
      if (Array.isArray(data.hashtags)) {
        hashtags.push(...data.hashtags.map((h: any) => (typeof h === 'string' ? h : h.text)));
      }
    }

    // Extract from raw data
    if (data.__raw_UNSTABLE?.entities?.hashtags) {
      hashtags.push(...data.__raw_UNSTABLE.entities.hashtags.map((h: any) => h.text));
    }

    // Fallback: extract from content
    if (hashtags.length === 0) {
      hashtags.push(...extractHashtags(content));
    }

    return [...new Set(hashtags)]; // Remove duplicates
  }

  private extractMentions(data: ScrapedTweetData): string[] {
    const mentions: string[] = [];

    // Extract from structured data
    if (data.mentions && Array.isArray(data.mentions)) {
      mentions.push(
        ...data.mentions.map((m: any) => m.screen_name || m.username || '').filter(Boolean)
      );
    }

    // Extract from raw data
    if (data.__raw_UNSTABLE?.entities?.user_mentions) {
      mentions.push(
        ...data.__raw_UNSTABLE.entities.user_mentions
          .map((m: any) => m.screen_name || '')
          .filter(Boolean)
      );
    }

    return [...new Set(mentions)]; // Remove duplicates
  }

  private extractUrls(data: ScrapedTweetData): string[] {
    const urls: string[] = [];

    // Extract from structured data
    if (data.urls && Array.isArray(data.urls)) {
      urls.push(
        ...data.urls
          .map((u: any) => (typeof u === 'string' ? u : u.expanded_url || u.url || ''))
          .filter(Boolean)
      );
    }

    // Extract from raw data
    if (data.__raw_UNSTABLE?.entities?.urls) {
      urls.push(
        ...data.__raw_UNSTABLE.entities.urls
          .map((u: any) => u.expanded_url || u.url || '')
          .filter(Boolean)
      );
    }

    return [...new Set(urls)]; // Remove duplicates
  }

  private extractMediaData(data: ScrapedTweetData): { mediaUrls: string[]; photoData?: any[] } {
    const mediaUrls: string[] = [];
    const photoData: any[] = [];

    // Extract from photos array
    if (data.photos && Array.isArray(data.photos)) {
      photoData.push(...data.photos);
      mediaUrls.push(...data.photos.map((p: any) => p.url).filter(Boolean));
    }

    // Extract from raw media data
    if (data.__raw_UNSTABLE?.entities?.media) {
      photoData.push(...data.__raw_UNSTABLE.entities.media);
      mediaUrls.push(
        ...data.__raw_UNSTABLE.entities.media
          .map((m: any) => m.media_url_https || m.url || '')
          .filter(Boolean)
      );
    }

    // Extract from extended_entities for higher quality
    if (data.__raw_UNSTABLE?.extended_entities?.media) {
      photoData.push(...data.__raw_UNSTABLE.extended_entities.media);
      mediaUrls.push(
        ...data.__raw_UNSTABLE.extended_entities.media
          .map((m: any) => m.media_url_https || m.url || '')
          .filter(Boolean)
      );
    }

    // Legacy media field
    if (data.media && Array.isArray(data.media)) {
      mediaUrls.push(
        ...data.media.map((m: any) => m.media_url_https || m.url || '').filter(Boolean)
      );
    }

    return {
      mediaUrls: [...new Set(mediaUrls)], // Remove duplicates
      photoData: photoData.length > 0 ? photoData : undefined,
    };
  }

  private extractLocationData(data: ScrapedTweetData): any {
    if (data.place) {
      return {
        id: data.place.id,
        name: data.place.name,
        fullName: data.place.full_name,
        country: data.place.country,
        countryCode: data.place.country_code,
        placeType: data.place.place_type,
        boundingBox: data.place.bounding_box,
        url: data.place.url,
      };
    }

    if (data.__raw_UNSTABLE?.place) {
      const place = data.__raw_UNSTABLE.place;
      return {
        id: place.id,
        name: place.name,
        fullName: place.full_name,
        country: place.country,
        countryCode: place.country_code,
        placeType: place.place_type,
        boundingBox: place.bounding_box,
        url: place.url,
      };
    }

    return undefined;
  }

  // ==================== Validation & Error Handling ====================
  private validateConfiguration(): void {
    const { username, password, email } = this.credentials;
    if (!username || !password || !email) {
      logger.warn('Twitter credentials not fully configured - authentication may fail');
    }
  }

  /**
   * Validate and enforce rate limiting based on configuration
   * @throws Error if rate limit is exceeded
   */
  private validateRateLimit(): void {
    const now = Date.now();
    const timeSinceReset = now - this.lastResetTime;

    if (timeSinceReset >= RATE_LIMIT_CONFIG.resetIntervalMs) {
      this.requestCount = 0;
      this.lastResetTime = now;
      this.isRateLimited = false;
      this.rateLimitResetTime = new Date(now + RATE_LIMIT_CONFIG.resetIntervalMs);
    }

    if (this.requestCount >= RATE_LIMIT_CONFIG.maxRequestsPerHour) {
      this.isRateLimited = true;
      throw new Error('Rate limit exceeded. Please wait before making more requests.');
    }
  }

  private validateLoginAttempts(): void {
    const timeSinceLastAttempt = Date.now() - this.lastLoginAttempt.getTime();
    const inCooldown = timeSinceLastAttempt < RATE_LIMIT_CONFIG.loginCooldownMs;

    if (this.loginAttempts >= RATE_LIMIT_CONFIG.maxLoginAttempts && inCooldown) {
      throw new Error('Login attempts exceeded. Please wait before trying again.');
    }
  }

  private handleScrapingError(error: unknown): ScrapingResult {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isAuthError = AUTH_ERROR_PATTERNS.test(errorMessage);

    if (isAuthError) {
      this.handleAuthFailure(error);
      throw error;
    }

    logger.warn('Non-critical scraping error', { error: errorMessage });

    return {
      tweets: [],
      totalFound: 0,
      totalScraped: 0,
      errors: [errorMessage],
      rateLimit: {
        remaining: RATE_LIMIT_CONFIG.maxRequestsPerHour - this.requestCount,
        resetTime: this.rateLimitResetTime,
      },
    };
  }

  private handleAuthFailure(error: unknown): void {
    this.isAuthenticated = false;
    this.scraper = null;
    const errorMessage = error instanceof Error ? error.message : 'Unknown authentication error';
    this.updateAuthStatus(false, errorMessage);
    logger.error('Authentication failure', { error: errorMessage });
  }

  private updateAuthStatus(isSuccess: boolean, error?: string): void {
    const now = new Date();

    if (isSuccess) {
      this.authStatus = Object.freeze({
        isAuthenticated: true,
        lastCheck: now,
        consecutiveFailures: 0,
        credentialsValid: true,
      });
      logger.info('Authentication successful');
    } else {
      const consecutiveFailures = this.authStatus.consecutiveFailures + 1;
      const backoffMinutes = Math.min(30 * Math.pow(2, consecutiveFailures - 1), 1440);

      this.authStatus = Object.freeze({
        isAuthenticated: false,
        lastCheck: now,
        lastError: error ?? 'Unknown error',
        consecutiveFailures,
        nextRetryTime: new Date(Date.now() + backoffMinutes * 60000),
        credentialsValid: consecutiveFailures < 3,
      });

      logger.error('Authentication failed', {
        error,
        consecutiveFailures,
        nextRetryTime: this.authStatus.nextRetryTime,
      });
    }
  }

  private shouldRetryAuth(): boolean {
    return !this.authStatus.nextRetryTime || Date.now() >= this.authStatus.nextRetryTime.getTime();
  }
}
