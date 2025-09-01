/**
 * Mocks para el sistema de análisis de sentimiento
 * Se utilizan para pruebas unitarias y de integración
 */

/* global jest */

// Mock para SentimentAnalysisEngine
jest.mock("../../src/lib/sentiment/engine", () => {
  class MockSentimentAnalysisEngine {
    isBertEnabled() {
      return false;
    }

    setBertEnabled() {
      return;
    }

    async initializeBert() {
      return Promise.resolve();
    }

    train() {
      return;
    }

    async analyze(request) {
      const text = request.text.toLowerCase();

      // Simulación simple de análisis
      const isPositive =
        text.includes("good") ||
        text.includes("great") ||
        text.includes("love") ||
        text.includes("wonderful") ||
        text.includes("amazing") ||
        text.includes("encanta");

      const isNegative =
        text.includes("bad") ||
        text.includes("terrible") ||
        text.includes("hate") ||
        text.includes("awful") ||
        text.includes("horrible");

      let sentiment;
      let score;
      let confidence;

      if (isPositive) {
        sentiment = "positive";
        score = 0.8;
        confidence = 0.9;
      } else if (isNegative) {
        sentiment = "negative";
        score = -0.8;
        confidence = 0.9;
      } else {
        sentiment = "neutral";
        score = 0;
        confidence = 0.7;
      }

      return {
        sentiment: {
          label: sentiment,
          score: score,
          magnitude: Math.abs(score),
          confidence: confidence,
          emotions: {
            joy: sentiment === "positive" ? 0.8 : 0,
            sadness: sentiment === "negative" ? 0.7 : 0,
            anger: sentiment === "negative" ? 0.6 : 0,
            fear: sentiment === "negative" ? 0.3 : 0,
            surprise: 0.1,
            disgust: sentiment === "negative" ? 0.5 : 0,
          },
        },
        keywords: text
          .split(" ")
          .filter((w) => w.length > 3)
          .slice(0, 3),
        language: request.language || "en",
        signals: {
          tokens: text.split(" "),
          emojis: {},
          negationFlips: 0,
        },
        version: "mock-2.0.0",
      };
    }
  }

  return {
    SentimentAnalysisEngine: MockSentimentAnalysisEngine,
  };
});

// No mockear el orquestador, usaremos el real con el motor mockeado
// Esto nos permite probar la lógica de orquestación sin el análisis real

// Opcionalmente, mockear las dependencias de los servicios de análisis
jest.mock("../../src/services/naive-bayes-sentiment.service", () => {
  class MockNaiveBayesSentiment {
    train() {
      return;
    }

    predictSentiment(text) {
      const isPositive =
        text.toLowerCase().includes("good") ||
        text.toLowerCase().includes("great");
      const isNegative =
        text.toLowerCase().includes("bad") ||
        text.toLowerCase().includes("terrible");

      if (isPositive) {
        return { label: "positive", confidence: 0.85 };
      } else if (isNegative) {
        return { label: "negative", confidence: 0.85 };
      } else {
        return { label: "neutral", confidence: 0.7 };
      }
    }
  }

  return {
    NaiveBayesSentimentService: MockNaiveBayesSentiment,
    SentimentLabel: {
      POSITIVE: "positive",
      NEGATIVE: "negative",
      NEUTRAL: "neutral",
      VERY_POSITIVE: "very_positive",
      VERY_NEGATIVE: "very_negative",
    },
  };
});

jest.mock("../../src/services/bert-sentiment-analyzer.service", () => {
  class MockBertSentimentAnalyzer {
    async initialize() {
      return Promise.resolve();
    }

    async analyze() {
      return {
        label: "positive",
        score: 0.75,
        confidence: 0.8,
      };
    }

    isInitialized() {
      return true;
    }
  }

  return {
    BertSentimentAnalyzerService: MockBertSentimentAnalyzer,
  };
});
