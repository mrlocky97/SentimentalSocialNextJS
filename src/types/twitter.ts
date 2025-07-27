/**
 * Twitter Integration Types
 * Types for Twitter scraping with twikit and tweet analysis
 */

// Core Twitter Types
export interface Tweet {
  id: string;
  tweetId: string; // Twitter's original tweet ID
  content: string;
  author: TwitterUser;
  metrics: TweetMetrics;
  sentiment?: SentimentAnalysis;
  hashtags: string[];
  mentions: string[];
  urls: string[];
  mediaUrls?: string[];
  campaignId?: string; // Associated campaign

  // Tweet Classification
  isRetweet: boolean;
  isReply: boolean;
  isQuote: boolean;
  parentTweetId?: string; // If it's a reply or quote

  // Geographic Data
  geoLocation?: {
    country?: string;
    city?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };

  // Language Detection
  language: string; // ISO code

  // Timestamps
  scrapedAt: Date;
  createdAt: Date; // Tweet creation date
  updatedAt: Date;
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
  views?: number;
  engagement: number; // Calculated engagement rate
}

export interface SentimentAnalysis {
  score: number; // -1 to 1 (negative to positive)
  magnitude: number; // 0 to 1 (intensity)
  label: 'positive' | 'negative' | 'neutral';
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
  status: 'active' | 'paused' | 'completed' | 'draft';
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
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused';
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
  rateLimitStrategy: 'conservative' | 'aggressive' | 'adaptive';
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
  status?: 'active' | 'paused' | 'completed' | 'draft';
  settings?: Partial<CampaignSettings>;
}

export interface StartScrapingRequest {
  campaignId: string;
  maxTweets?: number;
  priority?: 'low' | 'normal' | 'high';
}
