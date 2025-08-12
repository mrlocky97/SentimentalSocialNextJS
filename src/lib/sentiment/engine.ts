/**
 * Sentiment Analysis Engine
 *
 * This class encapsulates the core, pure logic for sentiment analysis.
 * It combines rule-based, machine learning (Naive Bayes), and hybrid analysis techniques.
 * Enhanced with multiple open-source models for superior accuracy.
 */
import natural from "natural";
import {
  AdvancedHybridAnalyzer,
  ContextualFeatures,
} from "../../services/advanced-hybrid-analyzer.service";
import { enhancedSentimentEngine } from "../../services/enhanced-sentiment-engine.service";
import { InternalSentimentAnalyzer } from "../../services/internal-sentiment-analyzer.service";
import {
  NaiveBayesSentimentService,
  NaiveBayesTrainingExample,
  SentimentLabel,
} from "../../services/naive-bayes-sentiment.service";
import {
  AnalysisRequest,
  AnalysisResult,
  AnalyzerEngine,
  LanguageCode,
  SignalBreakdown,
} from "./types";

export class SentimentAnalysisEngine implements AnalyzerEngine {
  private ruleBasedAnalyzer: InternalSentimentAnalyzer;
  private naiveBayesAnalyzer: NaiveBayesSentimentService;
  private hybridAnalyzer: AdvancedHybridAnalyzer;
  private engineVersion = "1.0.0";

  constructor() {
    this.ruleBasedAnalyzer = new InternalSentimentAnalyzer();
    this.naiveBayesAnalyzer = new NaiveBayesSentimentService();
    this.hybridAnalyzer = new AdvancedHybridAnalyzer();
  }

  /**
   * Trains the underlying Naive Bayes classifier.
   * @param examples - An array of training data.
   */
  train(examples: NaiveBayesTrainingExample[]): void {
    this.naiveBayesAnalyzer.train(examples);
  }

  /**
   * Loads a pre-trained Naive Bayes classifier model.
   * @param modelState - The classifier state as a JSON string.
   */
  loadModel(modelState: string): void {
    const classifier = natural.BayesClassifier.restore(JSON.parse(modelState));
    // A bit of a hack as the service doesn't expose a setter.
    // In a real scenario, the NaiveBayesSentimentService would be refactored.
    (this.naiveBayesAnalyzer as any).classifier = classifier;
  }

  /**
   * Saves the current Naive Bayes classifier model.
   * @returns The classifier state as a JSON string.
   */
  saveModel(): string {
    return JSON.stringify((this.naiveBayesAnalyzer as any).classifier);
  }

  /**
   * Analyzes the given text and returns a comprehensive sentiment analysis result.
   * This is the core method of the engine, performing a hybrid analysis.
   * @param request - The analysis request containing text and options.
   * @returns An object with the detailed analysis result.
   */
  public async analyze(request: AnalysisRequest): Promise<AnalysisResult> {
    const { text, language = "en" } = request;

    // Use enhanced sentiment engine for better accuracy
    try {
      const enhancedResult = await enhancedSentimentEngine.analyzeEnhanced(
        text,
        language,
      );

      // Map enhanced result to our AnalysisResult format
      const lang = language;
      const detectedLanguage: LanguageCode = [
        "en",
        "es",
        "fr",
        "de",
        "unknown",
      ].includes(lang)
        ? (lang as LanguageCode)
        : "unknown";

      const signals: SignalBreakdown = {
        tokens: [], // Would be populated from enhanced analysis
        ngrams: {},
        emojis: {},
        negationFlips: 0,
        intensifierBoost: enhancedResult.features.emotionalIntensity,
        sarcasmScore: enhancedResult.features.sarcasmScore,
      };

      return {
        sentiment: {
          label: enhancedResult.finalPrediction.label as SentimentLabel,
          score: enhancedResult.finalPrediction.score,
          magnitude: Math.abs(enhancedResult.finalPrediction.score),
          confidence: enhancedResult.finalPrediction.confidence,
          emotions: {
            joy:
              enhancedResult.finalPrediction.score > 0.5
                ? enhancedResult.finalPrediction.confidence
                : 0,
            sadness:
              enhancedResult.finalPrediction.score < -0.5
                ? enhancedResult.finalPrediction.confidence * 0.7
                : 0,
            anger:
              enhancedResult.finalPrediction.score < -0.5
                ? enhancedResult.finalPrediction.confidence * 0.8
                : 0,
            fear:
              enhancedResult.finalPrediction.score < -0.3
                ? enhancedResult.finalPrediction.confidence * 0.5
                : 0,
            surprise:
              Math.abs(enhancedResult.finalPrediction.score) > 0.8
                ? enhancedResult.finalPrediction.confidence * 0.3
                : 0,
            disgust:
              enhancedResult.finalPrediction.score < -0.6
                ? enhancedResult.finalPrediction.confidence * 0.6
                : 0,
          },
        },
        keywords: [], // Would be extracted from enhanced analysis
        language: detectedLanguage,
        signals,
        version: "2.0.0-enhanced",
      };
    } catch (error) {
      console.warn(
        "Enhanced engine failed, falling back to basic hybrid analysis:",
        error,
      );
      return this.analyzeBasic(request);
    }
  }

