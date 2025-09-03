/**
 * Twitter Real Scraper Service - OPTIMIZED
 * Real implementation using @the-convocation/twitter-scraper for scraping without official API
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
const LANGUAGE_PATTERNS = new Map([
  [
    'es',
    /\b(el|la|de|en|que|y|es|se|no|por|con|para|muy|pero|más|como|este|otro|todo|hacer|estar)\b/i,
  ],
  ['pt', /\b(o|a|de|em|que|e|do|da|para|com|não|mais|por|muito|ser|ter|fazer|estar)\b/i],
  ['fr', /\b(le|la|de|et|à|un|il|être|avoir|que|pour|dans|sur|avec|ne|pas)\b/i],
  ['de', /\b(der|die|das|und|in|den|von|zu|ist|mit|sich|auf|für|als|sie|ein)\b/i],
] as const);

const HASHTAG_REGEX = /#(\w+)/g;
const AUTH_ERROR_PATTERNS = /Forbidden|Authentication|not logged-in|Scraper is not logged-in/i;

const DEFAULT_CONFIG: Required<ScrapingConfig> = {
  headless: true,
  timeout: 45000,
  delay: 2000,
  maxRetries: 1,
  userAgent:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
} as const;

const RATE_LIMIT_CONFIG = {
  maxRequestsPerHour: 50,
  resetIntervalMs: 60 * 60 * 1000, // 1 hour
  maxLoginAttempts: 2,
  loginCooldownMs: 30 * 60 * 1000, // 30 minutes
} as const;

// ==================== Types & Interfaces ====================
interface TwitterCredentials {
  username: string;
  password: string;
  email: string;
}

interface RateLimitStatus {
  isLimited: boolean;
  remaining: number;
  resetTime: Date;
  requestCount: number;
  isAuthenticated: boolean;
  loginAttempts: number;
  maxLoginAttempts: number;
  cooldownRemaining: number;
  canAttemptLogin: boolean;
}

// ==================== Utility Functions ====================
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const createDefaultSentiment = (now: Date) => ({
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
  return matches?.map((tag) => tag.substring(1)) || [];
};

const calculateEngagement = (metrics: Tweet['metrics']): number => {
  const { likes, retweets, replies, quotes } = metrics;
  return likes + retweets + replies + quotes;
};

const recordMetrics = (operation: string, count: number, queryType: string): void => {
  try {
    defaultMetrics.tweetsScrapedTotal.inc(count, {
      source: 'twitter',
      queryType,
    });
  } catch (error) {
    logger.warn(`Failed to record ${operation} metric`, { error });
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
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.credentials = {
      username: process.env.TWITTER_USERNAME || '',
      password: process.env.TWITTER_PASSWORD || '',
      email: process.env.TWITTER_EMAIL || '',
    };

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

  getRateLimitStatus(): RateLimitStatus {
    const timeSinceLastAttempt = Date.now() - this.lastLoginAttempt.getTime();
    const cooldownRemaining = Math.max(0, RATE_LIMIT_CONFIG.loginCooldownMs - timeSinceLastAttempt);

    return {
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
    };
  }

  getAuthenticationStatus(): AuthenticationStatus {
    return { ...this.authStatus };
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

  // ==================== Private Core Methods ====================
  private async executeScraping(
    type: string,
    query: string,
    options: ScrapingOptions,
    scraperFunction: (scraper: any, query: string, maxTweets: number) => Promise<ScrapedTweetData[]>
  ): Promise<ScrapingResult> {
    try {
      this.validateRateLimit();
      const scraper = await this.initializeScraper();
      const maxTweets = Math.min(
        1000,
        Math.max(1, options.maxTweets || (type === 'user' ? 30 : 50))
      );

      await sleep(this.config.delay);

      const scrapedTweets = await scraperFunction(scraper, query, maxTweets);
      const processedTweets = this.processTweets(scrapedTweets, options);

      recordMetrics('tweets_scraped_total', scrapedTweets.length, type);
      this.requestCount++;

      return {
        tweets: processedTweets,
        totalFound: scrapedTweets.length,
        totalScraped: processedTweets.length,
        errors: [],
        rateLimit: {
          remaining: RATE_LIMIT_CONFIG.maxRequestsPerHour - this.requestCount,
          resetTime: this.rateLimitResetTime,
        },
      };
    } catch (error) {
      return this.handleScrapingError(error);
    }
  }

  private async collectTweets(
    tweetIterator: AsyncIterable<any>,
    maxTweets: number
  ): Promise<ScrapedTweetData[]> {
    const scrapedTweets: ScrapedTweetData[] = [];
    let count = 0;

    for await (const tweet of tweetIterator) {
      if (count >= maxTweets) break;
      scrapedTweets.push(tweet);
      count++;
    }

    return scrapedTweets;
  }

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

      if (typeof this.scraper.setCookies === 'function') {
        await this.scraper.setCookies(cookieStrings);
      } else if (typeof this.scraper.withCookies === 'function') {
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

    if (!this.credentials.username || !this.credentials.password || !this.credentials.email) {
      throw new Error('Twitter credentials not configured in environment variables');
    }

    await sleep(2000); // Anti-detection delay
    await this.scraper.login(
      this.credentials.username,
      this.credentials.password,
      this.credentials.email
    );
    this.isAuthenticated = true;
  }

  private processTweets(scrapedData: ScrapedTweetData[], options: ScrapingOptions): Tweet[] {
    const now = new Date();
    const maxAge = options.maxAgeHours ? options.maxAgeHours * 60 * 60 * 1000 : Infinity;
    const shouldFilterLanguage = Boolean(options.language && options.language !== 'all');
    const targetLanguage = options.language;

    const startTime = Date.now();
    const processedTweets: Tweet[] = [];

    for (const item of scrapedData) {
      try {
        const tweet = this.normalizeTweet(item, now);

        // Age filtering
        if (options.maxAgeHours) {
          const tweetAge = now.getTime() - tweet.createdAt.getTime();
          if (tweetAge > maxAge) continue;
        }

        // Language filtering
        if (
          shouldFilterLanguage &&
          tweet.language &&
          tweet.language !== 'unknown' &&
          tweet.language !== targetLanguage
        ) {
          continue;
        }

        processedTweets.push(tweet);

        try {
          defaultMetrics.tweetsProcessedTotal.inc(1, { pipeline: 'default' });
        } catch {
          // Non-fatal metric failure
        }
      } catch (error) {
        logger.warn('Error processing tweet', {
          error: error instanceof Error ? error.message : error,
        });
      }
    }

    // Record processing latency
    try {
      const duration = Date.now() - startTime;
      defaultMetrics.tweetSentimentLatency.observe(duration, { language: 'unknown' });
    } catch {
      // Ignore metric errors
    }

    return processedTweets;
  }

  private normalizeTweet(data: ScrapedTweetData, now: Date): Tweet {
    const tweetId =
      data.id || `scraped_${now.getTime()}_${Math.random().toString(36).slice(2, 11)}`;
    const content = data.text || data.content || '';
    const author = this.extractAuthorData(data, now);

    const rawMetrics = {
      likes: data.favorite_count || data.favoriteCount || 0,
      retweets: data.retweet_count || data.retweetCount || 0,
      replies: data.reply_count || data.replyCount || 0,
      quotes: data.quote_count || data.quoteCount || 0,
      views: Math.max(0, (data.favorite_count || 0) * 10), // Estimation
      engagement: 0,
    };

    rawMetrics.engagement = calculateEngagement(rawMetrics);

    return {
      id: tweetId,
      tweetId,
      content,
      author,
      metrics: rawMetrics,
      hashtags: data.hashtags || extractHashtags(content),
      mentions: (data.mentions || []).map((m) => m.screen_name || m.username || '').filter(Boolean),
      urls: (data.urls || []).map((u) => u.expanded_url || u.url || '').filter(Boolean),
      mediaUrls: (data.media || []).map((m) => m.media_url_https || m.url || '').filter(Boolean),
      isRetweet: Boolean(data.is_retweet || data.isRetweet),
      isReply: content.startsWith('@'),
      isQuote: Boolean(data.is_quote_status || data.isQuote),
      language: this.detectTweetLanguage(data),
      scrapedAt: now,
      createdAt: this.parseCreatedAt(data, now),
      updatedAt: now,
      sentiment: createDefaultSentiment(now),
    };
  }

  private extractAuthorData(data: ScrapedTweetData, now: Date) {
    // Try different author data locations
    const directUser = (data as any).userId
      ? {
          id: (data as any).userId,
          username: (data as any).username,
          displayName: (data as any).name,
        }
      : null;

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

  private createDefaultAuthor(now: Date) {
    return {
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
    };
  }

  private detectTweetLanguage(data: ScrapedTweetData): string {
    // Use provided language if available and valid
    if (data.lang && data.lang !== 'und') return data.lang;
    if (data.language && data.language !== 'und') return data.language;

    const text = (data.text || data.content || '').toLowerCase();
    if (!text.trim()) return 'unknown';

    // Pattern matching for common languages
    for (const [lang, pattern] of LANGUAGE_PATTERNS) {
      if (pattern.test(text)) return lang;
    }

    return 'unknown';
  }

  private parseCreatedAt(data: ScrapedTweetData, fallback: Date): Date {
    if (data.created_at) {
      const parsed = new Date(data.created_at);
      return isNaN(parsed.getTime()) ? fallback : parsed;
    }

    if (data.createdAt) {
      const parsed = new Date(data.createdAt);
      return isNaN(parsed.getTime()) ? fallback : parsed;
    }

    return fallback;
  }

  // ==================== Validation & Error Handling ====================
  private validateConfiguration(): void {
    if (!this.credentials.username || !this.credentials.password || !this.credentials.email) {
      logger.warn('Twitter credentials not fully configured - authentication may fail');
    }
  }

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
    this.authStatus.lastCheck = new Date();

    if (isSuccess) {
      this.authStatus = {
        isAuthenticated: true,
        lastCheck: new Date(),
        consecutiveFailures: 0,
        credentialsValid: true,
      };
      logger.info('Authentication successful');
    } else {
      const consecutiveFailures = this.authStatus.consecutiveFailures + 1;
      const backoffMinutes = Math.min(30 * Math.pow(2, consecutiveFailures - 1), 1440);

      this.authStatus = {
        isAuthenticated: false,
        lastCheck: new Date(),
        lastError: error || 'Unknown error',
        consecutiveFailures,
        nextRetryTime: new Date(Date.now() + backoffMinutes * 60 * 1000),
        credentialsValid: consecutiveFailures < 3,
      };

      logger.error('Authentication failed', {
        error,
        consecutiveFailures,
        nextRetryTime: this.authStatus.nextRetryTime,
      });
    }
  }

  // ==================== Additional Methods for Compatibility ====================

  /**
   * Generic delay method for rate limiting
   */
  private delay(ms: number): Promise<void> {
    return sleep(ms);
  }

  /**
   * Check if authentication should be retried
   */
  private shouldRetryAuth(): boolean {
    if (!this.authStatus.nextRetryTime) return true;
    return Date.now() >= this.authStatus.nextRetryTime.getTime();
  }
}
