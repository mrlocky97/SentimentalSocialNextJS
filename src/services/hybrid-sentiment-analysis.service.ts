/**
 * Servicio de Análisis de Sentimientos Híbrido
 * Combina Rule-Based y Naive Bayes para máxima precisión
 */

import { SentimentAnalysisService } from './sentiment-analysis.service';
import { NaiveBayesSentimentModel } from '../experimental/naive-bayes.model';
import { normalizeSentimentLabel } from '../lib/utils/sentiment.utils';
import { getExpandedTrainingDataset } from '../data/expanded-training-dataset';

interface HybridSentimentResult {
    sentiment: {
        label: string;
        confidence: number;
        method: 'rule-based' | 'naive-bayes' | 'hybrid';
    };
    details: {
        ruleBasedResult?: any;
        naiveBayesResult?: any;
        hybridScore?: number;
        processingTime: number;
    };
}

export class HybridSentimentAnalysisService {
    private ruleBasedService: SentimentAnalysisService;
    private naiveBayesModel: NaiveBayesSentimentModel;
    private isModelTrained: boolean = false;

    constructor() {
        this.ruleBasedService = new SentimentAnalysisService();

        // Configuración óptima según los resultados
        this.naiveBayesModel = new NaiveBayesSentimentModel({
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

        this.initializeModel();
    }

    /**
     * Inicializar y entrenar el modelo Naive Bayes con dataset expandido
     */
    private async initializeModel(): Promise<void> {
        try {
            const trainingData = getExpandedTrainingDataset();
            await this.naiveBayesModel.train(trainingData);
            this.isModelTrained = true;
        } catch (error) {
            console.warn('⚠️ Error entrenando Naive Bayes, usando solo Rule-Based:', error);
            this.isModelTrained = false;
        }
    }

    /**
     * Análisis de sentimientos híbrido
     */
    async analyze(text: string, language: string = 'auto'): Promise<HybridSentimentResult> {
        const startTime = Date.now();

        try {
            // Obtener predicción Rule-Based
            const ruleBasedResult = await this.ruleBasedService.analyze(text);

            // Obtener predicción Naive Bayes (si está disponible)
            let naiveBayesResult = null;
            if (this.isModelTrained) {
                naiveBayesResult = await this.naiveBayesModel.predict(text);
            }

            // Combinar resultados usando estrategia híbrida
            const hybridResult = this.combineResults(ruleBasedResult, naiveBayesResult);

            const processingTime = Date.now() - startTime;

            return {
                sentiment: {
                    label: hybridResult.label,
                    confidence: hybridResult.confidence,
                    method: hybridResult.method
                },
                details: {
                    ruleBasedResult,
                    naiveBayesResult,
                    hybridScore: hybridResult.hybridScore,
                    processingTime
                }
            };

        } catch (error) {
            // Fallback a Rule-Based en caso de error
            console.warn('⚠️ Error en análisis híbrido, fallback a Rule-Based:', error);
            const ruleBasedResult = await this.ruleBasedService.analyze(text);
            const processingTime = Date.now() - startTime;

            return {
                sentiment: {
                    label: ruleBasedResult.sentiment.label,
                    confidence: ruleBasedResult.sentiment.confidence,
                    method: 'rule-based'
                },
                details: {
                    ruleBasedResult,
                    processingTime
                }
            };
        }
    }

    /**
     * Combinar resultados de ambos modelos
     */
    private combineResults(ruleBasedResult: any, naiveBayesResult: any): any {
        // Si no hay Naive Bayes, usar Rule-Based
        if (!naiveBayesResult) {
            return {
                label: ruleBasedResult.sentiment.label,
                confidence: ruleBasedResult.sentiment.confidence,
                method: 'rule-based' as const,
                hybridScore: ruleBasedResult.sentiment.confidence
            };
        }

        // Normalizar etiquetas
        const rbLabel = normalizeSentimentLabel(ruleBasedResult.sentiment.label);
        const nbLabel = normalizeSentimentLabel(naiveBayesResult.label);

        // Si ambos coinciden, usar el de mayor confianza
        if (rbLabel === nbLabel) {
            const useNaiveBayes = naiveBayesResult.confidence > ruleBasedResult.sentiment.confidence;
            return {
                label: useNaiveBayes ? naiveBayesResult.label : ruleBasedResult.sentiment.label,
                confidence: Math.max(naiveBayesResult.confidence, ruleBasedResult.sentiment.confidence),
                method: 'hybrid' as const,
                hybridScore: (naiveBayesResult.confidence + ruleBasedResult.sentiment.confidence) / 2
            };
        }

        // Si difieren, usar estrategia de desempate
        const rbConfidence = ruleBasedResult.sentiment.confidence;
        const nbConfidence = naiveBayesResult.confidence;

        // Priorizar Naive Bayes si tiene alta confianza (>70%)
        if (nbConfidence > 0.7 && nbConfidence > rbConfidence * 1.2) {
            return {
                label: naiveBayesResult.label,
                confidence: nbConfidence,
                method: 'naive-bayes' as const,
                hybridScore: nbConfidence
            };
        }

        // Priorizar Rule-Based si tiene alta confianza (>80%)
        if (rbConfidence > 0.8 && rbConfidence > nbConfidence * 1.2) {
            return {
                label: ruleBasedResult.sentiment.label,
                confidence: rbConfidence,
                method: 'rule-based' as const,
                hybridScore: rbConfidence
            };
        }

        // Promedio ponderado para casos inciertos
        const weightedScore = (rbConfidence * 0.4) + (nbConfidence * 0.6); // Naive Bayes tiene ligera preferencia
        const finalLabel = nbConfidence > rbConfidence ? naiveBayesResult.label : ruleBasedResult.sentiment.label;

        return {
            label: finalLabel,
            confidence: weightedScore,
            method: 'hybrid' as const,
            hybridScore: weightedScore
        };
    }

    /**
     * Obtener estadísticas del modelo
     */
    getModelStats(): any {
        return {
            isModelTrained: this.isModelTrained,
            modelType: 'hybrid',
            components: ['rule-based', 'naive-bayes'],
            lastTraining: new Date().toISOString()
        };
    }

    /**
     * Reentrenar el modelo Naive Bayes
     */
    async retrain(): Promise<void> {
        await this.initializeModel();
    }
}
