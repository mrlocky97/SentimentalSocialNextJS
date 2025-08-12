/**
 * Core Twitter Types Module
 * Fundamental data structures for tweets, users, and metrics
 */

import { Label } from '../../enums/sentiment.enum';

/**
 * Core Tweet interface - represents a single tweet
 */
export interface Tweet {
  id: string;
  tweetId: string; // Twitter's original tweet ID
  content: string;
  text?: string; // Alias de content para compatibilidad
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
  geoLocation?: GeoLocation;

  // Language Detection
  language: string; // ISO code

  // Timestamps
  scrapedAt: Date;
  createdAt: Date; // Tweet creation date
  updatedAt: Date;
}

/**
 * Twitter User interface - represents user profile information
 */
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

/**
 * Tweet Metrics interface - engagement and interaction data
 */
export interface TweetMetrics {
  retweets: number;
  likes: number;
  replies: number;
  quotes: number;
  views?: number;
  engagement: number; // Calculated engagement rate
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

/**
 * Sentiment Analysis interface - sentiment analysis results
 */
export interface SentimentAnalysis {
  score: number; // -1 to 1 (negative to positive)
  magnitude: number; // 0 to 1 (intensity)
  label: Label;
  confidence: number; // 0 to 1
  emotions?: EmotionScores;
  keywords: string[]; // Key words that influenced sentiment
  analyzedAt: Date;
  processingTime: number; // milliseconds
}

/**
 * Emotion Scores interface - detailed emotional analysis
 */
export interface EmotionScores {
  joy?: number;
  anger?: number;
  fear?: number;
  sadness?: number;
  surprise?: number;
  disgust?: number;
}

/**
 * Tweet Processor interface - tweet processing utilities
 */
export interface TweetProcessor {
  extractHashtags(text: string): string[];
  extractMentions(text: string): string[];
  extractUrls(text: string): string[];
  detectLanguage(text: string): string;
  calculateEngagement(metrics: TweetMetrics, followers: number): number;
  classifyTweetType(text: string): TweetClassification;
}

/**
 * Tweet Classification interface
 */
export interface TweetClassification {
  isRetweet: boolean;
  isReply: boolean;
  isQuote: boolean;
}
