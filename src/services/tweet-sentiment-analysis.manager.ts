/**
 * Tweet Sentiment Analysis Manager
 * Analyzes tweets and provides marketing insights
 */

import { TweetSentimentAnalysis, BrandMention, HashtagSentiment, MarketingInsight, SentimentAnalysisStats, SentimentTrend, SentimentAnalysisConfig, InsightType, ImpactLevel } from '../types/sentiment';
import { Tweet } from '../types/twitter';
import { SentimentAnalysisService } from './sentiment-analysis.service';

export class TweetSentimentAnalysisManager {
  private sentimentService: SentimentAnalysisService;
  private defaultConfig: SentimentAnalysisConfig;

  constructor() {
    this.sentimentService = new SentimentAnalysisService();
    this.defaultConfig = {
      enableEmotionAnalysis: true,
      enableEntityExtraction: true,
      enableBrandMentionDetection: true,
      brandKeywords: ['nike', 'adidas', 'puma', 'reebok', 'under armour', 'new balance', 'converse', 'vans'],
      competitorKeywords: ['competitor', 'rival', 'alternative', 'better than', 'versus', 'vs'],
      customKeywords: [],
      minConfidenceThreshold: 0.6,
      languageSupport: ['en', 'es', 'fr', 'pt']
    };
  }

