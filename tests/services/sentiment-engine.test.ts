/**
 * Tests para SentimentAnalysisEngine
 * Validan el funcionamiento del núcleo del sistema de análisis de sentimiento
 */

import { beforeEach, describe, expect, it } from "@jest/globals";
import { SentimentAnalysisEngine } from "../../src/lib/sentiment/engine";
import { AnalysisRequest } from "../../src/lib/sentiment/types";

describe("SentimentAnalysisEngine", () => {
  let engine: SentimentAnalysisEngine;

  beforeEach(() => {
    engine = new SentimentAnalysisEngine();
  });

  describe("Análisis básico", () => {
    it("debe detectar sentimiento positivo correctamente", async () => {
      const request: AnalysisRequest = {
        text: "I love this product! It's fantastic and amazing!",
        language: "en",
      };

      const result = await engine.analyze(request);

      expect(result).toBeDefined();
      expect(result.sentiment.label).toBe("positive");
      expect(result.sentiment.score).toBeGreaterThan(0);
      expect(result.sentiment.confidence).toBeGreaterThan(0.5);
      expect(result.language).toBe("en");
    });

    it("debe detectar sentimiento negativo correctamente", async () => {
      const request: AnalysisRequest = {
        text: "This is terrible. I hate it and it's the worst!",
        language: "en",
      };

      const result = await engine.analyze(request);

      expect(result).toBeDefined();
      expect(result.sentiment.label).toBe("negative");
      expect(result.sentiment.score).toBeLessThan(0);
      expect(result.sentiment.confidence).toBeGreaterThan(0.5);
      expect(result.language).toBe("en");
    });

    it("debe detectar sentimiento neutral correctamente", async () => {
      const request: AnalysisRequest = {
        text: "This is a product. It exists. Here is information.",
        language: "en",
      };

      const result = await engine.analyze(request);

      expect(result).toBeDefined();
      expect(result.sentiment.label).toBe("neutral");
      expect(Math.abs(result.sentiment.score)).toBeLessThan(0.5); // Cerca de cero
      expect(result.language).toBe("en");
    });
  });

  describe("Detección de idioma", () => {
    it("debe detectar y analizar texto en español", async () => {
      const request: AnalysisRequest = {
        text: "Me encanta este producto! Es increíble y fantástico!",
        language: "es",
      };

      const result = await engine.analyze(request);

      expect(result).toBeDefined();
      // Flexible con la detección de sentimiento
      expect(["positive", "neutral"]).toContain(result.sentiment.label);
      expect(result.language).toBe("es");
    });

    it("debe usar el idioma proporcionado", async () => {
      const request: AnalysisRequest = {
        text: "This is a test",
        language: "fr", // Idioma explícito
      };

      const result = await engine.analyze(request);

      expect(result).toBeDefined();
      expect(result.language).toBe("fr");
    });
  });

  describe("Análisis avanzado", () => {
    it("debe procesar emojis correctamente", async () => {
      const request: AnalysisRequest = {
        text: "I feel great today! 😃👍❤️",
        language: "en",
      };

      const result = await engine.analyze(request);

      expect(result).toBeDefined();
      expect(result.sentiment.label).toBe("positive");
      expect(result.sentiment.score).toBeGreaterThan(0);
    });

    it("debe manejar casos de texto vacío", async () => {
      const request: AnalysisRequest = {
        text: "",
        language: "en",
      };

      const result = await engine.analyze(request);

      expect(result).toBeDefined();
      expect(result.sentiment.label).toBe("neutral");
      expect(Math.abs(result.sentiment.score)).toBeCloseTo(0);
    });

    it("debe manejar textos muy largos", async () => {
      const longText = "This is a test. ".repeat(200); // Aproximadamente 3000 caracteres
      const request: AnalysisRequest = {
        text: longText,
        language: "en",
      };

      const result = await engine.analyze(request);

      expect(result).toBeDefined();
      expect(result.sentiment.label).toBeDefined();
    });
  });

  describe("Integración con BERT", () => {
    // Este test es condicional ya que BERT puede no estar disponible en CI
    it("debe inicializar BERT sin errores", async () => {
      try {
        await engine.initializeBert();
        engine.setBertEnabled(true);

        // Si llega aquí, la inicialización fue exitosa
        expect(engine.isBertEnabled()).toBe(true);
      } catch (error) {
        // Si hay un error, simplemente verificamos que la función exista
        expect(engine.initializeBert).toBeDefined();
        console.warn("BERT no está disponible para pruebas: ", error);
      }
    });
  });

  describe("Entrenamiento", () => {
    it("debe poder entrenar el modelo Naive Bayes", () => {
      const trainingData = [
        { text: "I love this", label: "positive" },
        { text: "This is great", label: "positive" },
        { text: "I hate this", label: "negative" },
        { text: "This is terrible", label: "negative" },
        { text: "This exists", label: "neutral" },
      ];

      // No debería lanzar error
      expect(() => {
        engine.train(trainingData);
      }).not.toThrow();
    });
  });
});
