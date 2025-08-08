/**
 * Sentiment Analysis Routes
 * API endpoints for tweet sentiment analysis and marketing insights
 */

import { Request, Response, Router } from 'express';
import { Tweet } from '../types/twitter';
// Import the shared sentiment manager instance from the server file
import { sentimentManager } from '../server';

const router = Router();

/**
 * @swagger
 * /api/v1/sentiment/analyze:
 *   post:
 *     summary: Analyze sentiment of a single tweet
 *     tags: [Sentiment Analysis]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tweet
 *             properties:
 *               tweet:
 *                 type: object
 *                 description: Tweet object to analyze
 *               config:
 *                 type: object
 *                 description: Optional analysis configuration
 *                 properties:
 *                   enableEmotionAnalysis:
 *                     type: boolean
 *                   enableEntityExtraction:
 *                     type: boolean
 *                   enableBrandMentionDetection:
 *                     type: boolean
 *                   brandKeywords:
 *                     type: array
 *                     items:
 *                       type: string
 *                   minConfidenceThreshold:
 *                     type: number
 *                     minimum: 0
 *                     maximum: 1
 *     responses:
 *       200:
 *         description: Sentiment analysis completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   description: Complete sentiment analysis with marketing insights
 *       400:
 *         description: Invalid tweet data
 */
