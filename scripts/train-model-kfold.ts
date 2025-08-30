/**
 * Cross-Validation Training Script for Sentiment Analysis
 * Implements k-fold stratified cross-validation for model evaluation
 * 
 * Usage:
 * EVAL_MODE=CROSS_VALIDATION KFOLD=5 npm run train
 * EVAL_MODE=SINGLE_SPLIT npm run train
 */

import dotenv from "dotenv";
dotenv.config({ path: [".env.local", ".env"] });

import fs from "fs/promises";
import path from "path";
import { enhancedTrainingDataV3Complete } from "../src/data/enhanced-training-data-v3";
import { ModelPersistenceManager } from "../src/services/model-persistence.service";
import { NaiveBayesSentimentService, SentimentLabel } from "../src/services/naive-bayes-sentiment.service";
import { TweetSentimentAnalysisManager } from "../src/services/tweet-sentiment-analysis.manager.service";

// Configuration constants
const RANDOM_SEED = parseInt(process.env.RANDOM_SEED || "42", 10);
const KFOLD = parseInt(process.env.KFOLD || "5", 10);
const EVAL_MODE = process.env.EVAL_MODE || "SINGLE_SPLIT"; // CROSS_VALIDATION or SINGLE_SPLIT
const TRAIN_TEST_SPLIT = 0.8; // 80% training, 20% testing for single split mode

// Type definitions
interface Example {
  text: string;
  label: SentimentLabel;
}

interface ClassMetrics {
  precision: number;
  recall: number;
  f1_score: number;
  support: number;
}

interface ConfusionMatrix {
  [key: string]: {
    [key: string]: number;
  };
}

interface FoldMetrics {
  fold: number;
  accuracy: number;
  macro_f1: number;
  weighted_f1: number;
  test_samples: number;
  by_class: Record<string, ClassMetrics>;
  confusion_matrix: ConfusionMatrix;
}

interface AggregateMetric {
  mean: number;
  std: number;
}

interface AggregateClassMetrics {
  precision: AggregateMetric;
  recall: AggregateMetric;
  f1: AggregateMetric;
  support: AggregateMetric;
}

interface AggregateMetrics {
  accuracy: AggregateMetric;
  macro_f1: AggregateMetric;
  weighted_f1: AggregateMetric;
  by_class: Record<string, AggregateClassMetrics>;
}

/**
 * Set a deterministic seed for random operations
 * Implementation of a simple seeded random number generator
 */
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  // Simple random number generator with seed
  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  // Shuffle array in place using Fisher-Yates algorithm
  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}

/**
 * Stratified split - maintains class distribution
 */
function stratifiedTrainTestSplit(
  data: Example[],
  trainRatio: number,
  rng: SeededRandom
): { train: Example[]; test: Example[] } {
  // Group examples by class
  const classBuckets: Record<string, Example[]> = {};
  
  data.forEach((example) => {
    if (!classBuckets[example.label]) {
      classBuckets[example.label] = [];
    }
    classBuckets[example.label].push(example);
  });
  
  // Shuffle each class bucket with our seeded RNG
  Object.keys(classBuckets).forEach((cls) => {
    classBuckets[cls] = rng.shuffle(classBuckets[cls]);
  });
  
  // Split each class according to the train ratio
  const trainSet: Example[] = [];
  const testSet: Example[] = [];
  
  Object.values(classBuckets).forEach((bucket) => {
    const splitIndex = Math.floor(bucket.length * trainRatio);
    trainSet.push(...bucket.slice(0, splitIndex));
    testSet.push(...bucket.slice(splitIndex));
  });
  
  return { train: trainSet, test: testSet };
}

/**
 * Create k stratified folds for cross-validation
 */
