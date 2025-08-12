/**
 * Twitter Authentication Manager - CONSOLIDATED
 * Handles authentication during server startup with integrated cookie management
 */

import fs from 'fs';
import path from 'path';
import { credentialsEncryption } from '../lib/security/credentials-encryption';
import { secureSessionStore } from '../lib/security/session-store';
import { SessionData } from '../types/twitter';
import { TwitterRealScraperService } from './twitter-scraper.service';

export class TwitterAuthManager {
  private static instance: TwitterAuthManager;
  private scraperService: TwitterRealScraperService | null = null;
  private isInitialized: boolean = false;
  private initializationError: Error | null = null;

  // Integrated cookie management
  private cookiesPath: string; // legacy path (kept for cleanup only)
  private sessionData: SessionData | null = null;
  private readonly SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  private constructor() {
    this.cookiesPath = path.join(process.cwd(), 'cookies.json');
    this.loadCookies();
  }

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
    try {
      // Create scraper instance
      this.scraperService = new TwitterRealScraperService();

      // Attempt early authentication
      await this.attemptEarlyAuth();

      this.isInitialized = true;
    } catch (error) {
      this.initializationError =
        error instanceof Error ? error : new Error('Unknown initialization error');

      // Don't throw error - let server start anyway
      this.isInitialized = true; // Mark as initialized even with error
    }
  }

  // Integrated cookie management methods
  private loadCookies(): void {
    // Prefer encrypted store
    const { session } = secureSessionStore.load();
    if (session) {
      this.sessionData = session;
      // Rotation flag can be used by caller to refresh session on next successful auth
    } else {
      // Fallback: if legacy cookies.json exists, purge it for safety
      try {
        if (fs.existsSync(this.cookiesPath)) {
          fs.unlinkSync(this.cookiesPath);
        }
      } catch {
        // Ignore errors when cleaning up legacy files
      }
      this.sessionData = null;
    }
  }

  private isSessionExpired(): boolean {
    if (!this.sessionData) return true;
    return Date.now() > this.sessionData.expirationTime;
  }

  private clearCookies(): void {
    this.sessionData = null;
    // Remove legacy file and encrypted store
    try {
      if (fs.existsSync(this.cookiesPath)) fs.unlinkSync(this.cookiesPath);
    } catch {
      // Ignore cleanup errors
    }
    secureSessionStore.clear();
  }

  /**
   * Public method to clear cookies (for logout)
   */
  public clearSession(): void {
    this.clearCookies();
  }

  /**
   * Check if there's a valid session
   */
  public hasValidSession(): boolean {
    return this.sessionData !== null && !this.isSessionExpired();
  }

  /**
   * Get current session data for status checks
   */
  public getSessionInfo(): { authenticated: boolean; expiresAt?: number; cookieCount: number } {
    if (!this.sessionData) {
      return { authenticated: false, cookieCount: 0 };
    }

    return {
      authenticated: !this.isSessionExpired(),
      expiresAt: this.sessionData.expirationTime,
      cookieCount: this.sessionData.cookies?.length || 0,
    };
  }

  /**
   * Attempt early authentication with enhanced error handling
   */
  private async attemptEarlyAuth(): Promise<void> {
    const credentials = this.getTwitterCredentials();

    if (!credentials) {
      throw new Error('Twitter credentials not configured');
    }

    try {
      // Try to initialize the scraper (this will attempt login)
      await this.scraperService!.scrapeByHashtag('test', { maxTweets: 1 });
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
   * Get Twitter credentials from environment with security validation
   */
  private getTwitterCredentials(): { email: string; username: string; password: string } | null {
    try {
      // SECURITY: Check for master password for credential decryption
      const masterPassword = process.env.TWITTER_MASTER_PASSWORD;
      const encryptedCredsPath = path.join(process.cwd(), 'encrypted-twitter-creds.json');

      // Try encrypted credentials first (more secure)
      if (masterPassword && fs.existsSync(encryptedCredsPath)) {
        try {
          const encryptedData = JSON.parse(fs.readFileSync(encryptedCredsPath, 'utf8'));
          const decrypted = credentialsEncryption.decryptTwitterCredentials(
            encryptedData,
            masterPassword
          );
          return decrypted;
        } catch {
          // Fall back to environment variables
        }
      }

      // Fallback to environment variables (less secure but compatible)
      const email = process.env.TWITTER_EMAIL;
      const username = process.env.TWITTER_USERNAME;
      const password = process.env.TWITTER_PASSWORD;

      if (!email || !username || !password) {
        return null;
      }

      return { email, username, password };
    } catch {
      return null;
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
      hasCredentials: !!this.getTwitterCredentials(),
    };
  }

  /**
   * Force re-authentication (useful for recovery)
   */
  async forceReauth(): Promise<void> {
    this.scraperService = null;
    this.initializationError = null;
    this.isInitialized = false;

    await this.initializeOnStartup();
  }
}
