export type LanguageCode = 'en' | 'es' | 'fr' | 'de' | 'unknown';
export type SentimentLabel =
  | 'positive'
  | 'neutral'
  | 'negative'
  | 'very_positive'
  | 'very_negative';

export interface AnalysisRequest {
  text: string;
  language?: LanguageCode;
  allowSarcasmDetection?: boolean;
  allowContextWindow?: boolean;
  maxTokens?: number;
}

export interface SignalBreakdown {
  tokens: string[];
  ngrams?: Record<string, number>;
  emojis?: Record<string, number>;
  negationFlips?: number;
  intensifierBoost?: number;
  sarcasmScore?: number;
}

export interface EmotionAnalysis {
  joy: number;
  sadness: number;
  anger: number;
  fear: number;
  surprise: number;
  disgust: number;
}

export interface AnalysisResult {
  sentiment: {
    label: SentimentLabel;
    score: number; // -1..1
    magnitude: number;
    confidence: number; // 0..1
    emotions: EmotionAnalysis;
  };
  keywords: string[];
  language: LanguageCode;
  signals: SignalBreakdown;
  version: string; // engine version
}

export interface AnalyzerEngine {
  analyze(input: AnalysisRequest): Promise<AnalysisResult>;
}

export interface TweetDTO {
  id: string;
  text: string;
  language?: LanguageCode;
}

export interface SentimentOrchestrator {
  analyzeText(input: AnalysisRequest): Promise<AnalysisResult>;
  analyzeTweet(tweet: TweetDTO): Promise<AnalysisResult & { tweetId: string }>;
}

// Análisis de sentimiento específico para tweets
export interface TweetSentimentAnalysis {
  tweetId: string;
  analysis: AnalysisResult;
  brandMentions: BrandMention[];
  marketingInsights: MarketingInsights;
  analyzedAt: Date;
}

// Mención de marca
export interface BrandMention {
  brand: string;
  context: string;
  sentiment: {
    score: number;
    magnitude: number;
    confidence: number;
    label: SentimentLabel;
  };
  relevanceScore: number;
  associatedHashtags: string[];
  isCompetitor: boolean;
}

// Insights de marketing
export interface MarketingInsights {
  engagementPotential: number;
  viralityIndicators: string[];
  targetDemographics: string[];
  competitorMentions: string[];
  trendAlignment: number;
  brandRisk: 'low' | 'medium' | 'high';
  opportunityScore: number;
}

// Puntuación de influencia
export interface InfluenceScore {
  accountInfluence: number;
  contentReach: number;
  communityImpact: number;
  trendSetting: number;
  overallScore: number;
  factors: InfluenceFactor[];
}

export interface InfluenceFactor {
  factor: string;
  score: number;
  weight: number;
  description: string;
}

// Estadísticas de análisis
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

// Tendencias de sentimiento
export interface SentimentTrend {
  timestamp: Date;
  sentiment: number;
  volume: number;
  keywords: string[];
}

// Configuración de usuario
export interface UserConfiguration {
  id: string;
  language: LanguageCode;
  watchedBrands: string[];
  competitorList: string[];
  customKeywords: string[];
  analysisSettings: {
    enableEmotionAnalysis: boolean;
    enableBrandTracking: boolean;
    enableInfluenceScoring: boolean;
    sentimentThresholds: {
      positive: number;
      negative: number;
    };
  };
}

// Entidad Tweet básica
export interface Tweet {
  id: string;
  text: string;
  author: {
    id: string;
    username: string;
    displayName: string;
    followersCount: number;
  };
  metrics: {
    likes: number;
    retweets: number;
    replies: number;
    views?: number;
  };
  createdAt: Date;
  hashtags: string[];
  mentions: string[];
  urls: string[];
}
