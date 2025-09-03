import { Request, Response } from "express";
import { toStringArray } from "../../../lib/utils";
import {
  getScraperService,
  handleScrapingError,
  handleScrapingRequest,
  tweetDatabaseService,
  twitterAuth,
  type ScrapingContext,
  type ScrapingRequestOptions,
} from "./helpers";

// ==================== Constants & Configuration ====================
const SCRAPING_CONFIGS = {
  hashtag: {
    context: { type: "hashtag" as const, exampleValue: "JustDoIt" },
    options: { languageFilter: true },
    stripPrefix: "#",
    errorField: "hashtag or hashtags",
    examples: {
      hashtag: "JustDoIt",
      hashtags: ["JustDoIt", "Marketing", "#Nike"],
    },
  },
  user: {
    context: { type: "user" as const, exampleValue: "nike" },
    options: { maxTweets: 500, defaultTweets: 30 },
    stripPrefix: "@",
    errorField: "username or usernames",
    examples: {
      username: "nike",
      usernames: ["nike", "adidas", "@puma"],
    },
  },
  search: {
    context: { type: "search" as const, exampleValue: "nike shoes" },
    options: { languageFilter: true },
    stripPrefix: "",
    errorField: "query or queries",
    examples: {
      query: "nike shoes",
      queries: ["nike shoes", "adidas sneakers"],
    },
  },
} as const;

const TWEET_CONTENT_MAX_LENGTH = 100;
const DEFAULT_TWEET_LIMIT = 10;

// ==================== Types & Interfaces ====================
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

type ScrapingType = keyof typeof SCRAPING_CONFIGS;

// ==================== Utility Functions ====================
const truncateContent = (content: string): string =>
  content.length > TWEET_CONTENT_MAX_LENGTH
    ? `${content.substring(0, TWEET_CONTENT_MAX_LENGTH)}...`
    : content;

const formatIdentifier = (identifier: string, prefix: string): string =>
  prefix ? `${prefix}${identifier}` : identifier;

const createValidationError = (
  errorField: string,
  examples: Record<string, unknown>,
) => ({
  success: false,
  error: `${errorField} parameter is required`,
  example: examples,
});

