/**
 * Test Específico de Endpoints Funcionales
 * Prueba solo los endpoints que están disponibles y configurados correctamente
 */

import axios from 'axios';

interface TestResult {
    endpoint: string;
    method: string;
    status: 'success' | 'error';
    responseTime: number;
    statusCode: number;
    details?: any;
    error?: string;
}

class FunctionalEndpointTests {
    private baseUrl: string;
    private testResults: TestResult[] = [];

    constructor(baseUrl: string = 'http://localhost:3001') {
        this.baseUrl = baseUrl;
    }

    /**
     * Ejecutar pruebas de endpoints funcionales
     */
    async runFunctionalTests(): Promise<void> {

        // Verificar servidor
        if (!(await this.checkServerHealth())) {
            console.log('❌ Servidor no disponible');
            return;
        }


        // Ejecutar pruebas básicas
        await this.testBasicEndpoints();

        // Ejecutar pruebas de sentiment (sin autenticación)
        await this.testSentimentEndpoints();

        // Ejecutar pruebas híbridas básicas
        await this.testHybridBasicEndpoints();

        // Mostrar resultados
        this.showResults();
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
     * Probar endpoints básicos
     */
    private async testBasicEndpoints(): Promise<void> {

        // Health check
        await this.testEndpoint('GET', '/health');

        // API info
        await this.testEndpoint('GET', '/api/v1');

        // API docs (head request)
        await this.testEndpoint('GET', '/api-docs', null, false);

    }

    /**
     * Probar endpoints de sentiment (públicos)
     */
    private async testSentimentEndpoints(): Promise<void> {

        // Test demo endpoint (sin autenticación)
        await this.testEndpoint('GET', '/api/v1/sentiment/demo');

        // Test con tweets de muestra (estructura correcta)
        const sampleTweet = {
            id: '1234567890',
            text: 'Me encanta este producto, es fantástico!',
            user: {
                id: '123',
                username: 'testuser',
                name: 'Test User'
            },
            created_at: new Date().toISOString(),
            public_metrics: {
                retweet_count: 0,
                like_count: 0,
                reply_count: 0,
                quote_count: 0
            }
        };

        await this.testEndpoint('POST', '/api/v1/sentiment/analyze', {
            tweet: sampleTweet,
            config: {
                enableEmotionAnalysis: true,
                minConfidenceThreshold: 0.5
            }
        });

        // Test batch con tweets múltiples
        await this.testEndpoint('POST', '/api/v1/sentiment/batch', {
            tweets: [sampleTweet],
            config: {
                enableEmotionAnalysis: false
            }
        });

    }

    /**
     * Probar endpoints híbridos básicos
     */
    private async testHybridBasicEndpoints(): Promise<void> {

        // Health check del sistema híbrido (debería ser público)
        await this.testEndpoint('GET', '/api/v1/hybrid/health');

        // Stats del sistema híbrido (puede ser público o requiere auth)
        await this.testEndpoint('GET', '/api/v1/hybrid/stats');

    }

    /**
     * Probar un endpoint específico
     */
    private async testEndpoint(
        method: string,
        endpoint: string,
        data?: any,
        expectJson: boolean = true
    ): Promise<void> {
        const startTime = Date.now();

        try {
            const config = {
                method: method.toLowerCase(),
                url: `${this.baseUrl}${endpoint}`,
                timeout: 15000,
                ...(data && { data }),
                validateStatus: (status: number) => status < 500 // Aceptar códigos de error del cliente
            };

            const response = await axios(config);
            const responseTime = Date.now() - startTime;

            const result: TestResult = {
                endpoint,
                method,
                status: response.status < 400 ? 'success' : 'error',
                responseTime,
                statusCode: response.status,
                details: expectJson ? this.extractDetails(response.data) : 'Non-JSON response'
            };

            if (response.status >= 400) {
                result.error = `HTTP ${response.status}: ${response.statusText}`;
            }

            this.testResults.push(result);

            // Log resultado inmediato
            const statusIcon = response.status < 400 ? '✅' : response.status < 500 ? '⚠️' : '❌';

        } catch (error: any) {
            const responseTime = Date.now() - startTime;

            const result: TestResult = {
                endpoint,
                method,
                status: 'error',
                responseTime,
                statusCode: error.response?.status || 0,
                error: error.message
            };

            this.testResults.push(result);
            console.log(`   ❌ ${method} ${endpoint} - Error: ${error.message}`);
        }
    }

    /**
     * Extraer detalles relevantes de la respuesta
     */
    private extractDetails(data: any): any {
        if (!data) return 'No data';

        if (typeof data === 'string') return data.substring(0, 100);

        if (typeof data === 'object') {
            // Para respuestas de sentiment
            if (data.sentiment) {
                return {
                    sentiment: data.sentiment.label,
                    confidence: data.sentiment.confidence,
                    processingTime: data.processingTime
                };
            }

            // Para respuestas híbridas
            if (data.result && data.result.sentiment) {
                return {
                    sentiment: data.result.sentiment.label,
                    confidence: data.result.sentiment.confidence,
                    method: data.result.sentiment.method
                };
            }

            // Para información general
            if (data.name || data.version || data.status) {
                return {
                    name: data.name,
                    version: data.version,
                    status: data.status
                };
            }

            return 'Object response';
        }

        return String(data).substring(0, 100);
    }

    /**
     * Mostrar resultados de las pruebas
     */
    private showResults(): void {

        const totalTests = this.testResults.length;
        const successfulTests = this.testResults.filter(r => r.status === 'success').length;
        const warningTests = this.testResults.filter(r => r.statusCode >= 400 && r.statusCode < 500).length;
        const errorTests = this.testResults.filter(r => r.statusCode >= 500 || r.statusCode === 0).length;

        console.log(`⚠️ Advertencias: ${warningTests} (${((warningTests / totalTests) * 100).toFixed(1)}%)`);
        console.log(`❌ Errores: ${errorTests} (${((errorTests / totalTests) * 100).toFixed(1)}%)`);

        // Mostrar detalles de pruebas exitosas
        this.testResults
            .filter(r => r.status === 'success')
            .forEach(result => {
                if (result.details && typeof result.details === 'object') {
                }
            });

        // Mostrar advertencias
        const warnings = this.testResults.filter(r => r.statusCode >= 400 && r.statusCode < 500);
        if (warnings.length > 0) {
            console.log('\n⚠️ ADVERTENCIAS (4xx):');
            warnings.forEach(result => {
            });
        }

        // Mostrar errores
        const errors = this.testResults.filter(r => r.statusCode >= 500 || r.statusCode === 0);
        if (errors.length > 0) {
            console.log('\n❌ ERRORES (5xx):');
            errors.forEach(result => {
            });
        }

        // Estadísticas de rendimiento
        const successfulResults = this.testResults.filter(r => r.status === 'success');
        if (successfulResults.length > 0) {
            const avgResponseTime = successfulResults.reduce((sum, r) => sum + r.responseTime, 0) / successfulResults.length;
            const maxResponseTime = Math.max(...successfulResults.map(r => r.responseTime));
            const minResponseTime = Math.min(...successfulResults.map(r => r.responseTime));

        }

        // Conclusión
        if (successfulTests === totalTests) {
        } else if (successfulTests / totalTests >= 0.7) {
        } else {
            console.log('\n⚠️ MÚLTIPLES ENDPOINTS CON PROBLEMAS');
        }
    }
}

// Ejecutar pruebas
async function main() {
    try {
        const tester = new FunctionalEndpointTests();
        await tester.runFunctionalTests();
    } catch (error) {
        console.error('❌ Error ejecutando pruebas funcionales:', error);
        process.exit(1);
    }
}

main();
