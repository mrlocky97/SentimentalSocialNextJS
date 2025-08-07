/**
 * Tweet Sentiment Analysis Manager
 * Analyzes tweets and provides marketing insights
 */

import {
  BrandMention,
  HashtagSentiment,
  MarketingInsight,
  SentimentAnalysisConfig,
  SentimentAnalysisStats,
  SentimentTrend,
  TextAnalysis,
  TweetSentimentAnalysis,
} from '../types/sentiment';
import { Tweet } from '../types/twitter';

/**
 * Internal sentiment analysis logic
 */

class InternalSentimentAnalyzer {
  analyze(text: string, config?: any): Promise<TextAnalysis> {
    return new Promise((resolve) => {
      // Simplified rule-based sentiment analysis
      const lowerText = text.toLowerCase();

      // Positive words
      const positiveWords = [
        'good',
        'great',
        'excellent',
        'amazing',
        'love',
        'fantastic',
        'awesome',
        'perfect',
        'wonderful',
        'best',
        'bueno',
        'excelente',
        'increíble',
        'fantástico',
        'perfecto',
        'maravilloso',
        'mejor',
      ];

      // Negative words
      const negativeWords = [
        'bad',
        'terrible',
        'horrible',
        'hate',
        'worst',
        'awful',
        'disgusting',
        'pathetic',
        'useless',
        'fail',
        'malo',
        'terrible',
        'horrible',
        'odio',
        'peor',
        'fatal',
        'desastre',
      ];

      // Emoji sentiment map (más realista y variado)
      const emojiSentiment: Record<string, number> = {
        // Muy positivos
        '😀': 1,
        '😃': 1,
        '😄': 1,
        '😁': 1,
        '😆': 0.8,
        '😊': 0.8,
        '😍': 1,
        '🥰': 1,
        '😇': 0.7,
        '😎': 0.7,
        '👍': 0.7,
        '❤️': 1,
        '💖': 1,
        '🤩': 1,
        '🥳': 1,
        '�': 0.8,
        // Positivos
        '�😂': 0.5,
        '😅': 0.5,
        '😜': 0.5,
        '😋': 0.5,
        '😌': 0.5,
        '😻': 0.5,
        '😽': 0.5,
        '😸': 0.5,
        '😹': 0.5,
        '😺': 0.5,
        // Muy negativos
        '😢': -1,
        '😭': -1,
        '😞': -0.8,
        '😔': -0.8,
        '😡': -1,
        '😠': -1,
        '😤': -0.8,
        '👎': -0.7,
        '💔': -1,
        '😩': -0.8,
        '😫': -0.8,
        '😱': -0.7,
        '😨': -0.7,
        '😰': -0.7,
        '😓': -0.7,
        // Negativos
        '�': -0.5,
        '�': -0.5,
        '😬': -0.5,
        '�😑': -0.3,
        '�': -0.3,
        '�😶': -0.3,
        '�': -0.5,
        '�': -0.5,
        '�': -0.5,
        '😿': -0.5,
        '🙀': -0.5,
        // Neutros
        '🤔': 0,
        '😏': 0,
        '😳': 0,
        '😮': 0,
        '😯': 0,
        '😲': 0,
        '😴': 0,
        '😪': 0,
        '�‍🌫️': 0,
        '😐': 0,
        '😑': 0,
        '😶': 0,
      };

      let positiveScore = 0;
      let negativeScore = 0;
      let emojiScore = 0;
      let emojiCount = 0;
      let positiveEmojiCount = 0;
      let negativeEmojiCount = 0;

      positiveWords.forEach((word) => {
        if (lowerText.includes(word)) positiveScore++;
      });

      negativeWords.forEach((word) => {
        if (lowerText.includes(word)) negativeScore++;
      });

      // Emoji analysis (más realista: suma todos los emojis y pondera por cantidad)
      const emojiMatches = Array.from(
        text.matchAll(
          /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}\u{1F1E6}-\u{1F1FF}\u{1F191}-\u{1F251}\u{1F004}|\u{1F0CF}|\u{1F170}-\u{1F171}|\u{1F17E}-\u{1F17F}|\u{1F18E}|\u{3030}|\u{2B50}|\u{2B06}|\u{2194}-\u{2199}|\u{21A9}-\u{21AA}|\u{2934}-\u{2935}|\u{25AA}-\u{25AB}|\u{25FE}-\u{25FF}|\u{25B6}|\u{25C0}|\u{25FB}-\u{25FC}|\u{25FD}-\u{25FE}|\u{25B2}|\u{25BC}|\u{25C6}|\u{25C7}|\u{25CB}|\u{25CF}|\u{25A0}|\u{25A1}|\u{25B3}|\u{25B4}|\u{25B5}|\u{25B8}|\u{25B9}|\u{25BA}|\u{25BB}|\u{25BC}|\u{25BD}|\u{25BE}|\u{25BF}|\u{25C2}|\u{25C3}|\u{25C4}|\u{25C5}|\u{25C8}|\u{25C9}|\u{25CA}|\u{25CB}|\u{25CC}|\u{25CD}|\u{25CE}|\u{25CF}|\u{25D0}|\u{25D1}|\u{25D2}|\u{25D3}|\u{25D4}|\u{25D5}|\u{25D6}|\u{25D7}|\u{25D8}|\u{25D9}|\u{25DA}|\u{25DB}|\u{25DC}|\u{25DD}|\u{25DE}|\u{25DF}|\u{25E0}|\u{25E1}|\u{25E2}|\u{25E3}|\u{25E4}|\u{25E5}|\u{25E6}|\u{25E7}|\u{25E8}|\u{25E9}|\u{25EA}|\u{25EB}|\u{25EC}|\u{25ED}|\u{25EE}|\u{25EF}|\u{2600}-\u{26FF}|\u{2700}-\u{27BF}]/gu
        )
      );
      if (emojiMatches.length > 0) {
        for (const match of emojiMatches) {
          const emoji = match[0];
          emojiCount++;
          if (emojiSentiment[emoji] !== undefined) {
            emojiScore += emojiSentiment[emoji];
            if (emojiSentiment[emoji] > 0) positiveEmojiCount++;
            if (emojiSentiment[emoji] < 0) negativeEmojiCount++;
          }
        }
      }

      // Score base por palabras
      let score = positiveScore * 0.2 - negativeScore * 0.2;
      // Sumar el score de emojis, ponderando por cantidad y fuerza
      if (emojiCount > 0) {
        score += (emojiScore / emojiCount) * Math.min(1, emojiCount * 0.5); // más emojis, más peso
      }

      // Etiqueta y confianza más realista
      let label: 'positive' | 'negative' | 'neutral' = 'neutral';
      let confidence = 0.5;
      if (score > 0.15) {
        label = 'positive';
        confidence = Math.min(0.99, 0.6 + Math.abs(score) + positiveEmojiCount * 0.05);
      } else if (score < -0.15) {
        label = 'negative';
        confidence = Math.min(0.99, 0.6 + Math.abs(score) + negativeEmojiCount * 0.05);
      }

      // Extract basic keywords
      const words = text.split(/\s+/).filter((word) => word.length > 3);
      const keywords = words.slice(0, 5); // Take first 5 meaningful words

      // Detect language (simple heuristic)
      const spanishWords = ['el', 'la', 'que', 'de', 'es', 'y', 'pero', 'con', 'por'];
      const isSpanish = spanishWords.some((word) => lowerText.includes(word));

      const result: TextAnalysis = {
        sentiment: {
          score: Math.max(-1, Math.min(1, score)),
          magnitude: Math.abs(score),
          label,
          confidence,
          emotions: {
            joy: label === 'positive' ? confidence : 0,
            sadness: label === 'negative' ? confidence * 0.7 : 0,
            anger: label === 'negative' ? confidence * 0.8 : 0,
            fear: label === 'negative' ? confidence * 0.5 : 0,
            surprise: 0.1,
            disgust: label === 'negative' ? confidence * 0.6 : 0,
          },
        },
        keywords,
        entities: [], // Simplified - no entity extraction
        language: isSpanish ? 'es' : 'en',
      };

      resolve(result);
    });
  }
}

