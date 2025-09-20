import { logger } from "../lib/observability/logger";
import { EnhancedComplexCaseHandler, EnhancedPrediction } from "./enhanced-complex-case-handler.service";
import { NaiveBayesSentimentService, NaiveBayesTrainingExample, SentimentLabel, SentimentPrediction } from "./naive-bayes-sentiment.service";

export interface FeedbackLoop {
  prediction: SentimentPrediction;
  actualLabel: SentimentLabel;
  confidence: number;
  text: string;
  timestamp: Date;
  userId?: string;
  source?: string;
}

export interface AutoLearningStats {
  totalFeedbacks: number;
  correctPredictions: number;
  wrongPredictions: number;
  retrainingEvents: number;
  averageConfidence: number;
  performanceHistory: number[];
  vocabularyGrowth: number;
  lastRetraining: Date | null;
}

export interface PerformanceMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  confusionMatrix: Record<SentimentLabel, Record<SentimentLabel, number>>;
}

/**
 * Sistema Avanzado de Auto-Aprendizaje para Naive Bayes
 * 
 * Características:
 * - Aprendizaje incremental sin pérdida de conocimiento previo
 * - Buffer de retroalimentación automática
 * - Detección de concept drift
 * - Re-entrenamiento inteligente
 * - Métricas de rendimiento en tiempo real
 */
export class AutoLearningNaiveBayesService {
  private baseModel: NaiveBayesSentimentService;
  private complexCaseHandler: EnhancedComplexCaseHandler;
  private feedbackBuffer: FeedbackLoop[] = [];
  private readonly bufferSize: number;
  private readonly confidenceThreshold: number;
  private readonly retrainingThreshold: number;
  private readonly performanceWindowSize: number;
  
  private stats: AutoLearningStats;
  private performanceHistory: number[] = [];
  private confusionMatrix: Record<SentimentLabel, Record<SentimentLabel, number>>;

  constructor(
    bufferSize: number = 100,
    confidenceThreshold: number = 0.7,
    retrainingThreshold: number = 0.05,
    performanceWindowSize: number = 50
  ) {
    this.baseModel = new NaiveBayesSentimentService();
    this.complexCaseHandler = new EnhancedComplexCaseHandler();
    
    this.bufferSize = bufferSize;
    this.confidenceThreshold = confidenceThreshold;
    this.retrainingThreshold = retrainingThreshold;
    this.performanceWindowSize = performanceWindowSize;
    
    this.stats = {
      totalFeedbacks: 0,
      correctPredictions: 0,
      wrongPredictions: 0,
      retrainingEvents: 0,
      averageConfidence: 0,
      performanceHistory: [],
      vocabularyGrowth: 0,
      lastRetraining: null
    };

    this.confusionMatrix = this.initializeConfusionMatrix();
    
    logger.info("AutoLearningNaiveBayesService initialized", {
      bufferSize: this.bufferSize,
      confidenceThreshold: this.confidenceThreshold,
      retrainingThreshold: this.retrainingThreshold
    });
  }

  private initializeConfusionMatrix(): Record<SentimentLabel, Record<SentimentLabel, number>> {
    const labels: SentimentLabel[] = ["positive", "negative", "neutral"];
    const matrix: Record<SentimentLabel, Record<SentimentLabel, number>> = {} as any;
    
    for (const actual of labels) {
      matrix[actual] = {} as Record<SentimentLabel, number>;
      for (const predicted of labels) {
        matrix[actual][predicted] = 0;
      }
    }
    
    return matrix;
  }

  /**
   * Predecir sentimiento (delegado al modelo base)
   */
  predict(text: string): SentimentPrediction {
    return this.baseModel.predict(text);
  }

