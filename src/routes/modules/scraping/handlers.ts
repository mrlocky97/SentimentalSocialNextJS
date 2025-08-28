import { Request, Response } from "express";
import { toStringArray } from "../../../lib/utils";
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
  // Accept either hashtag or hashtags parameter
  const identifiers = toStringArray(req.body.hashtags || req.body.hashtag, { stripPrefix: "#" });

  if (identifiers.length === 0) {
    return res.status(400).json({
      success: false,
      error: "hashtag or hashtags parameter is required",
      example: { 
        hashtag: "JustDoIt",
        // Or alternatively:
        hashtags: ["JustDoIt", "Marketing", "#Nike"] 
      }
    });
  }

  // For backward compatibility, if there's only one hashtag, use the existing flow
  if (identifiers.length === 1) {
    return await handleScrapingRequest(
      req,
      res,
      { type: "hashtag", identifier: identifiers[0], exampleValue: "JustDoIt" },
      { languageFilter: true },
    );
  }

  // Process multiple hashtags in series
  const results = [];
  let totalTweets = 0;
  
  for (const identifier of identifiers) {
    try {
      const result = await handleScrapingRequest(
        req,
        res,
        { type: "hashtag", identifier, exampleValue: "JustDoIt" },
        { languageFilter: true },
        true // Return result instead of sending response
      );
      
      if (result && result.success) {
        results.push({
          hashtag: `#${identifier}`,
          tweetCount: result.data.tweets.length,
          totalFound: result.data.totalFound,
          sentiment_summary: result.data.sentiment_summary,
        });
        totalTweets += result.data.tweets.length;
      }
    } catch (err) {
      // Continue with other hashtags even if one fails
      results.push({
        hashtag: `#${identifier}`,
        error: err instanceof Error ? err.message : "Unknown error",
        tweetCount: 0
      });
    }
  }

  res.json({
    success: true,
    data: {
      hashtags: identifiers.map(h => `#${h}`),
      items: results,
      totalTweets,
      campaignId: req.body.campaignId ?? "",
    },
    message: `Scraped ${totalTweets} tweets from ${identifiers.length} hashtags`
  });
}

export async function scrapeUser(req: Request, res: Response) {
  // Accept either username or usernames parameter
  const identifiers = toStringArray(req.body.usernames || req.body.username, { stripPrefix: "@" });

  if (identifiers.length === 0) {
    return res.status(400).json({
      success: false,
      error: "username or usernames parameter is required",
      example: { 
        username: "nike",
        // Or alternatively:
        usernames: ["nike", "adidas", "@puma"] 
      }
    });
  }

  // For backward compatibility, if there's only one username, use the existing flow
  if (identifiers.length === 1) {
    return await handleScrapingRequest(
      req,
      res,
      { type: "user", identifier: identifiers[0], exampleValue: "nike" },
      { maxTweets: 500, defaultTweets: 30 },
    );
  }

  // Process multiple usernames in series
  const results = [];
  let totalTweets = 0;
  
  for (const identifier of identifiers) {
    try {
      const result = await handleScrapingRequest(
        req,
        res,
        { type: "user", identifier, exampleValue: "nike" },
        { maxTweets: 500, defaultTweets: 30 },
        true // Return result instead of sending response
      );
      
      if (result && result.success) {
        results.push({
          username: `@${identifier}`,
          tweetCount: result.data.tweets.length,
          totalFound: result.data.totalFound,
          sentiment_summary: result.data.sentiment_summary,
        });
        totalTweets += result.data.tweets.length;
      }
    } catch (err) {
      // Continue with other usernames even if one fails
      results.push({
        username: `@${identifier}`,
        error: err instanceof Error ? err.message : "Unknown error",
        tweetCount: 0
      });
    }
  }

  res.json({
    success: true,
    data: {
      usernames: identifiers.map(u => `@${u}`),
      items: results,
      totalTweets,
      campaignId: req.body.campaignId ?? "",
    },
    message: `Scraped ${totalTweets} tweets from ${identifiers.length} users`
  });
}

export async function scrapeSearch(req: Request, res: Response) {
  // Accept either query or queries parameter
  const identifiers = toStringArray(req.body.queries || req.body.query);

  if (identifiers.length === 0) {
    return res.status(400).json({
      success: false,
      error: "query or queries parameter is required",
      example: { 
        query: "nike shoes",
        // Or alternatively:
        queries: ["nike shoes", "adidas sneakers"] 
      }
    });
  }

  // For backward compatibility, if there's only one query, use the existing flow
  if (identifiers.length === 1) {
    return await handleScrapingRequest(
      req,
      res,
      { type: "search", identifier: identifiers[0], exampleValue: "nike shoes" },
      { languageFilter: true },
    );
  }

  // Process multiple queries in series
  const results = [];
  let totalTweets = 0;
  
  for (const identifier of identifiers) {
    try {
      const result = await handleScrapingRequest(
        req,
        res,
        { type: "search", identifier, exampleValue: "nike shoes" },
        { languageFilter: true },
        true // Return result instead of sending response
      );
      
      if (result && result.success) {
        results.push({
          query: identifier,
          tweetCount: result.data.tweets.length,
          totalFound: result.data.totalFound,
          sentiment_summary: result.data.sentiment_summary,
        });
        totalTweets += result.data.tweets.length;
      }
    } catch (err) {
      // Continue with other queries even if one fails
      results.push({
        query: identifier,
        error: err instanceof Error ? err.message : "Unknown error",
        tweetCount: 0
      });
    }
  }

  res.json({
    success: true,
    data: {
      queries: identifiers,
      items: results,
      totalTweets,
      campaignId: req.body.campaignId ?? "",
    },
    message: `Scraped ${totalTweets} tweets from ${identifiers.length} search queries`
  });
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
