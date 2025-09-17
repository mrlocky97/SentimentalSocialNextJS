/**
 * Enhanced error handling, performance optimizations, and bug fixes
 */

import { Request, Response } from 'express';
import { toStringArray } from '../../../lib/utils';
import {
  getScraperService,
  handleScrapingError,
  handleScrapingRequest,
  ScrapingResponse,
  tweetDatabaseService,
  twitterAuth,
  type ScrapingContext,
  type ScrapingRequestOptions,
} from './helpers';

// ==================== Constants & Configuration ====================
const SCRAPING_CONFIGS = Object.freeze({
  hashtag: {
    context: { type: 'hashtag' as const, exampleValue: 'JustDoIt' },
    options: { languageFilter: true },
    stripPrefix: '#',
    errorField: 'hashtag or hashtags',
    examples: {
      hashtag: 'JustDoIt',
      campaignId: 'nike_campaign_2024',
      hashtags: ['JustDoIt', 'Marketing', '#Nike'],
    },
  },
  user: {
    context: { type: 'user' as const, exampleValue: 'nike' },
    options: { maxTweets: 500, defaultTweets: 30 },
    stripPrefix: '@',
    errorField: 'username or usernames',
    examples: {
      username: 'nike',
      campaignId: 'nike_campaign_2024',
      usernames: ['nike', 'adidas', '@puma'],
    },
  },
  search: {
    context: { type: 'search' as const, exampleValue: 'nike shoes' },
    options: { languageFilter: true },
    stripPrefix: '',
    errorField: 'query or queries',
    examples: {
      query: 'nike shoes',
      campaignId: 'nike_campaign_2024',
      queries: ['nike shoes', 'adidas sneakers'],
    },
  },
} as const);

const TWEET_CONTENT_MAX_LENGTH = 100;
const DEFAULT_TWEET_LIMIT = 10;
const ASYNC_THRESHOLD_TWEETS = 50;
const MAX_CONCURRENT_REQUESTS = 5; // Limit concurrent processing
const MAX_RETRY_ATTEMPTS = 3;

// ==================== Types ====================
type ScrapingType = keyof typeof SCRAPING_CONFIGS;

interface BasicTweet {
  readonly tweetId: string;
  readonly content: string;
  readonly campaignId?: string;
  readonly sentiment?: unknown;
  readonly createdAt?: Date;
  readonly scrapedAt?: Date;
}

interface BatchScrapingResult {
  readonly identifier: string;
  readonly tweetCount: number;
  readonly totalFound?: number;
  readonly sentiment_summary?: unknown;
  readonly error?: string;
}

interface BatchResponse {
  readonly success: boolean;
  readonly data: {
    readonly identifiers: readonly string[];
    readonly items: readonly BatchScrapingResult[];
    readonly totalTweets: number;
    readonly campaignId: string;
  };
  readonly message: string;
}

interface CampaignValidationResult {
  exists: boolean;
  campaign?: any;
  error?: string;
}

interface ProgressData {
  totalTweets: number;
  scrapedTweets: number;
  currentPhase: string;
  message: string;
  timeElapsed: number;
  percentage: number;
}

// ==================== Utility Functions ====================
const truncateContent = (content: string): string =>
  content.length > TWEET_CONTENT_MAX_LENGTH
    ? `${content.substring(0, TWEET_CONTENT_MAX_LENGTH)}...`
    : content;

const formatIdentifier = (identifier: string, prefix: string): string =>
  prefix && !identifier.startsWith(prefix) ? `${prefix}${identifier}` : identifier;

