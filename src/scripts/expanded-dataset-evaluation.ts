/**
 * Evaluación del Modelo con Dataset Expandido
 * Compara el rendimiento antes y después de la expansión
 */

import { NaiveBayesSentimentModel } from '../experimental/naive-bayes.model';
import { HybridSentimentAnalysisService } from '../services/hybrid-sentiment-analysis.service';
import { getBalancedDataset, splitDataset } from '../data/training-dataset';
// Importar el dataset expandido
import { getExpandedTrainingDataset } from '../data/expanded-training-dataset';

class ExpandedDatasetEvaluation {
  
  async runComparison(): Promise<void> {
    console.log('🔬 EVALUACIÓN CON DATASET EXPANDIDO');
    console.log('==================================\n');

    try {
      // 1. Evaluar con dataset original
      console.log('📚 PASO 1: Evaluando con dataset original (234 ejemplos)...');
      const originalResults = await this.evaluateWithDataset(getBalancedDataset(), 'Original');

      // 2. Evaluar con dataset expandido
      console.log('\n📚 PASO 2: Evaluando with dataset expandido (532 ejemplos)...');
      const expandedResults = await this.evaluateWithDataset(getExpandedTrainingDataset(), 'Expandido');

      // 3. Comparación directa
      console.log('\n📊 PASO 3: Comparación directa...');
      this.compareResults(originalResults, expandedResults);

      // 4. Evaluar sistema híbrido actualizado
      console.log('\n🤝 PASO 4: Evaluando sistema híbrido actualizado...');
      await this.evaluateUpdatedHybridSystem();

    } catch (error) {
      console.error('❌ Error en evaluación:', error);
    }
  }

  /**
   * Evaluar modelo con un dataset específico
   */
  private async evaluateWithDataset(trainingData: any[], label: string) {
    console.log(`🧠 Entrenando modelo ${label}...`);
    
    // Configuración óptima encontrada anteriormente
    const model = new NaiveBayesSentimentModel({
      smoothingFactor: 1.0,
      minWordLength: 2,
      maxVocabularySize: 5000,
      enableBigrams: false,
      enableTfIdf: false,
      enableNegationHandling: false,
      enableIntensifierHandling: false,
      minWordFrequency: 1,
      useSubwordFeatures: false
    });

    // Entrenar modelo
    const trainStart = Date.now();
    await model.train(trainingData);
    const trainTime = Date.now() - trainStart;

    // Obtener dataset de prueba usando split
    const { test: testData } = splitDataset(0.2); // 20% para pruebas
    console.log(`🧪 Evaluando en ${testData.length} ejemplos de prueba...`);

    // Evaluar modelo
    const evalStart = Date.now();
    const results = await this.evaluateModel(model, testData);
    const evalTime = Date.now() - evalStart;

    const finalResults = {
      ...results,
      trainingTime: trainTime,
      evaluationTime: evalTime,
      trainingSize: trainingData.length,
      testSize: testData.length,
      vocabularySize: model.getStatistics().vocabulary.size
    };

    // Mostrar resultados
    console.log(`✅ RESULTADOS ${label.toUpperCase()}:`);
    console.log(`   🎯 Accuracy: ${(finalResults.accuracy * 100).toFixed(2)}%`);
    console.log(`   📈 F1-Score: ${(finalResults.f1Score * 100).toFixed(2)}%`);
    console.log(`   📊 Precision: ${(finalResults.precision * 100).toFixed(2)}%`);
    console.log(`   🔍 Recall: ${(finalResults.recall * 100).toFixed(2)}%`);
    console.log(`   ⚡ Tiempo entrenamiento: ${trainTime}ms`);
    console.log(`   🔤 Vocabulario: ${finalResults.vocabularySize} palabras`);

    return finalResults;
  }

  /**
   * Evaluar modelo específico
   */
  private async evaluateModel(model: NaiveBayesSentimentModel, testData: any[]) {
    const predictions: string[] = [];
    const actuals: string[] = [];
    const processingTimes: number[] = [];

    for (const sample of testData) {
      const startTime = Date.now();
      const result = await model.predict(sample.text);
      const endTime = Date.now();
      
      processingTimes.push(endTime - startTime);
      predictions.push(this.normalizeSentimentLabel(result.label));
      actuals.push(this.normalizeSentimentLabel(sample.sentiment));
    }

    return this.calculateMetrics(predictions, actuals, processingTimes);
  }