  /**
   * Predecir sentimiento con análisis avanzado para casos complejos
   * Este método usa el manejador especializado para casos difíciles
   */
  async predictEnhanced(text: string): Promise<EnhancedPrediction> {
    try {
      // Primero intentar con el manejador de casos complejos
      const enhancedResult = await this.complexCaseHandler.analyzeComplexCase(text);
      
      logger.debug("Enhanced prediction completed", {
        text: text.substring(0, 50),
        label: enhancedResult.label,
        confidence: enhancedResult.confidence,
        complexityScore: enhancedResult.complexityScore,
        reasoningCount: enhancedResult.reasoning.length
      });
      
      return enhancedResult;
    } catch (error) {
      logger.error("Error in enhanced prediction, falling back to base model", error);
      
      // Fallback al modelo base
      const basePrediction = this.baseModel.predict(text);
      return {
        ...basePrediction,
        complexityScore: 0,
        features: {
          sarcasmScore: 0,
          hasQuotedPositives: false,
          hasContradictions: false,
          hasSlang: false,
          hasTypos: false,
          normalizedConfidence: basePrediction.confidence,
          temporalContext: null,
          doubleNegation: false,
          culturalContext: null,
          emotionalIntensity: 0,
          contradictorySignals: false,
          detectedLanguage: 'en',
          isMixedLanguage: false
        },
        reasoning: ["Fallback to base model due to error"],
        fallbackUsed: true
      };
    }
  }

  /**
   * Entrenar el modelo base
   */
  train(examples: NaiveBayesTrainingExample[]): void {
    this.baseModel.train(examples);
  }

  /**
   * Obtener estadísticas del modelo base
   */
  getStats(): Record<string, unknown> {
    return this.baseModel.getStats();
  }

  /**
   * Serializar el modelo base
   */
  serialize(): ReturnType<NaiveBayesSentimentService['serialize']> {
    return this.baseModel.serialize();
  }

  /**
   * Deserializar el modelo base
   */
  deserialize(data: Parameters<NaiveBayesSentimentService['deserialize']>[0]): void {
    this.baseModel.deserialize(data);
  }

  /**
   * Aprendizaje incremental - Agrega nuevos ejemplos sin resetear el modelo
   */
  incrementalTrain(examples: NaiveBayesTrainingExample[]): void {
    if (!examples || examples.length === 0) {
      logger.warn("No examples provided for incremental training");
      return;
    }

    logger.info(`Starting incremental training with ${examples.length} examples...`);
    const vocabularySizeBefore = this.getVocabularySize();

    // Usar el método incrementalTrain del modelo base para verdadero aprendizaje incremental
    this.baseModel.incrementalTrain(examples);

    const vocabularySizeAfter = this.getVocabularySize();
    this.stats.vocabularyGrowth = vocabularySizeAfter - vocabularySizeBefore;

    logger.info("Incremental training completed", {
      examplesProcessed: examples.length,
      vocabularyGrowth: this.stats.vocabularyGrowth,
      newVocabularySize: vocabularySizeAfter
    });
  }

  /**
   * Proporcionar retroalimentación al sistema para auto-aprendizaje
   */
  provideFeedback(
    text: string, 
    actualLabel: SentimentLabel, 
    userId?: string, 
    source?: string
  ): void {
    const prediction = this.predict(text);
    
    const feedback: FeedbackLoop = {
      prediction,
      actualLabel,
      confidence: prediction.confidence,
      text,
      timestamp: new Date(),
      userId,
      source
    };

    this.feedbackBuffer.push(feedback);
    this.updateStats(feedback);
    this.updateConfusionMatrix(prediction.label, actualLabel);

    logger.debug("Feedback received", {
      predicted: prediction.label,
      actual: actualLabel,
      confidence: prediction.confidence,
      isCorrect: prediction.label === actualLabel,
      bufferSize: this.feedbackBuffer.length
    });

    // Auto-reentrenar cuando el buffer está lleno
    if (this.feedbackBuffer.length >= this.bufferSize) {
      this.processAutomaticLearning();
    }

    // Verificar si hay degradación del rendimiento
    if (this.detectPerformanceDrift()) {
      logger.warn("Performance drift detected, triggering model refresh");
      this.triggerModelRefresh();
    }
  }

