/**
 * Sentiment Analysis Routes
 * API endpoints for tweet sentiment analysis and marketing insights
 */

import { Router, Request, Response } from 'express';
import { TweetSentimentAnalysisManager } from '../services/tweet-sentiment-analysis.manager';
import { Tweet } from '../types/twitter';
import { SentimentAnalysisConfig } from '../types/sentiment';

const router = Router();
const sentimentManager = new TweetSentimentAnalysisManager();

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
            tweetId: "123456789",
            content: "I love Nike shoes! They are amazing.",
            author: { username: "user123", verified: false, followersCount: 100 },
            metrics: { likes: 10, retweets: 2, replies: 1 }
          }
        }
      });
    }

    const analysis = await sentimentManager.analyzeTweet(tweet as Tweet, config);

    res.json({
      success: true,
      data: analysis,
      message: 'Tweet sentiment analysis completed successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to analyze tweet sentiment',
      details: error instanceof Error ? error.message : 'Unknown error'
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
            { tweetId: "1", content: "I love this product!", author: { username: "user1" } },
            { tweetId: "2", content: "Not satisfied with the service", author: { username: "user2" } }
          ]
        }
      });
    }

    if (tweets.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 100 tweets allowed per batch request',
        receivedCount: tweets.length
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
    const averageSentiment = analyses.length > 0
      ? analyses.reduce((sum, analysis) => sum + analysis.analysis.sentiment.score, 0) / analyses.length
      : 0;

    const summary = {
      totalProcessed: analyses.length,
      averageSentiment: Number(averageSentiment.toFixed(3)),
      processingTime: `${processingTime}ms`,
      sentimentDistribution: statistics?.sentimentDistribution
    };


    res.json({
      success: true,
      data: {
        analyses,
        statistics,
        summary
      },
      message: `Successfully analyzed ${analyses.length} tweets`
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to perform batch sentiment analysis',
      details: error instanceof Error ? error.message : 'Unknown error'
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
        error: 'Array of sentiment analyses is required'
      });
    }

    const statistics = sentimentManager.generateStatistics(analyses);

    res.json({
      success: true,
      data: statistics,
      message: `Statistics generated for ${analyses.length} analyses`
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to generate statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
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
        error: 'Array of sentiment analyses is required'
      });
    }

    const trends = sentimentManager.generateSentimentTrends(analyses, intervalHours);

    res.json({
      success: true,
      data: {
        trends,
        intervalHours,
        totalDataPoints: trends.length,
        timeRange: trends.length > 0 ? {
          start: trends[0].timestamp,
          end: trends[trends.length - 1].timestamp
        } : null
      },
      message: `Generated ${trends.length} trend data points`
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to generate sentiment trends',
      details: error instanceof Error ? error.message : 'Unknown error'
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
        content: 'I absolutely love my new Nike Air Max! Best running shoes ever! 😍 #Nike #Running #JustDoIt',
        author: {
          id: 'demo_user_1',
          username: 'runner_pro',
          displayName: 'Pro Runner',
          verified: true,
          followersCount: 15000,
          followingCount: 500,
          tweetsCount: 2500,
          avatar: 'https://example.com/avatar1.jpg'
        },
        metrics: {
          likes: 245,
          retweets: 89,
          replies: 34,
          quotes: 12,
          views: 5600,
          engagement: 380
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
        updatedAt: new Date()
      },
      {
        id: 'demo_2',
        tweetId: 'demo_2',
        content: 'Terrible customer service from @nike. My order was delayed for 3 weeks and no one responds to my emails. Very disappointed! 😠',
        author: {
          id: 'demo_user_2',
          username: 'customer_123',
          displayName: 'Disappointed Customer',
          verified: false,
          followersCount: 350,
          followingCount: 800,
          tweetsCount: 1200,
          avatar: 'https://example.com/avatar2.jpg'
        },
        metrics: {
          likes: 23,
          retweets: 67,
          replies: 145,
          quotes: 8,
          views: 2300,
          engagement: 243
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
        updatedAt: new Date()
      },
      {
        id: 'demo_3',
        tweetId: 'demo_3',
        content: 'Nike vs Adidas - the eternal debate! Both have their strengths. Nike for innovation, Adidas for comfort. What do you think? 🤔',
        author: {
          id: 'demo_user_3',
          username: 'sneaker_expert',
          displayName: 'Sneaker Expert',
          verified: true,
          followersCount: 45000,
          followingCount: 1200,
          tweetsCount: 8900,
          avatar: 'https://example.com/avatar3.jpg'
        },
        metrics: {
          likes: 412,
          retweets: 189,
          replies: 267,
          quotes: 45,
          views: 12400,
          engagement: 913
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
        updatedAt: new Date()
      }
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
          summary: `Analyzed ${analyses.length} demo tweets with average sentiment of ${statistics.averageSentiment.toFixed(3)}`,
          keyFindings: [
            'Mix of positive and negative brand sentiment detected',
            'High-influence users engaged with brand content',
            'Customer service issues identified requiring attention',
            'Brand comparison discussions present in conversations'
          ],
          recommendations: [
            'Monitor and respond to customer service complaints',
            'Engage with positive brand advocates',
            'Track competitor comparison discussions',
            'Leverage high-engagement content for amplification'
          ]
        }
      },
      message: 'Demo sentiment analysis completed successfully'
    });

  } catch (error) {
    console.error('❌ Error in demo analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to run demo analysis',
      details: error instanceof Error ? error.message : 'Unknown error'
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
 *     responses:
 *       200:
 *         description: Text analysis completed successfully
 */
router.post('/test', async (req: Request, res: Response) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Text string is required',
        example: { text: "I love this product! It's amazing and works perfectly." }
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
        avatar: 'https://example.com/avatar.jpg'
      },
      metrics: {
        likes: 0,
        retweets: 0,
        replies: 0,
        quotes: 0,
        views: 0,
        engagement: 0
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
      updatedAt: new Date()
    };

    const analysis = await sentimentManager.analyzeTweet(mockTweet);

    res.json({
      success: true,
      data: {
        originalText: text,
        analysis: analysis.analysis,
        brandMentions: analysis.brandMentions,
        marketingInsights: analysis.marketingInsights,
        summary: {
          sentiment: analysis.analysis.sentiment.label,
          score: analysis.analysis.sentiment.score,
          confidence: analysis.analysis.sentiment.confidence,
          keywords: analysis.analysis.keywords.slice(0, 5)
        }
      },
      message: 'Sentiment analysis test completed successfully'
    });

  } catch (error) {
    console.error('❌ Error in sentiment test:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test sentiment analysis',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
