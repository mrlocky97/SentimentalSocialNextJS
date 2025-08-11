/**
 * API Response Mappers
 * Mappers especializados para transformaciones de respuestas de API
 */

import { TweetSentimentAnalysis } from '../../lib/sentiment/types';
import { Tweet } from '../../types/twitter';
import { SentimentErrors } from '../errors';

/**
 * Interfaces para respuestas de API
 */
export interface APIResponse<T> {
  success: boolean;
  data: T;
  message: string;
  timestamp: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    processingTime?: number;
  };
}

export interface APIErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    suggestions?: string[];
  };
  timestamp: string;
}

export interface TweetAnalysisAPIResponse {
  tweet: {
    id: string;
    content: string;
    author: {
      username: string;
      displayName: string;
      verified: boolean;
      followersCount: number;
    };
    metrics: {
      likes: number;
      retweets: number;
      replies: number;
      engagement: number;
    };
    createdAt: string;
  };
  sentiment: {
    label: 'positive' | 'negative' | 'neutral';
    score: number;
    confidence: number;
    emotions?: {
      joy: number;
      sadness: number;
      anger: number;
      fear: number;
      surprise: number;
      disgust: number;
    };
  };
  insights: {
    keywords: string[];
    language: string;
    engagementPotential: number;
    brandRisk: 'low' | 'medium' | 'high';
    marketingOpportunities: string[];
  };
  metadata: {
    analyzedAt: string;
    processingTime: number;
    version: string;
    method: string;
  };
}

export interface BatchAnalysisAPIResponse {
  results: TweetAnalysisAPIResponse[];
  summary: {
    totalProcessed: number;
    averageSentiment: number;
    sentimentDistribution: {
      positive: number;
      negative: number;
      neutral: number;
    };
    topKeywords: Array<{
      keyword: string;
      frequency: number;
      avgSentiment: number;
    }>;
    processingTime: number;
  };
  metadata: {
    batchId: string;
    processedAt: string;
    version: string;
  };
}

/**
 * Mapper base para respuestas de API
 */
export abstract class BaseAPIMapper {
  /**
   * Crea respuesta exitosa estándar
   */
  protected static createSuccessResponse<T>(
    data: T,
    message: string = 'Operation completed successfully',
    meta?: any
  ): APIResponse<T> {
    return {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString(),
      meta,
    };
  }

  /**
   * Calcula tiempo de procesamiento
   */
  protected static calculateProcessingTime(startTime: Date): number {
    return Date.now() - startTime.getTime();
  }

  /**
   * Sanitiza datos sensibles para respuesta pública
   */
  protected static sanitizeForAPI(data: any): any {
    if (!data) return data;

    const sanitized = { ...data };

    // Eliminar campos sensibles
    delete sanitized.internalId;
    delete sanitized.rawAnalysis;
    delete sanitized.debug;
    delete sanitized.systemMetadata;

    return sanitized;
  }
}

/**
 * Mapper para análisis individual de tweet
 */