  /**
   * Fallback basic analysis method (original implementation)
   */
  private async analyzeBasic(
    request: AnalysisRequest,
  ): Promise<AnalysisResult> {
    const { text, language = "en" } = request;

    // 1. Get predictions from both rule-based and Naive Bayes analyzers.
    const ruleResultPromise = this.ruleBasedAnalyzer.analyze(text);
    const naiveResult = this.naiveBayesAnalyzer.predict(text);
    const ruleResult = await ruleResultPromise;

    // 2. Use the advanced hybrid analyzer to get a unified result.
    const hybridPrediction = this.hybridAnalyzer.predictWithAutoWeights(
      text,
      naiveResult,
      {
        label: ruleResult.sentiment.label,
        confidence: ruleResult.sentiment.confidence,
        score: ruleResult.sentiment.score,
      },
      language,
    );

    // 3. Construct the final, unified AnalysisResult.
    const signals = this.buildSignalBreakdown(
      hybridPrediction.features,
      ruleResult.keywords,
    );

    const lang = hybridPrediction.features.language;
    const detectedLanguage: LanguageCode = [
      "en",
      "es",
      "fr",
      "de",
      "unknown",
    ].includes(lang)
      ? (lang as LanguageCode)
      : "unknown";

    return {
      sentiment: {
        label: hybridPrediction.label as SentimentLabel,
        score: hybridPrediction.score,
        magnitude: Math.abs(hybridPrediction.score),
        confidence: hybridPrediction.confidence,
        emotions: {
          joy: hybridPrediction.score > 0.5 ? hybridPrediction.confidence : 0,
          sadness:
            hybridPrediction.score < -0.5
              ? hybridPrediction.confidence * 0.7
              : 0,
          anger:
            hybridPrediction.score < -0.5
              ? hybridPrediction.confidence * 0.8
              : 0,
          fear:
            hybridPrediction.score < -0.3
              ? hybridPrediction.confidence * 0.5
              : 0,
          surprise:
            Math.abs(hybridPrediction.score) > 0.8
              ? hybridPrediction.confidence * 0.3
              : 0,
          disgust:
            hybridPrediction.score < -0.6
              ? hybridPrediction.confidence * 0.6
              : 0,
        },
      },
      keywords: ruleResult.keywords,
      language: detectedLanguage,
      signals,
      version: "1.0.0-unified",
    };
  }

  /**
   * Helper to assemble the signal breakdown from various analysis features.
   */
  private buildSignalBreakdown(
    features: ContextualFeatures,
    keywords: string[],
  ): SignalBreakdown {
    return {
      tokens: keywords,
      ngrams: {}, // Placeholder for future n-gram analysis
      emojis: {}, // Placeholder for future emoji analysis
      negationFlips: 0, // Placeholder
      intensifierBoost: features.emotionalWords,
      sarcasmScore: features.sarcasmIndicators,
    };
  }
}