  /**
   * Procesar aprendizaje automático basado en el buffer de retroalimentación
   */
  private processAutomaticLearning(): void {
    logger.info("Processing automatic learning from feedback buffer");

    // Filtrar ejemplos incorrectos con baja confianza para reentrenamiento
    const learningExamples = this.feedbackBuffer
      .filter(fb => 
        fb.prediction.label !== fb.actualLabel && 
        fb.confidence < this.confidenceThreshold
      )
      .map(fb => ({ 
        text: fb.text, 
        label: fb.actualLabel 
      }));

    // También incluir algunos ejemplos correctos para balancear
    const correctExamples = this.feedbackBuffer
      .filter(fb => 
        fb.prediction.label === fb.actualLabel && 
        fb.confidence > this.confidenceThreshold
      )
      .slice(0, Math.floor(learningExamples.length * 0.3))
      .map(fb => ({ 
        text: fb.text, 
        label: fb.actualLabel 
      }));

    const allLearningExamples = [...learningExamples, ...correctExamples];

    if (allLearningExamples.length > 0) {
      this.incrementalTrain(allLearningExamples);
      this.stats.retrainingEvents++;
      this.stats.lastRetraining = new Date();
      
      logger.info(`Auto-learned from ${allLearningExamples.length} examples`, {
        incorrectExamples: learningExamples.length,
        correctExamples: correctExamples.length,
        totalRetrainingEvents: this.stats.retrainingEvents
      });
    }

    // Calcular y registrar métricas de rendimiento
    const metrics = this.calculatePerformanceMetrics();
    this.performanceHistory.push(metrics.accuracy);
    
    if (this.performanceHistory.length > this.performanceWindowSize) {
      this.performanceHistory.shift();
    }

    this.stats.performanceHistory = [...this.performanceHistory];

    // Limpiar buffer
    this.feedbackBuffer = [];
  }

  /**
   * Detectar degradación del rendimiento (concept drift)
   */
  private detectPerformanceDrift(): boolean {
    if (this.performanceHistory.length < this.performanceWindowSize) {
      return false;
    }
    
    const recentWindowSize = Math.floor(this.performanceWindowSize * 0.2); // 20% más reciente
    const recent = this.performanceHistory
      .slice(-recentWindowSize)
      .reduce((a, b) => a + b, 0) / recentWindowSize;
      
    const historical = this.performanceHistory
      .slice(0, -recentWindowSize)
      .reduce((a, b) => a + b, 0) / (this.performanceWindowSize - recentWindowSize);
    
    const performanceDrop = historical - recent;
    
    logger.debug("Performance drift analysis", {
      recent,
      historical,
      performanceDrop,
      threshold: this.retrainingThreshold
    });
    
    return performanceDrop > this.retrainingThreshold;
  }

  /**
   * Disparar refresco del modelo por degradación de rendimiento
   */
  private triggerModelRefresh(): void {
    logger.warn("Triggering model refresh due to performance degradation");
    
    // Procesar inmediatamente el buffer actual
    if (this.feedbackBuffer.length > 0) {
      this.processAutomaticLearning();
    }
    
    // Opcional: Recargar modelo base desde archivo si existe
    this.tryLoadBaseModel();
  }

  /**
   * Intentar cargar modelo base desde archivo
   */
  private async tryLoadBaseModel(): Promise<void> {
    try {
      const { ModelPersistenceManager } = await import("./model-persistence.service");
      const persistence = new ModelPersistenceManager();
      const metadata = await persistence.loadNaiveBayesModel(this.baseModel);
      
      if (metadata) {
        logger.info("Base model reloaded successfully", { metadata });
      }
    } catch (error) {
      logger.warn("Could not reload base model", error);
    }
  }

  /**
   * Actualizar estadísticas de auto-aprendizaje
   */
  private updateStats(feedback: FeedbackLoop): void {
    this.stats.totalFeedbacks++;
    
    if (feedback.prediction.label === feedback.actualLabel) {
      this.stats.correctPredictions++;
    } else {
      this.stats.wrongPredictions++;
    }
    
    // Actualizar confianza promedio (media móvil)
    const alpha = 0.1; // Factor de suavizado
    this.stats.averageConfidence = 
      alpha * feedback.confidence + (1 - alpha) * this.stats.averageConfidence;
  }

  /**
   * Actualizar matriz de confusión
   */
  private updateConfusionMatrix(predicted: SentimentLabel, actual: SentimentLabel): void {
    this.confusionMatrix[actual][predicted]++;
  }

