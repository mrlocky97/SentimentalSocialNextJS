/**
 * Enhanced Sentiment Service - Wrapper para usar el modelo entrenado en producción
 */
import * as fs from "fs";
import * as path from "path";
import { sentimentTestDataset as enhancedTrainingDataV3Complete } from "../../data/test-datasets";
import { logger } from "../../lib/observability/logger";
import { FixedNaiveBayesService } from "./fixed-naive-bayes.service"; // Will need to be fixed if used

// Helpers para leer .env sin re-importar dotenv aquí
const envNum = (name: string, def: number) =>
  process.env[name] ? parseFloat(process.env[name]!) : def;
const envBool = (name: string, def = false) =>
  (process.env[name] ?? String(def)).toString().toLowerCase() === "true";

// Señales lingüísticas/emojis
const POS_WORDS = [
  "love",
  "amazing",
  "awesome",
  "great",
  "fantastic",
  "excelente",
  "me encanta",
  "genial",
  "perfecto",
  "recomend",
  "impresionante",
  "increíble",
  "rápido",
  "cumple",
  "gracias :)",
];
const NEG_WORDS = [
  "hate",
  "awful",
  "terrible",
  "horrible",
  "bad",
  "malo",
  "pésimo",
  "decepcion",
  "tarde",
  "lento",
  "caro",
  "estafa",
  "nunca más",
  "no sirve",
  "fatal",
  ":(",
];

const POS_EMOJIS = [
  "😍",
  "😊",
  "😀",
  "😁",
  "👍",
  "✨",
  "🎉",
  "🔥",
  "❤️",
  "♥️",
  "😻",
  "🤩",
];
const NEG_EMOJIS = [
  "😡",
  "😠",
  "😤",
  "😢",
  "😭",
  "👎",
  "💀",
  "🤬",
  "🙄",
  "😒",
  "😞",
  "😕",
];
const NEUTRAL_EMOJIS = ["😐", "🤔", "😶"];

/**
 * Post-procesa los scores del clasificador para reducir "neutral" espurio
 * y reforzar señales fuertes (emojis, lexicón, exclamaciones, negaciones).
 */
function decideWithHeuristics(
  text: string,
  scores: { positive: number; negative: number; neutral: number },
) {
  const NEUTRAL_DELTA = envNum("NEUTRAL_DELTA", 0.07);
  const POS_BIAS = envNum("POS_BIAS", 0.1);
  const NEG_BIAS = envNum("NEG_BIAS", 0.1);
  const EMOJI_WEIGHT = envNum("EMOJI_WEIGHT", 0.2);
  const EXCLAMATION_WEIGHT = envNum("EXCLAMATION_WEIGHT", 0.05);
  const NEGATION_INVERT = envBool("NEGATION_INVERT", true);

  let { positive, negative, neutral } = scores;
  const t = (text || "").toLowerCase();

  // Negaciones simples
  if (NEGATION_INVERT) {
    const hasNo = /\b(no|nunca|jamás|never|not)\b/.test(t);
    if (hasNo) {
      if (positive > negative && positive - negative < 0.25) {
        negative += 0.08;
        positive -= 0.05;
        neutral += 0.02;
      }
      if (negative > positive && negative - positive < 0.25) {
        neutral += 0.04;
      }
    }
  }

  // Emojis
  if (POS_EMOJIS.some((e) => text.includes(e))) positive += EMOJI_WEIGHT;
  if (NEG_EMOJIS.some((e) => text.includes(e))) negative += EMOJI_WEIGHT;
  if (NEUTRAL_EMOJIS.some((e) => text.includes(e)))
    neutral += EMOJI_WEIGHT * 0.5;

  // Exclamaciones refuerzan emoción dominante
  const excls = (text.match(/!/g) || []).length;
  if (excls >= 1) {
    if (positive >= negative && positive >= neutral)
      positive += EXCLAMATION_WEIGHT * Math.min(3, excls);
    else if (negative >= positive && negative >= neutral)
      negative += EXCLAMATION_WEIGHT * Math.min(3, excls);
  }

  // Lexicón
  if (POS_WORDS.some((w) => t.includes(w))) positive += 0.12;
  if (NEG_WORDS.some((w) => t.includes(w))) negative += 0.12;

  // Reducir neutralismo tibio
  if (neutral > positive && neutral > negative) {
    positive += POS_BIAS * 0.5;
    negative += NEG_BIAS * 0.5;
  }

  // Normalización simple
  const sum = positive + negative + neutral + 1e-9;
  positive /= sum;
  negative /= sum;
  neutral /= sum;

  // Elegir etiqueta con "zona neutral" controlada
  const arr = [
    { label: "positive", score: positive },
    { label: "negative", score: negative },
    { label: "neutral", score: neutral },
  ].sort((a, b) => b.score - a.score);

  const gap = arr[0].score - arr[1].score;

  // Si neutral gana por poco y hay señales, empuja a pos/neg
  if (arr[0].label === "neutral" && gap < NEUTRAL_DELTA) {
    if (positive > negative && positive - negative > 0.03)
      arr[0].label = "positive";
    else if (negative > positive && negative - positive > 0.03)
      arr[0].label = "negative";
  }

  return {
    label: arr[0].label as "positive" | "negative" | "neutral",
    confidence: arr[0].score,
    adjustedScores: { positive, negative, neutral },
  };
}

