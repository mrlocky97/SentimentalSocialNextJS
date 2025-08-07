/**
 * Twitter Real Scraper Service
 * Uses @the-convocation/twitter-scraper for real Twitter data collection
 * Now with enhanced authentication and cookie support
 */

import {
  AuthenticationStatus,
  ScrapedTweetData,
  ScrapingConfig,
  ScrapingOptions,
  ScrapingResult,
  Tweet,
} from '../types/twitter';

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
    credentialsValid: false,
  };

  constructor(config: ScrapingConfig = {}) {
    this.config = {
      headless: true,
      timeout: 45000, // Reduced timeout for faster responses
      delay: 2000, // Reduced delay for better performance (was 10000)
      maxRetries: 1,
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      ...config,
    };

    // Initialize Twitter credentials from environment
    this.twitterConfig = {
      username: process.env.TWITTER_USERNAME || '',
      password: process.env.TWITTER_PASSWORD || '',
      email: process.env.TWITTER_EMAIL || '',
    };
  }

  /**
   * Initialize and authenticate the scraper with cookie support
   */
  private async initializeScraper(): Promise<any> {
    if (this.scraper && this.isAuthenticated) {
      return this.scraper;
    }

    // Fast cooldown check
    const timeSinceLastAttempt = Date.now() - this.lastLoginAttempt.getTime();
    if (this.loginAttempts >= this.maxLoginAttempts && timeSinceLastAttempt < this.loginCooldown) {
      throw new Error(`Login attempts exceeded. Please wait before trying again.`);
    }

    try {
      // Import the twitter scraper
      const { Scraper } = await import('@the-convocation/twitter-scraper');

      this.scraper = new Scraper();
      this.lastLoginAttempt = new Date();
      this.loginAttempts++;

      // Fast authentication with priority order
      let authSuccess = false;

      // 1. Try cookies first (fastest)
      if (process.env.TWITTER_COOKIES?.trim()) {
        try {
          await this.authenticateWithCookies();
          authSuccess = true;
        } catch (error) {
          // Continue to credentials
        }
      }

      // 2. Fallback to credentials
      if (!authSuccess) {
        try {
          await this.authenticateWithCredentials();
          authSuccess = true;
        } catch (error) {
          throw new Error('Authentication failed');
        }
      }

      if (!authSuccess) {
        this.isAuthenticated = false;
        this.scraper = null;
        throw new Error('All authentication methods failed');
      }

      // Quick auth verification
      try {
        this.isAuthenticated = await this.scraper.isLoggedIn();
      } catch (error) {
        this.isAuthenticated = true; // Assume success if verification unavailable
      }

      if (!this.isAuthenticated) {
        this.scraper = null;
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
      const cookieStrings = Object.entries(cookiesObj).map(
        ([name, value]) => `${name}=${value}; Domain=.x.com; Path=/`
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
      throw new Error(
        `Cookie authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
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
   * Scrape tweets by hashtag - Optimized for performance
   */
  async scrapeByHashtag(hashtag: string, options: ScrapingOptions = {}): Promise<ScrapingResult> {
    console.log(
      `🔍 DEBUG TwitterScraper: Starting scrapeByHashtag for #${hashtag} with options:`,
      options
    );

    try {
      await this.checkRateLimit();
      const scraper = await this.initializeScraper();

      const query = `#${hashtag}`;
      const maxTweets = options.maxTweets || 50;

      console.log(
        `🔍 DEBUG TwitterScraper: Searching for query "${query}" with maxTweets: ${maxTweets}`
      );

      // Reduced delay for better performance while maintaining safety
      await this.delay(this.config.delay || 2000);

      const searchResults = scraper.searchTweets(query, maxTweets);
      const scrapedTweets: ScrapedTweetData[] = [];

      console.log(`🔍 DEBUG TwitterScraper: Starting to collect tweets from search results`);

      // Optimized collection with early break
      for await (const tweet of searchResults) {
        console.log(`🔍 DEBUG TwitterScraper: Collected tweet ${scrapedTweets.length + 1}:`, {
          id: tweet.id,
          text: tweet.text?.substring(0, 50) + '...',
          hasText: !!tweet.text,
          hasId: !!tweet.id,
        });

        scrapedTweets.push(tweet);
        if (scrapedTweets.length >= maxTweets) {
          console.log(`🔍 DEBUG TwitterScraper: Reached maxTweets limit (${maxTweets}), breaking`);
          break;
        }
      }

      console.log(
        `🔍 DEBUG TwitterScraper: Collected ${scrapedTweets.length} raw tweets, now processing...`
      );
      const processedTweets = this.processTweets(scrapedTweets, options);
      console.log(
        `🔍 DEBUG TwitterScraper: Processed ${processedTweets.length} tweets successfully`
      );

      this.requestCount++;

      return {
        tweets: processedTweets,
        totalFound: scrapedTweets.length,
        totalScraped: processedTweets.length,
        errors: [],
        rateLimit: {
          remaining: this.maxRequestsPerHour - this.requestCount,
          resetTime: this.rateLimitResetTime,
        },
      };
    } catch (error) {
      console.log(`🔍 DEBUG TwitterScraper: Error in scrapeByHashtag:`, error);

      // Fast error handling
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isAuthError =
        errorMessage.includes('Forbidden') ||
        errorMessage.includes('Authentication') ||
        errorMessage.includes('not logged-in') ||
        errorMessage.includes('Scraper is not logged-in');

      if (isAuthError) throw error;

      return {
        tweets: [],
        totalFound: 0,
        totalScraped: 0,
        errors: [errorMessage],
        rateLimit: {
          remaining: this.maxRequestsPerHour - this.requestCount,
          resetTime: this.rateLimitResetTime,
        },
      };
    }
  }

  /**
   * Scrape tweets from a specific user - Optimized for performance
   */
  async scrapeByUser(username: string, options: ScrapingOptions = {}): Promise<ScrapingResult> {
    try {
      await this.checkRateLimit();
      const scraper = await this.initializeScraper();

      const maxTweets = options.maxTweets || 30;

      // Reduced delay for better performance
      await this.delay(this.config.delay || 2000);

      const userTweets = scraper.getTweets(username, maxTweets);
      const scrapedTweets: ScrapedTweetData[] = [];

      // Optimized collection with early break
      for await (const tweet of userTweets) {
        scrapedTweets.push(tweet);
        if (scrapedTweets.length >= maxTweets) break;
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
          resetTime: this.rateLimitResetTime,
        },
      };
    } catch (error) {
      // Fast error handling
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isAuthError =
        errorMessage.includes('Forbidden') ||
        errorMessage.includes('Authentication') ||
        errorMessage.includes('not logged-in') ||
        errorMessage.includes('Scraper is not logged-in');

      if (isAuthError) throw error;

      return {
        tweets: [],
        totalFound: 0,
        totalScraped: 0,
        errors: [errorMessage],
        rateLimit: {
          remaining: this.maxRequestsPerHour - this.requestCount,
          resetTime: this.rateLimitResetTime,
        },
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
      canAttemptLogin: this.loginAttempts < this.maxLoginAttempts || cooldownRemaining <= 0,
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
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Process and normalize scraped tweets - Optimized for performance
   */
  private processTweets(scrapedData: ScrapedTweetData[], options: ScrapingOptions): Tweet[] {
    console.log(
      `🔍 DEBUG TwitterScraper: Processing ${scrapedData.length} scraped tweets with options:`,
      {
        language: options.language,
        includeRetweets: options.includeRetweets,
        maxAgeHours: options.maxAgeHours,
        minLikes: options.minLikes,
        minRetweets: options.minRetweets,
      }
    );

    const tweets: Tweet[] = [];
    const now = new Date();
    const maxAge = options.maxAgeHours ? options.maxAgeHours * 60 * 60 * 1000 : Infinity;

    // Pre-compile language filter for better performance
    const shouldFilterLanguage = options.language && options.language !== 'all';
    const targetLanguage = options.language;

    for (let i = 0; i < scrapedData.length; i++) {
      const item = scrapedData[i];
      console.log(`🔍 DEBUG TwitterScraper: Processing tweet ${i + 1}/${scrapedData.length}:`, {
        id: item.id,
        text: item.text?.substring(0, 50) + '...',
        hasText: !!item.text,
        isRetweet: item.is_retweet || item.isRetweet,
      });

      try {
        const tweet = this.normalizeTweet(item);
        console.log(`🔍 DEBUG TwitterScraper: Normalized tweet:`, {
          id: tweet.id,
          content: tweet.content?.substring(0, 50) + '...',
          language: tweet.language,
          isRetweet: tweet.isRetweet,
          likes: tweet.metrics.likes,
        });

        // Apply filters efficiently - fail fast approach
        if (options.maxAgeHours) {
          const tweetAge = now.getTime() - new Date(tweet.createdAt).getTime();
          if (tweetAge > maxAge) {
            console.log(`🔍 DEBUG TwitterScraper: Tweet ${i + 1} filtered out - too old`);
            continue;
          }
        }

        if (options.minLikes && tweet.metrics.likes < options.minLikes) {
          console.log(
            `🔍 DEBUG TwitterScraper: Tweet ${i + 1} filtered out - not enough likes (${
              tweet.metrics.likes
            } < ${options.minLikes})`
          );
          continue;
        }

        if (options.minRetweets && tweet.metrics.retweets < options.minRetweets) {
          console.log(
            `🔍 DEBUG TwitterScraper: Tweet ${i + 1} filtered out - not enough retweets (${
              tweet.metrics.retweets
            } < ${options.minRetweets})`
          );
          continue;
        }

        // Language filter - optimized
        if (shouldFilterLanguage && tweet.language !== targetLanguage) {
          console.log(
            `🔍 DEBUG TwitterScraper: Tweet ${i + 1} filtered out - wrong language (${
              tweet.language
            } !== ${targetLanguage})`
          );
          continue;
        }

        // Retweet filter
        if (!options.includeRetweets && tweet.isRetweet) {
          console.log(
            `🔍 DEBUG TwitterScraper: Tweet ${
              i + 1
            } filtered out - is retweet and includeRetweets=false`
          );
          continue;
        }

        console.log(
          `🔍 DEBUG TwitterScraper: Tweet ${i + 1} passed all filters - adding to results`
        );
        tweets.push(tweet);
      } catch (error) {
        console.log(
          `🔍 DEBUG TwitterScraper: Error processing tweet ${i + 1}:`,
          error instanceof Error ? error.message : error
        );
        continue;
      }
    }

    console.log(
      `🔍 DEBUG TwitterScraper: Final processing result: ${tweets.length} tweets out of ${scrapedData.length} scraped`
    );
    return tweets;
  }

  /**
   * Normalize scraped data to our Tweet interface - Optimized
   */
  private normalizeTweet(data: ScrapedTweetData): Tweet {
    const now = new Date();
    const tweetId = data.id || `scraped_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Optimized author data extraction
    const authorData = this.extractAuthorData(data);

    // Pre-calculate metrics to avoid repeated property access
    const likes = data.favorite_count || data.favoriteCount || 0;
    const retweets = data.retweet_count || data.retweetCount || 0;
    const replies = data.reply_count || data.replyCount || 0;
    const quotes = data.quote_count || data.quoteCount || 0;

    return {
      id: tweetId,
      tweetId,
      content: data.text || data.content || '',
      author: authorData,
      metrics: {
        likes,
        retweets,
        replies,
        quotes,
        views: likes * 10, // Estimate views
        engagement: 0, // Will be calculated later if needed
      },
      hashtags: data.hashtags || this.extractHashtags(data.text || ''),
      mentions: (data.mentions || []).map(
        (mention: any) => mention.screen_name || mention.username || ''
      ),
      urls: (data.urls || []).map((url: any) => url.expanded_url || url.url || ''),
      mediaUrls: (data.media || []).map(
        (mediaItem: any) => mediaItem.media_url_https || mediaItem.url || ''
      ),
      isRetweet: data.is_retweet || data.isRetweet || false,
      isReply: (data.text || '').startsWith('@') || false,
      isQuote: data.is_quote_status || data.isQuote || false,
      language: this.detectTweetLanguage(data),
      scrapedAt: now,
      createdAt: data.created_at
        ? new Date(data.created_at)
        : data.createdAt
        ? new Date(data.createdAt)
        : now,
      updatedAt: now,
    };
  }

  /**
   * Extract author data - Optimized for performance
   */
  private extractAuthorData(data: ScrapedTweetData): any {
    const now = new Date();

    // Fast direct field extraction (new scraper format)
    const directUserId = (data as any).userId;
    const directUsername = (data as any).username;
    const directName = (data as any).name;

    if (directUserId || directUsername || directName) {
      return {
        id: directUserId || 'unknown',
        username: directUsername || 'unknown',
        displayName: directName || directUsername || 'Unknown User',
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

    // Traditional user object structure
    const user = data.user || (data as any).author || (data as any).account;

    if (!user) {
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

    // Extract with optimized property access
    return {
      id: user.id_str || user.id || user.userId || 'unknown',
      username: user.screen_name || user.username || user.handle || 'unknown',
      displayName:
        user.name || user.displayName || user.display_name || user.username || 'Unknown User',
      avatar:
        user.profile_image_url_https ||
        user.profile_image_url ||
        user.avatar ||
        user.profileImageUrl ||
        '',
      verified: user.verified || user.is_verified || false,
      followersCount: user.followers_count || user.followersCount || user.followers || 0,
      followingCount: user.following_count || user.followingCount || user.following || 0,
      tweetsCount:
        user.statuses_count || user.statusesCount || user.tweets_count || user.tweetsCount || 0,
      location: user.location || '',
      bio: user.description || user.bio || '',
      website: user.url || user.website || '',
      joinedDate: now,
    };
  }

  /**
   * Extract hashtags from text if not provided in data
   */
  private extractHashtags(text: string): string[] {
    const hashtagRegex = /#(\w+)/g;
    const matches = text.match(hashtagRegex);
    return matches ? matches.map((tag) => tag.substring(1)) : [];
  }

  /**
   * Detect tweet language - Optimized for performance
   */
  private detectTweetLanguage(data: ScrapedTweetData): string {
    // First try the raw language fields from the scraper (fastest)
    if (data.lang && data.lang !== 'und') return data.lang;
    if (data.language && data.language !== 'und') return data.language;

    // Fast content-based detection for most common languages
    const text = data.text || data.content || '';
    if (!text.trim()) return 'unknown';

    const textLower = text.toLowerCase();

    // Quick Spanish detection
    if (
      /\b(el|la|de|en|que|y|es|se|no|por|con|para|muy|pero|más|como|este|otro|todo|hacer|estar)\b/.test(
        textLower
      )
    ) {
      return 'es';
    }

    // Quick Portuguese detection
    if (
      /\b(o|a|de|em|que|e|do|da|para|com|não|mais|por|muito|ser|ter|fazer|estar)\b/.test(textLower)
    ) {
      return 'pt';
    }

    // Quick French detection
    if (/\b(le|la|de|et|à|un|il|être|avoir|que|pour|dans|sur|avec|ne|pas)\b/.test(textLower)) {
      return 'fr';
    }

    // Quick German detection
    if (/\b(der|die|das|und|in|den|von|zu|ist|mit|sich|auf|für|als|sie|ein)\b/.test(textLower)) {
      return 'de';
    }

    // Default to unknown for performance
    return 'unknown';
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
        credentialsValid: true,
      };
    } else {
      this.authStatus = {
        isAuthenticated: false,
        lastCheck: new Date(),
        lastError: error || 'Unknown authentication error',
        consecutiveFailures: this.authStatus.consecutiveFailures + 1,
        nextRetryTime: this.authStatus.nextRetryTime,
        credentialsValid: this.authStatus.credentialsValid,
      };
      // Set next retry time based on consecutive failures
      const backoffMinutes = Math.min(
        30 * Math.pow(2, this.authStatus.consecutiveFailures - 1),
        1440
      ); // Max 24 hours
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
