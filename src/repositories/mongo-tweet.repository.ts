/**
 * Tweet Repository
 * Data access layer for tweet operations and analytics
 */

import { ITweetDocument, TweetModel } from '../models/Tweet.model';
import { TwitterUser, TweetMetrics } from '../types/twitter';

// Define interfaces locally to avoid dependency issues
interface PaginationParams {
  page: number;
  limit: number;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface TweetFilters {
  campaignId?: string;
  hashtags?: string[];
  sentimentLabel?: 'positive' | 'negative' | 'neutral';
  language?: string;
  isRetweet?: boolean;
  isReply?: boolean;
  isQuote?: boolean;
  minLikes?: number;
  minRetweets?: number;
  minEngagement?: number;
  authorUsername?: string;
  dateFrom?: Date;
  dateTo?: Date;
  hasMedia?: boolean;
  hasLocation?: boolean;
  verified?: boolean;
  minFollowers?: number;
  maxFollowers?: number;
}

export interface TweetAnalytics {
  totalTweets: number;
  totalEngagement: number;
  averageEngagement: number;
  sentimentDistribution: {
    positive: number;
    negative: number;
    neutral: number;
  };
  topHashtags: Array<{ hashtag: string; count: number }>;
  topMentions: Array<{ mention: string; count: number }>;
  languageDistribution: Array<{ language: string; count: number }>;
  timeline: Array<{ date: string; count: number; engagement: number }>;
  topInfluencers: Array<{ user: TwitterUser; metrics: TweetMetrics; tweetCount: number }>;
}

export interface HashtagTrends {
  hashtag: string;
  totalTweets: number;
  totalEngagement: number;
  averageEngagement: number;
  sentiment: {
    positive: number;
    negative: number;
    neutral: number;
  };
  growth: {
    last24h: number;
    last7d: number;
    last30d: number;
  };
  topTweets: ITweetDocument[];
}

export class MongoTweetRepository {
  /**
   * Create a new tweet
   */
  async create(tweetData: Partial<ITweetDocument>): Promise<ITweetDocument> {
    try {
      const tweet = new TweetModel(tweetData);
      return await tweet.save();
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        throw new Error('Tweet already exists');
      }
      throw error;
    }
  }

  /**
   * Find tweet by ID
   */
  async findById(id: string): Promise<ITweetDocument | null> {
    return await TweetModel.findById(id);
  }

  /**
   * Find tweet by Twitter ID
   */
  async findByTweetId(tweetId: string): Promise<ITweetDocument | null> {
    return await TweetModel.findOne({ tweetId });
  }

