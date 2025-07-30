/**
 * Twitter Real Scraper Service
 * Uses @the-convocation/twitter-scraper for real Twitter data collection
 * Now with enhanced authentication and cookie support
 */

import { Tweet } from '../types/twitter';

// Scraped Tweet Data Structure from @the-convocation/twitter-scraper
interface ScrapedTweetData {
  id?: string;
  text?: string;
  user?: {
    id_str?: string;
    screen_name?: string;
    name?: string;
    verified?: boolean;
    followers_count?: number;
    profile_image_url_https?: string;
  };
  favorite_count?: number;
  retweet_count?: number;
  reply_count?: number;
  quote_count?: number;
  created_at?: string;
  hashtags?: string[];
  mentions?: any[];
  urls?: any[];
  media?: any[];
  is_retweet?: boolean;
  is_quote_status?: boolean;
  lang?: string;
}

interface ScrapingOptions {
  hashtag?: string;
  username?: string;
  maxTweets?: number;
  includeReplies?: boolean;
  includeRetweets?: boolean;
  maxAgeHours?: number;
  minLikes?: number;
  minRetweets?: number;
  language?: string;
}

interface AuthenticationStatus {
  isAuthenticated: boolean;
  lastCheck: Date;
  lastError?: string;
  consecutiveFailures: number;
  nextRetryTime?: Date;
  credentialsValid: boolean;
}

interface ScrapingResult {
  tweets: Tweet[];
  totalFound: number;
  totalScraped: number;
  errors: string[];
  rateLimit: {
    remaining: number;
    resetTime: Date;
  };
}

interface ScrapingConfig {
  headless?: boolean;
  timeout?: number;
  delay?: number;
  maxRetries?: number;
  userAgent?: string;
}

export class TwitterRealScraperService {
  private config: ScrapingConfig;
  private isRateLimited: boolean = false;
  private rateLimitResetTime: Date = new Date();
  private requestCount: number = 0;
  private maxRequestsPerHour: number = 50; // Conservative limit
  private scraper: any = null;
  private isAuthenticated: boolean = false;
  private loginAttempts: number = 0;
  private maxLoginAttempts: number = 2; // Only 2 attempts to avoid blocks
  private lastLoginAttempt: Date = new Date(0);
  private loginCooldown: number = 30 * 60 * 1000; // 30 minutes between login attempts

  // Twitter credentials configuration
  private twitterConfig: {
    username: string;
    password: string;
    email: string;
  };

  // Authentication monitoring
  private authStatus: AuthenticationStatus = {
    isAuthenticated: false,
    lastCheck: new Date(),
    consecutiveFailures: 0,
    credentialsValid: false
  };

  constructor(config: ScrapingConfig = {}) {
    this.config = {
      headless: true,
      timeout: 60000, // Longer timeout
      delay: 10000, // 10 seconds between requests
      maxRetries: 1, // Only 1 retry to avoid blocks
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      ...config
    };

    // Initialize Twitter credentials from environment
    this.twitterConfig = {
      username: process.env.TWITTER_USERNAME || '',
      password: process.env.TWITTER_PASSWORD || '',
      email: process.env.TWITTER_EMAIL || ''
    };
  }

