/**
 * Sentiment Analysis Data Mappers
 * Mappers especializados para transformaciones de datos de análisis de sentimiento
 */

import { AnalysisResult, TweetSentimentAnalysis } from '../../lib/sentiment/types';
import { SentimentResult } from '../../types/sentiment';
import { Tweet, TweetMetrics, TwitterUser } from '../../types/twitter';
import { SentimentErrors } from '../errors';

/**
 * Mapper base para análisis de sentimiento
 */
export abstract class BaseSentimentMapper {
  /**
   * Valida resultado de análisis
   */
  protected static validateAnalysisResult(result: any): void {
    if (!result) {
      throw SentimentErrors.analysisFailed(
        'Empty analysis result',
        new Error('Analysis result is null or undefined')
      );
    }

    if (!result.sentiment) {
      throw SentimentErrors.analysisFailed(
        'Missing sentiment data',
        new Error('Analysis result must contain sentiment field')
      );
    }

    if (typeof result.sentiment.score !== 'number') {
      throw SentimentErrors.analysisFailed(
        'Invalid sentiment score',
        new Error('Sentiment score must be a number')
      );
    }
  }

  /**
   * Normaliza etiqueta de sentimiento
   */
  protected static normalizeSentimentLabel(label: string): 'positive' | 'negative' | 'neutral' {
    const lowerLabel = label.toLowerCase();

    if (lowerLabel.includes('positive') || lowerLabel === 'very_positive') {
      return 'positive';
    } else if (lowerLabel.includes('negative') || lowerLabel === 'very_negative') {
      return 'negative';
    } else {
      return 'neutral';
    }
  }

  /**
   * Normaliza score de sentimiento al rango -1 a 1
   */
  protected static normalizeScore(
    score: number,
    originalRange?: { min: number; max: number }
  ): number {
    if (originalRange) {
      // Normalizar desde rango original a -1,1
      const normalized =
        ((score - originalRange.min) / (originalRange.max - originalRange.min)) * 2 - 1;
      return Math.max(-1, Math.min(1, normalized));
    }

    // Asumir que ya está en rango -1,1
    return Math.max(-1, Math.min(1, score));
  }
}

/**
 * Mapper para convertir AnalysisResult a SentimentResult (formato legacy)
 */
export class AnalysisToSentimentResultMapper extends BaseSentimentMapper {
  /**
   * Convierte AnalysisResult moderno a SentimentResult legacy
   */
  static map(analysis: AnalysisResult): SentimentResult {
    this.validateAnalysisResult(analysis);

    return {
      score: this.normalizeScore(analysis.sentiment.score),
      magnitude: analysis.sentiment.magnitude || 0,
      label: this.normalizeSentimentLabel(analysis.sentiment.label),
      confidence: analysis.sentiment.confidence || 0,
      emotions: analysis.sentiment.emotions
        ? {
            joy: analysis.sentiment.emotions.joy || 0,
            sadness: analysis.sentiment.emotions.sadness || 0,
            anger: analysis.sentiment.emotions.anger || 0,
            fear: analysis.sentiment.emotions.fear || 0,
            surprise: analysis.sentiment.emotions.surprise || 0,
            disgust: analysis.sentiment.emotions.disgust || 0,
          }
        : undefined,
    };
  }

  /**
   * Convierte lote de AnalysisResult a SentimentResult
   */
  static mapBatch(analyses: AnalysisResult[]): SentimentResult[] {
    if (!Array.isArray(analyses)) {
      throw SentimentErrors.invalidBatch(0);
    }

    return analyses.map((analysis) => this.map(analysis));
  }
}

/**
 * Mapper para crear TweetSentimentAnalysis completo
 */
export class TweetSentimentAnalysisMapper extends BaseSentimentMapper {
  /**
   * Crea TweetSentimentAnalysis completo desde tweet y análisis
   */
  static map(
    tweet: Tweet,
    analysis: AnalysisResult,
    options: {
      includeMarketingInsights?: boolean;
      includeBrandMentions?: boolean;
      brandKeywords?: string[];
    } = {}
  ): TweetSentimentAnalysis {
    if (!tweet.id && !tweet.tweetId) {
      throw SentimentErrors.invalidTweet({ reason: 'Tweet must have an ID' });
    }

    this.validateAnalysisResult(analysis);

    const result: TweetSentimentAnalysis = {
      tweetId: tweet.id || tweet.tweetId,
      analysis,
      brandMentions: options.includeBrandMentions
        ? this.extractBrandMentions(tweet, analysis, options.brandKeywords || [])
        : [],
      marketingInsights: options.includeMarketingInsights
        ? this.generateMarketingInsights(tweet, analysis)
        : {
            engagementPotential: 0.5,
            viralityIndicators: [],
            targetDemographics: [],
            competitorMentions: [],
            trendAlignment: 0.5,
            brandRisk: 'low',
            opportunityScore: 0.5,
          },
      analyzedAt: new Date(),
    };

    return result;
  }

