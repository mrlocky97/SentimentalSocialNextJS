/**
 * Twitter Real Scraper Service
 * Uses @the-convocation/twitter-scraper for real Twitter data collection
 * Now with persistent cookie-based authentication
 */

import { Tweet } from '../types/twitter';
import { TwitterCookieManager } from './twitter-cookie-manager.service';

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
  
  // Cookie management for persistent sessions
  private cookieManager: TwitterCookieManager;
  
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
    
    // Initialize cookie manager
    this.cookieManager = new TwitterCookieManager();
    
    // Check if we have existing valid session
    if (this.cookieManager.hasValidSession()) {
      console.log('🍪 Found existing valid Twitter session');
      this.isAuthenticated = true;
      this.updateAuthStatus(true);
    }
  }

  /**
   * Initialize and authenticate the scraper with cookie support
   */
  private async initializeScraper() {
    if (this.scraper && this.isAuthenticated) {
      console.log('🔄 Using existing authenticated session');
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
      
      // Check if we have existing valid cookies
      const existingCookies = this.cookieManager.getCookies();
      const savedUserAgent = this.cookieManager.getUserAgent();
      
      const scraperConfig: any = {
        transform: {
          request: (input: any, init: any) => {
            // Add comprehensive headers and cookies
            if (init) {
              const cookieHeader = this.cookieManager.getCookiesAsString();
              
              init.headers = {
                ...init.headers,
                'User-Agent': savedUserAgent || this.config.userAgent,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Cache-Control': 'max-age=0',
              };

              // Add cookies if available
              if (cookieHeader) {
                init.headers['Cookie'] = cookieHeader;
              }
            }
            return [input, init];
          },
        },
        // Additional configuration for better reliability
        timeout: this.config.timeout,
        retry: this.config.maxRetries,
      };

      this.scraper = new Scraper(scraperConfig);

      // If we have valid cookies, try to use them first
      if (this.cookieManager.hasValidSession()) {
        console.log('🍪 Attempting authentication with saved cookies...');
        
        try {
          // Test if cookies are still valid by making a simple request
          const isLoggedIn = await this.scraper.isLoggedIn();
          if (isLoggedIn) {
            console.log('✅ Successfully authenticated using saved cookies!');
            this.isAuthenticated = true;
            this.updateAuthStatus(true);
            return this.scraper;
          } else {
            console.log('🍪 Saved cookies are invalid, clearing and attempting fresh login...');
            this.cookieManager.clearCookies();
          }
        } catch (error) {
          console.log('🍪 Cookie authentication failed, attempting fresh login...');
          this.cookieManager.clearCookies();
        }
      }

      // Get credentials from environment for fresh login
      const username = process.env.TWITTER_USERNAME;
      const password = process.env.TWITTER_PASSWORD;
      const email = process.env.TWITTER_EMAIL;
      const twoFactorSecret = process.env.TWITTER_2FA_SECRET;

      if (!username || !password || !email) {
        console.log('⚠️ Twitter credentials not found in environment variables');
        console.log('⚠️ Required: TWITTER_USERNAME, TWITTER_PASSWORD, TWITTER_EMAIL');
        console.log('⚠️ Using guest mode (limited functionality)');
        return this.scraper;
      }

      // Only attempt login if we haven't exceeded attempts
      if (this.loginAttempts < this.maxLoginAttempts) {
        console.log('🔐 Authenticating with Twitter credentials...');
        console.log(`⏰ Login attempt ${this.loginAttempts + 1}/${this.maxLoginAttempts}`);
        
        this.lastLoginAttempt = new Date();
        this.loginAttempts++;

        // Add random delay before login to appear more human-like
        const randomDelay = 3000 + Math.random() * 4000; // 3-7 seconds
        console.log(`⏱️ Waiting ${Math.round(randomDelay/1000)} seconds before login attempt...`);
        await this.delay(randomDelay);

        // Attempt to login with 2FA if available
        await this.scraper.login(username, password, email);

        this.isAuthenticated = true;
        this.updateAuthStatus(true);
        console.log('✅ Successfully authenticated with Twitter!');
        
        // Save cookies after successful authentication
        await this.saveCookiesAfterAuth();
        
        console.log('🛡️ Session will be reused to avoid multiple logins');
      }

      return this.scraper;

    } catch (error) {
      console.error('❌ Authentication failed:', error);
      this.updateAuthStatus(false, error instanceof Error ? error.message : 'Authentication failed');
      
      // Clear cookies on auth failure
      this.cookieManager.invalidateSession();
      
      // Handle specific error types
      if (error instanceof Error) {
        if (error.message.includes('429') || error.message.includes('rate limit')) {
          console.log('⏰ Rate limited. Resetting login attempts after cooldown.');
          this.loginAttempts = 0;
        } else if (error.message.includes('Forbidden')) {
          console.log('🚫 Twitter blocked the request. Consider using cookies from another session.');
        }
      }
      
      throw error;
    }
  }

  /**
   * Save cookies after successful authentication
   */
  private async saveCookiesAfterAuth(): Promise<void> {
    try {
      // Extract cookies from the scraper
      await this.cookieManager.extractCookiesFromScraper(this.scraper);
      console.log('🍪 Successfully saved authentication cookies for future sessions');
    } catch (error) {
      console.error('❌ Failed to save cookies:', error);
    }
  }

  /**
   * Scrape tweets by hashtag
   */
  async scrapeByHashtag(hashtag: string, options: ScrapingOptions = {}): Promise<ScrapingResult> {
    console.log(`🕷️ Starting hashtag scraping for #${hashtag}...`);
    
    try {
      await this.checkRateLimit();
      const scraper = await this.initializeScraper();
      
      const query = `#${hashtag}`;
      const maxTweets = options.maxTweets || 50;
      
      console.log(`🔍 Searching for: "${query}" (max: ${maxTweets} tweets)`);
      
      // Add delay to avoid rate limiting
      await this.delay(this.config.delay || 3000);
      
      // Search for tweets
      const searchResults = scraper.searchTweets(query, maxTweets);
      const scrapedTweets: ScrapedTweetData[] = [];
      
      // Collect results
      for await (const tweet of searchResults) {
        scrapedTweets.push(tweet);
        
        // Log progress
        if (scrapedTweets.length % 10 === 0) {
          console.log(`📊 Collected ${scrapedTweets.length} tweets...`);
        }
        
        // Respect rate limits
        if (scrapedTweets.length >= maxTweets) {
          break;
        }
      }

      console.log(`✅ Collected ${scrapedTweets.length} raw tweets`);

      // Process and normalize tweets
      const processedTweets = this.processTweets(scrapedTweets, options);
      
      // Update rate limit tracking
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
      console.error(`❌ Error scraping hashtag #${hashtag}:`, error);
      
      // For authentication errors, re-throw so the route can handle fallback
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (
        errorMessage.includes('Forbidden') ||
        errorMessage.includes('Authentication') ||
        errorMessage.includes('not logged-in') ||
        errorMessage.includes('Scraper is not logged-in') ||
        (error instanceof Error && error.name === 'AuthenticationError')
      ) {
        console.log('🔄 Re-throwing authentication error for fallback handling');
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
    console.log(`🕷️ Starting user scraping for @${username}...`);
    
    try {
      await this.checkRateLimit();
      const scraper = await this.initializeScraper();
      
      const maxTweets = options.maxTweets || 30;
      
      console.log(`👤 Getting tweets from @${username} (max: ${maxTweets} tweets)`);
      
      // Add delay
      await this.delay(this.config.delay || 3000);
      
      // Get user tweets
      const userTweets = scraper.getTweets(username, maxTweets);
      const scrapedTweets: ScrapedTweetData[] = [];
      
      // Collect results
      for await (const tweet of userTweets) {
        scrapedTweets.push(tweet);
        
        if (scrapedTweets.length % 5 === 0) {
          console.log(`📊 Collected ${scrapedTweets.length} tweets from @${username}...`);
        }
        
        if (scrapedTweets.length >= maxTweets) {
          break;
        }
      }

      console.log(`✅ Collected ${scrapedTweets.length} tweets from @${username}`);

      // Process tweets
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
      console.error(`❌ Error scraping user @${username}:`, error);
      
      // For authentication errors, re-throw so the route can handle fallback
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (
        errorMessage.includes('Forbidden') ||
        errorMessage.includes('Authentication') ||
        errorMessage.includes('not logged-in') ||
        errorMessage.includes('Scraper is not logged-in') ||
        (error instanceof Error && error.name === 'AuthenticationError')
      ) {
        console.log('🔄 Re-throwing authentication error for fallback handling');
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
        
        // Skip retweets if not wanted
        if (!options.includeRetweets && tweet.isRetweet) continue;
        
        tweets.push(tweet);
      } catch (error) {
        console.warn('⚠️ Failed to process tweet:', error);
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
      console.error('🔍 Auth health check failed:', error);
      this.updateAuthStatus(false, error instanceof Error ? error.message : 'Health check failed');
      return false;
    }
  }
}