const sanitizeString = (str: string): string => str.trim().replace(/[^\w\s#@.-]/g, '');

const createValidationError = (errorField: string, examples: Record<string, unknown>) => ({
  success: false,
  error: `${errorField} parameter is required`,
  example: examples,
});

const createCampaignIdValidationError = () => ({
  success: false,
  error: 'campaignId is required and must be a non-empty string',
  example: {
    campaignId: 'my_marketing_campaign_2024',
    description: 'Campaign ID helps organize and track your scraped tweets',
  },
});

const createCampaignNotFoundError = (campaignId: string) => ({
  success: false,
  error: 'Campaign not found',
  details: `Campaign with ID '${campaignId}' does not exist. Please create the campaign first.`,
  suggestion: 'Create the campaign using POST /api/v1/campaigns before starting scraping',
});

const validateCampaignId = (campaignId: any): boolean => {
  return typeof campaignId === 'string' && campaignId.trim().length > 0;
};

// ==================== Enhanced Campaign Validation ====================
async function validateCampaignExists(campaignId: string): Promise<CampaignValidationResult> {
  if (!campaignId || typeof campaignId !== 'string') {
    return { exists: false, error: 'Invalid campaign ID format' };
  }

  try {
    const { CampaignModel } = await import('../../../models/Campaign.model');

    // Add timeout to prevent hanging queries
    const campaign = await Promise.race([
      CampaignModel.findById(sanitizeString(campaignId)),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Campaign lookup timeout')), 5000)
      ),
    ]);

    return {
      exists: !!campaign,
      campaign: campaign || null,
    };
  } catch (error) {
    console.error(`Error validating campaign existence for ID ${campaignId}:`, error);
    return {
      exists: false,
      error: error instanceof Error ? error.message : 'Database error',
    };
  }
}

// ==================== Enhanced Error Handling & Retry Logic ====================
async function withRetry<T>(
  operation: () => Promise<T>,
  maxAttempts: number = MAX_RETRY_ATTEMPTS,
  backoffMs: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === maxAttempts) {
        throw lastError;
      }

      // Exponential backoff
      const delay = backoffMs * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));

      console.warn(`Attempt ${attempt} failed, retrying in ${delay}ms:`, lastError.message);
    }
  }

  throw lastError;
}

