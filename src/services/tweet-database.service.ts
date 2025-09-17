/**
 * Tweet Database Service - OPTIMIZED & CONSOLIDATED
 * Service for saving and managing tweets in the database
 * Integrated with MongoTweetRepository functionality
 */

import { logger } from "../lib/observability/logger";
import { ITweetDocument, TweetModel } from "../models/Tweet.model";
import { MongoTweetRepository } from "../repositories/mongo-tweet.repository";
import { Tweet } from "../types/twitter";
import { processTweetContent } from "../utils/text-cleaner";

// ==================== Constants & Configuration ====================
const BATCH_SIZE = 100; // Increased from 50 for better throughput
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1000;

// ==================== Types & Interfaces ====================
export interface SaveTweetResult {
  readonly success: boolean;
  readonly tweetId?: string;
  readonly isNew?: boolean;
  readonly message?: string;
  readonly error?: string;
}

export interface BulkSaveResult {
  success: boolean;
  totalProcessed: number;
  saved: number;
  updated: number;
  duplicates: number;
  errors: number;
  savedTweetIds: string[];
  errorMessages: string[];
}

export interface StorageStats {
  totalTweets: number;
  tweetsToday: number;
  uniqueAuthors: number;
  averageSentiment: number;
}

// ==================== Utility Functions ====================
const normalizeHashtag = (tag: string): string =>
  tag.replace("#", "").toLowerCase().trim();

const normalizeMention = (mention: string): string =>
  mention.replace("@", "").toLowerCase().trim();

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const createTweetMetrics = (metrics: Tweet["metrics"]) => ({
  likes: Math.max(0, metrics.likes || 0),
  retweets: Math.max(0, metrics.retweets || 0),
  replies: Math.max(0, metrics.replies || 0),
  quotes: Math.max(0, metrics.quotes || 0),
  views: Math.max(0, metrics.views || 0),
  engagement: Math.max(0, metrics.engagement || 0),
});

// ==================== Error Handling ====================
class DatabaseError extends Error {
  public readonly operation: string;
  public readonly cause?: Error;

  constructor(message: string, operation: string, cause?: Error) {
    super(message);
    this.name = "DatabaseError";
    this.operation = operation;
    this.cause = cause;
  }
}

// ==================== Main Service Class ====================
export class TweetDatabaseService {
  private readonly repository: MongoTweetRepository;

  constructor() {
    this.repository = new MongoTweetRepository();
  }

  // ==================== Repository Delegation Methods ====================
  async getAnalytics(filters = {}) {
    return this.repository.getAnalytics(filters);
  }

  async getHashtagTrends(hashtag: string, days = 30) {
    if (!hashtag?.trim()) {
      throw new DatabaseError("Hashtag is required", "getHashtagTrends");
    }
    return this.repository.getHashtagTrends(normalizeHashtag(hashtag), days);
  }

  async findByHashtag(hashtag: string, pagination = { page: 1, limit: 100 }) {
    if (!hashtag?.trim()) {
      throw new DatabaseError("Hashtag is required", "findByHashtag");
    }

    const normalizedHashtag = normalizeHashtag(hashtag);
    const safePagination = {
      page: Math.max(1, pagination.page),
      limit: Math.max(1, pagination.limit),
    };

    return this.repository.findByHashtag(normalizedHashtag, safePagination);
  }

  async searchByText(
    searchText: string,
    filters = {},
    pagination = { page: 1, limit: 50 },
  ) {
    if (!searchText?.trim()) {
      throw new DatabaseError("Search text is required", "searchByText");
    }

    const safePagination = {
      page: Math.max(1, pagination.page),
      limit: Math.max(1, pagination.limit),
    };

    return this.repository.searchByText(
      searchText.trim(),
      filters,
      safePagination,
    );
  }

