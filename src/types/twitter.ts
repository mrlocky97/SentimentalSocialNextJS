/**
 * Twitter-related types and interfaces
 * Defines data structures for tweets, users, and social media data
 */

import { CampaignStatus } from "../enums/campaign.enum";
import { Label } from "../enums/sentiment.enum";
import {
  PriorityScrapingStrategy,
  TweetCollectionJobStatus,
  TweetCookieSameSite,
  TwitterRateLimitStrategy,
} from "../enums/tweet.enum";

// Core Twitter Types
export interface Tweet {
  id: string;
  tweetId: string; // Twitter's original tweet ID
  conversationId?: string; // Conversation thread ID
  content: string;
  text?: string; // Alias de content para compatibilidad
  author: TwitterUser;
  metrics: TweetMetrics;
  sentiment?: SentimentAnalysis;
  hashtags: string[];
  mentions: string[];
  urls: string[];
  mediaUrls?: string[];
  photoData?: any[]; // Rich photo/media data
  campaignId?: string; // Associated campaign

  // Tweet Classification
  isRetweet: boolean;
  isReply: boolean;
  isQuote: boolean;
  isEdited?: boolean; // If tweet was edited
  isPinned?: boolean; // If tweet is pinned
  isSensitive?: boolean; // If content is sensitive
  parentTweetId?: string; // If it's a reply or quote

  // Geographic Data
  geoLocation?: GeoLocation;
  location?: any; // Rich location data

  // Language Detection
  language: string; // ISO code

  // URLs and Rich Content
  permanentUrl?: string; // Permanent URL to tweet
  htmlContent?: string; // HTML representation

  // Timestamps
  scrapedAt: Date;
  createdAt: Date; // Tweet creation date
  updatedAt: Date;
}

/**
 * Geographic Location interface
 */
export interface GeoLocation {
  country?: string;
  city?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface TwitterUser {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  verified: boolean;
  followersCount: number;
  followingCount: number;
  tweetsCount: number;
  location?: string;
  bio?: string;
  website?: string;
  joinedDate?: Date;

  // Influencer Metrics
  influenceScore?: number; // Calculated influence score
  engagementRate?: number; // Average engagement rate
}

export interface TweetMetrics {
  retweets: number;
  likes: number;
  replies: number;
  quotes: number;
  bookmarks?: number; // Bookmark count
  views?: number;
  engagement: number; // Calculated engagement rate
}

export interface SentimentAnalysis {
  score: number; // -1 to 1 (negative to positive)
  magnitude: number; // 0 to 1 (intensity)
  label: Label;
  confidence: number; // 0 to 1
  emotions?: {
    joy?: number;
    anger?: number;
    fear?: number;
    sadness?: number;
    surprise?: number;
    disgust?: number;
  };
  keywords: string[]; // Key words that influenced sentiment
  analyzedAt: Date;
  processingTime: number; // milliseconds
}

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  keywords: string[]; // Keywords to track
  hashtags: string[]; // Hashtags to track
  users?: string[]; // Specific users to track
  startDate: Date;
  endDate?: Date;
  status: CampaignStatus;
  settings: CampaignSettings;
  createdBy: string; // User ID
  createdAt: Date;
  updatedAt: Date;
}

export interface CampaignSettings {
  maxTweets?: number; // Limit tweets to collect
  languages?: string[]; // Tweet languages to include
  geoLocation?: {
    latitude: number;
    longitude: number;
    radius: number; // in km
  };
  excludeRetweets?: boolean;
  minimumFollowers?: number; // Minimum followers for user
  scrapingInterval: number; // Minutes between scraping sessions
}

export interface CampaignAnalytics {
  campaignId: string;
  totalTweets: number;
  sentimentBreakdown: {
    positive: number;
    negative: number;
    neutral: number;
    positivePercentage: number;
    negativePercentage: number;
    neutralPercentage: number;
  };
  avgEngagement: number;
  topHashtags: Array<{
    hashtag: string;
    count: number;
    sentiment: number;
  }>;
  topKeywords: Array<{
    keyword: string;
    count: number;
    sentiment: number;
  }>;
  timelineData: Array<{
    date: string;
    positive: number;
    negative: number;
    neutral: number;
    volume: number;
  }>;
  influencers: Array<{
    username: string;
    tweetsCount: number;
    avgEngagement: number;
    sentiment: number;
    followersCount: number;
  }>;
  generatedAt: Date;
}

