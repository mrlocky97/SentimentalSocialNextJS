/**
 * Tweet Sentiment Analysis Manager Service - Optimized
 * Motor unificado para análisis de sentimiento con manejo centralizado de errores
 */

import { Core } from "../core";
import { logger } from "../lib/observability/logger";
import { defaultMetrics, metricsRegistry } from "../lib/observability/metrics";
import { SentimentAnalysisOrchestrator } from "../lib/sentiment/orchestrator";
import { TweetSentimentAnalysis } from "../lib/sentiment/types";
import { Tweet } from "../types/twitter";
import type {
  NaiveBayesTrainingExample,
  SentimentLabel,
} from "./naive-bayes-sentiment.service";

export class TweetSentimentAnalysisManager {
  private orchestrator: SentimentAnalysisOrchestrator;

  constructor() {
    this.orchestrator = new SentimentAnalysisOrchestrator();
  }

  /**
   * Analiza el sentimiento de un tweet individual con validación centralizada
   */
  async analyzeTweet(
    tweet: Tweet,
    config?: { brandKeywords?: string[] },
  ): Promise<TweetSentimentAnalysis> {
    // Manejo especial para tweets vacíos - retorna resultado neutral en lugar de lanzar error
    const content = tweet.content || tweet.text || "";
    if (!content.trim()) {
      // Para tweets vacíos, devolvemos un análisis neutral básico
      const neutralResult: TweetSentimentAnalysis = {
        tweetId: tweet.id || tweet.tweetId || "empty-tweet",
        analysis: {
          sentiment: {
            score: 0,
            label: "neutral",
            confidence: 1.0,
            magnitude: 0,
            emotions: {
              joy: 0,
              sadness: 0,
              anger: 0,
              fear: 0,
              surprise: 0,
              disgust: 0,
            },
          },
          language: "en", // Default language for empty tweets
          keywords: [],
          signals: {
            tokens: [],
            ngrams: {},
            emojis: {},
            negationFlips: 0,
            intensifierBoost: 0,
            sarcasmScore: 0,
          },
          version: "1.0.0",
        },
        brandMentions: [],
        marketingInsights: {
          engagementPotential: 0,
          viralityIndicators: [],
          targetDemographics: [],
          trendAlignment: 0,
          brandRisk: "low",
          opportunityScore: 0,
        },
        analyzedAt: new Date(),
      };
      return neutralResult;
    }

    // Validar entrada para tweets con contenido
    const validation = Core.Validators.Tweet.validate(tweet);
    Core.Validators.Utils.validateOrThrow(validation, "tweet analysis");

    // Adaptamos la interfaz del orquestador a nuestro formato usando el mapper
    const tweetDTO = Core.Mappers.Tweet.map(tweet);

    try {
      const start = Date.now();
      const result = await this.orchestrator.analyzeText(tweetDTO);
      const duration = Date.now() - start;

      // Update metrics
      try {
        const totalMetric = metricsRegistry.getMetric(
          "sentiment_analysis_total",
        );
        totalMetric?.inc(1);
        const durationMetric = metricsRegistry.getMetric(
          "sentiment_analysis_duration_ms",
        );
        durationMetric?.observe(duration);

        // Compute average confidence gauge (custom metric)
        const confidence =
          (result.sentiment && result.sentiment.confidence) || 0;
        try {
          defaultMetrics.tweetSentimentConfidence.set(confidence, {
            language: result.language || "unknown",
          });
        } catch (err) {
          logger.debug("Failed to set tweet_sentiment_confidence_avg", { err });
        }

        // Increment per-tweet sentiment counter
        try {
          const label = result.sentiment?.label || "neutral";
          defaultMetrics.tweetSentimentTotal.inc(1, {
            sentiment: label,
            language: result.language || "unknown",
          });
        } catch (err) {
          logger.debug("Failed to increment tweet_sentiment_total", { err });
        }

        // Observe per-tweet latency
        try {
          defaultMetrics.tweetSentimentLatency.observe(duration, {
            language: result.language || "unknown",
          });
        } catch (err) {
          logger.debug("Failed to observe tweet_sentiment_latency_ms", { err });
        }
      } catch (metricErr) {
        logger.debug("Failed to update sentiment metrics", {
          error: metricErr,
        });
      }

      // Convertimos el resultado a TweetSentimentAnalysis usando el mapper
      return Core.Mappers.SentimentAnalysis.map(tweet, result, {
        includeMarketingInsights: true,
        includeBrandMentions: true,
        brandKeywords: config?.brandKeywords || [],
      });
    } catch (error) {
      throw Core.Errors.analysisFailed(
        tweet.content || tweet.text || "",
        error instanceof Error ? error : new Error("Unknown analysis error"),
      );
    }
  }