  /**
   * Analyze a single tweet with marketing insights
   */
  async analyzeTweet(tweet: Tweet, config?: Partial<SentimentAnalysisConfig>): Promise<TweetSentimentAnalysis> {
    const finalConfig = { ...this.defaultConfig, ...config };

    try {

      // Perform text analysis
      const textAnalysis = await this.sentimentService.analyze(tweet.content, finalConfig);

      // Extract brand mentions
      const brandMentions = this.extractBrandMentions(tweet.content, finalConfig);

      // Analyze hashtag sentiments
      const hashtagSentiments = await this.analyzeHashtagSentiments(tweet.hashtags || [], tweet.content);

      // Calculate influence score
      const influenceScore = this.calculateInfluenceScore(tweet);

      // Generate marketing insights
      const marketingInsights = this.generateMarketingInsights(tweet, textAnalysis, brandMentions, influenceScore);

      const analysis: TweetSentimentAnalysis = {
        tweetId: tweet.tweetId,
        content: tweet.content,
        analysis: textAnalysis,
        brandMentions,
        hashtagSentiments,
        influenceScore,
        marketingInsights,
        analyzedAt: new Date()
      };

      return analysis;

    } catch (error) {
      console.error(`❌ Error analyzing tweet ${tweet.tweetId}:`, error);
      throw new Error(`Failed to analyze tweet: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Analyze multiple tweets in batch
   */
  async analyzeTweetsBatch(tweets: Tweet[], config?: Partial<SentimentAnalysisConfig>): Promise<TweetSentimentAnalysis[]> {

    const results: TweetSentimentAnalysis[] = [];
    const errors: string[] = [];

    for (let i = 0; i < tweets.length; i++) {
      try {
        const analysis = await this.analyzeTweet(tweets[i], config);
        results.push(analysis);

        // Progress logging
        if ((i + 1) % 10 === 0) {
        }
      } catch (error) {
        errors.push(`Tweet ${tweets[i].tweetId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        console.error(`❌ Failed to analyze tweet ${i + 1}:`, error);
      }
    }

    if (errors.length > 0) {
      console.warn('❌ Errors during batch analysis:', errors);
    }

    return results;
  }

  /**
   * Generate comprehensive statistics from analyzed tweets
   */
  generateStatistics(analyses: TweetSentimentAnalysis[]): SentimentAnalysisStats {
    if (analyses.length === 0) {
      return this.createEmptyStats();
    }

    // Calculate average sentiment
    const averageSentiment = analyses.reduce((sum, analysis) =>
      sum + analysis.analysis.sentiment.score, 0) / analyses.length;

    // Calculate sentiment distribution
    const distribution = { very_positive: 0, positive: 0, neutral: 0, negative: 0, very_negative: 0 };
    analyses.forEach(analysis => {
      distribution[analysis.analysis.sentiment.label]++;
    });

    // Calculate percentages
    Object.keys(distribution).forEach(key => {
      distribution[key as keyof typeof distribution] =
        (distribution[key as keyof typeof distribution] / analyses.length) * 100;
    });

    // Extract top keywords
    const keywordCounts: { [key: string]: { count: number; totalSentiment: number } } = {};
    analyses.forEach(analysis => {
      analysis.analysis.keywords.forEach(keyword => {
        if (!keywordCounts[keyword]) {
          keywordCounts[keyword] = { count: 0, totalSentiment: 0 };
        }
        keywordCounts[keyword].count++;
        keywordCounts[keyword].totalSentiment += analysis.analysis.sentiment.score;
      });
    });

    const topKeywords = Object.entries(keywordCounts)
      .map(([keyword, data]) => ({
        keyword,
        frequency: data.count,
        avgSentiment: data.totalSentiment / data.count
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 20);

    // Calculate brand mention stats
    const brandStats: { [brand: string]: { mentions: number; totalSentiment: number } } = {};
    analyses.forEach(analysis => {
      analysis.brandMentions.forEach(mention => {
        if (!brandStats[mention.brand]) {
          brandStats[mention.brand] = { mentions: 0, totalSentiment: 0 };
        }
        brandStats[mention.brand].mentions++;
        brandStats[mention.brand].totalSentiment += mention.sentiment.score;
      });
    });

    const brandMentionStats = Object.entries(brandStats)
      .map(([brand, data]) => ({
        brand,
        mentions: data.mentions,
        avgSentiment: data.totalSentiment / data.mentions
      }))
      .sort((a, b) => b.mentions - a.mentions);

    // Get time range
    const timestamps = analyses.map(a => new Date(a.analyzedAt));
    const timeRange = {
      start: new Date(Math.min(...timestamps.map(t => t.getTime()))),
      end: new Date(Math.max(...timestamps.map(t => t.getTime())))
    };

    return {
      totalAnalyzed: analyses.length,
      averageSentiment,
      sentimentDistribution: distribution,
      topKeywords,
      brandMentionStats,
      timeRange
    };
  }

  /**
   * Generate sentiment trends over time
   */
  generateSentimentTrends(analyses: TweetSentimentAnalysis[], intervalHours: number = 1): SentimentTrend[] {
    if (analyses.length === 0) return [];

    // Group analyses by time intervals
    const timeGroups: { [key: string]: TweetSentimentAnalysis[] } = {};

    analyses.forEach(analysis => {
      const timestamp = new Date(analysis.analyzedAt);
      const intervalStart = new Date(
        Math.floor(timestamp.getTime() / (intervalHours * 60 * 60 * 1000)) * (intervalHours * 60 * 60 * 1000)
      );
      const key = intervalStart.toISOString();

      if (!timeGroups[key]) {
        timeGroups[key] = [];
      }
      timeGroups[key].push(analysis);
    });

    // Calculate trends for each interval
    const trends = Object.entries(timeGroups).map(([timestamp, groupAnalyses]) => {
      const avgSentiment = groupAnalyses.reduce((sum, analysis) =>
        sum + analysis.analysis.sentiment.score, 0) / groupAnalyses.length;

      const allKeywords = groupAnalyses.flatMap(analysis => analysis.analysis.keywords);
      const topKeywords = this.getTopKeywords(allKeywords, 5);

      return {
        timestamp: new Date(timestamp),
        sentiment: avgSentiment,
        volume: groupAnalyses.length,
        keywords: topKeywords
      };
    });

    return trends.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Extract brand mentions from tweet content
   */
  private extractBrandMentions(content: string, config: SentimentAnalysisConfig): BrandMention[] {
    const mentions: BrandMention[] = [];
    const lowerContent = content.toLowerCase();

    config.brandKeywords.forEach(brand => {
      const regex = new RegExp(`\\b${brand}\\b`, 'gi');
      const matches = content.match(regex);

      if (matches) {
        // Extract context around brand mention
        const brandIndex = lowerContent.indexOf(brand.toLowerCase());
        const contextStart = Math.max(0, brandIndex - 30);
        const contextEnd = Math.min(content.length, brandIndex + brand.length + 30);
        const context = content.substring(contextStart, contextEnd);

        // Calculate sentiment for this specific mention
        const sentiment = this.calculateMentionSentiment(context);

        mentions.push({
          brand: brand,
          sentiment,
          context,
          confidence: 0.8 // High confidence for exact brand matches
        });
      }
    });

    return mentions;
  }

  /**
   * Analyze sentiment of hashtags
   */
  private async analyzeHashtagSentiments(hashtags: string[], content: string): Promise<HashtagSentiment[]> {
    const hashtagSentiments: HashtagSentiment[] = [];

    for (const hashtag of hashtags) {
      try {
        // Create context for hashtag analysis
        const hashtagContext = `Talking about ${hashtag} ${content}`;
        const analysis = await this.sentimentService.analyze(hashtagContext);

        hashtagSentiments.push({
          hashtag,
          sentiment: analysis.sentiment,
          frequency: 1 // Individual tweet frequency is always 1
        });
      } catch (error) {
        console.error(`Error analyzing hashtag ${hashtag}:`, error);
      }
    }

    return hashtagSentiments;
  }

  /**
   * Calculate influence score based on tweet metrics
   */
  private calculateInfluenceScore(tweet: Tweet): number {
    const metrics = tweet.metrics || { likes: 0, retweets: 0, replies: 0, views: 0 };
    const author = tweet.author;

    // Engagement score (0-40 points)
    const totalEngagement = metrics.likes + metrics.retweets * 2 + metrics.replies * 1.5;
    const engagementScore = Math.min(40, Math.log10(totalEngagement + 1) * 10);

    // Author influence score (0-30 points)
    const followerScore = Math.min(20, Math.log10((author.followersCount || 0) + 1) * 2);
    const verifiedBonus = author.verified ? 10 : 0;
    const authorScore = followerScore + verifiedBonus;

    // Reach score (0-30 points)
    const reachScore = Math.min(30, Math.log10((metrics.views || totalEngagement) + 1) * 3);

    const totalScore = engagementScore + authorScore + reachScore;
    return Math.min(100, totalScore);
  }

  /**
   * Generate marketing insights from analysis
   */
  private generateMarketingInsights(
    tweet: Tweet,
    textAnalysis: any,
    brandMentions: BrandMention[],
    influenceScore: number
  ): MarketingInsight[] {
    const insights: MarketingInsight[] = [];

    // Brand perception insights
    brandMentions.forEach(mention => {
      if (mention.sentiment.score < -0.5) {
        insights.push({
          type: 'brand_perception',
          description: `Negative sentiment detected for ${mention.brand} (${mention.sentiment.score.toFixed(2)})`,
          impact: influenceScore > 70 ? 'high' : influenceScore > 40 ? 'medium' : 'low',
          actionable: true,
          recommendation: `Monitor and respond to negative sentiment about ${mention.brand}. Consider damage control measures.`
        });
      } else if (mention.sentiment.score > 0.5) {
        insights.push({
          type: 'brand_perception',
          description: `Positive sentiment detected for ${mention.brand} (${mention.sentiment.score.toFixed(2)})`,
          impact: influenceScore > 70 ? 'high' : 'medium',
          actionable: true,
          recommendation: `Amplify this positive mention through engagement and sharing.`
        });
      }
    });

    // Influencer impact insights
    if (influenceScore > 80) {
      insights.push({
        type: 'influencer_impact',
        description: `High-influence user (score: ${influenceScore.toFixed(1)}) posted about your brand`,
        impact: 'high',
        actionable: true,
        recommendation: 'Engage with this influential user to maximize reach and build relationships.'
      });
    }

    // Customer feedback insights
    if (textAnalysis.sentiment.label === 'negative' || textAnalysis.sentiment.label === 'very_negative') {
      insights.push({
        type: 'customer_feedback',
        description: `Customer complaint or negative feedback detected (${textAnalysis.sentiment.score.toFixed(2)})`,
        impact: influenceScore > 50 ? 'high' : 'medium',
        actionable: true,
        recommendation: 'Respond promptly to address customer concerns and demonstrate good customer service.'
      });
    }

    // Trend identification
    const emotionalWords = textAnalysis.keywords.filter((keyword: string) =>
      ['amazing', 'terrible', 'love', 'hate', 'best', 'worst', 'incredible', 'awful'].includes(keyword.toLowerCase())
    );

    if (emotionalWords.length > 0) {
      insights.push({
        type: 'trend_identification',
        description: `Emotional language detected: ${emotionalWords.join(', ')}`,
        impact: 'medium',
        actionable: true,
        recommendation: 'Monitor for trending emotional responses and adjust messaging accordingly.'
      });
    }

    return insights;
  }

  /**
   * Calculate sentiment for a specific mention context
   */
  private calculateMentionSentiment(context: string): any {
    // Simplified sentiment calculation for mention context
    const positiveWords = ['love', 'great', 'amazing', 'best', 'excellent', 'perfect', 'awesome'];
    const negativeWords = ['hate', 'terrible', 'worst', 'awful', 'horrible', 'bad', 'disappointing'];

    const lowerContext = context.toLowerCase();
    let score = 0;

    positiveWords.forEach(word => {
      if (lowerContext.includes(word)) score += 0.3;
    });

    negativeWords.forEach(word => {
      if (lowerContext.includes(word)) score -= 0.3;
    });

    score = Math.max(-1, Math.min(1, score));

    return {
      score,
      magnitude: Math.abs(score),
      label: score > 0.2 ? 'positive' : score < -0.2 ? 'negative' : 'neutral',
      confidence: 0.7
    };
  }

  /**
   * Get top keywords from a list
   */
  private getTopKeywords(keywords: string[], limit: number): string[] {
    const counts: { [key: string]: number } = {};
    keywords.forEach(keyword => {
      counts[keyword] = (counts[keyword] || 0) + 1;
    });

    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([keyword]) => keyword);
  }

  /**
   * Create empty statistics object
   */
  private createEmptyStats(): SentimentAnalysisStats {
    return {
      totalAnalyzed: 0,
      averageSentiment: 0,
      sentimentDistribution: {
        very_positive: 0,
        positive: 0,
        neutral: 0,
        negative: 0,
        very_negative: 0
      },
      topKeywords: [],
      brandMentionStats: [],
      timeRange: {
        start: new Date(),
        end: new Date()
      }
    };
  }
}
