/**
 * Tweet Sentiment Analysis Manager - Optimizado
 * Analiza tweets y proporciona información de marketing con mejoras de rendimiento
 */

import {
  BrandMention,
  HashtagSentiment,
  MarketingInsight,
  SentimentAnalysisConfig,
  SentimentAnalysisStats,
  SentimentLabel,
  SentimentTrend,
  TextAnalysis,
  TweetSentimentAnalysis,
} from '../types/sentiment';
import { Tweet } from '../types/twitter';
import { InternalSentimentAnalyzer } from './internal-sentiment-analyzer.service';
import {
  NaiveBayesSentimentService,
  NaiveBayesTrainingExample,
} from './naive-bayes-sentiment.service';

// Listas predefinidas para detección de emociones
const EMOTIONAL_WORDS = new Set([
  'amazing',
  'terrible',
  'love',
  'hate',
  'best',
  'worst',
  'incredible',
  'awful',
  'fantastic',
  'horrible',
]);

const POSITIVE_WORDS = new Set([
  'love',
  'great',
  'amazing',
  'best',
  'excellent',
  'perfect',
  'awesome',
  'fantastic',
  'superb',
  'outstanding',
]);

const NEGATIVE_WORDS = new Set([
  'hate',
  'terrible',
  'worst',
  'awful',
  'horrible',
  'bad',
  'disappointing',
  'poor',
  'failure',
  'disaster',
]);

export class TweetSentimentAnalysisManager {
  private sentimentAnalyzer: InternalSentimentAnalyzer;
  private naiveBayesService: NaiveBayesSentimentService;
  private defaultConfig: SentimentAnalysisConfig;

  constructor() {
    this.sentimentAnalyzer = new InternalSentimentAnalyzer();
    this.naiveBayesService = new NaiveBayesSentimentService();
    this.defaultConfig = this.createDefaultConfig();
  }

  private createDefaultConfig(): SentimentAnalysisConfig {
    return {
      enableEmotionAnalysis: true,
      enableEntityExtraction: true,
      enableBrandMentionDetection: true,
      brandKeywords: [
        'nike',
        'adidas',
        'puma',
        'reebok',
        'under armour',
        'new balance',
        'converse',
        'vans',
      ],
      competitorKeywords: ['competitor', 'rival', 'alternative', 'better than', 'versus', 'vs'],
      customKeywords: [],
      minConfidenceThreshold: 0.6,
      languageSupport: ['en', 'es', 'fr', 'pt'],
    };
  }

  trainNaiveBayes(examples: NaiveBayesTrainingExample[]) {
    this.naiveBayesService.train(examples);
  }

  predictNaiveBayes(text: string): { label: SentimentLabel; confidence: number } {
    return this.naiveBayesService.predict(text);
  }

