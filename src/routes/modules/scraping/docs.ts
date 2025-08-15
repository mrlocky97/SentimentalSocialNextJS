/**
 * Swagger docs for scraping endpoints extracted from legacy monolithic file.
 * Keeping them separate so the router & handlers stay lean (<200 LOC each).
 */
/**
 * @swagger
 * /api/v1/scraping/hashtag:
 *   post:
 *     summary: Scrape tweets by hashtag using twikit
 *     description: Collects tweets for a specific hashtag with sentiment analysis
 *     tags: [Twitter Scraping]
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
 *                 description: Hashtag to search (without #)
 *                 example: "JustDoIt"
 *               maxTweets:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 1000
 *                 example: 50
 *               limit:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 1000
 *                 example: 50
 *               includeReplies:
 *                 type: boolean
 *                 default: false
 *               analyzeSentiment:
 *                 type: boolean
 *                 default: true
 *               language:
 *                 type: string
 *                 enum: ["en", "es", "fr", "de"]
 *                 default: "en"
 *                 example: "es"
 *               campaignId:
 *                 type: string
 *                 example: "my_nike_campaign_2024"
 *     responses:
 *       200:
 *         description: Tweets scraped successfully
 *       400:
 *         description: Invalid request parameters
 *       500:
 *         description: Scraping failed
 */
/**
 * @swagger
 * /api/v1/scraping/user:
 *   post:
 *     summary: Scrape tweets from a specific user
 *     description: Collects recent tweets from a specific Twitter user
 *     tags: [Twitter Scraping]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *             properties:
 *               username:
 *                 type: string
 *                 example: "nike"
 *               maxTweets:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 500
 *                 example: 30
 *               limit:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 500
 *                 example: 30
 *               includeReplies:
 *                 type: boolean
 *                 default: false
 *               analyzeSentiment:
 *                 type: boolean
 *                 default: true
 *               campaignId:
 *                 type: string
 *                 example: "nike_monitoring_campaign"
 *     responses:
 *       200:
 *         description: User tweets scraped successfully
 *       400:
 *         description: Invalid username
 *       500:
 *         description: Scraping failed
 */
/**
 * @swagger
 * /api/v1/scraping/search:
 *   post:
 *     summary: Search and scrape tweets by keyword
 *     description: Collects tweets matching a search query with sentiment analysis
 *     tags: [Twitter Scraping]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - query
 *             properties:
 *               query:
 *                 type: string
 *                 example: "nike shoes OR adidas sneakers"
 *               maxTweets:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 1000
 *                 example: 50
 *               limit:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 1000
 *                 example: 50
 *               language:
 *                 type: string
 *                 enum: ["en", "es", "fr", "de"]
 *                 default: "en"
 *                 example: "es"
 *               analyzeSentiment:
 *                 type: boolean
 *                 default: true
 *               campaignId:
 *                 type: string
 *                 example: "search_nike_vs_adidas_2024"
 *     responses:
 *       200:
 *         description: Search completed successfully
 *       400:
 *         description: Invalid search query
 *       500:
 *         description: Search failed
 */
/**
 * @swagger
 * /api/v1/scraping/status:
 *   get:
 *     summary: Get scraping service status
 *     description: Returns current status of the scraping service including rate limits
 *     tags: [Twitter Scraping]
 *     responses:
 *       200:
 *         description: Status retrieved successfully
 */
/**
 * @swagger
 * /api/v1/scraping/reauth:
 *   post:
 *     summary: Force Twitter re-authentication
 *     description: Attempts to re-authenticate with Twitter if authentication failed during startup
 *     tags: [Twitter Scraping]
 *     responses:
 *       200:
 *         description: Re-authentication attempted
 *       500:
 *         description: Re-authentication failed
 */
/**
 * @swagger
 * /api/v1/scraping/tweets:
 *   get:
 *     summary: Verify tweets in database
 *     description: Check tweets stored in database with optional campaign filter
 *     tags: [Database Verification]
 *     parameters:
 *       - in: query
 *         name: campaignId
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 10
 *     responses:
 *       200:
 *         description: Tweets retrieved successfully
 */
export {};
