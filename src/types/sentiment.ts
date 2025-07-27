/**
 * Sentiment Analysis Types
 * Defines interfaces for sentiment analysis functionality
 */

export interface SentimentResult {
  score: number;           // -1 (very negative) to 1 (very positive)
  magnitude: number;       // 0 to infinity (strength of emotion)
  label: SentimentLabel;   // Human-readable sentiment
  confidence: number;      // 0 to 1 (confidence in the analysis)
  emotions?: EmotionAnalysis;
}

export type SentimentLabel = 'very_positive' | 'positive' | 'neutral' | 'negative' | 'very_negative';

export interface EmotionAnalysis {
  joy: number;
  sadness: number;
  anger: number;
  fear: number;
  surprise: number;
  disgust: number;
}

export interface TextAnalysis {
  sentiment: SentimentResult;
  keywords: string[];
  entities: EntityAnalysis[];
  language: string;
  readabilityScore?: number;
}

export interface EntityAnalysis {
  name: string;
  type: EntityType;
  salience: number;        // 0 to 1 (importance in text)
  sentiment?: SentimentResult;
}

export type EntityType = 'PERSON' | 'LOCATION' | 'ORGANIZATION' | 'EVENT' | 'WORK_OF_ART' | 'CONSUMER_GOOD' | 'OTHER';

export interface TweetSentimentAnalysis {
  tweetId: string;
  content: string;
  analysis: TextAnalysis;
  brandMentions: BrandMention[];
  hashtagSentiments: HashtagSentiment[];
  influenceScore: number;  // Based on engagement and author metrics
  marketingInsights: MarketingInsight[];
  analyzedAt: Date;
}

export interface BrandMention {
  brand: string;
  sentiment: SentimentResult;
  context: string;         // Surrounding text
  confidence: number;
}

export interface HashtagSentiment {
  hashtag: string;
  sentiment: SentimentResult;
  frequency: number;
}

export interface MarketingInsight {
  type: InsightType;
  description: string;
  impact: ImpactLevel;
  actionable: boolean;
  recommendation?: string;
}

export type InsightType =
  | 'brand_perception'
  | 'competitor_analysis'
  | 'trend_identification'
  | 'customer_feedback'
  | 'influencer_impact'
  | 'campaign_performance';

export type ImpactLevel = 'low' | 'medium' | 'high' | 'critical';

export interface SentimentAnalysisConfig {
  enableEmotionAnalysis: boolean;
  enableEntityExtraction: boolean;
  enableBrandMentionDetection: boolean;
  brandKeywords: string[];
  competitorKeywords: string[];
  customKeywords: string[];
  minConfidenceThreshold: number;
  languageSupport: string[];
}

export interface SentimentAnalysisStats {
  totalAnalyzed: number;
  averageSentiment: number;
  sentimentDistribution: {
    very_positive: number;
    positive: number;
    neutral: number;
    negative: number;
    very_negative: number;
  };
  topKeywords: Array<{
    keyword: string;
    frequency: number;
    avgSentiment: number;
  }>;
  brandMentionStats: Array<{
    brand: string;
    mentions: number;
    avgSentiment: number;
  }>;
  timeRange: {
    start: Date;
    end: Date;
  };
}

export interface SentimentTrend {
  timestamp: Date;
  sentiment: number;
  volume: number;
  keywords: string[];
}

export interface SentimentAnalysisProvider {
  name: string;
  analyze(text: string, config?: SentimentAnalysisConfig): Promise<TextAnalysis>;
  analyzeBatch(texts: string[], config?: SentimentAnalysisConfig): Promise<TextAnalysis[]>;
  isAvailable(): Promise<boolean>;
  getCost(textCount: number): number;
}
