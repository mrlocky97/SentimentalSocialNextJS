/**
 * Advanced Twitter Collection Manager with Web Scraping
 * Combines Twitter API with web scraping for unlimited tweet collection
 */

import TwitterScraperService from './twitter-scraper.service';
import TwitterCollectionManager from './twitter-collection.manager';
import { Tweet } from '../types/twitter';

interface HybridCollectionOptions {
  hashtag: string;
  maxTweets: number;
  useScrapingFirst?: boolean; // Use scraping as primary method
  fallbackToAPI?: boolean; // Fallback to API if scraping fails
  scrapingRatio?: number; // 0.8 = 80% scraping, 20% API
  
  // Scraping specific options
  includeReplies?: boolean;
  includeRetweets?: boolean;
  maxAgeHours?: number;
  minLikes?: number;
  minRetweets?: number;
  minFollowers?: number;
  prioritizeVerified?: boolean;
}

interface CollectionResult {
  tweets: Tweet[];
  totalCollected: number;
  scrapedCount: number;
  apiCount: number;
  method: 'scraping-only' | 'api-only' | 'hybrid';
  estimatedCost: number; // API calls used
  scrapingSuccess: boolean;
  apiSuccess: boolean;
  errors: string[];
  summary: {
    averageEngagement: number;
    verifiedUsers: number;
    hashtagVariations: string[];
    topEngagement: Tweet[];
    timeRange: {
      earliest: Date;
      latest: Date;
    };
  };
}

export class HybridTwitterCollectionManager {
  private scraperService: TwitterScraperService;
  private apiManager: TwitterCollectionManager;

  constructor() {
    this.scraperService = new TwitterScraperService({
      headless: true,
      delay: 2000, // 2 seconds between requests
      maxRetries: 3
    });
    this.apiManager = new TwitterCollectionManager();
  }

