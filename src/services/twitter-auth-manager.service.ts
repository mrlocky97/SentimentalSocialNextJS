/**
 * Twitter Authentication Manager
 * Handles authentication during server startup
 */

import { TwitterRealScraperService } from './twitter-real-scraper.service';

export class TwitterAuthManager {
  private static instance: TwitterAuthManager;
  private scraperService: TwitterRealScraperService | null = null;
  private isInitialized: boolean = false;
  private initializationError: Error | null = null;

  private constructor() {}

  static getInstance(): TwitterAuthManager {
    if (!TwitterAuthManager.instance) {
      TwitterAuthManager.instance = new TwitterAuthManager();
    }
    return TwitterAuthManager.instance;
  }

  /**
   * Initialize Twitter authentication during server startup
   */
  async initializeOnStartup(): Promise<void> {
    console.log('🐦 Initializing Twitter authentication...');
    
    try {
      // Create scraper instance
      this.scraperService = new TwitterRealScraperService();
      
      // Attempt early authentication
      await this.attemptEarlyAuth();
      
      this.isInitialized = true;
      console.log('✅ Twitter scraper ready for use');
      
    } catch (error) {
      this.initializationError = error instanceof Error ? error : new Error('Unknown initialization error');
      console.warn('⚠️ Twitter authentication failed during startup');
      console.warn('⚠️ Will attempt fallback to mock service when needed');
      console.warn(`⚠️ Error: ${this.initializationError.message}`);
      
      // Don't throw error - let server start anyway
      this.isInitialized = true; // Mark as initialized even with error
    }
  }

  /**
   * Attempt early authentication with enhanced error handling
   */
  private async attemptEarlyAuth(): Promise<void> {
    const username = process.env.TWITTER_USERNAME;
    const password = process.env.TWITTER_PASSWORD;
    const email = process.env.TWITTER_EMAIL;

    if (!username || !password || !email) {
      throw new Error('Twitter credentials not configured in environment');
    }

    console.log(`🔐 Attempting login for: ${username}`);
    console.log(`📧 Using email: ${email}`);

    try {
      // Try to initialize the scraper (this will attempt login)
      await this.scraperService!.scrapeByHashtag('test', { maxTweets: 1 });
      console.log('✅ Twitter authentication successful');
      
    } catch (error) {
      // Enhanced error analysis
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes('Forbidden') || errorMessage.includes('401')) {
        throw new Error('Invalid Twitter credentials - check username/password/email');
      } else if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
        throw new Error('Twitter rate limit exceeded - wait before retrying');
      } else if (errorMessage.includes('suspended') || errorMessage.includes('locked')) {
        throw new Error('Twitter account suspended or locked');
      } else if (errorMessage.includes('2FA') || errorMessage.includes('two-factor')) {
        throw new Error('Two-factor authentication required - configure TWITTER_2FA_SECRET');
      } else {
        throw new Error(`Twitter authentication failed: ${errorMessage}`);
      }
    }
  }

  /**
   * Get ready-to-use scraper service
   */
  getScraperService(): TwitterRealScraperService {
    if (!this.isInitialized) {
      throw new Error('Twitter authentication not initialized. Call initializeOnStartup() first.');
    }

    if (this.initializationError) {
      throw this.initializationError;
    }

    if (!this.scraperService) {
      throw new Error('Scraper service not available');
    }

    return this.scraperService;
  }

  /**
   * Check if scraper is ready for use
   */
  isReady(): boolean {
    return this.isInitialized && !this.initializationError && this.scraperService !== null;
  }

  /**
   * Get initialization status for health checks
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      ready: this.isReady(),
      error: this.initializationError?.message || null,
      hasCredentials: !!(process.env.TWITTER_USERNAME && process.env.TWITTER_PASSWORD && process.env.TWITTER_EMAIL)
    };
  }

  /**
   * Force re-authentication (useful for recovery)
   */
  async forceReauth(): Promise<void> {
    console.log('🔄 Forcing Twitter re-authentication...');
    this.scraperService = null;
    this.initializationError = null;
    this.isInitialized = false;
    
    await this.initializeOnStartup();
  }
}
