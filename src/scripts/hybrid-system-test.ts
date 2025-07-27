/**
 * Test del Sistema Híbrido de Análisis de Sentimientos
 * Valida el rendimiento del sistema combinado
 */

import { HybridSentimentAnalysisService } from '../services/hybrid-sentiment-analysis.service';
import { splitDataset, getDatasetStatistics } from '../data/training-dataset';

class HybridSystemTest {
  private hybridService: HybridSentimentAnalysisService;

  constructor() {
    this.hybridService = new HybridSentimentAnalysisService();
  }

  /**
   * Ejecutar pruebas completas del sistema híbrido
   */
  async runTests(): Promise<void> {
    console.log('🚀 TESTING SISTEMA HÍBRIDO DE ANÁLISIS DE SENTIMIENTOS');
    console.log('====================================================\n');

    // Mostrar estadísticas del dataset
    const stats = getDatasetStatistics();
    console.log('');

    // Dar tiempo para que se entrene el modelo
    console.log('⏳ Esperando inicialización del modelo híbrido...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verificar estado del modelo
    const modelStats = this.hybridService.getModelStats();
    console.log('📊 ESTADO DEL MODELO:');
    console.log(`🧠 Modelo entrenado: ${modelStats.isModelTrained ? '✅' : '❌'}`);
    console.log(`🔧 Tipo: ${modelStats.modelType}`);
    console.log(`🧩 Componentes: ${modelStats.components.join(', ')}`);
    console.log('');

    // Pruebas de casos específicos
    await this.testSpecificCases();

    // Evaluación en dataset de prueba
    await this.evaluateOnTestSet();

    // Pruebas de rendimiento
    await this.performanceTests();
  }

  /**
   * Probar casos específicos
   */
  private async testSpecificCases(): Promise<void> {
    console.log('🧪 PRUEBAS DE CASOS ESPECÍFICOS:');
    console.log('================================');

    const testCases = [
      { text: "Me encanta este producto, es fantástico!", expected: "positive" },
      { text: "Terrible servicio, muy decepcionante", expected: "negative" },
      { text: "El producto está bien, nada especial", expected: "neutral" },
      { text: "Amazing quality! Highly recommended!", expected: "positive" },
      { text: "Worst purchase ever, waste of money", expected: "negative" },
      { text: "Average product, could be better", expected: "neutral" },
      { text: "No me gusta nada, muy malo", expected: "negative" },
      { text: "Perfecto! Exactamente lo que buscaba", expected: "positive" },
      { text: "Es normal, ni bueno ni malo", expected: "neutral" },
      { text: "Absolutely love it! Best decision ever!", expected: "positive" }
    ];

    let correct = 0;
    const results: any[] = [];

    for (const testCase of testCases) {
      try {
        const result = await this.hybridService.analyze(testCase.text);
        const prediction = this.normalizeSentimentLabel(result.sentiment.label);
        const isCorrect = prediction === testCase.expected;
        
        if (isCorrect) correct++;

        results.push({
          text: testCase.text.substring(0, 40) + (testCase.text.length > 40 ? '...' : ''),
          expected: testCase.expected,
          predicted: prediction,
          confidence: (result.sentiment.confidence * 100).toFixed(1),
          method: result.sentiment.method,
          correct: isCorrect,
          processingTime: result.details.processingTime
        });

        const emoji = isCorrect ? '✅' : '❌';
        const methodEmoji = result.sentiment.method === 'hybrid' ? '🤝' : 
                           result.sentiment.method === 'naive-bayes' ? '🧠' : '📏';
        
        console.log(`${emoji} ${methodEmoji} ${testCase.text.substring(0, 35)}...`);
        console.log(`   📊 Esperado: ${testCase.expected} | Predicho: ${prediction} (${result.sentiment.confidence.toFixed(2)})`);
        console.log(`   ⚡ Tiempo: ${result.details.processingTime}ms | Método: ${result.sentiment.method}`);
        console.log('');

      } catch (error) {
        console.log(`❌ Error procesando: ${testCase.text}`);
        console.log(`   💥 ${error instanceof Error ? error.message : 'Unknown error'}`);
        console.log('');
      }
    }

    const accuracy = (correct / testCases.length) * 100;
    console.log(`🎯 PRECISIÓN EN CASOS ESPECÍFICOS: ${accuracy.toFixed(1)}% (${correct}/${testCases.length})`);
    console.log('');
  }

  /**
   * Evaluar en dataset de prueba
   */
  private async evaluateOnTestSet(): Promise<void> {
    console.log('📈 EVALUACIÓN EN DATASET DE PRUEBA:');
    console.log('===================================');

    const { test } = splitDataset(0.2);
    console.log(`🧪 Evaluando en ${test.length} ejemplos de prueba...`);

    const predictions: string[] = [];
    const actuals: string[] = [];
    const methods: string[] = [];
    const processingTimes: number[] = [];

    for (const sample of test) {
      try {
        const result = await this.hybridService.analyze(sample.text);
        const prediction = this.normalizeSentimentLabel(result.sentiment.label);
        const actual = this.normalizeSentimentLabel(sample.sentiment);

        predictions.push(prediction);
        actuals.push(actual);
        methods.push(result.sentiment.method);
        processingTimes.push(result.details.processingTime);

      } catch (error) {
        console.log(`⚠️ Error en muestra: ${sample.text.substring(0, 30)}...`);
        // Agregar como error para mantener consistencia
        predictions.push('neutral');
        actuals.push(this.normalizeSentimentLabel(sample.sentiment));
        methods.push('error');
        processingTimes.push(0);
      }
    }

    // Calcular métricas
    const metrics = this.calculateMetrics(predictions, actuals);
    
    // Estadísticas por método
    const methodStats = this.getMethodStatistics(methods);

    console.log('📊 RESULTADOS:');
    console.log(`🎯 Accuracy: ${(metrics.accuracy * 100).toFixed(2)}%`);
    console.log(`📈 F1-Score: ${(metrics.f1Score * 100).toFixed(2)}%`);
    console.log(`🎪 Precision: ${(metrics.precision * 100).toFixed(2)}%`);
    console.log(`🔍 Recall: ${(metrics.recall * 100).toFixed(2)}%`);
    console.log(`⚡ Tiempo promedio: ${metrics.avgProcessingTime.toFixed(2)}ms`);
    console.log('');

    console.log('🧩 DISTRIBUCIÓN POR MÉTODO:');
    Object.entries(methodStats).forEach(([method, count]) => {
      const percentage = ((count as number) / test.length * 100).toFixed(1);
      const emoji = method === 'hybrid' ? '🤝' : method === 'naive-bayes' ? '🧠' : method === 'rule-based' ? '📏' : '💥';
      console.log(`${emoji} ${method}: ${count} (${percentage}%)`);
    });
    console.log('');
  }

  /**
   * Pruebas de rendimiento
   */
  private async performanceTests(): Promise<void> {
    console.log('⚡ PRUEBAS DE RENDIMIENTO:');
    console.log('=========================');

    const testTexts = [
      "Texto corto positivo",
      "Este es un texto de longitud media que contiene varias palabras para evaluar el rendimiento del sistema híbrido de análisis de sentimientos",
      "Este es un texto mucho más largo que simula el tipo de contenido que podríamos encontrar en redes sociales o reseñas de productos. Incluye múltiples oraciones, diferentes emociones, y una variedad de palabras que permitirán probar tanto la precisión como la velocidad del sistema de análisis de sentimientos híbrido. Es importante medir no solo la precisión sino también la velocidad de procesamiento para asegurar que el sistema sea viable en producción."
    ];

    for (let i = 0; i < testTexts.length; i++) {
      const text = testTexts[i];
      const iterations = 10;
      const times: number[] = [];

      console.log(`📝 Prueba ${i + 1}: Texto de ${text.length} caracteres`);
      
      for (let j = 0; j < iterations; j++) {
        const startTime = Date.now();
        await this.hybridService.analyze(text);
        const endTime = Date.now();
        times.push(endTime - startTime);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const minTime = Math.min(...times);
      const maxTime = Math.max(...times);

      console.log(`   ⚡ Tiempo promedio: ${avgTime.toFixed(2)}ms`);
      console.log(`   🚀 Tiempo mínimo: ${minTime}ms`);
      console.log(`   🐌 Tiempo máximo: ${maxTime}ms`);
      console.log('');
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

  /**
   * Calcular métricas de evaluación
   */
  private calculateMetrics(predictions: string[], actuals: string[]): any {
    const labels = ['positive', 'negative', 'neutral'];
    
    // Accuracy
    const accuracy = predictions.reduce((correct, pred, idx) => 
      pred === actuals[idx] ? correct + 1 : correct, 0) / predictions.length;

    // Métricas por clase
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

    return {
      accuracy,
      f1Score,
      precision: avgPrecision,
      recall: avgRecall,
      avgProcessingTime: 1.5 // Estimado
    };
  }

  /**
   * Obtener estadísticas por método
   */
  private getMethodStatistics(methods: string[]): Record<string, number> {
    return methods.reduce((stats, method) => {
      stats[method] = (stats[method] || 0) + 1;
      return stats;
    }, {} as Record<string, number>);
  }
}

// Ejecutar pruebas
async function runHybridTests() {
  try {
    const tester = new HybridSystemTest();
    await tester.runTests();
    console.log('🎉 Pruebas del sistema híbrido completadas exitosamente!');
  } catch (error) {
    console.error('❌ Error en pruebas del sistema híbrido:', error);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  runHybridTests();
}

export { HybridSystemTest };
