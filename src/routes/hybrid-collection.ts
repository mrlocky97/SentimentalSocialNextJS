/**
 * Hybrid Twitter Collection Routes
 * API endpoints for unlimited tweet collection using web scraping + Twitter API
 */

import { Router } from 'express';
import HybridTwitterCollectionManager from '../services/hybrid-twitter-collection.manager';

const router = Router();
const hybridManager = new HybridTwitterCollectionManager();

/**
 * @swagger
 * /api/hybrid-collection/status:
 *   get:
 *     summary: Get hybrid collection system status
 *     tags: [Hybrid Collection]
 *     responses:
 *       200:
 *         description: System status retrieved successfully
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
 *                     scraping:
 *                       type: object
 *                       properties:
 *                         available:
 *                           type: boolean
 *                         remaining:
 *                           type: number
 *                         resetTime:
 *                           type: string
 *                           format: date-time
 *                     api:
 *                       type: object
 *                       properties:
 *                         available:
 *                           type: boolean
 *                         remaining:
 *                           type: number
 *                         used:
 *                           type: number
 *                     recommendation:
 *                       type: string
 */
router.get('/status', async (req, res) => {
  try {
    const status = await hybridManager.getSystemStatus();
    
    res.json({
      success: true,
      data: status,
      message: 'System status retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting system status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get system status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/hybrid-collection/recommendations:
 *   get:
 *     summary: Get collection recommendations for a hashtag
 *     tags: [Hybrid Collection]
 *     parameters:
 *       - in: query
 *         name: hashtag
 *         required: true
 *         schema:
 *           type: string
 *         description: Hashtag to analyze (without #)
 *         example: JustDoIt
 *     responses:
 *       200:
 *         description: Recommendations retrieved successfully
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
 *                     hashtag:
 *                       type: string
 *                     recommendedMethod:
 *                       type: string
 *                       enum: [scraping, api, hybrid]
 *                     maxCollectable:
 *                       type: number
 *                     estimatedCost:
 *                       type: number
 *                     strategies:
 *                       type: array
 *                       items:
 *                         type: object
 *       400:
 *         description: Missing hashtag parameter
 */
router.get('/recommendations', async (req, res) => {
  try {
    const { hashtag } = req.query;
    
    if (!hashtag || typeof hashtag !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Hashtag parameter is required',
        example: '/api/hybrid-collection/recommendations?hashtag=JustDoIt'
      });
    }
    
    const recommendations = await hybridManager.getCollectionRecommendations(hashtag);
    
    res.json({
      success: true,
      data: recommendations,
      message: `Recommendations generated for #${hashtag}`
    });
  } catch (error) {
    console.error('Error getting recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get collection recommendations',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/hybrid-collection/collect:
 *   post:
 *     summary: Start hybrid tweet collection
 *     tags: [Hybrid Collection]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - hashtag
 *               - maxTweets
 *             properties:
 *               hashtag:
 *                 type: string
 *                 description: Hashtag to collect (without #)
 *                 example: JustDoIt
 *               maxTweets:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 10000
 *                 description: Maximum number of tweets to collect
 *                 example: 100
 *               useScrapingFirst:
 *                 type: boolean
 *                 default: true
 *                 description: Use web scraping as primary method
 *               fallbackToAPI:
 *                 type: boolean
 *                 default: true
 *                 description: Fallback to API if scraping fails
 *               scrapingRatio:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 1
 *                 default: 0.8
 *                 description: Ratio of scraping vs API (0.8 = 80% scraping)
 *               includeReplies:
 *                 type: boolean
 *                 default: false
 *               includeRetweets:
 *                 type: boolean
 *                 default: true
 *               maxAgeHours:
 *                 type: number
 *                 default: 24
 *                 description: Maximum age of tweets in hours
 *               minLikes:
 *                 type: number
 *                 default: 0
 *                 description: Minimum number of likes
 *               minRetweets:
 *                 type: number
 *                 default: 0
 *                 description: Minimum number of retweets
 *               minFollowers:
 *                 type: number
 *                 default: 100
 *                 description: Minimum follower count for users
 *               prioritizeVerified:
 *                 type: boolean
 *                 default: true
 *                 description: Prioritize verified users
 *     responses:
 *       200:
 *         description: Collection completed successfully
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
 *                     totalCollected:
 *                       type: number
 *                     scrapedCount:
 *                       type: number
 *                     apiCount:
 *                       type: number
 *                     method:
 *                       type: string
 *                       enum: [scraping-only, api-only, hybrid]
 *                     estimatedCost:
 *                       type: number
 *                     summary:
 *                       type: object
 *       400:
 *         description: Invalid request parameters
 */
router.post('/collect', async (req, res) => {
  try {
    const {
      hashtag,
      maxTweets,
      useScrapingFirst = true,
      fallbackToAPI = true,
      scrapingRatio = 0.8,
      includeReplies = false,
      includeRetweets = true,
      maxAgeHours = 24,
      minLikes = 0,
      minRetweets = 0,
      minFollowers = 100,
      prioritizeVerified = true
    } = req.body;
    
    // Validation
    if (!hashtag || typeof hashtag !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Hashtag is required and must be a string',
        example: { hashtag: 'JustDoIt', maxTweets: 100 }
      });
    }
    
    if (!maxTweets || typeof maxTweets !== 'number' || maxTweets < 1 || maxTweets > 10000) {
      return res.status(400).json({
        success: false,
        error: 'maxTweets must be a number between 1 and 10000',
        example: { hashtag: 'JustDoIt', maxTweets: 100 }
      });
    }
    
    if (scrapingRatio < 0 || scrapingRatio > 1) {
      return res.status(400).json({
        success: false,
        error: 'scrapingRatio must be between 0 and 1',
        example: { scrapingRatio: 0.8 }
      });
    }
    
    console.log(`🚀 Starting hybrid collection for #${hashtag} (${maxTweets} tweets)`);
    
    const result = await hybridManager.collectTweets({
      hashtag,
      maxTweets,
      useScrapingFirst,
      fallbackToAPI,
      scrapingRatio,
      includeReplies,
      includeRetweets,
      maxAgeHours,
      minLikes,
      minRetweets,
      minFollowers,
      prioritizeVerified
    });
    
    // Log collection results
    console.log(`✅ Collection completed: ${result.totalCollected} tweets`);
    console.log(`   🕷️ Scraped: ${result.scrapedCount}, 🔌 API: ${result.apiCount}`);
    console.log(`   💰 Cost: ${result.estimatedCost} API calls`);
    
    res.json({
      success: true,
      data: result,
      message: `Successfully collected ${result.totalCollected} tweets for #${hashtag}`
    });
    
  } catch (error) {
    console.error('Error in hybrid collection:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to collect tweets',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/hybrid-collection/test:
 *   post:
 *     summary: Test hybrid collection with small sample
 *     tags: [Hybrid Collection]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - hashtag
 *             properties:
 *               hashtag:
 *                 type: string
 *                 description: Hashtag to test (without #)
 *                 example: JustDoIt
 *     responses:
 *       200:
 *         description: Test completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                 message:
 *                   type: string
 */
router.post('/test', async (req, res) => {
  try {
    const { hashtag } = req.body;
    
    if (!hashtag || typeof hashtag !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Hashtag is required and must be a string',
        example: { hashtag: 'JustDoIt' }
      });
    }
    
    console.log(`🧪 Testing hybrid collection for #${hashtag}`);
    
    // Test with small sample (5 tweets)
    const result = await hybridManager.collectTweets({
      hashtag,
      maxTweets: 5,
      useScrapingFirst: true,
      fallbackToAPI: true,
      scrapingRatio: 0.8,
      includeReplies: false,
      includeRetweets: true,
      maxAgeHours: 24,
      minLikes: 0,
      prioritizeVerified: false
    });
    
    res.json({
      success: true,
      data: {
        ...result,
        testMode: true,
        recommendation: result.totalCollected > 0 ? 
          'System working! You can now scale up collection.' : 
          'No tweets collected. Check hashtag or try different parameters.'
      },
      message: `Test collection completed for #${hashtag}`
    });
    
  } catch (error) {
    console.error('Error in test collection:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test collection',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
