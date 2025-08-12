/**
 * Campaign Routes Module
 * Modular campaign management routes with separated handlers and middleware
 */

import { Router } from 'express';
import { authenticateToken, requireRole } from '../../../middleware/express-auth';
import {
  getCampaignsHandler,
  createCampaignHandler,
  getCampaignByIdHandler,
  updateCampaignHandler,
  deleteCampaignHandler,
  getCampaignTweetsHandler,
  getCampaignsOverviewHandler,
} from './handlers';
import {
  validateCreateCampaignRequest,
  validateUpdateCampaignRequest,
  validateCampaignId,
  validatePagination,
  logCampaignRequest,
} from './middleware';

const router = Router();

// Apply request logging to all campaign routes
router.use(logCampaignRequest);

/**
 * @swagger
 * components:
 *   schemas:
 *     Campaign:
 *       type: object
 *       required:
 *         - id
 *         - name
 *         - type
 *         - status
 *         - dataSources
 *         - startDate
 *         - endDate
 *       properties:
 *         id:
 *           type: string
 *           description: Unique campaign identifier
 *           example: 60f7b3b3b3b3b3b3b3b3b3b3
 *         name:
 *           type: string
 *           description: Campaign name
 *           maxLength: 100
 *           example: Summer Marketing Campaign 2024
 *         description:
 *           type: string
 *           description: Campaign description
 *           example: Track brand mentions during summer promotion
 *         type:
 *           type: string
 *           enum: [hashtag, keyword, mention, competitor]
 *           example: hashtag
 *         status:
 *           type: string
 *           enum: [draft, active, paused, completed, archived]
 *           example: active
 *         dataSources:
 *           type: array
 *           items:
 *             type: string
 *             enum: [twitter, instagram, facebook, tiktok, linkedin]
 *           example: [twitter, instagram]
 *         hashtags:
 *           type: array
 *           items:
 *             type: string
 *           example: [SummerVibes, BrandName, Promotion2024]
 *         keywords:
 *           type: array
 *           items:
 *             type: string
 *           example: [summer sale, discount, promotion]
 *         mentions:
 *           type: array
 *           items:
 *             type: string
 *           example: [@BrandName, @CompetitorName]
 *         startDate:
 *           type: string
 *           format: date-time
 *           example: 2024-06-01T00:00:00Z
 *         endDate:
 *           type: string
 *           format: date-time
 *           example: 2024-08-31T23:59:59Z
 *         maxTweets:
 *           type: integer
 *           minimum: 1
 *           example: 10000
 *         collectImages:
 *           type: boolean
 *           example: true
 *         sentimentAnalysis:
 *           type: boolean
 *           example: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: 2024-05-15T10:30:00Z
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           example: 2024-05-16T14:20:00Z
 *
 *     CreateCampaignRequest:
 *       type: object
 *       required:
 *         - name
 *         - type
 *         - dataSources
 *         - startDate
 *         - endDate
 *       properties:
 *         name:
 *           type: string
 *           maxLength: 100
 *           example: Summer Marketing Campaign 2024
 *         description:
 *           type: string
 *           example: Track brand mentions during summer promotion
 *         type:
 *           type: string
 *           enum: [hashtag, keyword, mention, competitor]
 *           example: hashtag
 *         dataSources:
 *           type: array
 *           items:
 *             type: string
 *             enum: [twitter, instagram, facebook, tiktok, linkedin]
 *           example: [twitter, instagram]
 *         hashtags:
 *           type: array
 *           items:
 *             type: string
 *           example: [SummerVibes, BrandName]
 *         keywords:
 *           type: array
 *           items:
 *             type: string
 *           example: [summer sale, discount]
 *         mentions:
 *           type: array
 *           items:
 *             type: string
 *           example: [@BrandName]
 *         startDate:
 *           type: string
 *           format: date-time
 *           example: 2024-06-01T00:00:00Z
 *         endDate:
 *           type: string
 *           format: date-time
 *           example: 2024-08-31T23:59:59Z
 *         maxTweets:
 *           type: integer
 *           minimum: 1
 *           default: 10000
 *           example: 10000
 *         collectImages:
 *           type: boolean
 *           default: true
 *           example: true
 *         sentimentAnalysis:
 *           type: boolean
 *           default: true
 *           example: true
 *
 *     UpdateCampaignRequest:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           maxLength: 100
 *           example: Updated Campaign Name
 *         description:
 *           type: string
 *           example: Updated campaign description
 *         status:
 *           type: string
 *           enum: [draft, active, paused, completed, archived]
 *           example: active
 *         maxTweets:
 *           type: integer
 *           minimum: 1
 *           example: 15000
 *         collectImages:
 *           type: boolean
 *           example: false
 *         sentimentAnalysis:
 *           type: boolean
 *           example: true
 *         startDate:
 *           type: string
 *           format: date-time
 *           example: 2024-06-01T00:00:00Z
 *         endDate:
 *           type: string
 *           format: date-time
 *           example: 2024-08-31T23:59:59Z
 */

