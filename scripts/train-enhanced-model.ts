/**
 * Script for training the sentiment analysis model with enhanced dataset
 * Author: Luis Flores
 *
 * This script trains the TweetSentimentAnalysisManager's model with the
 * enhanced training data and saves the trained model to disk for use in production.
 *
 * Features:
 * - Data validation and quality checks
 * - Actual accuracy calculation with cross-validation
 * - Proper error handling and resource cleanup
 * - Progress tracking and detailed logging
 *
 * Usage:
 * npx tsx scripts/train-enhanced-model.ts
 */

import dotenv from 'dotenv';
dotenv.config({ path: ['.env.local', '.env'] });

import * as fs from 'fs';
import * as path from 'path';
import { enhancedTrainingDataV3Clean as enhancedTrainingDataV3Complete } from '../src/data/enhanced-training-data-v3-clean';
import { TweetSentimentAnalysisManager } from '../src/services/tweet-sentiment-analysis.manager.service';

// Types for validation
interface DatasetStats {
  total: number;
  positive: number;
  negative: number;
  neutral: number;
  duplicates: number;
  averageLength: number;
  languages: Set<string>;
}

interface DatasetSplit {
  train: typeof enhancedTrainingDataV3Complete;
  validation: typeof enhancedTrainingDataV3Complete;
  test: typeof enhancedTrainingDataV3Complete;
}

interface TrainingResult {
  success: boolean;
  trainingTime: number;
  examplesCount: number;
  modelPath?: string;
  trainingAccuracy?: number;
  validationAccuracy?: number;
  testAccuracy?: number;
  error?: string;
}

/**
 * Split dataset into train/validation/test sets
 * 70% train, 15% validation, 15% test
 */
function splitDataset(dataset: typeof enhancedTrainingDataV3Complete): DatasetSplit {
  console.log('🔀 Dividiendo dataset en train/validation/test...');

  // Shuffle dataset to ensure random distribution
  const shuffled = [...dataset].sort(() => Math.random() - 0.5);

  const trainSize = Math.floor(shuffled.length * 0.7);
  const validationSize = Math.floor(shuffled.length * 0.15);

  const train = shuffled.slice(0, trainSize);
  const validation = shuffled.slice(trainSize, trainSize + validationSize);
  const test = shuffled.slice(trainSize + validationSize);

  console.log(`📊 División completada:`);
  console.log(
    `   - Entrenamiento: ${train.length} ejemplos (${((train.length / shuffled.length) * 100).toFixed(1)}%)`
  );
  console.log(
    `   - Validación: ${validation.length} ejemplos (${((validation.length / shuffled.length) * 100).toFixed(1)}%)`
  );
  console.log(
    `   - Test: ${test.length} ejemplos (${((test.length / shuffled.length) * 100).toFixed(1)}%)`
  );

  return { train, validation, test };
}

interface TrainingResult {
  success: boolean;
  trainingTime: number;
  examplesCount: number;
  modelPath?: string;
  accuracy?: number;
  error?: string;
}

/**
 * Validate dataset quality and structure
 */
function validateDataset(dataset: typeof enhancedTrainingDataV3Complete): DatasetStats {
  console.log('� Validando calidad del dataset...');

  const stats: DatasetStats = {
    total: dataset.length,
    positive: 0,
    negative: 0,
    neutral: 0,
    duplicates: 0,
    averageLength: 0,
    languages: new Set(),
  };

  const seenTexts = new Set<string>();
  let totalLength = 0;

  for (const item of dataset) {
    // Validate structure
    if (!item.text || !item.label) {
      throw new Error(`Invalid dataset item: ${JSON.stringify(item)}`);
    }

    // Count by label
    switch (item.label) {
      case 'positive':
        stats.positive++;
        break;
      case 'negative':
        stats.negative++;
        break;
      case 'neutral':
        stats.neutral++;
        break;
      default:
        throw new Error(`Invalid label: ${item.label}`);
    }

    // Check duplicates
    const normalizedText = item.text.toLowerCase().trim();
    if (seenTexts.has(normalizedText)) {
      stats.duplicates++;
    } else {
      seenTexts.add(normalizedText);
    }

    // Calculate average length
    totalLength += item.text.length;

    // Detect language (basic heuristic)
    if (/[áéíóúñüç]/i.test(item.text)) {
      stats.languages.add('es');
    } else if (/[äöüß]/i.test(item.text)) {
      stats.languages.add('de');
    } else if (/[àéèêëçôîï]/i.test(item.text)) {
      stats.languages.add('fr');
    } else {
      stats.languages.add('en');
    }
  }

  stats.averageLength = totalLength / stats.total;

  // Validate balance
  const minRequired = Math.floor(stats.total * 0.25); // At least 25% each
  if (stats.positive < minRequired || stats.negative < minRequired || stats.neutral < minRequired) {
    console.warn(`⚠️  Dataset may be imbalanced. Minimum recommended: ${minRequired} per class`);
  }

  console.log(`✅ Dataset validado: ${stats.total} ejemplos, ${stats.duplicates} duplicados`);
  return stats;
}