  /**
   * Analiza el sentimiento de múltiples tweets en lote con validación centralizada
   * Optimizado para procesamiento paralelo y deduplicación
   */
  async analyzeTweetsBatch(
    tweets: Tweet[],
    config?: { brandKeywords?: string[] },
  ): Promise<TweetSentimentAnalysis[]> {
    // Validar entrada del lote
    const validation = Core.Validators.Tweet.validateBatch(tweets);
    Core.Validators.Utils.validateOrThrow(validation, "batch analysis");

    if (tweets.length === 0) {
      return [];
    }

    try {
      // Optimize for batch processing with controlled concurrency
      const BATCH_SIZE = 10; // Process in chunks to avoid overwhelming the system
      const results: TweetSentimentAnalysis[] = [];

      // Process tweets in parallel batches
      for (let i = 0; i < tweets.length; i += BATCH_SIZE) {
        const batch = tweets.slice(i, i + BATCH_SIZE);

        // Process batch in parallel with controlled concurrency
        const batchPromises = batch.map(async (tweet) => {
          try {
            return await this.analyzeTweet(tweet, config);
          } catch (error) {
            // Handle individual tweet errors gracefully
            logger.warn(
              `Failed to analyze tweet ${tweet.id || tweet.tweetId}`,
              { error },
            );
            // Return neutral analysis for failed tweets to maintain batch integrity
            return this.createNeutralAnalysis(tweet);
          }
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);

        // Brief pause between batches to prevent overwhelming downstream services
        if (i + BATCH_SIZE < tweets.length) {
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      }

      return results;
    } catch (error) {
      throw Core.Errors.modelProcessingError(
        "batch analysis",
        error instanceof Error
          ? error
          : new Error("Unknown batch processing error"),
      );
    }
  }

  /**
   * Creates a neutral analysis result for failed tweet processing
   */
  private createNeutralAnalysis(tweet: Tweet): TweetSentimentAnalysis {
    return {
      tweetId: tweet.id || tweet.tweetId || "failed-tweet",
      analysis: {
        sentiment: {
          score: 0,
          label: "neutral",
          confidence: 0.5,
          magnitude: 0,
          emotions: {
            joy: 0,
            sadness: 0,
            anger: 0,
            fear: 0,
            surprise: 0,
            disgust: 0,
          },
        },
        language: "en",
        keywords: [],
        signals: {
          tokens: [],
          ngrams: {},
          emojis: {},
          negationFlips: 0,
          intensifierBoost: 0,
          sarcasmScore: 0,
        },
        version: "1.0.0",
      },
      brandMentions: [],
      marketingInsights: {
        engagementPotential: 0,
        viralityIndicators: [],
        targetDemographics: [],
        trendAlignment: 0,
        brandRisk: "low",
        opportunityScore: 0,
      },
      analyzedAt: new Date(),
    };
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
      if (label === "positive" || label === "very_positive") {
        sentimentCounts.positive++;
      } else if (label === "negative" || label === "very_negative") {
        sentimentCounts.negative++;
      } else {
        sentimentCounts.neutral++;
      }
    });

    return {
      totalAnalyses,
      sentimentCounts,
      averageSentiment:
        analyses.reduce((sum, a) => sum + a.analysis.sentiment.score, 0) /
        totalAnalyses,
    };
  }