export class TweetAnalysisAPIMapper extends BaseAPIMapper {
  /**
   * Convierte TweetSentimentAnalysis a respuesta de API
   */
  static map(
    tweet: Tweet,
    analysis: TweetSentimentAnalysis,
    startTime?: Date
  ): APIResponse<TweetAnalysisAPIResponse> {
    if (!tweet || !analysis) {
      throw SentimentErrors.analysisFailed('Missing tweet or analysis data');
    }

    const apiResponse: TweetAnalysisAPIResponse = {
      tweet: {
        id: tweet.id || tweet.tweetId,
        content: tweet.content || tweet.text || '',
        author: {
          username: tweet.author.username,
          displayName: tweet.author.displayName,
          verified: tweet.author.verified,
          followersCount: tweet.author.followersCount,
        },
        metrics: {
          likes: tweet.metrics.likes,
          retweets: tweet.metrics.retweets,
          replies: tweet.metrics.replies,
          engagement: tweet.metrics.engagement || 0,
        },
        createdAt: (tweet.createdAt || new Date()).toISOString(),
      },
      sentiment: {
        label: this.normalizeSentimentLabel(analysis.analysis.sentiment.label),
        score: Math.round(analysis.analysis.sentiment.score * 1000) / 1000,
        confidence: Math.round(analysis.analysis.sentiment.confidence * 1000) / 1000,
        emotions: analysis.analysis.sentiment.emotions
          ? {
              joy: Math.round(analysis.analysis.sentiment.emotions.joy * 1000) / 1000,
              sadness: Math.round(analysis.analysis.sentiment.emotions.sadness * 1000) / 1000,
              anger: Math.round(analysis.analysis.sentiment.emotions.anger * 1000) / 1000,
              fear: Math.round(analysis.analysis.sentiment.emotions.fear * 1000) / 1000,
              surprise: Math.round(analysis.analysis.sentiment.emotions.surprise * 1000) / 1000,
              disgust: Math.round(analysis.analysis.sentiment.emotions.disgust * 1000) / 1000,
            }
          : undefined,
      },
      insights: {
        keywords: analysis.analysis.keywords.slice(0, 10), // Limitar a top 10
        language: analysis.analysis.language || 'unknown',
        engagementPotential:
          Math.round(analysis.marketingInsights.engagementPotential * 1000) / 1000,
        brandRisk: analysis.marketingInsights.brandRisk,
        marketingOpportunities: analysis.marketingInsights.viralityIndicators.slice(0, 5),
      },
      metadata: {
        analyzedAt: analysis.analyzedAt.toISOString(),
        processingTime: startTime ? this.calculateProcessingTime(startTime) : 0,
        version: analysis.analysis.version || '1.0.0',
        method: 'hybrid',
      },
    };

    return this.createSuccessResponse(
      apiResponse,
      'Tweet sentiment analysis completed successfully'
    );
  }

  /**
   * Normaliza etiqueta de sentimiento para API
   */
  private static normalizeSentimentLabel(label: string): 'positive' | 'negative' | 'neutral' {
    const lowerLabel = label.toLowerCase();
    if (lowerLabel.includes('positive')) return 'positive';
    if (lowerLabel.includes('negative')) return 'negative';
    return 'neutral';
  }
}

/**
 * Mapper para análisis de lote
 */
export class BatchAnalysisAPIMapper extends BaseAPIMapper {
  /**
   * Convierte lote de análisis a respuesta de API
   */
  static map(
    tweets: Tweet[],
    analyses: TweetSentimentAnalysis[],
    startTime?: Date
  ): APIResponse<BatchAnalysisAPIResponse> {
    if (!tweets || !analyses || tweets.length !== analyses.length) {
      throw SentimentErrors.invalidBatch(analyses?.length || 0);
    }

    // Convertir cada análisis individual
    const results = tweets.map((tweet, index) => {
      const singleResponse = TweetAnalysisAPIMapper.map(tweet, analyses[index]);
      return singleResponse.data;
    });

    // Calcular estadísticas del lote
    const summary = this.calculateBatchSummary(analyses, startTime);

    const batchResponse: BatchAnalysisAPIResponse = {
      results,
      summary,
      metadata: {
        batchId: this.generateBatchId(),
        processedAt: new Date().toISOString(),
        version: '1.0.0',
      },
    };

    return this.createSuccessResponse(
      batchResponse,
      `Batch analysis completed for ${analyses.length} tweets`,
      {
        total: analyses.length,
        processingTime: summary.processingTime,
      }
    );
  }

  /**
   * Calcula estadísticas del lote
   */
  private static calculateBatchSummary(analyses: TweetSentimentAnalysis[], startTime?: Date) {
    const totalProcessed = analyses.length;
    const sentimentScores = analyses.map((a) => a.analysis.sentiment.score);
    const averageSentiment =
      sentimentScores.reduce((sum, score) => sum + score, 0) / totalProcessed;

    // Distribución de sentimientos
    const sentimentDistribution = analyses.reduce(
      (dist, analysis) => {
        const label = this.normalizeSentimentLabel(analysis.analysis.sentiment.label);
        dist[label]++;
        return dist;
      },
      { positive: 0, negative: 0, neutral: 0 }
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
        avgSentiment: Math.round((data.totalSentiment / data.frequency) * 1000) / 1000,
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10);

    return {
      totalProcessed,
      averageSentiment: Math.round(averageSentiment * 1000) / 1000,
      sentimentDistribution,
      topKeywords,
      processingTime: startTime ? this.calculateProcessingTime(startTime) : 0,
    };
  }

