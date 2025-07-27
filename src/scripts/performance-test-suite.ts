/**
 * Script de Pruebas de Rendimiento del Sistema Híbrido
 * Compara rendimiento antes vs después del dataset expandido
 */

import { HybridSentimentAnalysisService } from '../services/hybrid-sentiment-analysis.service';
import { SentimentAnalysisService } from '../services/sentiment-analysis.service';
import { NaiveBayesSentimentModel } from '../experimental/naive-bayes.model';
import { getBalancedDataset } from '../data/training-dataset';
import { getExpandedTrainingDataset } from '../data/expanded-training-dataset';

interface PerformanceResult {
    method: string;
    accuracy: number;
    avgResponseTime: number;
    totalTime: number;
    correctPredictions: number;
    totalTests: number;
    memoryUsage: number;
}

class PerformanceTestSuite {
    private hybridService: HybridSentimentAnalysisService;
    private ruleBasedService: SentimentAnalysisService;
    private originalNBModel: NaiveBayesSentimentModel;
    private expandedNBModel: NaiveBayesSentimentModel;

    // Test cases para evaluación
    private testCases = [
        // Casos en Español
        { text: 'Me encanta este producto, es fantástico y perfecto!', expected: 'positive', language: 'es' },
        { text: 'Odio completamente esta aplicación, es terrible y no funciona', expected: 'negative', language: 'es' },
        { text: 'El clima está nublado hoy, parece que va a llover', expected: 'neutral', language: 'es' },
        { text: '¡Increíble servicio! Lo recomiendo al 100% 👍', expected: 'positive', language: 'es' },
        { text: 'Pésima experiencia, nunca más compro aquí', expected: 'negative', language: 'es' },

        // Casos en Inglés
        { text: 'Amazing product! Best purchase ever! 🎉', expected: 'positive', language: 'en' },
        { text: 'Worst experience ever. Complete waste of money!', expected: 'negative', language: 'en' },
        { text: 'The weather is cloudy today', expected: 'neutral', language: 'en' },
        { text: 'Outstanding quality and excellent customer service!', expected: 'positive', language: 'en' },
        { text: 'Broken on arrival, terrible product quality', expected: 'negative', language: 'en' },

        // Casos con emojis y casos edge
        { text: 'Love it! 😍❤️ Best app ever!!!', expected: 'positive', language: 'en' },
        { text: 'Hate this so much 😡😤 Worst thing ever', expected: 'negative', language: 'en' },
        { text: 'It\'s okay I guess 🤷‍♂️ nothing special', expected: 'neutral', language: 'en' },
        { text: 'Excelente producto 🌟 muy satisfecho con la compra', expected: 'positive', language: 'es' },
        { text: 'Malísimo servicio 😠 nunca funciona cuando lo necesito', expected: 'negative', language: 'es' },

        // Casos mixtos y complejos
        { text: 'Good price but poor quality, mixed feelings about this', expected: 'neutral', language: 'en' },
        { text: 'Buen precio pero mala calidad, no sé qué pensar', expected: 'neutral', language: 'es' },
        { text: 'LOVE LOVE LOVE this product!!! AMAZING!!!', expected: 'positive', language: 'en' },
        { text: 'ODIO ODIO ODIO esta aplicación!!! HORRIBLE!!!', expected: 'negative', language: 'es' },
        { text: 'Regular, no está mal pero tampoco es genial', expected: 'neutral', language: 'es' }
    ];