// ==================== Core Batch Processing Logic ====================
async function processSingleIdentifier(
  req: Request,
  res: Response,
  identifier: string,
  context: Omit<ScrapingContext, "identifier">,
  options: ScrapingRequestOptions,
): Promise<BatchScrapingResult> {
  try {
    const result = await handleScrapingRequest(
      req,
      res,
      { ...context, identifier },
      options,
      true, // Return result instead of sending response
    );

    if (result?.success) {
      return {
        identifier: formatIdentifier(
          identifier,
          SCRAPING_CONFIGS[context.type as ScrapingType].stripPrefix,
        ),
        tweetCount: result.data.tweets.length,
        totalFound: result.data.totalFound,
        sentiment_summary: result.data.sentiment_summary,
      };
    }

    return {
      identifier: formatIdentifier(
        identifier,
        SCRAPING_CONFIGS[context.type as ScrapingType].stripPrefix,
      ),
      tweetCount: 0,
      error: "Request failed",
    };
  } catch (err) {
    return {
      identifier: formatIdentifier(
        identifier,
        SCRAPING_CONFIGS[context.type as ScrapingType].stripPrefix,
      ),
      tweetCount: 0,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

async function processBatchScraping(
  req: Request,
  res: Response,
  identifiers: string[],
  scrapingType: ScrapingType,
): Promise<BatchResponse> {
  const config = SCRAPING_CONFIGS[scrapingType];
  const results: BatchScrapingResult[] = [];
  let totalTweets = 0;

  // Process identifiers concurrently with controlled concurrency
  const processingPromises = identifiers.map((identifier) =>
    processSingleIdentifier(
      req,
      res,
      identifier,
      config.context,
      config.options,
    ),
  );

  const resolvedResults = await Promise.allSettled(processingPromises);

  for (const result of resolvedResults) {
    if (result.status === "fulfilled") {
      results.push(result.value);
      totalTweets += result.value.tweetCount;
    } else {
      results.push({
        identifier: "unknown",
        tweetCount: 0,
        error:
          result.reason instanceof Error
            ? result.reason.message
            : "Processing failed",
      });
    }
  }

  const formattedIdentifiers = identifiers.map((id) =>
    formatIdentifier(id, config.stripPrefix),
  );

  return {
    success: true,
    data: {
      identifiers: formattedIdentifiers,
      items: results,
      totalTweets,
      campaignId: req.body.campaignId ?? "",
    },
    message: `Scraped ${totalTweets} tweets from ${identifiers.length} ${scrapingType}${identifiers.length > 1 ? "s" : ""}`,
  };
}

// ==================== Generic Scraping Handler ====================
async function handleGenericScraping(
  req: Request,
  res: Response,
  scrapingType: ScrapingType,
  identifierKeys: string[],
): Promise<void> {
  const config = SCRAPING_CONFIGS[scrapingType];

  // Extract identifiers from multiple possible parameter names
  const identifiers =
    identifierKeys
      .map((key) =>
        toStringArray(req.body[key], {
          stripPrefix: config.stripPrefix || undefined,
        }),
      )
      .find((arr) => arr.length > 0) || [];

  if (identifiers.length === 0) {
    res
      .status(400)
      .json(createValidationError(config.errorField, config.examples));
    return;
  }

  // Single identifier - use existing optimized flow
  if (identifiers.length === 1) {
    await handleScrapingRequest(
      req,
      res,
      { ...config.context, identifier: identifiers[0] },
      config.options,
    );
    return;
  }

  // Multiple identifiers - use batch processing
  const response = await processBatchScraping(
    req,
    res,
    identifiers,
    scrapingType,
  );
  res.json(response);
}

// ==================== Exported Handler Functions ====================
export const scrapeHashtag = async (
  req: Request,
  res: Response,
): Promise<void> => {
  await handleGenericScraping(req, res, "hashtag", ["hashtags", "hashtag"]);
};

export const scrapeUser = async (
  req: Request,
  res: Response,
): Promise<void> => {
  await handleGenericScraping(req, res, "user", ["usernames", "username"]);
};

export const scrapeSearch = async (
  req: Request,
  res: Response,
): Promise<void> => {
  await handleGenericScraping(req, res, "search", ["queries", "query"]);
};

// ==================== Status & Management Handlers ====================
export async function getScrapingStatus(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const scraper = await getScraperService();
    const rateLimitStatus = scraper.getRateLimitStatus();
    const authStatusDetail = scraper.getAuthenticationStatus();

    const statusResponse = {
      success: true,
      data: {
        service_status: "operational" as const,
        authentication: {
          status: authStatusDetail.isAuthenticated
            ? ("authenticated" as const)
            : ("failed" as const),
          last_check: authStatusDetail.lastCheck,
          consecutive_failures: authStatusDetail.consecutiveFailures,
        },
        rate_limit: {
          remaining: rateLimitStatus.remaining,
          reset_time: rateLimitStatus.resetTime,
          request_count: rateLimitStatus.requestCount,
        },
        scraper_info: {
          type: "@the-convocation/twitter-scraper" as const,
          max_tweets_per_request: 1000,
          rate_limit_window: "1 hour" as const,
        },
      },
      message: "Scraping service operational",
    } as const;

    res.json(statusResponse);
  } catch (error) {
    handleScrapingError(res, error, "status check");
  }
}

export async function forceReauth(req: Request, res: Response): Promise<void> {
  try {
    await twitterAuth.forceReauth();
    const status = twitterAuth.getStatus();

    const reauthResponse = {
      success: status.ready,
      message: status.ready
        ? "Re-authentication successful"
        : "Re-authentication failed",
      error: status.error,
      timestamp: new Date().toISOString(),
    } as const;

    res.json(reauthResponse);
  } catch (error) {
    handleScrapingError(res, error, "re-authentication");
  }
}

export async function listTweets(req: Request, res: Response): Promise<void> {
  try {
    const { campaignId, limit = DEFAULT_TWEET_LIMIT } = req.query;
    const parsedLimit = Math.max(
      1,
      Math.min(1000, parseInt(limit as string, 10) || DEFAULT_TWEET_LIMIT),
    );

    let tweets: BasicTweet[];

    if (campaignId && typeof campaignId === "string") {
      tweets = await tweetDatabaseService.getTweetsByCampaign(
        campaignId,
        parsedLimit,
      );
    } else {
      tweets = await tweetDatabaseService.getTweetsByHashtag("", parsedLimit);
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
        campaignId: campaignId || "all",
        tweets: transformedTweets,
      },
      message: `Found ${tweets.length} tweets in database`,
    } as const;

    res.json(listResponse);
  } catch (error) {
    handleScrapingError(res, error, "database tweets list");
  }
}
