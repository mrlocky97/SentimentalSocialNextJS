/**
 * Twitter Web Scraper Service
 * Alternative to Twitter API using web scraping for unlimited tweet collection
 * Using @the-convocation/twitter-scraper for reliable Twitter scraping
 */

import { Tweet } from '../types/twitter';

// Twitter Scraper Interface Definition  
interface TwitterScraperInterface {
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
  
  // Enhanced mock data for realistic variety
  private mockData = {
    sentiments: ['positive', 'negative', 'neutral'] as const,
    sentimentScores: {
      positive: [0.6, 0.7, 0.8, 0.9, 0.95],
      negative: [0.1, 0.2, 0.3, 0.4, 0.45],
      neutral: [0.45, 0.5, 0.55]
    },
    users: [
      { username: 'techguru23', name: 'Sarah Chen', verified: false, followers: 15420 },
      { username: 'airesearcher', name: 'Dr. Marcus Williams', verified: true, followers: 89203 },
      { username: 'startuplife', name: 'Jessica Martinez', verified: false, followers: 5678 },
      { username: 'digitalmarketer', name: 'Alex Thompson', verified: false, followers: 23456 },
      { username: 'innovationhub', name: 'Innovation Hub', verified: true, followers: 145789 },
      { username: 'futurist2025', name: 'Emma Rodriguez', verified: false, followers: 8934 },
      { username: 'techreporter', name: 'Ryan O\'Connor', verified: true, followers: 67890 },
      { username: 'codingwiz', name: 'Priya Patel', verified: false, followers: 12345 }
    ],
    tweetTemplates: {
      AI: [
        "Just witnessed {AI_TECH} in action and I'm blown away! The future is here. #AI #Innovation #Technology",
        "The ethical implications of {AI_TECH} are fascinating. We need more discussions about responsible AI development. #Ethics #AI",
        "Hot take: {AI_TECH} will revolutionize {INDUSTRY} in the next 2 years. Mark my words! 🚀 #AI #Prediction",
        "Struggled with {PROBLEM} for hours. Then tried {AI_TECH} and solved it in minutes. Mind = blown 🤯 #AI #Productivity",
        "The {AI_TECH} announcement today has me thinking about the future of work. Exciting and scary at the same time! #AI #Future"
      ],
      Technology: [
        "Breaking: {TECH_COMPANY} just released {NEW_TECH}. This changes everything! #Technology #Innovation #Tech",
        "Remember when {OLD_TECH} was revolutionary? Now we have {NEW_TECH}. Technology moves so fast! #Technology #Progress",
        "PSA: If you're not using {TECH_TOOL} yet, you're missing out. Game changer for {USE_CASE}! #Technology #Productivity",
        "The convergence of {TECH1} and {TECH2} is creating unprecedented opportunities. Exciting times! #Technology #Innovation",
        "Just finished reading about {TECH_TREND}. The implications for {INDUSTRY} are massive. Thread below 👇 #Technology"
      ],
      default: [
        "Interesting perspective on {TOPIC}. Would love to hear more thoughts from the community! #Discussion",
        "Today's {TOPIC} developments have me thinking about the bigger picture. What's your take? #Thoughts",
        "The more I learn about {TOPIC}, the more fascinated I become. Any recommended resources? #Learning",
        "Hot take on {TOPIC}: {OPINION}. Probably controversial but here we go! #Opinion #Discussion",
        "Quick reminder: {TOPIC} isn't just a trend, it's the future. Time to adapt! #Future #Change"
      ]
    },
    replacements: {
      AI_TECH: ['GPT-4', 'Claude AI', 'Midjourney', 'ChatGPT', 'DALL-E', 'GitHub Copilot', 'AutoGPT', 'LangChain'],
      TECH_COMPANY: ['Google', 'Microsoft', 'Apple', 'Meta', 'Amazon', 'OpenAI', 'Anthropic', 'Tesla'],
      NEW_TECH: ['neural interfaces', 'quantum computing', 'AR glasses', 'autonomous vehicles', 'smart contracts'],
      OLD_TECH: ['dial-up internet', 'flip phones', 'CDs', 'fax machines', 'paper maps'],
      TECH_TOOL: ['Notion', 'Figma', 'VS Code', 'Slack', 'Discord', 'Linear', 'Vercel', 'Supabase'],
      USE_CASE: ['project management', 'design work', 'coding', 'team collaboration', 'data analysis'],
      TECH1: ['AI', 'blockchain', 'IoT', 'AR/VR', '5G'],
      TECH2: ['cloud computing', 'edge computing', 'quantum computing', 'biotechnology', 'nanotechnology'],
      TECH_TREND: ['Web3', 'metaverse', 'digital twins', 'edge AI', 'quantum supremacy'],
      INDUSTRY: ['healthcare', 'finance', 'education', 'manufacturing', 'entertainment', 'retail'],
      TOPIC: ['innovation', 'sustainability', 'remote work', 'digital transformation', 'startup culture'],
      PROBLEM: ['data analysis', 'code debugging', 'design consistency', 'workflow optimization'],
      OPINION: ['this will change everything', 'adoption will be slower than expected', 'regulation is needed', 'we\'re not ready for this']
    }
  };

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
      maxAgeHours: 168, // 7 days to match mock data generation
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
   * Initialize mock Twitter scraper (real scraping handled by TwitterRealScraperService)
   */
  private async importTwid(): Promise<TwitterScraperInterface> {
    console.log('⚠️ Using mock Twitter scraper for development/testing');
    console.log('⚠️ For real scraping, use TwitterRealScraperService with cookie authentication');
    console.log('⚠️ See TWITTER_COOKIE_GUIDE.md for setup instructions');
    
    // Always return mock scraper since real scraping is handled by TwitterRealScraperService
    return this.createMockTwid();
  }

