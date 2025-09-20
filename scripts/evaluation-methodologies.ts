/**
 * Script de Evaluación con Metodologías Avanzadas
 * 
 * Incluye:
 * - Validación Cruzada (K-Fold)
 * - Hold-out Validation
 * - Stratified Sampling
 * - Bootstrap Sampling
 * - Métricas detalladas (Precision, Recall, F1-Score, Accuracy)
 * - Análisis de confianza estadística
 * - Comparación de múltiples modelos
 */

import { enhancedTrainingDataV3Clean, SentimentTrainingItem } from '../src/data/enhanced-training-data-v3-clean';
import { SentimentAnalysisEngine } from '../src/lib/sentiment/engine';
import { EnhancedSentimentEngine } from '../src/lib/sentiment/enhanced-engine';
import { SentimentAnalysisOrchestrator } from '../src/lib/sentiment/orchestrator';

// Tipos para evaluación
interface EvaluationResult {
  accuracy: number;
  precision: { positive: number; negative: number; neutral: number; macro: number; };
  recall: { positive: number; negative: number; neutral: number; macro: number; };
  f1Score: { positive: number; negative: number; neutral: number; macro: number; };
  confusionMatrix: Record<string, Record<string, number>>;
  predictions: Array<{
    text: string;
    actual: string;
    predicted: string;
    confidence: number;
    correct: boolean;
  }>;
}

interface CrossValidationResult {
  folds: EvaluationResult[];
  mean: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
  };
  std: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
  };
  confidenceInterval: {
    accuracy: [number, number];
    precision: [number, number];
    recall: [number, number];
    f1Score: [number, number];
  };
}

interface ModelComparison {
  models: Record<string, CrossValidationResult>;
  bestModel: string;
  rankingByMetric: Record<string, string[]>;
}

class EvaluationFramework {
  
  /**
   * Realiza validación cruzada K-Fold
   */
  static async kFoldCrossValidation(
    data: SentimentTrainingItem[],
    k: number = 5,
    modelFactory: () => any,
    modelName: string = 'Model'
  ): Promise<CrossValidationResult> {
    console.log(`\n🔄 Iniciando validación cruzada ${k}-Fold para ${modelName}...`);
    
    // Estratificación - mantener proporción de clases en cada fold
    const stratifiedFolds = this.createStratifiedFolds(data, k);
    const foldResults: EvaluationResult[] = [];
    
    for (let i = 0; i < k; i++) {
      console.log(`\n📊 Evaluando Fold ${i + 1}/${k}...`);
      
      // Crear train y test sets
      const testSet = stratifiedFolds[i];
      const trainSet = stratifiedFolds
        .filter((_, index) => index !== i)
        .flat();
      
      console.log(`   Train size: ${trainSet.length}, Test size: ${testSet.length}`);
      
      // Entrenar modelo
      const model = modelFactory();
      if (model.train) {
        await model.train(trainSet);
      }
      
      // Evaluar
      const result = await this.evaluateModel(model, testSet, `Fold-${i + 1}`);
      foldResults.push(result);
      
      console.log(`   Fold ${i + 1} Accuracy: ${(result.accuracy * 100).toFixed(2)}%`);
    }
    
    // Calcular estadísticas agregadas
    const stats = this.calculateCrossValidationStats(foldResults);
    
    console.log(`\n📈 Resultados ${k}-Fold Cross Validation para ${modelName}:`);
    console.log(`   Accuracy: ${(stats.mean.accuracy * 100).toFixed(2)}% ± ${(stats.std.accuracy * 100).toFixed(2)}%`);
    console.log(`   Precision: ${(stats.mean.precision * 100).toFixed(2)}% ± ${(stats.std.precision * 100).toFixed(2)}%`);
    console.log(`   Recall: ${(stats.mean.recall * 100).toFixed(2)}% ± ${(stats.std.recall * 100).toFixed(2)}%`);
    console.log(`   F1-Score: ${(stats.mean.f1Score * 100).toFixed(2)}% ± ${(stats.std.f1Score * 100).toFixed(2)}%`);
    
    return stats;
  }
  
