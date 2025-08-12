/**
 * Twitter Scraping Routes - Optimizado
 * Usa twikit para scraping sin API oficial
 */

import { Label } from '@/enums/sentiment.enum';
import { Request, Response, Router } from 'express';
import { TweetDatabaseService } from '../services/tweet-database.service';
import { TweetSentimentAnalysisManager } from '../services/tweet-sentiment-analysis.manager.service';
import { TwitterAuthManager } from '../services/twitter-auth-manager.service';
import { TwitterRealScraperService } from '../services/twitter-scraper.service';

const router = Router();

// Precompilar expresiones regulares para sanitización y validación
const SANITIZE_HASHTAG = /[^a-zA-Z0-9_]/g; // permite letras, números y _
const VALID_USERNAME = /^[A-Za-z0-9_]{1,15}$/; // Twitter username rules
const SAFE_QUERY = /[^a-zA-Z0-9_#@\s-]/g; // whitelist básica para consultas

// Anti-abuso: limita concurrencia por IP para scraping costoso
const inFlightByIp = new Map<string, number>();
const MAX_CONCURRENT_BY_IP = 1;
const INFLIGHT_TTL_MS = 2 * 60 * 1000; // 2 minutos

// Inicializar servicios
const sentimentManager = new TweetSentimentAnalysisManager();
const tweetDatabaseService = new TweetDatabaseService();
const twitterAuth = TwitterAuthManager.getInstance();

// Función para obtener el servicio de scraping
async function getScraperService(): Promise<TwitterRealScraperService> {
  return twitterAuth.getScraperService();
}

// Función para procesar análisis de sentimiento
function processSentimentAnalysis(tweets: any[], analyses: any[]) {
  return tweets.map((tweet, index) => {
    const analysis = analyses[index];
    if (!analysis) return tweet;

    const sentiment = analysis.analysis.sentiment;
    const label = [Label.VERY_POSITIVE, Label.POSITIVE].includes(sentiment.label)
      ? Label.POSITIVE
      : [Label.VERY_NEGATIVE, Label.NEGATIVE].includes(sentiment.label)
        ? Label.NEGATIVE
        : Label.NEUTRAL;

    return {
      ...tweet,
      sentiment: {
        score: sentiment.score,
        magnitude: sentiment.magnitude,
        label,
        confidence: sentiment.confidence,
        emotions: sentiment.emotions,
        keywords: analysis.analysis.keywords,
        analyzedAt: analysis.analyzedAt,
        processingTime: Date.now() - analysis.analyzedAt.getTime(),
      },
    };
  });
}

// Función para manejar errores de scraping
function handleScrapingError(res: Response, error: unknown, context: string) {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  console.error(`Error in ${context}:`, error);
  res.status(500).json({
    success: false,
    error: errorMessage,
    message: `Failed to scrape ${context}`,
  });
}

// Validación de parámetros común
function validateRequestParams(
  res: Response,
  params: { [key: string]: any },
  options: { minTweets?: number; maxTweets?: number } = {}
): boolean {
  const { minTweets = 1, maxTweets = 1000 } = options;

  if (!params.identifier || typeof params.identifier !== 'string') {
    res.status(400).json({
      success: false,
      error: `${params.type} is required and must be a string`,
      example: { [params.type]: params.exampleValue },
    });
    return false;
  }

  if (!Number.isFinite(params.tweetsToRetrieve)) {
    res.status(400).json({
      success: false,
      error: `limit/maxTweets must be a number`,
    });
    return false;
  }

  if (params.tweetsToRetrieve < minTweets || params.tweetsToRetrieve > maxTweets) {
    res.status(400).json({
      success: false,
      error: `maxTweets/limit must be between ${minTweets} and ${maxTweets}`,
      provided: params.tweetsToRetrieve,
    });
    return false;
  }

  if (params.language && !params.validLanguages.includes(params.language)) {
    res.status(400).json({
      success: false,
      error: `Invalid language code. Must be one of: ${params.validLanguages.join(', ')}`,
      example: { language: 'es' },
    });
    return false;
  }

  return true;
}

// Sanitizadores
function sanitizeHashtag(input: string): string {
  const trimmed = (input || '').trim().replace(/^#/, '');
  return trimmed.replace(SANITIZE_HASHTAG, '').slice(0, 50);
}

function sanitizeUsername(input: string): string {
  const val = (input || '').trim().replace(/^@/, '').slice(0, 15);
  return val;
}

function sanitizeQuery(input: string): string {
  const trimmed = (input || '').trim().slice(0, 120);
  // Elimina caracteres no permitidos y colapsa espacios
  return trimmed.replace(SAFE_QUERY, '').replace(/\s+/g, ' ');
}

function ensureNotEmpty(res: Response, value: string, field: string, example: string): boolean {
  if (!value) {
    res.status(400).json({
      success: false,
      error: `${field} cannot be empty after sanitization`,
      example: { [field]: example },
    });
    return false;
  }
  return true;
}

// Función de scraping genérica
async function handleScrapingRequest(
  req: Request,
  res: Response,
  scrapingFunction: (scraper: TwitterRealScraperService, options: any) => Promise<any>,
  context: {
    type: 'hashtag' | 'user' | 'search';
    identifier: string;
    exampleValue: string;
  },
  options: {
    minTweets?: number;
    maxTweets?: number;
    defaultTweets?: number;
    includeReplies?: boolean;
    languageFilter?: boolean;
  } = {}
) {
  const {
    minTweets = 1,
    maxTweets = 1000,
    defaultTweets = 50,
    includeReplies = false,
    languageFilter = false,
  } = options;

  try {
    // Concurrencia por IP
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    // Cleanup de entradas expiradas
    for (const [key, ts] of inFlightByIp.entries()) {
      if (now - ts > INFLIGHT_TTL_MS) inFlightByIp.delete(key);
    }
    const currentCount = [...inFlightByIp.keys()].filter((k) => k === ip).length;
    if (currentCount >= MAX_CONCURRENT_BY_IP) {
      return res.status(429).json({
        success: false,
        error: 'Too many concurrent scraping requests from this IP. Please wait.',
        code: 'CONCURRENCY_LIMIT',
      });
    }
    inFlightByIp.set(ip, now);

    const params = {
      identifier: req.body[context.type] || req.body.query || req.body.username,
      tweetsToRetrieve: Number(req.body.limit || req.body.maxTweets || defaultTweets),
      analyzeSentiment: req.body.analyzeSentiment !== false,
      campaignId: req.body.campaignId,
      language: req.body.language || 'en',
      validLanguages: ['en', 'es', 'fr', 'de'],
      type: context.type,
      exampleValue: context.exampleValue,
    };

    if (!validateRequestParams(res, params, { minTweets, maxTweets })) return;

    // Sanitización específica por tipo
    let safeIdentifier = '';
    if (context.type === 'hashtag') {
      safeIdentifier = sanitizeHashtag(params.identifier);
      if (!ensureNotEmpty(res, safeIdentifier, 'hashtag', 'JustDoIt')) return;
    } else if (context.type === 'user') {
      const uname = sanitizeUsername(params.identifier);
      if (!VALID_USERNAME.test(uname)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid username. Use 1-15 alphanumeric or underscore characters, without @',
          example: { username: 'nike' },
        });
      }
      safeIdentifier = uname;
    } else if (context.type === 'search') {
      const q = sanitizeQuery(params.identifier);
      if (!ensureNotEmpty(res, q, 'query', 'nike shoes')) return;
      // Para evitar inyección en query del scraper, reducimos a primera palabra o hashtag
      const hashtagMatch = q.match(/#([A-Za-z0-9_]+)/);
      const firstWord = q.split(/\s+/)[0];
      safeIdentifier = sanitizeHashtag(hashtagMatch ? hashtagMatch[1] : firstWord);
      if (!ensureNotEmpty(res, safeIdentifier, 'query', 'nike')) return;
    }

    const startTime = Date.now();
    const scraper = await getScraperService();

    // Configuración específica por tipo de scraping
    const scrapingOptions = {
      maxTweets: params.tweetsToRetrieve,
      includeReplies,
      ...(languageFilter && { language: params.language }),
    };

    // Ejecutar scraping con identificador saneado y opciones controladas
    let scrapingResult: any;
    if (context.type === 'hashtag') {
      scrapingResult = await scraper.scrapeByHashtag(safeIdentifier, scrapingOptions);
    } else if (context.type === 'user') {
      scrapingResult = await scraper.scrapeByUser(safeIdentifier, scrapingOptions);
    } else {
      // Búsqueda: usamos hashtag/primer término como proxy seguro
      scrapingResult = await scraper.scrapeByHashtag(safeIdentifier, scrapingOptions);
    }

    // Procesamiento de sentimiento
    let sentimentSummary = null;
    let tweetsWithSentiment = scrapingResult.tweets;

    if (params.analyzeSentiment && tweetsWithSentiment.length > 0) {
      const analyses = await sentimentManager.analyzeTweetsBatch(tweetsWithSentiment);
      sentimentSummary = sentimentManager.generateStatistics(analyses);
      tweetsWithSentiment = processSentimentAnalysis(tweetsWithSentiment, analyses);
    }

    // Guardar en base de datos
    if (tweetsWithSentiment.length > 0) {
      try {
        console.log(`💾 Attempting to save ${tweetsWithSentiment.length} tweets to database...`);
        console.log(`📋 Campaign ID: ${params.campaignId}`);

        const saveResult = await tweetDatabaseService.saveTweetsBulk(
          tweetsWithSentiment,
          params.campaignId
        );

        console.log(`✅ Database save result:`, {
          success: saveResult.success,
          saved: saveResult.saved,
          updated: saveResult.updated,
          duplicates: saveResult.duplicates,
          errors: saveResult.errors,
          totalProcessed: saveResult.totalProcessed,
        });

        if (saveResult.errorMessages.length > 0) {
          console.log(`❌ Save errors:`, saveResult.errorMessages);
        }
      } catch (dbError) {
        console.error('❌ Database save error:', dbError);
      }
    } else {
      console.log('⚠️ No tweets to save to database');
    }

    const executionTime = Date.now() - startTime;

    res.json({
      success: true,
      data: {
        [context.type]: context.type === 'hashtag' ? `#${safeIdentifier}` : `@${safeIdentifier}`,
        requested: params.tweetsToRetrieve,
        totalFound: scrapingResult.totalFound,
        totalScraped: tweetsWithSentiment.length,
        tweets: tweetsWithSentiment,
        sentiment_summary: sentimentSummary,
        campaignId: params.campaignId ?? '',
        campaignInfo: {
          id: params.campaignId ?? '',
          type: params.campaignId ? 'user-provided' : 'auto-generated',
          source: context.type,
        },
        rate_limit: {
          remaining: scrapingResult.rateLimit.remaining,
          reset_time: scrapingResult.rateLimit.resetTime,
        },
      },
      execution_time: executionTime,
      message: `Scraped ${tweetsWithSentiment.length}/${params.tweetsToRetrieve} ${
        context.type
      } tweets${params.analyzeSentiment ? ' with sentiment' : ''} → Campaign: ${params.campaignId}`,
    });
  } catch (error) {
    handleScrapingError(res, error, `${context.type} scraping`);
  } finally {
    // Libera la marca de concurrencia del IP
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    inFlightByIp.delete(ip);
  }
}

// Nota: función auxiliar de scraping unificado eliminada por no uso.

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
 *                 enum: ["en", "es", "fr", "de"]
 *                 default: "en"
 *                 description: Language filter for tweets (ISO 639-1 codes or 'all' for no filter). Defaults to English
 *                 example: "es"
 *               campaignId:
 *                 type: string
 *                 description: Optional campaign ID to associate with the scraped tweets. If not provided, a default campaign ID will be generated.
 *                 example: "my_nike_campaign_2024"
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
  await handleScrapingRequest(
    req,
    res,
    async () => ({}), // ignorado, usamos la ruta segura dentro de handle
    { type: 'hashtag', identifier: req.body.hashtag, exampleValue: 'JustDoIt' },
    { languageFilter: true }
  );
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
 *               includeReplies:
 *                 type: boolean
 *                 description: Whether to include reply tweets
 *                 default: false
 *               analyzeSentiment:
 *                 type: boolean
 *                 description: Whether to analyze sentiment of collected tweets
 *                 default: true
 *               campaignId:
 *                 type: string
 *                 description: Optional campaign ID to associate with the scraped tweets. If not provided, a default campaign ID will be generated.
 *                 example: "nike_monitoring_campaign"
 *     responses:
 *       200:
 *         description: User tweets scraped successfully
 *       400:
 *         description: Invalid username
 *       500:
 *         description: Scraping failed
 */
router.post('/user', async (req: Request, res: Response) => {
  await handleScrapingRequest(
    req,
    res,
    async () => ({}), // ignorado, usamos la ruta segura dentro de handle
    { type: 'user', identifier: req.body.username, exampleValue: 'nike' },
    { maxTweets: 500, defaultTweets: 30 }
  );
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
 *                 enum: ["en", "es", "fr", "de"]
 *                 default: "en"
 *                 description: Language filter for tweets (ISO 639-1 codes or 'all' for no filter). Defaults to English
 *                 example: "es"
 *               analyzeSentiment:
 *                 type: boolean
 *                 description: Whether to analyze sentiment of collected tweets
 *                 default: true
 *               campaignId:
 *                 type: string
 *                 description: Optional campaign ID to associate with the scraped tweets. If not provided, a default campaign ID will be generated.
 *                 example: "search_nike_vs_adidas_2024"
 *     responses:
 *       200:
 *         description: Search completed successfully
 *       400:
 *         description: Invalid search query
 *       500:
 *         description: Search failed
 */
router.post('/search', async (req: Request, res: Response) => {
  await handleScrapingRequest(
    req,
    res,
    async () => ({}), // ignorado, usamos la ruta segura dentro de handle
    { type: 'search', identifier: req.body.query, exampleValue: 'nike shoes' },
    { languageFilter: true }
  );
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
    const authStatusDetail = scraper.getAuthenticationStatus();

    res.json({
      success: true,
      data: {
        service_status: 'operational',
        authentication: {
          status: authStatusDetail.isAuthenticated ? 'authenticated' : 'failed',
          last_check: authStatusDetail.lastCheck,
          consecutive_failures: authStatusDetail.consecutiveFailures,
        },
        rate_limit: {
          remaining: rateLimitStatus.remaining,
          reset_time: rateLimitStatus.resetTime,
          request_count: rateLimitStatus.requestCount,
        },
        scraper_info: {
          type: '@the-convocation/twitter-scraper',
          max_tweets_per_request: 1000,
          rate_limit_window: '1 hour',
        },
      },
      message: 'Scraping service operational',
    });
  } catch (error) {
    handleScrapingError(res, error, 'status check');
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
    await twitterAuth.forceReauth();
    const status = twitterAuth.getStatus();

    res.json({
      success: status.ready,
      message: status.ready ? 'Re-authentication successful' : 'Re-authentication failed',
      error: status.error,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    handleScrapingError(res, error, 're-authentication');
  }
});

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
 *         description: Filter by campaign ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 10
 *         description: Limit number of results
 *     responses:
 *       200:
 *         description: Tweets retrieved successfully
 */
router.get('/tweets', async (req: Request, res: Response) => {
  try {
    const { campaignId, limit = 10 } = req.query;

    let tweets;
    if (campaignId) {
      tweets = await tweetDatabaseService.getTweetsByCampaign(
        campaignId as string,
        parseInt(limit as string)
      );
    } else {
      // Get recent tweets from any campaign
      tweets = await tweetDatabaseService.getTweetsByHashtag(
        '', // Empty hashtag to get all
        parseInt(limit as string)
      );
    }

    res.json({
      success: true,
      data: {
        total: tweets.length,
        campaignId: campaignId || 'all',
        tweets: tweets.map((tweet) => ({
          tweetId: tweet.tweetId,
          content: tweet.content.substring(0, 100) + '...',
          campaignId: tweet.campaignId,
          sentiment: tweet.sentiment,
          createdAt: tweet.createdAt,
          scrapedAt: tweet.scrapedAt,
        })),
      },
      message: `Found ${tweets.length} tweets in database`,
    });
  } catch (error) {
    console.error('Error retrieving tweets:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve tweets from database',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export { router as scrapingRoutes };
