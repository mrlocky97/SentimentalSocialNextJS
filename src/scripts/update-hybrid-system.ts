/**
 * Script de actualización del sistema híbrido
 * Valida que el sistema híbrido use el dataset expandido correctamente
 */

import { HybridSentimentAnalysisService } from '../services/hybrid-sentiment-analysis.service';
import { getExpandedTrainingDatasetStats } from '../data/expanded-training-dataset';

class HybridSystemUpdater {
    private hybridService: HybridSentimentAnalysisService;

    constructor() {
        this.hybridService = new HybridSentimentAnalysisService();
    }

    /**
     * Validar la actualización del sistema híbrido
     */
    async validateUpdate(): Promise<void> {

        // Mostrar estadísticas del dataset expandido
        const datasetStats = getExpandedTrainingDatasetStats();
        console.log(`❌ Negativos: ${datasetStats.negative} (${((datasetStats.negative / datasetStats.total) * 100).toFixed(1)}%)`);

        // Esperar a que el modelo se entrene
        await this.waitForModelTraining();

        // Obtener estadísticas del modelo
        const modelStats = this.hybridService.getModelStats();
        console.log(`🎯 Modelo entrenado: ${modelStats.isModelTrained ? '✅ SÍ' : '❌ NO'}`);

        // Pruebas de validación
        await this.runValidationTests();

    }

    /**
     * Esperar a que el modelo termine de entrenarse
     */
    private async waitForModelTraining(): Promise<void> {
        let attempts = 0;
        const maxAttempts = 10;

        while (attempts < maxAttempts) {
            const stats = this.hybridService.getModelStats();
            if (stats.isModelTrained) {
                return;
            }

            await new Promise(resolve => setTimeout(resolve, 1000));
            attempts++;
        }

        console.warn('⚠️ Timeout esperando entrenamiento del modelo');
    }

    /**
     * Ejecutar pruebas de validación
     */
    private async runValidationTests(): Promise<void> {

        const testCases = [
            { text: 'Me encanta este producto, es fantástico!', expected: 'positive' },
            { text: 'Odio esta aplicación, es terrible', expected: 'negative' },
            { text: 'El clima está nublado hoy', expected: 'neutral' },
            { text: 'Amazing product! Best purchase ever! 🎉', expected: 'positive' },
            { text: 'Worst experience ever. Complete waste of money!', expected: 'negative' }
        ];

        let correctPredictions = 0;

        for (let i = 0; i < testCases.length; i++) {
            const testCase = testCases[i];

            try {
                const result = await this.hybridService.analyze(testCase.text);
                const predicted = this.normalizeSentiment(result.sentiment.label);
                const isCorrect = predicted === testCase.expected;

                console.log(`   ${isCorrect ? '✅' : '❌'} Resultado: ${isCorrect ? 'CORRECTO' : 'INCORRECTO'}`);

                if (isCorrect) correctPredictions++;
            } catch (error) {
                console.log(`   ❌ Error: ${error}`);
            }
        }

        const accuracy = (correctPredictions / testCases.length) * 100;

        if (accuracy >= 80) {
        } else {
            console.log('⚠️ Validación PARCIAL - Verificar configuración');
        }
    }

    /**
     * Normalizar sentimiento para comparación
     */
    private normalizeSentiment(label: string): string {
        if (label === 'very_positive' || label === 'positive') return 'positive';
        if (label === 'very_negative' || label === 'negative') return 'negative';
        return 'neutral';
    }
}

// Ejecutar actualización
async function main() {
    try {
        const updater = new HybridSystemUpdater();
        await updater.validateUpdate();
    } catch (error) {
        console.error('❌ Error actualizando sistema híbrido:', error);
        process.exit(1);
    }
}

main();
