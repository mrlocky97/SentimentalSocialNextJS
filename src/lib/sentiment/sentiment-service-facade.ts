/**
 * Sentiment Service Facade
 * 
 * 🛠️ REFACTORING: Facade pattern para mantener compatibility con SentimentService legacy
 * 
 * Este facade delega todas las operaciones al SentimentAnalysisOrchestrator unificado,
 * manteniendo la API existente sin cambios mientras consolidamos la lógica interna.
 * 
 * @deprecated Use SentimentAnalysisOrchestrator directly for new code
 * @compatibility Mantiene API de SentimentService para código legacy
 */

import { Language } from "../../enums/sentiment.enum";
import { SentimentResult, TextAnalysis, TweetSentimentAnalysis } from "../../types/sentiment";
import { Tweet } from "../../types/twitter";
import { features } from "../config/feature-flags";
import { logger } from "../observability/logger";
import { SentimentAnalysisOrchestrator } from "../sentiment/orchestrator";

export class SentimentServiceFacade {
  private orchestrator: SentimentAnalysisOrchestrator;

  constructor() {
    this.orchestrator = new SentimentAnalysisOrchestrator();
    logger.info("SentimentServiceFacade initialized", {
      useUnifiedOrchestrator: features.USE_UNIFIED_SENTIMENT_ORCHESTRATOR,
      legacyServicesEnabled: features.ENABLE_LEGACY_SENTIMENT_SERVICES
    });
  }

  /**
   * @deprecated Use orchestrator.analyzeTweetWithResponse instead
   */
  async analyzeTweet(tweet: Tweet, _config?: Record<string, unknown>): Promise<TweetSentimentAnalysis> {
    if (features.USE_UNIFIED_SENTIMENT_ORCHESTRATOR) {
      logger.debug("Using unified orchestrator for tweet analysis");
      
      const response = await this.orchestrator.analyzeTweetWithResponse(tweet, false);
      
      // Map unified response back to legacy format
      const sentimentResult: SentimentResult = {
        label: response.data.sentiment.label,
        score: response.data.sentiment.score,
        confidence: response.data.sentiment.confidence,
        magnitude: Math.abs(response.data.sentiment.score) // Calculate magnitude from score
      };

      const analysis: TextAnalysis = {
        sentiment: sentimentResult,
        keywords: response.data.keywords || [],
        language: this.mapLanguageCode(response.data.language || 'en'),
        entities: [] // Empty for now, can be enhanced later
      };

      return {
        tweetId: tweet.tweetId || tweet.id || 'unknown',
        content: tweet.content || '',
        analysis,
        brandMentions: [],
        hashtagSentiments: [],
        influenceScore: 0,
        marketingInsights: [],
        analyzedAt: new Date()
      };
    } else {
      logger.warn("Legacy sentiment services disabled but USE_UNIFIED_SENTIMENT_ORCHESTRATOR is false");
      throw new Error("No sentiment analysis service available");
    }
  }

  /**
   * @deprecated Use orchestrator.analyzeTweetsBatchWithResponse instead
   */
  async analyzeTweetsBatch(
    tweets: Tweet[],
    _config?: Record<string, unknown>,
    includeStats = true,
  ): Promise<{
    analyses: TweetSentimentAnalysis[];
    statistics?: any;
  }> {
    if (features.USE_UNIFIED_SENTIMENT_ORCHESTRATOR) {
      logger.debug("Using unified orchestrator for batch analysis", {
        tweetCount: tweets.length,
        includeStats
      });

      const response = await this.orchestrator.analyzeTweetsBatchWithResponse(tweets, false);
      
      const analyses: TweetSentimentAnalysis[] = response.data.results.map((result: any, index: number) => {
        const tweet = tweets[index];
        const sentimentResult: SentimentResult = {
          label: result.sentiment.label,
          score: result.sentiment.score,
          confidence: result.sentiment.confidence,
          magnitude: Math.abs(result.sentiment.score)
        };

        const analysis: TextAnalysis = {
          sentiment: sentimentResult,
          keywords: result.keywords || [],
          language: this.mapLanguageCode(result.language || 'en'),
          entities: []
        };

        return {
          tweetId: result.tweetId,
          content: tweet.content || '',
          analysis,
          brandMentions: [],
          hashtagSentiments: [],
          influenceScore: 0,
          marketingInsights: [],
          analyzedAt: new Date()
        };
      });

      const result: any = { analyses };

      if (includeStats && response.data.summary) {
        result.statistics = this.generateStatistics(analyses);
      }

      return result;
    } else {
      logger.warn("Legacy sentiment services disabled but USE_UNIFIED_SENTIMENT_ORCHESTRATOR is false");
      throw new Error("No sentiment analysis service available");
    }
  }

