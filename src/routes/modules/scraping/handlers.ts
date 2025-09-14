/**
 * Optimized Scraping Handlers - Production Ready v3.0
 * Streamlined request processing with efficient batch operations
 */

import { Request, Response } from 'express';
import { toStringArray } from '../../../lib/utils';
import {
  getScraperService,
  handleScrapingError,
  handleScrapingRequest,
  tweetDatabaseService,
  twitterAuth,
  type ScrapingContext,
  type ScrapingRequestOptions,
} from './helpers';

// ==================== Configuration & Types ====================
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

// ==================== Utility Functions ====================
const truncateContent = (content: string): string =>
  content.length > TWEET_CONTENT_MAX_LENGTH
    ? `${content.substring(0, TWEET_CONTENT_MAX_LENGTH)}...`
    : content;

const formatIdentifier = (identifier: string, prefix: string): string =>
  prefix ? `${prefix}${identifier}` : identifier;

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

const validateCampaignId = (campaignId: any): boolean => {
  return typeof campaignId === 'string' && campaignId.trim().length > 0;
};

// ==================== Core Processing Logic ====================
async function processSingleIdentifier(
  req: Request,
  res: Response,
  identifier: string,
  context: Omit<ScrapingContext, 'identifier'>,
  options: ScrapingRequestOptions
): Promise<BatchScrapingResult> {
  try {
    const result = await handleScrapingRequest(req, res, { ...context, identifier }, options, true);

    if (result?.success) {
      return {
        identifier: formatIdentifier(
          identifier,
          SCRAPING_CONFIGS[context.type as ScrapingType].stripPrefix
        ),
        tweetCount: result.data.tweets.length,
        totalFound: result.data.totalFound,
        sentiment_summary: result.data.sentiment_summary,
      };
    }

    return {
      identifier: formatIdentifier(
        identifier,
        SCRAPING_CONFIGS[context.type as ScrapingType].stripPrefix
      ),
      tweetCount: 0,
      error: 'Request failed',
    };
  } catch (err) {
    return {
      identifier: formatIdentifier(
        identifier,
        SCRAPING_CONFIGS[context.type as ScrapingType].stripPrefix
      ),
      tweetCount: 0,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

async function processBatchScraping(
  req: Request,
  res: Response,
  identifiers: string[],
  scrapingType: ScrapingType
): Promise<BatchResponse> {
  const config = SCRAPING_CONFIGS[scrapingType];
  const results: BatchScrapingResult[] = [];
  let totalTweets = 0;

  // Process identifiers concurrently
  const processingPromises = identifiers.map((identifier) =>
    processSingleIdentifier(req, res, identifier, config.context, config.options)
  );

  const resolvedResults = await Promise.allSettled(processingPromises);

  for (const result of resolvedResults) {
    if (result.status === 'fulfilled') {
      results.push(result.value);
      totalTweets += result.value.tweetCount;
    } else {
      results.push({
        identifier: 'unknown',
        tweetCount: 0,
        error: result.reason instanceof Error ? result.reason.message : 'Processing failed',
      });
    }
  }

  return {
    success: true,
    data: {
      identifiers: identifiers.map((id) => formatIdentifier(id, config.stripPrefix)),
      items: results,
      totalTweets,
      campaignId: req.body.campaignId, // ✅ Now guaranteed to exist
    },
    message: `Scraped ${totalTweets} tweets from ${identifiers.length} ${scrapingType}${identifiers.length > 1 ? 's' : ''}`,
  };
}

// ==================== Generic Scraping Handler ====================
async function handleGenericScraping(
  req: Request,
  res: Response,
  scrapingType: ScrapingType,
  identifierKeys: string[]
): Promise<void> {
  const config = SCRAPING_CONFIGS[scrapingType];
  const { campaignId, maxTweets = 100, ...otherOptions } = req.body;

  // ✅ Validate campaignId first - critical requirement
  if (!validateCampaignId(campaignId)) {
    res.status(400).json(createCampaignIdValidationError());
    return;
  }

  // Determine if we should use async processing with WebSockets
  // Use async mode for larger requests to prevent timeouts
  const shouldUseAsync = maxTweets > 50 || identifierKeys.length > 1;

  if (shouldUseAsync) {
    await handleAsyncGenericScraping(req, res, scrapingType, identifierKeys);
    return;
  }

  // For smaller requests, use traditional synchronous processing
  // Extract identifiers from request body
  const identifiers =
    identifierKeys
      .map((key) => {
        const value = req.body[key];
        const result = toStringArray(value, { stripPrefix: config.stripPrefix || undefined });
        return result;
      })
      .find((arr) => arr.length > 0) || [];

  if (identifiers.length === 0) {
    res.status(400).json(createValidationError(config.errorField, config.examples));
    return;
  }

  // Single identifier optimization for small requests
  if (identifiers.length === 1) {
    await handleScrapingRequest(
      req,
      res,
      { ...config.context, identifier: identifiers[0] },
      config.options
    );
    return;
  }

  // Multiple identifiers - batch processing
  const response = await processBatchScraping(req, res, identifiers, scrapingType);
  res.json(response);
}

/**
 * Async handler that returns immediately and processes with WebSocket progress
 */
async function handleAsyncGenericScraping(
  req: Request,
  res: Response,
  scrapingType: ScrapingType,
  identifierKeys: string[]
): Promise<void> {
  try {
    const config = SCRAPING_CONFIGS[scrapingType];
    const { campaignId, maxTweets = 100, ...otherOptions } = req.body;

    // Extract target value
    const targetValue = extractTargetValue(req.body, identifierKeys, config);
    if (!targetValue) {
      res.status(400).json({
        success: false,
        error: `Missing required parameter: ${config.errorField}`,
        details: `One of the following is required: ${identifierKeys.join(', ')}`
      });
      return;
    }

    // Create campaign record immediately
    const campaign = await createCampaignRecord({
      campaignId,
      type: scrapingType,
      target: targetValue,
      maxTweets,
      status: 'processing',
      ...otherOptions
    });

    // Respond immediately with campaign info
    res.json({
      success: true,
      campaignId: campaign._id || campaignId,
      message: `${scrapingType} scraping started`,
      estimatedDuration: Math.ceil(maxTweets / 10), // seconds
      status: 'processing',
      progress: {
        phase: 'initializing',
        percentage: 0,
        message: 'Starting scraping process...',
        useWebSocket: true // Indicate to frontend to use WebSocket
      }
    });

    // Process in background (don't await)
    processAsyncScraping(campaign._id || campaignId, scrapingType, targetValue, {
      ...otherOptions,
      maxTweets,
      campaignId: campaign._id || campaignId
    }).catch(error => {
      console.error(`Async ${scrapingType} scraping failed for campaign ${campaignId}:`, error);
    });

  } catch (error) {
    return handleScrapingError(res, error, `async ${scrapingType} scraping`);
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

/**
 * Background processing for async scraping
 */
async function processAsyncScraping(
  campaignId: string,
  scrapingType: keyof typeof SCRAPING_CONFIGS,
  targetValue: string,
  options: any
): Promise<void> {
  try {
    // Import progress service
    const { scrapingProgressService } = await import('../../../services/scraping-progress.service');
    
    // Initialize progress
    scrapingProgressService.updateProgress(campaignId, {
      totalTweets: options.maxTweets || 100,
      scrapedTweets: 0,
      currentPhase: 'initializing',
      message: `Starting ${scrapingType} scraping for: ${targetValue}`,
      timeElapsed: 0,
      percentage: 0
    });

    // Get scraper service
    const scraper = await getScraperService();
    
    // Update progress to scraping phase
    scrapingProgressService.updateProgress(campaignId, {
      currentPhase: 'scraping',
      message: `Scraping ${scrapingType}: ${targetValue}`
    });

    let result;
    const scrapingOptions = {
      ...options,
      campaignId // Pass campaignId for progress tracking
    };

    // Call appropriate scraping method
    switch (scrapingType) {
      case 'hashtag':
        result = await scraper.scrapeByHashtag(targetValue, scrapingOptions);
        break;
      case 'user':
        result = await scraper.scrapeByUser(targetValue, scrapingOptions);
        break;
      case 'search':
        // For search queries, use hashtag scraping method
        result = await scraper.scrapeByHashtag(targetValue, scrapingOptions);
        break;
      default:
        throw new Error(`Unsupported scraping type: ${scrapingType}`);
    }

    // Update progress to analyzing phase
    scrapingProgressService.updateProgress(campaignId, {
      currentPhase: 'analyzing',
      message: 'Processing and analyzing scraped tweets...'
    });

    // Store tweets in database
    if (result.tweets && result.tweets.length > 0) {
      await tweetDatabaseService.saveTweetsBulk(result.tweets, campaignId);
    }

    // Update campaign status
    await updateCampaignStatus(campaignId, 'completed', {
      tweetsScraped: result.tweets?.length || 0,
      completedAt: new Date()
    });

    // Complete progress
    scrapingProgressService.completeProgress(campaignId);

  } catch (error) {
    console.error(`Error in async ${scrapingType} scraping:`, error);
    
    // Update campaign status to error
    await updateCampaignStatus(campaignId, 'error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      failedAt: new Date()
    });

    // Report error progress
    const { scrapingProgressService } = await import('../../../services/scraping-progress.service');
    scrapingProgressService.errorProgress(
      campaignId, 
      error instanceof Error ? error.message : 'Unknown error during scraping'
    );
  }
}

/**
 * Helper function to extract target value from request body
 */
function extractTargetValue(body: any, fieldNames: string[], config: any): string | null {
  for (const fieldName of fieldNames) {
    if (body[fieldName]) {
      const value = Array.isArray(body[fieldName]) ? body[fieldName][0] : body[fieldName];
      return typeof value === 'string' ? value.replace(config.stripPrefix, '') : null;
    }
  }
  return null;
}

/**
 * Create campaign record in database
 */
async function createCampaignRecord(data: any): Promise<any> {
  try {
    // Import campaign service/model
    const { CampaignModel } = await import('../../../models/Campaign.model');
    
    const campaign = new CampaignModel({
      name: `${data.type} - ${data.target}`,
      description: `Async ${data.type} scraping for ${data.target}`,
      type: data.type,
      status: data.status,
      hashtags: data.type === 'hashtag' ? [data.target] : [],
      keywords: data.type === 'search' ? [data.target] : [],
      mentions: data.type === 'user' ? [data.target] : [],
      maxTweets: data.maxTweets,
      dataSources: ['twitter'],
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return await campaign.save();
  } catch (error) {
    console.error('Error creating campaign record:', error);
    // Return mock object if database fails
    return { _id: data.campaignId };
  }
}

/**
 * Update campaign status in database
 */
async function updateCampaignStatus(campaignId: string, status: string, data: any): Promise<void> {
  try {
    const { CampaignModel } = await import('../../../models/Campaign.model');
    await CampaignModel.findByIdAndUpdate(campaignId, {
      status,
      ...data,
      updatedAt: new Date()
    });
  } catch (error) {
    console.error('Error updating campaign status:', error);
  }
}

// ==================== Status & Management Handlers ====================
export async function getScrapingStatus(req: Request, res: Response): Promise<void> {
  try {
    const scraper = await getScraperService();
    const rateLimitStatus = scraper.getRateLimitStatus();
    const authStatusDetail = scraper.getAuthenticationStatus();

    const statusResponse = {
      success: true,
      data: {
        service_status: 'operational' as const,
        authentication: {
          status: authStatusDetail.isAuthenticated
            ? ('authenticated' as const)
            : ('failed' as const),
          last_check: authStatusDetail.lastCheck,
          consecutive_failures: authStatusDetail.consecutiveFailures,
        },
        rate_limit: {
          remaining: rateLimitStatus.remaining,
          reset_time: rateLimitStatus.resetTime,
          request_count: rateLimitStatus.requestCount,
        },
        scraper_info: {
          type: '@the-convocation/twitter-scraper' as const,
          max_tweets_per_request: 1000,
          rate_limit_window: '1 hour' as const,
        },
      },
      message: 'Scraping service operational',
    } as const;

    res.json(statusResponse);
  } catch (error) {
    handleScrapingError(res, error, 'status check');
  }
}

export async function forceReauth(req: Request, res: Response): Promise<void> {
  try {
    await twitterAuth.forceReauth();
    const status = twitterAuth.getStatus();

    const reauthResponse = {
      success: status.ready,
      message: status.ready ? 'Re-authentication successful' : 'Re-authentication failed',
      error: status.error,
      timestamp: new Date().toISOString(),
    } as const;

    res.json(reauthResponse);
  } catch (error) {
    handleScrapingError(res, error, 're-authentication');
  }
}

export async function listTweets(req: Request, res: Response): Promise<void> {
  try {
    const { campaignId, limit = DEFAULT_TWEET_LIMIT } = req.query;
    const parsedLimit = Math.max(
      1,
      Math.min(1000, parseInt(limit as string, 10) || DEFAULT_TWEET_LIMIT)
    );

    let tweets: BasicTweet[];

    if (campaignId && typeof campaignId === 'string') {
      tweets = await tweetDatabaseService.getTweetsByCampaign(campaignId, parsedLimit);
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
      },
      message: `Found ${tweets.length} tweets in database`,
    } as const;

    res.json(listResponse);
  } catch (error) {
    handleScrapingError(res, error, 'database tweets list');
  }
}
