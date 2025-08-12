/**
 * Twitter Real Scraper Service
 * Real implementation using twikit for scraping without official API
 */

import { Label } from "../enums/sentiment.enum";
import {
  AuthenticationStatus,
  ScrapedTweetData,
  ScrapingConfig,
  ScrapingOptions,
  ScrapingResult,
  Tweet,
} from "../types/twitter";

// Expresiones regulares precompiladas para detección de idioma
const LANGUAGE_REGEX = {
  es: /\b(el|la|de|en|que|y|es|se|no|por|con|para|muy|pero|más|como|este|otro|todo|hacer|estar)\b/,
  pt: /\b(o|a|de|em|que|e|do|da|para|com|não|mais|por|muito|ser|ter|fazer|estar)\b/,
  fr: /\b(le|la|de|et|à|un|il|être|avoir|que|pour|dans|sur|avec|ne|pas)\b/,
  de: /\b(der|die|das|und|in|den|von|zu|ist|mit|sich|auf|für|als|sie|ein)\b/,
};

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
  private lastResetTime = Date.now();

  // Twitter credentials
  private readonly twitterConfig = {
    username: process.env.TWITTER_USERNAME || "",
    password: process.env.TWITTER_PASSWORD || "",
    email: process.env.TWITTER_EMAIL || "",
  };

  // Estado de autenticación
  private authStatus: AuthenticationStatus = {
    isAuthenticated: false,
    lastCheck: new Date(),
    consecutiveFailures: 0,
    credentialsValid: false,
  };

  constructor(config: ScrapingConfig = {}) {
    this.config = {
      headless: true,
      timeout: 45000,
      delay: 2000,
      maxRetries: 1,
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      ...config,
    };
  }

  /**
   * Inicializa y autentica el scraper
   */
  private async initializeScraper(): Promise<any> {
    if (this.scraper && this.isAuthenticated) return this.scraper;

    const timeSinceLastAttempt = Date.now() - this.lastLoginAttempt.getTime();
    if (
      this.loginAttempts >= this.maxLoginAttempts &&
      timeSinceLastAttempt < this.loginCooldown
    ) {
      throw new Error(
        "Login attempts exceeded. Please wait before trying again.",
      );
    }

    try {
      const { Scraper } = await import("@the-convocation/twitter-scraper");
      this.scraper = new Scraper();
      this.lastLoginAttempt = new Date();
      this.loginAttempts++;

      // Intento de autenticación con cookies
      if (process.env.TWITTER_COOKIES?.trim()) {
        try {
          await this.authenticateWithCookies();
          this.updateAuthStatus(true);
          return this.scraper;
        } catch (cookieError) {
          console.warn(
            "Cookie authentication failed, falling back to credentials",
            cookieError,
          );
        }
      }

      // Autenticación con credenciales
      await this.authenticateWithCredentials();
      this.updateAuthStatus(true);
      return this.scraper;
    } catch (error) {
      this.handleAuthFailure(error);
      throw error;
    }
  }

  private async authenticateWithCookies(): Promise<void> {
    if (!this.scraper || !process.env.TWITTER_COOKIES) {
      throw new Error("Cookies not available");
    }

    const cookiesStr = process.env.TWITTER_COOKIES.trim();
    if (!cookiesStr) throw new Error("Empty cookies string");

    const cookiesObj = JSON.parse(cookiesStr);
    if (!cookiesObj.auth_token || !cookiesObj.ct0) {
      throw new Error("Missing essential cookies (auth_token or ct0)");
    }

    const cookieStrings = Object.entries(cookiesObj).map(
      ([name, value]) => `${name}=${value}; Domain=.x.com; Path=/`,
    );

    if (typeof this.scraper.setCookies === "function") {
      await this.scraper.setCookies(cookieStrings);
    } else if (typeof this.scraper.withCookies === "function") {
      this.scraper = this.scraper.withCookies(cookieStrings);
    } else {
      throw new Error("Scraper does not support cookie authentication");
    }

    // Verificación rápida de autenticación
    this.isAuthenticated = await this.scraper.isLoggedIn().catch(() => true);
    if (!this.isAuthenticated)
      throw new Error("Cookie authentication verification failed");
  }

  private async authenticateWithCredentials(): Promise<void> {
    if (!this.scraper) throw new Error("Scraper not initialized");

    const { username, password, email } = this.twitterConfig;
    if (!username || !password || !email) {
      throw new Error(
        "Twitter credentials not configured in environment variables",
      );
    }

    await this.delay(2000); // Anti-detection delay
    await this.scraper.login(username, password, email);
    this.isAuthenticated = true;
  }

  /**
   * Scrapea tweets por hashtag
   */
  async scrapeByHashtag(
    hashtag: string,
    options: ScrapingOptions = {},
  ): Promise<ScrapingResult> {
    try {
      this.checkRateLimit();
      const scraper = await this.initializeScraper();
      const maxTweets = options.maxTweets || 50;

      await this.delay(this.config.delay || 2000);

      const query = `#${hashtag}`;
      const searchResults = scraper.searchTweets(query, maxTweets);
      const scrapedTweets: ScrapedTweetData[] = [];
      let count = 0;
      for await (const tweet of searchResults) {
        if (count >= maxTweets) break;
        scrapedTweets.push(tweet);
        count++;
      }

      const processedTweets = this.processTweets(
        scrapedTweets.slice(0, maxTweets),
        options,
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
      return this.handleScrapingError(error);
    }
  }

  /**
   * Scrapea tweets por usuario
   */
  async scrapeByUser(
    username: string,
    options: ScrapingOptions = {},
  ): Promise<ScrapingResult> {
    try {
      this.checkRateLimit();
      const scraper = await this.initializeScraper();
      const maxTweets = options.maxTweets || 30;

      await this.delay(this.config.delay || 2000);

      const userTweets = scraper.getTweets(username, maxTweets);
      const scrapedTweets: ScrapedTweetData[] = [];
      let count = 0;
      for await (const tweet of userTweets) {
        if (count >= maxTweets) break;
        scrapedTweets.push(tweet);
        count++;
      }

      const processedTweets = this.processTweets(
        scrapedTweets.slice(0, maxTweets),
        options,
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
      return this.handleScrapingError(error);
    }
  }

  /**
   * Manejo centralizado de errores de scraping
   */
  private handleScrapingError(error: unknown): ScrapingResult {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isAuthError =
      /Forbidden|Authentication|not logged-in|Scraper is not logged-in/i.test(
        errorMessage,
      );

    if (isAuthError) {
      this.handleAuthFailure(error);
      throw error;
    }

    console.warn(`TwitterScraper: Non-critical error: ${errorMessage}`);
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

  /**
   * Manejo centralizado de fallos de autenticación
   */
  private handleAuthFailure(error: unknown): void {
    this.isAuthenticated = false;
    this.scraper = null;
    const errorMessage =
      error instanceof Error ? error.message : "Unknown authentication error";
    this.updateAuthStatus(false, errorMessage);
  }

  /**
   * Get current rate limit status
   */
  getRateLimitStatus() {
    const timeSinceLastAttempt = Date.now() - this.lastLoginAttempt.getTime();
    const cooldownRemaining = Math.max(
      0,
      this.loginCooldown - timeSinceLastAttempt,
    );

    return {
      isLimited: this.isRateLimited,
      remaining: this.maxRequestsPerHour - this.requestCount,
      resetTime: this.rateLimitResetTime,
      requestCount: this.requestCount,
      isAuthenticated: this.isAuthenticated,
      loginAttempts: this.loginAttempts,
      maxLoginAttempts: this.maxLoginAttempts,
      cooldownRemaining: Math.ceil(cooldownRemaining / 60000), // minutes
      canAttemptLogin:
        this.loginAttempts < this.maxLoginAttempts || cooldownRemaining <= 0,
    };
  }

  /**
   * Manejo de rate limit mejorado
   */
  private checkRateLimit() {
    const now = Date.now();
    const timeSinceReset = now - this.lastResetTime;

    // Resetear contador cada hora
    if (timeSinceReset >= 60 * 60 * 1000) {
      this.requestCount = 0;
      this.lastResetTime = now;
      this.isRateLimited = false;
    }

    if (this.requestCount >= this.maxRequestsPerHour) {
      this.isRateLimited = true;
      this.rateLimitResetTime = new Date(this.lastResetTime + 60 * 60 * 1000);
      throw new Error(
        "Rate limit exceeded. Please wait before making more requests.",
      );
    }
  }

  /**
   * Retraso optimizado
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Procesa y normaliza tweets
   */
  private processTweets(
    scrapedData: ScrapedTweetData[],
    options: ScrapingOptions,
  ): Tweet[] {
    const now = new Date();
    const maxAge = options.maxAgeHours
      ? options.maxAgeHours * 60 * 60 * 1000
      : Infinity;
    const shouldFilterLanguage = options.language && options.language !== "all";
    const targetLanguage = options.language;
    const tweets: Tweet[] = [];

    for (const item of scrapedData) {
      try {
        const tweet = this.normalizeTweet(item, now);

        // Filtrado por antigüedad
        if (options.maxAgeHours) {
          const tweetAge = now.getTime() - tweet.createdAt.getTime();
          if (tweetAge > maxAge) continue;
        }

        // Filtrado por idioma (solo si options.language está definido y no es 'all')
        if (shouldFilterLanguage) {
          // Si el tweet no tiene idioma detectado, igual lo aceptamos
          if (
            tweet.language &&
            tweet.language !== "unknown" &&
            tweet.language !== targetLanguage
          )
            continue;
        }

        tweets.push(tweet);
      } catch (error) {
        console.warn(
          `Error processing tweet: ${error instanceof Error ? error.message : error}`,
        );
      }
    }

    return tweets;
  }

  /**
   * Normaliza datos de tweet
   */
  private normalizeTweet(data: ScrapedTweetData, now: Date): Tweet {
    const tweetId =
      data.id ||
      `scraped_${now.getTime()}_${Math.random().toString(36).slice(2, 11)}`;

    // Placeholder para análisis de sentimiento (ajustado al tipo SentimentAnalysis)
    const sentiment = {
      score: 0,
      label: Label.NEUTRAL,
      magnitude: 0,
      confidence: 1,
      keywords: [],
      analyzedAt: now,
      processingTime: 0,
    };

    return {
      id: tweetId,
      tweetId,
      content: data.text || data.content || "",
      author: this.extractAuthorData(data, now),
      metrics: {
        likes: data.favorite_count || data.favoriteCount || 0,
        retweets: data.retweet_count || data.retweetCount || 0,
        replies: data.reply_count || data.replyCount || 0,
        quotes: data.quote_count || data.quoteCount || 0,
        views: (data.favorite_count || 0) * 10, // Estimación
        engagement: 0,
      },
      hashtags: data.hashtags || this.extractHashtags(data.text || ""),
      mentions: (data.mentions || []).map(
        (m) => m.screen_name || m.username || "",
      ),
      urls: (data.urls || []).map((u) => u.expanded_url || u.url || ""),
      mediaUrls: (data.media || []).map(
        (m) => m.media_url_https || m.url || "",
      ),
      isRetweet: data.is_retweet || data.isRetweet || false,
      isReply: (data.text || "").startsWith("@") || false,
      isQuote: data.is_quote_status || data.isQuote || false,
      language: this.detectTweetLanguage(data),
      scrapedAt: now,
      createdAt: data.created_at
        ? new Date(data.created_at)
        : data.createdAt
          ? new Date(data.createdAt)
          : now,
      updatedAt: now,
      sentiment,
    };
  }

  /**
   * Extrae datos del autor
   */
  private extractAuthorData(data: ScrapedTweetData, now: Date) {
    const directUser = (data as any).userId
      ? {
          id: (data as any).userId,
          username: (data as any).username,
          displayName: (data as any).name,
        }
      : null;

    const user =
      directUser || data.user || (data as any).author || (data as any).account;
    if (!user) return this.getDefaultAuthor(now);

    return {
      id: user.id_str || user.id || user.userId || "unknown",
      username: user.screen_name || user.username || user.handle || "unknown",
      displayName:
        user.name || user.displayName || user.display_name || "Unknown User",
      avatar:
        user.profile_image_url_https ||
        user.profile_image_url ||
        user.avatar ||
        "",
      verified: user.verified || user.is_verified || false,
      followersCount:
        user.followers_count || user.followersCount || user.followers || 0,
      followingCount:
        user.following_count || user.followingCount || user.following || 0,
      tweetsCount:
        user.statuses_count || user.statusesCount || user.tweets_count || 0,
      location: user.location || "",
      bio: user.description || user.bio || "",
      website: user.url || user.website || "",
      joinedDate: now,
    };
  }

  private getDefaultAuthor(now: Date) {
    return {
      id: "unknown",
      username: "unknown",
      displayName: "Unknown User",
      avatar: "",
      verified: false,
      followersCount: 0,
      followingCount: 0,
      tweetsCount: 0,
      location: "",
      bio: "",
      website: "",
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
   * Detección de idioma optimizada
   */
  private detectTweetLanguage(data: ScrapedTweetData): string {
    if (data.lang && data.lang !== "und") return data.lang;
    if (data.language && data.language !== "und") return data.language;

    const text = (data.text || data.content || "").toLowerCase();
    if (!text) return "unknown";

    for (const [lang, regex] of Object.entries(LANGUAGE_REGEX)) {
      if (regex.test(text)) return lang;
    }

    return "unknown";
  }

  /**
   * Get authentication status for monitoring
   */
  getAuthenticationStatus(): AuthenticationStatus {
    return { ...this.authStatus };
  }

  /**
   * Actualización de estado de autenticación
   */
  private updateAuthStatus(isSuccess: boolean, error?: string) {
    this.authStatus.lastCheck = new Date();

    if (isSuccess) {
      this.authStatus = {
        isAuthenticated: true,
        lastCheck: new Date(),
        consecutiveFailures: 0,
        credentialsValid: true,
      };
    } else {
      const consecutiveFailures = this.authStatus.consecutiveFailures + 1;
      const backoffMinutes = Math.min(
        30 * Math.pow(2, consecutiveFailures - 1),
        1440,
      );

      this.authStatus = {
        isAuthenticated: false,
        lastCheck: new Date(),
        lastError: error || "Unknown error",
        consecutiveFailures,
        nextRetryTime: new Date(Date.now() + backoffMinutes * 60 * 1000),
        credentialsValid: consecutiveFailures < 3,
      };
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
      this.updateAuthStatus(
        false,
        error instanceof Error ? error.message : "Health check failed",
      );
      return false;
    }
  }
}