  /**
   * Calcular métricas detalladas
   */
  private calculateMetrics(predictions: string[], actuals: string[], times: number[]) {
    const labels = ['positive', 'negative', 'neutral'];
    
    // Accuracy general
    const accuracy = predictions.reduce((correct, pred, idx) => 
      pred === actuals[idx] ? correct + 1 : correct, 0) / predictions.length;

    // Métricas por clase
    let totalPrecision = 0;
    let totalRecall = 0;
    let totalF1 = 0;
    let validClasses = 0;

    const detailedMetrics: Record<string, any> = {};

    for (const label of labels) {
      const tp = predictions.reduce((count, pred, idx) => 
        pred === label && actuals[idx] === label ? count + 1 : count, 0);
      const fp = predictions.reduce((count, pred, idx) => 
        pred === label && actuals[idx] !== label ? count + 1 : count, 0);
      const fn = predictions.reduce((count, pred, idx) => 
        pred !== label && actuals[idx] === label ? count + 1 : count, 0);

      if (tp + fp > 0 && tp + fn > 0) {
        const precision = tp / (tp + fp);
        const recall = tp / (tp + fn);
        const f1 = 2 * (precision * recall) / (precision + recall);
        
        detailedMetrics[label] = { precision, recall, f1, tp, fp, fn };
        
        totalPrecision += precision;
        totalRecall += recall;
        totalF1 += f1;
        validClasses++;
      }
    }

    const avgPrecision = validClasses > 0 ? totalPrecision / validClasses : 0;
    const avgRecall = validClasses > 0 ? totalRecall / validClasses : 0;
    const avgF1Score = validClasses > 0 ? totalF1 / validClasses : 0;
    const avgProcessingTime = times.reduce((a, b) => a + b, 0) / times.length;

    return {
      accuracy,
      precision: avgPrecision,
      recall: avgRecall,
      f1Score: avgF1Score,
      avgProcessingTime,
      detailedMetrics
    };
  }

  /**
   * Comparar resultados entre datasets
   */
  private compareResults(original: any, expanded: any) {
    console.log('⚖️ COMPARACIÓN DETALLADA:');
    console.log('=========================');
    
    const accuracyImprovement = (expanded.accuracy - original.accuracy) * 100;
    const f1Improvement = (expanded.f1Score - original.f1Score) * 100;
    const precisionImprovement = (expanded.precision - original.precision) * 100;
    const recallImprovement = (expanded.recall - original.recall) * 100;

    console.log('📊 MEJORAS ABSOLUTAS:');
    console.log(`   🎯 Accuracy: ${original.accuracy.toFixed(4)} → ${expanded.accuracy.toFixed(4)} (${accuracyImprovement > 0 ? '+' : ''}${accuracyImprovement.toFixed(2)}%)`);
    console.log(`   📈 F1-Score: ${original.f1Score.toFixed(4)} → ${expanded.f1Score.toFixed(4)} (${f1Improvement > 0 ? '+' : ''}${f1Improvement.toFixed(2)}%)`);
    console.log(`   📊 Precision: ${original.precision.toFixed(4)} → ${expanded.precision.toFixed(4)} (${precisionImprovement > 0 ? '+' : ''}${precisionImprovement.toFixed(2)}%)`);
    console.log(`   🔍 Recall: ${original.recall.toFixed(4)} → ${expanded.recall.toFixed(4)} (${recallImprovement > 0 ? '+' : ''}${recallImprovement.toFixed(2)}%)`);

    console.log('\n🧠 CARACTERÍSTICAS DEL MODELO:');
    console.log(`   📚 Training Size: ${original.trainingSize} → ${expanded.trainingSize} (+${((expanded.trainingSize/original.trainingSize - 1) * 100).toFixed(0)}%)`);
    console.log(`   🔤 Vocabulario: ${original.vocabularySize} → ${expanded.vocabularySize} (+${expanded.vocabularySize - original.vocabularySize} palabras)`);
    console.log(`   ⚡ Tiempo entrenamiento: ${original.trainingTime}ms → ${expanded.trainingTime}ms`);

    // Determinar si la mejora es significativa
    const significantImprovement = accuracyImprovement > 2; // 2% improvement threshold
    
    console.log('\n🎯 CONCLUSIÓN:');
    if (significantImprovement) {
      console.log(`✅ MEJORA SIGNIFICATIVA: El dataset expandido mejora notablemente el rendimiento`);
    } else {
      console.log(`⚠️ MEJORA MODERADA: El dataset expandido muestra mejoras menores`);
    }
  }

