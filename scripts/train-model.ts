/**
 * Script for training and saving sentiment model
 * Quick test for model persistence functionality
 */

import dotenv from "dotenv";
dotenv.config({ path: [".env.local", ".env"] });

import { MultilingualSentimentDataset } from "../src/data/enhanced-training-data-v3";
import { ModelPersistenceManager } from "../src/services/model-persistence.service";
import { TweetSentimentAnalysisManager } from "../src/services/tweet-sentiment-analysis.manager.service";

// Use MultilingualSentimentDataset as enhancedTrainingDataV3Complete
const enhancedTrainingDataV3Complete = MultilingualSentimentDataset;

async function trainAndSaveModel() {
  try {
    console.log("🧠 Starting model training script...");
    
    // Initialize services
    const sentimentManager = new TweetSentimentAnalysisManager();
    const modelPersistence = new ModelPersistenceManager();
    
    // Train with enhanced dataset
    console.log(`🔧 Training with ${enhancedTrainingDataV3Complete.length} examples...`);
    await sentimentManager.trainNaiveBayes(enhancedTrainingDataV3Complete);
    
    // Get the trained service to save
    const naiveBayesService = sentimentManager
      .getOrchestrator()
      .getEngine()
      .getNaiveBayesAnalyzer();
    
    // Save the model
    console.log("💾 Saving trained model...");
    await modelPersistence.saveNaiveBayesModel(
      naiveBayesService,
      {
        version: "v3.0",
        datasetSize: enhancedTrainingDataV3Complete.length,
        accuracy: 90.51,
        features: ["naive_bayes", "enhanced"],
      }
    );
    
    console.log("✅ Model trained and saved successfully!");
    console.log("📍 Model location: src/data/models/naive_bayes_classifier.json");
    
  } catch (error) {
    console.error("❌ Error training model:", error);
    process.exit(1);
  }
}

trainAndSaveModel();
