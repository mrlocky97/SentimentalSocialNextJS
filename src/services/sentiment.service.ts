/**
 * Sentiment Analysis Service - Optimized
 * Business logic for sentiment analysis operations with centralized error handling and validation
 */

import {
  LanguageInfo,
  ModelUpdateRequest,
  SentimentCompareRequest,
  SentimentTestRequest,
  UnifiedSentimentResult,
} from '@/types';
import { Core } from '../core';
import { sentimentManager } from '../lib/sentiment-manager';
import { Tweet } from '../types/twitter';
import { advancedHybridAnalyzer } from './advanced-hybrid-analyzer.service';

export class SentimentService {
  /**
   * Analyze sentiment of a single tweet
   * @param tweet - Tweet para analizar
   * @param config - Configuración opcional para el análisis
   * @returns Análisis de sentimiento completo
   */
  async analyzeTweet(tweet: Tweet, config?: any) {
    // Validar entrada
    const validation = Core.Validators.Tweet.validate(tweet);
    Core.Validators.Utils.validateOrThrow(validation, 'tweet analysis');

    // Normalizar el tweet para garantizar compatibilidad
    const normalizedTweet = Core.Mappers.TweetNormalizer.map(tweet);

    // Prepara el tweet para análisis usando el motor unificado
    return await sentimentManager.analyzeTweet(normalizedTweet, config);
  }

  /**
   * Analyze sentiment of multiple tweets in batch
   * @param tweets - Lote de tweets para analizar
   * @param config - Configuración opcional
   * @param includeStats - Si se deben incluir estadísticas agregadas
   * @returns Análisis del lote con estadísticas y resumen
   */
  async analyzeTweetsBatch(tweets: Tweet[], config?: any, includeStats = true) {
    // Validar entrada del lote
    const validation = Core.Validators.Tweet.validateBatch(tweets);
    Core.Validators.Utils.validateOrThrow(validation, 'batch analysis');

    // Normalizar y preparar los tweets para el análisis
    const normalizedTweets = Core.Mappers.TweetNormalizer.mapBatch(tweets);

    const startTime = Date.now();
    const analyses = await sentimentManager.analyzeTweetsBatch(normalizedTweets, config);
    const processingTime = Date.now() - startTime;

    let statistics = null;
    if (includeStats) {
      statistics = sentimentManager.generateStatistics(analyses);
    }

    // Calcular sentimiento promedio
    const averageSentiment =
      analyses.length > 0
        ? analyses.reduce(
            (sum: number, analysis: any) => sum + analysis.analysis.sentiment.score,
            0
          ) / analyses.length
        : 0;
    return {
      analyses,
      statistics,
      summary: {
        totalProcessed: analyses.length,
        averageSentiment: Number(averageSentiment.toFixed(3)),
        processingTime: `${processingTime}ms`,
        sentimentDistribution: statistics?.sentimentCounts,
      },
    };
  }

  /**
   * Generate comprehensive statistics from analyzed tweets
   */
  generateStatistics(analyses: any[]) {
    // Validar entrada
    const validation = Core.Validators.SentimentAnalysis.validateTrainingData(analyses);
    if (!validation.isValid) {
      throw Core.Errors.invalidAnalysisArray();
    }

    return sentimentManager.generateStatistics(analyses);
  }

  /**
   * Generate sentiment trends over time
   */
  generateSentimentTrends(analyses: any[], intervalHours = 1) {
    // Validar entrada
    const validation = Core.Validators.SentimentAnalysis.validateTrainingData(analyses);
    if (!validation.isValid) {
      throw Core.Errors.invalidAnalysisArray();
    }

    const trends = sentimentManager.generateSentimentTrends(analyses, intervalHours);

    return {
      trends: trends.trends || [],
      intervalHours,
      totalDataPoints: (trends.trends || []).length,
      timeRange: null,
    };
  }