  /**
   * Crea lote de TweetSentimentAnalysis
   */
  static mapBatch(
    tweets: Tweet[],
    analyses: AnalysisResult[],
    options: {
      includeMarketingInsights?: boolean;
      includeBrandMentions?: boolean;
      brandKeywords?: string[];
    } = {}
  ): TweetSentimentAnalysis[] {
    if (tweets.length !== analyses.length) {
      throw SentimentErrors.invalidBatch(analyses.length);
    }

    return tweets.map((tweet, index) => this.map(tweet, analyses[index], options));
  }

  /**
   * Extrae menciones de marca del tweet
   */
  private static extractBrandMentions(
    tweet: Tweet,
    analysis: AnalysisResult,
    brandKeywords: string[]
  ) {
    const text = (tweet.content || tweet.text || '').toLowerCase();
    const mentions = [];

    for (const brand of brandKeywords) {
      const brandLower = brand.toLowerCase();
      if (text.includes(brandLower)) {
        // Extraer contexto alrededor de la mención
        const index = text.indexOf(brandLower);
        const contextStart = Math.max(0, index - 50);
        const contextEnd = Math.min(text.length, index + brand.length + 50);
        const context = text.substring(contextStart, contextEnd);

        mentions.push({
          brand,
          context,
          sentiment: {
            score: analysis.sentiment.score,
            magnitude: analysis.sentiment.magnitude,
            confidence: analysis.sentiment.confidence,
            label: this.normalizeSentimentLabel(analysis.sentiment.label),
          },
          relevanceScore: this.calculateRelevanceScore(text, brandLower),
          associatedHashtags: this.extractRelatedHashtags(tweet, brandLower),
          isCompetitor: false, // Esto se podría determinar con una lista de competidores
        });
      }
    }

    return mentions;
  }

  /**
   * Genera insights de marketing
   */
  private static generateMarketingInsights(tweet: Tweet, analysis: AnalysisResult) {
    const text = (tweet.content || tweet.text || '').toLowerCase();

    // Calcular potencial de engagement
    const engagementPotential = this.calculateEngagementPotential(tweet, analysis);

    // Detectar indicadores de viralidad
    const viralityIndicators = this.detectViralityIndicators(tweet, analysis);

    // Determinar demografía objetivo
    const targetDemographics = this.inferTargetDemographics(tweet);

    // Detectar menciones de competidores
    const competitorMentions = this.detectCompetitorMentions(text);

    // Calcular alineación con tendencias
    const trendAlignment = this.calculateTrendAlignment(tweet);

    // Evaluar riesgo de marca
    const brandRisk = this.evaluateBrandRisk(analysis);

    // Calcular score de oportunidad
    const opportunityScore = this.calculateOpportunityScore(
      engagementPotential,
      trendAlignment,
      analysis.sentiment.score
    );

    return {
      engagementPotential,
      viralityIndicators,
      targetDemographics,
      competitorMentions,
      trendAlignment,
      brandRisk,
      opportunityScore,
    };
  }

  /**
   * Calcula potencial de engagement
   */
  private static calculateEngagementPotential(tweet: Tweet, analysis: AnalysisResult): number {
    let score = 0.5; // Base score

    // Factor de sentimiento
    if (analysis.sentiment.score > 0.3) score += 0.2;
    else if (analysis.sentiment.score < -0.3) score += 0.1; // Controversia puede generar engagement

    // Factor de autor
    if (tweet.author.verified) score += 0.1;
    if (tweet.author.followersCount > 10000) score += 0.1;
    if (tweet.author.followersCount > 100000) score += 0.1;

    // Factor de contenido
    if (tweet.hashtags && tweet.hashtags.length > 0) score += 0.05;
    if (tweet.mentions && tweet.mentions.length > 0) score += 0.05;
    if (tweet.mediaUrls && tweet.mediaUrls.length > 0) score += 0.1;

    return Math.min(1, Math.max(0, score));
  }