  /**
   * Calcular métricas de rendimiento
   */
  public calculatePerformanceMetrics(): PerformanceMetrics {
    const labels: SentimentLabel[] = ["positive", "negative", "neutral"];
    let totalCorrect = 0;
    let totalPredictions = 0;
    
    const precision: Record<SentimentLabel, number> = {} as any;
    const recall: Record<SentimentLabel, number> = {} as any;
    
    for (const label of labels) {
      const truePositives = this.confusionMatrix[label][label];
      let falsePositives = 0;
      let falseNegatives = 0;
      
      for (const otherLabel of labels) {
        if (otherLabel !== label) {
          falsePositives += this.confusionMatrix[otherLabel][label];
          falseNegatives += this.confusionMatrix[label][otherLabel];
        }
      }
      
      totalCorrect += truePositives;
      totalPredictions += truePositives + falseNegatives;
      
      precision[label] = truePositives / (truePositives + falsePositives) || 0;
      recall[label] = truePositives / (truePositives + falseNegatives) || 0;
    }
    
    const accuracy = totalPredictions > 0 ? totalCorrect / totalPredictions : 0;
    const avgPrecision = Object.values(precision).reduce((a, b) => a + b, 0) / labels.length;
    const avgRecall = Object.values(recall).reduce((a, b) => a + b, 0) / labels.length;
    const f1Score = 2 * (avgPrecision * avgRecall) / (avgPrecision + avgRecall) || 0;
    
    return {
      accuracy,
      precision: avgPrecision,
      recall: avgRecall,
      f1Score,
      confusionMatrix: this.confusionMatrix
    };
  }

  /**
   * Obtener estadísticas de auto-aprendizaje
   */
  public getAutoLearningStats(): AutoLearningStats {
    return { ...this.stats };
  }

  /**
   * Obtener métricas de rendimiento actuales
   */
  public getCurrentMetrics(): PerformanceMetrics {
    return this.calculatePerformanceMetrics();
  }

  /**
   * Resetear estadísticas de auto-aprendizaje
   */
  public resetAutoLearningStats(): void {
    this.stats = {
      totalFeedbacks: 0,
      correctPredictions: 0,
      wrongPredictions: 0,
      retrainingEvents: 0,
      averageConfidence: 0,
      performanceHistory: [],
      vocabularyGrowth: 0,
      lastRetraining: null
    };
    
    this.performanceHistory = [];
    this.confusionMatrix = this.initializeConfusionMatrix();
    this.feedbackBuffer = [];
    
    logger.info("Auto-learning stats reset");
  }

  /**
   * Forzar procesamiento del buffer actual
   */
  public forceProcessBuffer(): void {
    if (this.feedbackBuffer.length > 0) {
      logger.info(`Force processing buffer with ${this.feedbackBuffer.length} items`);
      this.processAutomaticLearning();
    }
  }

  /**
   * Métodos auxiliares para acceder a estadísticas del modelo base
   */
  private getVocabularySize(): number {
    const stats = this.baseModel.getStats();
    return (stats.vocabularySize as number) || 0;
  }

  private preprocessText(text: string): string[] {
    // Implementación simple de preprocesamiento
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !this.isStopWord(word));
  }

  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should',
      'could', 'can', 'may', 'might', 'must', 'i', 'you', 'he', 'she', 'it',
      'we', 'they', 'me', 'him', 'her', 'us', 'them', 'this', 'that', 'these',
      'those', 'what', 'which', 'who', 'when', 'where', 'why', 'how'
    ]);
    return stopWords.has(word);
  }

  /**
   * Serializar modelo incluyendo estadísticas de auto-aprendizaje
   */
  public serializeWithAutoLearning(): {
    model: ReturnType<NaiveBayesSentimentService['serialize']>;
    autoLearningStats: AutoLearningStats;
    performanceMetrics: PerformanceMetrics;
    timestamp: string;
  } {
    return {
      model: this.serialize(),
      autoLearningStats: this.getAutoLearningStats(),
      performanceMetrics: this.getCurrentMetrics(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Deserializar modelo con estadísticas de auto-aprendizaje
   */
  public deserializeWithAutoLearning(data: {
    model: Parameters<NaiveBayesSentimentService['deserialize']>[0];
    autoLearningStats?: AutoLearningStats;
    performanceMetrics?: PerformanceMetrics;
  }): void {
    this.deserialize(data.model);
    
    if (data.autoLearningStats) {
      this.stats = { ...data.autoLearningStats };
      this.performanceHistory = [...data.autoLearningStats.performanceHistory];
    }
    
    logger.info("Auto-learning model deserialized successfully", {
      vocabularySize: this.getVocabularySize(),
      totalFeedbacks: this.stats.totalFeedbacks,
      retrainingEvents: this.stats.retrainingEvents
    });
  }
}