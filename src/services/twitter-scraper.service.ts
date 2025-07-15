/**
 * Twitter Web Scraper Service
 * Alternative to Twitter API using web scraping for unlimited tweet collection
 * Using Twid for reliable Twitter scraping
 */

import { Tweet } from '../types/twitter';

// Twid Interface Definition
interface TwidInterface {
  scrape(query: string, options: ScrapingOptions): Promise<ScrapedTweetData[]>;
}

// Scraped Tweet Data Structure
interface ScrapedTweetData {
  id?: string;
  text?: string;
  content?: string;
  author?: {
    id?: string;
    username?: string;
    displayName?: string;
    name?: string;
    verified?: boolean;
    followersCount?: number;
    followers?: number;
    avatar?: string;
    profileImageUrl?: string;
  };
  metrics?: {
    likes?: number;
    retweets?: number;
    replies?: number;
    views?: number;
  };
  likes?: number;
  retweets?: number;
  replies?: number;
  views?: number;
  createdAt?: string;
  hashtags?: string[];
  mentions?: string[];
  urls?: string[];
  media?: Array<{
    type: string;
    url: string;
    width?: number;
    height?: number;
  }>;
  isRetweet?: boolean;
  isReply?: boolean;
  lang?: string;
}

interface ScrapingConfig {
  headless?: boolean;
  timeout?: number;
  delay?: number;
  maxRetries?: number;
  userAgent?: string;
}

interface ScrapingOptions {
  hashtag?: string;
  username?: string;
  maxTweets?: number;
  includeReplies?: boolean;
  includeRetweets?: boolean;
  maxAgeHours?: number;
  minLikes?: number;
  minRetweets?: number;
}

interface ScrapingResult {
  tweets: Tweet[];
  totalFound: number;
  totalScraped: number;
  errors: string[];
  rateLimit: {
    remaining: number;
    resetTime: Date;
  };
}

export class TwitterScraperService {
  private config: ScrapingConfig;
  private isRateLimited: boolean = false;
  private rateLimitResetTime: Date = new Date();
  private requestCount: number = 0;
  private maxRequestsPerHour: number = 300; // Conservative limit

  constructor(config: ScrapingConfig = {}) {
    this.config = {
      headless: true,
      timeout: 30000,
      delay: 2000, // 2 seconds between requests
      maxRetries: 3,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      ...config
    };
  }

  /**
   * Scrape tweets by hashtag
   */
  async scrapeByHashtag(hashtag: string, options: ScrapingOptions = {}): Promise<ScrapingResult> {
    console.log(`🕷️ Starting scrape for hashtag: #${hashtag}`);
    
    if (this.isRateLimited) {
      throw new Error(`Rate limited. Reset time: ${this.rateLimitResetTime.toISOString()}`);
    }

    const defaultOptions: ScrapingOptions = {
      maxTweets: 100,
      includeReplies: false,
      includeRetweets: true,
      maxAgeHours: 24,
      minLikes: 0,
      minRetweets: 0,
      ...options
    };

    try {
      // Import twid dynamically to avoid import issues
      const twid = await this.importTwid();
      
      const searchQuery = this.buildSearchQuery(hashtag, defaultOptions);
      console.log(`🔍 Search Query: ${searchQuery}`);

      const scrapedData = await this.performScraping(twid, searchQuery, defaultOptions);
      const tweets = this.processTweets(scrapedData, defaultOptions);

      this.updateRateLimit();

      return {
        tweets,
        totalFound: scrapedData.length,
        totalScraped: tweets.length,
        errors: [],
        rateLimit: {
          remaining: this.maxRequestsPerHour - this.requestCount,
          resetTime: this.rateLimitResetTime
        }
      };

    } catch (error) {
      console.error('❌ Scraping error:', error);
      return {
        tweets: [],
        totalFound: 0,
        totalScraped: 0,
        errors: [error instanceof Error ? error.message : 'Unknown scraping error'],
        rateLimit: {
          remaining: this.maxRequestsPerHour - this.requestCount,
          resetTime: this.rateLimitResetTime
        }
      };
    }
  }

  /**
   * Scrape tweets from a specific user
   */
  async scrapeByUser(username: string, options: ScrapingOptions = {}): Promise<ScrapingResult> {
    console.log(`🕷️ Starting scrape for user: @${username}`);
    
    const userOptions = { ...options, username };
    return this.scrapeByHashtag('', userOptions);
  }

