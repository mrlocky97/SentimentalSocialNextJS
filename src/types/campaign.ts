/**
 * Campaign Types and Interfaces
 * Defines all types related to social media campaign management and analysis
 */

export type CampaignStatus = 
  | 'draft'           // Campaign being created
  | 'active'          // Currently collecting data
  | 'paused'          // Temporarily stopped
  | 'completed'       // Finished collecting
  | 'archived';       // Completed and archived

export type CampaignType =
  | 'hashtag'         // Hashtag-based campaign (#JustDoIt)
  | 'keyword'         // Keyword-based campaign
  | 'mention'         // Mention-based campaign (@brand)
  | 'competitor';     // Competitor analysis

export type DataSource =
  | 'twitter'         // Twitter/X platform
  | 'instagram'       // Instagram platform
  | 'facebook'        // Facebook platform
  | 'tiktok'          // TikTok platform
  | 'linkedin';       // LinkedIn platform

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  
  // Campaign Configuration
  type: CampaignType;
  status: CampaignStatus;
  dataSources: DataSource[];
  
  // Tracking Parameters
  hashtags: string[];           // ["JustDoIt", "Nike", "motivation"]
  keywords: string[];           // ["running", "fitness", "sports"]
  mentions: string[];           // ["@Nike", "@adidas"]
  
  // Time Configuration
  startDate: Date;
  endDate: Date;
  timezone: string;             // "America/New_York"
  
  // Collection Settings
  maxTweets: number;            // Maximum tweets to collect
  collectImages: boolean;       // Collect image URLs
  collectVideos: boolean;       // Collect video URLs
  collectReplies: boolean;      // Include replies
  collectRetweets: boolean;     // Include retweets
  
  // Geographic Filters
  geoLocation?: {
    country?: string;           // "US", "MX", "CA"
    city?: string;              // "New York", "Mexico City"
    radius?: number;            // Radius in kilometers
    coordinates?: {             // Lat/Long coordinates
      lat: number;
      lng: number;
    };
  };
  
  // Language Filters
  languages: string[];          // ["en", "es", "fr"]
  
  // Analysis Configuration
  sentimentAnalysis: boolean;   // Enable sentiment analysis
  emotionAnalysis: boolean;     // Enable emotion detection
  topicsAnalysis: boolean;      // Enable topic modeling
  influencerAnalysis: boolean;  // Track influencer metrics
  
  // Organization & Permissions
  organizationId: string;
  createdBy: string;            // User ID who created
  assignedTo: string[];         // Array of user IDs with access
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastDataCollection?: Date;    // Last time data was collected
  
  // Statistics (computed fields)
  stats?: {
    totalTweets: number;
    totalEngagement: number;
    avgSentiment: number;
    topHashtags: { tag: string; count: number }[];
    topMentions: { mention: string; count: number }[];
    dailyVolume: { date: string; count: number }[];
  };
}

export interface CreateCampaignRequest {
  name: string;
  description?: string;
  type: CampaignType;
  dataSources: DataSource[];
  
  // Tracking Parameters
  hashtags: string[];
  keywords: string[];
  mentions: string[];
  
  // Time Configuration
  startDate: string;            // ISO string
  endDate: string;              // ISO string
  timezone: string;
  
  // Collection Settings
  maxTweets: number;
  collectImages?: boolean;
  collectVideos?: boolean;
  collectReplies?: boolean;
  collectRetweets?: boolean;
  
  // Geographic Filters
  geoLocation?: {
    country?: string;
    city?: string;
    radius?: number;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  
  // Language and Analysis
  languages: string[];
  sentimentAnalysis?: boolean;
  emotionAnalysis?: boolean;
  topicsAnalysis?: boolean;
  influencerAnalysis?: boolean;
  
  // Assignment
  organizationId: string;
  assignedTo?: string[];
}

export interface UpdateCampaignRequest {
  name?: string;
  description?: string;
  status?: CampaignStatus;
  
  // Collection Settings
  maxTweets?: number;
  collectImages?: boolean;
  collectVideos?: boolean;
  collectReplies?: boolean;
  collectRetweets?: boolean;
  
  // Analysis Settings
  sentimentAnalysis?: boolean;
  emotionAnalysis?: boolean;
  topicsAnalysis?: boolean;
  influencerAnalysis?: boolean;
  
  // Assignment Updates
  assignedTo?: string[];
  
  // Time Updates (only for draft campaigns)
  startDate?: string;
  endDate?: string;
  timezone?: string;
}

export interface CampaignFilter {
  status?: CampaignStatus;
  type?: CampaignType;
  organizationId?: string;
  createdBy?: string;
  assignedTo?: string;
  dataSources?: DataSource[];
  startDateFrom?: string;
  startDateTo?: string;
  endDateFrom?: string;
  endDateTo?: string;
}

export interface CampaignMetrics {
  campaignId: string;
  
  // Volume Metrics
  totalTweets: number;
  totalRetweets: number;
  totalReplies: number;
  totalQuotes: number;
  
  // Engagement Metrics
  totalLikes: number;
  totalShares: number;
  totalComments: number;
  avgEngagementRate: number;
  
  // Reach Metrics
  totalImpressions: number;
  uniqueUsers: number;
  totalFollowers: number;
  estimatedReach: number;
  
  // Sentiment Metrics
  sentimentScore: number;       // -1 to 1
  positiveCount: number;
  neutralCount: number;
  negativeCount: number;
  sentimentTrend: { date: string; score: number }[];
  
  // Content Analysis
  topHashtags: { tag: string; count: number; engagement: number }[];
  topMentions: { mention: string; count: number; engagement: number }[];
  topKeywords: { keyword: string; count: number; sentiment: number }[];
  
  // Temporal Analysis
  hourlyDistribution: { hour: number; count: number }[];
  dailyVolume: { date: string; tweets: number; engagement: number }[];
  weeklyTrend: { week: string; tweets: number; sentiment: number }[];
  
  // Geographic Analysis
  countryDistribution: { country: string; count: number; percentage: number }[];
  cityDistribution: { city: string; count: number; percentage: number }[];
  
  // Language Analysis
  languageDistribution: { language: string; count: number; percentage: number }[];
  
  // Influencer Analysis
  topInfluencers: {
    userId: string;
    username: string;
    followers: number;
    tweets: number;
    engagement: number;
    sentiment: number;
  }[];
  
  // Generated At
  generatedAt: Date;
  periodStart: Date;
  periodEnd: Date;
}

// Campaign Templates for quick setup
export interface CampaignTemplate {
  id: string;
  name: string;
  description: string;
  type: CampaignType;
  category: 'marketing' | 'brand-monitoring' | 'competitor-analysis' | 'crisis-management';
  
  // Default Configuration
  defaultDuration: number;      // Days
  defaultMaxTweets: number;
  defaultDataSources: DataSource[];
  defaultAnalysis: {
    sentiment: boolean;
    emotion: boolean;
    topics: boolean;
    influencer: boolean;
  };
  
  // Suggested Parameters
  suggestedHashtags: string[];
  suggestedKeywords: string[];
  suggestedLanguages: string[];
  
  createdAt: Date;
  isActive: boolean;
}

export type CampaignRole = 'owner' | 'editor' | 'viewer';

export interface CampaignAccess {
  campaignId: string;
  userId: string;
  role: CampaignRole;
  grantedBy: string;           // User ID who granted access
  grantedAt: Date;
  permissions: {
    canEdit: boolean;
    canDelete: boolean;
    canExport: boolean;
    canShare: boolean;
    canViewAnalytics: boolean;
  };
}
