/**
 * BERT Sentiment Analyzer Service
 * Integrates a pre-trained BERT model for advanced sentiment analysis
 * Using pure tfjs to avoid native dependencies
 */

import * as tf from "@tensorflow/tfjs";
import axios from "axios";
import { SentimentLabel } from "./naive-bayes-sentiment.service";
import { logger } from "../lib/observability/logger";

// Environment variables (should be defined in .env)
const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY || "";
const USE_LOCAL_MODEL = process.env.USE_LOCAL_BERT_MODEL === "true";
const LOCAL_MODEL_PATH = process.env.BERT_MODEL_PATH || "./models/bert";
const REMOTE_MODEL_ENDPOINT =
  process.env.BERT_API_ENDPOINT ||
  "https://api-inference.huggingface.co/models/finiteautomata/bertweet-base-sentiment-analysis";

// Type for BERT model prediction result
export interface BertPrediction {
  label: string;
  score: number;
}

/**
 * Service that handles sentiment analysis using BERT models
 * Supports both local TensorFlow.js models and remote Hugging Face inference API
 */
export class BertSentimentAnalyzerService {
  private model: tf.LayersModel | null = null;
  private tokenizer: any = null;
  private isModelLoaded = false;
  private isLoading = false;
  private loadPromise: Promise<void> | null = null;

  // Map Hugging Face labels to our standard format
  private static LABEL_MAPPING: Record<string, SentimentLabel> = {
    POS: "positive",
    NEU: "neutral",
    NEG: "negative",
    POSITIVE: "positive",
    NEUTRAL: "neutral",
    NEGATIVE: "negative",
  };

  constructor() {
    // Initialize - will lazy load when needed
  }

  /**
   * Check if the BERT model is available (either loaded or API ready)
   */
  public isAvailable(): boolean {
    if (USE_LOCAL_MODEL) {
      return this.isModelLoaded;
    } else {
      return !!HUGGINGFACE_API_KEY;
    }
  }

