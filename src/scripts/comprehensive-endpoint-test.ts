/**
 * Comprehensive Endpoint Testing Script
 * Tests all major endpoints to verify system functionality
 */

const BASE_URL = 'http://localhost:3001';

interface TestResult {
  endpoint: string;
  method: string;
  status: number;
  success: boolean;
  message: string;
  responseTime: number;
}

class EndpointTester {
  private results: TestResult[] = [];
  
  async testEndpoint(
    endpoint: string, 
    method: 'GET' | 'POST' = 'GET',
    body?: any,
    headers?: any
  ): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: body ? JSON.stringify(body) : undefined
      });
      
      const responseTime = Date.now() - startTime;
      const result: TestResult = {
        endpoint,
        method,
        status: response.status,
        success: response.ok,
        message: response.ok ? 'OK' : `HTTP ${response.status}`,
        responseTime
      };
      
      this.results.push(result);
      return result;
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const result: TestResult = {
        endpoint,
        method,
        status: 0,
        success: false,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        responseTime
      };
      
      this.results.push(result);
      return result;
    }
  }
  
  async runAllTests(): Promise<void> {
    console.log('🧪 Iniciando pruebas completas de endpoints...\n');
    
    // Test 1: Health and Basic Endpoints
    console.log('📊 1. Endpoints Básicos');
    await this.testEndpoint('/health');
    await this.testEndpoint('/api-docs/');
    await this.testEndpoint('/');
    
    // Test 2: Authentication Endpoints (without auth)
    console.log('\n🔐 2. Endpoints de Autenticación (sin autenticación)');
    await this.testEndpoint('/api/auth/login', 'POST', {
      email: 'test@example.com',
      password: 'wrongpassword'
    });
    await this.testEndpoint('/api/auth/register', 'POST', {
      username: 'testuser',
      email: 'test@example.com',
      password: 'TestPass123'
    });
    
    // Test 3: Sentiment Analysis
    console.log('\n💭 3. Análisis de Sentimientos');
    await this.testEndpoint('/api/sentiment/analyze?text=Me%20encanta%20este%20producto');
    await this.testEndpoint('/api/sentiment/batch', 'POST', {
      texts: ['Me gusta', 'No me gusta', 'Es normal']
    });
    
    // Test 4: Campaign Endpoints (should require auth)
    console.log('\n📋 4. Endpoints de Campañas (requieren autenticación)');
    await this.testEndpoint('/api/campaigns');
    await this.testEndpoint('/api/campaigns/stats');
    
    // Test 5: Admin Endpoints (should require admin auth)
    console.log('\n⚙️ 5. Endpoints de Administración (requieren admin)');
    await this.testEndpoint('/api/admin/dashboard');
    await this.testEndpoint('/api/admin/users');
    
    // Test 6: User Management
    console.log('\n👥 6. Gestión de Usuarios (requiere autenticación)');
    await this.testEndpoint('/api/users/profile');
    await this.testEndpoint('/api/users');
    
    // Test 7: Experimental Endpoints
    console.log('\n🧪 7. Endpoints Experimentales');
    await this.testEndpoint('/api/v1/experimental/evaluate', 'POST');
    
    // Test 8: Error Endpoints
    console.log('\n❌ 8. Endpoints de Error (para verificar manejo)');
    await this.testEndpoint('/api/nonexistent');
    await this.testEndpoint('/api/invalid/endpoint');
    
    this.printResults();
  }
  
  printResults(): void {
    console.log('\n📈 RESULTADOS DE PRUEBAS DE ENDPOINTS\n');
    console.log('='.repeat(80));
    
    // Group results by category
    const categories = {
      'Básicos': ['/health', '/api-docs/', '/'],
      'Autenticación': ['/api/auth/login', '/api/auth/register'],
      'Sentimientos': ['/api/sentiment/analyze', '/api/sentiment/batch'],
      'Campañas': ['/api/campaigns', '/api/campaigns/stats'],
      'Admin': ['/api/admin/dashboard', '/api/admin/users'],
      'Usuarios': ['/api/users/profile', '/api/users'],
      'Experimental': ['/api/v1/experimental/evaluate'],
      'Error Handling': ['/api/nonexistent', '/api/invalid/endpoint']
    };
    
    let totalTests = 0;
    let passedTests = 0;
    let warningTests = 0;
    let failedTests = 0;
    
    Object.entries(categories).forEach(([category, endpoints]) => {
      console.log(`\n🏷️  ${category}:`);
      
      endpoints.forEach(endpoint => {
        const result = this.results.find(r => r.endpoint === endpoint);
        if (result) {
          totalTests++;
          let status = '';
          let icon = '';
          
          if (result.success) {
            status = '✅ PASS';
            icon = '✅';
            passedTests++;
          } else if (result.status >= 400 && result.status < 500) {
            status = '⚠️  WARN';
            icon = '⚠️';
            warningTests++;
          } else {
            status = '❌ FAIL';
            icon = '❌';
            failedTests++;
          }
          
          console.log(`   ${icon} ${result.method} ${result.endpoint}`);
          console.log(`      Status: ${result.status} | ${result.message} | ${result.responseTime}ms`);
        }
      });
    });
    
    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 RESUMEN FINAL:');
    console.log(`   Total: ${totalTests} pruebas`);
    console.log(`   ✅ Exitosas: ${passedTests} (${((passedTests/totalTests)*100).toFixed(1)}%)`);
    console.log(`   ⚠️  Advertencias: ${warningTests} (${((warningTests/totalTests)*100).toFixed(1)}%)`);
    console.log(`   ❌ Fallidas: ${failedTests} (${((failedTests/totalTests)*100).toFixed(1)}%)`);
    
    // Interpretation
    console.log('\n💡 INTERPRETACIÓN:');
    if (failedTests === 0) {
      console.log('   🎉 ¡Excelente! No hay errores críticos del servidor.');
    }
    if (warningTests > 0) {
      console.log('   📝 Las advertencias (4xx) son normales para endpoints que requieren autenticación.');
    }
    
    const avgResponseTime = this.results.reduce((sum, r) => sum + r.responseTime, 0) / this.results.length;
    console.log(`   ⚡ Tiempo promedio de respuesta: ${avgResponseTime.toFixed(0)}ms`);
    
    console.log('\n🚀 ESTADO GENERAL: ' + (failedTests === 0 ? 'APLICACIÓN ESTABLE' : 'REQUIERE REVISIÓN'));
  }
}

// Run tests
async function runTests() {
  const tester = new EndpointTester();
  await tester.runAllTests();
}

// Check if server is running first
async function checkServer() {
  try {
    const response = await fetch(`${BASE_URL}/health`);
    if (response.ok) {
      console.log('🟢 Servidor detectado en http://localhost:3001\n');
      return true;
    }
  } catch (error) {
    console.log('🔴 Servidor no disponible en http://localhost:3001');
    console.log('💡 Asegúrate de ejecutar: npm run dev\n');
    return false;
  }
  return false;
}

// Main execution
(async () => {
  const serverRunning = await checkServer();
  if (serverRunning) {
    await runTests();
  }
})();