  /**
   * Hold-out validation (train/validation/test split)
   */
  static async holdOutValidation(
    data: SentimentTrainingItem[],
    trainRatio: number = 0.7,
    validationRatio: number = 0.15,
    testRatio: number = 0.15,
    modelFactory: () => any,
    modelName: string = 'Model'
  ): Promise<{train: EvaluationResult; validation: EvaluationResult; test: EvaluationResult}> {
    console.log(`\n🎯 Iniciando Hold-out Validation para ${modelName}...`);
    console.log(`   Train: ${(trainRatio * 100)}%, Validation: ${(validationRatio * 100)}%, Test: ${(testRatio * 100)}%`);
    
    // Estratified split
    const { trainSet, validationSet, testSet } = this.stratifiedSplit(
      data, trainRatio, validationRatio, testRatio
    );
    
    console.log(`   Sizes - Train: ${trainSet.length}, Validation: ${validationSet.length}, Test: ${testSet.length}`);
    
    // Entrenar modelo
    const model = modelFactory();
    if (model.train) {
      await model.train(trainSet);
    }
    
    // Evaluar en todos los conjuntos
    const [trainResult, validationResult, testResult] = await Promise.all([
      this.evaluateModel(model, trainSet, 'Train'),
      this.evaluateModel(model, validationSet, 'Validation'),
      this.evaluateModel(model, testSet, 'Test')
    ]);
    
    console.log(`\n📊 Hold-out Results para ${modelName}:`);
    console.log(`   Train Accuracy: ${(trainResult.accuracy * 100).toFixed(2)}%`);
    console.log(`   Validation Accuracy: ${(validationResult.accuracy * 100).toFixed(2)}%`);
    console.log(`   Test Accuracy: ${(testResult.accuracy * 100).toFixed(2)}%`);
    
    return {
      train: trainResult,
      validation: validationResult,
      test: testResult
    };
  }
  
  /**
   * Bootstrap sampling evaluation
   */
  static async bootstrapValidation(
    data: SentimentTrainingItem[],
    nBootstraps: number = 100,
    sampleRatio: number = 0.8,
    modelFactory: () => any,
    modelName: string = 'Model'
  ): Promise<CrossValidationResult> {
    console.log(`\n🔀 Iniciando Bootstrap Validation para ${modelName}...`);
    console.log(`   ${nBootstraps} bootstrap samples, ${(sampleRatio * 100)}% sample ratio`);
    
    const results: EvaluationResult[] = [];
    const sampleSize = Math.floor(data.length * sampleRatio);
    
    for (let i = 0; i < nBootstraps; i++) {
      if (i % 20 === 0) {
        console.log(`   Bootstrap ${i + 1}/${nBootstraps}...`);
      }
      
      // Bootstrap sample with replacement
      const bootstrapSample = this.bootstrapSample(data, sampleSize);
      
      // Out-of-bag samples for testing
      const oobSamples = data.filter(item => 
        !bootstrapSample.some(sample => 
          sample.text === item.text && sample.label === item.label
        )
      );
      
      if (oobSamples.length === 0) continue;
      
      // Entrenar y evaluar
      const model = modelFactory();
      if (model.train) {
        await model.train(bootstrapSample);
      }
      
      const result = await this.evaluateModel(model, oobSamples, `Bootstrap-${i + 1}`);
      results.push(result);
    }
    
    const stats = this.calculateCrossValidationStats(results);
    
    console.log(`\n📈 Bootstrap Validation Results para ${modelName}:`);
    console.log(`   Accuracy: ${(stats.mean.accuracy * 100).toFixed(2)}% ± ${(stats.std.accuracy * 100).toFixed(2)}%`);
    console.log(`   Precision: ${(stats.mean.precision * 100).toFixed(2)}% ± ${(stats.std.precision * 100).toFixed(2)}%`);
    console.log(`   Recall: ${(stats.mean.recall * 100).toFixed(2)}% ± ${(stats.std.recall * 100).toFixed(2)}%`);
    console.log(`   F1-Score: ${(stats.mean.f1Score * 100).toFixed(2)}% ± ${(stats.std.f1Score * 100).toFixed(2)}%`);
    
    return stats;
  }
  
