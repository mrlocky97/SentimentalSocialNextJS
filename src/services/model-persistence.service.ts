/**
 * Model Persistence Manager
 * Handles saving, loading, and validation of trained sentiment models
 */

import fs from 'fs/promises';
import path from 'path';
import { NaiveBayesSentimentService } from './naive-bayes-sentiment.service';

export interface ModelMetadata {
  version: string;
  trainingDate: string;
  datasetSize: number;
  accuracy?: number;
  features: string[];
  modelType: 'naive_bayes' | 'enhanced' | 'hybrid';
  checksumMD5?: string;
}

export interface SavedModel {
  metadata: ModelMetadata;
  modelData: any;
  validationResults?: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
  };
}

export class ModelPersistenceManager {
  private modelsDir: string;
  private metadataFile: string;

  constructor() {
    this.modelsDir = path.join(process.cwd(), 'src', 'data', 'models');
    this.metadataFile = path.join(process.cwd(), 'src', 'data', 'model-metadata.json');
  }

  /**
   * Ensure models directory exists
   */
  private async ensureModelsDirectory(): Promise<void> {
    try {
      await fs.access(this.modelsDir);
    } catch {
      await fs.mkdir(this.modelsDir, { recursive: true });
    }
  }

  /**
   * Save a trained Naive Bayes model with metadata
   */
  async saveNaiveBayesModel(
    service: NaiveBayesSentimentService,
    metadata: Omit<ModelMetadata, 'modelType' | 'trainingDate'>
  ): Promise<void> {
    await this.ensureModelsDirectory();

    const modelPath = path.join(this.modelsDir, 'naive_bayes_classifier.json');
    const fullMetadata: ModelMetadata = {
      ...metadata,
      modelType: 'naive_bayes',
      trainingDate: new Date().toISOString(),
    };

    try {
      // Save the classifier using natural's built-in serialization
      await new Promise<void>((resolve, reject) => {
        (service as any).classifier.save(modelPath, (err: Error | null) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Save metadata
      await this.saveMetadata(fullMetadata);

      console.log(`✅ Model saved successfully: ${modelPath}`);
    } catch (error) {
      console.error('❌ Error saving model:', error);
      throw error;
    }
  }

  /**
   * Load a trained Naive Bayes model
   */
  async loadNaiveBayesModel(service: NaiveBayesSentimentService): Promise<ModelMetadata | null> {
    const modelPath = path.join(this.modelsDir, 'naive_bayes_classifier.json');

    try {
      // Check if model file exists
      await fs.access(modelPath);

      // Load the classifier
      await new Promise<void>((resolve, reject) => {
        const natural = require('natural');
        natural.BayesClassifier.load(modelPath, null, (err: Error | null, classifier: any) => {
          if (err || !classifier) {
            reject(err || new Error('Failed to load classifier'));
          } else {
            (service as any).classifier = classifier;
            resolve();
          }
        });
      });

      // Load metadata
      const metadata = await this.loadMetadata();

      console.log(`✅ Model loaded successfully from: ${modelPath}`);
      console.log(`📊 Model info: ${metadata?.datasetSize} examples, version ${metadata?.version}`);

      return metadata;
    } catch (error) {
      console.warn(`⚠️ Could not load model from ${modelPath}:`, error);
      return null;
    }
  }

  /**
   * Save model metadata
   */
  private async saveMetadata(metadata: ModelMetadata): Promise<void> {
    const metadataWithTimestamp = {
      ...metadata,
      lastUpdated: new Date().toISOString(),
    };

    await fs.writeFile(this.metadataFile, JSON.stringify(metadataWithTimestamp, null, 2), 'utf-8');
  }

  /**
   * Load model metadata
   */
  async loadMetadata(): Promise<ModelMetadata | null> {
    try {
      const metadataContent = await fs.readFile(this.metadataFile, 'utf-8');
      return JSON.parse(metadataContent) as ModelMetadata;
    } catch (error) {
      console.warn('⚠️ Could not load metadata:', error);
      return null;
    }
  }

  /**
   * Validate model performance with test data
   */
  async validateModel(
    service: NaiveBayesSentimentService,
    testCases: Array<{ text: string; expectedSentiment: string }>
  ): Promise<{ accuracy: number; precision: number; recall: number; f1Score: number }> {
    let correct = 0;
    let truePositives = 0;
    let falsePositives = 0;
    let falseNegatives = 0;

    const results = testCases.map((testCase) => {
      const prediction = service.predict(testCase.text);
      const isCorrect = prediction.label === testCase.expectedSentiment;

      if (isCorrect) correct++;

      // Calculate precision/recall for positive sentiment
      if (testCase.expectedSentiment === 'positive' && prediction.label === 'positive') {
        truePositives++;
      } else if (testCase.expectedSentiment !== 'positive' && prediction.label === 'positive') {
        falsePositives++;
      } else if (testCase.expectedSentiment === 'positive' && prediction.label !== 'positive') {
        falseNegatives++;
      }

      return {
        text: testCase.text,
        expected: testCase.expectedSentiment,
        predicted: prediction.label,
        confidence: prediction.confidence,
        correct: isCorrect,
      };
    });

    const accuracy = (correct / testCases.length) * 100;
    const precision = truePositives / (truePositives + falsePositives) || 0;
    const recall = truePositives / (truePositives + falseNegatives) || 0;
    const f1Score = (2 * (precision * recall)) / (precision + recall) || 0;

    const validationResults = {
      accuracy,
      precision: precision * 100,
      recall: recall * 100,
      f1Score: f1Score * 100,
    };

    console.log(`📊 Model Validation Results:`);
    console.log(`   Accuracy: ${accuracy.toFixed(2)}%`);
    console.log(`   Precision: ${validationResults.precision.toFixed(2)}%`);
    console.log(`   Recall: ${validationResults.recall.toFixed(2)}%`);
    console.log(`   F1-Score: ${validationResults.f1Score.toFixed(2)}%`);

    return validationResults;
  }

  /**
   * Check if a saved model exists and is valid
   */
  async hasValidModel(): Promise<boolean> {
    try {
      const modelPath = path.join(this.modelsDir, 'naive_bayes_classifier.json');
      await fs.access(modelPath);

      const metadata = await this.loadMetadata();
      if (!metadata) return false;

      // Check if model is recent (less than 30 days old)
      const modelAge = Date.now() - new Date(metadata.trainingDate).getTime();
      const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;

      return modelAge < thirtyDaysInMs;
    } catch {
      return false;
    }
  }

  /**
   * Get model statistics and information
   */
  async getModelInfo(): Promise<{
    exists: boolean;
    metadata: ModelMetadata | null;
    size: number;
    lastModified: Date | null;
  }> {
    try {
      const modelPath = path.join(this.modelsDir, 'naive_bayes_classifier.json');
      const stats = await fs.stat(modelPath);
      const metadata = await this.loadMetadata();

      return {
        exists: true,
        metadata,
        size: stats.size,
        lastModified: stats.mtime,
      };
    } catch {
      return {
        exists: false,
        metadata: null,
        size: 0,
        lastModified: null,
      };
    }
  }
}

// Export singleton instance
export const modelPersistenceManager = new ModelPersistenceManager();
