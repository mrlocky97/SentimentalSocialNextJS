/**
 * Test de Endpoints del Sistema Híbrido
 * Prueba todos los endpoints de la API híbrida
 */

import axios from 'axios';

interface TestConfig {
  baseUrl: string;
  authToken?: string;
}

class HybridEndpointTester {
  private config: TestConfig;
  private testResults: any[] = [];

  constructor(config: TestConfig) {
    this.config = config;
  }

  /**
   * Ejecutar todas las pruebas
   */
  async runAllTests(): Promise<void> {
    console.log('🚀 TESTING ENDPOINTS DEL SISTEMA HÍBRIDO');
    console.log('========================================\n');

    console.log(`🌐 Base URL: ${this.config.baseUrl}`);
    console.log(`🔑 Auth Token: ${this.config.authToken ? 'Configurado' : 'No configurado'}`);
    console.log('');

    // Configurar headers
    const headers: any = {
      'Content-Type': 'application/json'
    };

    if (this.config.authToken) {
      headers['Authorization'] = `Bearer ${this.config.authToken}`;
    }

    // Test 1: Health Check (sin autenticación)
    await this.testHealthCheck();

    // Test 2: Análisis individual
    await this.testAnalyzeEndpoint(headers);

    // Test 3: Análisis por lotes
    await this.testBatchEndpoint(headers);

    // Test 4: Comparación de modelos
    await this.testCompareEndpoint(headers);

    // Test 5: Estadísticas del modelo
    await this.testStatsEndpoint(headers);

    // Test 6: Reentrenamiento (solo admin)
    await this.testRetrainEndpoint(headers);

    // Mostrar resumen final
    this.showTestSummary();
  }

  /**
   * Test Health Check
   */
  private async testHealthCheck(): Promise<void> {
    console.log('🏥 TEST: Health Check');
    console.log('--------------------');

    try {
      const response = await axios.get(`${this.config.baseUrl}/api/v1/hybrid/health`);
      
      const result = {
        test: 'Health Check',
        status: 'SUCCESS',
        statusCode: response.status,
        responseTime: 'N/A',
        data: response.data
      };

      this.testResults.push(result);

      console.log(`✅ Status: ${response.status}`);
      console.log(`🏥 Health: ${response.data.status}`);
      console.log(`🧠 Model Trained: ${response.data.modelTrained}`);
      console.log(`⚡ Response Time: ${response.data.responseTime}`);
      console.log(`🔍 Test Result: ${response.data.testResult?.sentiment} (${response.data.testResult?.method})`);
      console.log('');

    } catch (error: any) {
      const result = {
        test: 'Health Check',
        status: 'FAILED',
        error: error.response?.data || error.message
      };

      this.testResults.push(result);
      console.log(`❌ Error: ${error.response?.status || 'Network'} - ${error.message}`);
      console.log('');
    }
  }

  /**
   * Test Analyze Endpoint
   */
  private async testAnalyzeEndpoint(headers: any): Promise<void> {
    console.log('🧠 TEST: Analyze Individual');
    console.log('---------------------------');

    const testCases = [
      { text: "Me encanta este producto, es fantástico!", expected: "positive" },
      { text: "Terrible servicio, muy malo", expected: "negative" },
      { text: "El producto está bien", expected: "neutral" },
      { text: "Amazing quality! Love it!", expected: "positive" }
    ];

    for (const testCase of testCases) {
      try {
        const startTime = Date.now();
        const response = await axios.post(
          `${this.config.baseUrl}/api/v1/hybrid/analyze`,
          { 
            text: testCase.text,
            includeDetails: true 
          },
          { headers }
        );
        const responseTime = Date.now() - startTime;

        const prediction = this.normalizeSentimentLabel(response.data.sentiment.label);
        const isCorrect = prediction === testCase.expected;

        const result = {
          test: `Analyze: ${testCase.text.substring(0, 30)}...`,
          status: isCorrect ? 'SUCCESS' : 'MISMATCH',
          statusCode: response.status,
          responseTime: responseTime,
          expected: testCase.expected,
          predicted: prediction,
          confidence: response.data.sentiment.confidence,
          method: response.data.sentiment.method
        };

        this.testResults.push(result);

        const emoji = isCorrect ? '✅' : '⚠️';
        const methodEmoji = response.data.sentiment.method === 'hybrid' ? '🤝' : 
                           response.data.sentiment.method === 'naive-bayes' ? '🧠' : '📏';

        console.log(`${emoji} ${methodEmoji} "${testCase.text.substring(0, 35)}..."`);
        console.log(`   📊 Esperado: ${testCase.expected} | Predicho: ${prediction}`);
        console.log(`   🎯 Confianza: ${(response.data.sentiment.confidence * 100).toFixed(1)}%`);
        console.log(`   ⚡ Tiempo: ${responseTime}ms | Método: ${response.data.sentiment.method}`);
        console.log('');

      } catch (error: any) {
        const result = {
          test: `Analyze: ${testCase.text.substring(0, 30)}...`,
          status: 'FAILED',
          error: error.response?.data || error.message
        };

        this.testResults.push(result);
        console.log(`❌ Error analizando: "${testCase.text.substring(0, 35)}..."`);
        console.log(`   💥 ${error.response?.status || 'Network'}: ${error.message}`);
        console.log('');
      }
    }
  }

