/**
 * 🚨 DEPRECATED SERVICE - Legacy Compatibility Layer
 *
 * Este servicio está oficialmente deprecado y será eliminado en futuras versiones.
 *
 * 🛠️ REFACTORING: Este servicio ahora usa SentimentServiceFacade internamente
 * que delega al SentimentAnalysisOrchestrator unificado.
 *
 * 📋 MIGRATION GUIDE:
 * ❌ sentimentService.analyzeTweet(tweet)
 * ✅ getOrchestrator().analyzeTweetWithResponse(tweet)
 *
 * ❌ sentimentService.analyzeTweetsBatch(tweets)
 * ✅ getOrchestrator().analyzeTweetsBatchWithResponse(tweets)
 *
 * ❌ sentimentService.testSentimentAnalysis({text, method})
 * ✅ getOrchestrator().analyzeTextWithResponse(text, options)
 *
 * @deprecated Use SentimentAnalysisOrchestrator directly via getOrchestrator()
 * @compatibility Esta clase mantiene la API legacy mientras se migra el código
 */

import { features } from '../lib/config/feature-flags';
import { logger } from '../lib/observability/logger';
import { sentimentServiceFacade } from '../lib/sentiment/sentiment-service-facade';
import { SentimentTestRequest } from '../types';
import { TweetSentimentAnalysis } from '../types/sentiment';
import { Tweet } from '../types/twitter';

/**
 * @deprecated Use TweetSentimentAnalysisManager directly
 */
export class SentimentService {
  constructor() {
    logger.warn(
      'SentimentService is deprecated. Use SentimentAnalysisOrchestrator via getOrchestrator() instead.'
    );
  }

  /**
   * @deprecated Use orchestrator.analyzeTweetWithResponse instead
   */
  async analyzeTweet(
    tweet: Tweet,
    config?: Record<string, unknown>
  ): Promise<TweetSentimentAnalysis> {
    logger.warn('SentimentService.analyzeTweet is deprecated', {
      useUnifiedOrchestrator: features.USE_UNIFIED_SENTIMENT_ORCHESTRATOR,
      tweetId: tweet.tweetId || tweet.id,
    });

    return sentimentServiceFacade.analyzeTweet(tweet, config);
  }

  /**
   * @deprecated Use orchestrator.analyzeTweetsBatchWithResponse instead
   */
  async analyzeTweetsBatch(
    tweets: Tweet[],
    config?: Record<string, unknown>,
    includeStats = true
  ): Promise<{
    analyses: TweetSentimentAnalysis[];
    statistics?: any;
  }> {
    logger.warn('SentimentService.analyzeTweetsBatch is deprecated', {
      useUnifiedOrchestrator: features.USE_UNIFIED_SENTIMENT_ORCHESTRATOR,
      tweetCount: tweets.length,
      includeStats,
    });

    return sentimentServiceFacade.analyzeTweetsBatch(tweets, config, includeStats);
  }

  /**
   * @deprecated Use orchestrator.analyzeTextWithResponse instead
   */
  async testSentimentAnalysis({ text, method }: SentimentTestRequest): Promise<any> {
    logger.warn('SentimentService.testSentimentAnalysis is deprecated', {
      useUnifiedOrchestrator: features.USE_UNIFIED_SENTIMENT_ORCHESTRATOR,
      method,
    });

    return sentimentServiceFacade.testSentimentAnalysis({ text, method });
  }

  /**
   * Generate statistics from analyses
   */
  generateStatistics(analyses: TweetSentimentAnalysis[]): any {
    logger.warn('SentimentService.generateStatistics is deprecated');
    return sentimentServiceFacade.generateStatistics(analyses);
  }

