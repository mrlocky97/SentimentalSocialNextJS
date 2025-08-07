/**
 * Tweet Database Service - CONSOLIDATED
 * Service for saving and managing tweets in the database
 * Integrated with MongoTweetRepository functionality
 */

import { TweetModel, ITweetDocument } from '../models/Tweet.model';
import { Tweet } from '../types/twitter';
import { MongoTweetRepository } from '../repositories/mongo-tweet.repository';

export interface SaveTweetResult {
  success: boolean;
  tweetId?: string;
  isNew?: boolean;
  message?: string;
  error?: string;
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

export class TweetDatabaseService {
  private repository: MongoTweetRepository;

  constructor() {
    this.repository = new MongoTweetRepository();
  }

  // Repository delegation methods
  async getAnalytics(filters = {}) {
    return this.repository.getAnalytics(filters);
  }

  async getHashtagTrends(hashtag: string, days = 30) {
    return this.repository.getHashtagTrends(hashtag, days);
  }

  async findByHashtag(hashtag: string, pagination = { page: 1, limit: 100 }) {
    return this.repository.findByHashtag(hashtag, pagination);
  }

  async searchByText(searchText: string, filters = {}, pagination = { page: 1, limit: 50 }) {
    return this.repository.searchByText(searchText, filters, pagination);
  }
  /**
   * Save a single tweet to the database
   */
  async saveTweet(tweet: Tweet, campaignId?: string): Promise<SaveTweetResult> {
    try {
      // Check if tweet already exists
      const existingTweet = await TweetModel.findOne({ tweetId: tweet.tweetId });

      if (existingTweet) {
        // Update existing tweet with latest data
        const updated = await this.updateTweet(existingTweet, tweet);
        return {
          success: true,
          tweetId: tweet.tweetId,
          isNew: false,
          message: 'Tweet updated successfully'
        };
      }

      // Create new tweet document
      const tweetData = this.mapScrapedTweetToDocument(tweet, campaignId);
      const newTweet = new TweetModel(tweetData);

      await newTweet.save();

      return {
        success: true,
        tweetId: tweet.tweetId,
        isNew: true,
        message: 'Tweet saved successfully'
      };

    } catch (error: any) {
      console.error('Error saving tweet:', error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred while saving tweet'
      };
    }
  }

  /**
   * Save multiple tweets to the database efficiently
   */
  async saveTweetsBulk(tweets: Tweet[], campaignId?: string): Promise<BulkSaveResult> {
    const result: BulkSaveResult = {
      success: true,
      totalProcessed: tweets.length,
      saved: 0,
      updated: 0,
      duplicates: 0,
      errors: 0,
      savedTweetIds: [],
      errorMessages: []
    };

    if (tweets.length === 0) {
      return result;
    }

    try {

      // Get existing tweet IDs to check for duplicates
      const tweetIds = tweets.map(t => t.tweetId);

      const existingTweets = await TweetModel.find({
        tweetId: { $in: tweetIds }
      }).select('tweetId');


      const existingTweetIds = new Set(existingTweets.map(t => t.tweetId));

      // Separate new tweets from existing ones
      const newTweets = tweets.filter(t => !existingTweetIds.has(t.tweetId));
      const tweetsToUpdate = tweets.filter(t => existingTweetIds.has(t.tweetId));


      // Process new tweets in batches
      if (newTweets.length > 0) {
        const batchSize = 50; // Process in smaller batches to avoid memory issues

        for (let i = 0; i < newTweets.length; i += batchSize) {
          const batch = newTweets.slice(i, i + batchSize);

          try {
            const tweetDocuments = batch.map(tweet =>
              this.mapScrapedTweetToDocument(tweet, campaignId)
            );


            try {
              const insertedTweets = await TweetModel.insertMany(tweetDocuments, {
                ordered: false // Continue inserting even if some fail
              });


              result.saved += insertedTweets.length;
              result.savedTweetIds.push(...insertedTweets.map(t => t.tweetId));

            } catch (insertError: any) {
              console.error(`❌ Insert error details:`, {
                name: insertError.name,
                message: insertError.message,
                code: insertError.code,
                writeErrors: insertError.writeErrors,
                result: insertError.result
              });

              // Check if it's a bulk write error with some successes
              if (insertError.insertedDocs && insertError.insertedDocs.length > 0) {
                result.saved += insertError.insertedDocs.length;
                result.savedTweetIds.push(...insertError.insertedDocs.map((t: any) => t.tweetId));
              }

              result.errors += batch.length - (insertError.insertedDocs?.length || 0);
              result.errorMessages.push(`Insert error: ${insertError.message}`);
            }

          } catch (batchError: any) {
            console.error(`❌ Error in batch ${i}-${i + batchSize}:`, batchError);
            result.errors += batch.length;
            result.errorMessages.push(`Batch error: ${batchError.message}`);
          }
        }
      }

      // Update existing tweets
      if (tweetsToUpdate.length > 0) {
        for (const tweet of tweetsToUpdate) {
          try {
            const existingTweet = await TweetModel.findOne({ tweetId: tweet.tweetId });
            if (existingTweet) {
              await this.updateTweet(existingTweet, tweet);
              result.updated++;
            }
          } catch (updateError: any) {
            console.error(`Error updating tweet ${tweet.tweetId}:`, updateError);
            result.errors++;
            result.errorMessages.push(`Update error for ${tweet.tweetId}: ${updateError.message}`);
          }
        }
      }

      result.duplicates = existingTweetIds.size;


      return result;

    } catch (error: any) {
      console.error('Bulk save error:', error);
      result.success = false;
      result.errorMessages.push(`Bulk operation error: ${error.message}`);
      return result;
    }
  }

