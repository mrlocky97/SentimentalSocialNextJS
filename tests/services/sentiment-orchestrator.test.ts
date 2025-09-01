/**
 * Tests para SentimentAnalysisOrchestrator
 * Validan el funcionamiento del orquestador del sistema de análisis de sentimiento
 */

import { describe, expect, it, beforeEach, afterEach } from "@jest/globals";
import { SentimentAnalysisOrchestrator } from "../../src/lib/sentiment/orchestrator";
import { AnalysisRequest } from "../../src/lib/sentiment/types";

describe("SentimentAnalysisOrchestrator", () => {
  let orchestrator: SentimentAnalysisOrchestrator;

  beforeEach(() => {
    orchestrator = new SentimentAnalysisOrchestrator();
  });

  afterEach(() => {
    // Limpiar recursos
    orchestrator.dispose();
  });

  describe("Análisis básico", () => {
    it("debe analizar texto correctamente", async () => {
      const request: AnalysisRequest = {
        text: "This is a great product!",
        language: "en",
      };

      const result = await orchestrator.analyzeText(request);

      expect(result).toBeDefined();
      expect(result.sentiment).toBeDefined();
      expect(result.sentiment.label).toBeDefined();
      expect(result.sentiment.score).toBeDefined();
      expect(result.sentiment.confidence).toBeDefined();
      expect(result.language).toBe("en");
    });

    it("debe aceptar texto simple como entrada", async () => {
      const result = await orchestrator.analyzeText({
        text: "This is a simple test.",
        language: "en",
      });

      expect(result).toBeDefined();
      expect(result.sentiment).toBeDefined();
      expect(result.sentiment.label).toBeDefined();
      expect(result.language).toBeDefined();
    });
  });

  describe("Análisis de Tweet", () => {
    it("debe analizar un tweet correctamente", async () => {
      const tweetDTO = {
        id: "123456",
        text: "I absolutely love this product! #amazing",
        language: "en" as const,
      };

      const result = await orchestrator.analyzeTweet(tweetDTO);

      expect(result).toBeDefined();
      expect(result.tweetId).toBe("123456");
      expect(result.sentiment).toBeDefined();
      expect(result.sentiment.label).toBeDefined();
      expect(result.language).toBe("en");
    });

    it("debe analizar un lote de tweets", async () => {
      const tweets = [
        {
          id: "123",
          text: "Great product!",
          language: "en" as const,
        },
        {
          id: "456",
          text: "Terrible service!",
          language: "en" as const,
        },
      ];

      const results = await orchestrator.analyzeBatch(tweets);

      expect(results).toHaveLength(2);
      expect(results[0].sentiment).toBeDefined();
      expect(results[1].sentiment).toBeDefined();
    });
  });

  describe("Sistema de caché", () => {
    it("debe usar caché para solicitudes idénticas", async () => {
      const textRequest = {
        text: "This is a cacheable request",
        language: "en",
      };

      // Primera llamada - sin caché
      const result1 = await orchestrator.analyzeText(textRequest);

      // Segunda llamada - debería usar caché
      const result2 = await orchestrator.analyzeText(textRequest);

      // Verificar que ambos resultados sean iguales
      expect(result1.sentiment.label).toBe(result2.sentiment.label);
      expect(result1.sentiment.score).toBe(result2.sentiment.score);

      // Verificar las métricas de caché
      const metrics = orchestrator.getMetrics();
      expect(metrics.cacheHits).toBeGreaterThan(0);
    });
  });

  describe("Métricas", () => {
    it("debe registrar métricas correctamente", async () => {
      // Realizar algunas llamadas
      await orchestrator.analyzeText({
        text: "Text for metrics test 1",
        language: "en" as const,
      });
      await orchestrator.analyzeText({
        text: "Text for metrics test 2",
        language: "en" as const,
      });

      // Repetir una llamada para generar un hit en caché
      await orchestrator.analyzeText({
        text: "Text for metrics test 1",
        language: "en" as const,
      });

      const metrics = orchestrator.getMetrics();

      expect(metrics.totalRequests).toBeGreaterThanOrEqual(3);
      expect(metrics.cacheHits).toBeGreaterThanOrEqual(1);
      expect(metrics.cacheMisses).toBeGreaterThanOrEqual(2);
      expect(metrics.cacheSize).toBeGreaterThanOrEqual(2);
    });

    it("debe permitir reiniciar métricas", () => {
      orchestrator.resetMetrics();
      const metrics = orchestrator.getMetrics();

      expect(metrics.totalRequests).toBe(0);
      expect(metrics.cacheHits).toBe(0);
      expect(metrics.cacheMisses).toBe(0);
    });
  });

  describe("Análisis multilingüe", () => {
    it("debe analizar texto en español", async () => {
      const result = await orchestrator.analyzeText({
        text: "Me encanta este producto!",
        language: "es",
      });

      expect(result).toBeDefined();
      expect(["es", "unknown"]).toContain(result.language); // Flexible con la detección
      expect(result.sentiment.label).toBeDefined();
    });
  });

  describe("Integración con APIs", () => {
    it("debe convertir a formato API con analyzeTextWithResponse", async () => {
      const response = await orchestrator.analyzeTextWithResponse(
        "This is great!",
        {
          language: "en" as const,
          allowSarcasmDetection: true,
        },
      );

      expect(response).toBeDefined();
      expect(response.data).toBeDefined();
      expect(response.data.sentiment).toBeDefined();
      expect(response.success).toBe(true);
    });
  });
});