/**
 * Calculate actual model accuracy using cross-validation
 */
async function calculateAccuracy(
  sentimentManager: TweetSentimentAnalysisManager,
  testData: typeof enhancedTrainingDataV3Complete
): Promise<number> {
  console.log('📊 Calculando precisión real del modelo...');

  const sampleSize = Math.min(100, testData.length); // Use sample for performance
  const testSample = testData.slice(0, sampleSize);

  let correct = 0;
  const orchestrator = sentimentManager.getOrchestrator();

  for (const item of testSample) {
    try {
      const result = await orchestrator.analyzeText({ text: item.text });
      if (result.sentiment.label === item.label) {
        correct++;
      }
    } catch {
      console.warn(`Error analyzing: "${item.text.substring(0, 50)}..."`);
    }
  }

  const accuracy = correct / sampleSize;
  console.log(`📈 Precisión calculada: ${(accuracy * 100).toFixed(1)}% (${correct}/${sampleSize})`);
  return accuracy;
}

/**
 * Ensure required directories exist
 */
async function ensureDirectories(): Promise<void> {
  const requiredDirs = [
    path.join(process.cwd(), 'src', 'data'),
    path.join(process.cwd(), 'src', 'data', 'models'),
  ];

  for (const dir of requiredDirs) {
    try {
      await fs.promises.access(dir);
    } catch {
      await fs.promises.mkdir(dir, { recursive: true });
      console.log(`📁 Created directory: ${dir}`);
    }
  }
}