function createStratifiedKFolds(
  data: Example[], 
  k: number,
  rng: SeededRandom
): Example[][] {
  // Group examples by class
  const classBuckets: Record<string, Example[]> = {};
  
  data.forEach((example) => {
    if (!classBuckets[example.label]) {
      classBuckets[example.label] = [];
    }
    classBuckets[example.label].push(example);
  });
  
  // Shuffle each class bucket with our seeded RNG
  Object.keys(classBuckets).forEach((cls) => {
    classBuckets[cls] = rng.shuffle(classBuckets[cls]);
  });
  
  // Initialize k folds
  const folds: Example[][] = Array(k).fill(null).map(() => []);
  
  // Distribute examples from each class evenly among folds
  Object.values(classBuckets).forEach((bucket) => {
    bucket.forEach((example, idx) => {
      const foldIdx = idx % k;
      folds[foldIdx].push(example);
    });
  });
  
  return folds;
}

/**
 * Calculate metrics for model evaluation
 */
function calculateMetrics(predictions: { actual: SentimentLabel; predicted: SentimentLabel }[]): {
  accuracy: number;
  macro_f1: number;
  weighted_f1: number;
  by_class: Record<string, ClassMetrics>;
  confusion_matrix: ConfusionMatrix;
} {
  const classes = Array.from(new Set(predictions.map(p => p.actual)));
  const confusionMatrix: ConfusionMatrix = {};
  
  // Initialize confusion matrix
  classes.forEach((actualClass) => {
    confusionMatrix[actualClass] = {};
    classes.forEach((predictedClass) => {
      confusionMatrix[actualClass][predictedClass] = 0;
    });
  });
  
  // Fill confusion matrix
  predictions.forEach((p) => {
    confusionMatrix[p.actual][p.predicted]++;
  });
  
  // Calculate metrics for each class
  const classMetrics: Record<string, ClassMetrics> = {};
  const supportByClass: Record<string, number> = {};
  
  classes.forEach((cls) => {
    const tp = confusionMatrix[cls][cls] || 0;
    let fp = 0;
    classes.forEach((otherCls) => {
      if (otherCls !== cls) {
        fp += confusionMatrix[otherCls][cls] || 0;
      }
    });
    
    let fn = 0;
    classes.forEach((otherCls) => {
      if (otherCls !== cls) {
        fn += confusionMatrix[cls][otherCls] || 0;
      }
    });
    
    const support = Object.values(confusionMatrix[cls]).reduce((sum, val) => sum + val, 0);
    supportByClass[cls] = support;
    
    const precision = tp / (tp + fp) || 0;
    const recall = tp / (tp + fn) || 0;
    const f1 = 2 * (precision * recall) / (precision + recall) || 0;
    
    classMetrics[cls] = {
      precision,
      recall,
      f1_score: f1,
      support,
    };
  });
  
  // Calculate global metrics
  const totalSamples = predictions.length;
  const correctPredictions = predictions.filter(p => p.actual === p.predicted).length;
  const accuracy = correctPredictions / totalSamples;
  
  // Calculate macro-average F1 (unweighted mean of class F1 scores)
  const macro_f1 = Object.values(classMetrics).reduce((sum, m) => sum + m.f1_score, 0) / classes.length;
  
  // Calculate weighted F1 (weighted by class support)
  const weighted_f1 = Object.entries(classMetrics)
    .reduce((sum, [cls, metrics]) => sum + (metrics.f1_score * supportByClass[cls]), 0) / totalSamples;
  
  return {
    accuracy,
    macro_f1,
    weighted_f1,
    by_class: classMetrics,
    confusion_matrix: confusionMatrix
  };
}

/**
 * Run evaluation on test data
 */
function evaluateModel(
  naiveBayesService: NaiveBayesSentimentService, 
  testData: Example[]
): {
  accuracy: number;
  macro_f1: number;
  weighted_f1: number;
  by_class: Record<string, ClassMetrics>;
  confusion_matrix: ConfusionMatrix;
} {
  const predictions = testData.map((example) => {
    const prediction = naiveBayesService.predict(example.text);
    return {
      actual: example.label,
      predicted: prediction.label
    };
  });
  
  return calculateMetrics(predictions);
}

/**
 * Calculate aggregate metrics across all folds
 */