  /**
   * Test Batch Endpoint
   */
  private async testBatchEndpoint(headers: any): Promise<void> {
    console.log('📦 TEST: Batch Analysis');
    console.log('-----------------------');

    const batchTexts = [
      "Excelente producto, muy recomendado",
      "No me gusta nada, muy malo",
      "Producto normal, nada especial",
      "Amazing quality and fast delivery!",
      "Worst purchase ever, terrible quality"
    ];

    try {
      const startTime = Date.now();
      const response = await axios.post(
        `${this.config.baseUrl}/api/v1/hybrid/batch`,
        { 
          texts: batchTexts,
          includeDetails: false 
        },
        { headers }
      );
      const responseTime = Date.now() - startTime;

      const result = {
        test: 'Batch Analysis',
        status: 'SUCCESS',
        statusCode: response.status,
        responseTime: responseTime,
        summary: response.data.summary
      };

      this.testResults.push(result);

      console.log(`✅ Status: ${response.status}`);
      console.log(`📊 Total procesados: ${response.data.summary.total}`);
      console.log(`✅ Exitosos: ${response.data.summary.successful}`);
      console.log(`❌ Fallidos: ${response.data.summary.failed}`);
      console.log(`⚡ Tiempo total: ${responseTime}ms`);
      console.log(`🔄 Tiempo promedio por texto: ${response.data.summary.avgTimePerText.toFixed(1)}ms`);
      
      // Mostrar algunos resultados
      console.log('\n📋 Resultados muestra:');
      response.data.results.slice(0, 3).forEach((result: any, index: number) => {
        const methodEmoji = result.sentiment?.method === 'hybrid' ? '🤝' : 
                           result.sentiment?.method === 'naive-bayes' ? '🧠' : '📏';
        console.log(`   ${index + 1}. ${methodEmoji} ${result.sentiment?.label} (${(result.sentiment?.confidence * 100).toFixed(1)}%)`);
      });
      console.log('');

    } catch (error: any) {
      const result = {
        test: 'Batch Analysis',
        status: 'FAILED',
        error: error.response?.data || error.message
      };

      this.testResults.push(result);
      console.log(`❌ Error en batch: ${error.response?.status || 'Network'} - ${error.message}`);
      console.log('');
    }
  }

  /**
   * Test Compare Endpoint
   */
  private async testCompareEndpoint(headers: any): Promise<void> {
    console.log('⚖️ TEST: Model Comparison');
    console.log('-------------------------');

    const compareText = "Este producto es increíble, me encanta la calidad y el servicio";

    try {
      const startTime = Date.now();
      const response = await axios.post(
        `${this.config.baseUrl}/api/v1/hybrid/compare`,
        { text: compareText },
        { headers }
      );
      const responseTime = Date.now() - startTime;

      const result = {
        test: 'Model Comparison',
        status: 'SUCCESS',
        statusCode: response.status,
        responseTime: responseTime,
        comparison: response.data.comparison
      };

      this.testResults.push(result);

      console.log(`✅ Status: ${response.status}`);
      console.log(`📝 Texto: "${response.data.text}"`);
      console.log('');
      console.log('🤝 HÍBRIDO:');
      console.log(`   📊 Resultado: ${response.data.comparison.hybrid.sentiment.label}`);
      console.log(`   🎯 Confianza: ${(response.data.comparison.hybrid.sentiment.confidence * 100).toFixed(1)}%`);
      console.log(`   ⚡ Tiempo: ${response.data.comparison.hybrid.processingTime}ms`);
      console.log(`   🧠 Método: ${response.data.comparison.hybrid.method}`);
      console.log('');
      console.log('📏 RULE-BASED:');
      console.log(`   📊 Resultado: ${response.data.comparison.ruleBased.sentiment.label}`);
      console.log(`   🎯 Confianza: ${(response.data.comparison.ruleBased.sentiment.confidence * 100).toFixed(1)}%`);
      console.log(`   ⚡ Tiempo: ${response.data.comparison.ruleBased.processingTime}ms`);
      console.log('');
      console.log(`🤝 Coincidencia: ${response.data.comparison.agreement ? '✅ Sí' : '❌ No'}`);
      console.log(`⚡ Mejora de velocidad: ${response.data.comparison.speedImprovement}`);
      console.log('');

    } catch (error: any) {
      const result = {
        test: 'Model Comparison',
        status: 'FAILED',
        error: error.response?.data || error.message
      };

      this.testResults.push(result);
      console.log(`❌ Error en comparación: ${error.response?.status || 'Network'} - ${error.message}`);
      console.log('');
    }
  }

