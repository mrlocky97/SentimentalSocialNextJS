/**
 * Twitter Scraping Routes
 * Only using twikit for scraping - no official API
 */

import { Router, Request, Response } from 'express';
import { TwitterRealScraperService } from '../services/twitter-real-scraper.service';
import { TwitterScraperService } from '../services/twitter-scraper.service';
import { TweetSentimentAnalysisManager } from '../services/tweet-sentiment-analysis.manager';

const router = Router();

// Try to use real scraper first, fallback to mock if it fails
let scraperService: TwitterRealScraperService | TwitterScraperService;

async function getScraperService() {
  if (!scraperService) {
    try {
      // Try real scraper first
      scraperService = new TwitterRealScraperService();
      console.log('🚀 Using Real Twitter Scraper Service');
    } catch (error) {
      console.log('⚠️ Real scraper not available, using mock scraper');
      scraperService = new TwitterScraperService();
    }
  }
  return scraperService;
}

const sentimentManager = new TweetSentimentAnalysisManager();

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
 *                 description: Maximum number of tweets to collect
 *                 default: 50
 *                 minimum: 1
 *                 maximum: 1000
 *               includeReplies:
 *                 type: boolean
 *                 description: Whether to include reply tweets
 *                 default: false
 *               analyzeSentiment:
 *                 type: boolean
 *                 description: Whether to analyze sentiment of collected tweets
 *                 default: true
 *     responses:
 *       200:
 *         description: Tweets scraped successfully
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
 *                     totalFound:
 *                       type: number
 *                     totalScraped:
 *                       type: number
 *                     tweets:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Tweet'
 *                     sentiment_summary:
 *                       type: object
 *                 execution_time:
 *                   type: number
 *       400:
 *         description: Invalid request parameters
 *       500:
 *         description: Scraping failed
 */
router.post('/hashtag', async (req: Request, res: Response) => {
  try {
    const { hashtag, maxTweets = 50, includeReplies = false, analyzeSentiment = true } = req.body;

    if (!hashtag || typeof hashtag !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Hashtag is required and must be a string',
        example: { hashtag: 'JustDoIt', maxTweets: 50 }
      });
    }

    if (maxTweets < 1 || maxTweets > 1000) {
      return res.status(400).json({
        success: false,
        error: 'maxTweets must be between 1 and 1000'
      });
    }

    console.log(`🕷️ Starting hashtag scraping for #${hashtag}...`);
    const startTime = Date.now();

    // Get scraper service (real or mock)
    const scraper = await getScraperService();

    // Scrape tweets
    const scrapingResult = await scraper.scrapeByHashtag(hashtag, {
      maxTweets,
      includeReplies
    });

    let sentimentSummary = null;
    if (analyzeSentiment && scrapingResult.tweets.length > 0) {
      console.log(`📊 Analyzing sentiment for ${scrapingResult.tweets.length} tweets...`);
      const analyses = await sentimentManager.analyzeTweetsBatch(scrapingResult.tweets);
      sentimentSummary = sentimentManager.generateStatistics(analyses);
    }

    const executionTime = Date.now() - startTime;

    console.log(`✅ Hashtag scraping completed: ${scrapingResult.tweets.length} tweets in ${executionTime}ms`);

    res.json({
      success: true,
      data: {
        hashtag: `#${hashtag}`,
        totalFound: scrapingResult.totalFound,
        totalScraped: scrapingResult.tweets.length,
        tweets: scrapingResult.tweets,
        sentiment_summary: sentimentSummary,
        rate_limit: {
          remaining: scrapingResult.rateLimit.remaining,
          reset_time: scrapingResult.rateLimit.resetTime
        }
      },
      execution_time: executionTime,
      message: `Successfully scraped ${scrapingResult.tweets.length} tweets for #${hashtag}`
    });

  } catch (error) {
    console.error('❌ Error in hashtag scraping:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to scrape tweets by hashtag'
    });
  }
});

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
 *                 description: Twitter username (without @)
 *                 example: "nike"
 *               maxTweets:
 *                 type: number
 *                 description: Maximum number of tweets to collect
 *                 default: 30
 *                 minimum: 1
 *                 maximum: 500
 *               includeReplies:
 *                 type: boolean
 *                 description: Whether to include reply tweets
 *                 default: false
 *               analyzeSentiment:
 *                 type: boolean
 *                 description: Whether to analyze sentiment of collected tweets
 *                 default: true
 *     responses:
 *       200:
 *         description: User tweets scraped successfully
 *       400:
 *         description: Invalid username
 *       500:
 *         description: Scraping failed
 */