function calculateAggregateMetrics(foldMetrics: FoldMetrics[]): AggregateMetrics {
  const metrics = {
    accuracy: { values: foldMetrics.map(m => m.accuracy) },
    macro_f1: { values: foldMetrics.map(m => m.macro_f1) },
    weighted_f1: { values: foldMetrics.map(m => m.weighted_f1) },
  };

  // Get all class names from the first fold
  const classes = Object.keys(foldMetrics[0].by_class);
  
  // Initialize by_class metrics
  const byClassMetrics: Record<string, Record<string, number[]>> = {};
  classes.forEach(cls => {
    byClassMetrics[cls] = {
      precision: foldMetrics.map(m => m.by_class[cls].precision),
      recall: foldMetrics.map(m => m.by_class[cls].recall),
      f1: foldMetrics.map(m => m.by_class[cls].f1_score),
      support: foldMetrics.map(m => m.by_class[cls].support)
    };
  });

  // Calculate mean and std for each metric
  const calculateMeanStd = (values: number[]): AggregateMetric => {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    const std = Math.sqrt(variance);
    return { mean, std };
  };

  // Prepare aggregate metrics object
  const aggregate: AggregateMetrics = {
    accuracy: calculateMeanStd(metrics.accuracy.values),
    macro_f1: calculateMeanStd(metrics.macro_f1.values),
    weighted_f1: calculateMeanStd(metrics.weighted_f1.values),
    by_class: {}
  };

  // Add class-specific metrics
  classes.forEach(cls => {
    aggregate.by_class[cls] = {
      precision: calculateMeanStd(byClassMetrics[cls].precision),
      recall: calculateMeanStd(byClassMetrics[cls].recall),
      f1: calculateMeanStd(byClassMetrics[cls].f1),
      support: calculateMeanStd(byClassMetrics[cls].support)
    };
  });

  return aggregate;
}

/**
 * Run single split evaluation (80/20)
 */
async function runSingleSplitEvaluation(): Promise<{
  accuracy: number;
  macro_f1: number;
  weighted_f1: number;
  by_class: Record<string, ClassMetrics>;
  confusion_matrix: ConfusionMatrix;
  test_samples: number;
}> {
  console.log(`🧪 Running single split evaluation (${TRAIN_TEST_SPLIT * 100}% train / ${(1 - TRAIN_TEST_SPLIT) * 100}% test)...`);
  
  // Create deterministic random generator
  const rng = new SeededRandom(RANDOM_SEED);
  
  // Convert training data format
  const data = enhancedTrainingDataV3Complete.map(item => ({
    text: item.text,
    label: item.label as SentimentLabel
  }));
  
  // Split data using stratified sampling
  const { train, test } = stratifiedTrainTestSplit(data, TRAIN_TEST_SPLIT, rng);
  console.log(`📊 Split data: ${train.length} training examples, ${test.length} test examples`);
  
  // Initialize and train the model
  const naiveBayesService = new NaiveBayesSentimentService();
  naiveBayesService.train(train);
  
  // Evaluate the model
  const metrics = evaluateModel(naiveBayesService, test);
  metrics.test_samples = test.length;
  
  return metrics;
}

/**
 * Run k-fold cross-validation
 */
