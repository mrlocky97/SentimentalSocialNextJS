/**
 * Tweet Data Mappers
 * Mappers especializados para transformaciones de datos de tweets
 */

import { Label } from '../../enums/sentiment.enum';
import { TweetDTO } from '../../lib/sentiment/types';
import { Tweet } from '../../types/twitter';
import { SentimentErrors } from '../errors';

/**
 * Mapper base para tweets
 */
export abstract class BaseTweetMapper {
  /**
   * Valida un tweet antes de mapear
   */
  protected static validateTweet(tweet: any): void {
    if (!tweet) {
      throw SentimentErrors.invalidTweet({ reason: 'Tweet is null or undefined' });
    }

    if (!tweet.content && !tweet.text) {
      throw SentimentErrors.invalidTweet({
        reason: 'Tweet must have content or text field',
        provided: Object.keys(tweet),
      });
    }

    if ((!tweet.id && !tweet.tweetId) || (tweet.id === '' && tweet.tweetId === '')) {
      throw SentimentErrors.invalidTweet({
        reason: 'Tweet must have a valid ID',
        provided: { id: tweet.id, tweetId: tweet.tweetId },
      });
    }
  }

  /**
   * Valida un lote de tweets
   */
  protected static validateTweetBatch(tweets: any[]): void {
    if (!Array.isArray(tweets)) {
      throw SentimentErrors.invalidBatch(0);
    }

    if (tweets.length === 0) {
      throw SentimentErrors.invalidBatch(0);
    }

    if (tweets.length > 100) {
      throw SentimentErrors.invalidBatch(tweets.length);
    }

    // Validar cada tweet individualmente
    tweets.forEach((tweet, index) => {
      try {
        BaseTweetMapper.validateTweet(tweet);
      } catch (error) {
        throw SentimentErrors.invalidTweet({
          batchIndex: index,
          originalError: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });
  }
}

/**
 * Mapper para convertir Tweet a TweetDTO
 */
export class TweetToTweetDTOMapper extends BaseTweetMapper {
  /**
   * Convierte un Tweet al formato TweetDTO para el motor de análisis
   */
  static map(tweet: Tweet): TweetDTO {
    this.validateTweet(tweet);

    return {
      id: tweet.id || tweet.tweetId || '',
      text: tweet.content || (tweet.text as string) || '',
      language: this.detectLanguage(tweet),
    };
  }

  /**
   * Convierte un lote de Tweets al formato TweetDTO
   */
  static mapBatch(tweets: Tweet[]): TweetDTO[] {
    this.validateTweetBatch(tweets);
    return tweets.map((tweet) => this.map(tweet));
  }

  /**
   * Crea un tweet mock para testing
   */
  static createMockTweet(text: string, language: 'en' | 'es' | 'fr' | 'de' = 'en'): Tweet {
    const timestamp = new Date();
    const mockId = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
      id: mockId,
      tweetId: mockId,
      content: text,
      text: text,
      author: {
        id: 'mock_user',
        username: 'mockuser',
        displayName: 'Mock User',
        verified: false,
        followersCount: 100,
        followingCount: 50,
        tweetsCount: 10,
        avatar: '',
      },
      metrics: {
        likes: 0,
        retweets: 0,
        replies: 0,
        quotes: 0,
        views: 0,
        engagement: 0,
      },
      hashtags: [],
      mentions: [],
      urls: [],
      mediaUrls: [],
      isRetweet: false,
      isReply: false,
      isQuote: false,
      language,
      createdAt: timestamp,
      scrapedAt: timestamp,
      updatedAt: timestamp,
    };
  }

  /**
   * Detecta el idioma del tweet
   */
  private static detectLanguage(tweet: Tweet): 'en' | 'es' | 'fr' | 'de' | 'unknown' {
    // Si ya tiene idioma especificado
    if (tweet.language) {
      const lang = tweet.language.toLowerCase();
      if (['en', 'es', 'fr', 'de'].includes(lang)) {
        return lang as 'en' | 'es' | 'fr' | 'de';
      }
    }

    // Detección básica por contenido
    const text = (tweet.content || tweet.text || '').toLowerCase();

    // Palabras comunes en español
    const spanishWords = [
      'el',
      'la',
      'de',
      'que',
      'y',
      'en',
      'un',
      'es',
      'se',
      'no',
      'te',
      'lo',
      'le',
      'da',
      'su',
      'por',
      'son',
      'con',
      'para',
      'está',
    ];
    const spanishCount = spanishWords.filter(
      (word) =>
        text.includes(` ${word} `) || text.startsWith(`${word} `) || text.endsWith(` ${word}`)
    ).length;

    // Palabras comunes en inglés
    const englishWords = [
      'the',
      'of',
      'and',
      'to',
      'in',
      'is',
      'you',
      'that',
      'it',
      'he',
      'was',
      'for',
      'on',
      'are',
      'as',
      'with',
      'his',
      'they',
      'i',
    ];
    const englishCount = englishWords.filter(
      (word) =>
        text.includes(` ${word} `) || text.startsWith(`${word} `) || text.endsWith(` ${word}`)
    ).length;

    if (spanishCount > englishCount && spanishCount > 0) {
      return 'es';
    } else if (englishCount > 0) {
      return 'en';
    }

    return 'unknown';
  }
}

/**
 * Mapper para normalizar tweets
 */
export class TweetNormalizationMapper extends BaseTweetMapper {
  /**
   * Normaliza un tweet para garantizar compatibilidad con ambos sistemas
   */
  static map(tweet: any): Tweet {
    // Validación menos estricta para normalización
    if (!tweet) {
      throw SentimentErrors.invalidTweet({ reason: 'Tweet is null or undefined' });
    }

    return {
      id: tweet.id || tweet.tweetId || this.generateId(),
      tweetId: tweet.tweetId || tweet.id || this.generateId(),
      content: tweet.content || tweet.text || '',
      text: tweet.text || tweet.content || '',
      author: this.normalizeAuthor(tweet.author),
      metrics: this.normalizeMetrics(tweet.metrics),
      hashtags: Array.isArray(tweet.hashtags) ? tweet.hashtags : [],
      mentions: Array.isArray(tweet.mentions) ? tweet.mentions : [],
      urls: Array.isArray(tweet.urls) ? tweet.urls : [],
      mediaUrls: Array.isArray(tweet.mediaUrls) ? tweet.mediaUrls : [],
      isRetweet: Boolean(tweet.isRetweet),
      isReply: Boolean(tweet.isReply),
      isQuote: Boolean(tweet.isQuote),
      language: tweet.language || 'unknown',
      scrapedAt: tweet.scrapedAt ? new Date(tweet.scrapedAt) : new Date(),
      createdAt: tweet.createdAt ? new Date(tweet.createdAt) : new Date(),
      updatedAt: tweet.updatedAt ? new Date(tweet.updatedAt) : new Date(),
      ...this.extractAdditionalFields(tweet),
    };
  }

  /**
   * Normaliza un lote de tweets
   */
  static mapBatch(tweets: any[]): Tweet[] {
    if (!Array.isArray(tweets)) {
      return [];
    }
    return tweets.map((tweet) => this.map(tweet));
  }

  /**
   * Normaliza información del autor
   */
  private static normalizeAuthor(author: any) {
    return {
      id: author?.id || '',
      username: author?.username || '',
      displayName: author?.displayName || author?.name || '',
      verified: Boolean(author?.verified),
      followersCount: Number(author?.followersCount) || 0,
      followingCount: Number(author?.followingCount) || 0,
      tweetsCount: Number(author?.tweetsCount) || 0,
      avatar: author?.avatar || author?.profileImageUrl || '',
      ...author,
    };
  }

  /**
   * Normaliza métricas del tweet
   */
  private static normalizeMetrics(metrics: any) {
    return {
      likes: Number(metrics?.likes) || 0,
      retweets: Number(metrics?.retweets) || 0,
      replies: Number(metrics?.replies) || 0,
      quotes: Number(metrics?.quotes) || 0,
      views: Number(metrics?.views) || 0,
      engagement: Number(metrics?.engagement) || 0,
      ...metrics,
    };
  }

  /**
   * Extrae campos adicionales manteniendo retrocompatibilidad
   */
  private static extractAdditionalFields(tweet: any) {
    const additionalFields: any = {};

    // Campos de sentiment si existen
    if (tweet.sentiment) {
      additionalFields.sentiment = tweet.sentiment;
    }

    // Campos de ubicación si existen
    if (tweet.location) {
      additionalFields.location = tweet.location;
    }

    // Campos de engagement calculado
    if (tweet.engagementRate) {
      additionalFields.engagementRate = tweet.engagementRate;
    }

    return additionalFields;
  }

  /**
   * Genera un ID único para tweets sin ID
   */
  private static generateId(): string {
    return `tweet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Mapper para tweets con análisis de sentimiento
 */
export class TweetSentimentMapper extends BaseTweetMapper {
  /**
   * Enriquece un tweet con información de análisis de sentimiento
   */
  static enrichWithSentiment(tweet: Tweet, analysis: any): Tweet {
    this.validateTweet(tweet);

    if (!analysis || !analysis.analysis) {
      throw SentimentErrors.analysisFailed(tweet.content, new Error('Invalid analysis result'));
    }

    const sentimentLabel = this.normalizeSentimentLabel(analysis.analysis.sentiment.label);

    return {
      ...tweet,
      sentiment: {
        score: analysis.analysis.sentiment.score || 0,
        magnitude: analysis.analysis.sentiment.magnitude || 0,
        label: sentimentLabel,
        confidence: analysis.analysis.sentiment.confidence || 0,
        emotions: analysis.analysis.sentiment.emotions || undefined,
        keywords: analysis.analysis.keywords || [],
        analyzedAt: analysis.analyzedAt || new Date(),
        processingTime: analysis.analyzedAt ? Date.now() - analysis.analyzedAt.getTime() : 0,
      },
    };
  }

  /**
   * Enriquece un lote de tweets con análisis
   */
  static enrichBatchWithSentiment(tweets: Tweet[], analyses: any[]): Tweet[] {
    if (tweets.length !== analyses.length) {
      throw SentimentErrors.invalidBatch(analyses.length);
    }

    return tweets.map((tweet, index) => this.enrichWithSentiment(tweet, analyses[index]));
  }

  /**
   * Normaliza etiquetas de sentimiento para compatibilidad
   */
  private static normalizeSentimentLabel(label: string): Label {
    const lowerLabel = label.toLowerCase();

    if (lowerLabel.includes('positive')) {
      return Label.POSITIVE;
    } else if (lowerLabel.includes('negative')) {
      return Label.NEGATIVE;
    } else {
      return Label.NEUTRAL;
    }
  }
}

/**
 * Utilities para mappers de tweets
 */
export class TweetMapperUtils {
  /**
   * Extrae texto limpio de un tweet
   */
  static extractCleanText(tweet: Tweet): string {
    const text = tweet.content || tweet.text || '';

    // Remover URLs
    let cleanText = text.replace(/https?:\/\/[^\s]+/gi, '');

    // Remover menciones excesivas (mantener solo las primeras 3)
    const mentions = text.match(/@\w+/g) || [];
    if (mentions.length > 3) {
      mentions.slice(3).forEach((mention) => {
        cleanText = cleanText.replace(mention, '');
      });
    }

    // Remover hashtags excesivos (mantener solo los primeros 5)
    const hashtags = text.match(/#\w+/g) || [];
    if (hashtags.length > 5) {
      hashtags.slice(5).forEach((hashtag) => {
        cleanText = cleanText.replace(hashtag, '');
      });
    }

    // Limpiar espacios extra
    return cleanText.replace(/\s+/g, ' ').trim();
  }

  /**
   * Calcula engagement score básico
   */
  static calculateEngagementScore(tweet: Tweet): number {
    const metrics = tweet.metrics;
    const followers = tweet.author.followersCount || 1;

    const totalEngagement = metrics.likes + metrics.retweets + metrics.replies;
    return totalEngagement / Math.max(followers, 1);
  }

  /**
   * Determina si un tweet es spam
   */
  static isSpam(tweet: Tweet): boolean {
    const text = tweet.content || tweet.text || '';

    // Demasiados hashtags
    const hashtagCount = (text.match(/#/g) || []).length;
    if (hashtagCount > 10) return true;

    // Demasiadas menciones
    const mentionCount = (text.match(/@/g) || []).length;
    if (mentionCount > 5) return true;

    // Demasiadas URLs
    const urlCount = (text.match(/https?:\/\//g) || []).length;
    if (urlCount > 3) return true;

    // Texto repetitivo
    const words = text.toLowerCase().split(/\s+/);
    const uniqueWords = new Set(words);
    if (words.length > 10 && uniqueWords.size / words.length < 0.5) return true;

    return false;
  }

  /**
   * Extrae métricas de calidad del tweet
   */
  static extractQualityMetrics(tweet: Tweet) {
    const text = this.extractCleanText(tweet);

    return {
      textLength: text.length,
      wordCount: text.split(/\s+/).length,
      hasMedia: (tweet.mediaUrls || []).length > 0,
      hasUrls: (tweet.urls || []).length > 0,
      hashtagCount: (tweet.hashtags || []).length,
      mentionCount: (tweet.mentions || []).length,
      engagementScore: this.calculateEngagementScore(tweet),
      isSpam: this.isSpam(tweet),
      authorVerified: tweet.author.verified,
      authorFollowers: tweet.author.followersCount,
    };
  }
}