export class TweetSentimentAnalysisManager {
  // REMOVED: External sentiment service dependency - now using internal logic
  // private sentimentService: SentimentAnalysisService;
  private sentimentAnalyzer: InternalSentimentAnalyzer;
  private defaultConfig: SentimentAnalysisConfig;

  constructor() {
    // REMOVED: External service initialization - using internal analysis
    // this.sentimentService = new SentimentAnalysisService();
    this.sentimentAnalyzer = new InternalSentimentAnalyzer();
    this.defaultConfig = {
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

  /**
   * Analyze a single tweet with marketing insights
   */
  async analyzeTweet(
    tweet: Tweet,
    config?: Partial<SentimentAnalysisConfig>
  ): Promise<TweetSentimentAnalysis> {
    const finalConfig = { ...this.defaultConfig, ...config };

    try {
      // Perform text analysis using internal analyzer
      const textAnalysis = await this.sentimentAnalyzer.analyze(tweet.content, finalConfig);

      // Extract brand mentions
      const brandMentions = this.extractBrandMentions(tweet.content, finalConfig);

      // Analyze hashtag sentiments
      const hashtagSentiments = await this.analyzeHashtagSentiments(
        tweet.hashtags || [],
        tweet.content
      );

      // Calculate influence score
      const influenceScore = this.calculateInfluenceScore(tweet);

      // Generate marketing insights
      const marketingInsights = this.generateMarketingInsights(
        tweet,
        textAnalysis,
        brandMentions,
        influenceScore
      );

      const analysis: TweetSentimentAnalysis = {
        tweetId: tweet.tweetId,
        content: tweet.content,
        analysis: textAnalysis,
        brandMentions,
        hashtagSentiments,
        influenceScore,
        marketingInsights,
        analyzedAt: new Date(),
      };

      return analysis;
    } catch (error) {
      console.error(`❌ Error analyzing tweet ${tweet.tweetId}:`, error);
      throw new Error(
        `Failed to analyze tweet: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Analyze multiple tweets in batch
   */
  async analyzeTweetsBatch(
    tweets: Tweet[],
    config?: Partial<SentimentAnalysisConfig>
  ): Promise<TweetSentimentAnalysis[]> {
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
        errors.push(
          `Tweet ${tweets[i].tweetId}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
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
    const averageSentiment =
      analyses.reduce((sum, analysis) => sum + analysis.analysis.sentiment.score, 0) /
      analyses.length;

    // Calculate sentiment distribution
    const distribution = {
      very_positive: 0,
      positive: 0,
      neutral: 0,
      negative: 0,
      very_negative: 0,
    };
    analyses.forEach((analysis) => {
      distribution[analysis.analysis.sentiment.label]++;
    });

    // Calculate percentages
    Object.keys(distribution).forEach((key) => {
      distribution[key as keyof typeof distribution] =
        (distribution[key as keyof typeof distribution] / analyses.length) * 100;
    });

    // Extract top keywords
    const keywordCounts: { [key: string]: { count: number; totalSentiment: number } } = {};
    analyses.forEach((analysis) => {
      analysis.analysis.keywords.forEach((keyword) => {
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
        avgSentiment: data.totalSentiment / data.count,
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 20);

    // Calculate brand mention stats
    const brandStats: { [brand: string]: { mentions: number; totalSentiment: number } } = {};
    analyses.forEach((analysis) => {
      analysis.brandMentions.forEach((mention) => {
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
        avgSentiment: data.totalSentiment / data.mentions,
      }))
      .sort((a, b) => b.mentions - a.mentions);

    // Get time range
    const timestamps = analyses.map((a) => new Date(a.analyzedAt));
    const timeRange = {
      start: new Date(Math.min(...timestamps.map((t) => t.getTime()))),
      end: new Date(Math.max(...timestamps.map((t) => t.getTime()))),
    };

    return {
      totalAnalyzed: analyses.length,
      averageSentiment,
      sentimentDistribution: distribution,
      topKeywords,
      brandMentionStats,
      timeRange,
    };
  }

  /**
   * Generate sentiment trends over time
   */
  generateSentimentTrends(
    analyses: TweetSentimentAnalysis[],
    intervalHours: number = 1
  ): SentimentTrend[] {
    if (analyses.length === 0) return [];

    // Group analyses by time intervals
    const timeGroups: { [key: string]: TweetSentimentAnalysis[] } = {};

    analyses.forEach((analysis) => {
      const timestamp = new Date(analysis.analyzedAt);
      const intervalStart = new Date(
        Math.floor(timestamp.getTime() / (intervalHours * 60 * 60 * 1000)) *
          (intervalHours * 60 * 60 * 1000)
      );
      const key = intervalStart.toISOString();

      if (!timeGroups[key]) {
        timeGroups[key] = [];
      }
      timeGroups[key].push(analysis);
    });

    // Calculate trends for each interval
    const trends = Object.entries(timeGroups).map(([timestamp, groupAnalyses]) => {
      const avgSentiment =
        groupAnalyses.reduce((sum, analysis) => sum + analysis.analysis.sentiment.score, 0) /
        groupAnalyses.length;

      const allKeywords = groupAnalyses.flatMap((analysis) => analysis.analysis.keywords);
      const topKeywords = this.getTopKeywords(allKeywords, 5);

      return {
        timestamp: new Date(timestamp),
        sentiment: avgSentiment,
        volume: groupAnalyses.length,
        keywords: topKeywords,
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

    config.brandKeywords.forEach((brand) => {
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
          confidence: 0.8, // High confidence for exact brand matches
        });
      }
    });

    return mentions;
  }

  /**
   * Analyze sentiment of hashtags
   */
  private async analyzeHashtagSentiments(
    hashtags: string[],
    content: string
  ): Promise<HashtagSentiment[]> {
    const hashtagSentiments: HashtagSentiment[] = [];

    for (const hashtag of hashtags) {
      try {
        // Create context for hashtag analysis
        const hashtagContext = `Talking about ${hashtag} ${content}`;
        const analysis = await this.sentimentAnalyzer.analyze(hashtagContext);

        hashtagSentiments.push({
          hashtag,
          sentiment: analysis.sentiment,
          frequency: 1, // Individual tweet frequency is always 1
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
    brandMentions.forEach((mention) => {
      if (mention.sentiment.score < -0.5) {
        insights.push({
          type: 'brand_perception',
          description: `Negative sentiment detected for ${
            mention.brand
          } (${mention.sentiment.score.toFixed(2)})`,
          impact: influenceScore > 70 ? 'high' : influenceScore > 40 ? 'medium' : 'low',
          actionable: true,
          recommendation: `Monitor and respond to negative sentiment about ${mention.brand}. Consider damage control measures.`,
        });
      } else if (mention.sentiment.score > 0.5) {
        insights.push({
          type: 'brand_perception',
          description: `Positive sentiment detected for ${
            mention.brand
          } (${mention.sentiment.score.toFixed(2)})`,
          impact: influenceScore > 70 ? 'high' : 'medium',
          actionable: true,
          recommendation: `Amplify this positive mention through engagement and sharing.`,
        });
      }
    });

    // Influencer impact insights
    if (influenceScore > 80) {
      insights.push({
        type: 'influencer_impact',
        description: `High-influence user (score: ${influenceScore.toFixed(
          1
        )}) posted about your brand`,
        impact: 'high',
        actionable: true,
        recommendation:
          'Engage with this influential user to maximize reach and build relationships.',
      });
    }

    // Customer feedback insights
    if (
      textAnalysis.sentiment.label === 'negative' ||
      textAnalysis.sentiment.label === 'very_negative'
    ) {
      insights.push({
        type: 'customer_feedback',
        description: `Customer complaint or negative feedback detected (${textAnalysis.sentiment.score.toFixed(
          2
        )})`,
        impact: influenceScore > 50 ? 'high' : 'medium',
        actionable: true,
        recommendation:
          'Respond promptly to address customer concerns and demonstrate good customer service.',
      });
    }

    // Trend identification
    const emotionalWords = textAnalysis.keywords.filter((keyword: string) =>
      ['amazing', 'terrible', 'love', 'hate', 'best', 'worst', 'incredible', 'awful'].includes(
        keyword.toLowerCase()
      )
    );

    if (emotionalWords.length > 0) {
      insights.push({
        type: 'trend_identification',
        description: `Emotional language detected: ${emotionalWords.join(', ')}`,
        impact: 'medium',
        actionable: true,
        recommendation:
          'Monitor for trending emotional responses and adjust messaging accordingly.',
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
    const negativeWords = [
      'hate',
      'terrible',
      'worst',
      'awful',
      'horrible',
      'bad',
      'disappointing',
    ];

    const lowerContext = context.toLowerCase();
    let score = 0;

    positiveWords.forEach((word) => {
      if (lowerContext.includes(word)) score += 0.3;
    });

    negativeWords.forEach((word) => {
      if (lowerContext.includes(word)) score -= 0.3;
    });

    score = Math.max(-1, Math.min(1, score));

    return {
      score,
      magnitude: Math.abs(score),
      label: score > 0.2 ? 'positive' : score < -0.2 ? 'negative' : 'neutral',
      confidence: 0.7,
    };
  }

  /**
   * Get top keywords from a list
   */
  private getTopKeywords(keywords: string[], limit: number): string[] {
    const counts: { [key: string]: number } = {};
    keywords.forEach((keyword) => {
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
  ): (Tweet & {
    sentiment: {
      score: number;
      magnitude: number;
      label: string;
      confidence: number;
      emotions: any;
      keywords: string[];
      analyzedAt: Date;
      processingTime: number;
    };
  })[] {
    // Returns an array of tweets with sentiment fields added
    return tweets.map((tweet, index) => {
      const analysis = analyses[index];
      if (!analysis) return tweet as Tweet & { sentiment: any };

      const { sentiment, keywords } = analysis.analysis;
      const emotions = sentiment.emotions;

      const label = ['very_positive', 'positive'].includes(sentiment.label)
        ? 'positive'
        : ['very_negative', 'negative'].includes(sentiment.label)
        ? 'negative'
        : 'neutral';

      return {
        ...tweet,
        sentiment: {
          score: sentiment.score,
          magnitude: sentiment.magnitude,
          label,
          confidence: sentiment.confidence,
          emotions,
          keywords,
          analyzedAt: analysis.analyzedAt,
          processingTime: Date.now() - analysis.analyzedAt.getTime(),
        },
      };
    });
  }
}
