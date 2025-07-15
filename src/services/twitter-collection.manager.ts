/**
 * Twitter Collection Manager
 * Manages intelligent tweet collection within API limits
 */

import { TwitterAPIService } from './twitter-api.service';
import { MongoTweetRepository } from '../repositories/mongo-tweet.repository';
import { ITweetDocument } from '../models/Tweet.model';

export interface CollectionConfig {
  hashtag: string;
  campaignId?: string;
  maxTweets: number;
  prioritizeVerified: boolean;
  minFollowers: number;
  minEngagement: number;
  maxAgeHours: number;
}

export interface CollectionResult {
  collected: number;
  filtered: number;
  duplicates: number;
  errors: number;
  remainingQuota: number;
  estimatedCost: number;
  summary: {
    topEngagement: ITweetDocument[];
    verifiedUsers: number;
    averageEngagement: number;
    hashtagVariations: string[];
  };
}

export interface QuotaStatus {
  used: number;
  remaining: number;
  resetDate: Date;
  dailyAverage: number;
  recommendedDailyLimit: number;
}

export class TwitterCollectionManager {
  private twitterService: TwitterAPIService;
  private tweetRepository: MongoTweetRepository;
  private monthlyLimit: number;
  private requestsPerWindow: number;
  private tweetsPerRequest: number;

  constructor() {
    this.twitterService = new TwitterAPIService();
    this.tweetRepository = new MongoTweetRepository();
    this.monthlyLimit = parseInt(process.env.TWITTER_MONTHLY_LIMIT || '10000');
    this.requestsPerWindow = parseInt(process.env.TWITTER_REQUESTS_PER_15MIN || '300');
    this.tweetsPerRequest = parseInt(process.env.TWITTER_TWEETS_PER_REQUEST || '10');
  }

  /**
   * Get current quota status
   */
  async getQuotaStatus(): Promise<QuotaStatus> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    // Count tweets collected this month
    const usedThisMonth = await this.tweetRepository.findMany({
      dateFrom: startOfMonth,
      dateTo: now
    });

    const used = usedThisMonth.pagination.total;
    const remaining = this.monthlyLimit - used;
    const daysInMonth = endOfMonth.getDate();
    const daysPassed = now.getDate();
    const daysRemaining = daysInMonth - daysPassed;
    
    const dailyAverage = daysPassed > 0 ? used / daysPassed : 0;
    const recommendedDailyLimit = daysRemaining > 0 ? remaining / daysRemaining : 0;

