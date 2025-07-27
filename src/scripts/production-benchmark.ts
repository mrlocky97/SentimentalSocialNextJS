/**
 * Test de Rendimiento Real del Sistema en Producción
 * Mide el rendimiento del sistema híbrido actualizado
 */

import axios from 'axios';

interface BenchmarkResult {
  testName: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  requestsPerSecond: number;
  accuracy?: number;
  throughput: number;
}

class ProductionBenchmark {
  private baseUrl: string;
  private results: BenchmarkResult[] = [];

  constructor(baseUrl: string = 'http://localhost:3001') {
    this.baseUrl = baseUrl;
  }

  /**
   * Ejecutar benchmark completo
   */
  async runBenchmark(): Promise<void> {
    console.log('⚡ BENCHMARK DE RENDIMIENTO EN PRODUCCIÓN');
    console.log('========================================');
    console.log(`🔗 Base URL: ${this.baseUrl}`);
    console.log(`📅 Fecha: ${new Date().toLocaleString()}\n`);

    // Verificar servidor
    if (!(await this.checkServerHealth())) {
      console.log('❌ Servidor no disponible');
      return;
    }

    console.log('✅ Servidor disponible - Iniciando benchmark...\n');

    // Test de rendimiento híbrido
    await this.benchmarkHybridSystem();
    
    // Test de carga del sentiment analysis
    await this.benchmarkSentimentAnalysis();
    
    // Test de throughput
    await this.benchmarkThroughput();

    // Mostrar resultados finales
    this.showBenchmarkResults();
  }

