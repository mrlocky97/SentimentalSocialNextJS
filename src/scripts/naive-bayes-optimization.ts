/**
 * Evaluación Optimizada Naive Bayes
 * Prueba diferentes configuraciones para encontrar la mejor
 */

import { NaiveBayesSentimentModel } from '../experimental/naive-bayes.model';
import { SentimentAnalysisService } from '../services/sentiment-analysis.service';
import { getBalancedDataset, getDatasetStatistics, splitDataset } from '../data/training-dataset';

interface OptimizationResult {
  config: any;
  accuracy: number;
  f1Score: number;
  precision: number;
  recall: number;
  processingTime: number;
}

class NaiveBayesOptimization {
  private ruleBasedModel: SentimentAnalysisService;

  constructor() {
    this.ruleBasedModel = new SentimentAnalysisService();
  }

  /**
   * Ejecutar optimización completa
   */
  async runOptimization(): Promise<void> {
    console.log('🔧 INICIANDO OPTIMIZACIÓN NAIVE BAYES');
    console.log('====================================\n');

    // Mostrar estadísticas del dataset expandido
    const datasetStats = getDatasetStatistics();
    console.log('');

    // Dividir dataset
    console.log('📊 Dividiendo dataset en entrenamiento y prueba...');
    const { train, test } = splitDataset(0.2);
    console.log(`🎯 Entrenamiento: ${train.length} textos`);
    console.log(`🧪 Prueba: ${test.length} textos\n`);

    // Configuraciones a probar
    const configurations = [
      {
        name: "Configuración Básica",
        config: {
          smoothingFactor: 1.0,
          minWordLength: 2,
          maxVocabularySize: 5000,
          enableBigrams: false,
          enableTfIdf: false,
          enableNegationHandling: false,
          enableIntensifierHandling: false,
          minWordFrequency: 1,
          useSubwordFeatures: false
        }
      },
      {
        name: "Con Negaciones",
        config: {
          smoothingFactor: 1.0,
          minWordLength: 2,
          maxVocabularySize: 5000,
          enableBigrams: false,
          enableTfIdf: false,
          enableNegationHandling: true,
          enableIntensifierHandling: false,
          minWordFrequency: 1,
          useSubwordFeatures: false
        }
      },
      {
        name: "Con Intensificadores",
        config: {
          smoothingFactor: 1.0,
          minWordLength: 2,
          maxVocabularySize: 5000,
          enableBigrams: false,
          enableTfIdf: false,
          enableNegationHandling: false,
          enableIntensifierHandling: true,
          minWordFrequency: 1,
          useSubwordFeatures: false
        }
      },
      {
        name: "Con Bigramas",
        config: {
          smoothingFactor: 1.0,
          minWordLength: 2,
          maxVocabularySize: 8000,
          enableBigrams: true,
          enableTfIdf: false,
          enableNegationHandling: false,
          enableIntensifierHandling: false,
          minWordFrequency: 1,
          useSubwordFeatures: false
        }
      },
      {
        name: "Filtrado por Frecuencia",
        config: {
          smoothingFactor: 1.0,
          minWordLength: 2,
          maxVocabularySize: 5000,
          enableBigrams: false,
          enableTfIdf: false,
          enableNegationHandling: false,
          enableIntensifierHandling: false,
          minWordFrequency: 3,
          useSubwordFeatures: false
        }
      },
      {
        name: "Configuración Completa",
        config: {
          smoothingFactor: 1.0,
          minWordLength: 2,
          maxVocabularySize: 8000,
          enableBigrams: true,
          enableTfIdf: false,
          enableNegationHandling: true,
          enableIntensifierHandling: true,
          minWordFrequency: 2,
          useSubwordFeatures: false
        }
      },
      {
        name: "Suavizado Optimizado",
        config: {
          smoothingFactor: 0.5,
          minWordLength: 2,
          maxVocabularySize: 6000,
          enableBigrams: true,
          enableTfIdf: false,
          enableNegationHandling: true,
          enableIntensifierHandling: true,
          minWordFrequency: 2,
          useSubwordFeatures: false
        }
      },
      {
        name: "Ultra Optimizada",
        config: {
          smoothingFactor: 0.8,
          minWordLength: 3,
          maxVocabularySize: 7000,
          enableBigrams: true,
          enableTfIdf: false,
          enableNegationHandling: true,
          enableIntensifierHandling: true,
          minWordFrequency: 2,
          useSubwordFeatures: true
        }
      }
    ];

    const results: OptimizationResult[] = [];

    // Probar cada configuración
    for (const configTest of configurations) {
      console.log(`🧠 Probando: ${configTest.name}`);
      console.log('─'.repeat(50));
      
      const model = new NaiveBayesSentimentModel(configTest.config);
      
      try {
        // Entrenar modelo
        const trainStart = Date.now();
        await model.train(train);
        const trainTime = Date.now() - trainStart;
        
        // Evaluar modelo
        const evaluation = await this.evaluateModel(model, test);
        
        const result: OptimizationResult = {
          config: configTest,
          accuracy: evaluation.accuracy,
          f1Score: evaluation.f1Score,
          precision: evaluation.precision,
          recall: evaluation.recall,
          processingTime: evaluation.avgProcessingTime
        };
        
        results.push(result);
        
        console.log(`✅ Accuracy: ${(evaluation.accuracy * 100).toFixed(2)}%`);
        console.log(`📊 F1-Score: ${(evaluation.f1Score * 100).toFixed(2)}%`);
        console.log(`⚡ Tiempo: ${evaluation.avgProcessingTime.toFixed(2)}ms`);
        console.log(`🕐 Entrenamiento: ${trainTime}ms`);
        console.log('');
        
      } catch (error) {
        console.log(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        console.log('');
      }
    }

    // Comparar con rule-based
    console.log('📏 Evaluando Rule-Based para comparación...');
    const rbEvaluation = await this.evaluateModel(this.ruleBasedModel, test);
    console.log(`✅ Rule-Based Accuracy: ${(rbEvaluation.accuracy * 100).toFixed(2)}%`);
    console.log(`📊 Rule-Based F1-Score: ${(rbEvaluation.f1Score * 100).toFixed(2)}%\n`);

    // Mostrar resultados finales
    this.showOptimizationResults(results, rbEvaluation);
  }

  /**
   * Evaluar un modelo específico
   */
  private async evaluateModel(model: any, testData: any[]): Promise<any> {
    const predictions: string[] = [];
    const actuals: string[] = [];
    const processingTimes: number[] = [];

    for (const sample of testData) {
      const startTime = Date.now();
      
      let prediction: string;
      if (model instanceof NaiveBayesSentimentModel) {
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

    return this.calculateMetrics(predictions, actuals, processingTimes);
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
   * Calcular métricas simplificadas
   */
  private calculateMetrics(predictions: string[], actuals: string[], times: number[]): any {
    const labels = ['positive', 'negative', 'neutral'];
    
    // Accuracy
    const accuracy = predictions.reduce((correct, pred, idx) => 
      pred === actuals[idx] ? correct + 1 : correct, 0) / predictions.length;

    // Calcular métricas por clase para F1-Score
    let totalPrecision = 0;
    let totalRecall = 0;
    let validClasses = 0;

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
        
        totalPrecision += precision;
        totalRecall += recall;
        validClasses++;
      }
    }

    const avgPrecision = validClasses > 0 ? totalPrecision / validClasses : 0;
    const avgRecall = validClasses > 0 ? totalRecall / validClasses : 0;
    const f1Score = (avgPrecision + avgRecall) > 0 ? 
      2 * (avgPrecision * avgRecall) / (avgPrecision + avgRecall) : 0;

    const avgProcessingTime = times.reduce((a, b) => a + b, 0) / times.length;

    return {
      accuracy,
      f1Score,
      precision: avgPrecision,
      recall: avgRecall,
      avgProcessingTime
    };
  }

  /**
   * Mostrar resultados de optimización
   */
  private showOptimizationResults(results: OptimizationResult[], ruleBasedResult: any): void {
    console.log('🏆 RESULTADOS DE OPTIMIZACIÓN');
    console.log('============================\n');

    // Ordenar por F1-Score
    results.sort((a, b) => b.f1Score - a.f1Score);

    console.log('📊 RANKING POR F1-SCORE:');
    console.log('========================');
    results.forEach((result, index) => {
      const improvementVsRB = ((result.f1Score - ruleBasedResult.f1Score) * 100).toFixed(2);
      const emoji = result.f1Score > ruleBasedResult.f1Score ? '📈' : '📉';
      
      console.log(`${index + 1}. ${result.config.name}`);
      console.log(`   🎯 F1-Score: ${(result.f1Score * 100).toFixed(2)}%`);
      console.log(`   📊 Accuracy: ${(result.accuracy * 100).toFixed(2)}%`);
      console.log(`   ⚡ Tiempo: ${result.processingTime.toFixed(2)}ms`);
      console.log(`   ${emoji} vs Rule-Based: ${improvementVsRB}%`);
      console.log('');
    });

    // Mejor configuración
    const bestConfig = results[0];
    console.log('🥇 MEJOR CONFIGURACIÓN:');
    console.log('=======================');
    console.log(`📝 Nombre: ${bestConfig.config.name}`);
    console.log(`🎯 F1-Score: ${(bestConfig.f1Score * 100).toFixed(2)}%`);
    console.log(`📊 Accuracy: ${(bestConfig.accuracy * 100).toFixed(2)}%`);
    console.log(`⚡ Tiempo: ${bestConfig.processingTime.toFixed(2)}ms`);
    console.log('');
    console.log('⚙️  Parámetros:');
    Object.entries(bestConfig.config.config).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}`);
    });

    console.log('\n🎯 RECOMENDACIÓN:');
    if (bestConfig.f1Score > ruleBasedResult.f1Score * 1.05) {
      console.log('✅ Naive Bayes optimizado supera significativamente a Rule-Based');
      console.log('🚀 RECOMENDADO implementar en producción');
    } else if (bestConfig.f1Score > ruleBasedResult.f1Score) {
      console.log('🤔 Mejora ligera sobre Rule-Based');
      console.log('💡 Considera sistema híbrido para mejor rendimiento');
    } else {
      console.log('⚖️  Rule-Based mantiene ventaja');
      console.log('🔄 Considera más datos de entrenamiento o características adicionales');
    }
  }
}

// Ejecutar optimización
async function runOptimization() {
  try {
    const optimization = new NaiveBayesOptimization();
    await optimization.runOptimization();
  } catch (error) {
    console.error('❌ Error en optimización:', error);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  runOptimization();
}

export { NaiveBayesOptimization };