router.post('/analyze', async (req: Request, res: Response) => {
  try {
    const { tweet, config } = req.body;

    if (!tweet || !tweet.content) {
      return res.status(400).json({
        success: false,
        error: 'Tweet object with content is required',
        example: {
          tweet: {
            tweetId: '123456789',
            content: 'I love Nike shoes! They are amazing.',
            author: { username: 'user123', verified: false, followersCount: 100 },
            metrics: { likes: 10, retweets: 2, replies: 1 },
          },
        },
      });
    }

    const analysis = await sentimentManager.analyzeTweet(tweet as Tweet, config);

    res.json({
      success: true,
      data: analysis,
      message: 'Tweet sentiment analysis completed successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to analyze tweet sentiment',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * @swagger
 * /api/v1/sentiment/batch:
 *   post:
 *     summary: Analyze sentiment of multiple tweets in batch
 *     tags: [Sentiment Analysis]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tweets
 *             properties:
 *               tweets:
 *                 type: array
 *                 items:
 *                   type: object
 *                 description: Array of tweet objects to analyze
 *               config:
 *                 type: object
 *                 description: Optional analysis configuration
 *               includeStats:
 *                 type: boolean
 *                 default: true
 *                 description: Include aggregate statistics in response
 *     responses:
 *       200:
 *         description: Batch sentiment analysis completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     analyses:
 *                       type: array
 *                       items:
 *                         type: object
 *                     statistics:
 *                       type: object
 *                       description: Aggregate statistics (if includeStats=true)
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalProcessed:
 *                           type: number
 *                         averageSentiment:
 *                           type: number
 *                         processingTime:
 *                           type: string
 */
router.post('/batch', async (req: Request, res: Response) => {
  try {
    const { tweets, config, includeStats = true } = req.body;

    if (!tweets || !Array.isArray(tweets) || tweets.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Array of tweets is required',
        example: {
          tweets: [
            { tweetId: '1', content: 'I love this product!', author: { username: 'user1' } },
            {
              tweetId: '2',
              content: 'Not satisfied with the service',
              author: { username: 'user2' },
            },
          ],
        },
      });
    }

    if (tweets.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 100 tweets allowed per batch request',
        receivedCount: tweets.length,
      });
    }

    const startTime = Date.now();

    const analyses = await sentimentManager.analyzeTweetsBatch(tweets as Tweet[], config);

    const processingTime = Date.now() - startTime;

    // Generate statistics if requested
    let statistics = null;
    if (includeStats) {
      statistics = sentimentManager.generateStatistics(analyses);
    }

    // Create summary
    const averageSentiment =
      analyses.length > 0
        ? analyses.reduce((sum, analysis) => sum + analysis.analysis.sentiment.score, 0) /
          analyses.length
        : 0;

    const summary = {
      totalProcessed: analyses.length,
      averageSentiment: Number(averageSentiment.toFixed(3)),
      processingTime: `${processingTime}ms`,
      sentimentDistribution: statistics?.sentimentDistribution,
    };

    res.json({
      success: true,
      data: {
        analyses,
        statistics,
        summary,
      },
      message: `Successfully analyzed ${analyses.length} tweets`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to perform batch sentiment analysis',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * @swagger
 * /api/v1/sentiment/statistics:
 *   post:
 *     summary: Generate comprehensive statistics from analyzed tweets
 *     tags: [Sentiment Analysis]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - analyses
 *             properties:
 *               analyses:
 *                 type: array
 *                 items:
 *                   type: object
 *                 description: Array of tweet sentiment analyses
 *     responses:
 *       200:
 *         description: Statistics generated successfully
 */
router.post('/statistics', async (req: Request, res: Response) => {
  try {
    const { analyses } = req.body;

    if (!analyses || !Array.isArray(analyses)) {
      return res.status(400).json({
        success: false,
        error: 'Array of sentiment analyses is required',
      });
    }

    const statistics = sentimentManager.generateStatistics(analyses);

    res.json({
      success: true,
      data: statistics,
      message: `Statistics generated for ${analyses.length} analyses`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to generate statistics',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * @swagger
 * /api/v1/sentiment/trends:
 *   post:
 *     summary: Generate sentiment trends over time
 *     tags: [Sentiment Analysis]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - analyses
 *             properties:
 *               analyses:
 *                 type: array
 *                 items:
 *                   type: object
 *                 description: Array of tweet sentiment analyses
 *               intervalHours:
 *                 type: number
 *                 default: 1
 *                 description: Time interval for grouping trends (in hours)
 *     responses:
 *       200:
 *         description: Sentiment trends generated successfully
 */
router.post('/trends', async (req: Request, res: Response) => {
  try {
    const { analyses, intervalHours = 1 } = req.body;

    if (!analyses || !Array.isArray(analyses)) {
      return res.status(400).json({
        success: false,
        error: 'Array of sentiment analyses is required',
      });
    }

    const trends = sentimentManager.generateSentimentTrends(analyses, intervalHours);

    res.json({
      success: true,
      data: {
        trends,
        intervalHours,
        totalDataPoints: trends.length,
        timeRange:
          trends.length > 0
            ? {
                start: trends[0].timestamp,
                end: trends[trends.length - 1].timestamp,
              }
            : null,
      },
      message: `Generated ${trends.length} trend data points`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to generate sentiment trends',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * @swagger
 * /api/v1/sentiment/demo:
 *   get:
 *     summary: Demo sentiment analysis with sample tweets
 *     tags: [Sentiment Analysis]
 *     responses:
 *       200:
 *         description: Demo analysis completed successfully
 */
router.get('/demo', async (req: Request, res: Response) => {
  try {
    // Sample tweets for demonstration
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

    res.json({
      success: true,
      data: {
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
      },
      message: 'Demo sentiment analysis completed successfully',
    });
  } catch (error) {
    console.error('❌ Error in demo analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to run demo analysis',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * @swagger
 * /api/v1/sentiment/test:
 *   post:
 *     summary: Test sentiment analysis with custom text
 *     tags: [Sentiment Analysis]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *                 description: Text to analyze
 *                 example: "I love this product! It's amazing and works perfectly."
 *               method:
 *                 type: string
 *                 description: Analysis method to use (rule or naive)
 *                 enum: [rule, naive]
 *                 default: rule
 *     responses:
 *       200:
 *         description: Text analysis completed successfully
 */
router.post('/test', async (req: Request, res: Response) => {
  try {
    const { text, method = 'rule' } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Text string is required',
        example: { text: "I love this product! It's amazing and works perfectly." },
      });
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

    // Analizar el tweet utilizando el método especificado
    const analysis = await sentimentManager.analyzeTweet(mockTweet, undefined, method as 'rule' | 'naive');

    // Si se usó el método naive, también mostrar el resultado directo del clasificador
    let naiveBayesResult = null;
    if (method === 'naive') {
      naiveBayesResult = sentimentManager.predictNaiveBayes(text);
    }

    res.json({
      success: true,
      data: {
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
      },
      message: 'Sentiment analysis test completed successfully',
    });
  } catch (error) {
    console.error('❌ Error in sentiment test:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test sentiment analysis',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * @swagger
 * /api/v1/sentiment/model-status:
 *   get:
 *     summary: Get sentiment model status and information
 *     tags: [Sentiment Analysis]
 *     responses:
 *       200:
 *         description: Model information retrieved successfully
 */
/**
 * @swagger
 * /api/v1/sentiment/update-model:
 *   post:
 *     summary: Update the sentiment analysis model with new training data
 *     tags: [Sentiment Analysis]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - examples
 *             properties:
 *               examples:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     text:
 *                       type: string
 *                     label:
 *                       type: string
 *                       enum: [positive, negative, neutral]
 *               saveModel:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       200:
 *         description: Model updated successfully
 */
router.post('/update-model', async (req: Request, res: Response) => {
  try {
    const { examples, saveModel = true } = req.body;

    if (!examples || !Array.isArray(examples) || examples.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Array of training examples is required',
        example: {
          examples: [
            { text: 'I love this product!', label: 'positive' },
            { text: 'This is terrible service', label: 'negative' },
            { text: 'The package arrived yesterday', label: 'neutral' }
          ]
        }
      });
    }

    // Validar ejemplos
    const validExamples = examples.filter(ex => 
      ex.text && typeof ex.text === 'string' && 
      ex.label && ['positive', 'negative', 'neutral'].includes(ex.label)
    );

    if (validExamples.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid training examples provided'
      });
    }

    // Importar datos de entrenamiento existentes
    const fs = require('fs');
    const path = require('path');
    const { trainingData } = require('../data/training-data');
    
    // Entrenar el modelo con los nuevos ejemplos
    console.log(`🔄 Training model with ${validExamples.length} new examples...`);
    const startTime = Date.now();
    
    await sentimentManager.trainNaiveBayes([...trainingData, ...validExamples]);
    
    const trainingTime = Date.now() - startTime;
    console.log(`✅ Model trained in ${trainingTime}ms`);
    
    // Guardar el modelo si se solicitó
    if (saveModel) {
      const modelPath = path.join(process.cwd(), 'src', 'data', 'trained-classifier.json');
      console.log('💾 Saving updated model...');
      await sentimentManager.saveNaiveBayesToFile(modelPath);
      console.log('💾 Model saved successfully.');
    }
    
    // Evaluar el modelo actualizado con ejemplos de prueba
    const testExamples = [
      { text: "I love this product!", expected: "positive" },
      { text: "This is terrible", expected: "negative" },
      { text: "The box was delivered", expected: "neutral" },
      { text: "Me encanta este servicio", expected: "positive" },
      { text: "No me gusta para nada", expected: "negative" }
    ];
    
    const testResults = testExamples.map(ex => {
      const result = sentimentManager.predictNaiveBayes(ex.text);
      return {
        text: ex.text,
        expected: ex.expected,
        predicted: result.label,
        confidence: result.confidence,
        correct: result.label === ex.expected
      };
    });
    
    const accuracy = testResults.filter(r => r.correct).length / testResults.length * 100;

    res.json({
      success: true,
      data: {
        trainingStats: {
          newExamples: validExamples.length,
          totalExamplesUsed: trainingData.length + validExamples.length,
          trainingTime: `${trainingTime}ms`,
          modelSaved: saveModel
        },
        testResults: {
          examples: testResults,
          accuracy: accuracy
        }
      },
      message: `Model successfully updated with ${validExamples.length} new examples`
    });
    
  } catch (error) {
    console.error('❌ Error updating model:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update sentiment model',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.get('/model-status', async (req: Request, res: Response) => {
  try {
    // Crear ejemplos de prueba multilingües para verificar el modelo
    const testExamples = [
      // Ejemplos en inglés
      { text: "I love this product! It's amazing and works perfectly.", expectedLabel: "positive" },
      { text: "This is the worst experience I've ever had. Terrible service.", expectedLabel: "negative" },
      { text: "The package was delivered yesterday.", expectedLabel: "neutral" },
      
      // Ejemplos en español
      { text: "Me encanta este producto, es de excelente calidad.", expectedLabel: "positive" },
      { text: "Qué servicio tan horrible, no lo recomiendo para nada.", expectedLabel: "negative" },
      { text: "El informe debe entregarse antes del viernes.", expectedLabel: "neutral" },
    ];
    
    // Ejecutar los ejemplos con ambos métodos
    const results = await Promise.all(
      testExamples.map(async (example) => {
        const naiveResult = sentimentManager.predictNaiveBayes(example.text);
        
        // Crear tweet mock para el método basado en reglas
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
        
        const ruleResult = await sentimentManager.analyzeTweet(mockTweet, undefined, 'rule');
        
        return {
          text: example.text,
          expectedLabel: example.expectedLabel,
          naive: {
            label: naiveResult.label,
            confidence: naiveResult.confidence,
            correct: naiveResult.label === example.expectedLabel
          },
          rule: {
            label: ruleResult.analysis.sentiment.label,
            score: ruleResult.analysis.sentiment.score,
            confidence: ruleResult.analysis.sentiment.confidence,
            correct: ruleResult.analysis.sentiment.label === example.expectedLabel
          }
        };
      })
    );
    
    // Calcular precisión de cada método
    const naiveCorrect = results.filter(r => r.naive.correct).length;
    const ruleCorrect = results.filter(r => r.rule.correct).length;
    
    // Obtener información del modelo
    const fs = require('fs');
    const path = require('path');
    const modelPath = path.join(process.cwd(), 'src', 'data', 'trained-classifier.json');
    
    let modelInfo = {
      exists: fs.existsSync(modelPath),
      size: 0,
      lastModified: null,
    };
    
    if (modelInfo.exists) {
      const stats = fs.statSync(modelPath);
      modelInfo.size = stats.size;
      modelInfo.lastModified = stats.mtime;
    }

    res.json({
      success: true,
      data: {
        model: modelInfo,
        accuracy: {
          naive: {
            correct: naiveCorrect,
            total: testExamples.length,
            accuracy: (naiveCorrect / testExamples.length) * 100
          },
          rule: {
            correct: ruleCorrect,
            total: testExamples.length,
            accuracy: (ruleCorrect / testExamples.length) * 100
          }
        },
        testResults: results
      },
      message: 'Model status retrieved successfully'
    });
  } catch (error) {
    console.error('❌ Error in model status check:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve model status',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * @swagger
 * /api/v1/sentiment/compare:
 *   post:
 *     summary: Compare different sentiment analysis methods on the same text
 *     tags: [Sentiment Analysis]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *                 description: Text to analyze
 *     responses:
 *       200:
 *         description: Comparison completed successfully
 */
router.post('/compare', async (req: Request, res: Response) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Text string is required'
      });
    }

    // Crear tweet mock para análisis
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

    // Obtener resultados de ambos métodos
    const start1 = Date.now();
    const naiveResult = sentimentManager.predictNaiveBayes(text);
    const naiveTime = Date.now() - start1;
    
    const start2 = Date.now();
    const ruleResult = await sentimentManager.analyzeTweet(mockTweet, undefined, 'rule');
    const ruleTime = Date.now() - start2;
    
    // Analizar detección de idioma
    const spanishPatterns = ['el', 'la', 'los', 'las', 'es', 'son', 'está', 'están', 'que', 'porque', 'cuando'];
    const englishPatterns = ['the', 'is', 'are', 'was', 'were', 'that', 'this', 'these', 'those', 'and', 'but'];
    
    let detectedLanguage = 'unknown';
    const lowerText = text.toLowerCase();
    
    const spanishMatches = spanishPatterns.filter(word => lowerText.includes(` ${word} `)).length;
    const englishMatches = englishPatterns.filter(word => lowerText.includes(` ${word} `)).length;
    
    if (spanishMatches > englishMatches) {
      detectedLanguage = 'es';
    } else if (englishMatches > spanishMatches) {
      detectedLanguage = 'en';
    }

    res.json({
      success: true,
      data: {
        text,
        detectedLanguage,
        naive: {
          label: naiveResult.label,
          confidence: naiveResult.confidence,
          processingTime: `${naiveTime}ms`
        },
        rule: {
          label: ruleResult.analysis.sentiment.label,
          score: ruleResult.analysis.sentiment.score,
          confidence: ruleResult.analysis.sentiment.confidence,
          processingTime: `${ruleTime}ms`,
          emotions: ruleResult.analysis.sentiment.emotions
        },
        comparison: {
          agreement: naiveResult.label === ruleResult.analysis.sentiment.label,
          confidenceDiff: Math.abs(naiveResult.confidence - ruleResult.analysis.sentiment.confidence),
          speedDiff: `${Math.abs(naiveTime - ruleTime)}ms`,
          fasterMethod: naiveTime < ruleTime ? 'naive' : 'rule'
        }
      },
      message: 'Sentiment analysis comparison completed successfully'
    });
  } catch (error) {
    console.error('❌ Error in sentiment comparison:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to compare sentiment analysis methods',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
