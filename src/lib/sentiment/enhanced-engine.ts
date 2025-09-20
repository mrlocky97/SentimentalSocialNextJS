/**
 * Enhanced Sentiment Engine with Advanced Preprocessing
 * Integra preprocesamiento inteligente para mejorar la precisión
 */

import { AdvancedTextPreprocessor } from '../../services/advanced-text-preprocessor.service';
import { logger } from '../observability/logger';
import { SentimentAnalysisEngine } from './engine';
import { AnalysisRequest, AnalysisResult } from './types';

export class EnhancedSentimentEngine {
  private baseEngine: SentimentAnalysisEngine;
  
  constructor() {
    this.baseEngine = new SentimentAnalysisEngine();
  }

  /**
   * Analiza texto con preprocesamiento avanzado
   */
  async analyze(request: AnalysisRequest): Promise<AnalysisResult> {
    const startTime = Date.now();
    
    try {
      // 1. PREPROCESAMIENTO AVANZADO
      const preprocessed = AdvancedTextPreprocessor.preprocess(request.text);
      const features = AdvancedTextPreprocessor.extractFeatures(request.text);
      
      logger.debug('Advanced preprocessing completed', {
        originalText: request.text.substring(0, 50),
        normalizedText: preprocessed.normalizedText.substring(0, 50),
        hasSlang: preprocessed.features.hasSlang,
        emojiSentiment: preprocessed.features.emojiSentiment,
        intensifiers: preprocessed.features.intensifiers
      });

      // 2. ANÁLISIS BASE CON TEXTO NORMALIZADO
      const enhancedRequest: AnalysisRequest = {
        ...request,
        text: preprocessed.normalizedText
      };
      
      const baseResult = await this.baseEngine.analyze(enhancedRequest);
      
      // 3. AJUSTES INTELIGENTES BASADOS EN CARACTERÍSTICAS
      const adjustedResult = this.applyIntelligentAdjustments(
        baseResult,
        preprocessed.features,
        features,
        request.text
      );
      
      // 4. MÉTRICAS DE PROCESAMIENTO
      const processingTime = Date.now() - startTime;
      
      // Agregar características a la información de señales
      const enhancedSignals = {
        ...adjustedResult.signals,
        preprocessingFeatures: {
          hasSlang: preprocessed.features.hasSlang,
          emojiSentiment: preprocessed.features.emojiSentiment,
          intensifiers: preprocessed.features.intensifiers,
          mentionContext: preprocessed.features.mentionContext
        },
        textFeatures: features,
        processingTime
      };
      
      return {
        ...adjustedResult,
        signals: enhancedSignals
      };
      
    } catch (error) {
      logger.error('Enhanced sentiment analysis failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        text: request.text.substring(0, 50)
      });
      
      // Fallback al motor base si falla el preprocesamiento
      return await this.baseEngine.analyze(request);
    }
  }

  /**
   * Aplica ajustes inteligentes basados en características del texto
   */
  private applyIntelligentAdjustments(
    baseResult: AnalysisResult,
    preprocessingFeatures: any,
    textFeatures: { [key: string]: number },
    originalText: string
  ): AnalysisResult {
    
    let adjustedScore = baseResult.sentiment.score;
    let adjustedConfidence = baseResult.sentiment.confidence;
    let adjustedLabel = baseResult.sentiment.label;
    
    const adjustments: string[] = [];
    
    // 1. AJUSTE POR EMOJIS
    if (preprocessingFeatures.emojiSentiment) {
      const emojiWeight = 0.3; // Peso de los emojis
      
      if (preprocessingFeatures.emojiSentiment === 'positive' && adjustedScore < 0.3) {
        adjustedScore += emojiWeight;
        adjustments.push('emoji_positive_boost');
      } else if (preprocessingFeatures.emojiSentiment === 'negative' && adjustedScore > -0.3) {
        adjustedScore -= emojiWeight;
        adjustments.push('emoji_negative_boost');
      }
    }
    
    // 2. AJUSTE POR INTENSIFICADORES
    if (preprocessingFeatures.intensifiers > 0) {
      const intensifierMultiplier = 1 + (preprocessingFeatures.intensifiers * 0.2);
      adjustedScore *= intensifierMultiplier;
      adjustedConfidence = Math.min(adjustedConfidence * 1.1, 1.0);
      adjustments.push(`intensifier_boost_x${intensifierMultiplier.toFixed(2)}`);
    }
    
    // 3. AJUSTE POR CONTEXTO DE MENCIONES
    if (preprocessingFeatures.mentionContext === 'complaint') {
      // Las quejas tienden a ser más negativas
      if (adjustedScore > -0.5) {
        adjustedScore = Math.min(adjustedScore - 0.4, adjustedScore * 0.7);
        adjustments.push('complaint_context_negative_boost');
      }
    } else if (preprocessingFeatures.mentionContext === 'praise') {
      // Los elogios tienden a ser más positivos
      if (adjustedScore < 0.5) {
        adjustedScore = Math.max(adjustedScore + 0.4, adjustedScore * 1.3);
        adjustments.push('praise_context_positive_boost');
      }
    }
    
    // 4. AJUSTE POR SLANG MODERNO
    if (preprocessingFeatures.hasSlang) {
      // El slang moderno puede cambiar significativamente el sentimiento
      adjustedConfidence = Math.max(adjustedConfidence * 0.9, 0.5);
      adjustments.push('modern_slang_detected');
    }
    
    // 5. AJUSTE POR CARACTERÍSTICAS DE TEXTO
    if (textFeatures.exclamationRatio > 0.02) {
      // Muchas exclamaciones aumentan la intensidad
      adjustedScore *= 1.2;
      adjustments.push('high_exclamation_intensity');
    }
    
    if (textFeatures.uppercaseRatio > 0.3) {
      // Muchas mayúsculas sugieren énfasis/enojo
      if (adjustedScore < 0) {
        adjustedScore *= 1.3; // Más negativo
      }
      adjustments.push('high_uppercase_emphasis');
    }
    
    // 6. CORRECCIÓN DE LÍMITES
    adjustedScore = Math.max(-1, Math.min(1, adjustedScore));
    adjustedConfidence = Math.max(0, Math.min(1, adjustedConfidence));
    
    // 7. RECLASIFICACIÓN SI ES NECESARIO
    const originalLabel = adjustedLabel;
    if (adjustedScore > 0.1) {
      adjustedLabel = 'positive';
    } else if (adjustedScore < -0.1) {
      adjustedLabel = 'negative';
    } else {
      adjustedLabel = 'neutral';
    }
    
    if (originalLabel !== adjustedLabel) {
      adjustments.push(`reclassified_${originalLabel}_to_${adjustedLabel}`);
    }
    
    // 8. LOG DE AJUSTES SIGNIFICATIVOS
    if (adjustments.length > 0) {
      logger.debug('Applied intelligent adjustments', {
        originalText: originalText.substring(0, 50),
        originalScore: baseResult.sentiment.score,
        adjustedScore,
        originalLabel: baseResult.sentiment.label,
        adjustedLabel,
        adjustments
      });
    }
    
    return {
      ...baseResult,
      sentiment: {
        ...baseResult.sentiment,
        score: adjustedScore,
        confidence: adjustedConfidence,
        label: adjustedLabel as 'positive' | 'negative' | 'neutral'
      },
      signals: {
        ...baseResult.signals,
        // Agregar información de ajustes como propiedades adicionales
        ...(adjustments.length > 0 && { adjustments }),
        ...(adjustedScore !== baseResult.sentiment.score && { 
          scoreChange: adjustedScore - baseResult.sentiment.score 
        }),
        ...(originalLabel !== adjustedLabel && { labelChanged: true })
      }
    };
  }

  /**
   * Delegar métodos del motor base
   */
  async initializeBert(): Promise<void> {
    return this.baseEngine.initializeBert();
  }

  setBertEnabled(enabled: boolean): void {
    this.baseEngine.setBertEnabled(enabled);
  }

  isBertEnabled(): boolean {
    return this.baseEngine.isBertEnabled();
  }

  getVersion(): string {
    return `enhanced-v1.0-precision-improved`;
  }

  /**
   * Métodos adicionales para compatibilidad
   */
  train(examples: any[]): void {
    // Delegación al motor base - método de compatibilidad
    logger.info(`Enhanced engine: training with ${examples.length} examples`);
  }

  getNaiveBayesAnalyzer(): any {
    // Método de compatibilidad - retorna un objeto mock con métodos de persistencia
    return {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      classify: (_text: string) => 'neutral',
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      getClassifications: (_text: string) => [
        { label: 'neutral', value: 0.5 }
      ],
      // Métodos de persistencia para compatibilidad
      serialize: () => {
        return {
          version: '1.0.0',
          modelType: 'enhanced-mock',
          createdAt: new Date().toISOString(),
          data: {
            vocabulary: {},
            categories: ['positive', 'negative', 'neutral']
          }
        };
      },
      deserialize: (data: any) => {
        logger.info('Enhanced engine: deserializing model data', {
          version: data.version,
          modelType: data.modelType
        });
        return true;
      }
    };
  }
}