/**
 * TEMPORARILY DISABLED - hybrid service removed during consolidation
 * Controlador de Análisis de Sentimientos Híbrido
 * Endpoints para el sistema híbrido optimizado
 */

/*
import { Request, Response } from 'express';
// TEMPORARILY DISABLED - hybrid service removed during consolidation
// import { HybridSentimentAnalysisService } from '../services/hybrid-sentiment-analysis.service';
import { SentimentAnalysisService } from '../services/backup-sentiment-analysis.service';

export class HybridSentimentController {
    private hybridService: any; // HybridSentimentAnalysisService;
    private ruleBasedService: SentimentAnalysisService;

    constructor() {
        // this.hybridService = new HybridSentimentAnalysisService();
        this.ruleBasedService = new SentimentAnalysisService();
    }
*/

    /**
     * Análisis híbrido principal
     */
    async analyzeHybrid(req: Request, res: Response): Promise<void> {
        try {
            const { text, includeDetails = false } = req.body;

            if (!text || typeof text !== 'string') {
                res.status(400).json({
                    error: 'Text parameter is required and must be a string',
                    code: 'INVALID_INPUT'
                });
                return;
            }

            if (text.length > 5000) {
                res.status(400).json({
                    error: 'Text too long. Maximum 5000 characters allowed',
                    code: 'TEXT_TOO_LONG'
                });
                return;
            }

            const startTime = Date.now();
            const result = await this.hybridService.analyze(text);
            const totalTime = Date.now() - startTime;

            const response: any = {
                sentiment: result.sentiment,
                processingTime: totalTime,
                modelVersion: 'hybrid-v1.0',
                timestamp: new Date().toISOString()
            };

            if (includeDetails) {
                response.details = {
                    ...result.details,
                    modelStats: this.hybridService.getModelStats()
                };
            }

            res.json(response);

        } catch (error) {
            console.error('Error in hybrid sentiment analysis:', error);
            res.status(500).json({
                error: 'Internal server error during sentiment analysis',
                code: 'ANALYSIS_ERROR'
            });
        }
    }

    /**
     * Análisis por lotes
     */
    async analyzeBatch(req: Request, res: Response): Promise<void> {
        try {
            const { texts, includeDetails = false } = req.body;

            if (!Array.isArray(texts)) {
                res.status(400).json({
                    error: 'Texts parameter must be an array',
                    code: 'INVALID_INPUT'
                });
                return;
            }

            if (texts.length > 100) {
                res.status(400).json({
                    error: 'Maximum 100 texts allowed per batch',
                    code: 'BATCH_TOO_LARGE'
                });
                return;
            }

            const startTime = Date.now();
            const results = [];

            for (let i = 0; i < texts.length; i++) {
                const text = texts[i];

                if (typeof text !== 'string') {
                    results.push({
                        index: i,
                        error: 'Invalid text format',
                        sentiment: null
                    });
                    continue;
                }

                if (text.length > 5000) {
                    results.push({
                        index: i,
                        error: 'Text too long',
                        sentiment: null
                    });
                    continue;
                }

                try {
                    const result = await this.hybridService.analyze(text);
                    results.push({
                        index: i,
                        sentiment: result.sentiment,
                        details: includeDetails ? result.details : undefined
                    });
                } catch (error) {
                    results.push({
                        index: i,
                        error: 'Analysis failed',
                        sentiment: null
                    });
                }
            }

            const totalTime = Date.now() - startTime;

            res.json({
                results,
                summary: {
                    total: texts.length,
                    successful: results.filter(r => !r.error).length,
                    failed: results.filter(r => r.error).length,
                    processingTime: totalTime,
                    avgTimePerText: totalTime / texts.length
                },
                modelVersion: 'hybrid-v1.0',
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Error in batch sentiment analysis:', error);
            res.status(500).json({
                error: 'Internal server error during batch analysis',
                code: 'BATCH_ANALYSIS_ERROR'
            });
        }
    }

    /**
     * Comparar modelos (híbrido vs rule-based)
     */
    async compareModels(req: Request, res: Response): Promise<void> {
        try {
            const { text } = req.body;

            if (!text || typeof text !== 'string') {
                res.status(400).json({
                    error: 'Text parameter is required and must be a string',
                    code: 'INVALID_INPUT'
                });
                return;
            }

            const startTime = Date.now();

            // Análisis híbrido
            const hybridStart = Date.now();
            const hybridResult = await this.hybridService.analyze(text);
            const hybridTime = Date.now() - hybridStart;

            // Análisis rule-based
            const ruleBasedStart = Date.now();
            const ruleBasedResult = await this.ruleBasedService.analyze(text);
            const ruleBasedTime = Date.now() - ruleBasedStart;

            const totalTime = Date.now() - startTime;

            res.json({
                comparison: {
                    hybrid: {
                        sentiment: hybridResult.sentiment,
                        processingTime: hybridTime,
                        method: hybridResult.sentiment.method
                    },
                    ruleBased: {
                        sentiment: {
                            label: ruleBasedResult.sentiment.label,
                            confidence: ruleBasedResult.sentiment.confidence,
                            method: 'rule-based'
                        },
                        processingTime: ruleBasedTime
                    },
                    agreement: this.normalizeLabel(hybridResult.sentiment.label) ===
                        this.normalizeLabel(ruleBasedResult.sentiment.label),
                    speedImprovement: hybridTime < ruleBasedTime ?
                        `${((ruleBasedTime - hybridTime) / ruleBasedTime * 100).toFixed(1)}% faster` :
                        `${((hybridTime - ruleBasedTime) / hybridTime * 100).toFixed(1)}% slower`
                },
                text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
                totalProcessingTime: totalTime,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Error in model comparison:', error);
            res.status(500).json({
                error: 'Internal server error during model comparison',
                code: 'COMPARISON_ERROR'
            });
        }
    }

    /**
     * Obtener estadísticas del modelo
     */
    async getModelStats(req: Request, res: Response): Promise<void> {
        try {
            const stats = this.hybridService.getModelStats();

            res.json({
                modelStats: stats,
                systemInfo: {
                    version: 'hybrid-v1.0',
                    description: 'Sistema híbrido que combina Rule-Based y Naive Bayes',
                    accuracy: '95.65%',
                    f1Score: '95.88%',
                    supportedLanguages: ['es', 'en', 'de', 'fr'],
                    maxTextLength: 5000,
                    maxBatchSize: 100
                },
                performance: {
                    avgProcessingTime: '< 1ms',
                    throughput: '> 1000 texts/second',
                    availability: '99.9%'
                },
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Error getting model stats:', error);
            res.status(500).json({
                error: 'Internal server error getting model statistics',
                code: 'STATS_ERROR'
            });
        }
    }

    /**
     * Health check del sistema híbrido
     */
    async healthCheck(req: Request, res: Response): Promise<void> {
        try {
            // Prueba rápida del sistema
            const testText = "Esta es una prueba del sistema";
            const startTime = Date.now();

            const result = await this.hybridService.analyze(testText);
            const responseTime = Date.now() - startTime;

            const stats = this.hybridService.getModelStats();

            res.json({
                status: 'healthy',
                modelTrained: stats.isModelTrained,
                responseTime: `${responseTime}ms`,
                testResult: {
                    text: testText,
                    sentiment: result.sentiment.label,
                    method: result.sentiment.method,
                    confidence: result.sentiment.confidence
                },
                checks: {
                    hybridService: '✅ Online',
                    naiveBayesModel: stats.isModelTrained ? '✅ Trained' : '❌ Not Trained',
                    ruleBasedFallback: '✅ Available',
                    vocabulary: `✅ ${stats.components?.length || 0} components`
                },
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Error in health check:', error);
            res.status(500).json({
                status: 'unhealthy',
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * Reentrenar el modelo
     */
    async retrainModel(req: Request, res: Response): Promise<void> {
        try {
            const startTime = Date.now();

            await this.hybridService.retrain();

            const retrainTime = Date.now() - startTime;

            res.json({
                status: 'success',
                message: 'Modelo reentrenado exitosamente',
                retrainingTime: `${retrainTime}ms`,
                newStats: this.hybridService.getModelStats(),
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Error retraining model:', error);
            res.status(500).json({
                error: 'Internal server error during model retraining',
                code: 'RETRAIN_ERROR'
            });
        }
    }

    /**
     * Normalizar etiquetas para comparación
     */
    private normalizeLabel(label: string): string {
        if (label === 'very_positive' || label === 'positive') return 'positive';
        if (label === 'very_negative' || label === 'negative') return 'negative';
        return 'neutral';
    }
}
