/**
 * Twitter Types Module - Unified Index
 * Modular exports for all Twitter-related types
 */

// Core Twitter Types
export type {
  EmotionScores,
  GeoLocation,
  SentimentAnalysis,
  Tweet,
  TweetClassification,
  TweetMetrics,
  TweetProcessor,
  TwitterUser,
} from './core';

// Campaign Management Types
export type {
  Campaign,
  CampaignAnalytics,
  CampaignGeoLocation,
  CampaignSettings,
  CreateCampaignRequest,
  HashtagAnalytics,
  InfluencerAnalytics,
  KeywordAnalytics,
  SentimentBreakdown,
  TimelineDataPoint,
  UpdateCampaignRequest,
} from './campaign';

// Collection and Processing Types
export type {
  CollectionDateRange,
  CollectionGeoLocation,
  CollectionPeriod,
  CollectionProgress,
  HashtagStats,
  HourlyDistribution,
  MentionStats,
  StartScrapingRequest,
  TweetCollectionJob,
  TweetTypeStats,
  TwitterCollectionConfig,
  TwitterCollectionStats,
} from './collection';

// Scraper and Raw Data Types
export type {
  AuthenticationStatus,
  RateLimitInfo,
  ScrapedTweetData,
  ScrapedUserData,
  ScrapingConfig,
  ScrapingOptions,
  ScrapingResult,
  SessionData,
  TwitterCookie,
} from './scraper';