  async analyzeTweet(
    tweet: Tweet,
    config?: Partial<SentimentAnalysisConfig>,
    method: 'rule' | 'naive' = 'rule'
  ): Promise<TweetSentimentAnalysis> {
    const finalConfig = { ...this.defaultConfig, ...config };

    try {
      const textAnalysis = await this.performTextAnalysis(tweet, finalConfig, method);
      const brandMentions = this.extractBrandMentions(tweet.content, finalConfig);
      const hashtagSentiments = await this.analyzeHashtagSentiments(
        tweet.hashtags || [],
        tweet.content
      );
      const influenceScore = this.calculateInfluenceScore(tweet);
      const marketingInsights = this.generateMarketingInsights(
        tweet,
        textAnalysis,
        brandMentions,
        influenceScore
      );

      return {
        tweetId: tweet.tweetId,
        content: tweet.content,
        analysis: textAnalysis,
        brandMentions,
        hashtagSentiments,
        influenceScore,
        marketingInsights,
        analyzedAt: new Date(),
      };
    } catch (error) {
      console.error(`❌ Error analyzing tweet ${tweet.tweetId}:`, error);
      throw new Error(
        `Failed to analyze tweet: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private async performTextAnalysis(
    tweet: Tweet,
    config: SentimentAnalysisConfig,
    method: 'rule' | 'naive'
  ): Promise<TextAnalysis> {
    if (method === 'naive') {
      const nbResult = this.naiveBayesService.predict(tweet.content);
      return {
        sentiment: {
          score: nbResult.label === 'positive' ? 1 : nbResult.label === 'negative' ? -1 : 0,
          magnitude: Math.abs(nbResult.confidence),
          label: nbResult.label,
          confidence: nbResult.confidence,
          emotions: {
            joy: 0,
            sadness: 0,
            anger: 0,
            fear: 0,
            surprise: 0,
            disgust: 0,
          },
        },
        keywords: this.extractKeywords(tweet.content),
        entities: [],
        language: tweet.language || 'en',
      };
    }
    return this.sentimentAnalyzer.analyze(tweet.content, config);
  }

  private extractKeywords(content: string): string[] {
    return content
      .split(/\s+/)
      .filter((w) => w.length > 3)
      .slice(0, 5);
  }

  async analyzeTweetsBatch(
    tweets: Tweet[],
    config?: Partial<SentimentAnalysisConfig>
  ): Promise<TweetSentimentAnalysis[]> {
    const results: TweetSentimentAnalysis[] = [];
    const errors: string[] = [];

    for (let i = 0; i < tweets.length; i++) {
      try {
        results.push(await this.analyzeTweet(tweets[i], config));
      } catch (error) {
        errors.push(
          `Tweet ${tweets[i].tweetId}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
        if (errors.length > 10) break; // Limitar errores
      }
    }

    if (errors.length > 0) {
      console.warn('❌ Errors during batch analysis:', errors.slice(0, 10));
    }

    return results;
  }