  /**
   * Initialize and authenticate the scraper with cookie support
   */
  private async initializeScraper(): Promise<any> {
    if (this.scraper && this.isAuthenticated) {
      return this.scraper;
    }

    // Check login cooldown
    const timeSinceLastAttempt = Date.now() - this.lastLoginAttempt.getTime();
    if (this.loginAttempts >= this.maxLoginAttempts && timeSinceLastAttempt < this.loginCooldown) {
      const remainingCooldown = Math.ceil((this.loginCooldown - timeSinceLastAttempt) / 60000);
      throw new Error(`Login attempts exceeded. Please wait ${remainingCooldown} minutes before trying again.`);
    }

    try {
      // Import the twitter scraper
      const { Scraper } = await import('@the-convocation/twitter-scraper');

      this.scraper = new Scraper();
      this.lastLoginAttempt = new Date();
      this.loginAttempts++;

      // Try authentication methods in priority order
      let authSuccess = false;
      let lastError: Error | null = null;

      // 1. Try cookies first if available
      if (process.env.TWITTER_COOKIES && process.env.TWITTER_COOKIES.trim()) {
        try {
          await this.authenticateWithCookies();
          authSuccess = true;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error('Cookie auth failed');
        }
      }

      // 2. Fallback to credentials if cookies failed or unavailable
      if (!authSuccess) {
        try {
          await this.authenticateWithCredentials();
          authSuccess = true;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error('Credential auth failed');
        }
      }

      if (!authSuccess) {
        this.isAuthenticated = false;
        this.scraper = null;
        this.updateAuthStatus(false, lastError?.message);
        throw lastError || new Error('All authentication methods failed');
      }

      // Verify authentication
      try {
        this.isAuthenticated = await this.scraper.isLoggedIn();
      } catch (error) {
        // Some scrapers might not have isLoggedIn method
        this.isAuthenticated = true;
      }
      
      if (!this.isAuthenticated) {
        this.scraper = null;
        this.updateAuthStatus(false, 'Authentication verification failed');
        throw new Error('Authentication verification failed');
      }

      this.updateAuthStatus(true);
      return this.scraper;

    } catch (error) {
      this.isAuthenticated = false;
      this.scraper = null;
      this.updateAuthStatus(false, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  private async authenticateWithCookies(): Promise<void> {
    if (!this.scraper || !process.env.TWITTER_COOKIES) {
      throw new Error('Cookies not available');
    }

    try {
      const cookiesStr = process.env.TWITTER_COOKIES.trim();
      if (!cookiesStr || cookiesStr === '') {
        throw new Error('Empty cookies string');
      }

      const cookiesObj = JSON.parse(cookiesStr);
      
      // Validate essential cookies
      if (!cookiesObj.auth_token || !cookiesObj.ct0) {
        throw new Error('Missing essential cookies (auth_token or ct0)');
      }

      // Convert cookies object to string format expected by the scraper
      const cookieStrings = Object.entries(cookiesObj).map(([name, value]) => 
        `${name}=${value}; Domain=.x.com; Path=/`
      );

      // Check if setCookies method exists and what format it expects
      if (typeof this.scraper.setCookies === 'function') {
        await this.scraper.setCookies(cookieStrings);
      } else if (typeof this.scraper.withCookies === 'function') {
        this.scraper = this.scraper.withCookies(cookieStrings);
      } else {
        if (this.scraper.cookies) {
          this.scraper.cookies = cookiesObj;
        } else {
          throw new Error('Scraper does not support cookie authentication');
        }
      }
      
    } catch (error) {
      throw new Error(`Cookie authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async authenticateWithCredentials(): Promise<void> {
    if (!this.scraper) {
      throw new Error('Scraper not initialized');
    }

    // Validate credentials
    if (!this.twitterConfig.username || !this.twitterConfig.password || !this.twitterConfig.email) {
      throw new Error('Twitter credentials not configured in environment variables');
    }

    // Anti-detection delay
    await this.delay(2000);
    
    await this.scraper.login(
      this.twitterConfig.username,
      this.twitterConfig.password,
      this.twitterConfig.email
    );
  }

  /**
   * Scrape tweets by hashtag
   */
  async scrapeByHashtag(hashtag: string, options: ScrapingOptions = {}): Promise<ScrapingResult> {
    try {
      await this.checkRateLimit();
      const scraper = await this.initializeScraper();

      const query = `#${hashtag}`;
      const maxTweets = options.maxTweets || 50;

      await this.delay(this.config.delay || 3000);

      const searchResults = scraper.searchTweets(query, maxTweets);
      const scrapedTweets: ScrapedTweetData[] = [];

      for await (const tweet of searchResults) {
        scrapedTweets.push(tweet);

        if (scrapedTweets.length >= maxTweets) {
          break;
        }
      }

      const processedTweets = this.processTweets(scrapedTweets, options);
      this.requestCount++;

      return {
        tweets: processedTweets,
        totalFound: scrapedTweets.length,
        totalScraped: processedTweets.length,
        errors: [],
        rateLimit: {
          remaining: this.maxRequestsPerHour - this.requestCount,
          resetTime: this.rateLimitResetTime
        }
      };

    } catch (error) {
      // For authentication errors, re-throw so the route can handle fallback
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (
        errorMessage.includes('Forbidden') ||
        errorMessage.includes('Authentication') ||
        errorMessage.includes('not logged-in') ||
        errorMessage.includes('Scraper is not logged-in') ||
        (error instanceof Error && error.name === 'AuthenticationError')
      ) {
        throw error;
      }

      // For other errors, return empty result
      return {
        tweets: [],
        totalFound: 0,
        totalScraped: 0,
        errors: [error instanceof Error ? error.message : 'Unknown scraping error'],
        rateLimit: {
          remaining: this.maxRequestsPerHour - this.requestCount,
          resetTime: this.rateLimitResetTime
        }
      };
    }
  }

  /**
   * Scrape tweets from a specific user
   */
  async scrapeByUser(username: string, options: ScrapingOptions = {}): Promise<ScrapingResult> {
    try {
      await this.checkRateLimit();
      const scraper = await this.initializeScraper();

      const maxTweets = options.maxTweets || 30;

      await this.delay(this.config.delay || 3000);

      const userTweets = scraper.getTweets(username, maxTweets);
      const scrapedTweets: ScrapedTweetData[] = [];

      for await (const tweet of userTweets) {
        scrapedTweets.push(tweet);

        if (scrapedTweets.length >= maxTweets) {
          break;
        }
      }

      const processedTweets = this.processTweets(scrapedTweets, options);
      this.requestCount++;

      return {
        tweets: processedTweets,
        totalFound: scrapedTweets.length,
        totalScraped: processedTweets.length,
        errors: [],
        rateLimit: {
          remaining: this.maxRequestsPerHour - this.requestCount,
          resetTime: this.rateLimitResetTime
        }
      };

    } catch (error) {
      // For authentication errors, re-throw so the route can handle fallback
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (
        errorMessage.includes('Forbidden') ||
        errorMessage.includes('Authentication') ||
        errorMessage.includes('not logged-in') ||
        errorMessage.includes('Scraper is not logged-in') ||
        (error instanceof Error && error.name === 'AuthenticationError')
      ) {
        throw error;
      }

      // For other errors, return empty result
      return {
        tweets: [],
        totalFound: 0,
        totalScraped: 0,
        errors: [error instanceof Error ? error.message : 'Unknown scraping error'],
        rateLimit: {
          remaining: this.maxRequestsPerHour - this.requestCount,
          resetTime: this.rateLimitResetTime
        }
      };
    }
  }

  /**
   * Get current rate limit status
   */
  getRateLimitStatus() {
    const timeSinceLastAttempt = Date.now() - this.lastLoginAttempt.getTime();
    const cooldownRemaining = Math.max(0, this.loginCooldown - timeSinceLastAttempt);

    return {
      isLimited: this.isRateLimited,
      remaining: this.maxRequestsPerHour - this.requestCount,
      resetTime: this.rateLimitResetTime,
      requestCount: this.requestCount,
      isAuthenticated: this.isAuthenticated,
      loginAttempts: this.loginAttempts,
      maxLoginAttempts: this.maxLoginAttempts,
      cooldownRemaining: Math.ceil(cooldownRemaining / 60000), // minutes
      canAttemptLogin: this.loginAttempts < this.maxLoginAttempts || cooldownRemaining <= 0
    };
  }

  /**
   * Check rate limit before making requests
   */
  private async checkRateLimit() {
    if (this.requestCount >= this.maxRequestsPerHour) {
      this.isRateLimited = true;
      this.rateLimitResetTime = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      throw new Error('Rate limit exceeded. Please wait before making more requests.');
    }
  }

  /**
   * Add delay between requests
   */
  private async delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Process and normalize scraped tweets
   */
  private processTweets(scrapedData: ScrapedTweetData[], options: ScrapingOptions): Tweet[] {
    const tweets: Tweet[] = [];
    const now = new Date();
    const maxAge = options.maxAgeHours ? options.maxAgeHours * 60 * 60 * 1000 : Infinity;

    for (const item of scrapedData) {
      try {
        const tweet = this.normalizeTweet(item);

        // Apply filters
        if (options.maxAgeHours) {
          const tweetAge = now.getTime() - new Date(tweet.createdAt).getTime();
          if (tweetAge > maxAge) continue;
        }

        if (options.minLikes && tweet.metrics.likes < options.minLikes) continue;
        if (options.minRetweets && tweet.metrics.retweets < options.minRetweets) continue;

        // Filter by language if specified (and not 'all')
        if (options.language && options.language !== 'all' && tweet.language !== options.language) {
          continue;
        }

        // Skip retweets if not wanted
        if (!options.includeRetweets && tweet.isRetweet) continue;

        tweets.push(tweet);
      } catch (error) {
        // Skip tweet processing errors
        continue;
      }
    }

    return tweets;
  }

  /**
   * Normalize scraped data to our Tweet interface
   */
  private normalizeTweet(data: ScrapedTweetData): Tweet {
    const tweetId = data.id || `scraped_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    return {
      id: tweetId,
      tweetId,
      content: data.text || '',
      author: {
        id: data.user?.id_str || 'unknown',
        username: data.user?.screen_name || 'unknown',
        displayName: data.user?.name || data.user?.screen_name || 'Unknown User',
        avatar: data.user?.profile_image_url_https || '',
        verified: data.user?.verified || false,
        followersCount: data.user?.followers_count || 0,
        followingCount: 0, // Not available in basic scraping
        tweetsCount: 0, // Not available in basic scraping
        location: '',
        bio: '',
        website: '',
        joinedDate: now
      },
      metrics: {
        likes: data.favorite_count || 0,
        retweets: data.retweet_count || 0,
        replies: data.reply_count || 0,
        quotes: data.quote_count || 0,
        views: (data.favorite_count || 0) * 10, // Estimate views
        engagement: 0 // Will be calculated later
      },
      hashtags: data.hashtags || [],
      mentions: (data.mentions || []).map((mention: any) => mention.screen_name || mention.username || ''),
      urls: (data.urls || []).map((url: any) => url.expanded_url || url.url || ''),
      mediaUrls: (data.media || []).map((mediaItem: any) => mediaItem.media_url_https || mediaItem.url || ''),
      isRetweet: data.is_retweet || false,
      isReply: data.text?.startsWith('@') || false,
      isQuote: data.is_quote_status || false,
      language: data.lang || 'en',
      scrapedAt: now,
      createdAt: data.created_at ? new Date(data.created_at) : now,
      updatedAt: now
    };
  }

  /**
   * Get authentication status for monitoring
   */
  getAuthenticationStatus(): AuthenticationStatus {
    return { ...this.authStatus };
  }

  /**
   * Update authentication status
   */
  private updateAuthStatus(isSuccess: boolean, error?: string) {
    this.authStatus.lastCheck = new Date();

    if (isSuccess) {
      this.authStatus = {
        isAuthenticated: true,
        lastCheck: new Date(),
        lastError: undefined,
        consecutiveFailures: 0,
        nextRetryTime: undefined,
        credentialsValid: true
      };
    } else {
      this.authStatus = {
        isAuthenticated: false,
        lastCheck: new Date(),
        lastError: error || 'Unknown authentication error',
        consecutiveFailures: this.authStatus.consecutiveFailures + 1,
        nextRetryTime: this.authStatus.nextRetryTime,
        credentialsValid: this.authStatus.credentialsValid
      };
      // Set next retry time based on consecutive failures
      const backoffMinutes = Math.min(30 * Math.pow(2, this.authStatus.consecutiveFailures - 1), 1440); // Max 24 hours
      this.authStatus.nextRetryTime = new Date(Date.now() + backoffMinutes * 60 * 1000);

      // Mark credentials as invalid after 3 consecutive failures
      if (this.authStatus.consecutiveFailures >= 3) {
        this.authStatus.credentialsValid = false;
      }
    }
  }

  /**
   * Check if authentication should be retried
   */
  private shouldRetryAuth(): boolean {
    if (!this.authStatus.nextRetryTime) return true;
    return Date.now() >= this.authStatus.nextRetryTime.getTime();
  }

  /**
   * Periodic authentication health check
   */
  async checkAuthenticationHealth(): Promise<boolean> {
    try {
      if (!this.scraper || !this.isAuthenticated) {
        return false;
      }

      // Try a lightweight operation to verify auth status
      const isLoggedIn = await this.scraper.isLoggedIn();
      this.updateAuthStatus(isLoggedIn);

      return isLoggedIn;
    } catch (error) {
      this.updateAuthStatus(false, error instanceof Error ? error.message : 'Health check failed');
      return false;
    }
  }
}
