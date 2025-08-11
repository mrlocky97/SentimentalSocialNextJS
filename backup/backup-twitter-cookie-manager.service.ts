/**
 * Twitter Cookie Manager Service
 * Manages Twitter session cookies for persistent authentication
 */

import fs from 'fs';
import path from 'path';

interface TwitterCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
}

interface SessionData {
  cookies: TwitterCookie[];
  timestamp: number;
  userAgent: string;
  isValid: boolean;
  expirationTime: number;
}

export class TwitterCookieManager {
  private cookiesPath: string;
  private sessionData: SessionData | null = null;
  private readonly SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    // Store cookies in project root for persistence
    this.cookiesPath = path.join(process.cwd(), 'cookies.json');
    this.loadCookies();
  }

  /**
   * Load cookies from file
   */
  private loadCookies(): void {
    try {
      if (fs.existsSync(this.cookiesPath)) {
        const data = fs.readFileSync(this.cookiesPath, 'utf8');
        this.sessionData = JSON.parse(data);

        // Check if session is still valid
        if (this.sessionData && this.isSessionExpired()) {
          this.clearCookies();
        } else if (this.sessionData) {
        }
      }
    } catch (error) {
      console.error('❌ Error loading cookies:', error);
      this.sessionData = null;
    }
  }

  /**
   * Save cookies to file
   */
  private saveCookies(): void {
    try {
      if (this.sessionData) {
        fs.writeFileSync(this.cookiesPath, JSON.stringify(this.sessionData, null, 2));
      }
    } catch (error) {
      console.error('❌ Error saving cookies:', error);
    }
  }

  /**
   * Check if current session is expired
   */
  private isSessionExpired(): boolean {
    if (!this.sessionData) return true;

    const now = Date.now();
    const sessionAge = now - this.sessionData.timestamp;
    const isExpired = sessionAge > this.SESSION_DURATION || now > this.sessionData.expirationTime;

    return isExpired;
  }

  /**
   * Store session cookies after successful login
   */
  public storeCookies(cookies: TwitterCookie[], userAgent: string): void {
    const now = Date.now();

    this.sessionData = {
      cookies,
      timestamp: now,
      userAgent,
      isValid: true,
      expirationTime: now + this.SESSION_DURATION,
    };

    this.saveCookies();
  }

  /**
   * Get stored cookies for authentication
   */
  public getCookies(): TwitterCookie[] | null {
    if (!this.sessionData || this.isSessionExpired()) {
      return null;
    }

    return this.sessionData.cookies;
  }

  /**
   * Get stored user agent
   */
  public getUserAgent(): string | null {
    if (!this.sessionData || this.isSessionExpired()) {
      return null;
    }

    return this.sessionData.userAgent;
  }

  /**
   * Check if we have valid session cookies
   */
  public hasValidSession(): boolean {
    return this.sessionData !== null && !this.isSessionExpired() && this.sessionData.isValid;
  }

  /**
   * Clear all stored cookies
   */
  public clearCookies(): void {
    this.sessionData = null;

    try {
      if (fs.existsSync(this.cookiesPath)) {
        fs.unlinkSync(this.cookiesPath);
      }
    } catch (error) {
      console.error('❌ Error clearing cookies:', error);
    }
  }

  /**
   * Mark current session as invalid (e.g., after auth failure)
   */
  public invalidateSession(): void {
    if (this.sessionData) {
      this.sessionData.isValid = false;
      this.saveCookies();
    }
  }

  /**
   * Get session status info
   */
  public getSessionStatus(): {
    hasSession: boolean;
    isValid: boolean;
    age: number;
    timeLeft: number;
    cookieCount: number;
  } {
    if (!this.sessionData) {
      return {
        hasSession: false,
        isValid: false,
        age: 0,
        timeLeft: 0,
        cookieCount: 0,
      };
    }

    const now = Date.now();
    const age = now - this.sessionData.timestamp;
    const timeLeft = Math.max(0, this.sessionData.expirationTime - now);

    return {
      hasSession: true,
      isValid: this.sessionData.isValid && !this.isSessionExpired(),
      age,
      timeLeft,
      cookieCount: this.sessionData.cookies.length,
    };
  }

  /**
   * Convert cookies to format suitable for @the-convocation/twitter-scraper
   */
  public getCookiesForScraper(): any[] {
    const cookies = this.getCookies();
    if (!cookies) return [];

    return cookies.map((cookie) => ({
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path,
      expires: cookie.expires,
      httpOnly: cookie.httpOnly,
      secure: cookie.secure,
      sameSite: cookie.sameSite,
    }));
  }

  /**
   * Extract cookies from scraper instance
   */
  public async extractCookiesFromScraper(scraper: any): Promise<void> {
    try {
      // Get cookies from the scraper's internal browser/client
      if (scraper && scraper.getCookies) {
        const cookies = await scraper.getCookies();
        const userAgent = scraper.getUserAgent
          ? scraper.getUserAgent()
          : 'Mozilla/5.0 (compatible)';

        if (cookies && cookies.length > 0) {
          this.storeCookies(cookies, userAgent);
        }
      }
    } catch (error) {
      console.error('❌ Error extracting cookies from scraper:', error);
    }
  }

  /**
   * Get cookies as a string for HTTP headers
   */
  public getCookiesAsString(): string {
    const cookies = this.getCookies();
    if (!cookies || cookies.length === 0) return '';

    return cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; ');
  }

  /**
   * Get session timestamp
   */
  public getSessionTimestamp(): number | null {
    return this.sessionData ? this.sessionData.timestamp : null;
  }

  /**
   * Get session creation date
   */
  public getSessionDate(): Date | null {
    const timestamp = this.getSessionTimestamp();
    return timestamp ? new Date(timestamp) : null;
  }

  /**
   * Get session age in minutes
   */
  public getSessionAgeMinutes(): number | null {
    const timestamp = this.getSessionTimestamp();
    if (!timestamp) return null;

    return Math.floor((Date.now() - timestamp) / (1000 * 60));
  }
}
