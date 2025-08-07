/**
 * Twitter Scraping Routes
 * Using twikit for scraping - no official API
 */

import { Router, Request, Response } from 'express';
import { TwitterRealScraperService } from '../services/twitter-scraper.service';
import { TweetSentimentAnalysisManager } from '../services/tweet-sentiment-analysis.manager.service';
import { TweetDatabaseService } from '../services/tweet-database.service';
import { TwitterAuthManager } from '../services/twitter-auth-manager.service';

const router = Router();

let realScraperService: TwitterRealScraperService | null = null;

// Initialize services
const sentimentManager = new TweetSentimentAnalysisManager();
const tweetDatabaseService = new TweetDatabaseService();

async function getRealScraperService(): Promise<TwitterRealScraperService> {
  // Use pre-authenticated scraper from startup
  const twitterAuth = TwitterAuthManager.getInstance();
  
  if (twitterAuth.isReady()) {
    return twitterAuth.getScraperService();
  } else {
    // Fallback: create new instance if startup auth failed
    if (!realScraperService) {
      realScraperService = new TwitterRealScraperService();
    }
    return realScraperService;
  }
}

// Unified scraping function using real scraper
async function performScraping<T>(
  scrapingOperation: (scraper: TwitterRealScraperService) => Promise<T>,
  operationName: string
): Promise<T> {
  try {
    const realScraper = await getRealScraperService();
    return await scrapingOperation(realScraper);
  } catch (error) {
    console.error(`Real scraper failed for ${operationName}:`, error);
    throw error;
  }
}

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
 *                 description: Maximum number of tweets to collect (alternative to limit)
 *                 minimum: 1
 *                 maximum: 1000
 *                 example: 50
 *               limit:
 *                 type: number
 *                 description: Maximum number of tweets to collect (takes priority over maxTweets if provided). If neither is provided, defaults to 50
 *                 minimum: 1
 *                 maximum: 1000
 *                 example: 50
 *               includeReplies:
 *                 type: boolean
 *                 description: Whether to include reply tweets
 *                 default: false
 *               analyzeSentiment:
 *                 type: boolean
 *                 description: Whether to analyze sentiment of collected tweets
 *                 default: true
 *               language:
 *                 type: string
 *                 enum: ["en", "es", "fr", "de", "it", "pt", "ja", "ko", "zh", "ar", "ru", "hi", "all"]
 *                 default: "en"
 *                 description: Language filter for tweets (ISO 639-1 codes or 'all' for no filter). Defaults to English
 *                 example: "es"
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
    const { 
      hashtag, 
      maxTweets, // No default value - will be set below
      limit, // Alternative parameter name
      includeReplies = false, 
      analyzeSentiment = true, 
      language = 'en' // Default to English instead of 'all'
    } = req.body;

    // Use limit if provided, otherwise use maxTweets, otherwise default to 50
    const tweetsToRetrieve = limit || maxTweets || 50;

    if (!hashtag || typeof hashtag !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Hashtag is required and must be a string',
        example: { hashtag: 'JustDoIt', maxTweets: 50 }
      });
    }

    if (tweetsToRetrieve < 1 || tweetsToRetrieve > 1000) {
      return res.status(400).json({
        success: false,
        error: 'maxTweets/limit must be between 1 and 1000',
        provided: tweetsToRetrieve
      });
    }

    // Validate language parameter
    const validLanguages = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh', 'ar', 'ru', 'hi', 'all'];
    if (language && !validLanguages.includes(language)) {
      return res.status(400).json({
        success: false,
        error: `Invalid language code. Must be one of: ${validLanguages.join(', ')}`,
        example: { language: 'es' }
      });
    }

    const startTime = Date.now();

    // Use unified scraping function with real scraper
    const scrapingResult = await performScraping(
      async (scraper) => await scraper.scrapeByHashtag(hashtag, {
        maxTweets: tweetsToRetrieve,
        includeReplies,
        language
      }),
      `hashtag scraping for #${hashtag}`
    );

    let sentimentSummary = null;
    if (analyzeSentiment && scrapingResult.tweets.length > 0) {
      const analyses = await sentimentManager.analyzeTweetsBatch(scrapingResult.tweets);
      sentimentSummary = sentimentManager.generateStatistics(analyses);
    }

    // Save tweets to database automatically
    if (scrapingResult.tweets.length > 0) {
      try {
        const saveResult = await tweetDatabaseService.saveTweetsBulk(scrapingResult.tweets);
      } catch (dbError) {
        console.error('Error saving tweets to database:', dbError);
        // Don't fail the response, just log the error
      }
    }

    const executionTime = Date.now() - startTime;


    res.json({
      success: true,
      data: {
        hashtag: `#${hashtag}`,
        requested: tweetsToRetrieve,
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
      message: `Successfully scraped ${scrapingResult.tweets.length} of ${tweetsToRetrieve} requested tweets for #${hashtag}`
    });

  } catch (error) {
    console.error('Error in hashtag scraping:', error);
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
 *                 description: Maximum number of tweets to collect (alternative to limit)
 *                 minimum: 1
 *                 maximum: 500
 *                 example: 30
 *               limit:
 *                 type: number
 *                 description: Maximum number of tweets to collect (takes priority over maxTweets if provided). If neither is provided, defaults to 30
 *                 minimum: 1
 *                 maximum: 500
 *                 example: 30
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
    const { 
      username, 
      maxTweets, // No default value - will be set below
      limit, // Alternative parameter name
      includeReplies = false, 
      analyzeSentiment = true 
    } = req.body;

    // Use limit if provided, otherwise use maxTweets, otherwise default to 30
    const tweetsToRetrieve = limit || maxTweets || 30;

    if (!username || typeof username !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Username is required and must be a string',
        example: { username: 'nike', maxTweets: 30 }
      });
    }

    if (tweetsToRetrieve < 1 || tweetsToRetrieve > 500) {
      return res.status(400).json({
        success: false,
        error: 'maxTweets/limit must be between 1 and 500',
        provided: tweetsToRetrieve
      });
    }

    const startTime = Date.now();

    // Use unified scraping function with real scraper
    const scrapingResult = await performScraping(
      async (scraper) => await scraper.scrapeByUser(username, {
        maxTweets: tweetsToRetrieve,
        includeReplies
      }),
      `user scraping for @${username}`
    );

    let sentimentSummary = null;
    if (analyzeSentiment && scrapingResult.tweets.length > 0) {
      const analyses = await sentimentManager.analyzeTweetsBatch(scrapingResult.tweets);
      sentimentSummary = sentimentManager.generateStatistics(analyses);
    }

    // Save tweets to database automatically
    if (scrapingResult.tweets.length > 0) {
      try {
        const saveResult = await tweetDatabaseService.saveTweetsBulk(scrapingResult.tweets);
      } catch (dbError) {
        console.error('Error saving tweets to database:', dbError);
        // Don't fail the response, just log the error
      }
    }

    const executionTime = Date.now() - startTime;


    res.json({
      success: true,
      data: {
        username: `@${username}`,
        requested: tweetsToRetrieve,
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
      message: `Successfully scraped ${scrapingResult.tweets.length} of ${tweetsToRetrieve} requested tweets from @${username}`
    });

  } catch (error) {
    console.error('Error in user scraping:', error);
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
 *                 description: Maximum number of tweets to collect (alternative to limit)
 *                 minimum: 1
 *                 maximum: 1000
 *                 example: 50
 *               limit:
 *                 type: number
 *                 description: Maximum number of tweets to collect (takes priority over maxTweets if provided). If neither is provided, defaults to 50
 *                 minimum: 1
 *                 maximum: 1000
 *                 example: 50
 *               language:
 *                 type: string
 *                 enum: ["en", "es", "fr", "de", "it", "pt", "ja", "ko", "zh", "ar", "ru", "hi", "all"]
 *                 default: "en"
 *                 description: Language filter for tweets (ISO 639-1 codes or 'all' for no filter). Defaults to English
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
    const { 
      query, 
      maxTweets, // No default value - will be set below
      limit, // Alternative parameter name
      language = 'en', // Default to English like other endpoints
      analyzeSentiment = true 
    } = req.body;

    // Use limit if provided, otherwise use maxTweets, otherwise default to 50
    const tweetsToRetrieve = limit || maxTweets || 50;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Search query is required and must be a string',
        example: { query: 'nike shoes', maxTweets: 50 }
      });
    }

    if (tweetsToRetrieve < 1 || tweetsToRetrieve > 1000) {
      return res.status(400).json({
        success: false,
        error: 'maxTweets/limit must be between 1 and 1000',
        provided: tweetsToRetrieve
      });
    }

    // Validate language parameter
    const validLanguages = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh', 'ar', 'ru', 'hi', 'all'];
    if (language && !validLanguages.includes(language)) {
      return res.status(400).json({
        success: false,
        error: `Invalid language code. Must be one of: ${validLanguages.join(', ')}`,
        example: { language: 'es' }
      });
    }

    const startTime = Date.now();

    // Use unified scraping function with real scraper
    const scrapingResult = await performScraping(
      async (scraper) => await scraper.scrapeByHashtag(query, {
        maxTweets: tweetsToRetrieve,
        includeReplies: false,
        language
      }),
      `search scraping for: "${query}"`
    );

    let sentimentSummary = null;
    if (analyzeSentiment && scrapingResult.tweets.length > 0) {
      const analyses = await sentimentManager.analyzeTweetsBatch(scrapingResult.tweets);
      sentimentSummary = sentimentManager.generateStatistics(analyses);
    }

    // Save tweets to database automatically
    if (scrapingResult.tweets.length > 0) {
      try {
        const saveResult = await tweetDatabaseService.saveTweetsBulk(scrapingResult.tweets);
      } catch (dbError) {
        console.error('Error saving tweets to database:', dbError);
        // Don't fail the response, just log the error
      }
    }

    const executionTime = Date.now() - startTime;

    res.json({
      success: true,
      data: {
        query,
        requested: tweetsToRetrieve,
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
      message: `Successfully scraped ${scrapingResult.tweets.length} of ${tweetsToRetrieve} requested tweets for query: "${query}"`
    });

  } catch (error) {
    console.error('Error in search scraping:', error);
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
    // Get Twitter authentication status from startup manager
    const twitterAuth = TwitterAuthManager.getInstance();
    const authStatus = twitterAuth.getStatus();

    // Always try to get real scraper status first
    let realScraperStatus = null;
    let isRealScraperAvailable = false;

    try {
      const realScraper = await getRealScraperService();
      const rateLimitStatus = realScraper.getRateLimitStatus();
      const authStatusDetail = realScraper.getAuthenticationStatus();

      realScraperStatus = {
        authenticated: (rateLimitStatus as any).isAuthenticated,
        startup_authentication: {
          initialized: authStatus.initialized,
          ready: authStatus.ready,
          error: authStatus.error,
          has_credentials: authStatus.hasCredentials
        },
        authentication_monitoring: {
          status: authStatusDetail?.isAuthenticated ? 'authenticated' : 'failed',
          last_check: authStatusDetail?.lastCheck,
          consecutive_failures: authStatusDetail?.consecutiveFailures,
          next_retry_time: authStatusDetail?.nextRetryTime,
          credentials_valid: authStatusDetail?.credentialsValid,
          last_error: authStatusDetail?.lastError
        },
        rate_limit: {
          available: !rateLimitStatus.isLimited,
          requests_used: rateLimitStatus.requestCount,
          requests_remaining: rateLimitStatus.remaining,
          reset_time: rateLimitStatus.resetTime
        }
      };

      isRealScraperAvailable = authStatus.ready;
    } catch (error) {
      realScraperStatus = {
        error: error instanceof Error ? error.message : 'Unknown error',
        available: false,
        startup_authentication: {
          initialized: authStatus.initialized,
          ready: authStatus.ready,
          error: authStatus.error,
          has_credentials: authStatus.hasCredentials
        }
      };
    }

    res.json({
      success: true,
      data: {
        service_status: 'operational',
        primary_scraper: 'real',
        real_scraper_available: isRealScraperAvailable,
        real_scraper_status: realScraperStatus,
        scraper_info: {
          primary: {
            type: '@the-convocation/twitter-scraper',
            supports: ['hashtag_search', 'user_tweets', 'keyword_search'],
            authentication: 'cookie-based'
          },
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
      message: `Scraping service operational - Real scraper ${isRealScraperAvailable ? 'AVAILABLE' : 'UNAVAILABLE'}`
    });

  } catch (error) {
    console.error('Error getting scraping status:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to get scraping status'
    });
  }
});

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
 *       500:
 *         description: Re-authentication failed
 */
router.post('/reauth', async (req: Request, res: Response) => {
  try {
    const twitterAuth = TwitterAuthManager.getInstance();
    await twitterAuth.forceReauth();
    
    const status = twitterAuth.getStatus();
    
    res.json({
      success: true,
      message: status.ready ? 'Twitter re-authentication successful' : 'Re-authentication completed with issues',
      data: {
        ready: status.ready,
        error: status.error,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error during re-authentication:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to re-authenticate with Twitter'
    });
  }
});

export { router as scrapingRoutes };
