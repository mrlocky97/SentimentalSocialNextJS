/**
 * Twitter Real Scraper Service - OPTIMIZED v2.0
 * High-performance scraping with improved error handling and resource management
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
const LANGUAGE_PATTERNS = Object.freeze(
  new Map([
    [
      'es',
      /\b(?:el|la|de|en|que|y|es|se|no|por|con|para|muy|pero|más|como|este|otro|todo|hacer|estar)\b/i,
    ],
    ['pt', /\b(?:o|a|de|em|que|e|do|da|para|com|não|mais|por|muito|ser|ter|fazer|estar)\b/i],
    ['fr', /\b(?:le|la|de|et|à|un|il|être|avoir|que|pour|dans|sur|avec|ne|pas)\b/i],
    ['de', /\b(?:der|die|das|und|in|den|von|zu|ist|mit|sich|auf|für|als|sie|ein)\b/i],
  ] as const)
);

const HASHTAG_REGEX = /#(\w+)/g;
const AUTH_ERROR_PATTERNS = /Forbidden|Authentication|not logged-in|Scraper is not logged-in/i;

const DEFAULT_CONFIG = Object.freeze({
  headless: true,
  timeout: 45000,
  delay: 2000,
  maxRetries: 1,
  userAgent:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
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

const createDefaultSentiment = (now: Date) =>
  Object.freeze({
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
    defaultMetrics.tweetsScrapedTotal.inc(count, {
      source: 'twitter',
      queryType,
    });
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
        Math.max(1, options.maxTweets ?? (type === 'user' ? 30 : 50))
      );

      await sleep(this.config.delay);

      const scrapedTweets = await scraperFunction(scraper, query, maxTweets);
      const processedTweets = this.processTweets(scrapedTweets, options);

      recordMetrics(scrapedTweets.length, type);
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

  private processTweets(scrapedData: ScrapedTweetData[], options: ScrapingOptions): Tweet[] {
    const now = new Date();
    const maxAge = options.maxAgeHours ? options.maxAgeHours * 3600000 : Infinity;
    const shouldFilterLanguage = Boolean(options.language && options.language !== 'all');
    const targetLanguage = options.language;

    const startTime = Date.now();
    const processedTweets: Tweet[] = [];

    for (const item of scrapedData) {
      try {
        const tweet = this.normalizeTweet(item, now);

        // Early filtering optimizations
        if (options.maxAgeHours) {
          const tweetAge = now.getTime() - tweet.createdAt.getTime();
          if (tweetAge > maxAge) continue;
        }

        if (
          shouldFilterLanguage &&
          tweet.language &&
          tweet.language !== 'unknown' &&
          tweet.language !== targetLanguage
        ) {
          continue;
        }

        processedTweets.push(tweet);

        // Record metrics with error handling
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
    // Extract comprehensive IDs with null-safe access
    const tweetId = data.id || 
                   data.__raw_UNSTABLE?.id_str || 
                   `scraped_${now.getTime()}_${Math.random().toString(36).slice(2, 11)}`;
    
    const conversationId = data.conversationId || 
                          data.__raw_UNSTABLE?.conversation_id_str || 
                          tweetId;

    // Extract content with all possible sources
    const content = data.text || 
                   data.content || 
                   data.full_text || 
                   data.__raw_UNSTABLE?.full_text || 
                   '';

    // Extract author data with comprehensive fallbacks
    const author = this.extractAuthorData(data, now);

    // Extract comprehensive metrics with null-safe access
    const rawMetrics = {
      likes: data.likes || 
             data.favorite_count || 
             data.favoriteCount || 
             data.__raw_UNSTABLE?.favorite_count || 
             0,
      retweets: data.retweets || 
                data.retweet_count || 
                data.retweetCount || 
                data.__raw_UNSTABLE?.retweet_count || 
                0,
      replies: data.replies || 
               data.reply_count || 
               data.replyCount || 
               data.__raw_UNSTABLE?.reply_count || 
               0,
      quotes: data.quote_count || 
              data.quoteCount || 
              data.__raw_UNSTABLE?.quote_count || 
              0,
      bookmarks: data.bookmarkCount || 
                 data.__raw_UNSTABLE?.bookmark_count || 
                 0,
      views: data.views || 
             Math.max(0, (data.likes || data.favorite_count || 0) * 10), // Estimation fallback
      engagement: 0,
    };

    rawMetrics.engagement = calculateEngagement(rawMetrics);

    // Extract hashtags from multiple sources
    const hashtags = this.extractHashtags(data, content);
    
    // Extract mentions from multiple sources
    const mentions = this.extractMentions(data);
    
    // Extract URLs from multiple sources
    const urls = this.extractUrls(data);
    
    // Extract media URLs and photo data
    const { mediaUrls, photoData } = this.extractMediaData(data);

    // Parse creation date with multiple fallbacks
    const createdAt = this.parseCreatedAtEnhanced(data, now);

    // Extract location data
    const locationData = this.extractLocationData(data);

    return {
      id: tweetId,
      tweetId,
      conversationId,
      content,
      author,
      metrics: rawMetrics,
      hashtags,
      mentions,
      urls,
      mediaUrls,
      photoData, // New field for rich photo data
      isRetweet: Boolean(
        data.isRetweet || 
        data.is_retweet || 
        data.__raw_UNSTABLE?.retweeted
      ),
      isReply: Boolean(
        data.isReply || 
        content.startsWith('@') ||
        (data.__raw_UNSTABLE?.display_text_range && data.__raw_UNSTABLE?.display_text_range[0] > 0)
      ),
      isQuote: Boolean(
        data.isQuoted || 
        data.isQuote || 
        data.is_quote_status || 
        data.__raw_UNSTABLE?.is_quote_status
      ),
      isEdited: Boolean(data.isEdited),
      isPinned: Boolean(data.isPin),
      isSensitive: Boolean(
        data.sensitiveContent || 
        data.possibly_sensitive || 
        data.__raw_UNSTABLE?.possibly_sensitive
      ),
      language: this.detectTweetLanguage(data),
      location: locationData,
      permanentUrl: data.permanentUrl,
      htmlContent: data.html, // New field for HTML representation
      scrapedAt: now,
      createdAt,
      updatedAt: now,
      sentiment: createDefaultSentiment(now),
    };
  }

  private extractAuthorData(data: ScrapedTweetData, now: Date) {
    // Extract user data from direct fields (preferred)
    const directUser = data.userId && data.username && data.name
      ? {
          id: data.userId,
          username: data.username,
          displayName: data.name,
        }
      : null;

    // Try multiple user data sources
    const user = directUser || 
                 data.user || 
                 (data as any).author || 
                 (data as any).account;

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
        hashtags.push(...data.hashtags.map((h: any) => typeof h === 'string' ? h : h.text));
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
      mentions.push(...data.mentions.map((m: any) => m.screen_name || m.username || '').filter(Boolean));
    }
    
    // Extract from raw data
    if (data.__raw_UNSTABLE?.entities?.user_mentions) {
      mentions.push(...data.__raw_UNSTABLE.entities.user_mentions.map((m: any) => m.screen_name || '').filter(Boolean));
    }
    
    return [...new Set(mentions)]; // Remove duplicates
  }

  private extractUrls(data: ScrapedTweetData): string[] {
    const urls: string[] = [];
    
    // Extract from structured data
    if (data.urls && Array.isArray(data.urls)) {
      urls.push(...data.urls.map((u: any) => typeof u === 'string' ? u : u.expanded_url || u.url || '').filter(Boolean));
    }
    
    // Extract from raw data
    if (data.__raw_UNSTABLE?.entities?.urls) {
      urls.push(...data.__raw_UNSTABLE.entities.urls.map((u: any) => u.expanded_url || u.url || '').filter(Boolean));
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
      mediaUrls.push(...data.__raw_UNSTABLE.entities.media.map((m: any) => m.media_url_https || m.url || '').filter(Boolean));
    }
    
    // Extract from extended_entities for higher quality
    if (data.__raw_UNSTABLE?.extended_entities?.media) {
      photoData.push(...data.__raw_UNSTABLE.extended_entities.media);
      mediaUrls.push(...data.__raw_UNSTABLE.extended_entities.media.map((m: any) => m.media_url_https || m.url || '').filter(Boolean));
    }
    
    // Legacy media field
    if (data.media && Array.isArray(data.media)) {
      mediaUrls.push(...data.media.map((m: any) => m.media_url_https || m.url || '').filter(Boolean));
    }
    
    return {
      mediaUrls: [...new Set(mediaUrls)], // Remove duplicates
      photoData: photoData.length > 0 ? photoData : undefined
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
        url: data.place.url
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
        url: place.url
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