  // ==================== Core Save Operations ====================
  /**
   * Save a single tweet to the database with optimized upsert operation
   */
  async saveTweet(tweet: Tweet, campaignId?: string): Promise<SaveTweetResult> {
    if (!tweet?.tweetId) {
      return {
        success: false,
        error: "Invalid tweet data: tweetId is required",
      };
    }

    try {
      const tweetData = this.mapScrapedTweetToDocument(tweet, campaignId);

      // Use upsert for better performance
      const result = await TweetModel.findOneAndUpdate(
        { tweetId: tweet.tweetId },
        {
          $set: tweetData,
          // scrapedAt is already included in tweetData, no need for $setOnInsert
        },
        {
          upsert: true,
          new: true,
          runValidators: true,
        },
      );

      const isNew = result.isNew === true;

      return {
        success: true,
        tweetId: tweet.tweetId,
        isNew,
        message: isNew
          ? "Tweet saved successfully"
          : "Tweet updated successfully",
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error("Error saving tweet", {
        tweetId: tweet.tweetId,
        error: errorMessage,
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Optimized bulk save with better error handling and performance
   */
  async saveTweetsBulk(
    tweets: Tweet[],
    campaignId?: string,
  ): Promise<BulkSaveResult> {
    const result: BulkSaveResult = {
      success: true,
      totalProcessed: tweets.length,
      saved: 0,
      updated: 0,
      duplicates: 0,
      errors: 0,
      savedTweetIds: [],
      errorMessages: [],
    };

    if (!tweets?.length) {
      return result;
    }

    // Validate and filter invalid tweets
    const validTweets = tweets.filter((tweet) => {
      if (!tweet?.tweetId?.trim()) {
        result.errors++;
        result.errorMessages.push("Tweet missing tweetId");
        return false;
      }
      return true;
    });

    if (validTweets.length === 0) {
      result.success = false;
      result.errorMessages.push("No valid tweets to process");
      return result;
    }

    try {
      // Check for existing tweets in a single query
      const tweetIds = validTweets.map((t) => t.tweetId);
      const existingTweets = await TweetModel.find(
        { tweetId: { $in: tweetIds } },
        { tweetId: 1, _id: 0 },
      ).lean();

      const existingTweetIds = new Set(existingTweets.map((t) => t.tweetId));

      // Separate new and existing tweets
      const newTweets = validTweets.filter(
        (t) => !existingTweetIds.has(t.tweetId),
      );
      const tweetsToUpdate = validTweets.filter((t) =>
        existingTweetIds.has(t.tweetId),
      );

      result.duplicates = existingTweetIds.size;

      // Process new tweets in optimized batches
      if (newTweets.length > 0) {
        await this.processBatchInserts(newTweets, campaignId, result);
      }

      // Process updates efficiently
      if (tweetsToUpdate.length > 0) {
        await this.processBatchUpdates(tweetsToUpdate, campaignId, result);
      }

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown bulk operation error";
      logger.error("Bulk save operation failed", {
        error: errorMessage,
        tweetCount: tweets.length,
      });

      result.success = false;
      result.errorMessages.push(`Bulk operation error: ${errorMessage}`);
      return result;
    }
  }

  // ==================== Private Helper Methods ====================
  private async processBatchInserts(
    tweets: Tweet[],
    campaignId: string | undefined,
    result: BulkSaveResult,
  ): Promise<void> {
    for (let i = 0; i < tweets.length; i += BATCH_SIZE) {
      const batch = tweets.slice(i, i + BATCH_SIZE);
      let retryCount = 0;

      while (retryCount < MAX_RETRY_ATTEMPTS) {
        try {
          const tweetDocuments = batch.map((tweet) =>
            this.mapScrapedTweetToDocument(tweet, campaignId),
          );

          const insertedTweets = await TweetModel.insertMany(tweetDocuments, {
            ordered: false,
            rawResult: false,
          });

          result.saved += insertedTweets.length;
          result.savedTweetIds = [
            ...result.savedTweetIds,
            ...insertedTweets.map((t) => t.tweetId),
          ];
          break;
        } catch (insertError: any) {
          retryCount++;

          // Handle partial success in bulk operations
          if (insertError.insertedDocs?.length > 0) {
            const successful = insertError.insertedDocs.length;
            result.saved += successful;
            result.savedTweetIds = [
              ...result.savedTweetIds,
              ...insertError.insertedDocs.map((t: any) => t.tweetId),
            ];
          }

          const failed = batch.length - (insertError.insertedDocs?.length || 0);
          result.errors += failed;

          if (retryCount >= MAX_RETRY_ATTEMPTS) {
            result.errorMessages.push(
              `Batch ${i}-${i + batch.length} failed after ${MAX_RETRY_ATTEMPTS} attempts: ${insertError.message}`,
            );
            break;
          }

          // Exponential backoff
          await sleep(RETRY_DELAY_MS * Math.pow(2, retryCount - 1));
        }
      }
    }
  }

  private async processBatchUpdates(
    tweets: Tweet[],
    campaignId: string | undefined,
    result: BulkSaveResult,
  ): Promise<void> {
    const bulkOps = tweets.map((tweet) => ({
      updateOne: {
        filter: { tweetId: tweet.tweetId },
        update: {
          $set: this.createUpdateDocument(tweet, campaignId),
        },
      },
    }));

    try {
      const bulkResult = await TweetModel.bulkWrite(bulkOps, {
        ordered: false,
      });
      result.updated += bulkResult.modifiedCount;
    } catch (bulkError: any) {
      logger.error("Bulk update failed", { error: bulkError.message });
      result.errors += tweets.length;
      result.errorMessages.push(`Bulk update error: ${bulkError.message}`);
    }
  }

  private createUpdateDocument(
    tweet: Tweet,
    campaignId?: string,
  ): Partial<ITweetDocument> {
    const updateDoc: Partial<ITweetDocument> = {
      metrics: createTweetMetrics(tweet.metrics),
    };

    // Update author metrics if available - use proper nested update
    if (
      tweet.author?.followersCount !== undefined ||
      tweet.author?.followingCount !== undefined
    ) {
      updateDoc.author = {
        ...updateDoc.author,
        followersCount: tweet.author.followersCount || 0,
        followingCount: tweet.author.followingCount || 0,
      } as ITweetDocument["author"];
    }

    // Update sentiment if provided
    if (tweet.sentiment) {
      updateDoc.sentiment = {
        score: tweet.sentiment.score,
        magnitude: tweet.sentiment.magnitude,
        label: tweet.sentiment.label,
        confidence: tweet.sentiment.confidence,
        emotions: tweet.sentiment.emotions,
        keywords: tweet.sentiment.keywords || [],
        analyzedAt: new Date(),
        processingTime: tweet.sentiment.processingTime,
      };
    }

    // Update campaignId if provided
    if (campaignId) {
      updateDoc.campaignId = campaignId;
    }

    return updateDoc;
  }

  /**
   * Optimized mapping with better validation and error handling
   */
  private mapScrapedTweetToDocument(
    tweet: Tweet,
    campaignId?: string,
  ): Partial<ITweetDocument> {
    const now = new Date();

    // Clean and process the tweet content before saving
    const processedContent = processTweetContent(tweet.content || "");

    return {
      tweetId: tweet.tweetId,
      content: processedContent,
      author: {
        id: tweet.author?.id || "",
        username: tweet.author?.username || "",
        displayName: tweet.author?.displayName || "",
        avatar: tweet.author?.avatar || "",
        verified: Boolean(tweet.author?.verified),
        followersCount: Math.max(0, tweet.author?.followersCount || 0),
        followingCount: Math.max(0, tweet.author?.followingCount || 0),
        tweetsCount: Math.max(0, tweet.author?.tweetsCount || 0),
        location: tweet.author?.location || "",
        bio: tweet.author?.bio || "",
        website: tweet.author?.website || "",
        joinedDate: tweet.author?.joinedDate || now,
        influenceScore: Math.max(0, tweet.author?.influenceScore || 0),
        engagementRate: Math.max(0, tweet.author?.engagementRate || 0),
      },
      metrics: createTweetMetrics(tweet.metrics),
      sentiment: tweet.sentiment
        ? {
            score: tweet.sentiment.score,
            magnitude: tweet.sentiment.magnitude,
            label: tweet.sentiment.label,
            confidence: tweet.sentiment.confidence,
            emotions: tweet.sentiment.emotions,
            keywords: tweet.sentiment.keywords || [],
            analyzedAt: now,
            processingTime: tweet.sentiment.processingTime,
          }
        : undefined,
      hashtags: (tweet.hashtags || []).map(normalizeHashtag).filter(Boolean),
      mentions: (tweet.mentions || []).map(normalizeMention).filter(Boolean),
      urls: tweet.urls || [],
      mediaUrls: tweet.mediaUrls || [],
      campaignId,
      isRetweet: Boolean(tweet.isRetweet),
      isReply: Boolean(tweet.isReply),
      isQuote: Boolean(tweet.isQuote),
      language: (tweet.language && tweet.language !== "unknown") ? tweet.language : "en",
      scrapedAt: now,
      tweetCreatedAt: new Date(tweet.createdAt || now),
    };
  }

  // ==================== Query Methods ====================
  /**
   * Get tweets by campaign with better error handling
   */
  async getTweetsByCampaign(
    campaignId: string,
    limit = 100,
  ): Promise<ITweetDocument[]> {
    if (!campaignId?.trim()) {
      throw new DatabaseError("Campaign ID is required", "getTweetsByCampaign");
    }

    const safeLimit = Math.max(1, limit);

    try {
      return await TweetModel.find({ campaignId: campaignId.trim() })
        .sort({ tweetCreatedAt: -1 })
        .limit(safeLimit)
        .lean();
    } catch (error) {
      logger.error("Error fetching tweets by campaign", { campaignId, error });
      return [];
    }
  }

  /**
   * Get tweets by hashtag with improved normalization
   */
  async getTweetsByHashtag(
    hashtag: string,
    limit = 100,
  ): Promise<ITweetDocument[]> {
    const safeLimit = Math.max(1, limit);

    try {
      const normalizedHashtag = hashtag ? normalizeHashtag(hashtag) : "";
      const query = normalizedHashtag ? { hashtags: normalizedHashtag } : {};

      return await TweetModel.find(query)
        .sort({ tweetCreatedAt: -1 })
        .limit(safeLimit)
        .lean();
    } catch (error) {
      logger.error("Error fetching tweets by hashtag", { hashtag, error });
      return [];
    }
  }

  /**
   * Optimized storage stats with better aggregation
   */
  async getStorageStats(): Promise<StorageStats> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [statsResult] = await TweetModel.aggregate([
        {
          $facet: {
            totalCount: [{ $count: "total" }],
            todayCount: [
              { $match: { scrapedAt: { $gte: today } } },
              { $count: "today" },
            ],
            uniqueAuthors: [
              { $group: { _id: "$author.username" } },
              { $count: "unique" },
            ],
            avgSentiment: [
              { $match: { "sentiment.score": { $exists: true, $ne: null } } },
              { $group: { _id: null, avg: { $avg: "$sentiment.score" } } },
            ],
          },
        },
      ]);

      return {
        totalTweets: statsResult.totalCount[0]?.total || 0,
        tweetsToday: statsResult.todayCount[0]?.today || 0,
        uniqueAuthors: statsResult.uniqueAuthors[0]?.unique || 0,
        averageSentiment: statsResult.avgSentiment[0]?.avg || 0,
      };
    } catch (error) {
      logger.error("Error getting storage stats", { error });
      return {
        totalTweets: 0,
        tweetsToday: 0,
        uniqueAuthors: 0,
        averageSentiment: 0,
      };
    }
  }
}