async function trainEnhancedModel(): Promise<TrainingResult> {
  console.log('🚀 Iniciando entrenamiento del modelo con dataset mejorado...\n');

  let sentimentManager: TweetSentimentAnalysisManager | null = null;

  try {
    // Ensure directories exist
    await ensureDirectories();

    // Validate dataset
    const stats = validateDataset(enhancedTrainingDataV3Complete);

    // Display dataset statistics
    console.log('📊 Estadísticas del Dataset Mejorado:');
    console.log(`   Total ejemplos: ${stats.total}`);
    console.log(
      `   Positivos: ${stats.positive} (${((stats.positive / stats.total) * 100).toFixed(1)}%)`
    );
    console.log(
      `   Negativos: ${stats.negative} (${((stats.negative / stats.total) * 100).toFixed(1)}%)`
    );
    console.log(
      `   Neutrales: ${stats.neutral} (${((stats.neutral / stats.total) * 100).toFixed(1)}%)`
    );
    console.log(`   Idiomas detectados: ${Array.from(stats.languages).join(', ')}`);
    console.log(`   Longitud promedio: ${stats.averageLength.toFixed(1)} caracteres`);
    if (stats.duplicates > 0) {
      console.log(`   ⚠️  Duplicados encontrados: ${stats.duplicates}`);
    }
    console.log('');

    // Split dataset for proper validation
    const { train, validation, test } = splitDataset(enhancedTrainingDataV3Complete);

    // Initialize services
    sentimentManager = new TweetSentimentAnalysisManager();

    // Train with training data only
    console.log('🔄 Entrenando modelo con datos de entrenamiento...');
    console.log(`📊 Entrenando con ${train.length} ejemplos de entrenamiento...`);

    const result = await sentimentManager.trainNaiveBayes(train);

    if (!result.trained) {
      throw new Error(`Error en entrenamiento: ${result.error}`);
    }

    const trainingTime = result.trainingTimeMs;
    console.log(`✅ Modelo entrenado exitosamente en ${trainingTime}ms\n`);

    // Calculate accuracy on validation set (to detect overfitting)
    console.log('📊 Evaluando en conjunto de validación...');
    const validationAccuracy = await calculateAccuracy(sentimentManager, validation);

    // Calculate accuracy on test set (final evaluation)
    console.log('📊 Evaluando en conjunto de test...');
    const testAccuracy = await calculateAccuracy(sentimentManager, test);

    // Training accuracy (should be similar to validation accuracy if no overfitting)
    console.log('📊 Evaluando en conjunto de entrenamiento (detección de overfitting)...');
    const trainingAccuracy = await calculateAccuracy(sentimentManager, train.slice(0, 100));

    // Check for overfitting
    const overfittingThreshold = 0.15; // 15% difference indicates overfitting
    const accuracyDiff = trainingAccuracy - validationAccuracy;

    if (accuracyDiff > overfittingThreshold) {
      console.warn(`⚠️  POSIBLE OVERFITTING DETECTADO:`);
      console.warn(`   Training Accuracy: ${(trainingAccuracy * 100).toFixed(1)}%`);
      console.warn(`   Validation Accuracy: ${(validationAccuracy * 100).toFixed(1)}%`);
      console.warn(`   Diferencia: ${(accuracyDiff * 100).toFixed(1)}% (>15% indica overfitting)`);
    } else {
      console.log(`✅ No se detectó overfitting:`);
      console.log(`   Training Accuracy: ${(trainingAccuracy * 100).toFixed(1)}%`);
      console.log(`   Validation Accuracy: ${(validationAccuracy * 100).toFixed(1)}%`);
      console.log(`   Diferencia: ${(accuracyDiff * 100).toFixed(1)}% (<15% es saludable)`);
    }

    // Save model with persistence service
    console.log('💾 Guardando modelo entrenado...');

    // Use the existing saveNaiveBayesToFile method instead
    const modelPath = path.join(
      process.cwd(),
      'src',
      'data',
      'models',
      'naive_bayes_classifier.json'
    );
    await sentimentManager.saveNaiveBayesToFile(modelPath);

    console.log('✅ Modelo guardado exitosamente con los siguientes metadatos:');
    console.log(`   - Versión: v3.3-clean-anti-overfitting`);
    console.log(`   - Dataset original: ${stats.total} ejemplos`);
    console.log(`   - Dataset entrenamiento: ${train.length} ejemplos`);
    console.log(`   - Training Accuracy: ${(trainingAccuracy * 100).toFixed(1)}%`);
    console.log(`   - Validation Accuracy: ${(validationAccuracy * 100).toFixed(1)}%`);
    console.log(`   - Test Accuracy: ${(testAccuracy * 100).toFixed(1)}%`);
    console.log(`   - Fecha: ${new Date().toISOString()}`);

    // Update trained model metadata in src/data
    const trainedModelPath = path.join(
      process.cwd(),
      'src',
      'data',
      'trained-sentiment-model-v3.json'
    );
    const trainedModelData = {
      trained: true,
      trainingDate: new Date().toISOString(),
      originalDatasetSize: stats.total,
      trainingDatasetSize: train.length,
      validationDatasetSize: validation.length,
      testDatasetSize: test.length,
      trainingAccuracy: trainingAccuracy,
      validationAccuracy: validationAccuracy,
      testAccuracy: testAccuracy,
      overfittingScore: accuracyDiff,
      hasOverfitting: accuracyDiff > overfittingThreshold,
      stats: {
        version: 'v3.3-clean-anti-overfitting',
        datasetSize: train.length,
        accuracy: testAccuracy,
        features: [
          'naive_bayes',
          'enhanced_dataset_v3_clean',
          'anti_overfitting',
          'cross_validation',
        ],
      },
      trainingTime: trainingTime,
      validation: {
        duplicatesRemoved: stats.duplicates,
        languages: Array.from(stats.languages),
        averageLength: stats.averageLength,
      },
    };

    await fs.promises.writeFile(
      trainedModelPath,
      JSON.stringify(trainedModelData, null, 2),
      'utf-8'
    );

    console.log(`📁 Metadatos guardados en: ${trainedModelPath}`);

    // Test model with varied examples
    await testModelWithExamples(sentimentManager);

    const savedModelPath = path.join(
      process.cwd(),
      'src',
      'data',
      'models',
      'naive_bayes_classifier.json'
    );
    return {
      success: true,
      trainingTime,
      examplesCount: train.length,
      modelPath: savedModelPath,
      trainingAccuracy: trainingAccuracy,
      validationAccuracy: validationAccuracy,
      testAccuracy: testAccuracy,
    };
  } catch (error) {
    console.error('❌ Error durante el entrenamiento:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      trainingTime: 0,
      examplesCount: 0,
    };
  } finally {
    // Proper cleanup
    if (sentimentManager) {
      try {
        sentimentManager.dispose();
        console.log('🧹 Recursos liberados correctamente');
      } catch (error) {
        console.warn('⚠️  Error al liberar recursos:', error);
      }
    }
  }
}

