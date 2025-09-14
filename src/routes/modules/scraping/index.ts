import { Router } from "express";
import {
  getScrapingStatus,
  listTweets,
  scrapeHashtag,
  scrapeSearch,
  scrapeUser,
} from "./handlers";

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Twitter Scraping
 *     description: Tweet scraping & sentiment analysis operations
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     ScrapingStatusResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           properties:
 *             status:
 *               type: string
 *               enum: [active, inactive, error, maintenance]
 *               description: Current scraping service status
 *             isEnabled:
 *               type: boolean
 *               description: Whether scraping is currently enabled
 *             lastActivity:
 *               type: string
 *               format: date-time
 *               description: Last scraping activity timestamp
 *             totalTweets:
 *               type: number
 *               description: Total number of tweets scraped
 *             rateLimitStatus:
 *               type: object
 *               properties:
 *                 remaining:
 *                   type: number
 *                 resetTime:
 *                   type: string
 *                   format: date-time
 *             activeJobs:
 *               type: number
 *               description: Number of active scraping jobs
 *         message:
 *           type: string
 *           example: "Scraping status retrieved successfully"
 *         timestamp:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/v1/scraping/status:
 *   get:
 *     tags: [Twitter Scraping]
 *     summary: Get scraping service status
 *     description: Get current status and statistics of the Twitter scraping service
 *     responses:
 *       200:
 *         description: Scraping status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ScrapingStatusResponse'
 *       403:
 *         description: Scraping service is disabled
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Scraping service is disabled"
 *                 message:
 *                   type: string
 *                   example: "Set ENABLE_SCRAPING=true to enable scraping functionality"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Internal server error"
 */