  /**
   * Find multiple tweets with filters and pagination
   */
  async findMany(
    filters: TweetFilters = {},
    pagination: PaginationParams = { page: 1, limit: 50 }
  ): Promise<PaginatedResponse<ITweetDocument>> {
    const query = this.buildQuery(filters);

    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [tweets, total] = await Promise.all([
      TweetModel.find(query)
        .sort({ tweetCreatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      TweetModel.countDocuments(query)
    ]);

    return {
      data: tweets,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Find tweets by campaign ID
   */
  async findByCampaign(
    campaignId: string,
    pagination: PaginationParams = { page: 1, limit: 100 }
  ): Promise<PaginatedResponse<ITweetDocument>> {
    return this.findMany({ campaignId }, pagination);
  }

  /**
   * Find tweets by hashtag
   */
  async findByHashtag(
    hashtag: string,
    pagination: PaginationParams = { page: 1, limit: 100 }
  ): Promise<PaginatedResponse<ITweetDocument>> {
    const cleanHashtag = hashtag.replace('#', '').toLowerCase();
    return this.findMany({ hashtags: [cleanHashtag] }, pagination);
  }

  /**
   * Search tweets by text content
   */
  async searchByText(
    searchText: string,
    filters: TweetFilters = {},
    pagination: PaginationParams = { page: 1, limit: 50 }
  ): Promise<PaginatedResponse<ITweetDocument>> {
    const query = {
      ...this.buildQuery(filters),
      $text: { $search: searchText }
    };

    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [tweets, total] = await Promise.all([
      TweetModel.find(query, { score: { $meta: 'textScore' } })
        .sort({ score: { $meta: 'textScore' }, tweetCreatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      TweetModel.countDocuments(query)
    ]);

    return {
      data: tweets,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Update tweet
   */
  async update(id: string, updates: Partial<ITweetDocument>): Promise<ITweetDocument | null> {
    return await TweetModel.findByIdAndUpdate(
      id,
      { ...updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
  }

  /**
   * Delete tweet
   */
  async delete(id: string): Promise<boolean> {
    const result = await TweetModel.findByIdAndDelete(id);
    return !!result;
  }

  /**
   * Bulk create tweets
   */
  async bulkCreate(tweets: Partial<ITweetDocument>[]): Promise<{
    created: ITweetDocument[];
    duplicates: string[];
    errors: Array<{ data: Partial<ITweetDocument>; error: string }>;
  }> {
    const results = {
      created: [] as ITweetDocument[],
      duplicates: [] as string[],
      errors: [] as Array<{ data: Partial<ITweetDocument>; error: string }>
    };

    for (const tweetData of tweets) {
      try {
        // Check if tweet already exists
        if (tweetData.tweetId) {
          const existing = await this.findByTweetId(tweetData.tweetId);
          if (existing) {
            results.duplicates.push(tweetData.tweetId);
            continue;
          }
        }

        const tweet = await this.create(tweetData);
        results.created.push(tweet);
      } catch (error) {
        results.errors.push({
          data: tweetData,
          error: (error as Error).message
        });
      }
    }

    return results;
  }

  /**
   * Get analytics for a set of tweets
   */
  async getAnalytics(filters: TweetFilters = {}): Promise<TweetAnalytics> {
    const query = this.buildQuery(filters);

    // Basic counts and aggregations
    const [basicStats, sentimentStats, hashtagStats, mentionStats, languageStats, timelineStats] =
      await Promise.all([
        this.getBasicStats(query),
        this.getSentimentStats(query),
        this.getHashtagStats(query),
        this.getMentionStats(query),
        this.getLanguageStats(query),
        this.getTimelineStats(query)
      ]);

    // Get top influencers
    const topInfluencers = await this.getTopInfluencers(query);

    return {
      totalTweets: basicStats.totalTweets,
      totalEngagement: basicStats.totalEngagement,
      averageEngagement: basicStats.averageEngagement,
      sentimentDistribution: sentimentStats,
      topHashtags: hashtagStats,
      topMentions: mentionStats,
      languageDistribution: languageStats,
      timeline: timelineStats,
      topInfluencers
    };
  }

  /**
   * Get hashtag trends
   */
  async getHashtagTrends(
    hashtag: string,
    days: number = 30
  ): Promise<HashtagTrends> {
    const cleanHashtag = hashtag.replace('#', '').toLowerCase();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const query = {
      hashtags: cleanHashtag,
      tweetCreatedAt: { $gte: startDate }
    };

    const [stats, sentiment, growth, topTweets] = await Promise.all([
      this.getBasicStats(query),
      this.getSentimentStats(query),
      this.getHashtagGrowth(cleanHashtag),
      TweetModel.find(query)
        .sort({ 'metrics.engagement': -1 })
        .limit(10)
        .exec()
    ]);

    return {
      hashtag: cleanHashtag,
      totalTweets: stats.totalTweets,
      totalEngagement: stats.totalEngagement,
      averageEngagement: stats.averageEngagement,
      sentiment,
      growth: {
        last24h: growth.last24h || 0,
        last7d: growth.last7d || 0,
        last30d: growth.last30d || 0
      },
      topTweets
    };
  }

  /**
   * Build MongoDB query from filters
   */
  private buildQuery(filters: TweetFilters): Record<string, unknown> {
    const query: Record<string, unknown> = {};

    if (filters.campaignId) {
      query.campaignId = filters.campaignId;
    }

    if (filters.hashtags && filters.hashtags.length > 0) {
      query.hashtags = { $in: filters.hashtags.map(h => h.replace('#', '').toLowerCase()) };
    }

    if (filters.sentimentLabel) {
      query['sentiment.label'] = filters.sentimentLabel;
    }

    if (filters.language) {
      query.language = filters.language;
    }

    if (filters.isRetweet !== undefined) {
      query.isRetweet = filters.isRetweet;
    }

    if (filters.isReply !== undefined) {
      query.isReply = filters.isReply;
    }

    if (filters.isQuote !== undefined) {
      query.isQuote = filters.isQuote;
    }

    if (filters.minLikes) {
      query['metrics.likes'] = { $gte: filters.minLikes };
    }

    if (filters.minRetweets) {
      query['metrics.retweets'] = { $gte: filters.minRetweets };
    }

    if (filters.minEngagement) {
      query['metrics.engagement'] = { $gte: filters.minEngagement };
    }

    if (filters.authorUsername) {
      query['author.username'] = filters.authorUsername.toLowerCase();
    }

    if (filters.dateFrom || filters.dateTo) {
      const dateQuery: Record<string, Date> = {};
      if (filters.dateFrom) {
        dateQuery.$gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        dateQuery.$lte = filters.dateTo;
      }
      query.tweetCreatedAt = dateQuery;
    }

    if (filters.hasMedia !== undefined) {
      if (filters.hasMedia) {
        query.mediaUrls = { $exists: true, $not: { $size: 0 } };
      } else {
        query.$or = [
          { mediaUrls: { $exists: false } },
          { mediaUrls: { $size: 0 } }
        ];
      }
    }

    if (filters.hasLocation !== undefined) {
      if (filters.hasLocation) {
        query.geoLocation = { $exists: true, $ne: null };
      } else {
        query.$or = [
          { geoLocation: { $exists: false } },
          { geoLocation: null }
        ];
      }
    }

    if (filters.verified !== undefined) {
      query['author.verified'] = filters.verified;
    }

    if (filters.minFollowers || filters.maxFollowers) {
      const followersQuery: Record<string, number> = {};
      if (filters.minFollowers) {
        followersQuery.$gte = filters.minFollowers;
      }
      if (filters.maxFollowers) {
        followersQuery.$lte = filters.maxFollowers;
      }
      query['author.followersCount'] = followersQuery;
    }

    return query;
  }

  /**
   * Get basic statistics
   */
  private async getBasicStats(query: Record<string, unknown>) {
    const results = await TweetModel.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalTweets: { $sum: 1 },
          totalEngagement: { $sum: '$metrics.engagement' },
          totalLikes: { $sum: '$metrics.likes' },
          totalRetweets: { $sum: '$metrics.retweets' },
          totalReplies: { $sum: '$metrics.replies' }
        }
      }
    ]);

    const stats = results[0] || { totalTweets: 0, totalEngagement: 0 };

    return {
      totalTweets: stats.totalTweets,
      totalEngagement: stats.totalEngagement,
      averageEngagement: stats.totalTweets > 0 ? stats.totalEngagement / stats.totalTweets : 0
    };
  }

  /**
   * Get sentiment statistics
   */
  private async getSentimentStats(query: Record<string, unknown>) {
    const results = await TweetModel.aggregate([
      { $match: query },
      { $match: { 'sentiment.label': { $exists: true } } },
      {
        $group: {
          _id: '$sentiment.label',
          count: { $sum: 1 }
        }
      }
    ]);

    const stats = { positive: 0, negative: 0, neutral: 0 };
    results.forEach(result => {
      stats[result._id as keyof typeof stats] = result.count;
    });

    return stats;
  }

  /**
   * Get hashtag statistics
   */
  private async getHashtagStats(query: Record<string, unknown>) {
    const results = await TweetModel.aggregate([
      { $match: query },
      { $unwind: '$hashtags' },
      {
        $group: {
          _id: '$hashtags',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]);

    return results.map(result => ({
      hashtag: result._id,
      count: result.count
    }));
  }

  /**
   * Get mention statistics
   */
  private async getMentionStats(query: Record<string, unknown>) {
    const results = await TweetModel.aggregate([
      { $match: query },
      { $unwind: '$mentions' },
      {
        $group: {
          _id: '$mentions',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]);

    return results.map(result => ({
      mention: result._id,
      count: result.count
    }));
  }

  /**
   * Get language statistics
   */
  private async getLanguageStats(query: Record<string, unknown>) {
    const results = await TweetModel.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$language',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    return results.map(result => ({
      language: result._id,
      count: result.count
    }));
  }

  /**
   * Get timeline statistics (daily aggregation)
   */
  private async getTimelineStats(query: Record<string, unknown>) {
    const results = await TweetModel.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$tweetCreatedAt'
            }
          },
          count: { $sum: 1 },
          engagement: { $sum: '$metrics.engagement' }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    return results.map(result => ({
      date: result._id,
      count: result.count,
      engagement: result.engagement
    }));
  }

  /**
   * Get top influencers
   */
  private async getTopInfluencers(query: Record<string, unknown>) {
    const results = await TweetModel.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$author.username',
          user: { $first: '$author' },
          tweetCount: { $sum: 1 },
          totalEngagement: { $sum: '$metrics.engagement' },
          avgMetrics: {
            $avg: {
              likes: '$metrics.likes',
              retweets: '$metrics.retweets',
              replies: '$metrics.replies'
            }
          }
        }
      },
      { $sort: { totalEngagement: -1 } },
      { $limit: 10 }
    ]);

    return results.map(result => ({
      user: result.user,
      metrics: {
        retweets: Math.round(result.avgMetrics.retweets || 0),
        likes: Math.round(result.avgMetrics.likes || 0),
        replies: Math.round(result.avgMetrics.replies || 0),
        quotes: 0,
        engagement: result.totalEngagement / result.tweetCount
      },
      tweetCount: result.tweetCount
    }));
  }

  /**
   * Get hashtag growth metrics
   */
  private async getHashtagGrowth(hashtag: string) {
    const now = new Date();
    const periods = [
      { key: 'last24h', hours: 24 },
      { key: 'last7d', hours: 24 * 7 },
      { key: 'last30d', hours: 24 * 30 }
    ];

    const growth: Record<string, number> = {};

    for (const period of periods) {
      const startDate = new Date(now.getTime() - (period.hours * 60 * 60 * 1000));
      const count = await TweetModel.countDocuments({
        hashtags: hashtag,
        tweetCreatedAt: { $gte: startDate }
      });
      growth[period.key] = count;
    }

    return growth;
  }
}

export default MongoTweetRepository;