  /**
   * @deprecated Use orchestrator.analyzeTextWithResponse instead
   */
  async testSentimentAnalysis({ text, method }: { text: string; method?: string }): Promise<any> {
    if (features.USE_UNIFIED_SENTIMENT_ORCHESTRATOR) {
      logger.debug("Using unified orchestrator for text analysis", { method });
      
      const response = await this.orchestrator.analyzeTextWithResponse(text, {
        language: 'en',
        allowSarcasmDetection: true,
        allowContextWindow: true
      });

      // Map to legacy format
      return {
        text,
        method: method || 'unified-orchestrator',
        label: response.data.sentiment.label,
        confidence: response.data.sentiment.confidence,
        score: response.data.sentiment.score,
        language: response.data.language,
        keywords: response.data.keywords,
        signals: response.data.signals,
        version: response.data.version,
        processingTime: response.meta?.processingTime
      };
    } else {
      logger.warn("Legacy sentiment services disabled but USE_UNIFIED_SENTIMENT_ORCHESTRATOR is false");
      throw new Error("No sentiment analysis service available");
    }
  }

  /**
   * Map LanguageCode to Language enum
   */
  private mapLanguageCode(languageCode: string): Language {
    switch (languageCode) {
      case 'en': return Language.ENGLISH;
      case 'es': return Language.SPANISH;
      case 'fr': return Language.FRENCH;
      case 'de': return Language.GERMAN;
      default: return Language.ENGLISH;
    }
  }

  /**
   * Generate statistics from analyses - Simple implementation
   */
  generateStatistics(analyses: TweetSentimentAnalysis[]): any {
    const sentimentCounts = {
      positive: 0,
      negative: 0,
      neutral: 0
    };

    let totalScore = 0;
    let totalConfidence = 0;

    analyses.forEach(analysis => {
      const sentiment = analysis.analysis.sentiment.label;
      if (sentiment === 'positive') sentimentCounts.positive++;
      else if (sentiment === 'negative') sentimentCounts.negative++;
      else sentimentCounts.neutral++;

      totalScore += analysis.analysis.sentiment.score;
      totalConfidence += analysis.analysis.sentiment.confidence;
    });

    return {
      totalAnalyses: analyses.length,
      sentimentDistribution: sentimentCounts,
      averageSentiment: analyses.length > 0 ? totalScore / analyses.length : 0,
      averageConfidence: analyses.length > 0 ? totalConfidence / analyses.length : 0,
      generatedAt: new Date().toISOString(),
      method: 'unified-facade'
    };
  }

  /**
   * Get demo analysis - Simple implementation
   */
  async getDemoAnalysis(): Promise<any> {
    const demoTexts = [
      "I love this product! It's amazing!",
      "This is okay, nothing special.",
      "I hate this, it's terrible!",
      "¡Me encanta este producto! Es increíble!",
      "This product is fine, I guess 🤷‍♂️"
    ];

    const results = await Promise.all(
      demoTexts.map(text => this.testSentimentAnalysis({ text, method: 'demo' }))
    );

    return {
      examples: results,
      summary: {
        totalExamples: results.length,
        multiLanguage: true,
        methods: ['unified-orchestrator'],
        generatedAt: new Date().toISOString()
      }
    };
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.orchestrator.dispose();
    logger.info("SentimentServiceFacade disposed");
  }
}

// Export singleton instance for compatibility
export const sentimentServiceFacade = new SentimentServiceFacade();