  /**
   * Evaluar sistema híbrido actualizado
   */
  private async evaluateUpdatedHybridSystem() {
    console.log('🔄 Creando sistema híbrido con modelo actualizado...');
    
    // El sistema híbrido se reinicializará automáticamente con el dataset expandido
    const hybridService = new HybridSentimentAnalysisService();
    
    // Dar tiempo para la inicialización
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('🧪 Evaluando sistema híbrido actualizado...');
    const { test: testData } = splitDataset(0.1); // 10% para evaluación rápida
    const testSample = testData.slice(0, 50); // Usar muestra para rapidez
    
    let correct = 0;
    const predictions: string[] = [];
    const actuals: string[] = [];
    const methods: string[] = [];
    const times: number[] = [];

    for (const sample of testSample) {
      try {
        const startTime = Date.now();
        const result = await hybridService.analyze(sample.text);
        const endTime = Date.now();
        
        const prediction = this.normalizeSentimentLabel(result.sentiment.label);
        const actual = this.normalizeSentimentLabel(sample.sentiment);
        
        predictions.push(prediction);
        actuals.push(actual);
        methods.push(result.sentiment.method);
        times.push(endTime - startTime);
        
        if (prediction === actual) correct++;
        
      } catch (error) {
        console.warn(`⚠️ Error evaluando muestra: ${sample.text.substring(0, 30)}...`);
      }
    }

    const hybridAccuracy = correct / testSample.length;
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    
    // Distribución de métodos
    const methodDistribution = methods.reduce((dist, method) => {
      dist[method] = (dist[method] || 0) + 1;
      return dist;
    }, {} as Record<string, number>);

    console.log('🏆 RESULTADOS SISTEMA HÍBRIDO ACTUALIZADO:');
    console.log(`   🎯 Accuracy: ${(hybridAccuracy * 100).toFixed(2)}%`);
    console.log(`   ⚡ Tiempo promedio: ${avgTime.toFixed(2)}ms`);
    console.log(`   🧩 Distribución de métodos:`);
    
    Object.entries(methodDistribution).forEach(([method, count]) => {
      const percentage = ((count / testSample.length) * 100).toFixed(1);
      const emoji = method === 'hybrid' ? '🤝' : method === 'naive-bayes' ? '🧠' : '📏';
      console.log(`      ${emoji} ${method}: ${count} (${percentage}%)`);
    });

    console.log('\n🚀 RECOMENDACIÓN FINAL:');
    if (hybridAccuracy > 0.95) {
      console.log('✅ EXCELENTE: Sistema híbrido mantiene alta precisión con dataset expandido');
    } else if (hybridAccuracy > 0.90) {
      console.log('👍 BUENO: Sistema híbrido funciona bien con dataset expandido');
    } else {
      console.log('⚠️ REVISAR: Sistema híbrido podría necesitar ajustes');
    }
  }

  /**
   * Normalizar etiquetas
   */
  private normalizeSentimentLabel(label: string): string {
    if (label === 'very_positive' || label === 'positive') return 'positive';
    if (label === 'very_negative' || label === 'negative') return 'negative';
    return 'neutral';
  }
}

// Ejecutar evaluación
async function runExpandedEvaluation() {
  try {
    const evaluation = new ExpandedDatasetEvaluation();
    await evaluation.runComparison();
  } catch (error) {
    console.error('❌ Error en evaluación:', error);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  runExpandedEvaluation();
}

export { ExpandedDatasetEvaluation };