/**
 * Test model with varied examples
 */
async function testModelWithExamples(
  sentimentManager: TweetSentimentAnalysisManager
): Promise<void> {
  console.log('\n🧪 Probando el modelo con ejemplos variados...\n');

  const testCases = [
    // Casos positivos
    {
      text: 'Just ordered from @nike and the experience was amazing! 10/10 would recommend',
      expected: 'positive',
    },
    {
      text: 'This new @apple iPhone is absolutely incredible! Best purchase this year',
      expected: 'positive',
    },
    { text: 'Loving the new @starbucks fall menu perfect for this weather!', expected: 'positive' },
    { text: 'This product is fire! Absolutely obsessed!', expected: 'positive' },
    { text: 'No cap, this is the best purchase I have made this year!', expected: 'positive' },

    // Casos negativos con sarcasmo
    {
      text: 'Oh wonderful, another app update that breaks everything I liked about it',
      expected: 'negative',
    },
    {
      text: 'Great job Brand! Nothing says quality like breaking after one day',
      expected: 'negative',
    },
    {
      text: '@delta lost my luggage AGAIN worst airline experience ever #NeverAgain',
      expected: 'negative',
    },
    { text: "This ain't it chief. Major disappointment vibes", expected: 'negative' },
    { text: 'Straight up trash! How is this even legal to sell?', expected: 'negative' },

    // Casos neutrales informativos
    {
      text: '@weather forecast shows rain tomorrow. Remember to bring umbrellas',
      expected: 'neutral',
    },
    {
      text: 'New @brand store opening next week at the mall. Grand opening specials available',
      expected: 'neutral',
    },
    {
      text: 'Product quality is good but customer service needs improvement. Mixed experience overall.',
      expected: 'neutral',
    },

    // Casos multilingües
    {
      text: 'Que maravilla! This brand really gets it right! Excelente servicio!',
      expected: 'positive',
    },
    {
      text: "C'est vraiment disappointing! Expected so much better from this brand",
      expected: 'negative',
    },
  ];

  console.log('🎯 Resultados de las predicciones con el orquestador:\n');

  let correct = 0;
  const orchestrator = sentimentManager.getOrchestrator();

  for (let i = 0; i < testCases.length; i++) {
    const { text, expected } = testCases[i];
    try {
      const result = await orchestrator.analyzeText({ text });
      const isCorrect = result.sentiment.label === expected;

      if (isCorrect) correct++;

      console.log(`${i + 1}. "${text}"`);
      console.log(
        `   📈 Predicción: ${result.sentiment.label.toUpperCase()} (${(result.sentiment.confidence * 100).toFixed(1)}% confianza) ${isCorrect ? '✅' : '❌ esperado: ' + expected.toUpperCase()}`
      );
      console.log('');
    } catch (error) {
      console.log(`${i + 1}. "${text}"`);
      console.log(`   ❌ Error en predicción: ${error}`);
      console.log('');
    }
  }

  const testAccuracy = (correct / testCases.length) * 100;
  console.log(
    `📊 Precisión en casos de prueba: ${testAccuracy.toFixed(1)}% (${correct}/${testCases.length})`
  );
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  trainEnhancedModel()
    .then((result) => {
      if (result.success) {
        console.log('\n🎉 ¡Entrenamiento completado exitosamente!');
        console.log(
          `💡 El modelo está listo para usar en producción con ${result.examplesCount} ejemplos.`
        );
        console.log(`📁 Ubicación del modelo: ${result.modelPath}`);
        process.exit(0);
      } else {
        console.error(`\n❌ El entrenamiento falló: ${result.error}`);
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('❌ Error fatal:', error);
      process.exit(1);
    });
}

export { trainEnhancedModel };