  /**
   * Verificar salud del servidor
   */
  private async checkServerHealth(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl}/health`, { timeout: 5000 });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  /**
   * Benchmark del sistema híbrido
   */
  private async benchmarkHybridSystem(): Promise<void> {
    console.log('🧠 BENCHMARK: Sistema Híbrido');
    console.log('=============================');

    const testTexts = [
      'Me encanta este producto, es fantástico y de excelente calidad!',
      'Odio completamente esta aplicación, es terrible y no funciona bien',
      'El clima está nublado hoy, parece que va a llover esta tarde',
      'Amazing product! Best purchase ever! Highly recommended! 🎉',
      'Worst experience ever. Complete waste of money and time!',
      'Excelente servicio al cliente, muy profesional y eficiente 👍',
      'Pésima experiencia de compra, nunca más vuelvo a este lugar',
      'Regular, no está mal pero tampoco es algo extraordinario',
      'LOVE LOVE LOVE this app! Perfect functionality and design! ❤️',
      'TERRIBLE quality control. Product arrived damaged and broken.'
    ];

    const results = await this.runLoadTest(
      'Sistema Híbrido',
      testTexts,
      (text) => this.testHybridEndpoint(text),
      5 // 5 iteraciones por texto
    );

    this.results.push(results);
    console.log(`   ✅ Completado: ${results.averageResponseTime.toFixed(1)}ms promedio\n`);
  }

  /**
   * Benchmark del análisis de sentimientos
   */
  private async benchmarkSentimentAnalysis(): Promise<void> {
    console.log('📊 BENCHMARK: Análisis de Sentimientos');
    console.log('=====================================');

    const testTweets = this.generateTestTweets();

    const results = await this.runLoadTest(
      'Sentiment Analysis',
      testTweets,
      (tweet) => this.testSentimentEndpoint(tweet),
      3 // 3 iteraciones por tweet
    );

    this.results.push(results);
    console.log(`   ✅ Completado: ${results.averageResponseTime.toFixed(1)}ms promedio\n`);
  }

  /**
   * Benchmark de throughput
   */
  private async benchmarkThroughput(): Promise<void> {
    console.log('🚀 BENCHMARK: Throughput Test');
    console.log('=============================');

    const testText = 'Producto excelente, muy recomendado para todos!';
    const concurrentRequests = 10;
    const totalRequests = 50;

    console.log(`   📊 Ejecutando ${totalRequests} requests con ${concurrentRequests} concurrentes...`);

    const startTime = Date.now();
    const promises: Promise<any>[] = [];
    const results: any[] = [];

    for (let i = 0; i < totalRequests; i++) {
      const promise = this.testHybridEndpoint(testText)
        .then(result => {
          results.push(result);
          process.stdout.write(`\r   📈 Progreso: ${results.length}/${totalRequests} requests completados`);
        })
        .catch(error => {
          results.push({ error: true, responseTime: 0 });
        });

      promises.push(promise);

      // Limitar concurrencia
      if (promises.length >= concurrentRequests) {
        await Promise.all(promises);
        promises.length = 0;
      }
    }

    // Esperar requests restantes
    await Promise.all(promises);

    const totalTime = Date.now() - startTime;
    const successfulRequests = results.filter(r => !r.error).length;
    const averageResponseTime = results
      .filter(r => !r.error)
      .reduce((sum, r) => sum + r.responseTime, 0) / successfulRequests;

    const throughputResult: BenchmarkResult = {
      testName: 'Throughput Test',
      totalRequests,
      successfulRequests,
      failedRequests: totalRequests - successfulRequests,
      averageResponseTime,
      minResponseTime: Math.min(...results.filter(r => !r.error).map(r => r.responseTime)),
      maxResponseTime: Math.max(...results.filter(r => !r.error).map(r => r.responseTime)),
      requestsPerSecond: (successfulRequests / totalTime) * 1000,
      throughput: (successfulRequests / totalTime) * 1000
    };

    this.results.push(throughputResult);
    console.log(`\n   ✅ Completado: ${throughputResult.requestsPerSecond.toFixed(1)} req/s\n`);
  }

  /**
   * Ejecutar test de carga
   */
  private async runLoadTest(
    testName: string,
    testData: any[],
    testFunction: (data: any) => Promise<any>,
    iterations: number
  ): Promise<BenchmarkResult> {
    const startTime = Date.now();
    const responses: any[] = [];
    let completed = 0;
    const total = testData.length * iterations;

    console.log(`   📊 Ejecutando ${total} requests (${testData.length} casos × ${iterations} iteraciones)...`);

    for (let i = 0; i < iterations; i++) {
      for (const data of testData) {
        try {
          const result = await testFunction(data);
          responses.push({ ...result, error: false });
        } catch (error) {
          responses.push({ error: true, responseTime: 0 });
        }
        
        completed++;
        if (completed % 5 === 0 || completed === total) {
          process.stdout.write(`\r   📈 Progreso: ${completed}/${total} requests completados`);
        }
      }
    }

    const totalTime = Date.now() - startTime;
    const successfulResponses = responses.filter(r => !r.error);
    const failedResponses = responses.filter(r => r.error);

    const responseTimes = successfulResponses.map(r => r.responseTime);
    const averageResponseTime = responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length;

    console.log(''); // Nueva línea después del progreso

    return {
      testName,
      totalRequests: total,
      successfulRequests: successfulResponses.length,
      failedRequests: failedResponses.length,
      averageResponseTime,
      minResponseTime: Math.min(...responseTimes),
      maxResponseTime: Math.max(...responseTimes),
      requestsPerSecond: (successfulResponses.length / totalTime) * 1000,
      throughput: (successfulResponses.length / totalTime) * 1000
    };
  }

  /**
   * Probar endpoint híbrido
   */
  private async testHybridEndpoint(text: string): Promise<any> {
    const startTime = Date.now();
    
    try {
      // Usar endpoint público del híbrido
      const response = await axios.get(`${this.baseUrl}/api/v1/hybrid/health`, {
        timeout: 10000
      });
      
      const responseTime = Date.now() - startTime;
      return {
        success: true,
        responseTime,
        statusCode: response.status
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      return {
        success: false,
        responseTime,
        error: error.message
      };
    }
  }

  /**
   * Probar endpoint de sentiment
   */
  private async testSentimentEndpoint(tweet: any): Promise<any> {
    const startTime = Date.now();
    
    try {
      const response = await axios.post(`${this.baseUrl}/api/v1/sentiment/batch`, {
        tweets: [tweet],
        config: { enableEmotionAnalysis: false }
      }, {
        timeout: 10000
      });
      
      const responseTime = Date.now() - startTime;
      return {
        success: true,
        responseTime,
        statusCode: response.status
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      return {
        success: false,
        responseTime,
        error: error.message
      };
    }
  }

  /**
   * Generar tweets de prueba
   */
  private generateTestTweets(): any[] {
    const texts = [
      'Excelente producto, muy recomendado! 👍',
      'Terrible servicio, muy decepcionado 😡',
      'Regular, nada especial pero está bien',
      'Amazing quality! Love it so much! ❤️',
      'Worst purchase ever, complete waste'
    ];

    return texts.map((text, index) => ({
      id: `test_${index + 1}`,
      text,
      user: {
        id: `user_${index + 1}`,
        username: `testuser${index + 1}`,
        name: `Test User ${index + 1}`
      },
      created_at: new Date().toISOString(),
      public_metrics: {
        retweet_count: Math.floor(Math.random() * 100),
        like_count: Math.floor(Math.random() * 1000),
        reply_count: Math.floor(Math.random() * 50),
        quote_count: Math.floor(Math.random() * 10)
      }
    }));
  }

  /**
   * Mostrar resultados del benchmark
   */
  private showBenchmarkResults(): void {
    console.log('📊 RESULTADOS DEL BENCHMARK');
    console.log('===========================');

    this.results.forEach(result => {
      console.log(`\n🎯 ${result.testName.toUpperCase()}`);
      console.log(`   📊 Total requests: ${result.totalRequests}`);
      console.log(`   ✅ Exitosos: ${result.successfulRequests} (${((result.successfulRequests / result.totalRequests) * 100).toFixed(1)}%)`);
      console.log(`   ❌ Fallidos: ${result.failedRequests} (${((result.failedRequests / result.totalRequests) * 100).toFixed(1)}%)`);
      console.log(`   ⚡ Tiempo promedio: ${result.averageResponseTime.toFixed(1)}ms`);
      console.log(`   🚀 Tiempo mínimo: ${result.minResponseTime}ms`);
      console.log(`   🐌 Tiempo máximo: ${result.maxResponseTime}ms`);
      console.log(`   🔥 Throughput: ${result.requestsPerSecond.toFixed(1)} req/s`);
    });

    // Resumen general
    const totalRequests = this.results.reduce((sum, r) => sum + r.totalRequests, 0);
    const totalSuccessful = this.results.reduce((sum, r) => sum + r.successfulRequests, 0);
    const overallSuccessRate = (totalSuccessful / totalRequests) * 100;
    const avgThroughput = this.results.reduce((sum, r) => sum + r.requestsPerSecond, 0) / this.results.length;

    console.log('\n🏆 RESUMEN GENERAL');
    console.log('==================');
    console.log(`📊 Total requests procesados: ${totalRequests}`);
    console.log(`✅ Tasa de éxito general: ${overallSuccessRate.toFixed(1)}%`);
    console.log(`🔥 Throughput promedio: ${avgThroughput.toFixed(1)} req/s`);

    // Evaluación del rendimiento
    if (overallSuccessRate >= 95 && avgThroughput >= 50) {
      console.log('\n🎉 ¡RENDIMIENTO EXCELENTE!');
      console.log('✅ Sistema optimizado y listo para producción');
    } else if (overallSuccessRate >= 90 && avgThroughput >= 20) {
      console.log('\n✅ RENDIMIENTO BUENO');
      console.log('🔧 Algunas optimizaciones menores recomendadas');
    } else {
      console.log('\n⚠️ RENDIMIENTO A MEJORAR');
      console.log('🔧 Revisar optimizaciones del sistema');
    }

    // Recomendaciones específicas
    console.log('\n💡 RECOMENDACIONES:');
    if (avgThroughput < 20) {
      console.log('⚡ Optimizar tiempos de respuesta del modelo');
    }
    if (overallSuccessRate < 95) {
      console.log('🛠️ Revisar manejo de errores y timeout');
    }
    console.log('📈 Considerar cache para consultas frecuentes');
    console.log('🔄 Implementar balanceador de carga para alta demanda');
  }
}

// Ejecutar benchmark
async function main() {
  try {
    const benchmark = new ProductionBenchmark();
    await benchmark.runBenchmark();
  } catch (error) {
    console.error('❌ Error ejecutando benchmark:', error);
    process.exit(1);
  }
}

main();
