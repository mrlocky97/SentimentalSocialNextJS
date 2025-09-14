/**
 * Scraper and Raw Data Types Module
 * Types for data scraping, raw data processing, and authentication
 */

import { TweetCookieSameSite } from "../../enums/tweet.enum";
import { Tweet } from "./core";

/**
 * Media Face Detection Data
 */
export interface MediaFace {
  x: number;
  y: number;
  h: number;
  w: number;
}

/**
 * Media Size Information
 */
export interface MediaSize {
  h: number;
  w: number;
  resize: "fit" | "crop";
}

/**
 * Media Features (face detection)
 */
export interface MediaFeatures {
  large?: { faces: MediaFace[] };
  medium?: { faces: MediaFace[] };
  small?: { faces: MediaFace[] };
  orig?: { faces: MediaFace[] };
}

/**
 * Media Original Info
 */
export interface MediaOriginalInfo {
  height: number;
  width: number;
  focus_rects?: Array<{
    x: number;
    y: number;
    w: number;
    h: number;
  }>;
}

/**
 * Photo/Media Data
 */
export interface PhotoData {
  id: string;
  url: string;
  alt_text?: string;
  display_url?: string;
  expanded_url?: string;
  media_key?: string;
  type?: "photo" | "video" | "animated_gif";
  indices?: [number, number];
  ext_media_availability?: {
    status: string;
  };
  features?: MediaFeatures;
  sizes?: {
    large?: MediaSize;
    medium?: MediaSize;
    small?: MediaSize;
    thumb?: MediaSize;
  };
  original_info?: MediaOriginalInfo;
}

/**
 * Place/Location Data
 */
export interface PlaceData {
  id: string;
  name: string;
  full_name: string;
  country: string;
  country_code: string;
  place_type: string;
  url?: string;
  bounding_box?: {
    type: "Polygon";
    coordinates: number[][][];
  };
}

/**
 * Hashtag Data
 */
export interface HashtagData {
  text: string;
  indices?: [number, number];
}

/**
 * URL Data
 */
export interface UrlData {
  url: string;
  expanded_url?: string;
  display_url?: string;
  indices?: [number, number];
}

/**
 * User Mention Data
 */
export interface UserMentionData {
  id_str?: string;
  screen_name?: string;
  name?: string;
  indices?: [number, number];
}

/**
 * Raw Tweet Data from __raw_UNSTABLE
 */
export interface RawTweetData {
  bookmark_count?: number;
  bookmarked?: boolean;
  created_at?: string;
  conversation_id_str?: string;
  display_text_range?: [number, number];
  entities?: {
    media?: PhotoData[];
    user_mentions?: UserMentionData[];
    urls?: UrlData[];
    hashtags?: HashtagData[];
    symbols?: any[];
  };
  extended_entities?: {
    media?: PhotoData[];
  };
  favorite_count?: number;
  favorited?: boolean;
  full_text?: string;
  is_quote_status?: boolean;
  lang?: string;
  possibly_sensitive?: boolean;
  possibly_sensitive_editable?: boolean;
  place?: PlaceData;
  quote_count?: number;
  reply_count?: number;
  retweet_count?: number;
  retweeted?: boolean;
  user_id_str?: string;
  id_str?: string;
}

/**
 * Scraped Tweet Data interface - raw data from scraping operations
 * Updated to handle the complete structure from @the-convocation/twitter-scraper
 */
export interface ScrapedTweetData {
  // Core identifiers
  id?: string;
  conversationId?: string;
  userId?: string;
  
  // Content
  text?: string;
  content?: string;
  full_text?: string;
  html?: string;
  
  // Engagement metrics
  likes?: number;
  favorite_count?: number;
  favoriteCount?: number;
  retweets?: number;
  retweet_count?: number;
  retweetCount?: number;
  replies?: number;
  reply_count?: number;
  replyCount?: number;
  quote_count?: number;
  quoteCount?: number;
  bookmarkCount?: number;
  views?: number;
  
  // User data
  name?: string;
  username?: string;
  user?: ScrapedUserData;
  author?: any;
  account?: any;
  
  // Content metadata
  hashtags?: string[] | HashtagData[];
  mentions?: UserMentionData[];
  urls?: string[] | UrlData[];
  photos?: PhotoData[];
  videos?: any[];
  media?: PhotoData[];
  
  // Status flags
  isRetweet?: boolean;
  is_retweet?: boolean;
  isReply?: boolean;
  isQuoted?: boolean;
  isQuote?: boolean;
  is_quote_status?: boolean;
  isEdited?: boolean;
  isPin?: boolean;
  sensitiveContent?: boolean;
  possibly_sensitive?: boolean;
  
  // Temporal data
  created_at?: string;
  createdAt?: string;
  timeParsed?: string;
  timestamp?: number;
  
  // Language and location
  lang?: string;
  language?: string;
  place?: PlaceData;
  
  // Conversation data
  thread?: any[];
  versions?: string[];
  
  // URLs and links
  permanentUrl?: string;
  
  // Raw data access
  __raw_UNSTABLE?: RawTweetData;
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
  campaignId?: string;
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
