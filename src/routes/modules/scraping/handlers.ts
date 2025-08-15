import { Request, Response } from "express";
import {
  getScraperService,
  handleScrapingError,
  handleScrapingRequest,
  tweetDatabaseService,
  twitterAuth,
} from "./helpers";
// Use a minimal tweet shape compatible with both domain Tweet and persistence document
interface BasicTweet {
  tweetId: string;
  content: string;
  campaignId?: string;
  sentiment?: unknown;
  createdAt?: Date;
  scrapedAt?: Date;
}

// Wrapper handlers mapping to generic handler with context/options
export async function scrapeHashtag(req: Request, res: Response) {
  await handleScrapingRequest(
    req,
    res,
    { type: "hashtag", identifier: req.body.hashtag, exampleValue: "JustDoIt" },
    { languageFilter: true },
  );
}

export async function scrapeUser(req: Request, res: Response) {
  await handleScrapingRequest(
    req,
    res,
    { type: "user", identifier: req.body.username, exampleValue: "nike" },
    { maxTweets: 500, defaultTweets: 30 },
  );
}

export async function scrapeSearch(req: Request, res: Response) {
  await handleScrapingRequest(
    req,
    res,
    { type: "search", identifier: req.body.query, exampleValue: "nike shoes" },
    { languageFilter: true },
  );
}

export async function getScrapingStatus(req: Request, res: Response) {
  try {
    const scraper = await getScraperService();
    const rateLimitStatus = scraper.getRateLimitStatus();
    const authStatusDetail = scraper.getAuthenticationStatus();
    res.json({
      success: true,
      data: {
        service_status: "operational",
        authentication: {
          status: authStatusDetail.isAuthenticated ? "authenticated" : "failed",
          last_check: authStatusDetail.lastCheck,
          consecutive_failures: authStatusDetail.consecutiveFailures,
        },
        rate_limit: {
          remaining: rateLimitStatus.remaining,
          reset_time: rateLimitStatus.resetTime,
          request_count: rateLimitStatus.requestCount,
        },
        scraper_info: {
          type: "@the-convocation/twitter-scraper",
          max_tweets_per_request: 1000,
          rate_limit_window: "1 hour",
        },
      },
      message: "Scraping service operational",
    });
  } catch (error) {
    handleScrapingError(res, error, "status check");
  }
}

export async function forceReauth(req: Request, res: Response) {
  try {
    await twitterAuth.forceReauth();
    const status = twitterAuth.getStatus();
    res.json({
      success: status.ready,
      message: status.ready
        ? "Re-authentication successful"
        : "Re-authentication failed",
      error: status.error,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    handleScrapingError(res, error, "re-authentication");
  }
}

export async function listTweets(req: Request, res: Response) {
  try {
    const { campaignId, limit = 10 } = req.query;
    let tweets: BasicTweet[] = [];
    if (campaignId) {
      tweets = await tweetDatabaseService.getTweetsByCampaign(
        campaignId as string,
        parseInt(limit as string),
      );
    } else {
      tweets = await tweetDatabaseService.getTweetsByHashtag(
        "",
        parseInt(limit as string),
      );
    }
    res.json({
      success: true,
      data: {
        total: tweets.length,
        campaignId: campaignId || "all",
        tweets: tweets.map(
          ({
            tweetId,
            content,
            campaignId: cId,
            sentiment,
            createdAt,
            scrapedAt,
          }) => ({
            tweetId,
            content:
              content.length > 100
                ? content.substring(0, 100) + "..."
                : content,
            campaignId: cId,
            sentiment,
            createdAt,
            scrapedAt,
          }),
        ),
      },
      message: `Found ${tweets.length} tweets in database`,
    });
  } catch (error) {
    handleScrapingError(res, error, "database tweets list");
  }
}