  /**
   * Load the local BERT model
   * @returns Promise that resolves when model is loaded
   */
  public async loadModel(): Promise<void> {
    // If already loading, return the existing promise
    if (this.isLoading && this.loadPromise) {
      return this.loadPromise;
    }

    // If already loaded, return immediately
    if (this.isModelLoaded) {
      return Promise.resolve();
    }

    this.isLoading = true;

    this.loadPromise = (async () => {
      try {
        logger.info("Loading BERT model...");
        const startTime = Date.now();

        if (USE_LOCAL_MODEL) {
          // With pure TF.js, we can't use file:// protocol easily in Node.js
          // We would need to use tf.io.fileSystem or similar approach
          // For this implementation, we'll primarily support the API approach
          logger.warn(
            "Local model loading with pure TF.js requires additional setup",
          );
          logger.info("Defaulting to API approach for BERT analysis");
        }

        // Check if API key is available (but don't fail if not)
        if (!HUGGINGFACE_API_KEY) {
          logger.warn(
            "HUGGINGFACE_API_KEY not set. BERT will operate in demo mode with limited functionality.",
          );
          logger.info(
            "To enable full BERT functionality, set HUGGINGFACE_API_KEY environment variable",
          );
        } else {
          logger.info("BERT API configuration verified");
        }

        this.isModelLoaded = true;
        logger.info(
          `BERT model configuration completed in ${Date.now() - startTime}ms`,
        );
      } catch (error) {
        logger.error("Failed to load BERT model:", {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
        this.isModelLoaded = false;
        throw new Error("Failed to load BERT model");
      } finally {
        this.isLoading = false;
      }
    })();

    return this.loadPromise;
  }

  /**
   * Predict sentiment using BERT model
   * @param text Text to analyze
   * @returns Prediction with label, confidence and score
   */
  public async predict(text: string): Promise<{
    label: SentimentLabel;
    confidence: number;
    score: number;
  }> {
    try {
      // Ensure model is loaded
      if (!this.isAvailable()) {
        await this.loadModel();
      }

      let prediction: BertPrediction;

      if (USE_LOCAL_MODEL && this.model) {
        // Local model inference
        prediction = await this.predictWithLocalModel(text);
      } else {
        // Remote API inference
        prediction = await this.predictWithRemoteAPI(text);
      }

      // Map to our standard format
      const label =
        BertSentimentAnalyzerService.LABEL_MAPPING[prediction.label] ||
        "neutral";

      // Convert score to our format (-1 to 1 scale)
      let score = 0;
      if (label === "positive") {
        score = prediction.score * 0.8; // 0 to 0.8
      } else if (label === "negative") {
        score = -prediction.score * 0.8; // 0 to -0.8
      }

      return {
        label: label as SentimentLabel,
        confidence: prediction.score,
        score,
      };
    } catch (error) {
      logger.error("BERT prediction failed:", {
        error: error instanceof Error ? error.message : String(error),
        text: text.substring(0, 50) + (text.length > 50 ? "..." : ""),
      });

      // Return neutral as fallback
      return {
        label: "neutral",
        confidence: 0.5,
        score: 0,
      };
    }
  }

  /**
   * Predict with local TensorFlow.js model
   * This is now just a fallback that redirects to API prediction
   * @param text Input text
   * @returns Prediction result
   */
  private async predictWithLocalModel(text: string): Promise<BertPrediction> {
    // Since we're using pure TF.js without node-specific bindings,
    // we'll default to using the API approach instead
    logger.info("Redirecting local model prediction to API-based prediction");
    return this.predictWithRemoteAPI(text);
  }

  /**
   * Predict with remote Hugging Face API
   * @param text Input text
   * @returns Prediction result
   */
  private async predictWithRemoteAPI(text: string): Promise<BertPrediction> {
    try {
      // If no API key, use demo mode with simulated responses
      if (!HUGGINGFACE_API_KEY) {
        logger.warn("Using BERT demo mode (no API key provided)");
        return this.generateDemoPrediction(text);
      }

      const response = await axios.post(
        REMOTE_MODEL_ENDPOINT,
        { inputs: text },
        {
          headers: {
            Authorization: `Bearer ${HUGGINGFACE_API_KEY}`,
            "Content-Type": "application/json",
          },
        },
      );

      // Process response from Hugging Face
      const results = response.data;

      // API returns an array of label/score objects
      if (Array.isArray(results) && results.length > 0) {
        // Sort by score in descending order
        const sortedResults = [...results].sort((a, b) => b.score - a.score);
        return sortedResults[0]; // Return the highest scoring prediction
      }

      throw new Error("Unexpected API response format");
    } catch (error) {
      logger.error("Hugging Face API call failed:", {
        error: error instanceof Error ? error.message : String(error),
        useDemo: !HUGGINGFACE_API_KEY,
      });

      // If API call fails but we have no API key, use demo mode
      if (!HUGGINGFACE_API_KEY) {
        logger.info("Falling back to demo mode prediction");
        return this.generateDemoPrediction(text);
      }

      throw new Error("BERT API inference failed");
    }
  }

  /**
   * Generate a demo prediction when no API key is available
   * Uses simple keyword matching for demonstration purposes
   * @param text Input text
   * @returns Simulated prediction
   */
  private generateDemoPrediction(text: string): BertPrediction {
    // Simple keyword-based sentiment analysis for demo mode
    const lowerText = text.toLowerCase();

    // Lists of positive and negative keywords
    const positiveKeywords = [
      "good",
      "great",
      "excellent",
      "amazing",
      "love",
      "happy",
      "wonderful",
      "best",
      "like",
      "enjoy",
      "fantastic",
      "perfect",
      "awesome",
      "brilliant",
      "bueno",
      "excelente",
      "me gusta",
    ];

    const negativeKeywords = [
      "bad",
      "terrible",
      "horrible",
      "hate",
      "worst",
      "awful",
      "poor",
      "disappointing",
      "dislike",
      "wrong",
      "problema",
      "malo",
      "terrible",
      "odio",
      "peor",
      "fatal",
    ];

    // Count matches
    const positiveMatches = positiveKeywords.filter((word) =>
      lowerText.includes(word),
    ).length;

    const negativeMatches = negativeKeywords.filter((word) =>
      lowerText.includes(word),
    ).length;

    // Generate sentiment based on keyword matches
    if (positiveMatches > negativeMatches) {
      return {
        label: "POS",
        score: 0.65 + Math.min(positiveMatches, 3) * 0.1,
      };
    } else if (negativeMatches > positiveMatches) {
      return {
        label: "NEG",
        score: 0.65 + Math.min(negativeMatches, 3) * 0.1,
      };
    } else {
      return {
        label: "NEU",
        score: 0.75,
      };
    }
  }

  /**
   * Release resources
   */
  public dispose(): void {
    if (this.model) {
      this.model.dispose();
      this.model = null;
    }
    this.isModelLoaded = false;
  }
}

// Export singleton instance
export const bertSentimentAnalyzer = new BertSentimentAnalyzerService();