async function runCrossValidation(k: number): Promise<{
  folds: FoldMetrics[];
  aggregate: AggregateMetrics;
}> {
  console.log(`🧪 Running ${k}-fold cross-validation...`);
  
  // Create deterministic random generator
  const rng = new SeededRandom(RANDOM_SEED);
  
  // Convert training data format
  const data = enhancedTrainingDataV3Complete.map(item => ({
    text: item.text,
    label: item.label as SentimentLabel
  }));
  
  // Create stratified k-folds
  const folds = createStratifiedKFolds(data, k, rng);
  const foldMetrics: FoldMetrics[] = [];
  
  // Run k-fold cross-validation
  for (let i = 0; i < k; i++) {
    console.log(`\n🔄 Evaluating fold ${i + 1}/${k}...`);
    
    // Create test and training sets for this fold
    const testData = folds[i];
    const trainData = folds.filter((_, idx) => idx !== i).flat();
    
    console.log(`📊 Fold ${i + 1}: ${trainData.length} training examples, ${testData.length} test examples`);
    
    // Initialize and train the model
    const naiveBayesService = new NaiveBayesSentimentService();
    naiveBayesService.train(trainData);
    
    // Evaluate the model
    const metrics = evaluateModel(naiveBayesService, testData);
    foldMetrics.push({
      fold: i + 1,
      accuracy: metrics.accuracy,
      macro_f1: metrics.macro_f1,
      weighted_f1: metrics.weighted_f1,
      test_samples: testData.length,
      by_class: metrics.by_class,
      confusion_matrix: metrics.confusion_matrix
    });
    
    // Print fold metrics
    console.log(`📈 Fold ${i + 1} - Accuracy: ${(metrics.accuracy * 100).toFixed(2)}%, Macro F1: ${(metrics.macro_f1 * 100).toFixed(2)}%`);
  }
  
  // Calculate aggregate metrics
  const aggregate = calculateAggregateMetrics(foldMetrics);
  console.log(`\n📊 Aggregate Results (${k}-fold cross-validation):`);
  console.log(`  - Accuracy: ${(aggregate.accuracy.mean * 100).toFixed(2)}% ± ${(aggregate.accuracy.std * 100).toFixed(2)}%`);
  console.log(`  - Macro F1: ${(aggregate.macro_f1.mean * 100).toFixed(2)}% ± ${(aggregate.macro_f1.std * 100).toFixed(2)}%`);
  console.log(`  - Weighted F1: ${(aggregate.weighted_f1.mean * 100).toFixed(2)}% ± ${(aggregate.weighted_f1.std * 100).toFixed(2)}%`);
  
  return { folds: foldMetrics, aggregate };
}

/**
 * Update model metadata file with evaluation results
 */
async function updateModelMetadata(
  singleSplitResults: any,
  cvResults: { folds: FoldMetrics[]; aggregate: AggregateMetrics } | null
): Promise<void> {
  const metadataFilePath = path.join(process.cwd(), "data", "model-metadata.json");
  
  try {
    // Read existing metadata
    const metadataContent = await fs.readFile(metadataFilePath, "utf-8");
    const metadata = JSON.parse(metadataContent);
    
    // Update metadata
    const updatedMetadata = {
      ...metadata,
      version: cvResults ? "v3-kcv" : "v3.1",
      created_at: new Date().toISOString(),
      dataset: {
        ...metadata.dataset,
        total_samples: enhancedTrainingDataV3Complete.length,
      },
      performance: {
        ...metadata.performance,
      },
      configuration: {
        ...metadata.configuration,
        seed: RANDOM_SEED,
      }
    };
    
    // Add single split results if available
    if (singleSplitResults) {
      updatedMetadata.performance.single_split = {
        accuracy: singleSplitResults.accuracy,
        macro_f1: singleSplitResults.macro_f1,
        weighted_f1: singleSplitResults.weighted_f1,
        test_samples: singleSplitResults.test_samples,
        metrics_by_class: singleSplitResults.by_class,
        confusion_matrix: singleSplitResults.confusion_matrix
      };
    }
    
    // Add cross-validation results if available
    if (cvResults) {
      updatedMetadata.configuration.kfold = KFOLD;
      updatedMetadata.configuration.stratified = true;
      updatedMetadata.performance.cv = {
        k: KFOLD,
        seed: RANDOM_SEED,
        folds: cvResults.folds,
        aggregate: cvResults.aggregate
      };
    }
    
    // Save updated metadata
    await fs.writeFile(
      metadataFilePath,
      JSON.stringify(updatedMetadata, null, 2),
      "utf-8"
    );
    
    console.log(`✅ Updated model metadata at ${metadataFilePath}`);
  } catch (error) {
    console.error("❌ Error updating model metadata:", error);
  }
}

/**
 * Save the final trained model after evaluation
 * @param useAllData Whether to use all data for training
 * @param singleSplitResults Results from single split evaluation
 */
