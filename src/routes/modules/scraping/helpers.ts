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
import { Request, Response } from "express";

// ---------------- Concurrency (per-IP basic throttling) ----------------
const inFlightByIp = new Map<string, number>();
const { MAX_CONCURRENT_BY_IP, INFLIGHT_TTL_MS } = SCRAPING_CONFIG.CONCURRENCY;

// ---------------- Sanitization & Validation Patterns (from config) ----------------
const { PATTERNS: SAN_PATTERNS } = SCRAPING_CONFIG.SANITIZATION;
const VALID_USERNAME = SAN_PATTERNS.USERNAME;

// ---------------- Service Singletons ----------------
export const sentimentManager = new TweetSentimentAnalysisManager();
export const tweetDatabaseService = new TweetDatabaseService();
export const twitterAuth = TwitterAuthManager.getInstance();

// ---------------- Public Context / Options ----------------
export interface ScrapingContext {
  type: "hashtag" | "user" | "search";
  identifier: string; // raw identifier (for reference only)
  exampleValue: string; // example for error messages
}

export interface ScrapingRequestOptions {
  minTweets?: number;
  maxTweets?: number;
  defaultTweets?: number;
  includeReplies?: boolean;
  languageFilter?: boolean;
}

interface InternalParams {
  identifier: string;
  tweetsToRetrieve: number;
  analyzeSentiment: boolean;
  campaignId?: string;
  language: string;
  validLanguages: string[];
  type: string;
  exampleValue: string;
}

export interface ScrapingRequestBody {
  hashtag?: string;
  username?: string;
  query?: string;
  limit?: number;
  maxTweets?: number;
  analyzeSentiment?: boolean; // default true
  campaignId?: string;
  language?: string; // ISO code
}

// ---------------- Sanitizers ----------------
export const sanitizeHashtag = Sanitizers.hashtag;
export const sanitizeUsername = Sanitizers.username;
export const sanitizeQuery = Sanitizers.query;