  /**
   * Compara múltiples modelos usando validación cruzada
   */
  static async compareModels(
    data: SentimentTrainingItem[],
    models: Array<{name: string; factory: () => any}>,
    k: number = 5
  ): Promise<ModelComparison> {
    console.log(`\n🏆 Comparando ${models.length} modelos usando ${k}-Fold Cross Validation...`);
    
    const results: Record<string, CrossValidationResult> = {};
    
    for (const model of models) {
      const result = await this.kFoldCrossValidation(data, k, model.factory, model.name);
      results[model.name] = result;
    }
    
    // Determinar mejor modelo por cada métrica
    const metrics = ['accuracy', 'precision', 'recall', 'f1Score'] as const;
    const ranking: Record<string, string[]> = {};
    
    metrics.forEach(metric => {
      ranking[metric] = Object.entries(results)
        .sort(([,a], [,b]) => b.mean[metric] - a.mean[metric])
        .map(([name]) => name);
    });
    
    // Mejor modelo overall (por accuracy)
    const bestModel = ranking.accuracy[0];
    
    console.log(`\n🎯 RANKING DE MODELOS:`);
    metrics.forEach(metric => {
      console.log(`\n${metric.toUpperCase()}:`);
      ranking[metric].forEach((modelName, index) => {
        const score = results[modelName].mean[metric];
        const std = results[modelName].std[metric];
        console.log(`   ${index + 1}. ${modelName}: ${(score * 100).toFixed(2)}% ± ${(std * 100).toFixed(2)}%`);
      });
    });
    
    console.log(`\n🏆 MEJOR MODELO OVERALL: ${bestModel}`);
    
    return {
      models: results,
      bestModel,
      rankingByMetric: ranking
    };
  }
  
  /**
   * Evalúa un modelo en un conjunto de datos
   */
  private static async evaluateModel(
    model: any,
    testData: SentimentTrainingItem[],
    setName: string = 'Test'
  ): Promise<EvaluationResult> {
    const predictions: Array<{
      text: string;
      actual: string;
      predicted: string;
      confidence: number;
      correct: boolean;
    }> = [];
    
    // Realizar predicciones
    for (const item of testData) {
      try {
        let result: any;
        
        // Diferentes interfaces de modelos
        if (model.analyze) {
          result = await model.analyze({ text: item.text });
        } else if (model.analyzeText) {
          result = await model.analyzeText(item.text);
        } else if (model.predict) {
          result = await model.predict(item.text);
        } else {
          throw new Error(`Model interface not supported for ${setName}`);
        }
        
        const predicted = result.sentiment?.label || result.label || result.prediction || 'neutral';
        const confidence = result.confidence || result.sentiment?.confidence || 0.5;
        
        predictions.push({
          text: item.text,
          actual: item.label,
          predicted: predicted.toLowerCase(),
          confidence: confidence,
          correct: predicted.toLowerCase() === item.label.toLowerCase()
        });
        
      } catch (error) {
        console.warn(`Error predicting for text: "${item.text.substring(0, 50)}...": ${error}`);
        predictions.push({
          text: item.text,
          actual: item.label,
          predicted: 'neutral',
          confidence: 0,
          correct: false
        });
      }
    }
    
    // Calcular métricas
    return this.calculateMetrics(predictions);
  }
  
