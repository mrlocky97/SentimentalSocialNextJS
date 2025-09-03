 
import { Request, Response } from "express";
import { SCRAPING_CONFIG, Sanitizers } from "../../../config/scraping.config";
import { Label } from "../../../enums/sentiment.enum";
import { logger } from "../../../lib/observability/logger";
import type { TweetSentimentAnalysis } from "../../../lib/sentiment/types";
import { TweetDatabaseService } from "../../../services/tweet-database.service";
import { TweetSentimentAnalysisManager } from "../../../services/tweet-sentiment-analysis.manager.service";
import { TwitterAuthManager } from "../../../services/twitter-auth-manager.service";
import { TwitterRealScraperService } from "../../../services/twitter-scraper.service";
import type {
  ScrapingResult,
  SentimentAnalysis,
  Tweet,
} from "../../../types/twitter";

// ==================== Constants & Configuration ====================
const { MAX_CONCURRENT_BY_IP, INFLIGHT_TTL_MS } = SCRAPING_CONFIG.CONCURRENCY;
const { PATTERNS: SAN_PATTERNS } = SCRAPING_CONFIG.SANITIZATION;
const VALID_USERNAME = SAN_PATTERNS.USERNAME;
const { MIN_TWEETS, MAX_TWEETS } = SCRAPING_CONFIG.LIMITS;

// Precompiled sentiment label mappings for performance
const POSITIVE_LABELS = new Set([
  Label.VERY_POSITIVE,
  Label.POSITIVE,
  "very_positive",
  "positive",
]);

const NEGATIVE_LABELS = new Set([
  Label.VERY_NEGATIVE,
  Label.NEGATIVE,
  "very_negative",
  "negative",
]);

// ==================== Types & Interfaces ====================
export interface ScrapingContext {
  readonly type: "hashtag" | "user" | "search";
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
  hashtag?: string;
  username?: string;
  query?: string;
  limit?: number;
  maxTweets?: number;
  analyzeSentiment?: boolean;
  campaignId?: string;
  language?: string;
}

interface InternalParams {
  readonly identifier: string;
  readonly tweetsToRetrieve: number;
  readonly analyzeSentiment: boolean;
  readonly campaignId?: string;
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
    readonly tweets: Tweet[];
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

// ==================== Service Singletons ====================
export const sentimentManager = new TweetSentimentAnalysisManager();
export const tweetDatabaseService = new TweetDatabaseService();
export const twitterAuth = TwitterAuthManager.getInstance();

// ==================== Concurrency Management ====================
class ConcurrencyManager {
  private readonly inFlightByIp = new Map<string, number>();

  cleanup(): void {
    const now = Date.now();
    const expiredEntries: string[] = [];

    for (const [key, ts] of this.inFlightByIp) {
      if (now - ts > INFLIGHT_TTL_MS) {
        expiredEntries.push(key);
      }
    }

    expiredEntries.forEach((key) => this.inFlightByIp.delete(key));
  }

