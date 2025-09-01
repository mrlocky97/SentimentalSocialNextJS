/**
 * Test de integración para el sistema de análisis de sentimiento consolidado
 */

import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";
import { SentimentAnalysisEngine } from "../../src/lib/sentiment/engine";
import { SentimentAnalysisOrchestrator } from "../../src/lib/sentiment/orchestrator";
import { TweetSentimentAnalysisManager } from "../../src/services/tweet-sentiment-analysis.manager.service";
import { Tweet } from "../../src/types/twitter";

// Datos de prueba
const TEST_TWEETS = [
  {
    id: "test_1",
    text: "I love this product! It's amazing and fantastic!",
    language: "en" as const,
  },
  {
    id: "test_2",
    text: "This is terrible. Worst experience ever.",
    language: "en" as const,
  },
  {
    id: "test_3",
    text: "The package arrived yesterday afternoon.",
    language: "en" as const,
  },
  {
    id: "test_4",
    text: "Me encanta este producto! Es increíble!",
    language: "es" as const,
  },
];

// Crear funciones de ayuda para crear tweets de prueba

// Mock del Tweet completo según la estructura de la aplicación
const createMockTweet = (overrides?: Partial<Tweet>): Tweet => {
  return {
    id: "default_id",
    tweetId: "default_id",
    content: "Default content",
    author: {
      id: "author_1",
      username: "testuser",
      displayName: "Test User",
      verified: false,
      followersCount: 100,
      followingCount: 100,
      tweetsCount: 500,
      avatar: "https://example.com/avatar.jpg",
    },
    metrics: {
      likes: 10,
      retweets: 5,
      replies: 2,
      quotes: 1,
      views: 100,
      engagement: 18,
    },
    hashtags: ["#test"],
    mentions: [],
    urls: [],
    mediaUrls: [],
    isRetweet: false,
    isReply: false,
    isQuote: false,
    language: "en",
    createdAt: new Date(),
    scrapedAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
};

describe("Sistema Consolidado de Análisis de Sentimiento - Tests de Integración", () => {
  let engine: SentimentAnalysisEngine;
  let orchestrator: SentimentAnalysisOrchestrator;
  let manager: TweetSentimentAnalysisManager;

  beforeAll(() => {
    // Crear instancias de los componentes
    engine = new SentimentAnalysisEngine();
    orchestrator = new SentimentAnalysisOrchestrator();
    manager = new TweetSentimentAnalysisManager();
  });

  afterAll(() => {
    // Limpiar recursos
    orchestrator.dispose();
    manager.dispose();
  });

  describe("Flujo completo de análisis", () => {
    it("debe fluir correctamente desde el manager hasta el engine", async () => {
      // Crear un tweet de prueba
      const tweet = createMockTweet({
        id: "test_flow",
        tweetId: "test_flow",
        content: "This product is absolutely amazing! I love it!",
        language: "en",
      });

      // Analizar con el manager (nivel más alto)
      const managerResult = await manager.analyzeTweet(tweet);

      // Verificar que el resultado tenga la estructura correcta
      expect(managerResult).toBeDefined();
      expect(managerResult.tweetId).toBe("test_flow");
      expect(managerResult.analysis).toBeDefined();
      expect(managerResult.analysis.sentiment).toBeDefined();
      expect(managerResult.analysis.sentiment.label).toBe("positive");
      expect(managerResult.analysis.sentiment.score).toBeGreaterThan(0);
      expect(managerResult.analysis.sentiment.confidence).toBeGreaterThan(0.5);
    });

    it("debe producir resultados consistentes en todos los niveles", async () => {
      const text = "This is a wonderful test case with positive sentiment";

      // Análisis directo con el engine (nivel más bajo)
      const engineResult = await engine.analyze({
        text,
        language: "en",
      });

      // Análisis con el orchestrator (nivel medio)
      const orchestratorResult = await orchestrator.analyzeText({
        text,
        language: "en",
      });

      // Análisis con el manager (nivel más alto)
      const mockTweet = createMockTweet({
        content: text,
        tweetId: "test_consistency",
        language: "en",
      });
      const managerResult = await manager.analyzeTweet(mockTweet);

      // Verificar consistencia entre los resultados
      expect(engineResult.sentiment.label).toBe(
        orchestratorResult.sentiment.label,
      );
      expect(orchestratorResult.sentiment.label).toBe(
        managerResult.analysis.sentiment.label,
      );

      // Las puntuaciones deben ser consistentes (pueden no ser idénticas por normalización)
      const enginePositive = engineResult.sentiment.score > 0;
      const orchestratorPositive = orchestratorResult.sentiment.score > 0;
      const managerPositive = managerResult.analysis.sentiment.score > 0;

      expect(enginePositive).toBe(true);
      expect(orchestratorPositive).toBe(true);
      expect(managerPositive).toBe(true);
    });
  });

  describe("Análisis por lotes", () => {
    it("debe manejar correctamente análisis por lotes", async () => {
      // Crear tweets de prueba
      const tweets = TEST_TWEETS.map((data) =>
        createMockTweet({
          id: data.id,
          tweetId: data.id,
          content: data.text,
          language: data.language,
        }),
      );

      // Analizar con el manager
      const results = await manager.analyzeTweetsBatch(tweets);

      // Verificar resultados
      expect(results).toHaveLength(TEST_TWEETS.length);

      // Verificar consistencia con análisis individuales
      for (let i = 0; i < TEST_TWEETS.length; i++) {
        const batchResult = results[i];
        const individualResult = await manager.analyzeTweet(tweets[i]);

        expect(batchResult.tweetId).toBe(individualResult.tweetId);
        expect(batchResult.analysis.sentiment.label).toBe(
          individualResult.analysis.sentiment.label,
        );
      }
    });
  });

  describe("Detección multilingüe", () => {
    it("debe detectar y analizar correctamente diferentes idiomas", async () => {
      const spanishTweet = createMockTweet({
        id: "test_spanish",
        tweetId: "test_spanish",
        content: "Me encanta este producto! Es maravilloso!",
        language: "es",
      });

      const englishTweet = createMockTweet({
        id: "test_english",
        tweetId: "test_english",
        content: "I love this product! It's wonderful!",
        language: "en",
      });

      const spanishResult = await manager.analyzeTweet(spanishTweet);
      const englishResult = await manager.analyzeTweet(englishTweet);

      // Ambos deberían ser positivos, a pesar del idioma diferente
      expect(spanishResult.analysis.sentiment.label).toBe("positive");
      expect(englishResult.analysis.sentiment.label).toBe("positive");

      // Verificar que el idioma se detecta correctamente
      expect(spanishResult.analysis.language).toBe("es");
      expect(englishResult.analysis.language).toBe("en");
    });
  });

  describe("Rendimiento y caché", () => {
    it("debe utilizar caché correctamente", async () => {
      const tweet = createMockTweet({
        id: "test_cache",
        tweetId: "test_cache",
        content: "This is a cacheable content for performance testing",
      });

      // Guardar métricas actuales
      const initialMetrics = manager.getOrchestrator().getMetrics();
      const initialCacheHits = initialMetrics.cacheHits || 0;

      // Primera ejecución (sin caché)
      await manager.analyzeTweet(tweet);

      // Segunda ejecución (debería usar caché)
      await manager.analyzeTweet(tweet);

      // Verificar métricas de caché
      const finalMetrics = manager.getOrchestrator().getMetrics();
      expect(finalMetrics.cacheHits).toBeGreaterThan(initialCacheHits);
    });
  });
});
