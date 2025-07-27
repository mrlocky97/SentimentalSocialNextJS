/**
 * Script de Pruebas de Endpoints del Servidor
 * Valida que todos los endpoints funcionen correctamente con el sistema actualizado
 */

import axios from 'axios';

interface EndpointTestResult {
  endpoint: string;
  method: string;
  status: 'success' | 'error';
  responseTime: number;
  statusCode: number;
  accuracy?: number;
  error?: string;
}

class ServerEndpointTests {
  private baseUrl: string;
  private testResults: EndpointTestResult[] = [];

  constructor(baseUrl: string = 'http://localhost:3001') {
    this.baseUrl = baseUrl;
  }

  /**
   * Ejecutar todas las pruebas de endpoints
   */
  async runAllTests(): Promise<void> {
    console.log('🌐 PRUEBAS DE ENDPOINTS DEL SERVIDOR');
    console.log('===================================');
    console.log(`🔗 Base URL: ${this.baseUrl}`);
    console.log(`📅 Fecha: ${new Date().toLocaleString()}\n`);

    // Verificar que el servidor esté corriendo
    if (!(await this.checkServerHealth())) {
      console.log('❌ Servidor no disponible. Iniciando servidor...');
      await this.startServer();
      
      // Esperar a que el servidor inicie
      console.log('⏳ Esperando a que el servidor inicie...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    // Ejecutar pruebas
    await this.testHealthEndpoint();
    await this.testApiInfoEndpoint();
    await this.testSentimentEndpoints();
    await this.testHybridEndpoints();
    await this.testExperimentalEndpoints();

    // Mostrar resultados
    this.showTestResults();
  }

  /**
   * Verificar si el servidor está corriendo
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
   * Iniciar el servidor
   */
  private async startServer(): Promise<void> {
    console.log('🚀 Iniciando servidor...');
    // Nota: En un entorno real, esto podría usar child_process para iniciar el servidor
    console.log('💡 Tip: Asegúrate de que el servidor esté corriendo con "npm run dev"');
  }

  /**
   * Probar endpoint de health
   */
  private async testHealthEndpoint(): Promise<void> {
    console.log('🔍 Probando endpoint de health...');
    
    const result = await this.makeRequest('GET', '/health');
    this.testResults.push(result);
    
    if (result.status === 'success') {
      console.log('   ✅ Health endpoint OK');
    } else {
      console.log('   ❌ Health endpoint falló');
    }
  }

  /**
   * Probar endpoint de información de API
   */
  private async testApiInfoEndpoint(): Promise<void> {
    console.log('🔍 Probando endpoint de información de API...');
    
    const result = await this.makeRequest('GET', '/api/v1');
    this.testResults.push(result);
    
    if (result.status === 'success') {
      console.log('   ✅ API info endpoint OK');
    } else {
      console.log('   ❌ API info endpoint falló');
    }
  }

  /**
   * Probar endpoints de sentiment analysis
   */
  private async testSentimentEndpoints(): Promise<void> {
    console.log('🔍 Probando endpoints de análisis de sentimientos...');

    const testTexts = [
      'Me encanta este producto, es fantástico!',
      'Odio esta aplicación, es terrible',
      'El clima está nublado hoy',
      'Amazing product! Best purchase ever!',
      'Worst experience ever!'
    ];

    for (const text of testTexts) {
      const result = await this.makeRequest('POST', '/api/v1/sentiment/analyze', {
        text: text,
        language: 'auto'
      });
      
      result.endpoint = `/api/v1/sentiment/analyze - "${text.substring(0, 30)}..."`;
      this.testResults.push(result);
    }

    const successCount = this.testResults
      .filter(r => r.endpoint.includes('/api/v1/sentiment/analyze'))
      .filter(r => r.status === 'success').length;
    
    console.log(`   📊 Sentiment endpoints: ${successCount}/${testTexts.length} exitosos`);
  }

  /**
   * Probar endpoints híbridos
   */
  private async testHybridEndpoints(): Promise<void> {
    console.log('🔍 Probando endpoints híbridos...');

    const testTexts = [
      'Excelente servicio, muy recomendado! 👍',
      'Pésima experiencia, nunca más 😡',
      'Regular, no está mal pero tampoco genial',
      'AMAZING quality! Love it so much! ❤️',
      'TERRIBLE product. Worst purchase ever!'
    ];

    // Test análisis individual
    for (const text of testTexts) {
      const result = await this.makeRequest('POST', '/api/v1/hybrid/analyze', {
        text: text,
        language: 'auto'
      });
      
      result.endpoint = `/api/v1/hybrid/analyze - "${text.substring(0, 30)}..."`;
      this.testResults.push(result);
    }

    // Test análisis batch
    const batchResult = await this.makeRequest('POST', '/api/v1/hybrid/analyze-batch', {
      texts: testTexts,
      language: 'auto'
    });
    
    batchResult.endpoint = '/api/v1/hybrid/analyze-batch';
    this.testResults.push(batchResult);

    // Test estadísticas del modelo
    const statsResult = await this.makeRequest('GET', '/api/v1/hybrid/model-stats');
    statsResult.endpoint = '/api/v1/hybrid/model-stats';
    this.testResults.push(statsResult);

    const hybridResults = this.testResults.filter(r => r.endpoint.includes('/api/v1/hybrid'));
    const successCount = hybridResults.filter(r => r.status === 'success').length;
    
    console.log(`   📊 Hybrid endpoints: ${successCount}/${hybridResults.length} exitosos`);
  }

  /**
   * Probar endpoints experimentales
   */
  private async testExperimentalEndpoints(): Promise<void> {
    console.log('🔍 Probando endpoints experimentales...');

    // Test evaluación de modelos
    const evaluationResult = await this.makeRequest('POST', '/api/v1/experimental/evaluate-models', {
      testSize: 10
    });
    evaluationResult.endpoint = '/api/v1/experimental/evaluate-models';
    this.testResults.push(evaluationResult);

    // Test naive bayes
    const nbResult = await this.makeRequest('POST', '/api/v1/experimental/naive-bayes', {
      text: 'Test message for experimental endpoint',
      language: 'auto'
    });
    nbResult.endpoint = '/api/v1/experimental/naive-bayes';
    this.testResults.push(nbResult);

    const experimentalResults = this.testResults.filter(r => r.endpoint.includes('/api/v1/experimental'));
    const successCount = experimentalResults.filter(r => r.status === 'success').length;
    
    console.log(`   📊 Experimental endpoints: ${successCount}/${experimentalResults.length} exitosos`);
  }

  /**
   * Hacer una petición HTTP
   */
  private async makeRequest(method: string, endpoint: string, data?: any): Promise<EndpointTestResult> {
    const startTime = Date.now();
    
    try {
      const config = {
        method: method.toLowerCase(),
        url: `${this.baseUrl}${endpoint}`,
        timeout: 30000,
        ...(data && { data })
      };

      const response = await axios(config);
      const responseTime = Date.now() - startTime;

      return {
        endpoint,
        method,
        status: 'success',
        responseTime,
        statusCode: response.status
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      return {
        endpoint,
        method,
        status: 'error',
        responseTime,
        statusCode: error.response?.status || 0,
        error: error.message
      };
    }
  }

  /**
   * Mostrar resultados de las pruebas
   */
  private showTestResults(): void {
    console.log('\n📊 RESULTADOS DE PRUEBAS DE ENDPOINTS');
    console.log('====================================');

    const totalTests = this.testResults.length;
    const successfulTests = this.testResults.filter(r => r.status === 'success').length;
    const failedTests = totalTests - successfulTests;

    console.log(`📈 Total pruebas: ${totalTests}`);
    console.log(`✅ Exitosas: ${successfulTests} (${((successfulTests / totalTests) * 100).toFixed(1)}%)`);
    console.log(`❌ Fallidas: ${failedTests} (${((failedTests / totalTests) * 100).toFixed(1)}%)`);

    // Mostrar estadísticas por categoría
    const categories = [
      { name: 'Health/Info', filter: (r: EndpointTestResult) => r.endpoint.includes('/health') || r.endpoint.includes('/api/v1') && !r.endpoint.includes('/api/v1/') },
      { name: 'Sentiment', filter: (r: EndpointTestResult) => r.endpoint.includes('/api/v1/sentiment') },
      { name: 'Hybrid', filter: (r: EndpointTestResult) => r.endpoint.includes('/api/v1/hybrid') },
      { name: 'Experimental', filter: (r: EndpointTestResult) => r.endpoint.includes('/api/v1/experimental') }
    ];

    console.log('\n📊 RESULTADOS POR CATEGORÍA:');
    categories.forEach(category => {
      const categoryResults = this.testResults.filter(category.filter);
      const categorySuccess = categoryResults.filter(r => r.status === 'success').length;
      const categoryTotal = categoryResults.length;
      
      if (categoryTotal > 0) {
        const percentage = ((categorySuccess / categoryTotal) * 100).toFixed(1);
        console.log(`   ${category.name.padEnd(15)} ${categorySuccess}/${categoryTotal} (${percentage}%)`);
      }
    });

    // Mostrar tiempos de respuesta
    const avgResponseTime = this.testResults
      .filter(r => r.status === 'success')
      .reduce((sum, r) => sum + r.responseTime, 0) / successfulTests;

    console.log(`\n⚡ TIEMPO DE RESPUESTA PROMEDIO: ${avgResponseTime.toFixed(1)}ms`);

    // Mostrar errores si los hay
    const errors = this.testResults.filter(r => r.status === 'error');
    if (errors.length > 0) {
      console.log('\n❌ ERRORES ENCONTRADOS:');
      errors.forEach(error => {
        console.log(`   ${error.endpoint}: ${error.error} (${error.statusCode})`);
      });
    }

    // Conclusión
    if (successfulTests === totalTests) {
      console.log('\n🎉 ¡TODOS LOS ENDPOINTS FUNCIONAN CORRECTAMENTE!');
      console.log('✅ Sistema listo para producción');
    } else if (successfulTests / totalTests >= 0.8) {
      console.log('\n✅ MAYORÍA DE ENDPOINTS FUNCIONANDO');
      console.log('⚠️ Revisar endpoints fallidos');
    } else {
      console.log('\n⚠️ MÚLTIPLES ENDPOINTS FALLANDO');
      console.log('🔧 Revisión del sistema requerida');
    }
  }
}

// Ejecutar pruebas
async function main() {
  try {
    const tester = new ServerEndpointTests();
    await tester.runAllTests();
  } catch (error) {
    console.error('❌ Error ejecutando pruebas de endpoints:', error);
    process.exit(1);
  }
}

main();
