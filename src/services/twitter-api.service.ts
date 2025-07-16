/**
 * Twitter API Service
 * Handles Twitter API v2 integration for tweet collection and user data
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { 
  TwitterAPIResponse, 
  TwitterSearchParams, 
  TwitterUser, 
  TweetMetrics
} from '../types/twitter';
import { 
  TwitterAPITweetResponse, 
  TwitterAPISingleTweetResponse, 
  TwitterAPIUserResponse,
  TwitterAPIUser,
  TwitterAPITweet,
  TwitterRateLimitHeaders
} from '../types/twitter-api.types';
import { ITweetDocument } from '../models/Tweet.model';
import MockTwitterDataGenerator from './mock-twitter-data.generator';

export class TwitterAPIService {
  private api: AxiosInstance;
  private readonly baseURL = 'https://api.twitter.com/2';
  private readonly bearerToken: string;
  private mockGenerator: MockTwitterDataGenerator;

  constructor() {
    this.bearerToken = process.env.TWITTER_BEARER_TOKEN || '';
    this.mockGenerator = new MockTwitterDataGenerator();
    
    if (!this.bearerToken) {
      console.warn('⚠️  TWITTER_BEARER_TOKEN not configured. Using mock data for testing.');
      // Create a dummy axios instance to prevent initialization errors
      this.api = axios.create({
        baseURL: this.baseURL,
        timeout: 30000
      });
      return;
    }

    this.api = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${this.bearerToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    // Request interceptor for logging
    this.api.interceptors.request.use(
      (config) => {
        console.log(`[Twitter API] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('[Twitter API] Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => {
        return response;
      },
      (error) => {
        console.error('[Twitter API] Response Error:', error.response?.data || error.message);
        return Promise.reject(this.handleAPIError(error));
      }
    );
  }

  /**
   * Check if Twitter API is properly configured
   */
  isConfigured(): boolean {
    return !!this.bearerToken;
  }

  /**
   * Search tweets by hashtag with comprehensive data
   */
  async searchTweetsByHashtag(
    hashtag: string, 
    params: Partial<TwitterSearchParams> = {}
  ): Promise<TwitterAPIResponse> {
    // Use mock data if Twitter API is not configured
    if (!this.isConfigured()) {
      console.log(`🎭 Using mock data for hashtag: #${hashtag}`);
      const mockResponse = this.mockGenerator.generateMockResponse(hashtag, params.maxResults || 10);
      
      // Simulate API delay
      await this.delay(500 + Math.random() * 1000);
      
      return mockResponse;
    }

    try {
      const searchQuery = hashtag.startsWith('#') ? hashtag : `#${hashtag}`;
      
      const queryParams = {
        query: `${searchQuery} -is:retweet lang:${params.lang || 'en'}`,
        max_results: params.maxResults || 100,
        'tweet.fields': [
          'id',
          'text',
          'created_at',
          'author_id',
          'public_metrics',
          'context_annotations',
          'entities',
          'geo',
          'lang',
          'possibly_sensitive',
          'referenced_tweets',
          'reply_settings',
          'source'
        ].join(','),
        'user.fields': [
          'id',
          'username',
          'name',
          'verified',
          'public_metrics',
          'description',
          'location',
          'url',
          'created_at',
          'profile_image_url'
        ].join(','),
        'media.fields': [
          'media_key',
          'type',
          'url',
          'duration_ms',
          'height',
          'width',
          'preview_image_url',
          'public_metrics'
        ].join(','),
        expansions: [
          'author_id',
          'referenced_tweets.id',
          'attachments.media_keys',
          'geo.place_id'
        ].join(','),
        start_time: params.startTime,
        end_time: params.endTime,
        next_token: params.nextToken
      };

      // Remove undefined values
      Object.keys(queryParams).forEach(key => 
        queryParams[key as keyof typeof queryParams] === undefined && 
        delete queryParams[key as keyof typeof queryParams]
      );

      const response: AxiosResponse<TwitterAPIResponse> = await this.api.get('/tweets/search/recent', {
        params: queryParams
      });

      return response.data;
    } catch (error) {
      console.error(`[Twitter API] Error searching tweets for hashtag ${hashtag}:`, error);
      throw error;
    }
  }

  /**
   * Get user information by username or ID
   */
  async getUserInfo(identifier: string, byId: boolean = false): Promise<TwitterUser | null> {
    if (!this.isConfigured()) {
      throw new Error('Twitter API not configured. Please set TWITTER_BEARER_TOKEN environment variable.');
    }

    try {
      const endpoint = byId ? `/users/${identifier}` : `/users/by/username/${identifier}`;
      
      const response = await this.api.get(endpoint, {
        params: {
          'user.fields': [
            'id',
            'username',
            'name',
            'verified',
            'public_metrics',
            'description',
            'location',
            'url',
            'created_at',
            'profile_image_url'
          ].join(',')
        }
      });

      const userData = response.data.data;
      if (!userData) return null;

      return this.transformTwitterUserData(userData);
    } catch (error) {
      console.error(`[Twitter API] Error getting user info for ${identifier}:`, error);
      return null;
    }
  }

  /**
   * Get tweet by ID with full context
   */
  async getTweetById(tweetId: string): Promise<TwitterAPISingleTweetResponse> {
    try {
      const response = await this.api.get(`/tweets/${tweetId}`, {
        params: {
          'tweet.fields': [
            'id',
            'text',
            'created_at',
            'author_id',
            'public_metrics',
            'context_annotations',
            'entities',
            'geo',
            'lang',
            'possibly_sensitive',
            'referenced_tweets',
            'reply_settings',
            'source'
          ].join(','),
          'user.fields': [
            'id',
            'username',
            'name',
            'verified',
            'public_metrics',
            'description',
            'location',
            'url',
            'created_at',
            'profile_image_url'
          ].join(','),
          expansions: ['author_id', 'referenced_tweets.id'].join(',')
        }
      });

      return response.data;
    } catch (error) {
      console.error(`[Twitter API] Error getting tweet ${tweetId}:`, error);
      throw error;
    }
  }

  /**
   * Get multiple tweets by hashtag with pagination
   */
  async *searchTweetsPaginated(
    hashtag: string, 
    params: Partial<TwitterSearchParams> = {}
  ): AsyncGenerator<TwitterAPIResponse, void, unknown> {
    let nextToken: string | undefined = params.nextToken;
    let totalCollected = 0;
    const maxTotal = params.maxTotal || 1000;

    do {
      try {
        const response = await this.searchTweetsByHashtag(hashtag, {
          ...params,
          nextToken,
          maxResults: Math.min(100, maxTotal - totalCollected)
        });

        if (response.data && response.data.length > 0) {
          totalCollected += response.data.length;
          yield response;
          
          nextToken = response.meta?.next_token;
          
          // Rate limiting: Wait 1 second between requests
          await this.delay(1000);
        } else {
          break;
        }
      } catch (error) {
        console.error('[Twitter API] Error in paginated search:', error);
        break;
      }
    } while (nextToken && totalCollected < maxTotal);
  }

  /**
   * Transform Twitter API user data to our format
   */
  private transformTwitterUserData(apiUser: TwitterAPIUser): TwitterUser {
    const metrics = apiUser.public_metrics || {
      followers_count: 0,
      following_count: 0,
      tweet_count: 0,
      listed_count: 0
    };
    
    return {
      id: apiUser.id,
      username: apiUser.username,
      displayName: apiUser.name,
      avatar: apiUser.profile_image_url,
      verified: apiUser.verified || false,
      followersCount: metrics.followers_count || 0,
      followingCount: metrics.following_count || 0,
      tweetsCount: metrics.tweet_count || 0,
      location: apiUser.location,
      bio: apiUser.description,
      website: apiUser.url,
      joinedDate: apiUser.created_at ? new Date(apiUser.created_at) : undefined,
      influenceScore: this.calculateInfluenceScore(metrics),
      engagementRate: this.calculateUserEngagementRate(metrics)
    };
  }

  /**
   * Transform Twitter API tweet data to our format
   */
  transformTweetData(apiTweet: TwitterAPITweet, apiUsers: TwitterAPIUser[] = []): Partial<ITweetDocument> {
    const author = apiUsers.find(user => user.id === apiTweet.author_id);
    const metrics = apiTweet.public_metrics || {
      retweet_count: 0,
      like_count: 0,
      reply_count: 0,
      quote_count: 0
    };
    const entities = apiTweet.entities || {};

    // Extract hashtags
    const hashtags = (entities.hashtags || []).map(tag => tag.tag.toLowerCase());
    
    // Extract mentions
    const mentions = (entities.mentions || []).map(mention => mention.username.toLowerCase());
    
    // Extract URLs
    const urls = (entities.urls || []).map(url => url.expanded_url || url.url);

    // Determine tweet type
    const referencedTweets = apiTweet.referenced_tweets || [];
    const isRetweet = referencedTweets.some(ref => ref.type === 'retweeted');
    const isReply = referencedTweets.some(ref => ref.type === 'replied_to');
    const isQuote = referencedTweets.some(ref => ref.type === 'quoted');

    const tweetMetrics: TweetMetrics = {
      retweets: metrics.retweet_count || 0,
      likes: metrics.like_count || 0,
      replies: metrics.reply_count || 0,
      quotes: metrics.quote_count || 0,
      views: metrics.impression_count,
      engagement: 0 // Will be calculated in pre-save middleware
    };

    return {
      tweetId: apiTweet.id,
      content: apiTweet.text,
      author: author ? this.transformTwitterUserData(author) : undefined,
      metrics: tweetMetrics,
      hashtags,
      mentions,
      urls,
      isRetweet,
      isReply,
      isQuote,
      parentTweetId: referencedTweets.find(ref => 
        ref.type === 'replied_to' || ref.type === 'quoted'
      )?.id,
      language: apiTweet.lang || 'en',
      tweetCreatedAt: new Date(apiTweet.created_at),
      scrapedAt: new Date()
    };
  }

  /**
   * Calculate influence score based on follower metrics
   */
  private calculateInfluenceScore(metrics: TwitterAPIUser['public_metrics']): number {
    if (!metrics) return 0;
    
    const followers = metrics.followers_count || 0;
    const following = metrics.following_count || 0;
    const tweets = metrics.tweet_count || 0;

    if (followers === 0) return 0;

    // Simple influence calculation
    const followerRatio = following > 0 ? followers / following : followers;
    const activityScore = Math.min(tweets / 1000, 1); // Normalize to max 1
    const baseScore = Math.log10(followers + 1) * 10; // Logarithmic scale

    return Math.min(baseScore * followerRatio * activityScore, 100);
  }

  /**
   * Calculate user engagement rate
   */
  private calculateUserEngagementRate(metrics: TwitterAPIUser['public_metrics']): number {
    // This is a simplified calculation
    // In practice, you'd need historical tweet data
    if (!metrics) return 0;
    
    const followers = metrics.followers_count || 0;
    if (followers === 0) return 0;
    
    // Estimate based on follower count (higher followers typically = lower engagement rate)
    if (followers < 1000) return 5.0;
    if (followers < 10000) return 3.0;
    if (followers < 100000) return 2.0;
    return 1.0;
  }

  /**
   * Handle API errors with proper error messages
   */
  private handleAPIError(error: { response?: { status: number; data: { detail?: string } }; message: string }): Error {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      switch (status) {
        case 401:
          return new Error('Twitter API authentication failed. Check your bearer token.');
        case 403:
          return new Error('Twitter API access forbidden. Check your API permissions.');
        case 429:
          return new Error('Twitter API rate limit exceeded. Please wait before retrying.');
        case 422:
          return new Error(`Twitter API validation error: ${data.detail || 'Invalid request parameters'}`);
        default:
          return new Error(`Twitter API error (${status}): ${data.detail || error.message}`);
      }
    }

    return new Error(`Twitter API connection error: ${error.message}`);
  }

  /**
   * Utility method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<boolean> {
    if (!this.isConfigured()) {
      return false;
    }
    
    try {
      await this.api.get('/users/me');
      return true;
    } catch (error) {
      console.error('[Twitter API] Connection test failed:', error);
      return false;
    }
  }

  /**
   * Get rate limit status
   */
  async getRateLimitStatus(): Promise<TwitterRateLimitHeaders | null> {
    try {
      const response = await this.api.get('/labs/1/tweets/metrics/private');
      return response.headers as TwitterRateLimitHeaders;
    } catch (error) {
      console.error('[Twitter API] Error getting rate limit status:', error);
      return null;
    }
  }
}

export default TwitterAPIService;
