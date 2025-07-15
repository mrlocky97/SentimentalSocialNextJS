/**
 * Twitter Routes
 * API endpoints for Twitter integration and tweet management
 */

import express, { Request, Response } from 'express';
import { TwitterAPIService } from '../services/twitter-api.service';
import { MongoTweetRepository, TweetFilters } from '../repositories/mongo-tweet.repository';
import { authenticateToken } from '../middleware/express-auth';

const router = express.Router();
const twitterService = new TwitterAPIService();
const tweetRepository = new MongoTweetRepository();

/**
 * @swagger
 * components:
 *   schemas:
 *     TwitterSearchParams:
 *       type: object
 *       properties:
 *         hashtag:
 *           type: string
 *           description: Hashtag to search for (with or without #)
 *           example: "JustDoIt"
 *         maxResults:
 *           type: integer
 *           minimum: 10
 *           maximum: 100
 *           default: 50
 *           description: Maximum number of tweets to collect
 *         lang:
 *           type: string
 *           default: "en"
 *           description: Language code (ISO 639-1)
 *         campaignId:
 *           type: string
 *           description: Campaign ID to associate with collected tweets
 *     
 *     TweetResponse:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         tweetId:
 *           type: string
 *         content:
 *           type: string
 *         author:
 *           $ref: '#/components/schemas/TwitterUser'
 *         metrics:
 *           $ref: '#/components/schemas/TweetMetrics'
 *         sentiment:
 *           $ref: '#/components/schemas/SentimentAnalysis'
 *         hashtags:
 *           type: array
 *           items:
 *             type: string
 *         mentions:
 *           type: array
 *           items:
 *             type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/twitter/search:
 *   post:
 *     summary: Search and collect tweets by hashtag
 *     tags: [Twitter]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TwitterSearchParams'
 *     responses:
 *       200:
 *         description: Tweets collected successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     collected:
 *                       type: integer
 *                     duplicates:
 *                       type: integer
 *                     errors:
 *                       type: integer
 *                     tweets:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/TweetResponse'
 *       400:
 *         description: Invalid parameters
 *       401:
 *         description: Authentication required
 *       429:
 *         description: Rate limit exceeded
 */
router.post('/search', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { hashtag, maxResults = 50, lang = 'en', campaignId } = req.body;

    if (!hashtag) {
      return res.status(400).json({
        success: false,
        message: 'Hashtag is required'
      });
    }

    // Search tweets via Twitter API
    const searchResults = await twitterService.searchTweetsByHashtag(hashtag, {
      maxResults: Math.min(maxResults, 100),
      lang
    });

    if (!searchResults.data || searchResults.data.length === 0) {
      return res.json({
        success: true,
        message: 'No tweets found for the specified hashtag',
        data: {
          collected: 0,
          duplicates: 0,
          errors: 0,
          tweets: []
        }
      });
    }

    // Transform and prepare tweets for storage
    const tweetsToStore = searchResults.data.map(tweet => {
      const transformedTweet = twitterService.transformTweetData(
        tweet, 
        searchResults.includes?.users || []
      );
      
      if (campaignId) {
        transformedTweet.campaignId = campaignId;
      }
      
      return transformedTweet;
    });

    // Store tweets in database
    const bulkResult = await tweetRepository.bulkCreate(tweetsToStore);

    res.json({
      success: true,
      message: `Successfully processed ${tweetsToStore.length} tweets for hashtag #${hashtag}`,
      data: {
        collected: bulkResult.created.length,
        duplicates: bulkResult.duplicates.length,
        errors: bulkResult.errors.length,
        tweets: bulkResult.created
      }
    });

  } catch (error) {
    console.error('[Twitter API] Search error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search tweets',
      error: (error as Error).message
    });
  }
});

/**
 * @swagger
 * /api/twitter/tweets:
 *   get:
 *     summary: Get stored tweets with filters
 *     tags: [Twitter]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *           maximum: 100
 *       - in: query
 *         name: hashtag
 *         schema:
 *           type: string
 *         description: Filter by hashtag
 *       - in: query
 *         name: campaignId
 *         schema:
 *           type: string
 *         description: Filter by campaign ID
 *       - in: query
 *         name: sentiment
 *         schema:
 *           type: string
 *           enum: [positive, negative, neutral]
 *         description: Filter by sentiment
 *       - in: query
 *         name: language
 *         schema:
 *           type: string
 *         description: Filter by language
 *       - in: query
 *         name: verified
 *         schema:
 *           type: boolean
 *         description: Filter by verified users
 *       - in: query
 *         name: minLikes
 *         schema:
 *           type: integer
 *         description: Minimum number of likes
 *       - in: query
 *         name: minRetweets
 *         schema:
 *           type: integer
 *         description: Minimum number of retweets
 *     responses:
 *       200:
 *         description: Tweets retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/TweetResponse'
 *                 pagination:
 *                   $ref: '#/components/schemas/PaginationInfo'
 */