  /**
   * Create a mock twid implementation for development/testing
   */
  private createMockTwid(): TwitterScraperInterface {
    console.log('⚠️ Using mock scraper (twid not available)');
    
    return {
      scrape: async (query: string, options: ScrapingOptions) => {
        // Simulate delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Extract hashtag from query for more realistic content
        const hashtagMatch = query.match(/#(\w+)/);
        const hashtag = hashtagMatch ? hashtagMatch[1] : 'AI';
        
        // Return mock data with hashtag context
        return this.generateMockScrapedData(options.maxTweets || 10, hashtag);
      }
    };
  }

  /**
   * Generate mock scraped data with realistic variety
   */
  private generateMockScrapedData(count: number, hashtag?: string) {
    const mockTweets = [];
    
    for (let i = 0; i < count; i++) {
      const user = this.mockData.users[Math.floor(Math.random() * this.mockData.users.length)];
      const sentiment = this.mockData.sentiments[Math.floor(Math.random() * this.mockData.sentiments.length)];
      const tweetContent = this.generateRealisticTweet(hashtag || 'AI', sentiment);
      
      // Generate realistic metrics based on user following and sentiment
      const baseEngagement = this.calculateBaseEngagement(user.followers, sentiment);
      const metrics = this.generateRealisticMetrics(baseEngagement);
      
      mockTweets.push({
        id: `mock_${Date.now()}_${i}`,
        text: tweetContent.text,
        author: {
          id: user.username,
          username: user.username,
          displayName: user.name,
          verified: user.verified,
          followersCount: user.followers,
          followers: user.followers,
          avatar: `https://via.placeholder.com/50?text=${user.name.split(' ').map(n => n[0]).join('')}`
        },
        metrics,
        likes: metrics.likes,
        retweets: metrics.retweets,
        replies: metrics.replies,
        views: metrics.views,
        createdAt: this.generateRealisticTimestamp(),
        media: this.generateRandomMedia(tweetContent.text),
        hashtags: tweetContent.hashtags,
        mentions: this.generateRandomMentions(),
        urls: this.generateRandomUrls(tweetContent.text),
        isRetweet: Math.random() < 0.1, // 10% chance of retweet
        language: 'en',
        sentiment: {
          label: sentiment,
          score: this.mockData.sentimentScores[sentiment][Math.floor(Math.random() * this.mockData.sentimentScores[sentiment].length)]
        }
      });
    }
    
    return mockTweets;
  }

  /**
   * Generate realistic tweet content with templates
   */
  private generateRealisticTweet(hashtag: string, sentiment: string) {
    // Choose template based on hashtag
    const templateKey = this.mockData.tweetTemplates[hashtag as keyof typeof this.mockData.tweetTemplates] 
      ? hashtag as keyof typeof this.mockData.tweetTemplates
      : 'default';
    
    const templates = this.mockData.tweetTemplates[templateKey];
    let template = templates[Math.floor(Math.random() * templates.length)];
    
    // Replace placeholders with random values
    Object.entries(this.mockData.replacements).forEach(([key, values]) => {
      const placeholder = `{${key}}`;
      if (template.includes(placeholder)) {
        const randomValue = values[Math.floor(Math.random() * values.length)];
        template = template.replace(new RegExp(placeholder, 'g'), randomValue);
      }
    });
    
    // Adjust sentiment tone
    template = this.adjustSentimentTone(template, sentiment);
    
    // Extract hashtags from template
    const hashtags = template.match(/#\w+/g) || [`#${hashtag}`];
    
    return {
      text: template,
      hashtags: hashtags
    };
  }

  /**
   * Adjust tweet tone based on sentiment
   */
  private adjustSentimentTone(text: string, sentiment: string): string {
    const positiveModifiers = ['Amazing!', 'Incredible!', 'Love this!', '🚀', '💪', '✨', '🔥'];
    const negativeModifiers = ['Concerning...', 'Not sure about this', 'Disappointing', '😕', '⚠️', '😞'];
    const neutralModifiers = ['Interesting.', 'Worth considering.', 'Let me think about this.', '🤔', '💭'];
    
    if (sentiment === 'positive' && Math.random() < 0.3) {
      const modifier = positiveModifiers[Math.floor(Math.random() * positiveModifiers.length)];
      text = `${text} ${modifier}`;
    } else if (sentiment === 'negative' && Math.random() < 0.3) {
      const modifier = negativeModifiers[Math.floor(Math.random() * negativeModifiers.length)];
      text = `${text} ${modifier}`;
    } else if (sentiment === 'neutral' && Math.random() < 0.2) {
      const modifier = neutralModifiers[Math.floor(Math.random() * neutralModifiers.length)];
      text = `${text} ${modifier}`;
    }
    
    return text;
  }

  /**
   * Calculate base engagement based on follower count and sentiment
   */
  private calculateBaseEngagement(followers: number, sentiment: string): number {
    const baseRate = followers < 10000 ? 0.03 : 
                    followers < 50000 ? 0.02 : 
                    followers < 100000 ? 0.015 : 0.01;
    
    const sentimentMultiplier = sentiment === 'positive' ? 1.3 : 
                               sentiment === 'negative' ? 0.7 : 1.0;
    
    return Math.floor(followers * baseRate * sentimentMultiplier);
  }

  /**
   * Generate realistic metrics with natural variations
   */
  private generateRealisticMetrics(baseEngagement: number) {
    const likes = baseEngagement + Math.floor(Math.random() * baseEngagement * 0.5);
    const retweets = Math.floor(likes * (0.1 + Math.random() * 0.2)); // 10-30% of likes
    const replies = Math.floor(likes * (0.05 + Math.random() * 0.15)); // 5-20% of likes
    const views = likes * (8 + Math.random() * 12); // 8-20x likes for views
    
    return {
      likes: Math.max(1, likes),
      retweets: Math.max(0, retweets),
      replies: Math.max(0, replies),
      views: Math.max(likes, Math.floor(views))
    };
  }

  /**
   * Generate realistic timestamp (last 7 days)
   */
  private generateRealisticTimestamp(): string {
    const now = Date.now();
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
    const randomTime = sevenDaysAgo + Math.random() * (now - sevenDaysAgo);
    return new Date(randomTime).toISOString();
  }

  /**
   * Generate random media (30% chance)
   */
  private generateRandomMedia(text: string) {
    if (Math.random() > 0.3) return [];
    
    const mediaTypes = ['photo', 'video', 'gif'];
    const type = mediaTypes[Math.floor(Math.random() * mediaTypes.length)];
    
    return [{
      type,
      url: `https://via.placeholder.com/400x300?text=${type.toUpperCase()}`,
      width: 400,
      height: 300
    }];
  }

  /**
   * Generate random mentions (20% chance)
   */
  private generateRandomMentions(): string[] {
    if (Math.random() > 0.2) return [];
    
    const mentions = ['@techreporter', '@airesearcher', '@innovationhub', '@startuplife'];
    const count = Math.floor(Math.random() * 2) + 1;
    return mentions.slice(0, count);
  }

  /**
   * Generate random URLs based on content (15% chance)
   */
  private generateRandomUrls(text: string): string[] {
    if (Math.random() > 0.15) return [];
    
    const urls = [
      'https://techcrunch.com/article',
      'https://github.com/project',
      'https://medium.com/@author/post',
      'https://research.org/paper'
    ];
    
    return [urls[Math.floor(Math.random() * urls.length)]];
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
  private async performScraping(twid: TwitterScraperInterface, query: string, options: ScrapingOptions): Promise<ScrapedTweetData[]> {
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