  /**
   * Calcula métricas detalladas
   */
  private static calculateMetrics(predictions: Array<{
    text: string;
    actual: string;
    predicted: string;
    confidence: number;
    correct: boolean;
  }>): EvaluationResult {
    const labels = ['positive', 'negative', 'neutral'];
    
    // Accuracy
    const accuracy = predictions.filter(p => p.correct).length / predictions.length;
    
    // Confusion Matrix
    const confusionMatrix: Record<string, Record<string, number>> = {};
    labels.forEach(actual => {
      confusionMatrix[actual] = {};
      labels.forEach(predicted => {
        confusionMatrix[actual][predicted] = predictions.filter(
          p => p.actual === actual && p.predicted === predicted
        ).length;
      });
    });
    
    // Precision, Recall, F1-Score por clase
    const precision: any = {};
    const recall: any = {};
    const f1Score: any = {};
    
    labels.forEach(label => {
      const tp = confusionMatrix[label][label] || 0;
      const fp = labels.reduce((sum, l) => sum + (confusionMatrix[l][label] || 0), 0) - tp;
      const fn = labels.reduce((sum, l) => sum + (confusionMatrix[label][l] || 0), 0) - tp;
      
      precision[label] = tp + fp > 0 ? tp / (tp + fp) : 0;
      recall[label] = tp + fn > 0 ? tp / (tp + fn) : 0;
      f1Score[label] = precision[label] + recall[label] > 0 
        ? 2 * (precision[label] * recall[label]) / (precision[label] + recall[label]) 
        : 0;
    });
    
    // Macro averages
    precision.macro = labels.reduce((sum, l) => sum + precision[l], 0) / labels.length;
    recall.macro = labels.reduce((sum, l) => sum + recall[l], 0) / labels.length;
    f1Score.macro = labels.reduce((sum, l) => sum + f1Score[l], 0) / labels.length;
    
    return {
      accuracy,
      precision,
      recall,
      f1Score,
      confusionMatrix,
      predictions
    };
  }
  
  /**
   * Crea folds estratificados para validación cruzada
   */
  private static createStratifiedFolds(data: SentimentTrainingItem[], k: number): SentimentTrainingItem[][] {
    // Agrupar por clase
    const byClass: Record<string, SentimentTrainingItem[]> = {};
    data.forEach(item => {
      if (!byClass[item.label]) byClass[item.label] = [];
      byClass[item.label].push(item);
    });
    
    // Shuffle cada clase
    Object.keys(byClass).forEach(label => {
      byClass[label] = this.shuffleArray([...byClass[label]]);
    });
    
    // Crear folds
    const folds: SentimentTrainingItem[][] = Array(k).fill(null).map(() => []);
    
    Object.keys(byClass).forEach(label => {
      const items = byClass[label];
      const itemsPerFold = Math.floor(items.length / k);
      
      for (let i = 0; i < k; i++) {
        const start = i * itemsPerFold;
        const end = i === k - 1 ? items.length : (i + 1) * itemsPerFold;
        folds[i].push(...items.slice(start, end));
      }
    });
    
    return folds.map(fold => this.shuffleArray(fold));
  }
  
  /**
   * Split estratificado
   */
  private static stratifiedSplit(
    data: SentimentTrainingItem[],
    trainRatio: number,
    validationRatio: number,
    testRatio: number
  ): {
    trainSet: SentimentTrainingItem[];
    validationSet: SentimentTrainingItem[];
    testSet: SentimentTrainingItem[];
  } {
    const byClass: Record<string, SentimentTrainingItem[]> = {};
    data.forEach(item => {
      if (!byClass[item.label]) byClass[item.label] = [];
      byClass[item.label].push(item);
    });
    
    const trainSet: SentimentTrainingItem[] = [];
    const validationSet: SentimentTrainingItem[] = [];
    const testSet: SentimentTrainingItem[] = [];
    
    Object.keys(byClass).forEach(label => {
      const items = this.shuffleArray([...byClass[label]]);
      const total = items.length;
      
      const trainSize = Math.floor(total * trainRatio);
      const validationSize = Math.floor(total * validationRatio);
      
      trainSet.push(...items.slice(0, trainSize));
      validationSet.push(...items.slice(trainSize, trainSize + validationSize));
      testSet.push(...items.slice(trainSize + validationSize));
    });
    
    return {
      trainSet: this.shuffleArray(trainSet),
      validationSet: this.shuffleArray(validationSet),
      testSet: this.shuffleArray(testSet)
    };
  }
  
  /**
   * Bootstrap sampling
   */
  private static bootstrapSample<T>(data: T[], sampleSize: number): T[] {
    const sample: T[] = [];
    for (let i = 0; i < sampleSize; i++) {
      const randomIndex = Math.floor(Math.random() * data.length);
      sample.push(data[randomIndex]);
    }
    return sample;
  }
  