  /**
   * Collect tweets using hybrid approach (scraping + API)
   */
  async collectTweets(options: HybridCollectionOptions): Promise<CollectionResult> {
    console.log(`🚀 Starting hybrid collection for #${options.hashtag}`);
    console.log(`📊 Target: ${options.maxTweets} tweets`);
    
    const result: CollectionResult = {
      tweets: [],
      totalCollected: 0,
      scrapedCount: 0,
      apiCount: 0,
      method: 'scraping-only',
      estimatedCost: 0,
      scrapingSuccess: false,
      apiSuccess: false,
      errors: [],
      summary: {
        averageEngagement: 0,
        verifiedUsers: 0,
        hashtagVariations: [],
        topEngagement: [],
        timeRange: {
          earliest: new Date(),
          latest: new Date()
        }
      }
    };

    const scrapingRatio = options.scrapingRatio || 0.8; // Default 80% scraping
    const scrapingTarget = Math.floor(options.maxTweets * scrapingRatio);
    const apiTarget = options.maxTweets - scrapingTarget;

    console.log(`📈 Collection strategy:`);
    console.log(`   🕷️ Scraping target: ${scrapingTarget} tweets`);
    console.log(`   🔌 API target: ${apiTarget} tweets`);

    // Phase 1: Web Scraping (Primary method)
    if (options.useScrapingFirst !== false && scrapingTarget > 0) {
      console.log('\n🕷️ Phase 1: Web Scraping Collection...');
      try {
        const scrapingResult = await this.scraperService.scrapeByHashtag(options.hashtag, {
          maxTweets: scrapingTarget,
          includeReplies: options.includeReplies || false,
          includeRetweets: options.includeRetweets || true,
          maxAgeHours: options.maxAgeHours || 24,
          minLikes: options.minLikes || 0,
          minRetweets: options.minRetweets || 0
        });

        if (scrapingResult.tweets.length > 0) {
          result.tweets.push(...scrapingResult.tweets);
          result.scrapedCount = scrapingResult.tweets.length;
          result.scrapingSuccess = true;
          console.log(`✅ Scraping: Collected ${scrapingResult.tweets.length} tweets`);
        } else {
          result.errors.push('Scraping returned no tweets');
          console.log('⚠️ Scraping: No tweets collected');
        }

        if (scrapingResult.errors.length > 0) {
          result.errors.push(...scrapingResult.errors);
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown scraping error';
        result.errors.push(`Scraping error: ${errorMessage}`);
        console.error('❌ Scraping failed:', errorMessage);
      }
    }

    // Phase 2: Twitter API (Fallback or complement)
    const remainingTarget = options.maxTweets - result.tweets.length;
    if ((options.fallbackToAPI !== false && remainingTarget > 0) || options.useScrapingFirst === false) {
      console.log(`\n🔌 Phase 2: API Collection (${remainingTarget} tweets needed)...`);
      
      try {
        // Check API quota first
        const quotaStatus = await this.apiManager.getQuotaStatus();
        if (quotaStatus.remaining > 0 && remainingTarget > 0) {
          const apiResult = await this.apiManager.collectTweets({
            hashtag: options.hashtag,
            maxTweets: Math.min(remainingTarget, quotaStatus.remaining),
            prioritizeVerified: options.prioritizeVerified || true,
            minFollowers: options.minFollowers || 1000,
            minEngagement: 1,
            maxAgeHours: options.maxAgeHours || 24
          });

          if (apiResult.collected > 0) {
            // Note: We would need to get the actual tweets from the API result
            // For now, we'll just track the count
            result.apiCount = apiResult.collected;
            result.estimatedCost = apiResult.estimatedCost;
            result.apiSuccess = true;
            console.log(`✅ API: Collected ${apiResult.collected} tweets (Cost: ${apiResult.estimatedCost})`);
          } else {
            result.errors.push('API returned no tweets');
            console.log('⚠️ API: No tweets collected');
          }
        } else {
          result.errors.push('API quota exhausted or no tweets needed');
          console.log('⚠️ API quota exhausted or no additional tweets needed');
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown API error';
        result.errors.push(`API error: ${errorMessage}`);
        console.error('❌ API collection failed:', errorMessage);
      }
    }

    // Determine collection method
    if (result.scrapedCount > 0 && result.apiCount > 0) {
      result.method = 'hybrid';
    } else if (result.scrapedCount > 0) {
      result.method = 'scraping-only';
    } else if (result.apiCount > 0) {
      result.method = 'api-only';
    }

    result.totalCollected = result.tweets.length + result.apiCount;

    // Generate summary
    result.summary = this.generateSummary(result.tweets);

    console.log(`\n🎉 Collection completed:`);
    console.log(`   📥 Total collected: ${result.totalCollected} tweets`);
    console.log(`   🕷️ Scraped: ${result.scrapedCount} tweets`);
    console.log(`   🔌 API: ${result.apiCount} tweets`);
    console.log(`   💰 API cost: ${result.estimatedCost} calls`);
    console.log(`   🎯 Method: ${result.method}`);
    console.log(`   ❌ Errors: ${result.errors.length}`);

    return result;
  }

  /**
   * Get collection recommendations
   */
  async getCollectionRecommendations(hashtag: string) {
    console.log(`💡 Getting recommendations for #${hashtag}...`);

    // Get scraping rate limit status
    const scrapingStatus = this.scraperService.getRateLimitStatus();
    
    // Get API quota status
    const apiQuota = await this.apiManager.getQuotaStatus();

    const recommendations = {
      hashtag,
      recommendedMethod: 'hybrid' as 'scraping' | 'api' | 'hybrid',
      maxCollectable: 0,
      estimatedCost: 0,
      scrapingAvailable: !scrapingStatus.isLimited,
      apiAvailable: apiQuota.remaining > 0,
      strategies: [] as Array<{
        name: string;
        description: string;
        maxTweets: number;
        cost: number;
        pros: string[];
        cons: string[];
      }>
    };

    // Strategy 1: Pure Scraping (Unlimited but slower)
    if (!scrapingStatus.isLimited) {
      recommendations.strategies.push({
        name: 'Pure Web Scraping',
        description: 'Collect unlimited tweets using web scraping only',
        maxTweets: 10000, // Practically unlimited
        cost: 0,
        pros: [
          'Unlimited tweet collection',
          'No API costs',
          'Access to historical tweets',
          'More data points available'
        ],
        cons: [
          'Slower collection speed',
          'Risk of being rate limited',
          'May miss real-time tweets',
          'Requires maintenance if site changes'
        ]
      });
    }

    // Strategy 2: Pure API (Limited but reliable)
    if (apiQuota.remaining > 0) {
      recommendations.strategies.push({
        name: 'Pure Twitter API',
        description: 'Collect tweets using official Twitter API',
        maxTweets: apiQuota.remaining,
        cost: apiQuota.remaining,
        pros: [
          'Official and reliable',
          'Real-time data',
          'Consistent data format',
          'No blocking risk'
        ],
        cons: [
          `Limited to ${apiQuota.remaining} tweets this month`,
          'Costs API quota',
          'Only recent tweets (7 days)',
          'May miss historical context'
        ]
      });
    }

    // Strategy 3: Hybrid (Best of both worlds)
    if (!scrapingStatus.isLimited && apiQuota.remaining > 0) {
      const hybridMax = Math.min(5000, apiQuota.remaining * 10); // 10x more with scraping
      recommendations.strategies.push({
        name: 'Hybrid Collection (Recommended)',
        description: '80% web scraping + 20% API for optimal results',
        maxTweets: hybridMax,
        cost: Math.floor(hybridMax * 0.2), // Only 20% uses API
        pros: [
          'Large volume collection possible',
          'Reliable data mix',
          'Cost-effective API usage',
          'Real-time + historical data'
        ],
        cons: [
          'More complex setup',
          'Requires monitoring both methods',
          'Slightly slower than pure API'
        ]
      });

      recommendations.recommendedMethod = 'hybrid';
      recommendations.maxCollectable = hybridMax;
      recommendations.estimatedCost = Math.floor(hybridMax * 0.2);
    } else if (!scrapingStatus.isLimited) {
      recommendations.recommendedMethod = 'scraping';
      recommendations.maxCollectable = 10000;
      recommendations.estimatedCost = 0;
    } else if (apiQuota.remaining > 0) {
      recommendations.recommendedMethod = 'api';
      recommendations.maxCollectable = apiQuota.remaining;
      recommendations.estimatedCost = apiQuota.remaining;
    }

    return recommendations;
  }

  /**
   * Generate collection summary
   */
  private generateSummary(tweets: Tweet[]) {
    if (tweets.length === 0) {
      return {
        averageEngagement: 0,
        verifiedUsers: 0,
        hashtagVariations: [],
        topEngagement: [],
        timeRange: {
          earliest: new Date(),
          latest: new Date()
        }
      };
    }

    // Calculate average engagement
    const totalEngagement = tweets.reduce((sum, tweet) => {
      return sum + tweet.metrics.likes + tweet.metrics.retweets + tweet.metrics.replies;
    }, 0);
    const averageEngagement = Number((totalEngagement / tweets.length).toFixed(2));

    // Count verified users
    const verifiedUsers = tweets.filter(tweet => tweet.author.verified).length;

    // Collect hashtag variations
    const hashtagSet = new Set<string>();
    tweets.forEach(tweet => {
      tweet.hashtags.forEach(hashtag => hashtagSet.add(hashtag));
    });
    const hashtagVariations = Array.from(hashtagSet).slice(0, 10); // Top 10

    // Get top engagement tweets
    const sortedTweets = [...tweets].sort((a, b) => {
      const engagementA = a.metrics.likes + a.metrics.retweets + a.metrics.replies;
      const engagementB = b.metrics.likes + b.metrics.retweets + b.metrics.replies;
      return engagementB - engagementA;
    });
    const topEngagement = sortedTweets.slice(0, 5); // Top 5

    // Time range
    const timestamps = tweets.map(tweet => new Date(tweet.createdAt).getTime());
    const timeRange = {
      earliest: new Date(Math.min(...timestamps)),
      latest: new Date(Math.max(...timestamps))
    };

    return {
      averageEngagement,
      verifiedUsers,
      hashtagVariations,
      topEngagement,
      timeRange
    };
  }

  /**
   * Get system status
   */
  async getSystemStatus() {
    const scrapingStatus = this.scraperService.getRateLimitStatus();
    const apiQuota = await this.apiManager.getQuotaStatus();

    return {
      scraping: {
        available: !scrapingStatus.isLimited,
        remaining: scrapingStatus.remaining,
        resetTime: scrapingStatus.resetTime,
        requestCount: scrapingStatus.requestCount
      },
      api: {
        available: apiQuota.remaining > 0,
        remaining: apiQuota.remaining,
        used: apiQuota.used,
        resetDate: apiQuota.resetDate
      },
      recommendation: !scrapingStatus.isLimited ? 
        'Web scraping available - unlimited collection possible! 🚀' :
        apiQuota.remaining > 0 ? 
          `API available - ${apiQuota.remaining} tweets remaining this month` :
          'Both methods limited - please wait for reset'
    };
  }
}

export default HybridTwitterCollectionManager;