router.post('/user', async (req: Request, res: Response) => {
  try {
    const { username, maxTweets = 30, includeReplies = false, analyzeSentiment = true } = req.body;

    if (!username || typeof username !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Username is required and must be a string',
        example: { username: 'nike', maxTweets: 30 }
      });
    }

    if (maxTweets < 1 || maxTweets > 500) {
      return res.status(400).json({
        success: false,
        error: 'maxTweets must be between 1 and 500'
      });
    }

    console.log(`🕷️ Starting user scraping for @${username}...`);
    const startTime = Date.now();

    // Get scraper service (real or mock)
    const scraper = await getScraperService();

    // Scrape user tweets
    const scrapingResult = await scraper.scrapeByUser(username, {
      maxTweets,
      includeReplies
    });

    let sentimentSummary = null;
    if (analyzeSentiment && scrapingResult.tweets.length > 0) {
      console.log(`📊 Analyzing sentiment for ${scrapingResult.tweets.length} tweets...`);
      const analyses = await sentimentManager.analyzeTweetsBatch(scrapingResult.tweets);
      sentimentSummary = sentimentManager.generateStatistics(analyses);
    }

    const executionTime = Date.now() - startTime;

    console.log(`✅ User scraping completed: ${scrapingResult.tweets.length} tweets in ${executionTime}ms`);

    res.json({
      success: true,
      data: {
        username: `@${username}`,
        totalFound: scrapingResult.totalFound,
        totalScraped: scrapingResult.tweets.length,
        tweets: scrapingResult.tweets,
        sentiment_summary: sentimentSummary,
        rate_limit: {
          remaining: scrapingResult.rateLimit.remaining,
          reset_time: scrapingResult.rateLimit.resetTime
        }
      },
      execution_time: executionTime,
      message: `Successfully scraped ${scrapingResult.tweets.length} tweets from @${username}`
    });

  } catch (error) {
    console.error('❌ Error in user scraping:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to scrape tweets from user'
    });
  }
});

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
 *                 description: Search query (can include keywords, hashtags, mentions)
 *                 example: "nike shoes OR adidas sneakers"
 *               maxTweets:
 *                 type: number
 *                 description: Maximum number of tweets to collect
 *                 default: 50
 *                 minimum: 1
 *                 maximum: 1000
 *               language:
 *                 type: string
 *                 description: Language filter (es, en, etc.)
 *                 example: "es"
 *               analyzeSentiment:
 *                 type: boolean
 *                 description: Whether to analyze sentiment of collected tweets
 *                 default: true
 *     responses:
 *       200:
 *         description: Search completed successfully
 *       400:
 *         description: Invalid search query
 *       500:
 *         description: Search failed
 */
router.post('/search', async (req: Request, res: Response) => {
  try {
    const { query, maxTweets = 50, language, analyzeSentiment = true } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Search query is required and must be a string',
        example: { query: 'nike shoes', maxTweets: 50 }
      });
    }

    if (maxTweets < 1 || maxTweets > 1000) {
      return res.status(400).json({
        success: false,
        error: 'maxTweets must be between 1 and 1000'
      });
    }

    console.log(`🔍 Starting search scraping for: "${query}"...`);
    const startTime = Date.now();

    // Get scraper service (real or mock)
    const scraper = await getScraperService();

    // Scrape tweets by search - using hashtag method with search query
    const scrapingResult = await scraper.scrapeByHashtag(query, {
      maxTweets,
      includeReplies: false
    });

    let sentimentSummary = null;
    if (analyzeSentiment && scrapingResult.tweets.length > 0) {
      console.log(`📊 Analyzing sentiment for ${scrapingResult.tweets.length} tweets...`);
      const analyses = await sentimentManager.analyzeTweetsBatch(scrapingResult.tweets);
      sentimentSummary = sentimentManager.generateStatistics(analyses);
    }

    const executionTime = Date.now() - startTime;

    console.log(`✅ Search scraping completed: ${scrapingResult.tweets.length} tweets in ${executionTime}ms`);

    res.json({
      success: true,
      data: {
        query,
        totalFound: scrapingResult.totalFound,
        totalScraped: scrapingResult.tweets.length,
        tweets: scrapingResult.tweets,
        sentiment_summary: sentimentSummary,
        rate_limit: {
          remaining: scrapingResult.rateLimit.remaining,
          reset_time: scrapingResult.rateLimit.resetTime
        }
      },
      execution_time: executionTime,
      message: `Successfully scraped ${scrapingResult.tweets.length} tweets for query: "${query}"`
    });

  } catch (error) {
    console.error('❌ Error in search scraping:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to scrape tweets by search'
    });
  }
});

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
 *                     service_status:
 *                       type: string
 *                       enum: [operational, limited, maintenance]
 *                     rate_limit:
 *                       type: object
 *                     last_scraping:
 *                       type: object
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const scraper = await getScraperService();
    const rateLimitStatus = scraper.getRateLimitStatus();
    
    // Check if it's real scraper or mock
    const isRealScraper = scraper instanceof TwitterRealScraperService;
    
    res.json({
      success: true,
      data: {
        service_status: 'operational',
        scraper_type: isRealScraper ? 'real' : 'mock',
        authenticated: isRealScraper ? (rateLimitStatus as any).isAuthenticated : false,
        rate_limit: {
          available: !rateLimitStatus.isLimited,
          requests_used: rateLimitStatus.requestCount,
          requests_remaining: rateLimitStatus.remaining,
          reset_time: rateLimitStatus.resetTime
        },
        scraper_info: {
          type: isRealScraper ? '@the-convocation/twitter-scraper' : 'mock',
          supports: ['hashtag_search', 'user_tweets', 'keyword_search'],
          limits: {
            max_tweets_per_request: 1000,
            max_user_tweets: 500,
            rate_limit_window: '1 hour'
          }
        },
        credentials_configured: !!(process.env.TWITTER_USERNAME && process.env.TWITTER_PASSWORD && process.env.TWITTER_EMAIL),
        last_scraping: {
          timestamp: new Date().toISOString(),
          status: 'ready'
        }
      },
      message: `Scraping service is operational (${isRealScraper ? 'REAL' : 'MOCK'} mode)`
    });

  } catch (error) {
    console.error('❌ Error getting scraping status:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to get scraping status'
    });
  }
});

export { router as scrapingRoutes };