  /**
   * Detecta indicadores de viralidad
   */
  private static detectViralityIndicators(tweet: Tweet, analysis: AnalysisResult): string[] {
    const indicators = [];
    const text = (tweet.content || tweet.text || '').toLowerCase();

    // Emociones fuertes
    if (analysis.sentiment.magnitude > 0.7) {
      indicators.push('high_emotional_intensity');
    }

    // Contenido multimedia
    if (tweet.mediaUrls && tweet.mediaUrls.length > 0) {
      indicators.push('multimedia_content');
    }

    // Hashtags trending
    if (tweet.hashtags && tweet.hashtags.length > 2) {
      indicators.push('hashtag_heavy');
    }

    // Palabras virales
    const viralWords = ['breaking', 'urgent', 'shocking', 'amazing', 'incredible', 'wow'];
    if (viralWords.some((word) => text.includes(word))) {
      indicators.push('viral_keywords');
    }

    // Preguntas que invitan respuesta
    if (text.includes('?')) {
      indicators.push('engagement_invitation');
    }

    return indicators;
  }

  /**
   * Infiere demografía objetivo
   */
  private static inferTargetDemographics(tweet: Tweet): string[] {
    const demographics = [];
    const text = (tweet.content || tweet.text || '').toLowerCase();

    // Análisis de lenguaje
    if (/\b(lit|fam|yeet|vibes)\b/.test(text)) {
      demographics.push('gen_z');
    }

    if (/\b(awesome|cool|great)\b/.test(text)) {
      demographics.push('millennials');
    }

    // Análisis de temas
    if (/\b(retirement|insurance|investment)\b/.test(text)) {
      demographics.push('adults_35_plus');
    }

    if (/\b(gaming|streaming|tiktok)\b/.test(text)) {
      demographics.push('young_adults');
    }

    if (/\b(family|kids|parenting)\b/.test(text)) {
      demographics.push('parents');
    }

    return demographics.length > 0 ? demographics : ['general'];
  }

  /**
   * Detecta menciones de competidores
   */
  private static detectCompetitorMentions(text: string): string[] {
    // Esta lista se podría cargar desde configuración
    const competitors = ['competitor1', 'competitor2', 'vs', 'versus', 'better than'];
    return competitors.filter((competitor) => text.includes(competitor.toLowerCase()));
  }

  /**
   * Calcula alineación con tendencias
   */
  private static calculateTrendAlignment(tweet: Tweet): number {
    // Implementación básica - se podría integrar con API de trending topics
    const hashtags = tweet.hashtags || [];
    const hasPopularHashtags = hashtags.some((tag) =>
      ['trending', 'viral', 'popular'].some((keyword) => tag.toLowerCase().includes(keyword))
    );

    return hasPopularHashtags ? 0.8 : 0.3;
  }

  /**
   * Evalúa riesgo de marca
   */
  private static evaluateBrandRisk(analysis: AnalysisResult): 'low' | 'medium' | 'high' {
    if (analysis.sentiment.score < -0.5) {
      return 'high';
    } else if (analysis.sentiment.score < -0.2) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Calcula score de oportunidad
   */
  private static calculateOpportunityScore(
    engagementPotential: number,
    trendAlignment: number,
    sentimentScore: number
  ): number {
    const sentimentFactor = sentimentScore > 0 ? 1 : 0.5;
    return engagementPotential * 0.4 + trendAlignment * 0.3 + sentimentFactor * 0.3;
  }

  /**
   * Calcula relevancia de mención de marca
   */
  private static calculateRelevanceScore(text: string, brand: string): number {
    const brandOccurrences = (text.match(new RegExp(brand, 'gi')) || []).length;
    const textLength = text.length;
    const relevance = (brandOccurrences * brand.length) / textLength;
    return Math.min(1, relevance * 10); // Normalizar
  }

  /**
   * Extrae hashtags relacionados con la marca
   */
  private static extractRelatedHashtags(tweet: Tweet, brand: string): string[] {
    const hashtags = tweet.hashtags || [];
    return hashtags.filter(
      (tag) =>
        tag.toLowerCase().includes(brand) ||
        this.calculateStringsimilarity(tag.toLowerCase(), brand) > 0.6
    );
  }

  /**
   * Calcula similitud entre strings
   */
  private static calculateStringsimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calcula distancia de Levenshtein
   */
  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }
}

/**
 * Mapper para estadísticas de análisis
 */
