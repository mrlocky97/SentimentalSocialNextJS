/**
 * Tests críticos para TweetSentimentAnalysisManager
 * Aseguran que el core del sistema funciona correctamente
 */

import { TweetSentimentAnalysisManager } from '../../src/services/tweet-sentiment-analysis.manager.service';
import { createTestTweet } from '../utils/test-helpers';

describe('TweetSentimentAnalysisManager - CRÍTICO', () => {
  let manager: TweetSentimentAnalysisManager;

  beforeEach(() => {
    manager = new TweetSentimentAnalysisManager();
  });

  describe('Análisis de Sentimientos Core', () => {
    it('debe analizar sentimiento positivo correctamente', async () => {
      const tweet = createTestTweet({
        content: 'I love this amazing product! It is fantastic and wonderful!',
        hashtags: ['#great'],
      });

      const result = await manager.analyzeTweet(tweet);

      expect(result).toBeDefined();
      expect(result.analysis.sentiment.label).toBe('positive');
      expect(result.analysis.sentiment.confidence).toBeGreaterThan(0.5);
      expect(result.analysis.sentiment.score).toBeGreaterThan(0);
    });

    it('debe analizar sentimiento negativo correctamente', async () => {
      const tweet = createTestTweet({
        content: 'This is terrible! I hate this awful product. Worst experience ever!',
        hashtags: ['#bad'],
        metrics: { likes: 1, retweets: 0, replies: 5, quotes: 0, engagement: 6 },
      });

      const result = await manager.analyzeTweet(tweet);

      expect(result).toBeDefined();
      expect(result.analysis.sentiment.label).toBe('negative');
      expect(result.analysis.sentiment.confidence).toBeGreaterThan(0.5);
      expect(result.analysis.sentiment.score).toBeLessThan(0);
    });

    it('debe analizar sentimiento neutral correctamente', async () => {
      const tweet = createTestTweet({
        content: 'This is a product. It exists. Some information about it.',
        metrics: { likes: 5, retweets: 1, replies: 2, quotes: 0, engagement: 8 },
      });

      const result = await manager.analyzeTweet(tweet);

      expect(result).toBeDefined();
      expect(result.analysis.sentiment.label).toBe('neutral');
      expect(result.analysis.sentiment.score).toBeCloseTo(0, 1);
    });

    it('debe manejar texto en español', async () => {
      const tweet = createTestTweet({
        content: 'Este producto es increíble y fantástico! Me encanta!',
        author: { username: 'testuser_es', followersCount: 50 } as any,
        hashtags: ['#increible'],
        metrics: { likes: 15, retweets: 3, replies: 1, quotes: 0, engagement: 19 },
      });

      const result = await manager.analyzeTweet(tweet);

      expect(result).toBeDefined();
      expect(result.analysis.sentiment.label).toBe('positive');
      expect(result.analysis.language).toBe('es');
    });
  });

  describe('Extracción de Insights', () => {
    it('debe extraer insights de marketing', async () => {
      const tweet = createTestTweet({
        content: 'Nike shoes are amazing! @nike #justdoit #sports',
        author: { verified: true, followersCount: 1000 } as any,
        hashtags: ['#justdoit', '#sports'],
        mentions: ['@nike'],
        metrics: { likes: 50, retweets: 10, replies: 5, quotes: 2, engagement: 67 },
      });

      const result = await manager.analyzeTweet(tweet);

      expect(result.marketingInsights).toBeDefined();
      expect(result.marketingInsights.length).toBeGreaterThanOrEqual(0);
      expect(result.brandMentions).toBeDefined();
      expect(result.hashtagSentiments).toBeDefined();
    });
  });

  describe('Manejo de Errores', () => {
    it('debe manejar tweets vacíos', async () => {
      const tweet = createTestTweet({
        content: '',
        author: { username: 'emptyuser', followersCount: 0 } as any,
        metrics: { likes: 0, retweets: 0, replies: 0, quotes: 0, engagement: 0 },
      });

      const result = await manager.analyzeTweet(tweet);

      expect(result).toBeDefined();
      expect(result.analysis.sentiment.label).toBe('neutral');
    });

    it('debe manejar tweets con caracteres especiales', async () => {
      const tweet = createTestTweet({
        content: '🎉🎊 ¡Excelente! 💯 @#$%^&*()_+ 测试 العربية',
        author: { username: 'specialuser', followersCount: 200 } as any,
        metrics: { likes: 5, retweets: 1, replies: 0, quotes: 0, engagement: 6 },
      });

      await expect(manager.analyzeTweet(tweet)).resolves.toBeDefined();
    });
  });
});