  /**
   * Update an existing tweet with new data
   */
  private async updateTweet(existingTweet: ITweetDocument, newTweetData: Tweet): Promise<void> {
    // Update metrics (they may have changed)
    existingTweet.metrics = {
      likes: newTweetData.metrics.likes,
      retweets: newTweetData.metrics.retweets,
      replies: newTweetData.metrics.replies,
      quotes: newTweetData.metrics.quotes,
      views: newTweetData.metrics.views || 0,
      engagement: newTweetData.metrics.engagement
    };

    // Update author metrics (follower count may have changed)
    if (newTweetData.author.followersCount) {
      existingTweet.author.followersCount = newTweetData.author.followersCount;
    }
    if (newTweetData.author.followingCount) {
      existingTweet.author.followingCount = newTweetData.author.followingCount;
    }

    // Update sentiment if provided
    if (newTweetData.sentiment) {
      existingTweet.sentiment = {
        score: newTweetData.sentiment.score,
        magnitude: newTweetData.sentiment.magnitude,
        label: newTweetData.sentiment.label,
        confidence: newTweetData.sentiment.confidence,
        emotions: newTweetData.sentiment.emotions,
        keywords: newTweetData.sentiment.keywords || [],
        analyzedAt: new Date(),
        processingTime: newTweetData.sentiment.processingTime
      };
    }

    await existingTweet.save();
  }

  /**
   * Map scraped tweet data to database document structure
   */
  private mapScrapedTweetToDocument(tweet: Tweet, campaignId?: string): Partial<ITweetDocument> {
    return {
      tweetId: tweet.tweetId,
      content: tweet.content,
      author: {
        id: tweet.author.id,
        username: tweet.author.username,
        displayName: tweet.author.displayName,
        avatar: tweet.author.avatar,
        verified: tweet.author.verified,
        followersCount: tweet.author.followersCount,
        followingCount: tweet.author.followingCount,
        tweetsCount: tweet.author.tweetsCount,
        location: tweet.author.location,
        bio: tweet.author.bio,
        website: tweet.author.website,
        joinedDate: tweet.author.joinedDate,
        influenceScore: tweet.author.influenceScore,
        engagementRate: tweet.author.engagementRate
      },
      metrics: {
        likes: tweet.metrics.likes,
        retweets: tweet.metrics.retweets,
        replies: tweet.metrics.replies,
        quotes: tweet.metrics.quotes,
        views: tweet.metrics.views || 0,
        engagement: tweet.metrics.engagement
      },
      sentiment: tweet.sentiment ? {
        score: tweet.sentiment.score,
        magnitude: tweet.sentiment.magnitude,
        label: tweet.sentiment.label,
        confidence: tweet.sentiment.confidence,
        emotions: tweet.sentiment.emotions,
        keywords: tweet.sentiment.keywords || [],
        analyzedAt: new Date(),
        processingTime: tweet.sentiment.processingTime
      } : undefined,
      hashtags: tweet.hashtags.map((tag: string) => tag.replace('#', '').toLowerCase()),
      mentions: tweet.mentions.map((mention: string) => mention.replace('@', '').toLowerCase()),
      urls: tweet.urls,
      mediaUrls: tweet.mediaUrls,
      campaignId: campaignId,
      isRetweet: tweet.isRetweet,
      isReply: tweet.isReply,
      isQuote: tweet.isQuote,
      language: tweet.language || 'en',
      scrapedAt: new Date(),
      tweetCreatedAt: new Date(tweet.createdAt)
    };
  }

  /**
   * Get tweets by campaign ID
   */
  async getTweetsByCampaign(campaignId: string, limit: number = 100): Promise<ITweetDocument[]> {
    try {
      return await TweetModel.find({ campaignId })
        .sort({ tweetCreatedAt: -1 })
        .limit(limit);
    } catch (error) {
      console.error('Error fetching tweets by campaign:', error);
      return [];
    }
  }

  /**
   * Get tweets by hashtag
   */
  async getTweetsByHashtag(hashtag: string, limit: number = 100): Promise<ITweetDocument[]> {
    try {
      return await TweetModel.find({ hashtags: hashtag.toLowerCase().replace('#', '') })
        .sort({ tweetCreatedAt: -1 })
        .limit(limit);
    } catch (error) {
      console.error('Error fetching tweets by hashtag:', error);
      return [];
    }
  }

  /**
   * Get basic statistics about stored tweets
   */
  async getStorageStats(): Promise<{
    totalTweets: number;
    tweetsToday: number;
    uniqueAuthors: number;
    averageSentiment: number;
  }> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [
        totalTweets,
        tweetsToday,
        uniqueAuthors,
        sentimentStats
      ] = await Promise.all([
        TweetModel.countDocuments(),
        TweetModel.countDocuments({ scrapedAt: { $gte: today } }),
        TweetModel.distinct('author.username'),
        TweetModel.aggregate([
          { $match: { 'sentiment.score': { $exists: true } } },
          { $group: { _id: null, avgSentiment: { $avg: '$sentiment.score' } } }
        ])
      ]);

      return {
        totalTweets,
        tweetsToday,
        uniqueAuthors: uniqueAuthors.length,
        averageSentiment: sentimentStats[0]?.avgSentiment || 0
      };
    } catch (error) {
      console.error('Error getting storage stats:', error);
      return {
        totalTweets: 0,
        tweetsToday: 0,
        uniqueAuthors: 0,
        averageSentiment: 0
      };
    }
  }
}
