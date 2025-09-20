/**
 * Script de Evaluación Rápida - Validación Cruzada
 * 
 * Versión simplificada para pruebas rápidas de validación cruzada
 */

import { enhancedTrainingDataV3Clean, SentimentTrainingItem } from '../src/data/enhanced-training-data-v3-clean';
import { sentimentServiceFacade } from '../src/lib/sentiment/sentiment-service-facade';

interface SimplePrediction {
  text: string;
  actual: string;
  predicted: string;
  confidence: number;
  correct: boolean;
}

interface SimpleMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  confusionMatrix: Record<string, Record<string, number>>;
}

class SimpleEvaluator {
  
  /**
   * Validación cruzada K-Fold simplificada
   */
  static async quickKFoldValidation(k: number = 5, sampleSize: number = 500): Promise<void> {
    console.log(`🔄 Validación Cruzada ${k}-Fold - Muestra de ${sampleSize} ejemplos`);
    console.log('='.repeat(60));
    
    // Preparar datos
    const data = enhancedTrainingDataV3Clean
      .slice(0, sampleSize)
      .map(item => ({
        text: item.text,
        label: item.label as 'positive' | 'negative' | 'neutral'
      }));
    
    console.log(`📊 Dataset: ${data.length} ejemplos`);
    
    // Distribución de clases
    const classCounts = data.reduce((acc, item) => {
      acc[item.label] = (acc[item.label] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('📈 Distribución de clases:');
    Object.entries(classCounts).forEach(([label, count]) => {
      console.log(`   ${label}: ${count} (${(count/data.length*100).toFixed(1)}%)`);
    });
    
    // Crear folds estratificados
    const folds = this.createStratifiedFolds(data, k);
    const foldResults: SimpleMetrics[] = [];
    
    console.log(`\n🔍 Ejecutando ${k} folds...`);
    
    for (let i = 0; i < k; i++) {
      console.log(`\n📊 Fold ${i + 1}/${k}`);
      
      // Test set = fold actual, Train set = otros folds
      const testSet = folds[i];
      const trainSet = folds.filter((_, index) => index !== i).flat();
      
      console.log(`   Train: ${trainSet.length}, Test: ${testSet.length}`);
      
      // Evaluar en test set (sin entrenamiento, usando modelo pre-entrenado)
      const predictions = await this.evaluateOnTestSet(testSet);
      const metrics = this.calculateMetrics(predictions);
      
      foldResults.push(metrics);
      
      console.log(`   Accuracy: ${(metrics.accuracy * 100).toFixed(2)}%`);
      console.log(`   Precision: ${(metrics.precision * 100).toFixed(2)}%`);
      console.log(`   Recall: ${(metrics.recall * 100).toFixed(2)}%`);
      console.log(`   F1-Score: ${(metrics.f1Score * 100).toFixed(2)}%`);
    }
    
    // Estadísticas finales
    this.printFinalStats(foldResults, k);
  }
  
  /**
   * Evalúa el modelo en un conjunto de test
   */
  private static async evaluateOnTestSet(testSet: SentimentTrainingItem[]): Promise<SimplePrediction[]> {
    const predictions: SimplePrediction[] = [];
    
    console.log(`   Evaluando ${testSet.length} ejemplos...`);
    
    for (let i = 0; i < testSet.length; i++) {
      if (i > 0 && i % 50 === 0) {
        console.log(`     Progreso: ${i}/${testSet.length}`);
      }
      
      const item = testSet[i];
      
      try {
        // Usar el facade unificado
        const result = await sentimentServiceFacade.testSentimentAnalysis({
          text: item.text,
          method: 'unified'
        });
        
        const predicted = result.label.toLowerCase();
        const confidence = result.confidence || 0.5;
        
        predictions.push({
          text: item.text,
          actual: item.label,
          predicted: predicted,
          confidence: confidence,
          correct: predicted === item.label
        });
        
      } catch (error) {
        console.warn(`     Error en predicción: ${error}`);
        predictions.push({
          text: item.text,
          actual: item.label,
          predicted: 'neutral',
          confidence: 0,
          correct: false
        });
      }
    }
    
    return predictions;
  }
  
  /**
   * Calcula métricas de evaluación
   */
  private static calculateMetrics(predictions: SimplePrediction[]): SimpleMetrics {
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
    
    // Calcular precision, recall, f1 macro-promediados
    let totalPrecision = 0;
    let totalRecall = 0;
    let totalF1 = 0;
    let validClasses = 0;
    
    labels.forEach(label => {
      const tp = confusionMatrix[label][label] || 0;
      const fp = labels.reduce((sum, l) => sum + (confusionMatrix[l][label] || 0), 0) - tp;
      const fn = labels.reduce((sum, l) => sum + (confusionMatrix[label][l] || 0), 0) - tp;
      
      if (tp + fp > 0 && tp + fn > 0) {
        const precision = tp / (tp + fp);
        const recall = tp / (tp + fn);
        const f1 = precision + recall > 0 ? 2 * (precision * recall) / (precision + recall) : 0;
        
        totalPrecision += precision;
        totalRecall += recall;
        totalF1 += f1;
        validClasses++;
      }
    });
    
    return {
      accuracy,
      precision: validClasses > 0 ? totalPrecision / validClasses : 0,
      recall: validClasses > 0 ? totalRecall / validClasses : 0,
      f1Score: validClasses > 0 ? totalF1 / validClasses : 0,
      confusionMatrix
    };
  }
  
  /**
   * Crea folds estratificados
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
   * Imprime estadísticas finales
   */
  private static printFinalStats(results: SimpleMetrics[], k: number): void {
    console.log('\n' + '='.repeat(60));
    console.log(`📈 RESULTADOS FINALES - VALIDACIÓN CRUZADA ${k}-FOLD`);
    console.log('='.repeat(60));
    
    // Promedios
    const avgAccuracy = results.reduce((sum, r) => sum + r.accuracy, 0) / results.length;
    const avgPrecision = results.reduce((sum, r) => sum + r.precision, 0) / results.length;
    const avgRecall = results.reduce((sum, r) => sum + r.recall, 0) / results.length;
    const avgF1 = results.reduce((sum, r) => sum + r.f1Score, 0) / results.length;
    
    // Desviaciones estándar
    const stdAccuracy = Math.sqrt(results.reduce((sum, r) => sum + Math.pow(r.accuracy - avgAccuracy, 2), 0) / results.length);
    const stdPrecision = Math.sqrt(results.reduce((sum, r) => sum + Math.pow(r.precision - avgPrecision, 2), 0) / results.length);
    const stdRecall = Math.sqrt(results.reduce((sum, r) => sum + Math.pow(r.recall - avgRecall, 2), 0) / results.length);
    const stdF1 = Math.sqrt(results.reduce((sum, r) => sum + Math.pow(r.f1Score - avgF1, 2), 0) / results.length);
    
    console.log(`\n🎯 MÉTRICAS PROMEDIO:`);
    console.log(`   Accuracy:  ${(avgAccuracy * 100).toFixed(2)}% ± ${(stdAccuracy * 100).toFixed(2)}%`);
    console.log(`   Precision: ${(avgPrecision * 100).toFixed(2)}% ± ${(stdPrecision * 100).toFixed(2)}%`);
    console.log(`   Recall:    ${(avgRecall * 100).toFixed(2)}% ± ${(stdRecall * 100).toFixed(2)}%`);
    console.log(`   F1-Score:  ${(avgF1 * 100).toFixed(2)}% ± ${(stdF1 * 100).toFixed(2)}%`);
    
    console.log(`\n📊 RENDIMIENTO POR FOLD:`);
    results.forEach((result, index) => {
      console.log(`   Fold ${index + 1}: Acc=${(result.accuracy * 100).toFixed(1)}%, F1=${(result.f1Score * 100).toFixed(1)}%`);
    });
    
    // Intervalos de confianza (95%)
    const t = 1.96; // para 95% CI
    const nFolds = results.length;
    
    const ciAccuracy = [
      avgAccuracy - t * stdAccuracy / Math.sqrt(nFolds),
      avgAccuracy + t * stdAccuracy / Math.sqrt(nFolds)
    ];
    const ciF1 = [
      avgF1 - t * stdF1 / Math.sqrt(nFolds),
      avgF1 + t * stdF1 / Math.sqrt(nFolds)
    ];
    
    console.log(`\n🎲 INTERVALOS DE CONFIANZA (95%):`);
    console.log(`   Accuracy: [${(ciAccuracy[0] * 100).toFixed(2)}%, ${(ciAccuracy[1] * 100).toFixed(2)}%]`);
    console.log(`   F1-Score: [${(ciF1[0] * 100).toFixed(2)}%, ${(ciF1[1] * 100).toFixed(2)}%]`);
    
    // Matriz de confusión agregada (último fold como ejemplo)
    if (results.length > 0) {
      console.log(`\n🔍 MATRIZ DE CONFUSIÓN (último fold):`);
      const cm = results[results.length - 1].confusionMatrix;
      const labels = ['positive', 'negative', 'neutral'];
      
      console.log('        ', labels.map(l => l.padStart(8)).join(''));
      labels.forEach(actual => {
        const row = labels.map(predicted => (cm[actual][predicted] || 0).toString().padStart(8)).join('');
        console.log(`${actual.padStart(8)} ${row}`);
      });
    }
  }
}

// Función principal
async function runQuickEvaluation() {
  console.log('🚀 EVALUACIÓN RÁPIDA - VALIDACIÓN CRUZADA');
  console.log('=' .repeat(80));
  
  try {
    // Opciones de evaluación
    const options = [
      { k: 3, sampleSize: 300, description: 'Evaluación ultra-rápida' },
      { k: 5, sampleSize: 500, description: 'Evaluación rápida' },
      { k: 5, sampleSize: 1000, description: 'Evaluación estándar' },
      { k: 10, sampleSize: 1000, description: 'Evaluación rigurosa' }
    ];
    
    console.log('📋 Opciones disponibles:');
    options.forEach((opt, index) => {
      console.log(`   ${index + 1}. ${opt.description}: ${opt.k}-fold, ${opt.sampleSize} ejemplos`);
    });
    
    // Por defecto usar evaluación rápida
    const selectedOption = options[1]; // 5-fold, 500 ejemplos
    
    console.log(`\n🎯 Ejecutando: ${selectedOption.description}`);
    console.log(`   K-Folds: ${selectedOption.k}`);
    console.log(`   Tamaño muestra: ${selectedOption.sampleSize}`);
    
    await SimpleEvaluator.quickKFoldValidation(selectedOption.k, selectedOption.sampleSize);
    
    console.log('\n✅ EVALUACIÓN COMPLETADA!');
    
  } catch (error) {
    console.error('❌ Error durante la evaluación:', error);
    throw error;
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  runQuickEvaluation()
    .then(() => {
      console.log('\n🎉 Evaluación rápida completada!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Error en evaluación:', error);
      process.exit(1);
    });
}

export { SimpleEvaluator, runQuickEvaluation };