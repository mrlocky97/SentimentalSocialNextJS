/**
 * Twitter Collection Routes
 * Smart collection management with quota tracking
 */

import express, { Request, Response } from 'express';
import TwitterCollectionManager, { CollectionConfig } from '../services/twitter-collection.manager';
import { authenticateToken } from '../middleware/express-auth';

const router = express.Router();
const collectionManager = new TwitterCollectionManager();

/**
 * @swagger
 * /api/v1/twitter/quota:
 *   get:
 *     summary: Get current Twitter API quota status
 *     tags: [Twitter Collection]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Quota status retrieved successfully
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
 *                     used:
 *                       type: integer
 *                       description: Tweets used this month
 *                     remaining:
 *                       type: integer
 *                       description: Tweets remaining this month
 *                     resetDate:
 *                       type: string
 *                       format: date
 *                     dailyAverage:
 *                       type: number
 *                       description: Average tweets collected per day
 *                     recommendedDailyLimit:
 *                       type: integer
 *                       description: Recommended daily collection limit
 */
router.get('/quota', authenticateToken, async (req: Request, res: Response) => {
  try {
    const quotaStatus = await collectionManager.getQuotaStatus();
    
    res.json({
      success: true,
      data: quotaStatus,
      message: `${quotaStatus.remaining} tweets remaining this month`
    });
  } catch (error) {
    console.error('[Collection] Quota check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check quota status',
      error: (error as Error).message
    });
  }
});

/**
 * @swagger
 * /api/v1/twitter/recommendations/{hashtag}:
 *   get:
 *     summary: Get collection recommendations for a hashtag
 *     tags: [Twitter Collection]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: hashtag
 *         required: true
 *         schema:
 *           type: string
 *         description: Hashtag to analyze (without #)
 *     responses:
 *       200:
 *         description: Recommendations retrieved successfully
 */
router.get('/recommendations/:hashtag', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { hashtag } = req.params;
    const recommendations = await collectionManager.getCollectionRecommendations(hashtag);
    
    res.json({
      success: true,
      data: recommendations,
      message: `Recommendations for #${hashtag} collection`
    });
  } catch (error) {
    console.error('[Collection] Recommendations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get recommendations',
      error: (error as Error).message
    });
  }
});

/**
 * @swagger
 * /api/v1/twitter/collect:
 *   post:
 *     summary: Intelligent tweet collection with optimization
 *     tags: [Twitter Collection]
 *     security:
 *       - bearerAuth: []
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
 *                 description: Hashtag to collect (without #)
 *                 example: "JustDoIt"
 *               campaignId:
 *                 type: string
 *                 description: Campaign ID to associate tweets with
 *               maxTweets:
 *                 type: integer
 *                 default: 100
 *                 maximum: 1000
 *                 description: Maximum tweets to collect
 *               prioritizeVerified:
 *                 type: boolean
 *                 default: true
 *                 description: Prioritize verified user tweets
 *               minFollowers:
 *                 type: integer
 *                 default: 100
 *                 description: Minimum follower count filter
 *               minEngagement:
 *                 type: number
 *                 default: 2
 *                 description: Minimum engagement rate filter
 *               maxAgeHours:
 *                 type: integer
 *                 default: 24
 *                 maximum: 168
 *                 description: Maximum tweet age in hours
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
 *                     collected:
 *                       type: integer
 *                     filtered:
 *                       type: integer
 *                     duplicates:
 *                       type: integer
 *                     errors:
 *                       type: integer
 *                     remainingQuota:
 *                       type: integer
 *                     estimatedCost:
 *                       type: integer
 *                     summary:
 *                       type: object
 *       400:
 *         description: Invalid parameters or insufficient quota
 *       429:
 *         description: Rate limit exceeded or quota exhausted
 */
router.post('/collect', authenticateToken, async (req: Request, res: Response) => {
  try {
    const {
      hashtag,
      campaignId,
      maxTweets = 100,
      prioritizeVerified = true,
      minFollowers = 100,
      minEngagement = 2,
      maxAgeHours = 24
    } = req.body;

    // Validation
    if (!hashtag) {
      return res.status(400).json({
        success: false,
        message: 'Hashtag is required'
      });
    }

    if (maxTweets > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 1000 tweets per collection to respect API limits'
      });
    }

    if (maxAgeHours > 168) { // 7 days
      return res.status(400).json({
        success: false,
        message: 'Maximum age cannot exceed 168 hours (7 days) due to API limitations'
      });
    }

    // Check quota before starting
    const quota = await collectionManager.getQuotaStatus();
    if (quota.remaining < 10) {
      return res.status(429).json({
        success: false,
        message: `Insufficient quota remaining (${quota.remaining}). Resets on ${quota.resetDate.toDateString()}`,
        data: { quotaStatus: quota }
      });
    }

    const config: CollectionConfig = {
      hashtag: hashtag.replace('#', ''), // Remove # if provided
      campaignId,
      maxTweets: Math.min(maxTweets, quota.remaining), // Respect quota
      prioritizeVerified,
      minFollowers,
      minEngagement,
      maxAgeHours
    };

    console.log(`🚀 Starting intelligent collection for #${config.hashtag}`);
    
    const result = await collectionManager.collectTweets(config);

    res.json({
      success: true,
      data: result,
      message: `Successfully collected ${result.collected} high-quality tweets for #${config.hashtag}`
    });

  } catch (error) {
    console.error('[Collection] Collection error:', error);
    
    // Handle specific error types
    if ((error as Error).message.includes('quota exceeded')) {
      return res.status(429).json({
        success: false,
        message: (error as Error).message,
        code: 'QUOTA_EXCEEDED'
      });
    }

    if ((error as Error).message.includes('not configured')) {
      return res.status(400).json({
        success: false,
        message: 'Twitter API not configured. Please contact administrator.',
        code: 'API_NOT_CONFIGURED'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Collection failed',
      error: (error as Error).message
    });
  }
});

/**
 * @swagger
 * /api/v1/twitter/collection-stats:
 *   get:
 *     summary: Get collection statistics for current month
 *     tags: [Twitter Collection]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Collection statistics retrieved successfully
 */
router.get('/collection-stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    const quota = await collectionManager.getQuotaStatus();
    
    // Get collection breakdown by day
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const monthlyTweets = await collectionManager['tweetRepository'].findMany({
      dateFrom: startOfMonth,
      dateTo: now
    }, { page: 1, limit: 1 });

    const analytics = await collectionManager['tweetRepository'].getAnalytics({
      dateFrom: startOfMonth,
      dateTo: now
    });

    res.json({
      success: true,
      data: {
        quota,
        monthlyStats: {
          totalTweets: monthlyTweets.pagination.total,
          totalEngagement: analytics.totalEngagement,
          averageEngagement: analytics.averageEngagement,
          topHashtags: analytics.topHashtags.slice(0, 5),
          languageDistribution: analytics.languageDistribution
        },
        timeline: analytics.timeline
      }
    });

  } catch (error) {
    console.error('[Collection] Stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get collection statistics',
      error: (error as Error).message
    });
  }
});

export { router as twitterCollectionRoutes };