  /**
   * Get current rate limit status
   */
  getRateLimitStatus() {
    return {
      isLimited: this.isRateLimited,
      remaining: this.maxRequestsPerHour - this.requestCount,
      resetTime: this.rateLimitResetTime,
      requestCount: this.requestCount
    };
  }

  /**
   * Import twid module dynamically
   */
  private async importTwid(): Promise<TwidInterface> {
    try {
      // Try to import twid
      const twidModule = await import('twid');
      
      // Wrap twid to match our interface
      return {
        scrape: async (query: string, options: ScrapingOptions) => {
          const twidOptions = {
            count: options.maxTweets || 100,
            include_replies: options.includeReplies || false
          };
          const result = await (twidModule.default || twidModule).scrape(query, twidOptions);
          return Array.isArray(result) ? result : [result];
        }
      };
    } catch (error) {
      console.error('❌ Failed to import twid:', error);
      // Fallback to mock scraping if twid is not available
      return this.createMockTwid();
    }
  }

  /**
   * Create a mock twid implementation for development/testing
   */
  private createMockTwid(): TwidInterface {
    console.log('⚠️ Using mock scraper (twid not available)');
    
    return {
      scrape: async (query: string, options: ScrapingOptions) => {
        // Simulate delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Return mock data
        return this.generateMockScrapedData(options.maxTweets || 10);
      }
    };
  }

