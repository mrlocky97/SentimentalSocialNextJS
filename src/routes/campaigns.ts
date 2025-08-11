/**
 * Campaign Routes with Swagger Documentation
 * API routes for campaign management with comprehensive documentation
 */

import { Router } from 'express';
import { MongoCampaignRepository } from '../repositories/mongo-campaign.repository';
import { TweetDatabaseService } from '../services/tweet-database.service';
import { authenticateToken, requireRole } from '../middleware/express-auth';
import {
  CreateCampaignRequest,
  UpdateCampaignRequest,
  CampaignFilter,
  CampaignStatus,
  CampaignType,
} from '../types/campaign';

const router = Router();
const campaignRepository = new MongoCampaignRepository();
const tweetDatabaseService = new TweetDatabaseService();

/**
 * @swagger
 * tags:
 *   name: Campaigns
 *   description: Campaign management for social media monitoring
 */

/**
 * @swagger
 * /api/v1/campaigns:
 *   get:
 *     summary: Get all campaigns
 *     description: Retrieve a paginated list of campaigns with filtering options
 *     tags: [Campaigns]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of campaigns per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, active, paused, completed, archived]
 *         description: Filter by campaign status
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [hashtag, keyword, mention, competitor]
 *         description: Filter by campaign type
 *       - in: query
 *         name: organizationId
 *         schema:
 *           type: string
 *         description: Filter by organization ID
 *     responses:
 *       200:
 *         description: Successfully retrieved campaigns
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Campaign'
 *                 pagination:
 *                   $ref: '#/components/schemas/PaginationInfo'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  '/',
  authenticateToken,
  requireRole(['admin', 'manager', 'analyst']),
  async (req, res) => {
    try {
      const { page = 1, limit = 20, status, type, organizationId } = req.query;

      // Build filter object
      const filter: CampaignFilter = {};
      if (status) filter.status = status as string as CampaignStatus;
      if (type) filter.type = type as string as CampaignType;
      if (organizationId) filter.organizationId = organizationId as string;

      // Convert pagination params
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;

      // Get campaigns with pagination
      const campaigns = await campaignRepository.findMany(filter, {
        offset,
        limit: limitNum,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      // Get total count for pagination
      const total = await campaignRepository.count(filter);
      const totalPages = Math.ceil(total / limitNum);

      res.json({
        success: true,
        data: campaigns,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1,
        },
      });
    } catch (error: unknown) {
      console.error('Error fetching campaigns:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to fetch campaigns',
          code: 'FETCH_CAMPAIGNS_ERROR',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/campaigns:
 *   post:
 *     summary: Create a new campaign
 *     description: Create a new social media monitoring campaign
 *     tags: [Campaigns]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 100
 *                 example: "Nike #JustDoIt Campaign Analysis"
 *               description:
 *                 type: string
 *                 maxLength: 500
 *                 example: "7-day analysis of Nike's latest JustDoIt campaign hashtag performance"
 *               type:
 *                 type: string
 *                 enum: [hashtag, keyword, mention, competitor]
 *                 example: "hashtag"
 *               dataSources:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [twitter, instagram, facebook, tiktok, linkedin]
 *                 example: ["twitter", "instagram"]
 *               hashtags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["JustDoIt", "Nike", "motivation"]
 *               keywords:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["running", "fitness", "sports"]
 *               mentions:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["@Nike", "@nikerunning"]
 *               startDate:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-07-15T00:00:00.000Z"
 *               endDate:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-07-22T23:59:59.000Z"
 *               timezone:
 *                 type: string
 *                 example: "America/New_York"
 *               maxTweets:
 *                 type: integer
 *                 minimum: 100
 *                 maximum: 1000000
 *                 example: 50000
 *               languages:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["en", "es"]
 *               organizationId:
 *                 type: string
 *                 example: "60d0fe4f5311236168a109cb"
 *     responses:
 *       201:
 *         description: Campaign created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Campaign'
 *                 message:
 *                   type: string
 *                   example: "Campaign created successfully"
 *       400:
 *         description: Bad request - validation errors
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', authenticateToken, requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const campaignData: CreateCampaignRequest = req.body;
    const user = (req as unknown as { user: { id: string } }).user;

    // Validate required fields
    if (
      !campaignData.name ||
      !campaignData.type ||
      !campaignData.dataSources ||
      !campaignData.startDate ||
      !campaignData.endDate
    ) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Missing required fields',
          code: 'MISSING_REQUIRED_FIELDS',
          details: {
            required: ['name', 'type', 'dataSources', 'startDate', 'endDate'],
            provided: Object.keys(req.body),
          },
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Validate that at least one tracking parameter is provided
    if (
      (!campaignData.hashtags || campaignData.hashtags.length === 0) &&
      (!campaignData.keywords || campaignData.keywords.length === 0) &&
      (!campaignData.mentions || campaignData.mentions.length === 0)
    ) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'At least one hashtag, keyword, or mention must be provided',
          code: 'NO_TRACKING_PARAMETERS',
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Add creator information
    const campaignToCreate = {
      ...campaignData,
      createdBy: user.id,
      hashtags: campaignData.hashtags || [],
      keywords: campaignData.keywords || [],
      mentions: campaignData.mentions || [],
      languages: campaignData.languages || ['en'],
    };

    // Create campaign
    const newCampaign = await campaignRepository.create(campaignToCreate);

    res.status(201).json({
      success: true,
      data: newCampaign,
      message: 'Campaign created successfully',
    });
  } catch (error: unknown) {
    console.error('Error creating campaign:', error);

    if (error instanceof Error) {
      if (error.message === 'VALIDATION_ERROR') {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Invalid campaign data',
            code: 'VALIDATION_ERROR',
            timestamp: new Date().toISOString(),
          },
        });
      }
      if (error.message === 'CAMPAIGN_NAME_EXISTS') {
        return res.status(409).json({
          success: false,
          error: {
            message: 'Campaign name already exists',
            code: 'CAMPAIGN_NAME_EXISTS',
            timestamp: new Date().toISOString(),
          },
        });
      }
    }

    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to create campaign',
        code: 'CREATE_CAMPAIGN_ERROR',
        timestamp: new Date().toISOString(),
      },
    });
  }
});

/**
 * @swagger
 * /api/v1/campaigns/{id}:
 *   get:
 *     summary: Get campaign by ID
 *     description: Retrieve a specific campaign by its ID
 *     tags: [Campaigns]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Campaign ID
 *     responses:
 *       200:
 *         description: Campaign found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Campaign'
 *       404:
 *         description: Campaign not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  '/:id',
  authenticateToken,
  requireRole(['admin', 'manager', 'analyst']),
  async (req, res) => {
    try {
      const { id } = req.params;

      // Validate MongoDB ObjectId format
      if (!id || id.length !== 24) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Invalid campaign ID format',
            code: 'INVALID_CAMPAIGN_ID',
            timestamp: new Date().toISOString(),
          },
        });
      }

      const campaign = await campaignRepository.findById(id);

      if (!campaign) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Campaign not found',
            code: 'CAMPAIGN_NOT_FOUND',
            timestamp: new Date().toISOString(),
          },
        });
      }

      res.json({
        success: true,
        data: campaign,
      });
    } catch (error: unknown) {
      console.error('Error fetching campaign:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to fetch campaign',
          code: 'FETCH_CAMPAIGN_ERROR',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/campaigns/{id}:
 *   put:
 *     summary: Update campaign
 *     description: Update an existing campaign's information
 *     tags: [Campaigns]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Campaign ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 100
 *               description:
 *                 type: string
 *                 maxLength: 500
 *               status:
 *                 type: string
 *                 enum: [draft, active, paused, completed, archived]
 *               maxTweets:
 *                 type: integer
 *                 minimum: 100
 *                 maximum: 1000000
 *               sentimentAnalysis:
 *                 type: boolean
 *               emotionAnalysis:
 *                 type: boolean
 *               topicsAnalysis:
 *                 type: boolean
 *               influencerAnalysis:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Campaign updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Campaign'
 *                 message:
 *                   type: string
 *                   example: "Campaign updated successfully"
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Campaign not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/:id', authenticateToken, requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { id } = req.params;
    const updateData: UpdateCampaignRequest = req.body;

    // Validate MongoDB ObjectId format
    if (!id || id.length !== 24) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid campaign ID format',
          code: 'INVALID_CAMPAIGN_ID',
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Update campaign
    const updatedCampaign = await campaignRepository.update(id, updateData);

    if (!updatedCampaign) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Campaign not found',
          code: 'CAMPAIGN_NOT_FOUND',
          timestamp: new Date().toISOString(),
        },
      });
    }

    res.json({
      success: true,
      data: updatedCampaign,
      message: 'Campaign updated successfully',
    });
  } catch (error: unknown) {
    console.error('Error updating campaign:', error);

    if (error instanceof Error) {
      if (error.message === 'VALIDATION_ERROR') {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Invalid campaign data',
            code: 'VALIDATION_ERROR',
            timestamp: new Date().toISOString(),
          },
        });
      }
      if (error.message === 'CANNOT_MODIFY_ACTIVE_CAMPAIGN') {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Cannot modify tracking parameters of active campaign',
            code: 'CANNOT_MODIFY_ACTIVE_CAMPAIGN',
            timestamp: new Date().toISOString(),
          },
        });
      }
    }

    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to update campaign',
        code: 'UPDATE_CAMPAIGN_ERROR',
        timestamp: new Date().toISOString(),
      },
    });
  }
});

/**
 * @swagger
 * /api/v1/campaigns/{id}:
 *   delete:
 *     summary: Delete campaign
 *     description: Archive a campaign (soft delete)
 *     tags: [Campaigns]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Campaign ID
 *     responses:
 *       200:
 *         description: Campaign archived successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Campaign archived successfully"
 *       404:
 *         description: Campaign not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:id', authenticateToken, requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId format
    if (!id || id.length !== 24) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid campaign ID format',
          code: 'INVALID_CAMPAIGN_ID',
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Check if campaign exists before archiving
    const existingCampaign = await campaignRepository.findById(id);
    if (!existingCampaign) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Campaign not found',
          code: 'CAMPAIGN_NOT_FOUND',
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Archive campaign (soft delete)
    const archived = await campaignRepository.delete(id);

    if (!archived) {
      return res.status(500).json({
        success: false,
        error: {
          message: 'Failed to archive campaign',
          code: 'ARCHIVE_CAMPAIGN_ERROR',
          timestamp: new Date().toISOString(),
        },
      });
    }

    res.json({
      success: true,
      message: 'Campaign archived successfully',
      data: { id, status: 'archived' },
    });
  } catch (error: unknown) {
    console.error('Error deleting campaign:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to delete campaign',
        code: 'DELETE_CAMPAIGN_ERROR',
        timestamp: new Date().toISOString(),
      },
    });
  }
});

/**
 * @swagger
 * /api/v1/campaigns/{campaignId}/tweets:
 *   get:
 *     summary: Get tweets from a specific campaign
 *     description: Retrieves stored tweets associated with a campaign ID
 *     tags: [Campaigns]
 *     parameters:
 *       - in: path
 *         name: campaignId
 *         required: true
 *         schema:
 *           type: string
 *         description: Campaign ID to retrieve tweets for
 *         example: "mi_campana_dev_2024"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 100
 *         description: Maximum number of tweets to retrieve
 *     responses:
 *       200:
 *         description: Campaign tweets retrieved successfully
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
 *                     campaignId:
 *                       type: string
 *                     totalTweets:
 *                       type: number
 *                     tweetsWithSentiment:
 *                       type: number
 *                     averageSentiment:
 *                       type: number
 *                     tweets:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Tweet'
 *                     statistics:
 *                       type: object
 *       404:
 *         description: Campaign not found
 *       500:
 *         description: Retrieval failed
 */
