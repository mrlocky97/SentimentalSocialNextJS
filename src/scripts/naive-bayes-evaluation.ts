/**
 * Script de Entrenamiento y Evaluación Naive Bayes
 * Entrena el modelo y evalúa su rendimiento vs sistema actual
 */

import { NaiveBayesSentimentModel } from '../experimental/naive-bayes.model';
import { SentimentAnalysisService } from '../services/sentiment-analysis.service';
import { getBalancedDataset, getDatasetStatistics, splitDataset } from '../data/training-dataset';

interface EvaluationMetrics {
  accuracy: number;
  precision: { positive: number; negative: number; neutral: number; macro: number };
  recall: { positive: number; negative: number; neutral: number; macro: number };
  f1Score: { positive: number; negative: number; neutral: number; macro: number };
  confusionMatrix: number[][];
  avgProcessingTime: number;
}

class NaiveBayesEvaluation {
  private naiveBayesModel: NaiveBayesSentimentModel;
  private ruleBasedModel: SentimentAnalysisService;

  constructor() {
    this.naiveBayesModel = new NaiveBayesSentimentModel({
      smoothingFactor: 1.0,
      minWordLength: 2,
      maxVocabularySize: 5000,
      enableBigrams: false,
      enableTfIdf: false
    });
    this.ruleBasedModel = new SentimentAnalysisService();
  }

  /**
   * Ejecutar evaluación completa
   */
  async runCompleteEvaluation(): Promise<void> {
    console.log('🚀 INICIANDO EVALUACIÓN NAIVE BAYES VS RULE-BASED');
    console.log('================================================\n');

    // Mostrar estadísticas del dataset
    const datasetStats = getDatasetStatistics();
    console.log('');

    // Dividir dataset
    console.log('📊 Dividiendo dataset en entrenamiento y prueba...');
    const { train, test } = splitDataset(0.2);
    console.log(`🎯 Entrenamiento: ${train.length} textos`);
    console.log(`🧪 Prueba: ${test.length} textos\n`);

    // Entrenar Naive Bayes
    console.log('🧠 ENTRENANDO MODELO NAIVE BAYES');
    console.log('================================');
    await this.naiveBayesModel.train(train);
    console.log('');

    // Evaluar ambos modelos
    console.log('📈 EVALUANDO MODELOS');
    console.log('===================');
    
    console.log('🔍 Evaluando Naive Bayes...');
    const nbMetrics = await this.evaluateModel(this.naiveBayesModel, test, 'naive-bayes');
    console.log('');

    console.log('🔍 Evaluando Rule-Based...');
    const rbMetrics = await this.evaluateModel(this.ruleBasedModel, test, 'rule-based');
    console.log('');

    // Comparar resultados
    this.compareModels(nbMetrics, rbMetrics);

    // Casos de prueba específicos
    console.log('\n🎯 CASOS DE PRUEBA ESPECÍFICOS');
    console.log('=============================');
    await this.testSpecificCases();

    console.log('\n✅ EVALUACIÓN COMPLETADA');
  }

  /**
   * Evaluar un modelo específico
   */
  private async evaluateModel(model: any, testData: any[], modelName: string): Promise<EvaluationMetrics> {
    const predictions: string[] = [];
    const actuals: string[] = [];
    const processingTimes: number[] = [];

    for (const sample of testData) {
      const startTime = Date.now();
      
      let prediction: string;
      if (modelName === 'naive-bayes') {
        const result = await model.predict(sample.text);
        prediction = this.normalizeSentimentLabel(result.label);
      } else {
        const result = await model.analyze(sample.text);
        prediction = this.normalizeSentimentLabel(result.sentiment.label);
      }
      
      const endTime = Date.now();
      processingTimes.push(endTime - startTime);
      
      predictions.push(prediction);
      actuals.push(this.normalizeSentimentLabel(sample.sentiment));
    }

    return this.calculateMetrics(predictions, actuals, processingTimes, modelName);
  }

  /**
   * Normalizar etiquetas para comparación
   */
  private normalizeSentimentLabel(label: string): string {
    if (label === 'very_positive' || label === 'positive') return 'positive';
    if (label === 'very_negative' || label === 'negative') return 'negative';
    return 'neutral';
  }