/**
 * @swagger
 * /api/campaigns:
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
 *         description: Page number for pagination
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
 *         description: Campaigns retrieved successfully
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
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 20
 *                     total:
 *                       type: integer
 *                       example: 156
 *                     totalPages:
 *                       type: integer
 *                       example: 8
 *                     hasNext:
 *                       type: boolean
 *                       example: true
 *                     hasPrev:
 *                       type: boolean
 *                       example: false
 *       400:
 *         description: Invalid query parameters
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       403:
 *         description: Forbidden - insufficient permissions
 *       500:
 *         description: Internal server error
 */
router.get(
  '/',
  authenticateToken,
  requireRole(['admin', 'manager', 'analyst']),
  validatePagination,
  getCampaignsHandler
);

/**
 * @swagger
 * /api/campaigns:
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
 *             $ref: '#/components/schemas/CreateCampaignRequest'
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
 *                   example: Campaign created successfully
 *       400:
 *         description: Validation error - missing or invalid fields
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       403:
 *         description: Forbidden - insufficient permissions
 *       409:
 *         description: Conflict - campaign name already exists
 *       500:
 *         description: Internal server error
 */
router.post(
  '/',
  authenticateToken,
  requireRole(['admin', 'manager']),
  validateCreateCampaignRequest,
  createCampaignHandler
);

/**
 * @swagger
 * /api/campaigns/{id}:
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
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: Campaign ID (MongoDB ObjectId)
 *         example: 60f7b3b3b3b3b3b3b3b3b3b3
 *     responses:
 *       200:
 *         description: Campaign retrieved successfully
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
 *       400:
 *         description: Invalid campaign ID format
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       403:
 *         description: Forbidden - insufficient permissions
 *       404:
 *         description: Campaign not found
 *       500:
 *         description: Internal server error
 */
router.get(
  '/:id',
  authenticateToken,
  requireRole(['admin', 'manager', 'analyst']),
  validateCampaignId,
  getCampaignByIdHandler
);

/**
 * @swagger
 * /api/campaigns/{id}:
 *   put:
 *     summary: Update campaign
 *     description: Update an existing campaign's settings
 *     tags: [Campaigns]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: Campaign ID (MongoDB ObjectId)
 *         example: 60f7b3b3b3b3b3b3b3b3b3b3
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateCampaignRequest'
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
 *                   example: Campaign updated successfully
 *       400:
 *         description: Validation error or invalid campaign ID
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       403:
 *         description: Forbidden - insufficient permissions
 *       404:
 *         description: Campaign not found
 *       409:
 *         description: Conflict - campaign name already exists
 *       500:
 *         description: Internal server error
 */
router.put(
  '/:id',
  authenticateToken,
  requireRole(['admin', 'manager']),
  validateCampaignId,
  validateUpdateCampaignRequest,
  updateCampaignHandler
);

/**
 * @swagger
 * /api/campaigns/{id}:
 *   delete:
 *     summary: Delete campaign
 *     description: Soft delete a campaign (marks as deleted but preserves data)
 *     tags: [Campaigns]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: Campaign ID (MongoDB ObjectId)
 *         example: 60f7b3b3b3b3b3b3b3b3b3b3
 *     responses:
 *       200:
 *         description: Campaign deleted successfully
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
 *                   example: Campaign deleted successfully
 *       400:
 *         description: Invalid campaign ID format
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       403:
 *         description: Forbidden - insufficient permissions
 *       404:
 *         description: Campaign not found
 *       500:
 *         description: Internal server error
 */
router.delete(
  '/:id',
  authenticateToken,
  requireRole(['admin', 'manager']),
  validateCampaignId,
  deleteCampaignHandler
);

/**
 * @swagger
 * /api/campaigns/{campaignId}/tweets:
 *   get:
 *     summary: Get campaign tweets
 *     description: Retrieve tweets collected for a specific campaign
 *     tags: [Campaigns]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: campaignId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: Campaign ID (MongoDB ObjectId)
 *         example: 60f7b3b3b3b3b3b3b3b3b3b3
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of tweets per page
 *       - in: query
 *         name: sentiment
 *         schema:
 *           type: string
 *           enum: [positive, negative, neutral]
 *         description: Filter tweets by sentiment
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
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     description: Tweet data with sentiment analysis
 *       400:
 *         description: Invalid campaign ID or query parameters
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       403:
 *         description: Forbidden - insufficient permissions
 *       404:
 *         description: Campaign not found
 *       500:
 *         description: Internal server error
 */
router.get(
  '/:campaignId/tweets',
  authenticateToken,
  requireRole(['admin', 'manager', 'analyst']),
  validateCampaignId,
  validatePagination,
  getCampaignTweetsHandler
);

/**
 * @swagger
 * /api/campaigns/overview:
 *   get:
 *     summary: Get campaigns overview
 *     description: Get campaign statistics and recent campaigns summary
 *     tags: [Campaigns]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Campaigns overview retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     statistics:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                           example: 156
 *                         active:
 *                           type: integer
 *                           example: 12
 *                         draft:
 *                           type: integer
 *                           example: 8
 *                         completed:
 *                           type: integer
 *                           example: 136
 *                     recentCampaigns:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Campaign'
 *                       description: Last 10 created campaigns
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       403:
 *         description: Forbidden - insufficient permissions
 *       500:
 *         description: Internal server error
 */
router.get(
  '/overview',
  authenticateToken,
  requireRole(['admin', 'manager', 'analyst']),
  getCampaignsOverviewHandler
);

export default router;
