/**
 * Campaign Management Types Module
 * Types for campaign creation, management, and analytics
 */

import { CampaignStatus } from "../../enums/campaign.enum";

/**
 * Campaign interface - represents a social media monitoring campaign
 */
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

/**
 * Campaign Settings interface - configuration for campaign data collection
 */
export interface CampaignSettings {
  maxTweets?: number; // Limit tweets to collect
  languages?: string[]; // Tweet languages to include
  geoLocation?: CampaignGeoLocation;
  excludeRetweets?: boolean;
  minimumFollowers?: number; // Minimum followers for user
  scrapingInterval: number; // Minutes between scraping sessions
}

/**
 * Campaign Geographic Location settings
 */
export interface CampaignGeoLocation {
  latitude: number;
  longitude: number;
  radius: number; // in km
}

/**
 * Campaign Analytics interface - comprehensive campaign performance metrics
 */
export interface CampaignAnalytics {
  campaignId: string;
  totalTweets: number;
  sentimentBreakdown: SentimentBreakdown;
  avgEngagement: number;
  topHashtags: HashtagAnalytics[];
  topKeywords: KeywordAnalytics[];
  timelineData: TimelineDataPoint[];
  influencers: InfluencerAnalytics[];
  generatedAt: Date;
}

/**
 * Sentiment Breakdown interface - sentiment distribution metrics
 */
export interface SentimentBreakdown {
  positive: number;
  negative: number;
  neutral: number;
  positivePercentage: number;
  negativePercentage: number;
  neutralPercentage: number;
}

/**
 * Hashtag Analytics interface
 */
export interface HashtagAnalytics {
  hashtag: string;
  count: number;
  sentiment: number;
}

/**
 * Keyword Analytics interface
 */
export interface KeywordAnalytics {
  keyword: string;
  count: number;
  sentiment: number;
}

/**
 * Timeline Data Point interface - time-series analytics
 */
export interface TimelineDataPoint {
  date: string;
  positive: number;
  negative: number;
  neutral: number;
  volume: number;
}

/**
 * Influencer Analytics interface - top influential users
 */
export interface InfluencerAnalytics {
  username: string;
  tweetsCount: number;
  avgEngagement: number;
  sentiment: number;
  followersCount: number;
}

/**
 * API Request Types for Campaign Management
 */

/**
 * Create Campaign Request interface
 */
export interface CreateCampaignRequest {
  name: string;
  description?: string;
  keywords: string[];
  hashtags: string[];
  users?: string[];
  endDate?: Date;
  settings: CampaignSettings;
}

/**
 * Update Campaign Request interface
 */
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
