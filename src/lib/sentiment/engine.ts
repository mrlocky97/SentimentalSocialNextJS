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
import {
  NaiveBayesSentimentService,
  NaiveBayesTrainingExample,
  SentimentLabel,
} from "../../services/naive-bayes-sentiment.service";
import { Language } from "../../enums/sentiment.enum";
import { TextAnalysis } from "../../types/sentiment";
import {
  AnalysisRequest,
  AnalysisResult,
  AnalyzerEngine,
  LanguageCode,
  SignalBreakdown,
} from "./types";

/**
 * Consolidated internal rule-based analyzer
 * Integrated directly into the engine to eliminate dependencies
 */
class ConsolidatedRuleAnalyzer {
  analyze(text: string): Promise<TextAnalysis> {
    return new Promise((resolve) => {
      const lowerText = text.toLowerCase();

      // Consolidated lexicons from internal analyzer
      const positiveWords = [
        "good",
        "great",
        "excellent",
        "amazing",
        "love",
        "fantastic",
        "awesome",
        "perfect",
        "wonderful",
        "best",
        "bueno",
        "excelente",
        "increíble",
        "fantástico",
        "perfecto",
        "maravilloso",
        "mejor",
      ];

      const negativeWords = [
        "bad",
        "terrible",
        "horrible",
        "hate",
        "worst",
        "awful",
        "disgusting",
        "pathetic",
        "useless",
        "fail",
        "malo",
        "terrible",
        "horrible",
        "odio",
        "peor",
        "fatal",
        "desastre",
      ];

      // Simplified emoji sentiment mapping
      const emojiSentiment: Record<string, number> = {
        "😀": 1,
        "😃": 1,
        "😄": 1,
        "😁": 1,
        "😊": 0.8,
        "😍": 1,
        "🥰": 1,
        "👍": 0.7,
        "❤️": 1,
        "😢": -1,
        "😭": -1,
        "😞": -0.8,
        "😔": -0.8,
        "😡": -1,
        "😠": -1,
        "👎": -0.7,
        "💔": -1,
      };

      let positiveScore = 0,
        negativeScore = 0,
        emojiScore = 0,
        emojiCount = 0;

      positiveWords.forEach((word) => {
        if (lowerText.includes(word)) positiveScore++;
      });
      negativeWords.forEach((word) => {
        if (lowerText.includes(word)) negativeScore++;
      });

      // Process emojis
      const emojiMatches = Array.from(
        text.matchAll(
          /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}]/gu,
        ),
      );

      if (emojiMatches.length > 0) {
        for (const match of emojiMatches) {
          const emoji = match[0];
          emojiCount++;
          if (emojiSentiment[emoji] !== undefined) {
            emojiScore += emojiSentiment[emoji];
          }
        }
      }

      let score = positiveScore * 0.2 - negativeScore * 0.2;
      if (emojiCount > 0) {
        score += (emojiScore / emojiCount) * Math.min(1, emojiCount * 0.5);
      }

      let label: "positive" | "negative" | "neutral" = "neutral";
      let confidence = 0.5;

      if (score > 0.15) {
        label = "positive";
        confidence = Math.min(0.99, 0.6 + Math.abs(score));
      } else if (score < -0.15) {
        label = "negative";
        confidence = Math.min(0.99, 0.6 + Math.abs(score));
      }

      const words = text.split(/\s+/).filter((word) => word.length > 3);
      const keywords = words.slice(0, 5);

      const spanishWords = [
        "el",
        "la",
        "que",
        "de",
        "es",
        "y",
        "pero",
        "con",
        "por",
      ];
      const isSpanish = spanishWords.some((word) => lowerText.includes(word));

      const result: TextAnalysis = {
        sentiment: {
          score: Math.max(-1, Math.min(1, score)),
          magnitude: Math.abs(score),
          label,
          confidence,
          emotions: {
            joy: label === "positive" ? confidence : 0,
            sadness: label === "negative" ? confidence * 0.7 : 0,
            anger: label === "negative" ? confidence * 0.8 : 0,
            fear: label === "negative" ? confidence * 0.5 : 0,
            surprise: 0.1,
            disgust: label === "negative" ? confidence * 0.6 : 0,
          },
        },
        keywords,
        entities: [],
        language: isSpanish ? Language.SPANISH : Language.ENGLISH,
      };

      resolve(result);
    });
  }
}

export class SentimentAnalysisEngine implements AnalyzerEngine {
  private ruleBasedAnalyzer: ConsolidatedRuleAnalyzer;
  private naiveBayesAnalyzer: NaiveBayesSentimentService;
  private hybridAnalyzer: AdvancedHybridAnalyzer;
  private engineVersion = "1.0.0";

  constructor() {
    this.ruleBasedAnalyzer = new ConsolidatedRuleAnalyzer();
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
    // Use the basic hybrid analysis since we consolidated everything
    return this.analyzeBasic(request);
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