    return {
      used,
      remaining,
      resetDate: new Date(now.getFullYear(), now.getMonth() + 1, 1),
      dailyAverage,
      recommendedDailyLimit: Math.floor(recommendedDailyLimit)
    };
  }

  /**
   * Intelligent tweet collection with optimization
   */
  async collectTweets(config: CollectionConfig): Promise<CollectionResult> {
    const quota = await this.getQuotaStatus();
    
    if (quota.remaining <= 0) {
      throw new Error(`Monthly Twitter API quota exceeded. Resets on ${quota.resetDate.toDateString()}`);
    }

    // Adjust collection based on remaining quota
    const maxTweetsToCollect = Math.min(config.maxTweets, quota.remaining);
    
    console.log(`📊 Twitter Collection Started for #${config.hashtag}`);
    console.log(`📈 Quota Status: ${quota.used}/${this.monthlyLimit} used, ${quota.remaining} remaining`);
    console.log(`🎯 Target: ${maxTweetsToCollect} tweets (requested: ${config.maxTweets})`);

    const result: CollectionResult = {
      collected: 0,
      filtered: 0,
      duplicates: 0,
      errors: 0,
      remainingQuota: quota.remaining,
      estimatedCost: 0,
      summary: {
        topEngagement: [],
        verifiedUsers: 0,
        averageEngagement: 0,
        hashtagVariations: []
      }
    };

    try {
      // Calculate optimal collection strategy
      const batchSize = Math.min(this.tweetsPerRequest, 50); // Max 50 per request for better quality
      const totalRequests = Math.ceil(maxTweetsToCollect / batchSize);
      
      console.log(`🔄 Will make ${totalRequests} requests of ${batchSize} tweets each`);

      let collected = 0;
      let nextToken: string | undefined;
      const allTweets: Partial<ITweetDocument>[] = [];

      // Collection loop with rate limiting
      for (let batch = 0; batch < totalRequests && collected < maxTweetsToCollect; batch++) {
        try {
          console.log(`📥 Collecting batch ${batch + 1}/${totalRequests}...`);

          // Search tweets with quality filters
          const searchResults = await this.twitterService.searchTweetsByHashtag(config.hashtag, {
            maxResults: batchSize,
            lang: 'en', // Focus on English tweets for better analysis
            nextToken,
            startTime: this.getFilterStartTime(config.maxAgeHours).toISOString(),
            endTime: new Date().toISOString()
          });

          if (!searchResults.data || searchResults.data.length === 0) {
            console.log('📭 No more tweets available');
            break;
          }

          // Transform and filter tweets
          const transformedTweets = searchResults.data
            .map(tweet => this.twitterService.transformTweetData(
              tweet, 
              searchResults.includes?.users || []
            ))
            .filter(tweet => this.applyQualityFilters(tweet, config));

          allTweets.push(...transformedTweets);
          collected += transformedTweets.length;
          result.filtered += (searchResults.data.length - transformedTweets.length);

          // Update pagination token
          nextToken = searchResults.meta?.next_token;

          // Rate limiting: Wait between requests
          if (batch < totalRequests - 1) {
            await this.delay(1000); // 1 second between requests
          }

        } catch (error) {
          console.error(`❌ Error in batch ${batch + 1}:`, error);
          result.errors++;
        }
      }

      // Sort by engagement and take the best tweets
      const sortedTweets = allTweets
        .filter(tweet => tweet.author && tweet.metrics)
        .sort((a, b) => {
          const aEngagement = a.metrics?.engagement || 0;
          const bEngagement = b.metrics?.engagement || 0;
          return bEngagement - aEngagement;
        })
        .slice(0, maxTweetsToCollect);

      // Add campaign ID if provided
      if (config.campaignId) {
        sortedTweets.forEach(tweet => {
          tweet.campaignId = config.campaignId;
        });
      }

      // Bulk save to database
      console.log(`💾 Saving ${sortedTweets.length} high-quality tweets to database...`);
      const bulkResult = await this.tweetRepository.bulkCreate(sortedTweets);

      result.collected = bulkResult.created.length;
      result.duplicates = bulkResult.duplicates.length;
      result.errors += bulkResult.errors.length;
      result.estimatedCost = collected; // Each tweet costs 1 from quota

      // Generate summary analytics
      result.summary = this.generateCollectionSummary(bulkResult.created);

      console.log(`✅ Collection Complete!`);
      console.log(`📊 Results: ${result.collected} collected, ${result.duplicates} duplicates, ${result.filtered} filtered`);
      console.log(`💰 API Cost: ${result.estimatedCost} tweets from quota`);

      return result;

    } catch (error) {
      console.error('❌ Collection failed:', error);
      throw error;
    }
  }

  /**
   * Apply quality filters to tweets
   */
  private applyQualityFilters(tweet: Partial<ITweetDocument>, config: CollectionConfig): boolean {
    if (!tweet.author || !tweet.metrics) return false;

    // Filter by follower count
    if (tweet.author.followersCount < config.minFollowers) {
      return false;
    }

    // Prioritize verified users
    if (config.prioritizeVerified && tweet.author.verified) {
      return true; // Always include verified users
    }

    // Filter by engagement rate
    if (tweet.metrics.engagement < config.minEngagement) {
      return false;
    }

    // Skip retweets for original content
    if (tweet.isRetweet) {
      return false;
    }

    // Require minimum content length
    if (!tweet.content || tweet.content.length < 50) {
      return false;
    }

    return true;
  }

  /**
   * Generate collection summary
   */
  private generateCollectionSummary(tweets: ITweetDocument[]) {
    const topEngagement = tweets
      .sort((a, b) => (b.metrics?.engagement || 0) - (a.metrics?.engagement || 0))
      .slice(0, 5);

    const verifiedUsers = tweets.filter(t => t.author?.verified).length;
    
    const totalEngagement = tweets.reduce((sum, t) => sum + (t.metrics?.engagement || 0), 0);
    const averageEngagement = tweets.length > 0 ? totalEngagement / tweets.length : 0;

    const allHashtags = tweets.flatMap(t => t.hashtags || []);
    const hashtagCounts = allHashtags.reduce((acc, tag) => {
      acc[tag] = (acc[tag] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const hashtagVariations = Object.entries(hashtagCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([tag]) => tag);

    return {
      topEngagement,
      verifiedUsers,
      averageEngagement: Math.round(averageEngagement * 100) / 100,
      hashtagVariations
    };
  }

  /**
   * Get optimal collection recommendations
   */
  async getCollectionRecommendations(hashtag: string): Promise<{
    recommendedMaxTweets: number;
    estimatedQuality: 'high' | 'medium' | 'low';
    suggestions: string[];
    quotaWarning?: string;
  }> {
    const quota = await this.getQuotaStatus();
    
    let recommendedMaxTweets = Math.min(quota.recommendedDailyLimit, 500);
    let estimatedQuality: 'high' | 'medium' | 'low' = 'medium';
    const suggestions: string[] = [];

    if (quota.remaining < 1000) {
      recommendedMaxTweets = Math.min(recommendedMaxTweets, 100);
      estimatedQuality = 'high';
      suggestions.push('Focus on verified users and high engagement');
      suggestions.push('Increase minimum follower count to 1000+');
    }

    if (quota.remaining < 100) {
      recommendedMaxTweets = Math.min(recommendedMaxTweets, 50);
      suggestions.push('Consider waiting until quota resets');
    }

    suggestions.push(`Set maxAgeHours to 24 for recent, relevant content`);
    suggestions.push(`Use minEngagement: 3 for better quality tweets`);

    return {
      recommendedMaxTweets,
      estimatedQuality,
      suggestions,
      quotaWarning: quota.remaining < 500 ? 
        `Low quota remaining (${quota.remaining}). Consider conserving for high-priority collections.` : 
        undefined
    };
  }

  /**
   * Get filter start time based on max age
   */
  private getFilterStartTime(maxAgeHours: number): Date {
    const now = new Date();
    return new Date(now.getTime() - (maxAgeHours * 60 * 60 * 1000));
  }

  /**
   * Delay utility for rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default TwitterCollectionManager;