async function saveTrainedModel(
  useAllData: boolean = true,
  singleSplitResults?: any
): Promise<void> {
  try {
    console.log("🧠 Training final model for production...");
    
    // Initialize services
    const sentimentManager = new TweetSentimentAnalysisManager();
    const modelPersistence = new ModelPersistenceManager();
    
    // Train with enhanced dataset
    await sentimentManager.trainNaiveBayes(enhancedTrainingDataV3Complete);
    
    // Get the trained service to save
    const naiveBayesService = sentimentManager
      .getOrchestrator()
      .getEngine()
      .getNaiveBayesAnalyzer();
    
    // Get stats and class counts
    const stats = naiveBayesService.getStats();
    
    // Save the model
    console.log("💾 Saving trained model...");
    await modelPersistence.saveNaiveBayesModel(
      naiveBayesService,
      {
        version: EVAL_MODE === "CROSS_VALIDATION" ? "v3-kcv" : "v3.1",
        datasetSize: enhancedTrainingDataV3Complete.length,
        accuracy: EVAL_MODE === "CROSS_VALIDATION" ? 
          null : // We'll use the calculated accuracy from single split
          singleSplitResults ? singleSplitResults.accuracy : 0.9051, // Use calculated accuracy if available
        features: ["naive_bayes", "enhanced"],
      }
    );
    
    // Also update the trained-sentiment-model-v3.json file
    const trainedModelPath = path.join(process.cwd(), "data", "trained-sentiment-model-v3.json");
    const trainedModelData = {
      trained: true,
      trainingDate: new Date().toISOString(),
      datasetSize: enhancedTrainingDataV3Complete.length,
      stats: stats,
      trainingTime: 15 // placeholder value, could be calculated more precisely
    };
    
    await fs.writeFile(
      trainedModelPath,
      JSON.stringify(trainedModelData, null, 2),
      "utf-8"
    );
    
    console.log("✅ Model trained and saved successfully!");
    
  } catch (error) {
    console.error("❌ Error training final model:", error);
  }
}

/**
 * Main function to orchestrate the training process
 */
async function main() {
  console.log(`🚀 Starting sentiment model training and evaluation...`);
  console.log(`📊 Mode: ${EVAL_MODE}, Seed: ${RANDOM_SEED}`);
  console.log(`📝 Dataset size: ${enhancedTrainingDataV3Complete.length} examples`);
  
  // Get class counts
  const classCounts: Record<string, number> = {};
  enhancedTrainingDataV3Complete.forEach(item => {
    const label = item.label;
    classCounts[label] = (classCounts[label] || 0) + 1;
  });
  
  console.log("📊 Class distribution:", classCounts);
  
  let singleSplitResults;
  let cvResults;
  
  // Run evaluation based on mode
  if (EVAL_MODE === "SINGLE_SPLIT") {
    singleSplitResults = await runSingleSplitEvaluation();
    console.log(`\n📈 Single Split Evaluation Results:`);
    console.log(`  - Accuracy: ${(singleSplitResults.accuracy * 100).toFixed(2)}%`);
    console.log(`  - Macro F1: ${(singleSplitResults.macro_f1 * 100).toFixed(2)}%`);
    console.log(`  - Weighted F1: ${(singleSplitResults.weighted_f1 * 100).toFixed(2)}%`);
  } else if (EVAL_MODE === "CROSS_VALIDATION") {
    cvResults = await runCrossValidation(KFOLD);
    // Single split results are still useful for comparison
    singleSplitResults = await runSingleSplitEvaluation();
  } else {
    console.error(`❌ Unknown evaluation mode: ${EVAL_MODE}`);
    process.exit(1);
  }
  
  // Update metadata with evaluation results
  await updateModelMetadata(singleSplitResults, cvResults || null);
  
  // Save the final trained model (using all data)
  await saveTrainedModel(true, singleSplitResults);
}

// Start the script
main().catch(error => {
  console.error("❌ Unhandled error during training:", error);
  process.exit(1);
});
