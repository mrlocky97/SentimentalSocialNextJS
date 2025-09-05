/**
 * Optimized Scraping Controller - Enhanced Performance & Type Safety
 * Improved error handling, reduced allocations, and better separation of concerns
 */

import { Request, Response } from 'express';
import { SCRAPING_CONFIG, Sanitizers } from '../../../config/scraping.config';
import { Label } from '../../../enums/sentiment.enum';
import { logger } from '../../../lib/observability/logger';
import type { TweetSentimentAnalysis } from '../../../lib/sentiment/types';
import { TweetDatabaseService } from '../../../services/tweet-database.service';
import { TweetSentimentAnalysisManager } from '../../../services/tweet-sentiment-analysis.manager.service';
import { TwitterAuthManager } from '../../../services/twitter-auth-manager.service';
import { TwitterRealScraperService } from '../../../services/twitter-scraper.service';
import type { ScrapingResult, SentimentAnalysis, Tweet } from '../../../types/twitter';

// ==================== Constants & Configuration ====================
const { MAX_CONCURRENT_BY_IP, INFLIGHT_TTL_MS } = SCRAPING_CONFIG.CONCURRENCY;
const { PATTERNS: SAN_PATTERNS } = SCRAPING_CONFIG.SANITIZATION;
const { MIN_TWEETS, MAX_TWEETS } = SCRAPING_CONFIG.LIMITS;

// Optimized sentiment label sets
const POSITIVE_LABELS = Object.freeze(
  new Set([Label.VERY_POSITIVE, Label.POSITIVE, 'very_positive', 'positive'] as const)
);

const NEGATIVE_LABELS = Object.freeze(
  new Set([Label.VERY_NEGATIVE, Label.NEGATIVE, 'very_negative', 'negative'] as const)
);

// ==================== Types & Interfaces ====================
export interface ScrapingContext {
  readonly type: 'hashtag' | 'user' | 'search';
  readonly identifier: string;
  readonly exampleValue: string;
}

export interface ScrapingRequestOptions {
  readonly minTweets?: number;
  readonly maxTweets?: number;
  readonly defaultTweets?: number;
  readonly includeReplies?: boolean;
  readonly languageFilter?: boolean;
}

export interface ScrapingRequestBody {
  readonly hashtag?: string;
  readonly username?: string;
  readonly query?: string;
  readonly limit?: number;
  readonly maxTweets?: number;
  readonly analyzeSentiment?: boolean;
  readonly campaignId: string; // ✅ Now required
  readonly language?: string;
}

interface InternalParams {
  readonly identifier: string;
  readonly tweetsToRetrieve: number;
  readonly analyzeSentiment: boolean;
  readonly campaignId: string; // ✅ Now required
  readonly language: string;
  readonly validLanguages: readonly string[];
  readonly type: string;
  readonly exampleValue: string;
}

export interface ScrapingResponse {
  readonly success: boolean;
  readonly data: {
    readonly [key: string]: unknown;
    readonly requested: number;
    readonly totalFound: number;
    readonly totalScraped: number;
    readonly tweets: readonly Tweet[];
    readonly sentiment_summary: unknown;
    readonly campaignId: string;
    readonly campaignInfo: {
      readonly id: string;
      readonly type: string;
      readonly source: string;
    };
    readonly rate_limit: {
      readonly remaining: number;
      readonly reset_time: Date;
    };
  };
  readonly execution_time: number;
  readonly message: string;
}

type ErrorResponse = {
  readonly success: false;
  readonly error: string;
  readonly code?: string;
  readonly example?: Record<string, string>;
  readonly provided?: number;
  readonly message?: string;
};

// ==================== Service Singletons ====================
export const sentimentManager = new TweetSentimentAnalysisManager();
export const tweetDatabaseService = new TweetDatabaseService();
export const twitterAuth = TwitterAuthManager.getInstance();

// ==================== Concurrency Management ====================
class ConcurrencyManager {
  private readonly inFlightByIp = new Map<string, number>();

  cleanup(): void {
    if (this.inFlightByIp.size === 0) return;

    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, timestamp] of this.inFlightByIp) {
      if (now - timestamp > INFLIGHT_TTL_MS) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.inFlightByIp.delete(key);
    }
  }

  checkLimit(ip: string, res: Response): boolean {
    const concurrent = Array.from(this.inFlightByIp.keys()).filter((key) => key === ip).length;

    if (concurrent >= MAX_CONCURRENT_BY_IP) {
      res.status(429).json({
        success: false,
        error: 'Too many concurrent scraping requests from this IP. Please wait.',
        code: 'CONCURRENCY_LIMIT',
      } satisfies ErrorResponse);
      return false;
    }
    return true;
  }

  track(ip: string): void {
    this.inFlightByIp.set(ip, Date.now());
  }

  release(ip: string): void {
    this.inFlightByIp.delete(ip);
  }

  getStats() {
    return {
      totalTracked: this.inFlightByIp.size,
      oldestRequest: Math.min(...this.inFlightByIp.values()),
    };
  }
}