  /**
   * Calcular métricas de evaluación
   */
  private calculateMetrics(predictions: string[], actuals: string[], times: number[], modelName: string): EvaluationMetrics {
    const labels = ['positive', 'negative', 'neutral'];
    const confusionMatrix = this.buildConfusionMatrix(predictions, actuals, labels);
    
    // Calcular métricas por clase
    const precision: any = {};
    const recall: any = {};
    const f1Score: any = {};

    for (let i = 0; i < labels.length; i++) {
      const label = labels[i];
      const tp = confusionMatrix[i][i];
      const fp = confusionMatrix.reduce((sum, row, idx) => idx !== i ? sum + row[i] : sum, 0);
      const fn = confusionMatrix[i].reduce((sum, val, idx) => idx !== i ? sum + val : sum, 0);

      precision[label] = tp === 0 ? 0 : tp / (tp + fp);
      recall[label] = tp === 0 ? 0 : tp / (tp + fn);
      f1Score[label] = (precision[label] + recall[label]) === 0 ? 0 : 
        2 * (precision[label] * recall[label]) / (precision[label] + recall[label]);
    }

    // Métricas macro
    const macroPrecision = (Object.values(precision) as number[]).reduce((a, b) => a + b, 0) / 3;
    const macroRecall = (Object.values(recall) as number[]).reduce((a, b) => a + b, 0) / 3;
    const macroF1 = (Object.values(f1Score) as number[]).reduce((a, b) => a + b, 0) / 3;

    // Accuracy
    const accuracy = predictions.reduce((correct, pred, idx) => 
      pred === actuals[idx] ? correct + 1 : correct, 0) / predictions.length;

    const avgProcessingTime = times.reduce((a, b) => a + b, 0) / times.length;

    // Imprimir resultados
    this.printMetrics(modelName, {
      accuracy,
      precision: { ...precision, macro: macroPrecision },
      recall: { ...recall, macro: macroRecall },
      f1Score: { ...f1Score, macro: macroF1 },
      confusionMatrix,
      avgProcessingTime
    });

    return {
      accuracy,
      precision: { ...precision, macro: macroPrecision },
      recall: { ...recall, macro: macroRecall },
      f1Score: { ...f1Score, macro: macroF1 },
      confusionMatrix,
      avgProcessingTime
    };
  }

  /**
   * Construir matriz de confusión
   */
  private buildConfusionMatrix(predictions: string[], actuals: string[], labels: string[]): number[][] {
    const matrix = labels.map(() => new Array(labels.length).fill(0));
    
    for (let i = 0; i < predictions.length; i++) {
      const predIdx = labels.indexOf(predictions[i]);
      const actualIdx = labels.indexOf(actuals[i]);
      if (predIdx !== -1 && actualIdx !== -1) {
        matrix[actualIdx][predIdx]++;
      }
    }
    
    return matrix;
  }

  /**
   * Imprimir métricas del modelo
   */
  private printMetrics(modelName: string, metrics: EvaluationMetrics): void {
    console.log(`📊 MÉTRICAS - ${modelName.toUpperCase()}`);
    console.log('─'.repeat(40));
    console.log(`🎯 Accuracy: ${(metrics.accuracy * 100).toFixed(2)}%`);
    console.log(`⚡ Tiempo promedio: ${metrics.avgProcessingTime.toFixed(2)}ms`);
    console.log('');
    console.log('📈 Precision por clase:');
    console.log(`  ✅ Positive: ${(metrics.precision.positive * 100).toFixed(1)}%`);
    console.log(`  ❌ Negative: ${(metrics.precision.negative * 100).toFixed(1)}%`);
    console.log(`  ⚪ Neutral:  ${(metrics.precision.neutral * 100).toFixed(1)}%`);
    console.log(`  📊 Macro avg: ${(metrics.precision.macro * 100).toFixed(1)}%`);
    console.log('');
    console.log('📈 Recall por clase:');
    console.log(`  ✅ Positive: ${(metrics.recall.positive * 100).toFixed(1)}%`);
    console.log(`  ❌ Negative: ${(metrics.recall.negative * 100).toFixed(1)}%`);
    console.log(`  ⚪ Neutral:  ${(metrics.recall.neutral * 100).toFixed(1)}%`);
    console.log(`  📊 Macro avg: ${(metrics.recall.macro * 100).toFixed(1)}%`);
    console.log('');
    console.log('📈 F1-Score por clase:');
    console.log(`  ✅ Positive: ${(metrics.f1Score.positive * 100).toFixed(1)}%`);
    console.log(`  ❌ Negative: ${(metrics.f1Score.negative * 100).toFixed(1)}%`);
    console.log(`  ⚪ Neutral:  ${(metrics.f1Score.neutral * 100).toFixed(1)}%`);
    console.log(`  📊 Macro avg: ${(metrics.f1Score.macro * 100).toFixed(1)}%`);
  }