router.get('/:campaignId/tweets', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;

    if (!campaignId) {
      return res.status(400).json({
        success: false,
        error: 'Campaign ID is required',
      });
    }

    const tweets = await tweetDatabaseService.getTweetsByCampaign(campaignId, limit);

    // Calculate basic stats
    const totalTweets = tweets.length;
    const withSentiment = tweets.filter((t) => t.sentiment?.score !== undefined).length;
    const avgSentiment =
      withSentiment > 0
        ? tweets.reduce((sum, t) => sum + (t.sentiment?.score || 0), 0) / withSentiment
        : 0;

    res.json({
      success: true,
      data: {
        campaignId,
        totalTweets,
        tweetsWithSentiment: withSentiment,
        averageSentiment: avgSentiment,
        tweets: tweets,
        statistics: {
          sentiment_distribution: {
            positive: tweets.filter((t) => (t.sentiment?.score || 0) > 0.1).length,
            neutral: tweets.filter((t) => Math.abs(t.sentiment?.score || 0) <= 0.1).length,
            negative: tweets.filter((t) => (t.sentiment?.score || 0) < -0.1).length,
          },
          total_engagement: tweets.reduce(
            (sum, t) => sum + (t.metrics?.likes || 0) + (t.metrics?.retweets || 0),
            0
          ),
          unique_authors: [...new Set(tweets.map((t) => t.author?.username))].length,
        },
      },
      message: `Retrieved ${totalTweets} tweets for campaign: ${campaignId}`,
    });
  } catch (error) {
    console.error('Error retrieving campaign tweets:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to retrieve campaign tweets',
    });
  }
});