const concurrencyManager = new ConcurrencyManager();

// ==================== Utility Functions ====================
export const {
  hashtag: sanitizeHashtag,
  username: sanitizeUsername,
  query: sanitizeQuery,
} = Sanitizers;

const getClientIp = (req: Request): string =>
  (req.ip ?? req.socket.remoteAddress ?? 'unknown').toString();

const createErrorResponse = (field: string, example: string): ErrorResponse => ({
  success: false,
  error: `${field} cannot be empty after sanitization`,
  example: { [field]: example },
});

export function ensureNotEmpty(
  res: Response,
  value: string,
  field: string,
  example: string
): boolean {
  if (!value) {
    res.status(400).json(createErrorResponse(field, example));
    return false;
  }
  return true;
}

// ==================== Validation ====================
export function validateRequestParams(
  res: Response,
  params: InternalParams,
  options: { readonly minTweets?: number; readonly maxTweets?: number } = {}
): boolean {
  const { minTweets = MIN_TWEETS, maxTweets = MAX_TWEETS } = options;

  // Validate identifier
  if (!params.identifier || typeof params.identifier !== 'string') {
    res.status(400).json({
      success: false,
      error: `${params.type} is required and must be a string`,
      example: { [params.type]: params.exampleValue },
    } satisfies ErrorResponse);
    return false;
  }

  // Validate tweets count
  if (!Number.isFinite(params.tweetsToRetrieve)) {
    res.status(400).json({
      success: false,
      error: 'limit/maxTweets must be a number',
    } satisfies ErrorResponse);
    return false;
  }

  if (params.tweetsToRetrieve < minTweets || params.tweetsToRetrieve > maxTweets) {
    res.status(400).json({
      success: false,
      error: `maxTweets/limit must be between ${minTweets} and ${maxTweets}`,
      provided: params.tweetsToRetrieve,
    } satisfies ErrorResponse);
    return false;
  }

  // Validate language
  if (params.language && !params.validLanguages.includes(params.language)) {
    res.status(400).json({
      success: false,
      error: `Invalid language code. Must be one of: ${params.validLanguages.join(', ')}`,
      example: { language: 'es' },
    } satisfies ErrorResponse);
    return false;
  }

  return true;
}

// ==================== Sentiment Processing ====================
const normalizeSentimentLabel = (label: string): Label => {
  if (POSITIVE_LABELS.has(label as any)) return Label.POSITIVE;
  if (NEGATIVE_LABELS.has(label as any)) return Label.NEGATIVE;
  return Label.NEUTRAL;
};

export function processSentimentAnalysis(
  tweets: readonly Tweet[],
  analyses: readonly TweetSentimentAnalysis[]
): Tweet[] {
  const result: Tweet[] = [];
  const maxIndex = Math.min(tweets.length, analyses.length);

  for (let i = 0; i < maxIndex; i++) {
    const tweet = tweets[i];
    const analysis = analyses[i];

    if (!analysis) {
      result.push(tweet);
      continue;
    }

    const src = analysis.analysis.sentiment;
    const normalized = normalizeSentimentLabel(src.label as string);

    const sentiment: SentimentAnalysis = {
      score: typeof src.score === 'number' ? src.score : 0,
      magnitude:
        typeof (src as any).magnitude === 'number'
          ? (src as any).magnitude
          : Math.abs(src.score ?? 0),
      label: normalized,
      confidence: typeof src.confidence === 'number' ? src.confidence : 1,
      emotions: (src as any).emotions,
      keywords: analysis.analysis.keywords ?? [],
      analyzedAt: analysis.analyzedAt,
      processingTime: Date.now() - analysis.analyzedAt.getTime(),
    };

    result.push({ ...tweet, sentiment });
  }

  return result;
}

// ==================== Core Services ====================
export async function getScraperService(): Promise<TwitterRealScraperService> {
  return twitterAuth.getScraperService();
}

export function handleScrapingError(res: Response, error: unknown, context: string): void {
  const message = error instanceof Error ? error.message : 'Unknown error';
  logger.error(`Error in ${context}: ${message}`, { error });

  res.status(500).json({
    success: false,
    error: message,
    message: `Failed to scrape ${context}`,
  } satisfies ErrorResponse);
}

