/**
 * Swagger docs for scraping endpoints extracted from legacy monolithic file.
 * Keeping them separate so the router & handlers stay lean (<200 LOC each).
 */
/**
 * @swagger
 * /api/v1/scraping/hashtag:
 *   post:
 *     summary: Scrape tweets by hashtag using twikit
 *     description: Collects tweets for a specific hashtag or multiple hashtags with sentiment analysis
 *     tags: [Twitter Scraping]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - oneOf:
 *                 - hashtag
 *                 - hashtags
 *             properties:
 *               hashtag:
 *                 type: string
 *                 description: Single hashtag to search (with or without #)
 *                 example: "JustDoIt"
 *               hashtags:
 *                 type: array
 *                 description: Multiple hashtags to search (with or without #)
 *                 items:
 *                   type: string
 *                 example: ["JustDoIt", "Marketing", "#Nike"]
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
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: true
 *                     data:
 *                       type: object
 *                       properties:
 *                         hashtag:
 *                           type: string
 *                           example: "#JustDoIt"
 *                         requested:
 *                           type: number
 *                           example: 50
 *                         totalFound:
 *                           type: number
 *                           example: 150
 *                         totalScraped:
 *                           type: number
 *                           example: 50
 *                         tweets:
 *                           type: array
 *                           items:
 *                             type: object
 *                         sentiment_summary:
 *                           type: object
 *                         campaignId:
 *                           type: string
 *                           example: "my_nike_campaign_2024"
 *                     message:
 *                       type: string
 *                       example: "Scraped 50/50 hashtag tweets with sentiment"
 *                 - type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: true
 *                     data:
 *                       type: object
 *                       properties:
 *                         hashtags:
 *                           type: array
 *                           items:
 *                             type: string
 *                           example: ["#JustDoIt", "#Marketing", "#Nike"]
 *                         items:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               hashtag:
 *                                 type: string
 *                                 example: "#JustDoIt"
 *                               tweetCount:
 *                                 type: number
 *                                 example: 25
 *                               totalFound:
 *                                 type: number
 *                                 example: 100
 *                               sentiment_summary:
 *                                 type: object
 *                         totalTweets:
 *                           type: number
 *                           example: 75
 *                         campaignId:
 *                           type: string
 *                           example: "my_nike_campaign_2024"
 *                     message:
 *                       type: string
 *                       example: "Scraped 75 tweets from 3 hashtags"
 *       400:
 *         description: Invalid request parameters
 *       500:
 *         description: Scraping failed
 */
/**
 * @swagger
 * /api/v1/scraping/user:
 *   post:
 *     summary: Scrape tweets from one or more users
 *     description: Collects recent tweets from specific Twitter users
 *     tags: [Twitter Scraping]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - oneOf:
 *                 - username
 *                 - usernames
 *             properties:
 *               username:
 *                 type: string
 *                 description: Single username to search (with or without @)
 *                 example: "nike"
 *               usernames:
 *                 type: array
 *                 description: Multiple usernames to search (with or without @)
 *                 items:
 *                   type: string
 *                 example: ["nike", "adidas", "@puma"]
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
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: true
 *                     data:
 *                       type: object
 *                       properties:
 *                         user:
 *                           type: string
 *                           example: "@nike"
 *                         requested:
 *                           type: number
 *                           example: 30
 *                         totalFound:
 *                           type: number
 *                           example: 100
 *                         totalScraped:
 *                           type: number
 *                           example: 30
 *                         tweets:
 *                           type: array
 *                           items:
 *                             type: object
 *                         sentiment_summary:
 *                           type: object
 *                         campaignId:
 *                           type: string
 *                           example: "nike_monitoring_campaign"
 *                     message:
 *                       type: string
 *                       example: "Scraped 30/30 user tweets with sentiment"
 *                 - type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: true
 *                     data:
 *                       type: object
 *                       properties:
 *                         usernames:
 *                           type: array
 *                           items:
 *                             type: string
 *                           example: ["@nike", "@adidas", "@puma"]
 *                         items:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               username:
 *                                 type: string
 *                                 example: "@nike"
 *                               tweetCount:
 *                                 type: number
 *                                 example: 25
 *                               totalFound:
 *                                 type: number
 *                                 example: 100
 *                               sentiment_summary:
 *                                 type: object
 *                         totalTweets:
 *                           type: number
 *                           example: 75
 *                         campaignId:
 *                           type: string
 *                           example: "nike_monitoring_campaign"
 *                     message:
 *                       type: string
 *                       example: "Scraped 75 tweets from 3 users"
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
 *     description: Collects tweets matching one or more search queries with sentiment analysis
 *     tags: [Twitter Scraping]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - oneOf:
 *                 - query
 *                 - queries
 *             properties:
 *               query:
 *                 type: string
 *                 description: Single search query
 *                 example: "nike shoes OR adidas sneakers"
 *               queries:
 *                 type: array
 *                 description: Multiple search queries
 *                 items:
 *                   type: string
 *                 example: ["nike shoes", "adidas sneakers", "puma sportswear"]
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
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: true
 *                     data:
 *                       type: object
 *                       properties:
 *                         search:
 *                           type: string
 *                           example: "nike shoes OR adidas sneakers"
 *                         requested:
 *                           type: number
 *                           example: 50
 *                         totalFound:
 *                           type: number
 *                           example: 200
 *                         totalScraped:
 *                           type: number
 *                           example: 50
 *                         tweets:
 *                           type: array
 *                           items:
 *                             type: object
 *                         sentiment_summary:
 *                           type: object
 *                         campaignId:
 *                           type: string
 *                           example: "search_nike_vs_adidas_2024"
 *                     message:
 *                       type: string
 *                       example: "Scraped 50/50 search tweets with sentiment"
 *                 - type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: true
 *                     data:
 *                       type: object
 *                       properties:
 *                         queries:
 *                           type: array
 *                           items:
 *                             type: string
 *                           example: ["nike shoes", "adidas sneakers", "puma sportswear"]
 *                         items:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               query:
 *                                 type: string
 *                                 example: "nike shoes"
 *                               tweetCount:
 *                                 type: number
 *                                 example: 25
 *                               totalFound:
 *                                 type: number
 *                                 example: 100
 *                               sentiment_summary:
 *                                 type: object
 *                         totalTweets:
 *                           type: number
 *                           example: 75
 *                         campaignId:
 *                           type: string
 *                           example: "search_nike_vs_adidas_2024"
 *                     message:
 *                       type: string
 *                       example: "Scraped 75 tweets from 3 search queries"
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