export class SentimentStatsMapper extends BaseSentimentMapper {
  /**
   * Genera estadísticas desde análisis de lote
   */
  static mapFromAnalyses(analyses: TweetSentimentAnalysis[]) {
    if (!Array.isArray(analyses) || analyses.length === 0) {
      throw SentimentErrors.invalidAnalysisArray();
    }

    const totalAnalyzed = analyses.length;
    const sentimentScores = analyses.map((a) => a.analysis.sentiment.score);
    const averageSentiment = sentimentScores.reduce((sum, score) => sum + score, 0) / totalAnalyzed;

    // Distribución de sentimientos
    const sentimentDistribution = analyses.reduce(
      (dist, analysis) => {
        const label = analysis.analysis.sentiment.label;
        dist[label] = (dist[label] || 0) + 1;
        return dist;
      },
      {} as Record<string, number>
    );

    // Top keywords
    const keywordFreq = new Map<string, { frequency: number; totalSentiment: number }>();

    analyses.forEach((analysis) => {
      analysis.analysis.keywords.forEach((keyword) => {
        const current = keywordFreq.get(keyword) || { frequency: 0, totalSentiment: 0 };
        keywordFreq.set(keyword, {
          frequency: current.frequency + 1,
          totalSentiment: current.totalSentiment + analysis.analysis.sentiment.score,
        });
      });
    });

    const topKeywords = Array.from(keywordFreq.entries())
      .map(([keyword, data]) => ({
        keyword,
        frequency: data.frequency,
        avgSentiment: data.totalSentiment / data.frequency,
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10);

    // Brand mention stats
    const brandStats = new Map<string, { mentions: number; totalSentiment: number }>();

    analyses.forEach((analysis) => {
      analysis.brandMentions.forEach((mention) => {
        const current = brandStats.get(mention.brand) || { mentions: 0, totalSentiment: 0 };
        brandStats.set(mention.brand, {
          mentions: current.mentions + 1,
          totalSentiment: current.totalSentiment + mention.sentiment.score,
        });
      });
    });

    const brandMentionStats = Array.from(brandStats.entries())
      .map(([brand, data]) => ({
        brand,
        mentions: data.mentions,
        avgSentiment: data.totalSentiment / data.mentions,
      }))
      .sort((a, b) => b.mentions - a.mentions);

    // Time range
    const timestamps = analyses.map((a) => a.analyzedAt);
    const timeRange = {
      start: new Date(Math.min(...timestamps.map((t) => t.getTime()))),
      end: new Date(Math.max(...timestamps.map((t) => t.getTime()))),
    };

    return {
      totalAnalyzed,
      averageSentiment,
      sentimentDistribution,
      topKeywords,
      brandMentionStats,
      timeRange,
    };
  }
}

/**
 * Métodos utilitarios para pruebas y mapeo unificado de resultados
 */
export class SentimentUtils {
  /**
   * Crea un Tweet de prueba para análisis
   * @param text
   * @param language
   * @returns
   */
  static createMockTweet(text: string, language = 'en'): Tweet {
    const author: TwitterUser = {
      id: 'test_user',
      username: 'test_user',
      displayName: 'Test User',
      verified: false,
      followersCount: 100,
      followingCount: 50,
      tweetsCount: 10,
      avatar: '',
    };

    const metrics: TweetMetrics = {
      likes: 0,
      retweets: 0,
      replies: 0,
      quotes: 0,
      views: 0,
      engagement: 0,
    };

    return {
      id: 'test_tweet',
      tweetId: 'test_tweet',
      content: text,
      author,
      metrics,
      hashtags: [],
      mentions: [],
      urls: [],
      mediaUrls: [],
      isRetweet: false,
      isReply: false,
      isQuote: false,
      language,
      createdAt: new Date(),
      scrapedAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Mapea resultado de análisis a formato unificado
   */
  static mapSentimentResult(analysis: any, naiveResult?: any, method = 'rule') {
    return {
      originalText: analysis.content,
      method,
      analysis: analysis.analysis,
      naiveBayes: naiveResult,
      brandMentions: analysis.brandMentions,
      marketingInsights: analysis.marketingInsights,
      summary: {
        sentiment: analysis.analysis.sentiment.label,
        score: analysis.analysis.sentiment.score,
        confidence: analysis.analysis.sentiment.confidence,
        keywords: analysis.analysis.keywords.slice(0, 5),
      },
    };
  }
}