  /**
   * Test Stats Endpoint
   */
  private async testStatsEndpoint(headers: any): Promise<void> {
    console.log('📊 TEST: Model Statistics');
    console.log('-------------------------');

    try {
      const startTime = Date.now();
      const response = await axios.get(
        `${this.config.baseUrl}/api/v1/hybrid/stats`,
        { headers }
      );
      const responseTime = Date.now() - startTime;

      const result = {
        test: 'Model Statistics',
        status: 'SUCCESS',
        statusCode: response.status,
        responseTime: responseTime,
        stats: response.data
      };

      this.testResults.push(result);

      console.log(`✅ Status: ${response.status}`);
      console.log(`🔧 Versión: ${response.data.systemInfo.version}`);
      console.log(`🎯 Accuracy: ${response.data.systemInfo.accuracy}`);
      console.log(`📈 F1-Score: ${response.data.systemInfo.f1Score}`);
      console.log(`🌐 Idiomas: ${response.data.systemInfo.supportedLanguages.join(', ')}`);
      console.log(`📏 Max texto: ${response.data.systemInfo.maxTextLength} caracteres`);
      console.log(`📦 Max batch: ${response.data.systemInfo.maxBatchSize} textos`);
      console.log(`⚡ Rendimiento: ${response.data.performance.avgProcessingTime}`);
      console.log(`🚀 Throughput: ${response.data.performance.throughput}`);
      console.log('');

    } catch (error: any) {
      const result = {
        test: 'Model Statistics',
        status: 'FAILED',
        error: error.response?.data || error.message
      };

      this.testResults.push(result);
      console.log(`❌ Error obteniendo stats: ${error.response?.status || 'Network'} - ${error.message}`);
      console.log('');
    }
  }

  /**
   * Test Retrain Endpoint
   */
  private async testRetrainEndpoint(headers: any): Promise<void> {
    console.log('🔄 TEST: Model Retrain (Admin only)');
    console.log('-----------------------------------');

    try {
      const startTime = Date.now();
      const response = await axios.post(
        `${this.config.baseUrl}/api/v1/hybrid/retrain`,
        {},
        { headers }
      );
      const responseTime = Date.now() - startTime;

      const result = {
        test: 'Model Retrain',
        status: 'SUCCESS',
        statusCode: response.status,
        responseTime: responseTime,
        retrainInfo: response.data
      };

      this.testResults.push(result);

      console.log(`✅ Status: ${response.status}`);
      console.log(`✅ ${response.data.message}`);
      console.log(`⚡ Tiempo de reentrenamiento: ${response.data.retrainingTime}`);
      console.log(`🧠 Modelo entrenado: ${response.data.newStats.isModelTrained ? 'Sí' : 'No'}`);
      console.log('');

    } catch (error: any) {
      const result = {
        test: 'Model Retrain',
        status: 'FAILED',
        error: error.response?.data || error.message
      };

      this.testResults.push(result);

      if (error.response?.status === 403) {
        console.log(`⚠️ Acceso denegado (esperado si no eres admin): ${error.response.status}`);
      } else {
        console.log(`❌ Error reentrenando: ${error.response?.status || 'Network'} - ${error.message}`);
      }
      console.log('');
    }
  }

  /**
   * Mostrar resumen de pruebas
   */
  private showTestSummary(): void {
    console.log('📋 RESUMEN DE PRUEBAS');
    console.log('====================');

    const total = this.testResults.length;
    const successful = this.testResults.filter(r => r.status === 'SUCCESS').length;
    const failed = this.testResults.filter(r => r.status === 'FAILED').length;
    const mismatched = this.testResults.filter(r => r.status === 'MISMATCH').length;

    console.log(`📊 Total de pruebas: ${total}`);
    console.log(`✅ Exitosas: ${successful}`);
    console.log(`❌ Fallidas: ${failed}`);
    console.log(`⚠️ Desajustes: ${mismatched}`);
    console.log(`🎯 Tasa de éxito: ${((successful / total) * 100).toFixed(1)}%`);
    console.log('');

    // Mostrar detalles de fallos
    const failures = this.testResults.filter(r => r.status === 'FAILED');
    if (failures.length > 0) {
      console.log('💥 FALLOS DETECTADOS:');
      failures.forEach(failure => {
        console.log(`   ❌ ${failure.test}: ${failure.error?.error || failure.error}`);
      });
      console.log('');
    }

    // Mostrar tiempos de respuesta
    const responseTimes = this.testResults
      .filter(r => r.responseTime)
      .map(r => r.responseTime);
    
    if (responseTimes.length > 0) {
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      console.log(`⚡ Tiempo de respuesta promedio: ${avgResponseTime.toFixed(1)}ms`);
    }

    console.log('\n🎉 Testing del sistema híbrido completado!');
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

// Configuración y ejecución
async function runEndpointTests() {
  const config: TestConfig = {
    baseUrl: 'http://localhost:3000', // Ajustar según tu configuración
    authToken: process.env.TEST_AUTH_TOKEN // Token JWT para pruebas
  };

  console.log('⚠️ NOTA: Asegúrate de que el servidor esté corriendo en', config.baseUrl);
  console.log('🔑 Para pruebas completas, configura TEST_AUTH_TOKEN en .env');
  console.log('');

  const tester = new HybridEndpointTester(config);
  await tester.runAllTests();
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  runEndpointTests().catch(console.error);
}

export { HybridEndpointTester };