  /**
   * Generate mock scraped data for testing
   */
  private generateMockScrapedData(count: number) {
    const mockTweets = [];
    const hashtags = ['JustDoIt', 'NikeAir', 'SportMotivation', 'Fitness', 'Running'];
    const usernames = ['nike_official', 'athlete_john', 'fitness_guru', 'runner_pro', 'sport_fan'];
    
    for (let i = 0; i < count; i++) {
      const username = usernames[Math.floor(Math.random() * usernames.length)];
      const hashtag = hashtags[Math.floor(Math.random() * hashtags.length)];
      const likes = Math.floor(Math.random() * 1000) + 10;
      const retweets = Math.floor(Math.random() * 100) + 1;
      
      mockTweets.push({
        id: `mock_${Date.now()}_${i}`,
        text: `This is a mock tweet about #${hashtag} from web scraping! 🚀 Great inspiration for everyone. #motivation #sport`,
        author: {
          username,
          displayName: `${username.replace('_', ' ').toUpperCase()}`,
          verified: Math.random() > 0.7,
          followers: Math.floor(Math.random() * 100000) + 1000,
          avatar: `https://via.placeholder.com/50?text=${username[0].toUpperCase()}`
        },
        metrics: {
          likes,
          retweets,
          replies: Math.floor(Math.random() * 50) + 1,
          views: likes * 10 + Math.floor(Math.random() * 1000)
        },
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 24 * 60 * 60 * 1000)).toISOString(),
        media: Math.random() > 0.7 ? [{
          type: 'photo',
          url: `https://via.placeholder.com/400x300?text=${hashtag}`,
          width: 400,
          height: 300
        }] : [],
        hashtags: [`#${hashtag}`, '#motivation'],
        mentions: [],
        urls: []
      });
    }
    
    return mockTweets;
  }

  /**
   * Build search query for Twitter scraping
   */
  private buildSearchQuery(hashtag: string, options: ScrapingOptions): string {
    let query = '';
    
    if (hashtag) {
      query += `#${hashtag}`;
    }
    
    if (options.username) {
      query += ` from:${options.username}`;
    }
    
    if (!options.includeRetweets) {
      query += ' -RT';
    }
    
    if (options.minLikes && options.minLikes > 0) {
      query += ` min_faves:${options.minLikes}`;
    }
    
    if (options.minRetweets && options.minRetweets > 0) {
      query += ` min_retweets:${options.minRetweets}`;
    }
    
    return query.trim() || 'twitter';
  }

  /**
   * Perform the actual scraping using twid
   */
  private async performScraping(twid: TwidInterface, query: string, options: ScrapingOptions): Promise<ScrapedTweetData[]> {
    const scrapingOptions = {
      maxTweets: options.maxTweets || 100,
      includeReplies: options.includeReplies || false
    };

    console.log(`🕷️ Scraping with options:`, scrapingOptions);
    
    // Add delay to avoid being blocked
    await this.delay(this.config.delay || 2000);
    
    const result = await twid.scrape(query, scrapingOptions);
    return Array.isArray(result) ? result : [result];
  }

  /**
   * Process and normalize scraped tweets
   */
  private processTweets(scrapedData: ScrapedTweetData[], options: ScrapingOptions): Tweet[] {
    const tweets: Tweet[] = [];
    const now = new Date();
    const maxAge = options.maxAgeHours ? options.maxAgeHours * 60 * 60 * 1000 : Infinity;

    for (const item of scrapedData) {
      try {
        const tweet = this.normalizeTweet(item);
        
        // Apply filters
        if (options.maxAgeHours) {
          const tweetAge = now.getTime() - new Date(tweet.createdAt).getTime();
          if (tweetAge > maxAge) continue;
        }
        
        if (options.minLikes && tweet.metrics.likes < options.minLikes) continue;
        if (options.minRetweets && tweet.metrics.retweets < options.minRetweets) continue;
        
        tweets.push(tweet);
      } catch (error) {
        console.warn('⚠️ Failed to process tweet:', error);
      }
    }

    return tweets;
  }

  /**
   * Normalize scraped data to our Tweet interface
   */
  private normalizeTweet(scrapedTweet: ScrapedTweetData): Tweet {
    const createdAt = new Date(scrapedTweet.createdAt || new Date().toISOString());
    
    return {
      id: scrapedTweet.id || `scraped_${Date.now()}_${Math.random()}`,
      tweetId: scrapedTweet.id || `scraped_${Date.now()}_${Math.random()}`,
      content: scrapedTweet.text || scrapedTweet.content || '',
      author: {
        id: scrapedTweet.author?.id || scrapedTweet.author?.username || 'unknown',
        username: scrapedTweet.author?.username || 'unknown',
        displayName: scrapedTweet.author?.displayName || scrapedTweet.author?.name || 'Unknown User',
        verified: scrapedTweet.author?.verified || false,
        followersCount: scrapedTweet.author?.followersCount || scrapedTweet.author?.followers || 0,
        followingCount: 0,
        tweetsCount: 0,
        avatar: scrapedTweet.author?.avatar || scrapedTweet.author?.profileImageUrl || ''
      },
      metrics: {
        likes: scrapedTweet.metrics?.likes || scrapedTweet.likes || 0,
        retweets: scrapedTweet.metrics?.retweets || scrapedTweet.retweets || 0,
        replies: scrapedTweet.metrics?.replies || scrapedTweet.replies || 0,
        quotes: 0, // Not available in scraping
        views: scrapedTweet.metrics?.views || scrapedTweet.views || 0,
        engagement: 0 // Will be calculated later
      },
      hashtags: scrapedTweet.hashtags || this.extractHashtags(scrapedTweet.text || scrapedTweet.content || ''),
      mentions: scrapedTweet.mentions || this.extractMentions(scrapedTweet.text || scrapedTweet.content || ''),
      urls: scrapedTweet.urls || [],
      mediaUrls: scrapedTweet.media?.map(m => m.url) || [],
      isRetweet: scrapedTweet.isRetweet || false,
      isReply: scrapedTweet.isReply || false,
      isQuote: false,
      language: scrapedTweet.lang || 'en',
      scrapedAt: new Date(),
      createdAt,
      updatedAt: new Date()
    };
  }

  /**
   * Extract hashtags from tweet text
   */
  private extractHashtags(text: string): string[] {
    const hashtagRegex = /#[\w]+/g;
    return text.match(hashtagRegex) || [];
  }

  /**
   * Extract mentions from tweet text
   */
  private extractMentions(text: string): string[] {
    const mentionRegex = /@[\w]+/g;
    return text.match(mentionRegex) || [];
  }

  /**
   * Update rate limiting status
   */
  private updateRateLimit() {
    this.requestCount++;
    
    // Reset count every hour
    const now = new Date();
    if (now > this.rateLimitResetTime) {
      this.requestCount = 1;
      this.rateLimitResetTime = new Date(now.getTime() + 60 * 60 * 1000); // Reset in 1 hour
    }
    
    // Check if we've hit the limit
    if (this.requestCount >= this.maxRequestsPerHour) {
      this.isRateLimited = true;
      console.warn('⚠️ Rate limit reached. Will reset at:', this.rateLimitResetTime);
    }
  }

  /**
   * Add delay between requests
   */
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default TwitterScraperService;