  /**
   * Normaliza etiqueta de sentimiento
   */
  private static normalizeSentimentLabel(label: string): 'positive' | 'negative' | 'neutral' {
    const lowerLabel = label.toLowerCase();
    if (lowerLabel.includes('positive')) return 'positive';
    if (lowerLabel.includes('negative')) return 'negative';
    return 'neutral';
  }

  /**
   * Genera ID único para el lote
   */
  private static generateBatchId(): string {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Mapper para estadísticas de análisis
 */
export class StatsAPIMapper extends BaseAPIMapper {
  /**
   * Convierte estadísticas a respuesta de API
   */
  static map(stats: any): APIResponse<any> {
    const sanitizedStats = this.sanitizeForAPI(stats);

    return this.createSuccessResponse(
      sanitizedStats,
      'Sentiment analysis statistics retrieved successfully'
    );
  }
}

/**
 * Mapper para respuestas de comparación de métodos
 */
export class ComparisonAPIMapper extends BaseAPIMapper {
  /**
   * Convierte resultado de comparación a respuesta de API
   */
  static map(comparison: any, text: string): APIResponse<any> {
    const apiResponse = {
      text: text.length > 100 ? text.substring(0, 100) + '...' : text,
      methods: {
        rule: {
          label: comparison.rule?.label || 'neutral',
          confidence: Math.round((comparison.rule?.confidence || 0) * 1000) / 1000,
          score: Math.round((comparison.rule?.score || 0) * 1000) / 1000,
        },
        naive: {
          label: comparison.naive?.label || 'neutral',
          confidence: Math.round((comparison.naive?.confidence || 0) * 1000) / 1000,
          score: Math.round((comparison.naive?.score || 0) * 1000) / 1000,
        },
        unified: {
          label: comparison.unified?.label || 'neutral',
          confidence: Math.round((comparison.unified?.confidence || 0) * 1000) / 1000,
          score: Math.round((comparison.unified?.score || 0) * 1000) / 1000,
        },
      },
      recommendation: this.generateRecommendation(comparison),
      metadata: {
        analyzedAt: new Date().toISOString(),
        version: '1.0.0',
      },
    };

    return this.createSuccessResponse(
      apiResponse,
      'Sentiment method comparison completed successfully'
    );
  }

  /**
   * Genera recomendación basada en la comparación
   */
  private static generateRecommendation(comparison: any): string {
    const methods = ['rule', 'naive', 'unified'];
    const confidences = methods.map((method) => comparison[method]?.confidence || 0);
    const maxConfidence = Math.max(...confidences);
    const bestMethod = methods[confidences.indexOf(maxConfidence)];

    if (maxConfidence > 0.8) {
      return `High confidence result. Recommended method: ${bestMethod}`;
    } else if (maxConfidence > 0.6) {
      return `Moderate confidence result. Consider using ${bestMethod} or combined approach`;
    } else {
      return 'Low confidence across all methods. Consider human review or additional context';
    }
  }
}

/**
 * Utilidades para mappers de API
 */
export class APIMapperUtils {
  /**
   * Valida parámetros de paginación
   */
  static validatePagination(page?: number, limit?: number) {
    const validatedPage = Math.max(1, page || 1);
    const validatedLimit = Math.min(100, Math.max(1, limit || 20));

    return { page: validatedPage, limit: validatedLimit };
  }

  /**
   * Crea metadatos de paginación
   */
  static createPaginationMeta(page: number, limit: number, total: number) {
    const totalPages = Math.ceil(total / limit);

    return {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  /**
   * Formatea números para API (limita decimales)
   */
  static formatNumber(num: number, decimals: number = 3): number {
    return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
  }

  /**
   * Valida y sanitiza texto para respuesta
   */
  static sanitizeText(text: string, maxLength: number = 500): string {
    if (!text) return '';

    const cleaned = text.replace(/[\x00-\x1F\x7F]/g, ''); // Remover caracteres de control
    return cleaned.length > maxLength ? cleaned.substring(0, maxLength) + '...' : cleaned;
  }

  /**
   * Genera hash para cache de respuestas
   */
  static generateCacheKey(data: any): string {
    const str = typeof data === 'string' ? data : JSON.stringify(data);
    let hash = 0;

    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return Math.abs(hash).toString(36);
  }
}
