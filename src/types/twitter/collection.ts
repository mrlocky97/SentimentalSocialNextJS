/**
 * Collection and Processing Types Module
 * Types for tweet collection jobs, processing, and statistics
 */

import {
  PriorityScrapingStrategy,
  TweetCollectionJobStatus,
  TwitterRateLimitStrategy,
} from '../../enums/tweet.enum';

/**
 * Tweet Collection Job interface - represents a data collection task
 */
export interface TweetCollectionJob {
  id: string;
  campaignId: string;
  status: TweetCollectionJobStatus;
  progress: CollectionProgress;
  startedAt?: Date;
  completedAt?: Date;
  lastTweetId?: string; // For pagination
  errors: string[];
  retryCount: number;
  maxRetries: number;
}

/**
 * Collection Progress interface - progress tracking for collection jobs
 */
export interface CollectionProgress {
  tweetsCollected: number;
  targetCount: number;
  percentage: number;
  estimatedTimeRemaining?: number; // milliseconds
}

/**
 * Twitter Collection Config interface - configuration for data collection
 */
export interface TwitterCollectionConfig {
  campaignId: string;
  searchQuery: string;
  maxTweets: number;
  languages?: string[];
  excludeRetweets?: boolean;
  excludeReplies?: boolean;
  geoLocation?: CollectionGeoLocation;
  dateRange?: CollectionDateRange;
  rateLimitStrategy: TwitterRateLimitStrategy;
}

/**
 * Collection Geographic Location interface
 */
export interface CollectionGeoLocation {
  country?: string;
  radius?: string; // "25mi" or "50km"
  coordinates?: {
    lat: number;
    lng: number;
  };
}

/**
 * Collection Date Range interface
 */
export interface CollectionDateRange {
  startTime: Date;
  endTime: Date;
}

/**
 * Twitter Collection Stats interface - comprehensive collection statistics
 */
export interface TwitterCollectionStats {
  totalTweets: number;
  uniqueUsers: number;
  languages: Record<string, number>;
  tweetTypes: TweetTypeStats;
  timeDistribution: HourlyDistribution[];
  topHashtags: HashtagStats[];
  topMentions: MentionStats[];
  collectionPeriod: CollectionPeriod;
}

/**
 * Tweet Type Statistics interface
 */
export interface TweetTypeStats {
  original: number;
  retweets: number;
  replies: number;
  quotes: number;
}

/**
 * Hourly Distribution interface - tweets per hour statistics
 */
export interface HourlyDistribution {
  hour: number;
  count: number;
}

/**
 * Hashtag Statistics interface
 */
export interface HashtagStats {
  tag: string;
  count: number;
}

/**
 * Mention Statistics interface
 */
export interface MentionStats {
  username: string;
  count: number;
}

/**
 * Collection Period interface - time span of data collection
 */
export interface CollectionPeriod {
  startTime: Date;
  endTime: Date;
  duration: number; // milliseconds
}

/**
 * Start Scraping Request interface - request to start data collection
 */
export interface StartScrapingRequest {
  campaignId: string;
  maxTweets?: number;
  priority?: PriorityScrapingStrategy;
}