  generateStatistics(analyses: TweetSentimentAnalysis[]): SentimentAnalysisStats {
    if (analyses.length === 0) return this.createEmptyStats();

    let totalSentiment = 0;
    const distribution: { [key in SentimentLabel | 'very_positive' | 'very_negative']: number } = {
      very_positive: 0,
      positive: 0,
      neutral: 0,
      negative: 0,
      very_negative: 0,
    };

    const keywordCounts = new Map<string, { count: number; totalSentiment: number }>();
    const brandStats = new Map<string, { mentions: number; totalSentiment: number }>();
    const timestamps: number[] = [];

    for (const analysis of analyses) {
      const sentiment = analysis.analysis.sentiment;
      totalSentiment += sentiment.score;
      distribution[sentiment.label]++;

      // Procesar keywords
      for (const keyword of analysis.analysis.keywords) {
        const entry = keywordCounts.get(keyword) || { count: 0, totalSentiment: 0 };
        entry.count++;
        entry.totalSentiment += sentiment.score;
        keywordCounts.set(keyword, entry);
      }

      // Procesar menciones de marca
      for (const mention of analysis.brandMentions) {
        const brand = mention.brand;
        const entry = brandStats.get(brand) || { mentions: 0, totalSentiment: 0 };
        entry.mentions++;
        entry.totalSentiment += mention.sentiment.score;
        brandStats.set(brand, entry);
      }

      timestamps.push(analysis.analyzedAt.getTime());
    }

    // Calcular estadísticas finales
    const averageSentiment = totalSentiment / analyses.length;
    Object.keys(distribution).forEach((key) => {
      distribution[key as keyof typeof distribution] =
        (distribution[key as keyof typeof distribution] / analyses.length) * 100;
    });

    const topKeywords = Array.from(keywordCounts.entries())
      .map(([keyword, data]) => ({
        keyword,
        frequency: data.count,
        avgSentiment: data.totalSentiment / data.count,
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 20);

    const brandMentionStats = Array.from(brandStats.entries())
      .map(([brand, data]) => ({
        brand,
        mentions: data.mentions,
        avgSentiment: data.totalSentiment / data.mentions,
      }))
      .sort((a, b) => b.mentions - a.mentions);

    return {
      totalAnalyzed: analyses.length,
      averageSentiment,
      sentimentDistribution: distribution,
      topKeywords,
      brandMentionStats,
      timeRange: {
        start: new Date(Math.min(...timestamps)),
        end: new Date(Math.max(...timestamps)),
      },
    };
  }

  generateSentimentTrends(
    analyses: TweetSentimentAnalysis[],
    intervalHours: number = 1
  ): SentimentTrend[] {
    if (analyses.length === 0) return [];

    const intervalMs = intervalHours * 60 * 60 * 1000;
    const timeGroups = new Map<string, TweetSentimentAnalysis[]>();

    for (const analysis of analyses) {
      const timestamp = analysis.analyzedAt.getTime();
      const intervalStart = new Date(Math.floor(timestamp / intervalMs) * intervalMs);
      const key = intervalStart.toISOString();

      const group = timeGroups.get(key) || [];
      group.push(analysis);
      timeGroups.set(key, group);
    }

    return Array.from(timeGroups.entries())
      .map(([timestamp, group]) => {
        const totalSentiment = group.reduce((sum, a) => sum + a.analysis.sentiment.score, 0);
        const avgSentiment = totalSentiment / group.length;
        const allKeywords = group.flatMap((a) => a.analysis.keywords);

        return {
          timestamp: new Date(timestamp),
          sentiment: avgSentiment,
          volume: group.length,
          keywords: this.getTopKeywords(allKeywords, 5),
        };
      })
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  private extractBrandMentions(content: string, config: SentimentAnalysisConfig): BrandMention[] {
    const mentions: BrandMention[] = [];
    const lowerContent = content.toLowerCase();

    for (const brand of config.brandKeywords) {
      if (!lowerContent.includes(brand.toLowerCase())) continue;

      const brandIndex = lowerContent.indexOf(brand.toLowerCase());
      const context = content.substring(
        Math.max(0, brandIndex - 30),
        Math.min(content.length, brandIndex + brand.length + 30)
      );

      mentions.push({
        brand,
        sentiment: this.calculateMentionSentiment(context),
        context,
        confidence: 0.8,
      });
    }

    return mentions;
  }

  private async analyzeHashtagSentiments(
    hashtags: string[],
    content: string
  ): Promise<HashtagSentiment[]> {
    const hashtagSentiments: HashtagSentiment[] = [];

    for (const hashtag of hashtags) {
      try {
        const hashtagContext = `Talking about ${hashtag} ${content}`;
        const analysis = await this.sentimentAnalyzer.analyze(hashtagContext);
        hashtagSentiments.push({
          hashtag,
          sentiment: analysis.sentiment,
          frequency: 1,
        });
      } catch (error) {
        console.error(`Error analyzing hashtag ${hashtag}:`, error);
      }
    }

    return hashtagSentiments;
  }

  private calculateInfluenceScore(tweet: Tweet): number {
    const metrics = tweet.metrics || { likes: 0, retweets: 0, replies: 0, views: 0 };
    const author = tweet.author;

    // Cálculos optimizados
    const totalEngagement = metrics.likes + metrics.retweets * 2 + metrics.replies * 1.5;
    const engagementScore = Math.min(40, Math.log10(totalEngagement + 1) * 10);
    const followerScore = Math.min(20, Math.log10((author.followersCount || 0) + 1) * 2);
    const verifiedBonus = author.verified ? 10 : 0;
    const reachScore = Math.min(30, Math.log10((metrics.views || totalEngagement) + 1) * 3);

    return Math.min(100, engagementScore + followerScore + verifiedBonus + reachScore);
  }

  private generateMarketingInsights(
    tweet: Tweet,
    textAnalysis: any,
    brandMentions: BrandMention[],
    influenceScore: number
  ): MarketingInsight[] {
    const insights: MarketingInsight[] = [];

    // Procesar menciones de marca
    for (const mention of brandMentions) {
      const sentimentScore = mention.sentiment.score;
      const impactLevel = influenceScore > 70 ? 'high' : influenceScore > 40 ? 'medium' : 'low';

      if (sentimentScore < -0.5) {
        insights.push({
          type: 'brand_perception',
          description: `Negative sentiment detected for ${mention.brand} (${sentimentScore.toFixed(
            2
          )})`,
          impact: impactLevel,
          actionable: true,
          recommendation: `Monitor and respond to negative sentiment about ${mention.brand}`,
        });
      } else if (sentimentScore > 0.5) {
        insights.push({
          type: 'brand_perception',
          description: `Positive sentiment detected for ${mention.brand} (${sentimentScore.toFixed(
            2
          )})`,
          impact: impactLevel,
          actionable: true,
          recommendation: `Amplify this positive mention`,
        });
      }
    }

    // Detección de influencers
    if (influenceScore > 80) {
      insights.push({
        type: 'influencer_impact',
        description: `High-influence user (score: ${influenceScore.toFixed(1)})`,
        impact: 'high',
        actionable: true,
        recommendation: 'Engage with this influential user',
      });
    }

    // Detección de comentarios negativos
    const sentimentLabel = textAnalysis.sentiment.label;
    if (sentimentLabel === 'negative' || sentimentLabel === 'very_negative') {
      insights.push({
        type: 'customer_feedback',
        description: `Customer complaint detected (${textAnalysis.sentiment.score.toFixed(2)})`,
        impact: influenceScore > 50 ? 'high' : 'medium',
        actionable: true,
        recommendation: 'Respond to address concerns',
      });
    }

    // Detección de lenguaje emocional
    const emotionalWords = textAnalysis.keywords.filter((kw: string) =>
      EMOTIONAL_WORDS.has(kw.toLowerCase())
    );

    if (emotionalWords.length > 0) {
      insights.push({
        type: 'trend_identification',
        description: `Emotional language: ${emotionalWords.join(', ')}`,
        impact: 'medium',
        actionable: true,
        recommendation: 'Monitor emotional responses',
      });
    }

    return insights;
  }

  private calculateMentionSentiment(context: string): any {
    let score = 0;
    const lowerContext = context.toLowerCase();

    for (const word of POSITIVE_WORDS) {
      if (lowerContext.includes(word)) score += 0.3;
    }

    for (const word of NEGATIVE_WORDS) {
      if (lowerContext.includes(word)) score -= 0.3;
    }

    score = Math.max(-1, Math.min(1, score));

    return {
      score,
      magnitude: Math.abs(score),
      label: score > 0.2 ? 'positive' : score < -0.2 ? 'negative' : 'neutral',
      confidence: 0.7,
    };
  }

  private getTopKeywords(keywords: string[], limit: number): string[] {
    const counts = new Map<string, number>();
    for (const keyword of keywords) {
      counts.set(keyword, (counts.get(keyword) || 0) + 1);
    }

    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([keyword]) => keyword);
  }

  private createEmptyStats(): SentimentAnalysisStats {
    return {
      totalAnalyzed: 0,
      averageSentiment: 0,
      sentimentDistribution: {
        very_positive: 0,
        positive: 0,
        neutral: 0,
        negative: 0,
        very_negative: 0,
      },
      topKeywords: [],
      brandMentionStats: [],
      timeRange: {
        start: new Date(),
        end: new Date(),
      },
    };
  }

  mapTweetsWithSentiment(
    tweets: Tweet[],
    analyses: TweetSentimentAnalysis[]
  ): (Tweet & { sentiment: any })[] {
    return tweets.map((tweet, index) => {
      const analysis = analyses[index];
      const defaultSentiment = {
        score: 0,
        magnitude: 0,
        label: 'neutral' as 'neutral' | 'positive' | 'negative',
        confidence: 0,
        emotions: {},
        keywords: [],
        analyzedAt: new Date(),
        processingTime: 0,
      };

      if (!analysis) {
        return {
          ...tweet,
          sentiment: defaultSentiment,
        };
      }

      const { sentiment, keywords } = analysis.analysis;
      const label = this.normalizeSentimentLabel(sentiment.label);

      return {
        ...tweet,
        sentiment: {
          score: sentiment.score,
          magnitude: sentiment.magnitude,
          label,
          confidence: sentiment.confidence,
          emotions: sentiment.emotions,
          keywords,
          analyzedAt: analysis.analyzedAt,
          processingTime: Date.now() - analysis.analyzedAt.getTime(),
        },
      };
    });
  }

  private normalizeSentimentLabel(label: string): 'neutral' | 'positive' | 'negative' {
    if (label.includes('positive')) return 'positive';
    if (label.includes('negative')) return 'negative';
    return 'neutral';
  }
}