  /**
   * Shuffle array
   */
  private static shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
  
  /**
   * Calcula estadísticas de validación cruzada
   */
  private static calculateCrossValidationStats(results: EvaluationResult[]): CrossValidationResult {
    const metrics = ['accuracy', 'precision', 'recall', 'f1Score'] as const;
    
    const stats: any = {
      mean: {},
      std: {},
      confidenceInterval: {}
    };
    
    metrics.forEach(metric => {
      const values = results.map(r => {
        if (metric === 'accuracy') return r.accuracy;
        return (r[metric] as any).macro;
      });
      
      const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
      const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
      const std = Math.sqrt(variance);
      
      // 95% confidence interval
      const t = 1.96; // for 95% CI with large samples
      const margin = t * std / Math.sqrt(values.length);
      
      stats.mean[metric] = mean;
      stats.std[metric] = std;
      stats.confidenceInterval[metric] = [mean - margin, mean + margin];
    });
    
    return {
      folds: results,
      ...stats
    };
  }
  
  /**
   * Genera reporte detallado
   */
  static generateDetailedReport(result: CrossValidationResult, modelName: string): void {
    console.log(`\n📄 REPORTE DETALLADO - ${modelName.toUpperCase()}`);
    console.log('='.repeat(60));
    
    console.log(`\n📊 MÉTRICAS PROMEDIO:`);
    console.log(`   Accuracy: ${(result.mean.accuracy * 100).toFixed(2)}% ± ${(result.std.accuracy * 100).toFixed(2)}%`);
    console.log(`   Precision: ${(result.mean.precision * 100).toFixed(2)}% ± ${(result.std.precision * 100).toFixed(2)}%`);
    console.log(`   Recall: ${(result.mean.recall * 100).toFixed(2)}% ± ${(result.std.recall * 100).toFixed(2)}%`);
    console.log(`   F1-Score: ${(result.mean.f1Score * 100).toFixed(2)}% ± ${(result.std.f1Score * 100).toFixed(2)}%`);
    
    console.log(`\n🎯 INTERVALOS DE CONFIANZA (95%):`);
    console.log(`   Accuracy: [${(result.confidenceInterval.accuracy[0] * 100).toFixed(2)}%, ${(result.confidenceInterval.accuracy[1] * 100).toFixed(2)}%]`);
    console.log(`   Precision: [${(result.confidenceInterval.precision[0] * 100).toFixed(2)}%, ${(result.confidenceInterval.precision[1] * 100).toFixed(2)}%]`);
    console.log(`   Recall: [${(result.confidenceInterval.recall[0] * 100).toFixed(2)}%, ${(result.confidenceInterval.recall[1] * 100).toFixed(2)}%]`);
    console.log(`   F1-Score: [${(result.confidenceInterval.f1Score[0] * 100).toFixed(2)}%, ${(result.confidenceInterval.f1Score[1] * 100).toFixed(2)}%]`);
    
    console.log(`\n📈 RENDIMIENTO POR FOLD:`);
    result.folds.forEach((fold, index) => {
      console.log(`   Fold ${index + 1}: Accuracy ${(fold.accuracy * 100).toFixed(2)}%`);
    });
  }
}

// Funciones de factory para diferentes modelos
function createEnhancedEngine() {
  return new EnhancedSentimentEngine();
}

function createBaseEngine() {
  return new SentimentAnalysisEngine();
}

function createOrchestrator() {
  return new SentimentAnalysisOrchestrator();
}