  /**
   * Comparar ambos modelos
   */
  private compareModels(nbMetrics: EvaluationMetrics, rbMetrics: EvaluationMetrics): void {
    console.log('🏆 COMPARACIÓN DE MODELOS');
    console.log('========================');
    
    const accuracyDiff = nbMetrics.accuracy - rbMetrics.accuracy;
    const speedDiff = rbMetrics.avgProcessingTime - nbMetrics.avgProcessingTime;
    const f1Diff = nbMetrics.f1Score.macro - rbMetrics.f1Score.macro;

    console.log(`📊 Accuracy:`);
    console.log(`  🧠 Naive Bayes: ${(nbMetrics.accuracy * 100).toFixed(2)}%`);
    console.log(`  📏 Rule-Based:  ${(rbMetrics.accuracy * 100).toFixed(2)}%`);
    console.log(`  ${accuracyDiff > 0 ? '📈' : '📉'} Diferencia: ${(accuracyDiff * 100).toFixed(2)}% ${accuracyDiff > 0 ? 'mejor' : 'peor'} Naive Bayes`);
    console.log('');

    console.log(`⚡ Velocidad:`);
    console.log(`  🧠 Naive Bayes: ${nbMetrics.avgProcessingTime.toFixed(2)}ms`);
    console.log(`  📏 Rule-Based:  ${rbMetrics.avgProcessingTime.toFixed(2)}ms`);
    console.log(`  ${speedDiff > 0 ? '🐌' : '⚡'} Diferencia: ${Math.abs(speedDiff).toFixed(2)}ms ${speedDiff > 0 ? 'más lento' : 'más rápido'} Naive Bayes`);
    console.log('');

    console.log(`📈 F1-Score Macro:`);
    console.log(`  🧠 Naive Bayes: ${(nbMetrics.f1Score.macro * 100).toFixed(2)}%`);
    console.log(`  📏 Rule-Based:  ${(rbMetrics.f1Score.macro * 100).toFixed(2)}%`);
    console.log(`  ${f1Diff > 0 ? '📈' : '📉'} Diferencia: ${(f1Diff * 100).toFixed(2)}% ${f1Diff > 0 ? 'mejor' : 'peor'} Naive Bayes`);

    console.log('\n🎯 RECOMENDACIÓN:');
    if (accuracyDiff > 0.05) {
      console.log('✅ Naive Bayes muestra mejora significativa - RECOMENDADO para producción');
    } else if (accuracyDiff > 0.01) {
      console.log('🤔 Naive Bayes muestra mejora leve - Considera implementación híbrida');
    } else {
      console.log('⚖️  Rendimiento similar - Evalúa otros factores (velocidad, mantenimiento)');
    }
  }

  /**
   * Probar casos específicos
   */
  private async testSpecificCases(): Promise<void> {
    const testCases = [
      "Este producto es absolutamente increíble, lo recomiendo totalmente",
      "Terrible servicio, nunca más compro aquí",
      "El producto funciona bien, nada extraordinario",
      "Amazing quality! Best purchase ever made",
      "Worst experience, completely disappointed",
      "It's okay, does what it's supposed to do",
      "Aunque es caro, la calidad lo justifica",
      "Good product but delivery was delayed"
    ];

    console.log('Comparando predicciones en casos específicos:\n');

    for (const text of testCases) {
      console.log(`📝 "${text.substring(0, 50)}..."`);
      
      // Naive Bayes
      const nbResult = await this.naiveBayesModel.predict(text);
      console.log(`  🧠 Naive Bayes: ${nbResult.label} (confianza: ${(nbResult.confidence * 100).toFixed(1)}%)`);
      
      // Rule-Based
      const rbResult = await this.ruleBasedModel.analyze(text);
      console.log(`  📏 Rule-Based:  ${rbResult.sentiment.label} (confianza: ${(rbResult.sentiment.confidence * 100).toFixed(1)}%)`);
      
      console.log('');
    }
  }
}

// Ejecutar evaluación
async function runEvaluation() {
  try {
    const evaluation = new NaiveBayesEvaluation();
    await evaluation.runCompleteEvaluation();
  } catch (error) {
    console.error('❌ Error en evaluación:', error);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  runEvaluation();
}

export { NaiveBayesEvaluation };
