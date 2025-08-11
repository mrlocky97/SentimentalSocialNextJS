/**
 * Tweet Sentiment Analysis Manager Service - Optimized
 * Motor unificado para análisis de sentimiento con manejo centralizado de errores
 */

import { Core } from '../core';
import { SentimentAnalysisOrchestrator } from '../lib/sentiment/orchestrator';
import { TweetSentimentAnalysis } from '../lib/sentiment/types';
import { Tweet } from '../types/twitter';

export class TweetSentimentAnalysisManager {
  private orchestrator: SentimentAnalysisOrchestrator;

  constructor() {
    this.orchestrator = new SentimentAnalysisOrchestrator();
  }

  /**
   * Analiza el sentimiento de un tweet individual
   */
  async analyzeTweet(tweet: Tweet, config?: any): Promise<TweetSentimentAnalysis> {
    // Validar entrada
    const validation = Core.Validators.Tweet.validate(tweet);
    Core.Validators.Utils.validateOrThrow(validation, 'tweet analysis');

    // Adaptamos la interfaz del orquestador a nuestro formato usando el mapper
    const tweetDTO = Core.Mappers.Tweet.map(tweet);

    try {
      const result = await this.orchestrator.analyzeText(tweetDTO);

      // Convertimos el resultado a TweetSentimentAnalysis usando el mapper
      return Core.Mappers.SentimentAnalysis.map(tweet, result, {
        includeMarketingInsights: true,
        includeBrandMentions: true,
        brandKeywords: config?.brandKeywords || [],
      });
    } catch (error) {
      throw Core.Errors.analysisFailed(
        tweet.content || tweet.text || '',
        error instanceof Error ? error : new Error('Unknown analysis error')
      );
    }
  }

  /**
   * Analiza el sentimiento de múltiples tweets en lote con validación centralizada
   */
  async analyzeTweetsBatch(tweets: Tweet[], config?: any): Promise<TweetSentimentAnalysis[]> {
    // Validar entrada del lote
    const validation = Core.Validators.Tweet.validateBatch(tweets);
    Core.Validators.Utils.validateOrThrow(validation, 'batch analysis');

    const results: TweetSentimentAnalysis[] = [];

    try {
      for (const tweet of tweets) {
        const analysis = await this.analyzeTweet(tweet, config);
        results.push(analysis);
      }
      return results;
    } catch (error) {
      throw Core.Errors.modelProcessingError(
        'batch analysis',
        error instanceof Error ? error : new Error('Unknown batch processing error')
      );
    }
  }

  /**
   * Genera estadísticas a partir de análisis de tweets
   */
  generateStatistics(analyses: TweetSentimentAnalysis[]) {
    // Implementación básica de estadísticas
    const totalAnalyses = analyses.length;
    const sentimentCounts = {
      positive: 0,
      negative: 0,
      neutral: 0,
    };

    analyses.forEach((analysis) => {
      const label = analysis.analysis.sentiment.label;
      if (label === 'positive' || label === 'very_positive') {
        sentimentCounts.positive++;
      } else if (label === 'negative' || label === 'very_negative') {
        sentimentCounts.negative++;
      } else {
        sentimentCounts.neutral++;
      }
    });

    return {
      totalAnalyses,
      sentimentCounts,
      averageSentiment:
        analyses.reduce((sum, a) => sum + a.analysis.sentiment.score, 0) / totalAnalyses,
    };
  }

  /**
   * Genera tendencias de sentimiento a lo largo del tiempo
   */
  generateSentimentTrends(analyses: TweetSentimentAnalysis[], intervalHours: number = 1) {
    // Implementación básica de tendencias
    return {
      trends: [],
      intervalHours,
      totalDataPoints: 0,
    };
  }

  /**
   * Predicción usando Naive Bayes
   */
  predictNaiveBayes(text: string) {
    // Implementación básica - análisis de sentimiento simple
    const lowerText = text.toLowerCase();
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'love', 'best', 'perfect'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'worst', 'horrible', 'disgusting'];

    const positiveCount = positiveWords.filter((word) => lowerText.includes(word)).length;
    const negativeCount = negativeWords.filter((word) => lowerText.includes(word)).length;

    if (positiveCount > negativeCount) {
      return {
        label: 'positive' as const,
        confidence: 0.7,
        score: 0.7,
      };
    } else if (negativeCount > positiveCount) {
      return {
        label: 'negative' as const,
        confidence: 0.7,
        score: -0.7,
      };
    } else {
      return {
        label: 'neutral' as const,
        confidence: 0.5,
        score: 0,
      };
    }
  }

  /**
   * Entrena el modelo Naive Bayes
   */
  async trainNaiveBayes(trainingData: Array<{ text: string; label: string }>) {
    // Implementación futura
    console.log('Training with', trainingData.length, 'examples');
    return Promise.resolve();
  }

  /**
   * Guarda el modelo Naive Bayes en archivo
   */
  async saveNaiveBayesToFile(filePath: string) {
    // Implementación futura
    console.log('Saving model to', filePath);
    return Promise.resolve();
  }
}

// Instancia singleton exportada
export const tweetSentimentAnalysisManager = new TweetSentimentAnalysisManager();