// Script principal
async function runEvaluationSuite() {
  console.log('🚀 INICIANDO SUITE DE EVALUACIÓN COMPLETA');
  console.log('=' .repeat(80));
  
  try {
    // Cargar datos
    console.log(`📂 Cargando dataset: ${enhancedTrainingDataV3Clean.length} ejemplos`);
    
    // Análisis del dataset
    const labelCounts = enhancedTrainingDataV3Clean.reduce((acc, item) => {
      acc[item.label] = (acc[item.label] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log(`📊 Distribución de clases:`);
    Object.entries(labelCounts).forEach(([label, count]) => {
      const percentage = (count / enhancedTrainingDataV3Clean.length * 100).toFixed(1);
      console.log(`   ${label}: ${count} (${percentage}%)`);
    });
    
    // Usar un subconjunto para evaluación rápida (puedes cambiar esto)
    const sampleSize = Math.min(1000, enhancedTrainingDataV3Clean.length);
    const sampleData = enhancedTrainingDataV3Clean.slice(0, sampleSize).map(item => ({
      text: item.text,
      label: item.label as 'positive' | 'negative' | 'neutral'
    }));
    console.log(`\n🎯 Usando muestra de ${sampleSize} ejemplos para evaluación`);
    
    // 1. VALIDACIÓN CRUZADA 5-FOLD
    console.log('\n' + '='.repeat(80));
    console.log('🔄 1. VALIDACIÓN CRUZADA 5-FOLD');
    console.log('='.repeat(80));
    
    const models = [
      { name: 'Enhanced Engine', factory: createEnhancedEngine },
      { name: 'Base Engine', factory: createBaseEngine },
      { name: 'Orchestrator', factory: createOrchestrator }
    ];
    
    const comparisonResult = await EvaluationFramework.compareModels(sampleData, models, 5);
    
    // 2. HOLD-OUT VALIDATION
    console.log('\n' + '='.repeat(80));
    console.log('🎯 2. HOLD-OUT VALIDATION');
    console.log('='.repeat(80));
    
    const bestModelFactory = models.find(m => m.name === comparisonResult.bestModel)?.factory || createEnhancedEngine;
    const holdOutResult = await EvaluationFramework.holdOutValidation(
      sampleData, 0.7, 0.15, 0.15, bestModelFactory, comparisonResult.bestModel
    );
    
    // 3. BOOTSTRAP VALIDATION
    console.log('\n' + '='.repeat(80));
    console.log('🔀 3. BOOTSTRAP VALIDATION');
    console.log('='.repeat(80));
    
    const bootstrapResult = await EvaluationFramework.bootstrapValidation(
      sampleData, 50, 0.8, bestModelFactory, comparisonResult.bestModel
    );
    
    // 4. REPORTE FINAL
    console.log('\n' + '='.repeat(80));
    console.log('📋 REPORTE FINAL DE EVALUACIÓN');
    console.log('='.repeat(80));
    
    console.log(`\n🏆 MEJOR MODELO: ${comparisonResult.bestModel}`);
    
    console.log(`\n📊 RESUMEN DE RESULTADOS:`);
    console.log(`\n   Cross Validation (5-Fold):`);
    console.log(`     Accuracy: ${(comparisonResult.models[comparisonResult.bestModel].mean.accuracy * 100).toFixed(2)}% ± ${(comparisonResult.models[comparisonResult.bestModel].std.accuracy * 100).toFixed(2)}%`);
    
    console.log(`\n   Hold-out Validation:`);
    console.log(`     Train: ${(holdOutResult.train.accuracy * 100).toFixed(2)}%`);
    console.log(`     Validation: ${(holdOutResult.validation.accuracy * 100).toFixed(2)}%`);
    console.log(`     Test: ${(holdOutResult.test.accuracy * 100).toFixed(2)}%`);
    
    console.log(`\n   Bootstrap Validation:`);
    console.log(`     Accuracy: ${(bootstrapResult.mean.accuracy * 100).toFixed(2)}% ± ${(bootstrapResult.std.accuracy * 100).toFixed(2)}%`);
    
    // Generar reportes detallados
    EvaluationFramework.generateDetailedReport(
      comparisonResult.models[comparisonResult.bestModel], 
      comparisonResult.bestModel
    );
    
    console.log('\n✅ EVALUACIÓN COMPLETADA EXITOSAMENTE');
    
  } catch (error) {
    console.error('❌ Error durante la evaluación:', error);
    throw error;
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  runEvaluationSuite()
    .then(() => {
      console.log('\n🎉 Suite de evaluación completada!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Error en suite de evaluación:', error);
      process.exit(1);
    });
}

export {
  createBaseEngine, createEnhancedEngine, createOrchestrator, EvaluationFramework,
  runEvaluationSuite
};
