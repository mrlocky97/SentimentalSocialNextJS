/**
 * Script de Comparación de Configuraciones del Modelo Enhanced
 * 
 * Compara diferentes configuraciones y ajustes del sistema enhanced
 * para encontrar la configuración óptima
 */

import { enhancedTrainingDataV3Clean } from '../src/data/enhanced-training-data-v3-clean';
import { sentimentServiceFacade } from '../src/lib/sentiment/sentiment-service-facade';

interface ConfigurationTest {
  name: string;
  description: string;
  method: string;
  params?: Record<string, any>;
}

interface TestResult {
  configuration: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  avgConfidence: number;
  processingTimeMs: number;
  predictions: Array<{
    text: string;
    actual: string;
    predicted: string;
    confidence: number;
    correct: boolean;
  }>;
}

class ModelConfigurationTester {
  
  /**
   * Prueba diferentes configuraciones del modelo
   */
  static async testConfigurations(sampleSize: number = 200): Promise<TestResult[]> {
    console.log('🔧 PROBANDO CONFIGURACIONES DEL MODELO ENHANCED');
    console.log('='.repeat(60));
    
    // Preparar datos de test
    const testData = enhancedTrainingDataV3Clean
      .slice(0, sampleSize)
      .map(item => ({
        text: item.text,
        label: item.label as 'positive' | 'negative' | 'neutral'
      }));
    
    console.log(`📊 Usando ${testData.length} ejemplos para evaluación`);
    
    // Configuraciones a probar
    const configurations: ConfigurationTest[] = [
      {
        name: 'Enhanced-Default',
        description: 'Configuración enhanced por defecto',
        method: 'enhanced'
      },
      {
        name: 'Unified-Orchestrator',
        description: 'Orchestrador unificado',
        method: 'unified'
      },
      {
        name: 'Base-Engine',
        description: 'Motor base sin enhancements',
        method: 'base'
      }
    ];
    
    const results: TestResult[] = [];
    
    // Probar cada configuración
    for (const config of configurations) {
      console.log(`\n🧪 Probando configuración: ${config.name}`);
      console.log(`   ${config.description}`);
      
      const result = await this.testSingleConfiguration(config, testData);
      results.push(result);
      
      console.log(`   ✅ Accuracy: ${(result.accuracy * 100).toFixed(2)}%`);
      console.log(`   ⏱️  Tiempo promedio: ${result.processingTimeMs.toFixed(1)}ms por predicción`);
    }
    
    // Mostrar comparación
    this.showConfigurationComparison(results);
    
    return results;
  }
  
  /**
   * Prueba una configuración específica
   */
  private static async testSingleConfiguration(
    config: ConfigurationTest,
    testData: Array<{text: string; label: string}>
  ): Promise<TestResult> {
    const predictions: Array<{
      text: string;
      actual: string;
      predicted: string;
      confidence: number;
      correct: boolean;
    }> = [];
    
    let totalProcessingTime = 0;
    let totalConfidence = 0;
    
    for (let i = 0; i < testData.length; i++) {
      if (i > 0 && i % 50 === 0) {
        console.log(`     Progreso: ${i}/${testData.length}`);
      }
      
      const item = testData[i];
      const startTime = Date.now();
      
      try {
        // Hacer predicción según la configuración
        const result = await sentimentServiceFacade.testSentimentAnalysis({
          text: item.text,
          method: config.method
        });
        
        const processingTime = Date.now() - startTime;
        totalProcessingTime += processingTime;
        
        const predicted = result.label.toLowerCase();
        const confidence = result.confidence || 0.5;
        totalConfidence += confidence;
        
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
        totalProcessingTime += Date.now() - startTime;
      }
    }
    
    // Calcular métricas
    const metrics = this.calculateDetailedMetrics(predictions);
    
    return {
      configuration: config.name,
      accuracy: metrics.accuracy,
      precision: metrics.precision,
      recall: metrics.recall,
      f1Score: metrics.f1Score,
      avgConfidence: totalConfidence / predictions.length,
      processingTimeMs: totalProcessingTime / predictions.length,
      predictions
    };
  }
  
