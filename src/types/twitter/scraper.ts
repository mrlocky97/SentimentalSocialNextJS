/**
 * Scraper and Raw Data Types Module
 * Types for data scraping, raw data processing, and authentication
 */

import { TweetCookieSameSite } from "../../enums/tweet.enum";
import { Tweet } from "./core";

/**
 * Scraped Tweet Data interface - raw data from scraping operations
 * Handles multiple possible field names from different data sources
 */
export interface ScrapedTweetData {
  id?: string;
  text?: string;
  content?: string; // Alternative field name
  user?: ScrapedUserData;
  author?: any; // Alternative user object name
  account?: any; // Another alternative
  favorite_count?: number;
  favoriteCount?: number;
  retweet_count?: number;
  retweetCount?: number;
  reply_count?: number;
  replyCount?: number;
  quote_count?: number;
  quoteCount?: number;
  created_at?: string;
  createdAt?: string;
  hashtags?: string[];
  mentions?: any[];
  urls?: any[];
  media?: any[];
  is_retweet?: boolean;
  isRetweet?: boolean;
  is_quote_status?: boolean;
  isQuote?: boolean;
  lang?: string;
  language?: string;
}

/**
 * Scraped User Data interface - raw user data with multiple field variations
 */
export interface ScrapedUserData {
  id_str?: string;
  id?: string;
  userId?: string;
  screen_name?: string;
  username?: string;
  handle?: string;
  name?: string;
  displayName?: string;
  display_name?: string;
  verified?: boolean;
  is_verified?: boolean;
  followers_count?: number;
  followersCount?: number;
  followers?: number;
  following_count?: number;
  followingCount?: number;
  following?: number;
  statuses_count?: number;
  statusesCount?: number;
  tweets_count?: number;
  tweetsCount?: number;
  profile_image_url_https?: string;
  profile_image_url?: string;
  avatar?: string;
  profileImageUrl?: string;
  description?: string;
  bio?: string;
  location?: string;
  url?: string;
  website?: string;
}

/**
 * Scraping Options interface - configuration for scraping operations
 */
export interface ScrapingOptions {
  campaingId?: string;
  limit?: number;
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

/**
 * Scraping Result interface - results from scraping operations
 */
export interface ScrapingResult {
  tweets: Tweet[];
  totalFound: number;
  totalScraped: number;
  errors: string[];
  rateLimit: RateLimitInfo;
}

/**
 * Rate Limit Information interface
 */
export interface RateLimitInfo {
  remaining: number;
  resetTime: Date;
}

/**
 * Scraping Config interface - technical configuration for scraping
 */
export interface ScrapingConfig {
  headless?: boolean;
  timeout?: number;
  delay?: number;
  maxRetries?: number;
  userAgent?: string;
}

/**
 * Authentication Status interface - status of authentication systems
 */
export interface AuthenticationStatus {
  isAuthenticated: boolean;
  lastCheck: Date;
  lastError?: string;
  consecutiveFailures: number;
  nextRetryTime?: Date;
  credentialsValid: boolean;
}

/**
 * Twitter Cookie interface - cookie data for authentication
 */
export interface TwitterCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: TweetCookieSameSite;
}

/**
 * Session Data interface - session management data
 */
export interface SessionData {
  cookies: TwitterCookie[];
  timestamp: number;
  userAgent: string;
  isValid: boolean;
  expirationTime: number;
}
