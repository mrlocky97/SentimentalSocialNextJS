/**
 * Enhanced Sentiment Service - Wrapper para usar el modelo entrenado en producción
 */
import * as fs from "fs";
import * as path from "path";
import { enhancedTrainingDataV3Complete } from "../data/enhanced-training-data-v3";
import { FixedNaiveBayesService } from "./fixed-naive-bayes.service";

export class EnhancedSentimentService {
  private model: FixedNaiveBayesService;
  private isModelLoaded: boolean = false;
  private modelMetadata: any = null;

  constructor() {
    this.model = new FixedNaiveBayesService();
  }

  /**
   * Inicializa y carga el modelo entrenado
   */
  public async initialize(): Promise<void> {
    try {
      console.log("🚀 Inicializando Enhanced Sentiment Service...");

      // Intentar cargar modelo guardado
      const modelPath = path.join(
        __dirname,
        "../../data/trained-sentiment-model-v3.json",
      );

      if (fs.existsSync(modelPath)) {
        console.log("📁 Cargando modelo pre-entrenado...");
        const modelData = JSON.parse(fs.readFileSync(modelPath, "utf8"));
        this.modelMetadata = modelData;
        console.log(
          `✅ Modelo cargado: ${modelData.datasetSize} ejemplos, entrenado el ${new Date(modelData.trainingDate).toLocaleDateString()}`,
        );
      } else {
        console.log(
          "⚠️ Modelo pre-entrenado no encontrado, entrenando nuevo modelo...",
        );
      }

      // Entrenar el modelo con el dataset mejorado
      await this.trainModel();

      this.isModelLoaded = true;
      console.log("✅ Enhanced Sentiment Service inicializado correctamente");
    } catch (error) {
      console.error(
        "❌ Error al inicializar Enhanced Sentiment Service:",
        error,
      );
      throw error;
    }
  }

  /**
   * Entrena el modelo con el dataset mejorado
   */
  private async trainModel(): Promise<void> {
    console.log("🔄 Entrenando modelo con dataset mejorado...");

    // Convertir datos para compatibilidad
    const trainingData = enhancedTrainingDataV3Complete.map((item) => ({
      text: item.text,
      label: item.label as "positive" | "negative" | "neutral",
    }));

    const startTime = Date.now();
    this.model.train(trainingData);
    const trainingTime = Date.now() - startTime;

    console.log(
      `✅ Modelo entrenado en ${trainingTime}ms con ${trainingData.length} ejemplos`,
    );
  }

  /**
   * Predice el sentimiento de un texto
   */
  public predict(text: string): {
    label: "positive" | "negative" | "neutral";
    confidence: number;
    scores: Record<string, number>;
    metadata?: any;
  } {
    if (!this.isModelLoaded) {
      throw new Error("Modelo no inicializado. Llama a initialize() primero.");
    }

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return {
        label: "neutral",
        confidence: 0,
        scores: { positive: 0, negative: 0, neutral: 0 },
      };
    }

    const result = this.model.predict(text.trim());

    return {
      label: result.label,
      confidence: result.confidence,
      scores: result.scores,
      metadata: {
        textLength: text.length,
        modelVersion: "enhanced-v3",
        trainingDate: this.modelMetadata?.trainingDate,
        vocabularySize: this.getStats().vocabularySize,
      },
    };
  }

  /**
   * Procesa múltiples textos en lote
   */
  public predictBatch(texts: string[]): Array<{
    text: string;
    prediction: {
      label: "positive" | "negative" | "neutral";
      confidence: number;
      scores: Record<string, number>;
    };
  }> {
    return texts.map((text) => ({
      text,
      prediction: this.predict(text),
    }));
  }

  /**
   * Obtiene estadísticas del modelo
   */
  public getStats(): any {
    if (!this.isModelLoaded) {
      return { error: "Modelo no inicializado" };
    }

    return {
      ...this.model.getStats(),
      modelVersion: "enhanced-v3",
      metadata: this.modelMetadata,
    };
  }

  /**
   * Evalúa la calidad de una predicción basada en la confianza
   */
  public getConfidenceLevel(confidence: number): {
    level: "very_high" | "high" | "medium" | "low" | "very_low";
    description: string;
  } {
    if (confidence >= 0.9) {
      return { level: "very_high", description: "Predicción muy confiable" };
    } else if (confidence >= 0.8) {
      return { level: "high", description: "Predicción confiable" };
    } else if (confidence >= 0.6) {
      return {
        level: "medium",
        description: "Predicción moderadamente confiable",
      };
    } else if (confidence >= 0.4) {
      return { level: "low", description: "Predicción poco confiable" };
    } else {
      return {
        level: "very_low",
        description: "Predicción muy poco confiable",
      };
    }
  }

  /**
   * Verifica si el modelo está listo para usar
   */
  public isReady(): boolean {
    return this.isModelLoaded;
  }
}

// Instancia singleton para usar en toda la aplicación
export const enhancedSentimentService = new EnhancedSentimentService();