  /**
   * Genera tendencias de sentimiento a lo largo del tiempo
   */
  generateSentimentTrends(
    analyses: TweetSentimentAnalysis[],
    intervalHours: number = 1,
  ) {
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
    const positiveWords = [
      "good",
      "great",
      "excellent",
      "amazing",
      "love",
      "best",
      "perfect",
    ];
    const negativeWords = [
      "bad",
      "terrible",
      "awful",
      "hate",
      "worst",
      "horrible",
      "disgusting",
    ];

    const positiveCount = positiveWords.filter((word) =>
      lowerText.includes(word),
    ).length;
    const negativeCount = negativeWords.filter((word) =>
      lowerText.includes(word),
    ).length;

    if (positiveCount > negativeCount) {
      return {
        label: "positive" as const,
        confidence: 0.7,
        score: 0.7,
      };
    } else if (negativeCount > positiveCount) {
      return {
        label: "negative" as const,
        confidence: 0.7,
        score: -0.7,
      };
    } else {
      return {
        label: "neutral" as const,
        confidence: 0.5,
        score: 0,
      };
    }
  }

  /**
   * Entrena el modelo Naive Bayes
   */

  /**
   * Entrena el modelo Naive Bayes y retorna estadísticas del entrenamiento
   */
  async trainNaiveBayes(
    trainingData: Array<{ text: string; label: string }>,
  ): Promise<{
    trained: boolean;
    totalExamples: number;
    trainingTimeMs: number;
    error?: string;
  }> {
    logger.info(`Training with ${trainingData.length} examples`);
    const start = Date.now();
    try {
      // Convertir los labels a SentimentLabel si es necesario
      const examples: NaiveBayesTrainingExample[] = trainingData.map((ex) => ({
        text: ex.text,
        label: ex.label as SentimentLabel,
      }));
      const engine = this.orchestrator.getEngine();
      if (typeof engine.train === "function") {
        engine.train(examples);
      } else {
        throw new Error("Engine does not support training");
      }
      const trainingTimeMs = Date.now() - start;
      logger.info(`Naive Bayes model trained in ${trainingTimeMs}ms`);
      return {
        trained: true,
        totalExamples: trainingData.length,
        trainingTimeMs,
      };
    } catch (error) {
      logger.error("Error training Naive Bayes model", error);
      return {
        trained: false,
        totalExamples: trainingData.length,
        trainingTimeMs: Date.now() - start,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Guarda el modelo Naive Bayes en archivo
   */
  /**
   * Serializa y guarda el modelo Naive Bayes entrenado en disco
   */
  async saveNaiveBayesToFile(filePath: string): Promise<boolean> {
    try {
      const engine = this.orchestrator.getEngine();
      const naiveBayes = engine.getNaiveBayesAnalyzer();
      if (!naiveBayes || typeof naiveBayes.serialize !== "function") {
        throw new Error("Naive Bayes analyzer does not support serialization");
      }
      const modelData = naiveBayes.serialize();
      const fs = await import("fs/promises");
      await fs.writeFile(filePath, JSON.stringify(modelData, null, 2), "utf-8");
      logger.info(`Naive Bayes model saved to ${filePath}`);
      return true;
    } catch (error) {
      logger.error("Error saving Naive Bayes model", error);
      return false;
    }
  }

  /**
   * Get the orchestrator for advanced operations
   */
  public getOrchestrator(): SentimentAnalysisOrchestrator {
    return this.orchestrator;
  }

  /**
   * Try to load the latest saved model
   */
  public async tryLoadLatestModel(): Promise<boolean> {
    try {
      const { ModelPersistenceManager } = await import(
        "./model-persistence.service"
      );
      const modelPersistence = new ModelPersistenceManager();

      // Check if model exists
      const modelInfo = await modelPersistence.getModelInfo();
      if (!modelInfo.exists) {
        return false;
      }

      // Try to load the Naive Bayes model through the orchestrator
      const naiveBayesService = this.orchestrator
        .getEngine()
        .getNaiveBayesAnalyzer();
      if (naiveBayesService) {
        const metadata =
          await modelPersistence.loadNaiveBayesModel(naiveBayesService);
        return metadata !== null;
      }

      return false;
    } catch (error) {
      console.warn("⚠️ Could not load latest model:", error);
      return false;
    }
  }

  /**
   * Dispose resources for testing
   */
  public dispose(): void {
    if (this.orchestrator) {
      this.orchestrator.dispose();
    }
  }
}

// Instancia singleton exportada
export const tweetSentimentAnalysisManager =
  new TweetSentimentAnalysisManager();