// Collection and Processing Types
export interface TweetCollectionJob {
  id: string;
  campaignId: string;
  status: TweetCollectionJobStatus;
  progress: {
    tweetsCollected: number;
    targetCount: number;
    percentage: number;
    estimatedTimeRemaining?: number; // milliseconds
  };
  startedAt?: Date;
  completedAt?: Date;
  lastTweetId?: string; // For pagination
  errors: string[];
  retryCount: number;
  maxRetries: number;
}

export interface TwitterCollectionConfig {
  campaignId: string;
  searchQuery: string;
  maxTweets: number;
  languages?: string[];
  excludeRetweets?: boolean;
  excludeReplies?: boolean;
  geoLocation?: {
    country?: string;
    radius?: string; // "25mi" or "50km"
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  dateRange?: {
    startTime: Date;
    endTime: Date;
  };
  rateLimitStrategy: TwitterRateLimitStrategy;
}

// Data Processing Types
export interface TweetProcessor {
  extractHashtags(text: string): string[];
  extractMentions(text: string): string[];
  extractUrls(text: string): string[];
  detectLanguage(text: string): string;
  calculateEngagement(metrics: TweetMetrics, followers: number): number;
  classifyTweetType(text: string): {
    isRetweet: boolean;
    isReply: boolean;
    isQuote: boolean;
  };
}

export interface TwitterCollectionStats {
  totalTweets: number;
  uniqueUsers: number;
  languages: Record<string, number>;
  tweetTypes: {
    original: number;
    retweets: number;
    replies: number;
    quotes: number;
  };
  timeDistribution: Array<{
    hour: number;
    count: number;
  }>;
  topHashtags: Array<{
    tag: string;
    count: number;
  }>;
  topMentions: Array<{
    username: string;
    count: number;
  }>;
  collectionPeriod: {
    startTime: Date;
    endTime: Date;
    duration: number; // milliseconds
  };
}

// API request types
export interface CreateCampaignRequest {
  name: string;
  description?: string;
  keywords: string[];
  hashtags: string[];
  users?: string[];
  endDate?: Date;
  settings: CampaignSettings;
}

export interface UpdateCampaignRequest {
  name?: string;
  description?: string;
  keywords?: string[];
  hashtags?: string[];
  users?: string[];
  endDate?: Date;
  status?: CampaignStatus;
  settings?: Partial<CampaignSettings>;
}

export interface StartScrapingRequest {
  campaignId: string;
  maxTweets?: number;
  priority?: PriorityScrapingStrategy;
}

// Twitter Scraper Service Types - Updated for complete data structure
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
  user?: {
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
  };
  author?: any;
  account?: any;
  
  // Content metadata
  hashtags?: string[] | any[];
  mentions?: any[];
  urls?: string[] | any[];
  photos?: any[];
  videos?: any[];
  media?: any[];
  
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
  place?: {
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
  };
  
  // Conversation data
  thread?: any[];
  versions?: string[];
  
  // URLs and links
  permanentUrl?: string;
  
  // Raw data access
  __raw_UNSTABLE?: any;
}

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

export interface AuthenticationStatus {
  isAuthenticated: boolean;
  lastCheck: Date;
  lastError?: string;
  consecutiveFailures: number;
  nextRetryTime?: Date;
  credentialsValid: boolean;
}

export interface ScrapingResult {
  tweets: Tweet[];
  totalFound: number;
  totalScraped: number;
  errors: string[];
  rateLimit: {
    remaining: number;
    resetTime: Date;
  };
}

export interface ScrapingConfig {
  headless?: boolean;
  timeout?: number;
  delay?: number;
  maxRetries?: number;
  userAgent?: string;
}

// Twitter Authentication Types
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

export interface SessionData {
  cookies: TwitterCookie[];
  timestamp: number;
  userAgent: string;
  isValid: boolean;
  expirationTime: number;
}