// ==================== Optimized Processing Logic ====================
async function processSingleIdentifier(
  req: Request,
  res: Response,
  identifier: string,
  context: Omit<ScrapingContext, 'identifier'>,
  options: ScrapingRequestOptions
): Promise<BatchScrapingResult> {
  const config = SCRAPING_CONFIGS[context.type as ScrapingType];
  const sanitizedIdentifier = sanitizeString(identifier);

  if (!sanitizedIdentifier) {
    return {
      identifier: formatIdentifier(identifier, config.stripPrefix),
      tweetCount: 0,
      error: 'Invalid identifier format',
    };
  }

  try {
    const result: ScrapingResponse | void = await withRetry(async () => {
      return await handleScrapingRequest(
        req,
        res,
        { ...context, identifier: sanitizedIdentifier },
        options,
        true
      );
    });

    if (result?.success && result.data?.tweets) {
      return {
        identifier: formatIdentifier(sanitizedIdentifier, config.stripPrefix),
        tweetCount: Array.isArray(result.data.tweets) ? result.data.tweets.length : 0,
        totalFound: result.data.totalFound || 0,
        sentiment_summary: result.data.sentiment_summary,
      };
    }

    return {
      identifier: formatIdentifier(sanitizedIdentifier, config.stripPrefix),
      tweetCount: 0,
      error: result?.error || 'Request failed',
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error(`Error processing identifier ${sanitizedIdentifier}:`, errorMessage);

    return {
      identifier: formatIdentifier(sanitizedIdentifier, config.stripPrefix),
      tweetCount: 0,
      error: errorMessage,
    };
  }
}

// ==================== Optimized Batch Processing ====================
async function processBatchScraping(
  req: Request,
  res: Response,
  identifiers: string[],
  scrapingType: ScrapingType
): Promise<BatchResponse> {
  const config = SCRAPING_CONFIGS[scrapingType];
  const results: BatchScrapingResult[] = [];
  let totalTweets = 0;

  // Validate identifiers
  const validIdentifiers = identifiers
    .map((id) => sanitizeString(id))
    .filter((id) => id.length > 0);

  if (validIdentifiers.length === 0) {
    throw new Error('No valid identifiers provided');
  }

  // Process in chunks to avoid overwhelming the system
  const chunkSize = Math.min(MAX_CONCURRENT_REQUESTS, validIdentifiers.length);
  const chunks = [];

  for (let i = 0; i < validIdentifiers.length; i += chunkSize) {
    chunks.push(validIdentifiers.slice(i, i + chunkSize));
  }

  // Process chunks sequentially but items within chunks concurrently
  for (const chunk of chunks) {
    const chunkPromises = chunk.map((identifier) =>
      processSingleIdentifier(req, res, identifier, config.context, config.options)
    );

    const chunkResults = await Promise.allSettled(chunkPromises);

    for (const result of chunkResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
        totalTweets += result.value.tweetCount;
      } else {
        const errorMessage =
          result.reason instanceof Error ? result.reason.message : 'Processing failed';

        console.error('Batch processing error:', errorMessage);
        results.push({
          identifier: 'unknown',
          tweetCount: 0,
          error: errorMessage,
        });
      }
    }

    // Small delay between chunks to be respectful to rate limits
    if (chunks.length > 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return {
    success: true,
    data: {
      identifiers: validIdentifiers.map((id) => formatIdentifier(id, config.stripPrefix)),
      items: results,
      totalTweets,
      campaignId: req.body.campaignId,
    },
    message: `Scraped ${totalTweets} tweets from ${validIdentifiers.length} ${scrapingType}${validIdentifiers.length > 1 ? 's' : ''}`,
  };
}

// ==================== Enhanced Generic Scraping Handler ====================
async function handleGenericScraping(
  req: Request,
  res: Response,
  scrapingType: ScrapingType,
  identifierKeys: string[]
): Promise<void> {
  try {
    const config = SCRAPING_CONFIGS[scrapingType];
    const { campaignId, maxTweets = 100 } = req.body;

    // Validate campaign ID format
    if (!validateCampaignId(campaignId)) {
      res.status(400).json(createCampaignIdValidationError());
      return;
    }

    // Validate campaign exists
    const campaignValidation = await validateCampaignExists(campaignId);
    if (!campaignValidation.exists) {
      const statusCode = campaignValidation.error?.includes('timeout') ? 503 : 404;
      res.status(statusCode).json(createCampaignNotFoundError(campaignId));
      return;
    }

    // Extract and validate identifiers
    const identifiers = extractIdentifiers(req.body, identifierKeys, config);

    if (identifiers.length === 0) {
      res.status(400).json(createValidationError(config.errorField, config.examples));
      return;
    }

    // Determine processing strategy
    const shouldUseAsync = maxTweets > ASYNC_THRESHOLD_TWEETS || identifiers.length > 3;

    if (shouldUseAsync) {
      await handleAsyncGenericScraping(req, res, scrapingType, identifierKeys);
      return;
    }

    // Synchronous processing for smaller requests
    if (identifiers.length === 1) {
      await handleScrapingRequest(
        req,
        res,
        { ...config.context, identifier: identifiers[0] },
        config.options
      );
      return;
    }

    // Batch processing
    const response = await processBatchScraping(req, res, identifiers, scrapingType);
    res.json(response);
  } catch (error) {
    console.error(`Error in ${scrapingType} scraping:`, error);
    handleScrapingError(res, error, `${scrapingType} scraping`);
  }
}

// ==================== Enhanced Async Handler ====================
async function handleAsyncGenericScraping(
  req: Request,
  res: Response,
  scrapingType: ScrapingType,
  identifierKeys: string[]
): Promise<void> {
  try {
    const config = SCRAPING_CONFIGS[scrapingType];
    const {
      campaignId,
      maxTweets = 100,
      userId = 'system-user',
      organizationId = 'default-org',
      ...requestOptions
    } = req.body;

    // Double-check campaign exists (redundant safety check)
    const campaignValidation = await validateCampaignExists(campaignId);
    if (!campaignValidation.exists) {
      res.status(404).json(createCampaignNotFoundError(campaignId));
      return;
    }

    // Extract target value safely
    const targetValue = extractTargetValue(req.body, identifierKeys, config);
    if (!targetValue) {
      res.status(400).json({
        success: false,
        error: `Missing required parameter: ${config.errorField}`,
        details: `One of the following is required: ${identifierKeys.join(', ')}`,
      });
      return;
    }

    // Update campaign status atomically
    await updateCampaignStatus(campaignId, 'active', {
      maxTweets,
      startedAt: new Date(),
      processingStatus: 'processing', // ✅ Cambiado a processingStatus para evitar conflicto
    });

    // Respond immediately
    res.json({
      success: true,
      campaignId,
      message: `${scrapingType} scraping started`,
      estimatedDuration: Math.ceil(maxTweets / 10),
      status: 'processing',
      progress: {
        phase: 'initializing',
        percentage: 0,
        message: 'Starting scraping process...',
        useWebSocket: true,
      },
    });

    // Process asynchronously with proper error handling
    setImmediate(() => {
      processAsyncScraping(campaignId, scrapingType, targetValue, {
        ...requestOptions,
        maxTweets,
        campaignId,
        userId,
        organizationId,
      }).catch((error) => {
        console.error(`Async ${scrapingType} scraping failed for campaign ${campaignId}:`, error);
        // Ensure campaign status is updated on failure
        updateCampaignStatus(campaignId, 'error', {
          error: error.message,
          failedAt: new Date(),
        }).catch(console.error);
      });
    });
  } catch (error) {
    return handleScrapingError(res, error, `async ${scrapingType} scraping`);
  }
}

// ==================== Helper Functions ====================
function extractIdentifiers(body: any, identifierKeys: string[], config: any): string[] {
  return (
    identifierKeys
      .map((key) => {
        const value = body[key];
        return toStringArray(value, {
          stripPrefix: config.stripPrefix || undefined,
        });
      })
      .find((arr) => arr.length > 0) || []
  );
}

function extractTargetValue(body: any, fieldNames: string[], config: any): string | null {
  for (const fieldName of fieldNames) {
    if (body[fieldName]) {
      const value = Array.isArray(body[fieldName]) ? body[fieldName][0] : body[fieldName];
      if (typeof value === 'string' && value.trim()) {
        return sanitizeString(value.replace(config.stripPrefix || '', ''));
      }
    }
  }
  return null;
}

// ==================== Enhanced Background Processing ====================
async function processAsyncScraping(
  campaignId: string,
  scrapingType: keyof typeof SCRAPING_CONFIGS,
  targetValue: string,
  options: any
): Promise<void> {
  let progressService: any = null;
  const startTime = Date.now();

  try {
    // Import services with error handling
    const { scrapingProgressService } = await import('../../../services/scraping-progress.service');
    progressService = scrapingProgressService;

    // Initialize progress tracking
    const initialProgress: ProgressData = {
      totalTweets: options.maxTweets || 100,
      scrapedTweets: 0,
      currentPhase: 'initializing',
      message: `Starting ${scrapingType} scraping for: ${targetValue}`,
      timeElapsed: 0,
      percentage: 0,
    };

    progressService.updateProgress(campaignId, initialProgress);

    // Get scraper with timeout
    const scraper = await withRetry(
      async () => {
        return await getScraperService();
      },
      2,
      2000
    );

    // Update to scraping phase
    progressService.updateProgress(campaignId, {
      currentPhase: 'scraping',
      message: `Scraping ${scrapingType}: ${targetValue}`,
      timeElapsed: Date.now() - startTime,
    });

    // Execute scraping operation
    const scrapingOptions = {
      ...options,
      campaignId,
    };

    let result;
    switch (scrapingType) {
      case 'hashtag':
        result = await scraper.scrapeByHashtag(targetValue, scrapingOptions);
        break;
      case 'user':
        result = await scraper.scrapeByUser(targetValue, scrapingOptions);
        break;
      case 'search':
        result = await scraper.scrapeByHashtag(targetValue, scrapingOptions);
        break;
      default:
        throw new Error(`Unsupported scraping type: ${scrapingType}`);
    }

    // Validate result
    if (!result || typeof result !== 'object') {
      throw new Error('Invalid scraping result received');
    }

    const tweets = Array.isArray(result.tweets) ? result.tweets : [];

    // Update to analysis phase
    progressService.updateProgress(campaignId, {
      currentPhase: 'analyzing',
      message: 'Processing and analyzing scraped tweets...',
      scrapedTweets: tweets.length,
      timeElapsed: Date.now() - startTime,
    });

    if (tweets.length > 0) {
      try {
        // Import sentiment processing function from helpers
        const { processAndPersistSentiment } = await import('./helpers');
        
        // Process tweets with sentiment analysis
        const { tweetsWithSentiment } = await processAndPersistSentiment(
          tweets,
          options.analyzeSentiment !== false, // Default to true
          campaignId
        );

        console.log(`✅ Processed ${tweetsWithSentiment.length} tweets with sentiment analysis`);
        
      } catch (sentimentError) {
        console.error('Sentiment analysis failed in async mode:', sentimentError);
        
        // Fallback: save tweets without sentiment
        await withRetry(async () => {
          await tweetDatabaseService.saveTweetsBulk(tweets, campaignId);
        });
      }
    }

    // Update campaign to completed status
    await updateCampaignStatus(campaignId, 'completed', {
      tweetsScraped: tweets.length,
      completedAt: new Date(),
      processingTime: Date.now() - startTime,
    });

    // Complete progress tracking
    progressService.completeProgress(campaignId);

    console.log(
      `Successfully completed ${scrapingType} scraping for campaign ${campaignId}: ${tweets.length} tweets`
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(
      `Error in async ${scrapingType} scraping for campaign ${campaignId}:`,
      errorMessage
    );

    // Update campaign status to error
    await updateCampaignStatus(campaignId, 'error', {
      error: errorMessage,
      failedAt: new Date(),
      processingTime: Date.now() - startTime,
    }).catch(console.error);

    // Report error in progress if service is available
    if (progressService) {
      try {
        progressService.errorProgress(campaignId, errorMessage);
      } catch (progressError) {
        console.error('Failed to update progress with error:', progressError);
      }
    }

    throw error;
  }
}

// ==================== Enhanced Campaign Status Management ====================
async function updateCampaignStatus(campaignId: string, status: string, data: any): Promise<void> {
  if (!campaignId || typeof campaignId !== 'string') {
    console.error('Invalid campaignId provided to updateCampaignStatus:', campaignId);
    return;
  }

  try {
    const [{ CampaignModel }, { CampaignStatus }] = await Promise.all([
      import('../../../models/Campaign.model'),
      import('../../../enums/campaign.enum'),
    ]);

    const statusMapping = {
      completed: CampaignStatus.completed,
      error: CampaignStatus.archived,
      processing: CampaignStatus.active,
      active: CampaignStatus.active,
    } as const;

    const validStatus =
      statusMapping[status as keyof typeof statusMapping] || CampaignStatus.active;

    // ✅ Crear updateData sin sobrescribir el status válido
    const { status: _, ...dataWithoutStatus } = data || {};
    void _; // Suppress unused variable warning

    const updateData = {
      status: validStatus,
      ...dataWithoutStatus, // ✅ Solo datos sin status
      updatedAt: new Date(),
    };

    const result = await CampaignModel.findByIdAndUpdate(sanitizeString(campaignId), updateData, {
      new: true,
      runValidators: true,
    });

    if (!result) {
      console.warn(`Campaign ${campaignId} not found during status update`);
    }
  } catch (error) {
    console.error(`Error updating campaign ${campaignId} status to ${status}:`, error);
    throw error; // Re-throw to allow caller to handle
  }
}

// ==================== Main Handler Functions ====================
export const scrapeHashtag = async (req: Request, res: Response): Promise<void> => {
  await handleGenericScraping(req, res, 'hashtag', ['hashtags', 'hashtag']);
};

export const scrapeUser = async (req: Request, res: Response): Promise<void> => {
  await handleGenericScraping(req, res, 'user', ['usernames', 'username']);
};

export const scrapeSearch = async (req: Request, res: Response): Promise<void> => {
  await handleGenericScraping(req, res, 'search', ['queries', 'query']);
};

// ==================== Enhanced Status & Management Handlers ====================
export async function getScrapingStatus(req: Request, res: Response): Promise<void> {
  try {
    const [scraper, authStatusDetail] = await Promise.all([
      getScraperService(),
      (async () => {
        try {
          const scraper = await getScraperService();
          return scraper.getAuthenticationStatus();
        } catch {
          return { isAuthenticated: false, lastCheck: null, consecutiveFailures: 0 };
        }
      })(),
    ]);

    const rateLimitStatus = scraper.getRateLimitStatus();

    const statusResponse = {
      success: true,
      data: {
        service_status: 'operational' as const,
        authentication: {
          status: authStatusDetail.isAuthenticated ? 'authenticated' : 'failed',
          last_check: authStatusDetail.lastCheck,
          consecutive_failures: authStatusDetail.consecutiveFailures,
        },
        rate_limit: {
          remaining: rateLimitStatus.remaining ?? 'unknown',
          reset_time: rateLimitStatus.resetTime ?? null,
          request_count: rateLimitStatus.requestCount ?? 0,
        },
        scraper_info: {
          type: '@the-convocation/twitter-scraper',
          max_tweets_per_request: 1000,
          rate_limit_window: '1 hour',
        },
        system_health: {
          memory_usage: process.memoryUsage(),
          uptime: process.uptime(),
        },
      },
      message: 'Scraping service operational',
      timestamp: new Date().toISOString(),
    } as const;

    res.json(statusResponse);
  } catch (error) {
    handleScrapingError(res, error, 'status check');
  }
}

export async function forceReauth(req: Request, res: Response): Promise<void> {
  try {
    const reauthResult = await withRetry(
      async () => {
        await twitterAuth.forceReauth();
        return twitterAuth.getStatus();
      },
      2,
      3000
    );

    const reauthResponse = {
      success: reauthResult.ready,
      message: reauthResult.ready ? 'Re-authentication successful' : 'Re-authentication failed',
      error: reauthResult.error || null,
      timestamp: new Date().toISOString(),
    } as const;

    res.status(reauthResult.ready ? 200 : 500).json(reauthResponse);
  } catch (error) {
    handleScrapingError(res, error, 're-authentication');
  }
}

export async function listTweets(req: Request, res: Response): Promise<void> {
  try {
    const { campaignId, limit = DEFAULT_TWEET_LIMIT } = req.query;
    const parsedLimit = Math.max(
      1,
      parseInt(String(limit), 10) || DEFAULT_TWEET_LIMIT
    );

    // Validate campaignId if provided
    if (campaignId && typeof campaignId === 'string' && !validateCampaignId(campaignId)) {
      res.status(400).json({
        success: false,
        error: 'Invalid campaignId format',
        message: 'Campaign ID must be a non-empty string',
      });
      return;
    }

    let tweets: BasicTweet[];

    if (campaignId && typeof campaignId === 'string') {
      const sanitizedCampaignId = sanitizeString(campaignId);
      tweets = await tweetDatabaseService.getTweetsByCampaign(sanitizedCampaignId, parsedLimit);
    } else {
      tweets = await tweetDatabaseService.getTweetsByHashtag('', parsedLimit);
    }

    const transformedTweets = tweets.map((tweet) => ({
      tweetId: tweet.tweetId,
      content: truncateContent(tweet.content),
      campaignId: tweet.campaignId,
      sentiment: tweet.sentiment,
      createdAt: tweet.createdAt,
      scrapedAt: tweet.scrapedAt,
    }));

    const listResponse = {
      success: true,
      data: {
        total: tweets.length,
        campaignId: campaignId || 'all',
        tweets: transformedTweets,
        metadata: {
          limit: parsedLimit,
          hasMore: tweets.length === parsedLimit,
        },
      },
      message: `Found ${tweets.length} tweets in database`,
      timestamp: new Date().toISOString(),
    } as const;

    res.json(listResponse);
  } catch (error) {
    handleScrapingError(res, error, 'database tweets list');
  }
}
