/**
 * URGENT FIX: Enhanced Naive Bayes Service
 * Corrección crítica del modelo de sentimientos para alcanzar >90% accuracy
 */

// Define our own simplified sentiment types for the fixed model
export type SimpleSentimentLabel = "positive" | "negative" | "neutral";

import { logger } from "../lib/observability/logger"; // adjust path if needed
export interface TrainingExample {
  text: string;
  label: SimpleSentimentLabel;
}

export interface PredictionResult {
  label: SimpleSentimentLabel;
  confidence: number;
  scores: {
    positive: number;
    negative: number;
    neutral: number;
  };
}

export class FixedNaiveBayesService {
  private vocabulary: Map<string, number> = new Map();
  private classWordCounts: Map<SimpleSentimentLabel, Map<string, number>> =
    new Map();
  private classCounts: Map<SimpleSentimentLabel, number> = new Map();
  private totalDocuments = 0;
  private trained = false;

  constructor() {
    // Initialize class maps
    this.classWordCounts.set("positive", new Map());
    this.classWordCounts.set("negative", new Map());
    this.classWordCounts.set("neutral", new Map());

    this.classCounts.set("positive", 0);
    this.classCounts.set("negative", 0);
    this.classCounts.set("neutral", 0);
  }

  /**
   * CRITICAL FIX: Proper text preprocessing
   */
  private preprocessText(text: string): string[] {
    if (!text || typeof text !== "string") {
      return [];
    }

    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ") // Remove punctuation but keep word boundaries
      .replace(/\s+/g, " ") // Normalize whitespace
      .trim()
      .split(" ")
      .filter((word) => word.length > 1) // Remove single characters
      .filter((word) => !this.isStopWord(word)); // Remove stop words
  }

  /**
   * Basic stop words removal
   */
  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      "a",
      "an",
      "and",
      "are",
      "as",
      "at",
      "be",
      "by",
      "for",
      "from",
      "has",
      "he",
      "in",
      "is",
      "it",
      "its",
      "of",
      "on",
      "that",
      "the",
      "to",
      "was",
      "were",
      "will",
      "with",
      "the",
      "this",
      "but",
      "they",
      "have",
      "had",
      "what",
      "said",
      "each",
      "which",
      "she",
      "do",
      "how",
      "their",
      "if",
      "up",
      "out",
      "many",
      "then",
      "them",
      "these",
      "so",
    ]);
    return stopWords.has(word);
  }

  /**
   * CRITICAL FIX: Proper training implementation
   */
  train(examples: TrainingExample[]): void {
    logger.info(
      `Training fixed naive bayes with ${examples.length} examples...`,
    );

    // Reset training state
    this.vocabulary.clear();
    this.classWordCounts.clear();
    this.classCounts.clear();
    this.totalDocuments = 0;

    // Initialize maps
    this.classWordCounts.set("positive", new Map());
    this.classWordCounts.set("negative", new Map());
    this.classWordCounts.set("neutral", new Map());

    this.classCounts.set("positive", 0);
    this.classCounts.set("negative", 0);
    this.classCounts.set("neutral", 0);

    // Process each example
    for (const example of examples) {
      if (!example.text || !example.label) {
        logger.warn("Skipping invalid example", { example });
        continue;
      }

      const words = this.preprocessText(example.text);
      if (words.length === 0) {
        logger.warn("No words after preprocessing", { text: example.text });
        continue;
      }

      // Update class count
      const currentCount = this.classCounts.get(example.label) || 0;
      this.classCounts.set(example.label, currentCount + 1);
      this.totalDocuments++;

      // Update word counts for this class
      const classWords = this.classWordCounts.get(example.label);
      if (classWords) {
        for (const word of words) {
          // Add to vocabulary
          this.vocabulary.set(word, (this.vocabulary.get(word) || 0) + 1);

          // Add to class word count
          classWords.set(word, (classWords.get(word) || 0) + 1);
        }
      }
    }

    this.trained = true;

    // Log training results
    logger.info("Training completed", {
      vocabularySize: this.vocabulary.size,
      positiveExamples: this.classCounts.get("positive"),
      negativeExamples: this.classCounts.get("negative"),
      neutralExamples: this.classCounts.get("neutral"),
      totalDocuments: this.totalDocuments,
    });
  }

  /**
   * CRITICAL FIX: Proper prediction with Laplace smoothing
   */
  predict(text: string): PredictionResult {
    if (!this.trained) {
      throw new Error("Model must be trained before making predictions");
    }

    const words = this.preprocessText(text);
    if (words.length === 0) {
      // Return neutral for empty/invalid text
      return {
        label: "neutral",
        confidence: 0.5,
        scores: { positive: 0.33, negative: 0.33, neutral: 0.34 },
      };
    }

    const scores: Record<SimpleSentimentLabel, number> = {
      positive: 0,
      negative: 0,
      neutral: 0,
    };

    // Calculate log probabilities for each class
    for (const label of [
      "positive",
      "negative",
      "neutral",
    ] as SimpleSentimentLabel[]) {
      const classCount = this.classCounts.get(label) || 1;
      const classWords = this.classWordCounts.get(label);

      if (!classWords) continue;

      // Prior probability P(class)
      scores[label] = Math.log(classCount / this.totalDocuments);

      // Calculate total words in this class (for Laplace smoothing)
      let totalWordsInClass = 0;
      for (const count of classWords.values()) {
        totalWordsInClass += count;
      }

      // Likelihood P(word|class) with Laplace smoothing
      for (const word of words) {
        const wordCountInClass = classWords.get(word) || 0;
        const vocabularySize = this.vocabulary.size;

        // Laplace smoothing: (count + 1) / (total + vocabulary_size)
        const probability =
          (wordCountInClass + 1) / (totalWordsInClass + vocabularySize);
        scores[label] += Math.log(probability);
      }
    }

    // Convert log scores to probabilities
    const maxScore = Math.max(...Object.values(scores));
    const expScores: Record<SimpleSentimentLabel, number> = {
      positive: Math.exp(scores.positive - maxScore),
      negative: Math.exp(scores.negative - maxScore),
      neutral: Math.exp(scores.neutral - maxScore),
    };

    // Normalize to get probabilities
    const total = expScores.positive + expScores.negative + expScores.neutral;
    const normalizedScores = {
      positive: expScores.positive / total,
      negative: expScores.negative / total,
      neutral: expScores.neutral / total,
    };

    // Find the class with highest probability
    const predictedLabel = Object.entries(normalizedScores).reduce((a, b) =>
      normalizedScores[a[0] as SimpleSentimentLabel] >
      normalizedScores[b[0] as SimpleSentimentLabel]
        ? a
        : b,
    )[0] as SimpleSentimentLabel;

    const confidence = normalizedScores[predictedLabel];

    return {
      label: predictedLabel,
      confidence,
      scores: normalizedScores,
    };
  }

  /**
   * Get model statistics
   */
  getStats(): Record<string, unknown> {
    return {
      trained: this.trained,
      vocabularySize: this.vocabulary.size,
      totalDocuments: this.totalDocuments,
      classCounts: Object.fromEntries(this.classCounts.entries()),
    };
  }
}