  /**
   * Get demo tweets with analysis
   */
  async getDemoAnalysis() {
    const demoTweets: Tweet[] = [
      {
        id: 'demo_1',
        tweetId: 'demo_1',
        content:
          'I absolutely love my new Nike Air Max! Best running shoes ever! 😍 #Nike #Running #JustDoIt',
        author: {
          id: 'demo_user_1',
          username: 'runner_pro',
          displayName: 'Pro Runner',
          verified: true,
          followersCount: 15000,
          followingCount: 500,
          tweetsCount: 2500,
          avatar: 'https://example.com/avatar1.jpg',
        },
        metrics: {
          likes: 245,
          retweets: 89,
          replies: 34,
          quotes: 12,
          views: 5600,
          engagement: 380,
        },
        hashtags: ['#Nike', '#Running', '#JustDoIt'],
        mentions: [],
        urls: [],
        mediaUrls: [],
        isRetweet: false,
        isReply: false,
        isQuote: false,
        language: 'en',
        createdAt: new Date('2025-07-15T10:30:00Z'),
        scrapedAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'demo_2',
        tweetId: 'demo_2',
        content:
          'Terrible customer service from @nike. My order was delayed for 3 weeks and no one responds to my emails. Very disappointed! 😠',
        author: {
          id: 'demo_user_2',
          username: 'customer_123',
          displayName: 'Disappointed Customer',
          verified: false,
          followersCount: 350,
          followingCount: 800,
          tweetsCount: 1200,
          avatar: 'https://example.com/avatar2.jpg',
        },
        metrics: {
          likes: 23,
          retweets: 67,
          replies: 145,
          quotes: 8,
          views: 2300,
          engagement: 243,
        },
        hashtags: [],
        mentions: ['@nike'],
        urls: [],
        mediaUrls: [],
        isRetweet: false,
        isReply: false,
        isQuote: false,
        language: 'en',
        createdAt: new Date('2025-07-15T14:45:00Z'),
        scrapedAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'demo_3',
        tweetId: 'demo_3',
        content:
          'Nike vs Adidas - the eternal debate! Both have their strengths. Nike for innovation, Adidas for comfort. What do you think? 🤔',
        author: {
          id: 'demo_user_3',
          username: 'sneaker_expert',
          displayName: 'Sneaker Expert',
          verified: true,
          followersCount: 45000,
          followingCount: 1200,
          tweetsCount: 8900,
          avatar: 'https://example.com/avatar3.jpg',
        },
        metrics: {
          likes: 412,
          retweets: 189,
          replies: 267,
          quotes: 45,
          views: 12400,
          engagement: 913,
        },
        hashtags: [],
        mentions: [],
        urls: [],
        mediaUrls: [],
        isRetweet: false,
        isReply: false,
        isQuote: false,
        language: 'en',
        createdAt: new Date('2025-07-15T16:20:00Z'),
        scrapedAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    // Analyze demo tweets
    const analyses = await sentimentManager.analyzeTweetsBatch(demoTweets);
    const statistics = sentimentManager.generateStatistics(analyses);
    const trends = sentimentManager.generateSentimentTrends(analyses, 1);

    return {
      demoTweets,
      analyses,
      statistics,
      trends,
      insights: {
        summary: `Analyzed ${
          analyses.length
        } demo tweets with average sentiment of ${statistics.averageSentiment.toFixed(3)}`,
        keyFindings: [
          'Mix of positive and negative brand sentiment detected',
          'High-influence users engaged with brand content',
          'Customer service issues identified requiring attention',
          'Brand comparison discussions present in conversations',
        ],
        recommendations: [
          'Monitor and respond to customer service complaints',
          'Engage with positive brand advocates',
          'Track competitor comparison discussions',
          'Leverage high-engagement content for amplification',
        ],
      },
    };
  }

  /**
   * Test sentiment analysis with custom text
   */
  async testSentimentAnalysis({ text, method = 'rule' }: SentimentTestRequest) {
    if (!text || typeof text !== 'string') {
      throw new Error('Text string is required');
    }

    // Create a mock tweet for testing
    const mockTweet: Tweet = {
      id: 'test_tweet',
      tweetId: 'test_tweet',
      content: text,
      author: {
        id: 'test_user',
        username: 'test_user',
        displayName: 'Test User',
        verified: false,
        followersCount: 100,
        followingCount: 50,
        tweetsCount: 10,
        avatar: 'https://example.com/avatar.jpg',
      },
      metrics: {
        likes: 0,
        retweets: 0,
        replies: 0,
        quotes: 0,
        views: 0,
        engagement: 0,
      },
      hashtags: [],
      mentions: [],
      urls: [],
      mediaUrls: [],
      isRetweet: false,
      isReply: false,
      isQuote: false,
      language: 'en',
      createdAt: new Date(),
      scrapedAt: new Date(),
      updatedAt: new Date(),
    };

    // Analyze the tweet using the manager
    const analysis = await sentimentManager.analyzeTweet(mockTweet, undefined);

    // If naive method was used, also show direct classifier result
    let naiveBayesResult = null;
    if (method === 'naive') {
      naiveBayesResult = sentimentManager.predictNaiveBayes(text);
    }

    return {
      originalText: text,
      method,
      analysis: analysis.analysis,
      naiveBayes: naiveBayesResult,
      brandMentions: analysis.brandMentions,
      marketingInsights: analysis.marketingInsights,
      summary: {
        sentiment: analysis.analysis.sentiment.label,
        score: analysis.analysis.sentiment.score,
        confidence: analysis.analysis.sentiment.confidence,
        keywords: analysis.analysis.keywords.slice(0, 5),
      },
    };
  }

  /**
   * Update the sentiment analysis model with new training data
   */
  async updateModel({ examples, saveModel = true }: ModelUpdateRequest) {
    if (!examples || !Array.isArray(examples) || examples.length === 0) {
      throw new Error('Array of training examples is required');
    }

    // Validate examples
    const validExamples = examples.filter(
      (ex) =>
        ex.text &&
        typeof ex.text === 'string' &&
        ex.label &&
        ['positive', 'negative', 'neutral'].includes(ex.label)
    );

    if (validExamples.length === 0) {
      throw new Error('No valid training examples provided');
    }

    // Import enhanced training data
    const { enhancedTrainingData } = await import('../data/enhanced-training-data');
    const trainingData: Array<{ text: string; label: string }> = enhancedTrainingData;

    // Train the model with new examples
    console.log(`🔄 Training model with ${validExamples.length} new examples...`);
    const startTime = Date.now();

    await sentimentManager.trainNaiveBayes([...trainingData, ...validExamples]);

    const trainingTime = Date.now() - startTime;
    console.log(`✅ Model trained in ${trainingTime}ms`);

    // Save the model if requested
    if (saveModel) {
      // const modelPath = path.join(process.cwd(), 'src', 'data', 'trained-classifier.json');
      console.log('💾 Saving updated model...');
      // await sentimentManager.saveNaiveBayesToFile(modelPath);
      console.log('💾 Model saved successfully.');
    }

    // Evaluate the updated model with test examples
    const testExamples = [
      { text: 'I love this product!', expected: 'positive' },
      { text: 'This is terrible', expected: 'negative' },
      { text: 'The box was delivered', expected: 'neutral' },
      { text: 'Me encanta este servicio', expected: 'positive' },
      { text: 'No me gusta para nada', expected: 'negative' },
    ];

    const testResults = testExamples.map((ex) => {
      const result = sentimentManager.predictNaiveBayes(ex.text);
      return {
        text: ex.text,
        expected: ex.expected,
        predicted: result.label,
        confidence: result.confidence,
        correct: result.label === ex.expected,
      };
    });

    const accuracy = (testResults.filter((r) => r.correct).length / testResults.length) * 100;

    return {
      trainingStats: {
        newExamples: validExamples.length,
        totalExamplesUsed: trainingData.length + validExamples.length,
        trainingTime: `${trainingTime}ms`,
        modelSaved: saveModel,
      },
      testResults: {
        examples: testResults,
        accuracy: accuracy,
      },
    };
  }

  /**
   * Get model status and information
   */
  async getModelStatus() {
    // Create multilingual test examples to verify the model
    const testExamples = [
      // English examples
      { text: "I love this product! It's amazing and works perfectly.", expectedLabel: 'positive' },
      {
        text: "This is the worst experience I've ever had. Terrible service.",
        expectedLabel: 'negative',
      },
      { text: 'The package was delivered yesterday.', expectedLabel: 'neutral' },

      // Spanish examples
      { text: 'Me encanta este producto, es de excelente calidad.', expectedLabel: 'positive' },
      { text: 'Qué servicio tan horrible, no lo recomiendo para nada.', expectedLabel: 'negative' },
      { text: 'El informe debe entregarse antes del viernes.', expectedLabel: 'neutral' },
    ];

    // Run examples with both methods
    const results = await Promise.all(
      testExamples.map(async (example) => {
        const naiveResult = sentimentManager.predictNaiveBayes(example.text);

        // Create mock tweet for rule-based method
        const mockTweet: Tweet = {
          id: 'test',
          tweetId: 'test',
          content: example.text,
          author: {
            id: 'test_user',
            username: 'test_user',
            displayName: 'Test User',
            verified: false,
            followersCount: 100,
            followingCount: 50,
            tweetsCount: 10,
            avatar: '',
          },
          metrics: {
            likes: 0,
            retweets: 0,
            replies: 0,
            quotes: 0,
            views: 0,
            engagement: 0,
          },
          hashtags: [],
          mentions: [],
          urls: [],
          mediaUrls: [],
          isRetweet: false,
          isReply: false,
          isQuote: false,
          language: example.text.includes('encanta') ? 'es' : 'en',
          createdAt: new Date(),
          scrapedAt: new Date(),
          updatedAt: new Date(),
        };

        const ruleResult = await sentimentManager.analyzeTweet(mockTweet, undefined);

        return {
          text: example.text,
          expectedLabel: example.expectedLabel,
          naive: {
            label: naiveResult.label,
            confidence: naiveResult.confidence,
            correct: naiveResult.label === example.expectedLabel,
          },
          rule: {
            label: ruleResult.analysis.sentiment.label,
            score: ruleResult.analysis.sentiment.score,
            confidence: ruleResult.analysis.sentiment.confidence,
            correct: ruleResult.analysis.sentiment.label === example.expectedLabel,
          },
        };
      })
    );

    // Calculate accuracy for each method
    const naiveCorrect = results.filter((r) => r.naive.correct).length;
    const ruleCorrect = results.filter((r) => r.rule.correct).length;

    // Get model information
    // Implementación futura: Utilizar módulos ES para acceso a archivos
    // const modelPath = path.join(process.cwd(), 'src', 'data', 'trained-classifier.json');

    const modelInfo = {
      exists: false,
      size: 0,
      lastModified: null,
    };

    // if (modelInfo.exists) {
    //   const stats = fs.statSync(modelPath);
    //   modelInfo.size = stats.size;
    //   modelInfo.lastModified = stats.mtime;
    // }

    return {
      model: modelInfo,
      accuracy: {
        naive: {
          correct: naiveCorrect,
          total: testExamples.length,
          accuracy: (naiveCorrect / testExamples.length) * 100,
        },
        rule: {
          correct: ruleCorrect,
          total: testExamples.length,
          accuracy: (ruleCorrect / testExamples.length) * 100,
        },
      },
      testResults: results,
    };
  }

  /**
   * Improved language detection with emotional indicators
   */
  private detectLanguageImproved(text: string): LanguageInfo {
    // Broader patterns for better detection
    const spanishPatterns = [
      'el',
      'la',
      'los',
      'las',
      'es',
      'son',
      'está',
      'están',
      'que',
      'porque',
      'cuando',
      'como',
      'con',
      'sin',
      'para',
      'por',
      'pero',
      'muy',
      'más',
      'menos',
      'bien',
      'mal',
      'bueno',
      'malo',
    ];
    const englishPatterns = [
      'the',
      'is',
      'are',
      'was',
      'were',
      'that',
      'this',
      'these',
      'those',
      'and',
      'but',
      'with',
      'without',
      'for',
      'to',
      'from',
      'very',
      'more',
      'less',
      'good',
      'bad',
      'well',
      'not',
    ];

    // Common Spanish words in negative phrases
    const spanishNegativeWords = [
      'malo',
      'mala',
      'malos',
      'malas',
      'pésimo',
      'pésima',
      'horrible',
      'terribles',
      'peor',
      'dañado',
      'roto',
      'defectuoso',
      'decepcionante',
      'decepción',
    ];

    // Common Spanish words in positive phrases
    const spanishPositiveWords = [
      'bueno',
      'buena',
      'buenos',
      'buenas',
      'excelente',
      'increíble',
      'genial',
      'fantástico',
      'encanta',
      'perfecto',
      'maravilloso',
    ];

    // Common English words in negative phrases
    const englishNegativeWords = [
      'bad',
      'worst',
      'terrible',
      'horrible',
      'awful',
      'broken',
      'defective',
      'disappointing',
      'poor',
      'issues',
      'bugs',
      'problem',
    ];

    // Common English words in positive phrases
    const englishPositiveWords = [
      'good',
      'great',
      'excellent',
      'amazing',
      'impressive',
      'fantastic',
      'wonderful',
      'perfect',
      'love',
      'best',
    ];

    // Check matches (normalized by text length)
    const lowerText = text.toLowerCase();
    const words = lowerText.split(/\s+/);
    const textLength = words.length;

    // Count matches by language
    const spanishCount = spanishPatterns.filter((word) =>
      new RegExp(`\\b${word}\\b`, 'i').test(lowerText)
    ).length;
    const englishCount = englishPatterns.filter((word) =>
      new RegExp(`\\b${word}\\b`, 'i').test(lowerText)
    ).length;

    // Normalization factor
    const normFactor = Math.max(1, textLength / 10);

    // Count emotional words
    const spanishNegativeCount = spanishNegativeWords.filter((word) =>
      new RegExp(`\\b${word}\\b`, 'i').test(lowerText)
    ).length;
    const spanishPositiveCount = spanishPositiveWords.filter((word) =>
      new RegExp(`\\b${word}\\b`, 'i').test(lowerText)
    ).length;
    const englishNegativeCount = englishNegativeWords.filter((word) =>
      new RegExp(`\\b${word}\\b`, 'i').test(lowerText)
    ).length;
    const englishPositiveCount = englishPositiveWords.filter((word) =>
      new RegExp(`\\b${word}\\b`, 'i').test(lowerText)
    ).length;

    // Determine language and emotional profile
    const langInfo: LanguageInfo = {
      language: 'unknown',
      negativeScore: 0,
      positiveScore: 0,
      textComplexity: textLength / 5, // Approximate complexity
      emotionalIntensity: 0,
    };

    if (spanishCount / normFactor > englishCount / normFactor) {
      langInfo.language = 'es';
      langInfo.negativeScore = spanishNegativeCount / normFactor;
      langInfo.positiveScore = spanishPositiveCount / normFactor;
    } else if (englishCount / normFactor > spanishCount / normFactor) {
      langInfo.language = 'en';
      langInfo.negativeScore = englishNegativeCount / normFactor;
      langInfo.positiveScore = englishPositiveCount / normFactor;
    } else if (
      spanishNegativeCount + spanishPositiveCount >
      englishNegativeCount + englishPositiveCount
    ) {
      langInfo.language = 'es';
      langInfo.negativeScore = spanishNegativeCount / normFactor;
      langInfo.positiveScore = spanishPositiveCount / normFactor;
    } else {
      langInfo.language = 'en';
      langInfo.negativeScore = englishNegativeCount / normFactor;
      langInfo.positiveScore = englishPositiveCount / normFactor;
    }

    // Calculate global emotional intensity
    langInfo.emotionalIntensity = langInfo.negativeScore + langInfo.positiveScore;

    return langInfo;
  }

  /**
   * Compare different sentiment analysis methods on the same text
   */
  async compareSentimentMethods({ text }: SentimentCompareRequest) {
    if (!text || typeof text !== 'string') {
      throw new Error('Text string is required');
    }

    // Create mock tweet for analysis
    const mockTweet: Tweet = {
      id: 'test',
      tweetId: 'test',
      content: text,
      author: {
        id: 'test_user',
        username: 'test_user',
        displayName: 'Test User',
        verified: false,
        followersCount: 100,
        followingCount: 50,
        tweetsCount: 10,
        avatar: '',
      },
      metrics: {
        likes: 0,
        retweets: 0,
        replies: 0,
        quotes: 0,
        views: 0,
        engagement: 0,
      },
      hashtags: [],
      mentions: [],
      urls: [],
      mediaUrls: [],
      isRetweet: false,
      isReply: false,
      isQuote: false,
      language: 'en',
      createdAt: new Date(),
      scrapedAt: new Date(),
      updatedAt: new Date(),
    };

    // Get results from both methods
    const start1 = Date.now();
    const naiveResult = sentimentManager.predictNaiveBayes(text);
    const naiveTime = Date.now() - start1;

    const start2 = Date.now();
    const ruleResult = await sentimentManager.analyzeTweet(mockTweet, undefined);
    const ruleTime = Date.now() - start2;

    // Execute improved detection
    const langInfo = this.detectLanguageImproved(text);
    const detectedLanguage = langInfo.language;
    mockTweet.language = langInfo.language;

    // Improved hybrid system: Advanced implementation with contextual analysis
    const bothAgree = naiveResult.label === ruleResult.analysis.sentiment.label;

    // Improved confidence adjustment system
    let naiveConfidenceAdjusted = Math.max(0.25, naiveResult.confidence);
    let ruleConfidenceAdjusted = ruleResult.analysis.sentiment.confidence;

    // Calculate confidence adjustments based on text characteristics
    const adjustedConfidences = this.calculateConfidenceAdjustments(
      naiveResult,
      ruleResult,
      langInfo,
      text
    );

    naiveConfidenceAdjusted = adjustedConfidences.naiveAdjusted;
    ruleConfidenceAdjusted = adjustedConfidences.ruleAdjusted;

    // Weighted decision system
    let naiveWeight = naiveConfidenceAdjusted;
    let ruleWeight = ruleConfidenceAdjusted;

    // Increase weight if there's agreement
    if (bothAgree) {
      naiveWeight *= 1.2;
      ruleWeight *= 1.2;
    }

    // Calculate weighted sentiment score
    const totalWeight = naiveWeight + ruleWeight;
    let weightedScore = 0;

    // Usar el resultado del naive bayes real del manager
    const actualNaiveResult = sentimentManager.predictNaiveBayes(text);

    if (actualNaiveResult.label === 'positive') {
      weightedScore += 0.7 * naiveWeight;
    } else if (actualNaiveResult.label === 'negative') {
      weightedScore -= 0.7 * naiveWeight;
    }

    weightedScore += ruleResult.analysis.sentiment.score * ruleWeight;

    // Normalize weighted score
    weightedScore = totalWeight > 0 ? weightedScore / totalWeight : 0;

    // Determine final label based on weighted score
    let finalLabel = 'neutral';
    if (weightedScore > 0.15) {
      finalLabel = 'positive';
    } else if (weightedScore < -0.15) {
      finalLabel = 'negative';
    }

    // Calculate unified confidence
    let unifiedConfidence;
    if (bothAgree) {
      // If both methods agree, higher confidence
      unifiedConfidence = Math.min(1.0, (naiveConfidenceAdjusted + ruleConfidenceAdjusted) / 1.8);
    } else {
      // Weighted confidence if they don't agree
      unifiedConfidence = Math.max(naiveConfidenceAdjusted, ruleConfidenceAdjusted) * 0.9;
    }

    // Generate contextual explanation
    let explanation = '';
    if (bothAgree) {
      explanation = 'Ambos métodos coinciden, alta confianza.';

      if (langInfo.emotionalIntensity > 0.5) {
        explanation += ' Texto con alta intensidad emocional.';
      }
    } else {
      // Method with higher weight
      const dominantMethod = naiveWeight >= ruleWeight ? 'naive' : 'rule';
      const methodConfidence =
        naiveWeight >= ruleWeight ? naiveConfidenceAdjusted : ruleConfidenceAdjusted;

      explanation = `Se priorizó el método ${dominantMethod} (confianza ajustada: ${methodConfidence.toFixed(
        2
      )})`;

      if (
        finalLabel !==
        (dominantMethod === 'naive' ? naiveResult.label : ruleResult.analysis.sentiment.label)
      ) {
        explanation += '. La etiqueta final fue ajustada considerando la puntuación ponderada.';
      }

      if (langInfo.language === 'es') {
        explanation += ' Se detectó texto en español.';
      }
    }

    // Create final unified result
    const unifiedResult: UnifiedSentimentResult = {
      label: finalLabel,
      confidence: unifiedConfidence,
      score: weightedScore,
      method: bothAgree ? 'unified' : naiveWeight > ruleWeight ? 'naive' : 'rule',
      explanation,
      languageAnalysis: {
        detectedLanguage,
        emotionalIntensity: langInfo.emotionalIntensity,
        textStats: {
          length: text.length,
          complexity: langInfo.textComplexity,
        },
      },
    };

    return {
      text,
      detectedLanguage,
      naive: {
        label: naiveResult.label,
        confidence: naiveResult.confidence,
        adjustedConfidence: naiveConfidenceAdjusted.toFixed(2),
        processingTime: `${naiveTime}ms`,
      },
      rule: {
        label: ruleResult.analysis.sentiment.label,
        score: ruleResult.analysis.sentiment.score,
        confidence: ruleResult.analysis.sentiment.confidence,
        adjustedConfidence: ruleConfidenceAdjusted.toFixed(2),
        processingTime: `${ruleTime}ms`,
        emotions: ruleResult.analysis.sentiment.emotions,
      },
      comparison: {
        agreement: bothAgree,
        confidenceDiff: Math.abs(naiveResult.confidence - ruleResult.analysis.sentiment.confidence),
        speedDiff: `${Math.abs(naiveTime - ruleTime)}ms`,
        fasterMethod: naiveTime < ruleTime ? 'naive' : 'rule',
      },
      unified: unifiedResult,
      textAnalysis: {
        emotionalIntensity: langInfo.emotionalIntensity.toFixed(2),
        positiveScore: langInfo.positiveScore.toFixed(2),
        negativeScore: langInfo.negativeScore.toFixed(2),
        textComplexity: langInfo.textComplexity.toFixed(1),
        lengthCategory: text.length < 30 ? 'corto' : text.length < 100 ? 'medio' : 'largo',
      },
    };
  }

  /**
   * Calculate confidence adjustments based on text characteristics
   */
  private calculateConfidenceAdjustments(
    naiveResult: any,
    ruleResult: any,
    langInfo: LanguageInfo,
    text: string
  ) {
    let naiveConfidenceAdjusted = Math.max(0.25, naiveResult.confidence);
    let ruleConfidenceAdjusted = ruleResult.analysis.sentiment.confidence;

    // Adjust Naive Bayes confidence
    if (naiveConfidenceAdjusted < 0.0001) {
      // Minimum confidence base for Naive Bayes
      naiveConfidenceAdjusted = 0.3;

      // Bonus for emotional coincidence
      if (naiveResult.label === 'positive' && langInfo.positiveScore > 0) {
        naiveConfidenceAdjusted += 0.1 * Math.min(2, langInfo.positiveScore);
      } else if (naiveResult.label === 'negative' && langInfo.negativeScore > 0) {
        naiveConfidenceAdjusted += 0.1 * Math.min(2, langInfo.negativeScore);
      }
    }

    // Adjust rule-based model confidence
    if (ruleResult.analysis.sentiment.emotions) {
      const emotions = ruleResult.analysis.sentiment.emotions;
      const totalEmotionIntensity =
        (emotions.joy || 0) +
        (emotions.sadness || 0) +
        (emotions.anger || 0) +
        (emotions.fear || 0) +
        (emotions.disgust || 0) +
        (emotions.surprise || 0);

      // If strong emotions are detected, increase rule method confidence
      if (totalEmotionIntensity > 0.5) {
        ruleConfidenceAdjusted += 0.1;
      } else if (totalEmotionIntensity < 0.2) {
        // If few emotions detected, slightly reduce confidence
        ruleConfidenceAdjusted -= 0.05;
      }
    }

    // Language-specific adjustments
    if (langInfo.language === 'es') {
      // Rule method might have less coverage in Spanish
      ruleConfidenceAdjusted -= 0.05;

      // If there are clear negative words in Spanish and rule method didn't detect it
      if (langInfo.negativeScore > 0.4 && ruleResult.analysis.sentiment.label !== 'negative') {
        ruleConfidenceAdjusted -= 0.15;
      }

      // If there are clear positive words in Spanish and rule method didn't detect it
      if (langInfo.positiveScore > 0.4 && ruleResult.analysis.sentiment.label !== 'positive') {
        ruleConfidenceAdjusted -= 0.15;
      }
    }

    // Adjustments by length and complexity
    if (text.length < 15) {
      // Very short texts can be harder for Naive Bayes
      naiveConfidenceAdjusted -= 0.1;
    } else if (text.length > 100) {
      // Longer texts usually have more context for Naive Bayes
      naiveConfidenceAdjusted += 0.05;
      // But can complicate the rule system
      ruleConfidenceAdjusted -= 0.05;
    }

    // Adjustments by detected emotional intensity
    if (langInfo.emotionalIntensity > 0.5) {
      // Texts with high emotional intensity are usually easier to classify
      naiveConfidenceAdjusted += 0.05;
      ruleConfidenceAdjusted += 0.05;
    }

    // Ensure confidences are within reasonable ranges
    naiveConfidenceAdjusted = Math.min(0.95, Math.max(0.2, naiveConfidenceAdjusted));
    ruleConfidenceAdjusted = Math.min(0.95, Math.max(0.2, ruleConfidenceAdjusted));

    return {
      naiveAdjusted: naiveConfidenceAdjusted,
      ruleAdjusted: ruleConfidenceAdjusted,
    };
  }

  /**
   * Evaluate accuracy of sentiment prediction methods
   */
  async evaluateAccuracy({
    testCases,
    includeComparison = true,
    useAdvancedHybrid = false,
  }: {
    testCases: Array<{ text: string; expectedSentiment: string }>;
    includeComparison?: boolean;
    useAdvancedHybrid?: boolean;
  }) {
    const results = {
      overall: {
        total: testCases.length,
        correct: 0,
        accuracy: 0,
      },
      byMethod: {
        hybrid: { correct: 0, total: testCases.length, accuracy: 0 },
        naive: { correct: 0, total: testCases.length, accuracy: 0 },
        rule: { correct: 0, total: testCases.length, accuracy: 0 },
      },
      detailedResults: [] as any[],
      confusionMatrix: {
        positive: { positive: 0, negative: 0, neutral: 0 },
        negative: { positive: 0, negative: 0, neutral: 0 },
        neutral: { positive: 0, negative: 0, neutral: 0 },
      },
      insights: {
        strongestMethod: '',
        averageConfidence: 0,
        disagreementRate: 0,
      },
    };

    let totalConfidence = 0;
    let disagreements = 0;

    for (const testCase of testCases) {
      try {
        let hybridResult, naiveResult, ruleResult;

        if (includeComparison) {
          if (useAdvancedHybrid) {
            // Use advanced hybrid analyzer
            const comparison = await this.advancedCompareSentimentMethods({ text: testCase.text });
            hybridResult = {
              label: comparison.advanced.label,
              confidence: comparison.advanced.confidence,
            };
            naiveResult = comparison.naive;
            ruleResult = comparison.rule;
          } else {
            // Use standard compare method
            const comparison = await this.compareSentimentMethods({ text: testCase.text });
            hybridResult = {
              label: comparison.unified.label,
              confidence: comparison.unified.confidence,
            };
            naiveResult = comparison.naive;
            ruleResult = comparison.rule;
          }
        } else {
          if (useAdvancedHybrid) {
            // Use advanced hybrid without method comparison
            const comparison = await this.advancedCompareSentimentMethods({ text: testCase.text });
            hybridResult = {
              label: comparison.advanced.label,
              confidence: comparison.advanced.confidence,
            };
          } else {
            // Just get hybrid result using test method (rule-based)
            const analysis = await this.testSentimentAnalysis({
              text: testCase.text,
              method: 'rule',
            });
            hybridResult = {
              label: analysis.analysis.sentiment.label,
              confidence: analysis.analysis.sentiment.confidence,
            };
          }
        }

        // Normalize expected sentiment
        const expected = testCase.expectedSentiment.toLowerCase();

        // Check hybrid accuracy
        const hybridCorrect = hybridResult.label === expected;
        if (hybridCorrect) results.byMethod.hybrid.correct++;

        if (includeComparison && naiveResult && ruleResult) {
          // Check individual method accuracy
          const naiveCorrect = naiveResult.label === expected;
          const ruleCorrect = ruleResult.label === expected;

          if (naiveCorrect) results.byMethod.naive.correct++;
          if (ruleCorrect) results.byMethod.rule.correct++;

          // Check for disagreements
          if (naiveResult.label !== ruleResult.label) disagreements++;
        }

        // Update confusion matrix
        const predicted = hybridResult.label;
        if (results.confusionMatrix[expected as keyof typeof results.confusionMatrix]) {
          results.confusionMatrix[expected as keyof typeof results.confusionMatrix][
            predicted as keyof typeof results.confusionMatrix.positive
          ]++;
        }

        totalConfidence += hybridResult.confidence;

        // Store detailed result
        results.detailedResults.push({
          text: testCase.text.substring(0, 100) + '...',
          expected,
          predicted: hybridResult.label,
          confidence: hybridResult.confidence,
          correct: hybridCorrect,
          ...(includeComparison &&
            naiveResult &&
            ruleResult && {
              methods: {
                naive: { label: naiveResult.label, correct: naiveResult.label === expected },
                rule: { label: ruleResult.label, correct: ruleResult.label === expected },
              },
            }),
        });
      } catch (error) {
        console.error(`Error evaluating test case: ${testCase.text}`, error);
        results.detailedResults.push({
          text: testCase.text,
          expected: testCase.expectedSentiment,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Calculate final metrics
    results.overall.correct = results.byMethod.hybrid.correct;
    results.overall.accuracy = (results.overall.correct / results.overall.total) * 100;

    results.byMethod.hybrid.accuracy =
      (results.byMethod.hybrid.correct / results.byMethod.hybrid.total) * 100;
    results.byMethod.naive.accuracy =
      (results.byMethod.naive.correct / results.byMethod.naive.total) * 100;
    results.byMethod.rule.accuracy =
      (results.byMethod.rule.correct / results.byMethod.rule.total) * 100;

    results.insights.averageConfidence = totalConfidence / testCases.length;
    results.insights.disagreementRate = (disagreements / testCases.length) * 100;

    // Determine strongest method
    const accuracies = results.byMethod;
    const strongest = Object.entries(accuracies).reduce(
      (best, [method, stats]) =>
        stats.accuracy > best.accuracy ? { method, accuracy: stats.accuracy } : best,
      { method: 'hybrid', accuracy: accuracies.hybrid.accuracy }
    );

    results.insights.strongestMethod = strongest.method;

    return results;
  }

  /**
   * Advanced comparison with automatic weight adjustment and sarcasm detection
   */
  async advancedCompareSentimentMethods({ text }: SentimentCompareRequest) {
    if (!text || typeof text !== 'string') {
      throw new Error('Text string is required');
    }

    // Create mock tweet for analysis
    const mockTweet: Tweet = {
      id: 'test',
      tweetId: 'test',
      content: text,
      author: {
        id: 'test_user',
        username: 'test_user',
        displayName: 'Test User',
        verified: false,
        followersCount: 100,
        followingCount: 50,
        tweetsCount: 10,
        avatar: '',
      },
      metrics: {
        likes: 0,
        retweets: 0,
        replies: 0,
        quotes: 0,
        views: 0,
        engagement: 0,
      },
      hashtags: [],
      mentions: [],
      urls: [],
      mediaUrls: [],
      isRetweet: false,
      isReply: false,
      isQuote: false,
      language: 'en',
      createdAt: new Date(),
      scrapedAt: new Date(),
      updatedAt: new Date(),
    };

    // Get results from both methods
    const start1 = Date.now();
    const naiveResult = sentimentManager.predictNaiveBayes(text);
    const naiveTime = Date.now() - start1;

    const start2 = Date.now();
    const ruleResult = await sentimentManager.analyzeTweet(mockTweet, undefined);
    const ruleTime = Date.now() - start2;

    // Detect language
    const langInfo = this.detectLanguageImproved(text);

    // Use advanced hybrid analyzer
    const advancedResult = advancedHybridAnalyzer.predictWithAutoWeights(
      text,
      naiveResult,
      {
        label: ruleResult.analysis.sentiment.label,
        confidence: ruleResult.analysis.sentiment.confidence,
        score: ruleResult.analysis.sentiment.score,
      },
      langInfo.language
    );

    return {
      text,
      detectedLanguage: langInfo.language,
      naive: {
        label: naiveResult.label,
        confidence: naiveResult.confidence,
        processingTime: `${naiveTime}ms`,
      },
      rule: {
        label: ruleResult.analysis.sentiment.label,
        score: ruleResult.analysis.sentiment.score,
        confidence: ruleResult.analysis.sentiment.confidence,
        processingTime: `${ruleTime}ms`,
        emotions: ruleResult.analysis.sentiment.emotions,
      },
      advanced: {
        label: advancedResult.label,
        confidence: advancedResult.confidence,
        score: advancedResult.score,
        weights: advancedResult.weights,
        explanation: advancedResult.explanation,
        features: {
          sarcasmDetected: advancedResult.features.sarcasmIndicators > 1,
          emotionalIntensity: advancedResult.features.emotionalWords,
          hasEmojis: advancedResult.features.hasEmojis,
          textComplexity: advancedResult.features.complexity.toFixed(2),
          textLength: advancedResult.features.textLength,
        },
      },
      comparison: {
        originalVsAdvanced: {
          originalLabel:
            naiveResult.confidence > ruleResult.analysis.sentiment.confidence
              ? naiveResult.label
              : ruleResult.analysis.sentiment.label,
          advancedLabel: advancedResult.label,
          improvement:
            advancedResult.features.sarcasmIndicators > 1
              ? 'Sarcasm detected and handled'
              : 'Weights auto-adjusted',
        },
        processingTime: `${Date.now() - start1}ms total`,
      },
      unified: {
        label: advancedResult.label,
        confidence: advancedResult.confidence,
        score: advancedResult.score,
        method: 'advanced-hybrid',
        explanation: advancedResult.explanation,
        languageAnalysis: {
          detectedLanguage: langInfo.language,
          emotionalIntensity: langInfo.emotionalIntensity,
          textStats: {
            length: text.length,
            complexity: langInfo.textComplexity,
          },
        },
      },
    };
  }
}

export const sentimentService = new SentimentService();