  /**
   * Generate sentiment trends - Simple mock implementation
   */
  generateSentimentTrends(analyses: TweetSentimentAnalysis[], intervalHours = 1): any {
    logger.warn('SentimentService.generateSentimentTrends is deprecated');

    // Simple implementation for compatibility
    return {
      trends: analyses.map((analysis, index) => ({
        timestamp: new Date(
          Date.now() - (analyses.length - index) * intervalHours * 60 * 60 * 1000
        ),
        sentiment: analysis.analysis.sentiment.score,
        volume: 1,
        keywords: analysis.analysis.keywords.slice(0, 3),
      })),
      summary: {
        totalPoints: analyses.length,
        intervalHours,
        averageSentiment:
          analyses.reduce((sum, a) => sum + a.analysis.sentiment.score, 0) / analyses.length,
        generatedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Get demo analysis
   */
  async getDemoAnalysis(): Promise<any> {
    logger.warn('SentimentService.getDemoAnalysis is deprecated');
    return sentimentServiceFacade.getDemoAnalysis();
  }

  /**
   * Compare sentiment methods - Simplified implementation
   */
  async compareSentimentMethods({ text }: { text: string }): Promise<any> {
    logger.warn('SentimentService.compareSentimentMethods is deprecated');

    const result = await sentimentServiceFacade.testSentimentAnalysis({ text, method: 'unified' });

    return {
      text,
      methods: {
        rule: {
          sentiment: result.label,
          score: result.score,
          confidence: result.confidence,
        },
        naive: {
          sentiment: result.label,
          confidence: result.confidence,
        },
      },
      comparison: {
        agreement: true, // Always true since we're using the same underlying service
        confidenceDiff: 0,
      },
    };
  }

  /**
   * Advanced compare sentiment methods - Simplified implementation
   */
  async advancedCompareSentimentMethods({ text }: { text: string }): Promise<any> {
    logger.warn('SentimentService.advancedCompareSentimentMethods is deprecated');

    const result = await sentimentServiceFacade.testSentimentAnalysis({ text, method: 'unified' });

    const hasNegation = /\b(not|no|never|don't|won't|can't|isn't|aren't)\b/i.test(text);
    const hasIntensifiers = /\b(very|really|extremely|absolutely|totally)\b/i.test(text);
    const hasSarcasm = /\b(yeah right|sure|obviously|great job)\b/i.test(text);

    return {
      text,
      methods: {
        rule: {
          sentiment: result.label,
          score: result.score,
          confidence: result.confidence,
        },
        naive: {
          sentiment: result.label,
          confidence: result.confidence,
        },
        advanced: {
          sentiment: result.label,
          confidence: result.confidence,
          adjustments: {
            negation: hasNegation,
            intensifiers: hasIntensifiers,
            sarcasm: hasSarcasm,
          },
        },
      },
      analysis: {
        agreement: true,
        confidenceDiff: 0,
        textFeatures: {
          length: text.length,
          wordCount: text.split(' ').length,
          hasNegation,
          hasIntensifiers,
          hasSarcasm,
        },
      },
    };
  }

  /**
   * Analyze text with multi-language support - Simplified implementation
   */
  async analyzeTextWithLanguage(text: string, language = 'en'): Promise<any> {
    logger.warn('SentimentService.analyzeTextWithLanguage is deprecated');

    const result = await sentimentServiceFacade.testSentimentAnalysis({ text, method: 'unified' });

    return {
      ...result,
      detectedLanguage: language,
      languageConfidence: 0.95,
      multilingual: true,
    };
  }

  /**
   * Legacy model update - Not implemented in unified architecture
   */
  async updateModel(_updateRequest: any): Promise<any> {
    logger.warn(
      'SentimentService.updateModel is deprecated and not supported in unified architecture'
    );
    throw new Error(
      'Model update not supported. Use SentimentAnalysisOrchestrator training methods instead.'
    );
  }

  /**
   * Evaluate accuracy - Not implemented in unified architecture
   */
  async evaluateAccuracy(_evaluationRequest: any): Promise<any> {
    logger.warn(
      'SentimentService.evaluateAccuracy is deprecated and not supported in unified architecture'
    );
    throw new Error(
      'Accuracy evaluation not supported. Use SentimentAnalysisOrchestrator evaluation methods instead.'
    );
  }

  /**
   * Get model status - Simplified implementation
   */
  async getModelStatus(): Promise<any> {
    logger.warn('SentimentService.getModelStatus is deprecated');
    return {
      model: { exists: false, size: 0, lastModified: null },
      accuracy: { overall: 0 },
      message: 'Model status not available in unified architecture',
    };
  }
}

// Export singleton instance for backward compatibility
export const sentimentService = new SentimentService();