/**
 * @swagger
 * /api/v1/scraping/hashtag:
 *   post:
 *     tags: [Twitter Scraping]
 *     summary: Scrape tweets by hashtag
 *     description: Scrape tweets containing specific hashtags for a campaign
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - hashtag
 *               - campaignId
 *             properties:
 *               hashtag:
 *                 type: string
 *                 description: Hashtag to search (with or without #)
 *                 example: "marketing"
 *               campaignId:
 *                 type: string
 *                 description: Campaign identifier to organize scraped tweets
 *                 example: "nike_marketing_2024"
 *               limit:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 100
 *                 default: 20
 *                 description: Maximum number of tweets to scrape
 *               includeReplies:
 *                 type: boolean
 *                 default: false
 *                 description: Whether to include reply tweets
 *               language:
 *                 type: string
 *                 description: Language filter (ISO 639-1 code)
 *                 example: "en"
 *     responses:
 *       200:
 *         description: Hashtag scraping completed successfully
 *       400:
 *         description: Missing required parameters (hashtag or campaignId)
 *       403:
 *         description: Scraping service is disabled
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/v1/scraping/user:
 *   post:
 *     tags: [Twitter Scraping]
 *     summary: Scrape tweets from user
 *     description: Scrape tweets from a specific Twitter user for a campaign
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - campaignId
 *             properties:
 *               username:
 *                 type: string
 *                 description: Twitter username (with or without @)
 *                 example: "elonmusk"
 *               campaignId:
 *                 type: string
 *                 description: Campaign identifier to organize scraped tweets
 *                 example: "tesla_analysis_2024"
 *               limit:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 100
 *                 default: 20
 *               includeRetweets:
 *                 type: boolean
 *                 default: false
 *               language:
 *                 type: string
 *                 description: Language filter (ISO 639-1 code)
 *                 example: "en"
 *     responses:
 *       200:
 *         description: User scraping completed successfully
 *       400:
 *         description: Missing required parameters (username or campaignId)
 *       403:
 *         description: Scraping service is disabled
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/v1/scraping/search:
 *   post:
 *     tags: [Twitter Scraping]
 *     summary: Scrape tweets by search query
 *     description: Scrape tweets matching a specific search query for a campaign
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - query
 *               - campaignId
 *             properties:
 *               query:
 *                 type: string
 *                 description: Search query string
 *                 example: "artificial intelligence"
 *               campaignId:
 *                 type: string
 *                 description: Campaign identifier to organize scraped tweets
 *                 example: "ai_research_2024"
 *               limit:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 100
 *                 default: 20
 *               language:
 *                 type: string
 *                 description: Language filter (ISO 639-1 code)
 *                 example: "en"
 *     responses:
 *       200:
 *         description: Search scraping completed successfully
 *       400:
 *         description: Missing required parameters (query or campaignId)
 *       403:
 *         description: Scraping service is disabled
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/v1/scraping/tweets:
 *   get:
 *     tags: [Twitter Scraping]
 *     summary: List scraped tweets
 *     description: Retrieve list of previously scraped tweets
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of tweets to retrieve
 *       - in: query
 *         name: offset
 *         schema:
 *           type: number
 *           minimum: 0
 *           default: 0
 *         description: Number of tweets to skip
 *       - in: query
 *         name: sentiment
 *         schema:
 *           type: string
 *           enum: [positive, negative, neutral]
 *         description: Filter by sentiment
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
 *                     type: object
 *                     properties:
 *                       tweetId:
 *                         type: string
 *                       content:
 *                         type: string
 *                       author:
 *                         type: object
 *                       sentiment:
 *                         type: object
 *                       scrapedAt:
 *                         type: string
 *                         format: date-time
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: number
 *                     limit:
 *                       type: number
 *                     offset:
 *                       type: number
 *       403:
 *         description: Scraping service is disabled
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/v1/scraping/hashtag/async:
 *   post:
 *     tags: [Twitter Scraping]
 *     summary: Scrape hashtag tweets asynchronously
 *     description: Start hashtag scraping process and return immediately. Monitor progress via WebSocket.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - hashtag
 *               - campaignId
 *             properties:
 *               hashtag:
 *                 type: string
 *                 description: Twitter hashtag (with or without #)
 *                 example: "JustDoIt"
 *               campaignId:
 *                 type: string
 *                 description: Campaign identifier
 *                 example: "nike_campaign_2024"
 *               maxTweets:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 1000
 *                 default: 100
 *     responses:
 *       200:
 *         description: Scraping process started successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 campaignId:
 *                   type: string
 *                 message:
 *                   type: string
 *                 estimatedDuration:
 *                   type: number
 *                 status:
 *                   type: string
 *                 progress:
 *                   type: object
 *       400:
 *         description: Missing required parameters
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/v1/scraping/user/async:
 *   post:
 *     tags: [Twitter Scraping]
 *     summary: Scrape user tweets asynchronously
 *     description: Start user scraping process and return immediately. Monitor progress via WebSocket.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - campaignId
 *             properties:
 *               username:
 *                 type: string
 *                 description: Twitter username (with or without @)
 *                 example: "elonmusk"
 *               campaignId:
 *                 type: string
 *                 description: Campaign identifier
 *                 example: "tesla_analysis_2024"
 *               maxTweets:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 1000
 *                 default: 100
 *     responses:
 *       200:
 *         description: Scraping process started successfully
 *       400:
 *         description: Missing required parameters
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/v1/scraping/search/async:
 *   post:
 *     tags: [Twitter Scraping]
 *     summary: Scrape search query tweets asynchronously
 *     description: Start search scraping process and return immediately. Monitor progress via WebSocket.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - query
 *               - campaignId
 *             properties:
 *               query:
 *                 type: string
 *                 description: Search query string
 *                 example: "artificial intelligence"
 *               campaignId:
 *                 type: string
 *                 description: Campaign identifier
 *                 example: "ai_research_2024"
 *               maxTweets:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 1000
 *                 default: 100
 *     responses:
 *       200:
 *         description: Scraping process started successfully
 *       400:
 *         description: Missing required parameters
 *       500:
 *         description: Internal server error
 */

router.post("/hashtag", scrapeHashtag);
router.post("/user", scrapeUser);
router.post("/search", scrapeSearch);
router.get("/status", getScrapingStatus);
// router.post("/reauth", forceReauth);
router.get("/tweets", listTweets);

export default router;