    constructor() {
        // Servicios principales
        this.hybridService = new HybridSentimentAnalysisService();
        this.ruleBasedService = new SentimentAnalysisService();

        // Modelos Naive Bayes para comparación
        this.originalNBModel = new NaiveBayesSentimentModel({
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

        this.expandedNBModel = new NaiveBayesSentimentModel({
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
    }

    /**
     * Ejecutar suite completa de pruebas de rendimiento
     */
    async runPerformanceTests(): Promise<void> {

        // Entrenar modelos
        await this.initializeModels();

        // Ejecutar pruebas para cada método
        const results: PerformanceResult[] = [];


        // 1. Sistema Híbrido (con dataset expandido)
        results.push(await this.testMethod('Sistema Híbrido (Expandido)', this.testHybridMethod.bind(this)));

        // 2. Rule-Based solo
        results.push(await this.testMethod('Rule-Based', this.testRuleBasedMethod.bind(this)));

        // 3. Naive Bayes Original (234 ejemplos)
        results.push(await this.testMethod('Naive Bayes Original (234)', this.testOriginalNBMethod.bind(this)));

        // 4. Naive Bayes Expandido (532 ejemplos)
        results.push(await this.testMethod('Naive Bayes Expandido (532)', this.testExpandedNBMethod.bind(this)));

        // Mostrar comparación final
        this.showPerformanceComparison(results);
    }

    /**
     * Inicializar y entrenar todos los modelos
     */
    private async initializeModels(): Promise<void> {

        try {
            // Entrenar modelo original
            const originalData = getBalancedDataset();
            await this.originalNBModel.train(originalData);

            // Entrenar modelo expandido
            const expandedData = getExpandedTrainingDataset();
            await this.expandedNBModel.train(expandedData);

            // Esperar a que el híbrido termine de inicializar
            await this.waitForHybridInit();

        } catch (error) {
            console.error('❌ Error inicializando modelos:', error);
            throw error;
        }
    }

    /**
     * Esperar a que el sistema híbrido termine de inicializar
     */
    private async waitForHybridInit(): Promise<void> {
        let attempts = 0;
        const maxAttempts = 15;

        while (attempts < maxAttempts) {
            const stats = this.hybridService.getModelStats();
            if (stats.isModelTrained) {
                return;
            }

            await new Promise(resolve => setTimeout(resolve, 1000));
            attempts++;
        }

        console.warn('⚠️ Timeout esperando inicialización del híbrido');
    }

    /**
     * Probar un método específico
     */
    private async testMethod(methodName: string, testFunction: (text: string) => Promise<any>): Promise<PerformanceResult> {

        const startMemory = process.memoryUsage().heapUsed;
        const startTime = Date.now();

        let correctPredictions = 0;
        let totalResponseTime = 0;

        for (let i = 0; i < this.testCases.length; i++) {
            const testCase = this.testCases[i];

            try {
                const testStart = Date.now();
                const result = await testFunction(testCase.text);
                const responseTime = Date.now() - testStart;

                totalResponseTime += responseTime;

                const predicted = this.normalizeSentiment(result.label || result.sentiment?.label);
                const isCorrect = predicted === testCase.expected;

                if (isCorrect) correctPredictions++;

                // Mostrar progreso cada 5 casos
                if ((i + 1) % 5 === 0 || i === this.testCases.length - 1) {
                    process.stdout.write(`   📊 Progreso: ${i + 1}/${this.testCases.length} casos completados\r`);
                }
            } catch (error) {
                console.error(`   ❌ Error en caso ${i + 1}: ${error}`);
            }
        }

        const totalTime = Date.now() - startTime;
        const endMemory = process.memoryUsage().heapUsed;
        const memoryUsage = endMemory - startMemory;

        const accuracy = (correctPredictions / this.testCases.length) * 100;
        const avgResponseTime = totalResponseTime / this.testCases.length;


        return {
            method: methodName,
            accuracy,
            avgResponseTime,
            totalTime,
            correctPredictions,
            totalTests: this.testCases.length,
            memoryUsage
        };
    }

    /**
     * Método de prueba para sistema híbrido
     */
    private async testHybridMethod(text: string): Promise<any> {
        const result = await this.hybridService.analyze(text);
        return result.sentiment;
    }

    /**
     * Método de prueba para rule-based
     */
    private async testRuleBasedMethod(text: string): Promise<any> {
        const result = await this.ruleBasedService.analyze(text);
        return result.sentiment;
    }

    /**
     * Método de prueba para Naive Bayes original
     */
    private async testOriginalNBMethod(text: string): Promise<any> {
        return await this.originalNBModel.predict(text);
    }

    /**
     * Método de prueba para Naive Bayes expandido
     */
    private async testExpandedNBMethod(text: string): Promise<any> {
        return await this.expandedNBModel.predict(text);
    }

    /**
     * Normalizar sentimiento para comparación
     */
    private normalizeSentiment(label: string): string {
        if (!label) return 'neutral';
        if (label === 'very_positive' || label === 'positive') return 'positive';
        if (label === 'very_negative' || label === 'negative') return 'negative';
        return 'neutral';
    }

    /**
     * Mostrar comparación de rendimiento
     */
    private showPerformanceComparison(results: PerformanceResult[]): void {

        // Tabla de resultados
        results
            .sort((a, b) => b.accuracy - a.accuracy)
            .forEach((result, index) => {
                const rank = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '  ';
            });

        results
            .sort((a, b) => a.avgResponseTime - b.avgResponseTime)
            .forEach((result, index) => {
                const rank = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '  ';
            });

        results
            .sort((a, b) => a.memoryUsage - b.memoryUsage)
            .forEach((result, index) => {
                const rank = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '  ';
                const memoryMB = (result.memoryUsage / 1024 / 1024).toFixed(2);
            });

        // Análisis de mejoras
        const hybrid = results.find(r => r.method.includes('Híbrido'));
        const originalNB = results.find(r => r.method.includes('Original'));

        if (hybrid && originalNB) {
            const accuracyImprovement = hybrid.accuracy - originalNB.accuracy;
            const speedChange = hybrid.avgResponseTime - originalNB.avgResponseTime;


            if (accuracyImprovement > 0) {
            } else {
                console.log('⚠️ CONCLUSIÓN: Revisar configuración del sistema híbrido');
            }
        }

        const bestAccuracy = results.reduce((best, current) =>
            current.accuracy > best.accuracy ? current : best
        );
        const fastestMethod = results.reduce((fastest, current) =>
            current.avgResponseTime < fastest.avgResponseTime ? current : fastest
        );


        if (bestAccuracy.method === fastestMethod.method) {
        } else {
        }
    }
}

// Ejecutar suite de pruebas
async function main() {
    try {
        const suite = new PerformanceTestSuite();
        await suite.runPerformanceTests();
    } catch (error) {
        console.error('❌ Error ejecutando pruebas de rendimiento:', error);
        process.exit(1);
    }
}

main();