// ==================== Internal Helper Functions ====================
function buildInternalParams<B extends ScrapingRequestBody>(
  body: B,
  context: ScrapingContext,
  defaultTweets: number
): InternalParams {
  const identifierCandidate = (body as Record<string, unknown>)[context.type];
  const identifier =
    (typeof identifierCandidate === 'string' && identifierCandidate) ||
    body.query ||
    body.username ||
    body.hashtag ||
    '';

  const language =
    body.language && SCRAPING_CONFIG.LANGUAGES.includes(body.language as any)
      ? body.language
      : 'en';

  // ✅ Validate required campaignId
  if (!body.campaignId || typeof body.campaignId !== 'string' || body.campaignId.trim().length === 0) {
    throw new Error('campaignId is required and must be a non-empty string');
  }

  return Object.freeze({
    identifier,
    tweetsToRetrieve: Number(body.limit ?? body.maxTweets ?? defaultTweets),
    analyzeSentiment: body.analyzeSentiment !== false,
    campaignId: body.campaignId.trim(),
    language,
    validLanguages: SCRAPING_CONFIG.LANGUAGES,
    type: context.type,
    exampleValue: context.exampleValue,
  });
}

function sanitizeIdentifier(
  params: InternalParams,
  context: ScrapingContext,
  res: Response
): string | null {
  switch (context.type) {
    case 'hashtag': {
      const safeIdentifier = sanitizeHashtag(params.identifier);
      return ensureNotEmpty(res, safeIdentifier, 'hashtag', 'JustDoIt') ? safeIdentifier : null;
    }

    case 'user': {
      const uname = sanitizeUsername(params.identifier);
      if (!SAN_PATTERNS.VALID_USERNAME.test(uname)) {
        res.status(400).json({
          success: false,
          error: 'Invalid username. Use 1-15 alphanumeric or underscore characters, without @',
          example: { username: 'nike' },
        } satisfies ErrorResponse);
        return null;
      }
      return uname;
    }

    default: {
      // "search"
      const q = sanitizeQuery(params.identifier);
      if (!ensureNotEmpty(res, q, 'query', 'nike shoes')) return null;

      const hashtagMatch = q.match(/#([A-Za-z0-9_]+)/);
      const firstWord = q.split(/\s+/)[0];
      const safeIdentifier = sanitizeHashtag(hashtagMatch ? hashtagMatch[1] : firstWord);

      return ensureNotEmpty(res, safeIdentifier, 'query', 'nike') ? safeIdentifier : null;
    }
  }
}

async function performScraping(
  context: ScrapingContext,
  safeIdentifier: string,
  params: InternalParams,
  includeReplies: boolean,
  languageFilter: boolean
): Promise<ScrapingResult> {
  const scraper = await getScraperService();
  const scrapingOptions = Object.freeze({
    maxTweets: params.tweetsToRetrieve,
    includeReplies,
    ...(languageFilter && { language: params.language }),
  });

  return context.type === 'user'
    ? scraper.scrapeByUser(safeIdentifier, scrapingOptions)
    : scraper.scrapeByHashtag(safeIdentifier, scrapingOptions);
}

/**
 * Process and persist sentiment analysis results
 * @param tweets - array of tweets to analyze
 * @param analyzeSentiment - whether to perform sentiment analysis
 * @param campaignId - optional campaign ID for tracking
 * @returns processed tweets and sentiment summary
 */
async function processAndPersistSentiment(
  tweets: readonly Tweet[],
  analyzeSentiment: boolean,
  campaignId?: string
): Promise<{
  readonly tweetsWithSentiment: Tweet[];
  readonly sentimentSummary: ReturnType<typeof sentimentManager.generateStatistics> | null;
}> {
  let tweetsWithSentiment: Tweet[] = [...tweets];
  let sentimentSummary: ReturnType<typeof sentimentManager.generateStatistics> | null = null;

  if (analyzeSentiment && tweetsWithSentiment.length > 0) {
    try {
      const analyses = await sentimentManager.analyzeTweetsBatch(tweetsWithSentiment);
      sentimentSummary = sentimentManager.generateStatistics(analyses);
      tweetsWithSentiment = processSentimentAnalysis(tweetsWithSentiment, analyses);
    } catch (sentimentError) {
      logger.warn('Sentiment analysis failed, continuing without sentiment data', {
        error: sentimentError,
        tweetCount: tweetsWithSentiment.length,
      });
    }
  }

  if (tweetsWithSentiment.length > 0) {
    try {
      logger.info(`Attempting to save ${tweetsWithSentiment.length} tweets to database`, {
        campaignId,
        tweetIds: tweetsWithSentiment.slice(0, 3).map((t) => t.tweetId),
      });

      const saveResult = await tweetDatabaseService.saveTweetsBulk(tweetsWithSentiment, campaignId);

      logger.info('Database save completed', {
        success: saveResult.success,
        saved: saveResult.saved,
        errors: saveResult.errors,
        errorMessages: saveResult.errorMessages,
      });

      if (!saveResult.success && saveResult.errorMessages.length > 0) {
        logger.error('Database save failed', {
          errorMessages: saveResult.errorMessages,
          tweetsProcessed: saveResult.totalProcessed,
        });
      }
    } catch (dbErr) {
      logger.error('Critical database save error', {
        error: dbErr,
        tweetsCount: tweetsWithSentiment.length,
        campaignId,
      });
    }
  } else {
    logger.info('No tweets to save to database');
  }

  return Object.freeze({ tweetsWithSentiment, sentimentSummary });
}

// ==================== Response Builder ====================
function buildSuccessResponse(
  context: ScrapingContext,
  safeIdentifier: string,
  params: InternalParams,
  scrapingResult: ScrapingResult,
  tweetsWithSentiment: readonly Tweet[],
  sentimentSummary: any,
  execTime: number
): ScrapingResponse {
  const identifierWithPrefix =
    context.type === 'hashtag'
      ? `#${safeIdentifier}`
      : context.type === 'user'
        ? `@${safeIdentifier}`
        : safeIdentifier;

  return Object.freeze({
    success: true,
    data: {
      [context.type]: identifierWithPrefix,
      requested: params.tweetsToRetrieve,
      totalFound: scrapingResult.totalFound,
      totalScraped: tweetsWithSentiment.length,
      tweets: tweetsWithSentiment,
      sentiment_summary: sentimentSummary,
      campaignId: params.campaignId, // ✅ Now guaranteed to exist
      campaignInfo: {
        id: params.campaignId,
        type: 'user-provided',
        source: context.type,
      },
      rate_limit: {
        remaining: scrapingResult.rateLimit.remaining,
        reset_time: scrapingResult.rateLimit.resetTime,
      },
    },
    execution_time: execTime,
    message: `Scraped ${tweetsWithSentiment.length}/${params.tweetsToRetrieve} ${context.type} tweets${params.analyzeSentiment ? ' with sentiment' : ''} for campaign ${params.campaignId}`,
  });
}

function buildErrorResponse(error: unknown, context: ScrapingContext): ScrapingResponse {
  return Object.freeze({
    success: false,
    data: {
      requested: 0,
      totalFound: 0,
      totalScraped: 0,
      tweets: [],
      sentiment_summary: null,
      campaignId: '',
      campaignInfo: { id: '', type: 'error', source: context.type },
      rate_limit: { remaining: 0, reset_time: new Date() },
    },
    execution_time: 0,
    message: error instanceof Error ? error.message : 'Unknown error',
  });
}

// ==================== Main Handler Function ====================
export async function handleScrapingRequest<B extends ScrapingRequestBody = ScrapingRequestBody>(
  req: Request,
  res: Response,
  context: ScrapingContext,
  options: ScrapingRequestOptions = {},
  returnResultInsteadOfSending = false
): Promise<ScrapingResponse | void> {
  const {
    minTweets = 1,
    maxTweets = 1000,
    defaultTweets = 50,
    includeReplies = false,
    languageFilter = false,
  } = options;

  const ip = getClientIp(req);
  const startTime = Date.now();

  try {
    // Concurrency control
    concurrencyManager.cleanup();
    if (!concurrencyManager.checkLimit(ip, res)) return;
    concurrencyManager.track(ip);

    // Parameter processing and validation
    const body = req.body as B;
    const params = buildInternalParams(body, context, defaultTweets);

    if (!validateRequestParams(res, params, { minTweets, maxTweets })) {
      return;
    }

    const safeIdentifier = sanitizeIdentifier(params, context, res);
    if (!safeIdentifier) return;

    // Main scraping workflow
    const scrapingResult = await performScraping(
      context,
      safeIdentifier,
      params,
      includeReplies,
      languageFilter
    );

    const { tweetsWithSentiment, sentimentSummary } = await processAndPersistSentiment(
      scrapingResult.tweets,
      params.analyzeSentiment,
      params.campaignId
    );

    // Response construction
    const execTime = Date.now() - startTime;
    const response = buildSuccessResponse(
      context,
      safeIdentifier,
      params,
      scrapingResult,
      tweetsWithSentiment,
      sentimentSummary,
      execTime
    );

    return returnResultInsteadOfSending ? response : void res.json(response);
  } catch (err) {
    if (!returnResultInsteadOfSending) {
      handleScrapingError(res, err, `${context.type} scraping`);
      return;
    }

    return buildErrorResponse(err, context);
  } finally {
    concurrencyManager.release(ip);
  }
}