export function ensureNotEmpty(
  res: Response,
  value: string,
  field: string,
  example: string,
): boolean {
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

// ---------------- Validation ----------------
export function validateRequestParams(
  res: Response,
  params: InternalParams,
  options: { minTweets?: number; maxTweets?: number } = {},
): boolean {
  const {
    minTweets = SCRAPING_CONFIG.LIMITS.MIN_TWEETS,
    maxTweets = SCRAPING_CONFIG.LIMITS.MAX_TWEETS,
  } = options;

  if (!params.identifier || typeof params.identifier !== "string") {
    res.status(400).json({
      success: false,
      error: `${params.type} is required and must be a string`,
      example: { [params.type]: params.exampleValue },
    });
    return false;
  }

  if (!Number.isFinite(params.tweetsToRetrieve)) {
    res
      .status(400)
      .json({ success: false, error: "limit/maxTweets must be a number" });
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

// ---------------- Sentiment processing ----------------
export function processSentimentAnalysis(
  tweets: Tweet[],
  analyses: TweetSentimentAnalysis[],
): Tweet[] {
  return tweets.map((tweet, index) => {
    const analysis = analyses[index];
    if (!analysis) return tweet;
    const src = analysis.analysis.sentiment;

    // Normalize fine-grained labels into POSITIVE / NEGATIVE / NEUTRAL
    const normalized: Label = [
      Label.VERY_POSITIVE,
      Label.POSITIVE,
      "very_positive",
      "positive",
    ].includes(src.label as Label | string)
      ? Label.POSITIVE
      : [
            Label.VERY_NEGATIVE,
            Label.NEGATIVE,
            "very_negative",
            "negative",
          ].includes(src.label as Label | string)
        ? Label.NEGATIVE
        : Label.NEUTRAL;

    const rawMagnitude = (src as unknown as { magnitude?: number }).magnitude;
    const rawEmotions = (
      src as unknown as { emotions?: SentimentAnalysis["emotions"] }
    ).emotions;
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

export async function getScraperService(): Promise<TwitterRealScraperService> {
  return twitterAuth.getScraperService();
}

// ---------------- Error handling ----------------
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

// ---------------- Core generic handler ----------------
export async function handleScrapingRequest<
  B extends ScrapingRequestBody = ScrapingRequestBody,
>(
  req: Request<unknown, unknown, B>,
  res: Response,
  context: ScrapingContext,
  options: ScrapingRequestOptions = {},
): Promise<void> {
  const {
    minTweets = 1,
    maxTweets = 1000,
    defaultTweets = 50,
    includeReplies = false,
    languageFilter = false,
  } = options;

  try {
    // Cleanup old entries
    const now = Date.now();
    for (const [key, ts] of inFlightByIp.entries()) {
      if (now - ts > INFLIGHT_TTL_MS) inFlightByIp.delete(key);
    }
    const ip = (req.ip || req.socket.remoteAddress || "unknown").toString();
    const concurrent = [...inFlightByIp.keys()].filter((k) => k === ip).length;
    if (concurrent >= MAX_CONCURRENT_BY_IP) {
      res.status(429).json({
        success: false,
        error:
          "Too many concurrent scraping requests from this IP. Please wait.",
        code: "CONCURRENCY_LIMIT",
      });
      return;
    }
    inFlightByIp.set(ip, now);

    const body = req.body as B;
    const identifierCandidate = (body as Record<string, unknown>)[context.type];
    const params: InternalParams = {
      identifier:
        (typeof identifierCandidate === "string" && identifierCandidate) ||
        body.query ||
        body.username ||
        body.hashtag ||
        "",
      tweetsToRetrieve: Number(body.limit ?? body.maxTweets ?? defaultTweets),
      analyzeSentiment: body.analyzeSentiment !== false,
      campaignId: body.campaignId,
      language:
        body.language &&
        SCRAPING_CONFIG.LANGUAGES.includes(
          body.language as (typeof SCRAPING_CONFIG.LANGUAGES)[number],
        )
          ? body.language
          : "en",
      validLanguages: [...SCRAPING_CONFIG.LANGUAGES],
      type: context.type,
      exampleValue: context.exampleValue,
    };

    if (!validateRequestParams(res, params, { minTweets, maxTweets })) return;

    // Sanitize based on type
    let safeIdentifier = "";
    if (context.type === "hashtag") {
      safeIdentifier = sanitizeHashtag(params.identifier);
      if (!ensureNotEmpty(res, safeIdentifier, "hashtag", "JustDoIt")) return;
    } else if (context.type === "user") {
      const uname = sanitizeUsername(params.identifier);
      if (!VALID_USERNAME.test(uname)) {
        res.status(400).json({
          success: false,
          error:
            "Invalid username. Use 1-15 alphanumeric or underscore characters, without @",
          example: { username: "nike" },
        });
        return;
      }
      safeIdentifier = uname;
    } else {
      const q = sanitizeQuery(params.identifier);
      if (!ensureNotEmpty(res, q, "query", "nike shoes")) return;
      const hashtagMatch = q.match(/#([A-Za-z0-9_]+)/);
      const firstWord = q.split(/\s+/)[0];
      safeIdentifier = sanitizeHashtag(
        hashtagMatch ? hashtagMatch[1] : firstWord,
      );
      if (!ensureNotEmpty(res, safeIdentifier, "query", "nike")) return;
    }

    const start = Date.now();
    const scraper = await getScraperService();
    const scrapingOptions: {
      maxTweets: number;
      includeReplies: boolean;
      language?: string;
    } = {
      maxTweets: params.tweetsToRetrieve,
      includeReplies,
      ...(languageFilter ? { language: params.language } : {}),
    };

    let scrapingResult: ScrapingResult;
    if (context.type === "user") {
      scrapingResult = await scraper.scrapeByUser(
        safeIdentifier,
        scrapingOptions,
      );
    } else {
      // hashtag or search (mapped to hashtag keyword)
      scrapingResult = await scraper.scrapeByHashtag(
        safeIdentifier,
        scrapingOptions,
      );
    }

    // Sentiment
    let tweetsWithSentiment: Tweet[] = scrapingResult.tweets;
    let sentimentSummary: ReturnType<
      typeof sentimentManager.generateStatistics
    > | null = null;
    if (params.analyzeSentiment && tweetsWithSentiment.length > 0) {
      const analyses: TweetSentimentAnalysis[] =
        await sentimentManager.analyzeTweetsBatch(tweetsWithSentiment);
      sentimentSummary = sentimentManager.generateStatistics(analyses);
      tweetsWithSentiment = processSentimentAnalysis(
        tweetsWithSentiment,
        analyses,
      );
    }

    // Persist (best-effort, no failure propagation)
    if (tweetsWithSentiment.length > 0) {
      try {
        await tweetDatabaseService.saveTweetsBulk(
          tweetsWithSentiment,
          params.campaignId,
        );
      } catch (dbErr) {
        logger.warn("Database save issue", { error: dbErr });
      }
    }

    const execTime = Date.now() - start;
    res.json({
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
    });
  } catch (err) {
    handleScrapingError(res, err, `${context.type} scraping`);
  } finally {
    const ip = (req.ip || req.socket.remoteAddress || "unknown").toString();
    inFlightByIp.delete(ip);
  }
}
// (Removed duplicated second implementation block below to avoid redeclarations)