router.get('/tweets', authenticateToken, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

    // Build filters from query parameters
    const filters: TweetFilters = {};
    
    if (req.query.hashtag) {
      filters.hashtags = [req.query.hashtag as string];
    }
    
    if (req.query.campaignId) {
      filters.campaignId = req.query.campaignId as string;
    }
    
    if (req.query.sentiment) {
      filters.sentimentLabel = req.query.sentiment as 'positive' | 'negative' | 'neutral';
    }
    
    if (req.query.language) {
      filters.language = req.query.language as string;
    }
    
    if (req.query.verified !== undefined) {
      filters.verified = req.query.verified === 'true';
    }
    
    if (req.query.minLikes) {
      filters.minLikes = parseInt(req.query.minLikes as string);
    }
    
    if (req.query.minRetweets) {
      filters.minRetweets = parseInt(req.query.minRetweets as string);
    }

    const result = await tweetRepository.findMany(filters, { page, limit });

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });

  } catch (error) {
    console.error('[Twitter] Get tweets error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve tweets',
      error: (error as Error).message
    });
  }
});

/**
 * @swagger
 * /api/twitter/analytics:
 *   get:
 *     summary: Get tweet analytics
 *     tags: [Twitter]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: hashtag
 *         schema:
 *           type: string
 *         description: Filter analytics by hashtag
 *       - in: query
 *         name: campaignId
 *         schema:
 *           type: string
 *         description: Filter analytics by campaign ID
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for analytics
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for analytics
 *     responses:
 *       200:
 *         description: Analytics retrieved successfully
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
 *                     totalTweets:
 *                       type: integer
 *                     totalEngagement:
 *                       type: number
 *                     averageEngagement:
 *                       type: number
 *                     sentimentDistribution:
 *                       type: object
 *                       properties:
 *                         positive:
 *                           type: integer
 *                         negative:
 *                           type: integer
 *                         neutral:
 *                           type: integer
 *                     topHashtags:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           hashtag:
 *                             type: string
 *                           count:
 *                             type: integer
 */
router.get('/analytics', authenticateToken, async (req: Request, res: Response) => {
  try {
    // Build filters from query parameters
    const filters: TweetFilters = {};
    
    if (req.query.hashtag) {
      filters.hashtags = [req.query.hashtag as string];
    }
    
    if (req.query.campaignId) {
      filters.campaignId = req.query.campaignId as string;
    }
    
    if (req.query.dateFrom) {
      filters.dateFrom = new Date(req.query.dateFrom as string);
    }
    
    if (req.query.dateTo) {
      filters.dateTo = new Date(req.query.dateTo as string);
    }

    const analytics = await tweetRepository.getAnalytics(filters);

    res.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    console.error('[Twitter] Analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve analytics',
      error: (error as Error).message
    });
  }
});

/**
 * @swagger
 * /api/twitter/hashtag-trends/{hashtag}:
 *   get:
 *     summary: Get hashtag trend analysis
 *     tags: [Twitter]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: hashtag
 *         required: true
 *         schema:
 *           type: string
 *         description: Hashtag to analyze (without #)
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *           maximum: 90
 *         description: Number of days to analyze
 *     responses:
 *       200:
 *         description: Hashtag trends retrieved successfully
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
 *                     totalTweets:
 *                       type: integer
 *                     averageEngagement:
 *                       type: number
 *                     sentiment:
 *                       type: object
 *                     growth:
 *                       type: object
 *                     topTweets:
 *                       type: array
 */
router.get('/hashtag-trends/:hashtag', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { hashtag } = req.params;
    const days = Math.min(parseInt(req.query.days as string) || 30, 90);

    if (!hashtag) {
      return res.status(400).json({
        success: false,
        message: 'Hashtag is required'
      });
    }

    const trends = await tweetRepository.getHashtagTrends(hashtag, days);

    res.json({
      success: true,
      data: trends
    });

  } catch (error) {
    console.error('[Twitter] Hashtag trends error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve hashtag trends',
      error: (error as Error).message
    });
  }
});

/**
 * @swagger
 * /api/twitter/test-connection:
 *   get:
 *     summary: Test Twitter API connection
 *     tags: [Twitter]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Connection test result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 connected:
 *                   type: boolean
 *                 message:
 *                   type: string
 */
router.get('/test-connection', authenticateToken, async (req: Request, res: Response) => {
  try {
    const connected = await twitterService.testConnection();

    res.json({
      success: true,
      connected,
      message: connected ? 'Twitter API connection successful' : 'Twitter API connection failed'
    });

  } catch (error) {
    console.error('[Twitter] Connection test error:', error);
    res.json({
      success: false,
      connected: false,
      message: 'Twitter API connection test failed',
      error: (error as Error).message
    });
  }
});

/**
 * @swagger
 * /api/twitter/search-text:
 *   post:
 *     summary: Search tweets by text content
 *     tags: [Twitter]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               searchText:
 *                 type: string
 *                 description: Text to search for in tweets
 *               page:
 *                 type: integer
 *                 default: 1
 *               limit:
 *                 type: integer
 *                 default: 50
 *                 maximum: 100
 *     responses:
 *       200:
 *         description: Search results retrieved successfully
 */
router.post('/search-text', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { searchText, page = 1, limit = 50 } = req.body;

    if (!searchText) {
      return res.status(400).json({
        success: false,
        message: 'Search text is required'
      });
    }

    const result = await tweetRepository.searchByText(
      searchText,
      {},
      { page, limit: Math.min(limit, 100) }
    );

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });

  } catch (error) {
    console.error('[Twitter] Text search error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search tweets',
      error: (error as Error).message
    });
  }
});

export { router as twitterRoutes };