  checkLimit(ip: string, res: Response): boolean {
    const concurrent = Array.from(this.inFlightByIp.keys()).filter(
      (k) => k === ip,
    ).length;

    if (concurrent >= MAX_CONCURRENT_BY_IP) {
      res.status(429).json({
        success: false,
        error:
          "Too many concurrent scraping requests from this IP. Please wait.",
        code: "CONCURRENCY_LIMIT",
      });
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
}

const concurrencyManager = new ConcurrencyManager();

// ==================== Utility Functions ====================
export const sanitizeHashtag = Sanitizers.hashtag;
export const sanitizeUsername = Sanitizers.username;
export const sanitizeQuery = Sanitizers.query;

const getClientIp = (req: Request): string =>
  (req.ip || req.socket.remoteAddress || "unknown").toString();

const createErrorResponse = (field: string, example: string) => ({
  success: false,
  error: `${field} cannot be empty after sanitization`,
  example: { [field]: example },
});

export function ensureNotEmpty(
  res: Response,
  value: string,
  field: string,
  example: string,
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
  options: { minTweets?: number; maxTweets?: number } = {},
): boolean {
  const { minTweets = MIN_TWEETS, maxTweets = MAX_TWEETS } = options;

  // Validate identifier
  if (!params.identifier || typeof params.identifier !== "string") {
    res.status(400).json({
      success: false,
      error: `${params.type} is required and must be a string`,
      example: { [params.type]: params.exampleValue },
    });
    return false;
  }

  // Validate tweets count
  if (!Number.isFinite(params.tweetsToRetrieve)) {
    res.status(400).json({
      success: false,
      error: "limit/maxTweets must be a number",
    });
    return false;
  }

  if (
    params.tweetsToRetrieve < minTweets ||
    params.tweetsToRetrieve > maxTweets
  ) {
    res.status(400).json({
      success: false,
      error: `maxTweets/limit must be between ${minTweets} and ${maxTweets}`,
      provided: params.tweetsToRetrieve,
    });
    return false;
  }

  // Validate language
  if (params.language && !params.validLanguages.includes(params.language)) {
    res.status(400).json({
      success: false,
      error: `Invalid language code. Must be one of: ${params.validLanguages.join(", ")}`,
      example: { language: "es" },
    });
    return false;
  }

  return true;
}

// ==================== Sentiment Processing ====================
const normalizeSentimentLabel = (label: string): Label => {
  if (POSITIVE_LABELS.has(label as Label)) return Label.POSITIVE;
  if (NEGATIVE_LABELS.has(label as Label)) return Label.NEGATIVE;
  return Label.NEUTRAL;
};

export function processSentimentAnalysis(
  tweets: Tweet[],
  analyses: TweetSentimentAnalysis[],
): Tweet[] {
  return tweets.map((tweet, index) => {
    const analysis = analyses[index];
    if (!analysis) return tweet;

    const src = analysis.analysis.sentiment;
    const normalized = normalizeSentimentLabel(src.label as string);

    const rawMagnitude = (src as any).magnitude;
    const rawEmotions = (src as any).emotions;

    const sentiment: SentimentAnalysis = {
      score: typeof src.score === "number" ? src.score : 0,
      magnitude:
        typeof rawMagnitude === "number"
          ? rawMagnitude
          : Math.abs(src.score || 0),
      label: normalized,
      confidence: typeof src.confidence === "number" ? src.confidence : 1,
      emotions: rawEmotions,
      keywords: analysis.analysis.keywords || [],
      analyzedAt: analysis.analyzedAt,
      processingTime: Date.now() - analysis.analyzedAt.getTime(),
    };

    return { ...tweet, sentiment } as Tweet;
  });
}

// ==================== Core Services ====================
export async function getScraperService(): Promise<TwitterRealScraperService> {
  return twitterAuth.getScraperService();
}

export function handleScrapingError(
  res: Response,
  error: unknown,
  context: string,
): void {
  const message = error instanceof Error ? error.message : "Unknown error";
  logger.error(`Error in ${context}: ${message}`, { error });

  res.status(500).json({
    success: false,
    error: message,
    message: `Failed to scrape ${context}`,
  });
}

// ==================== Internal Helper Functions ====================
function buildInternalParams<B extends ScrapingRequestBody>(
  body: B,
  context: ScrapingContext,
  defaultTweets: number,
): InternalParams {
  const identifierCandidate = (body as Record<string, unknown>)[context.type];
  const identifier =
    (typeof identifierCandidate === "string" && identifierCandidate) ||
    body.query ||
    body.username ||
    body.hashtag ||
    "";

  const language =
    body.language && SCRAPING_CONFIG.LANGUAGES.includes(body.language as any)
      ? body.language
      : "en";

  return {
    identifier,
    tweetsToRetrieve: Number(body.limit ?? body.maxTweets ?? defaultTweets),
    analyzeSentiment: body.analyzeSentiment !== false,
    campaignId: body.campaignId,
    language,
    validLanguages: SCRAPING_CONFIG.LANGUAGES,
    type: context.type,
    exampleValue: context.exampleValue,
  } as const;
}

function sanitizeIdentifier(
  params: InternalParams,
  context: ScrapingContext,
  res: Response,
): string | null {
  switch (context.type) {
    case "hashtag": {
      const safeIdentifier = sanitizeHashtag(params.identifier);
      return ensureNotEmpty(res, safeIdentifier, "hashtag", "JustDoIt")
        ? safeIdentifier
        : null;
    }

    case "user": {
      const uname = sanitizeUsername(params.identifier);
      if (!VALID_USERNAME.test(uname)) {
        res.status(400).json({
          success: false,
          error:
            "Invalid username. Use 1-15 alphanumeric or underscore characters, without @",
          example: { username: "nike" },
        });
        return null;
      }
      return uname;
    }

    default: {
      // "search"
      const q = sanitizeQuery(params.identifier);
      if (!ensureNotEmpty(res, q, "query", "nike shoes")) return null;

      const hashtagMatch = q.match(/#([A-Za-z0-9_]+)/);
      const firstWord = q.split(/\s+/)[0];
      const safeIdentifier = sanitizeHashtag(
        hashtagMatch ? hashtagMatch[1] : firstWord,
      );

      return ensureNotEmpty(res, safeIdentifier, "query", "nike")
        ? safeIdentifier
        : null;
    }
  }
}

async function performScraping(
  context: ScrapingContext,
  safeIdentifier: string,
  params: InternalParams,
  includeReplies: boolean,
  languageFilter: boolean,
): Promise<ScrapingResult> {
  const scraper = await getScraperService();
  const scrapingOptions = {
    maxTweets: params.tweetsToRetrieve,
    includeReplies,
    ...(languageFilter && { language: params.language }),
  } as const;

  return context.type === "user"
    ? scraper.scrapeByUser(safeIdentifier, scrapingOptions)
    : scraper.scrapeByHashtag(safeIdentifier, scrapingOptions);
}

async function processAndPersistSentiment(
  tweets: Tweet[],
  analyzeSentiment: boolean,
  campaignId?: string,
): Promise<{
  tweetsWithSentiment: Tweet[];
  sentimentSummary: ReturnType<
    typeof sentimentManager.generateStatistics
  > | null;
}> {
  let tweetsWithSentiment = tweets;
  let sentimentSummary: ReturnType<
    typeof sentimentManager.generateStatistics
  > | null = null;

  if (analyzeSentiment && tweetsWithSentiment.length > 0) {
    const analyses =
      await sentimentManager.analyzeTweetsBatch(tweetsWithSentiment);
    sentimentSummary = sentimentManager.generateStatistics(analyses);
    tweetsWithSentiment = processSentimentAnalysis(
      tweetsWithSentiment,
      analyses,
    );
  }

  if (tweetsWithSentiment.length > 0) {
    try {
      await tweetDatabaseService.saveTweetsBulk(
        tweetsWithSentiment,
        campaignId,
      );
    } catch (dbErr) {
      logger.warn("Database save issue", { error: dbErr });
    }
  }

  return { tweetsWithSentiment, sentimentSummary };
}

// ==================== Main Handler Function ====================
export async function handleScrapingRequest<
  B extends ScrapingRequestBody = ScrapingRequestBody,
>(
  req: Request,
  res: Response,
  context: ScrapingContext,
  options: ScrapingRequestOptions = {},
  returnResultInsteadOfSending = false,
): Promise<ScrapingResponse | void> {
  const {
    minTweets = 1,
    maxTweets = 1000,
    defaultTweets = 50,
    includeReplies = false,
    languageFilter = false,
  } = options;

  const ip = getClientIp(req);

  try {
    // Concurrency control
    concurrencyManager.cleanup();
    if (!concurrencyManager.checkLimit(ip, res)) return;
    concurrencyManager.track(ip);

    // Parameter processing and validation
    const body = req.body as B;
    const params = buildInternalParams(body, context, defaultTweets);

    if (!validateRequestParams(res, params, { minTweets, maxTweets })) return;

    const safeIdentifier = sanitizeIdentifier(params, context, res);
    if (!safeIdentifier) return;

    // Main scraping workflow
    const start = Date.now();
    const scrapingResult = await performScraping(
      context,
      safeIdentifier,
      params,
      includeReplies,
      languageFilter,
    );

    const { tweetsWithSentiment, sentimentSummary } =
      await processAndPersistSentiment(
        scrapingResult.tweets,
        params.analyzeSentiment,
        params.campaignId,
      );

    // Response construction
    const execTime = Date.now() - start;
    const response: ScrapingResponse = {
      success: true,
      data: {
        [context.type]:
          context.type === "hashtag"
            ? `#${safeIdentifier}`
            : context.type === "user"
              ? `@${safeIdentifier}`
              : safeIdentifier,
        requested: params.tweetsToRetrieve,
        totalFound: scrapingResult.totalFound,
        totalScraped: tweetsWithSentiment.length,
        tweets: tweetsWithSentiment,
        sentiment_summary: sentimentSummary,
        campaignId: params.campaignId ?? "",
        campaignInfo: {
          id: params.campaignId ?? "",
          type: params.campaignId ? "user-provided" : "auto-generated",
          source: context.type,
        },
        rate_limit: {
          remaining: scrapingResult.rateLimit.remaining,
          reset_time: scrapingResult.rateLimit.resetTime,
        },
      },
      execution_time: execTime,
      message: `Scraped ${tweetsWithSentiment.length}/${params.tweetsToRetrieve} ${context.type} tweets${params.analyzeSentiment ? " with sentiment" : ""}`,
    };

    return returnResultInsteadOfSending ? response : void res.json(response);
  } catch (err) {
    handleScrapingError(res, err, `${context.type} scraping`);

    if (returnResultInsteadOfSending) {
      return {
        success: false,
        data: {
          requested: 0,
          totalFound: 0,
          totalScraped: 0,
          tweets: [],
          sentiment_summary: null,
          campaignId: "",
          campaignInfo: { id: "", type: "error", source: context.type },
          rate_limit: { remaining: 0, reset_time: new Date() },
        },
        execution_time: 0,
        message: err instanceof Error ? err.message : "Unknown error",
      };
    }
  } finally {
    concurrencyManager.release(ip);
  }
}