  /**
   * Calcula métricas detalladas
   */
  private static calculateDetailedMetrics(predictions: Array<{
    text: string;
    actual: string;
    predicted: string;
    confidence: number;
    correct: boolean;
  }>) {
    const labels = ['positive', 'negative', 'neutral'];
    
    // Accuracy
    const accuracy = predictions.filter(p => p.correct).length / predictions.length;
    
    // Calcular por clase
    let totalPrecision = 0;
    let totalRecall = 0;
    let totalF1 = 0;
    let validClasses = 0;
    
    labels.forEach(label => {
      const tp = predictions.filter(p => p.actual === label && p.predicted === label).length;
      const fp = predictions.filter(p => p.actual !== label && p.predicted === label).length;
      const fn = predictions.filter(p => p.actual === label && p.predicted !== label).length;
      
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
      f1Score: validClasses > 0 ? totalF1 / validClasses : 0
    };
  }
  
  /**
   * Muestra comparación entre configuraciones
   */
  private static showConfigurationComparison(results: TestResult[]): void {
    console.log('\n' + '='.repeat(80));
    console.log('📊 COMPARACIÓN DE CONFIGURACIONES');
    console.log('='.repeat(80));
    
    // Ordenar por F1-Score
    const sortedResults = [...results].sort((a, b) => b.f1Score - a.f1Score);
    
    console.log('\n🏆 RANKING POR F1-SCORE:');
    sortedResults.forEach((result, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
      console.log(`${medal} ${result.configuration}`);
      console.log(`     F1-Score: ${(result.f1Score * 100).toFixed(2)}%`);
      console.log(`     Accuracy: ${(result.accuracy * 100).toFixed(2)}%`);
      console.log(`     Precision: ${(result.precision * 100).toFixed(2)}%`);
      console.log(`     Recall: ${(result.recall * 100).toFixed(2)}%`);
      console.log(`     Avg Confidence: ${(result.avgConfidence * 100).toFixed(1)}%`);
      console.log(`     Avg Processing Time: ${result.processingTimeMs.toFixed(1)}ms`);
      console.log('');
    });
    
    // Tabla comparativa
    console.log('📋 TABLA COMPARATIVA:');
    console.log('');
    console.log('Configuration'.padEnd(20) + 'Accuracy'.padEnd(10) + 'F1-Score'.padEnd(10) + 'Time(ms)'.padEnd(10) + 'Confidence'.padEnd(12));
    console.log('-'.repeat(62));
    
    sortedResults.forEach(result => {
      const accuracy = `${(result.accuracy * 100).toFixed(1)}%`;
      const f1Score = `${(result.f1Score * 100).toFixed(1)}%`;
      const time = `${result.processingTimeMs.toFixed(1)}`;
      const confidence = `${(result.avgConfidence * 100).toFixed(1)}%`;
      
      console.log(
        result.configuration.padEnd(20) +
        accuracy.padEnd(10) +
        f1Score.padEnd(10) +
        time.padEnd(10) +
        confidence.padEnd(12)
      );
    });
    
    // Análisis de rendimiento
    const bestPerformance = sortedResults[0];
    const fastestConfig = results.reduce((fastest, current) => 
      current.processingTimeMs < fastest.processingTimeMs ? current : fastest
    );
    const mostConfident = results.reduce((confident, current) => 
      current.avgConfidence > confident.avgConfidence ? current : confident
    );
    
    console.log('\n🎯 ANÁLISIS DE RENDIMIENTO:');
    console.log(`   Mejor F1-Score: ${bestPerformance.configuration} (${(bestPerformance.f1Score * 100).toFixed(2)}%)`);
    console.log(`   Más rápido: ${fastestConfig.configuration} (${fastestConfig.processingTimeMs.toFixed(1)}ms)`);
    console.log(`   Mayor confianza: ${mostConfident.configuration} (${(mostConfident.avgConfidence * 100).toFixed(1)}%)`);
    
    // Recomendación
    console.log('\n💡 RECOMENDACIÓN:');
    if (bestPerformance.configuration === fastestConfig.configuration) {
      console.log(`   ✅ ${bestPerformance.configuration} es la mejor opción: mejor rendimiento Y velocidad`);
    } else {
      console.log(`   🎯 Para precisión: ${bestPerformance.configuration}`);
      console.log(`   ⚡ Para velocidad: ${fastestConfig.configuration}`);
      console.log(`   🔍 Para confianza: ${mostConfident.configuration}`);
    }
  }
  
  /**
   * Análisis de errores por configuración
   */
  static async analyzeErrors(results: TestResult[]): Promise<void> {
    console.log('\n' + '='.repeat(80));
    console.log('🔍 ANÁLISIS DE ERRORES');
    console.log('='.repeat(80));
    
    results.forEach(result => {
      console.log(`\n📊 ${result.configuration}:`);
      
      const errors = result.predictions.filter(p => !p.correct);
      const errorsByActual: Record<string, number> = {};
      const errorsByPredicted: Record<string, number> = {};
      
      errors.forEach(error => {
        errorsByActual[error.actual] = (errorsByActual[error.actual] || 0) + 1;
        errorsByPredicted[error.predicted] = (errorsByPredicted[error.predicted] || 0) + 1;
      });
      
      console.log(`   Total errores: ${errors.length}/${result.predictions.length} (${(errors.length/result.predictions.length*100).toFixed(1)}%)`);
      
      console.log('   Errores por clase real:');
      Object.entries(errorsByActual).forEach(([label, count]) => {
        console.log(`     ${label}: ${count} errores`);
      });
      
      console.log('   Predicciones erróneas más comunes:');
      Object.entries(errorsByPredicted).forEach(([label, count]) => {
        console.log(`     Predijo "${label}": ${count} veces incorrectamente`);
      });
      
      // Mostrar algunos ejemplos de errores
      const sampleErrors = errors.slice(0, 3);
      if (sampleErrors.length > 0) {
        console.log('   Ejemplos de errores:');
        sampleErrors.forEach((error, index) => {
          console.log(`     ${index + 1}. "${error.text.substring(0, 50)}..."`);
          console.log(`        Real: ${error.actual}, Predicho: ${error.predicted} (conf: ${(error.confidence*100).toFixed(1)}%)`);
        });
      }
    });
  }
}

// Función principal
async function runConfigurationComparison() {
  console.log('🚀 COMPARACIÓN DE CONFIGURACIONES DEL MODELO');
  console.log('=' .repeat(80));
  
  try {
    // Probar configuraciones
    const results = await ModelConfigurationTester.testConfigurations(300);
    
    // Análisis de errores
    await ModelConfigurationTester.analyzeErrors(results);
    
    console.log('\n✅ COMPARACIÓN COMPLETADA!');
    
    return results;
    
  } catch (error) {
    console.error('❌ Error durante la comparación:', error);
    throw error;
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  runConfigurationComparison()
    .then(() => {
      console.log('\n🎉 Comparación de configuraciones completada!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Error en comparación:', error);
      process.exit(1);
    });
}

export { ModelConfigurationTester, runConfigurationComparison };