/**
 * @swagger
 * /api/v1/campaigns/overview:
 *   get:
 *     summary: Get campaigns overview with basic statistics
 *     description: Returns overview of all campaigns with tweet counts and basic metrics
 *     tags: [Campaigns]
 *     responses:
 *       200:
 *         description: Campaign overview retrieved successfully
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
 *                     overview:
 *                       type: object
 *                       properties:
 *                         totalTweets:
 *                           type: number
 *                         tweetsToday:
 *                           type: number
 *                         uniqueAuthors:
 *                           type: number
 *                         averageSentiment:
 *                           type: number
 *       500:
 *         description: Retrieval failed
 */
router.get('/overview', async (req, res) => {
  try {
    // Use the repository to get campaign statistics
    const stats = await tweetDatabaseService.getStorageStats();

    res.json({
      success: true,
      data: {
        overview: {
          totalTweets: stats.totalTweets,
          tweetsToday: stats.tweetsToday,
          uniqueAuthors: stats.uniqueAuthors,
          averageSentiment: stats.averageSentiment,
        },
        message:
          'Use specific campaign endpoints or database queries to get detailed campaign data',
      },
      message: 'Campaign overview retrieved successfully',
    });
  } catch (error) {
    console.error('Error retrieving campaign overview:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to retrieve campaign overview',
    });
  }
});

export default router;