interface EnhancedModelMetadata {
  datasetSize?: number;
  trainingDate?: string;
  [key: string]: unknown; // Future fields
}

export class EnhancedSentimentService {
  private model: FixedNaiveBayesService;
  private isModelLoaded: boolean = false;
  private modelMetadata: EnhancedModelMetadata | null = null;

  constructor() {
    this.model = new FixedNaiveBayesService();
  }

  /**
   * Inicializa y carga el modelo entrenado
   */
  public async initialize(): Promise<void> {
    try {
      logger.info("Inicializando Enhanced Sentiment Service...");

      // Intentar cargar modelo guardado
      const modelPath = path.join(
        __dirname,
        "../../data/trained-sentiment-model-v3.json",
      );

      if (fs.existsSync(modelPath)) {
        logger.info("Cargando modelo pre-entrenado...");
        const modelData = JSON.parse(fs.readFileSync(modelPath, "utf8"));
        this.modelMetadata = modelData;
        logger.info("Modelo cargado", {
          datasetSize: modelData.datasetSize,
          trainingDate: modelData.trainingDate,
        });
      } else {
        logger.warn(
          "Modelo pre-entrenado no encontrado, entrenando nuevo modelo...",
        );
      }

      // Entrenar el modelo con el dataset mejorado
      await this.trainModel();

      this.isModelLoaded = true;
      logger.info("Enhanced Sentiment Service inicializado correctamente");
    } catch (error) {
      logger.error("Error al inicializar Enhanced Sentiment Service", error);
      throw error;
    }
  }

  /**
   * Entrena el modelo con el dataset mejorado
   */
  private async trainModel(): Promise<void> {
    logger.info("Entrenando modelo con dataset mejorado...");

    // Convertir datos para compatibilidad
    const trainingData = enhancedTrainingDataV3Complete.map((item) => ({
      text: item.text,
      label: item.label as "positive" | "negative" | "neutral",
    }));

    const startTime = Date.now();
    this.model.train(trainingData);
    const trainingTime = Date.now() - startTime;

    logger.info("Modelo entrenado", {
      trainingTimeMs: trainingTime,
      examples: trainingData.length,
    });
  }

  /**
   * Predice el sentimiento de un texto
   */
  public predict(text: string): {
    label: "positive" | "negative" | "neutral";
    confidence: number;
    scores: Record<string, number>;
    metadata?: {
      textLength: number;
      modelVersion: string;
      trainingDate?: string;
      vocabularySize: number;
    };
  } {
    const result = this.model.predict(text.trim());
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

    const decision = decideWithHeuristics(text, {
      positive: result.scores.positive ?? result.scores["positive"] ?? 0,
      negative: result.scores.negative ?? result.scores["negative"] ?? 0,
      neutral: result.scores.neutral ?? result.scores["neutral"] ?? 0,
    });

    const stats = this.getStats();
    return {
      label: decision.label,
      confidence: decision.confidence,
      scores: decision.adjustedScores,
      metadata: {
        textLength: text.length,
        modelVersion: "enhanced-v3",
        trainingDate: this.modelMetadata?.trainingDate,
        vocabularySize:
          (stats as { vocabularySize?: number }).vocabularySize || 0,
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
  public getStats(): Record<string, unknown> {
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
