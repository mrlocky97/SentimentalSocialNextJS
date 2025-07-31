/**
 * Campaign Auto-Optimization Service
 * Automatically adjusts campaign parameters based on performance
 */

import { Campaign, CampaignMetrics } from '../types/campaign';
import { Tweet } from '../types/twitter';

export interface OptimizationRecommendation {
  id: string;
  type: 'hashtag' | 'timing' | 'targeting' | 'content' | 'budget';
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  currentValue: any;
  suggestedValue: any;
  expectedImprovement: string;
  confidence: number; // 0-100%
  implementable: boolean;
}

export class CampaignOptimizationService {

  /**
   * Auto-optimize campaign hashtags based on performance
   */
  static optimizeHashtags(
    campaign: Campaign, 
    metrics: CampaignMetrics,
    trendingHashtags: { tag: string; volume: number; sentiment: number }[]
  ): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];

    // Find underperforming hashtags
    const underperformingHashtags = metrics.topHashtags.filter(hashtag => 
      hashtag.count < metrics.totalTweets * 0.05
    );

    if (underperformingHashtags.length > 0) {
      // Suggest trending alternatives
      const trendingAlternatives = trendingHashtags
        .filter(trending => 
          trending.sentiment > 0.3 && 
          !campaign.hashtags.includes(trending.tag)
        )
        .slice(0, 3);

      recommendations.push({
        id: 'replace-underperforming-hashtags',
        type: 'hashtag',
        priority: 'medium',
        title: 'Replace Underperforming Hashtags',
        description: `${underperformingHashtags.length} hashtags have low adoption. Consider replacing with trending alternatives.`,
        currentValue: underperformingHashtags.map(h => h.tag),
        suggestedValue: trendingAlternatives.map(h => h.tag),
        expectedImprovement: '25-40% increase in reach',
        confidence: 75,
        implementable: true
      });
    }

    return recommendations;
  }

  /**
   * Optimize posting times based on engagement patterns
   */
  static optimizeTimings(
    campaign: Campaign,
    metrics: CampaignMetrics
  ): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];

    // Find peak engagement hours
    const peakHours = metrics.hourlyDistribution
      .sort((a, b) => b.count - a.count)
      .slice(0, 4)
      .map(h => h.hour);

    const currentOptimalCoverage = this.calculateOptimalTimeCoverage(peakHours);
    
    if (currentOptimalCoverage < 70) {
      recommendations.push({
        id: 'optimize-posting-times',
        type: 'timing',
        priority: 'high',
        title: 'Optimize Content Posting Times',
        description: 'Data shows peak engagement at different hours than current posting schedule.',
        currentValue: 'Current posting schedule',
        suggestedValue: `Post at: ${peakHours.join(':00, ')}:00`,
        expectedImprovement: '30-50% increase in engagement',
        confidence: 85,
        implementable: true
      });
    }

    return recommendations;
  }

  /**
   * Geographic targeting optimization
   */
  static optimizeGeographicTargeting(
    campaign: Campaign,
    metrics: CampaignMetrics
  ): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];

    if (metrics.countryDistribution && metrics.countryDistribution.length > 0) {
      const topCountries = metrics.countryDistribution.slice(0, 3);
      const totalReach = topCountries.reduce((sum, country) => sum + country.count, 0);
      const reachPercentage = (totalReach / metrics.totalTweets) * 100;

      if (reachPercentage > 80) {
        recommendations.push({
          id: 'expand-geographic-reach',
          type: 'targeting',
          priority: 'medium',
          title: 'Expand Geographic Reach',
          description: `${reachPercentage.toFixed(1)}% of engagement comes from top 3 countries. Consider expanding to new markets.`,
          currentValue: topCountries.map(c => c.country),
          suggestedValue: 'Add 2-3 new target countries',
          expectedImprovement: '15-25% reach expansion',
          confidence: 70,
          implementable: true
        });
      }
    }

    return recommendations;
  }

  /**
   * Content strategy optimization
   */
  static optimizeContentStrategy(
    campaign: Campaign,
    metrics: CampaignMetrics,
    tweets: Tweet[]
  ): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];

    // Analyze content types performance
    const mediaContentTweets = tweets.filter(tweet => 
      tweet.mediaUrls && tweet.mediaUrls.length > 0
    );
    const textOnlyTweets = tweets.filter(tweet => 
      !tweet.mediaUrls || tweet.mediaUrls.length === 0
    );

    if (mediaContentTweets.length > 0 && textOnlyTweets.length > 0) {
      const mediaAvgEngagement = this.calculateAverageEngagement(mediaContentTweets);
      const textAvgEngagement = this.calculateAverageEngagement(textOnlyTweets);

      if (mediaAvgEngagement > textAvgEngagement * 1.5) {
        recommendations.push({
          id: 'increase-media-content',
          type: 'content',
          priority: 'high',
          title: 'Increase Visual Content',
          description: 'Media content performs 50% better than text-only posts.',
          currentValue: `${((mediaContentTweets.length / tweets.length) * 100).toFixed(1)}% media content`,
          suggestedValue: 'Increase to 70-80% media content',
          expectedImprovement: '40-60% engagement boost',
          confidence: 90,
          implementable: true
        });
      }
    }

    return recommendations;
  }

  /**
   * Generate comprehensive optimization report
   */
  static generateOptimizationReport(
    campaign: Campaign,
    metrics: CampaignMetrics,
    tweets: Tweet[],
    trendingData?: any
  ) {
    const allRecommendations = [
      ...this.optimizeHashtags(campaign, metrics, trendingData?.hashtags || []),
      ...this.optimizeTimings(campaign, metrics),
      ...this.optimizeGeographicTargeting(campaign, metrics),
      ...this.optimizeContentStrategy(campaign, metrics, tweets)
    ];

    // Sort by priority and confidence
    const sortedRecommendations = allRecommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      return b.confidence - a.confidence;
    });

    const implementableRecommendations = sortedRecommendations.filter(r => r.implementable);
    const potentialImpact = this.calculatePotentialImpact(implementableRecommendations);

    return {
      campaignId: campaign.id,
      campaignName: campaign.name,
      analysisDate: new Date(),
      currentPerformance: {
        sentimentScore: metrics.sentimentScore,
        engagementRate: metrics.avgEngagementRate,
        reach: metrics.uniqueUsers,
        volume: metrics.totalTweets
      },
      recommendations: sortedRecommendations,
      quickWins: implementableRecommendations.filter(r => r.priority === 'high').slice(0, 3),
      potentialImpact,
      nextReviewDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 1 week
    };
  }

  /**
   * Auto-implement safe optimizations
   */
  static autoImplementSafeOptimizations(
    campaign: Campaign,
    recommendations: OptimizationRecommendation[]
  ): string[] {
    const implemented: string[] = [];
    
    // Only auto-implement low-risk, high-confidence recommendations
    const safeRecommendations = recommendations.filter(r => 
      r.confidence > 80 && 
      r.implementable && 
      ['timing', 'hashtag'].includes(r.type)
    );

    safeRecommendations.forEach(recommendation => {
      // This would integrate with campaign update API
      console.log(`Auto-implementing: ${recommendation.title}`);
      implemented.push(recommendation.id);
    });

    return implemented;
  }

  // Helper methods
  private static calculateOptimalTimeCoverage(peakHours: number[]): number {
    // Simplified calculation
    return peakHours.length * 25; // Each peak hour covers ~25% of optimal time
  }

  private static calculateAverageEngagement(tweets: Tweet[]): number {
    if (tweets.length === 0) return 0;
    const totalEngagement = tweets.reduce((sum, tweet) => sum + tweet.metrics.engagement, 0);
    return totalEngagement / tweets.length;
  }

  private static calculatePotentialImpact(recommendations: OptimizationRecommendation[]): {
    estimatedEngagementIncrease: string;
    estimatedReachIncrease: string;
    estimatedSentimentImprovement: string;
    implementationEffort: 'low' | 'medium' | 'high';
  } {
    const highPriorityCount = recommendations.filter(r => r.priority === 'high').length;
    const mediumPriorityCount = recommendations.filter(r => r.priority === 'medium').length;

    let engagementIncrease = highPriorityCount * 30 + mediumPriorityCount * 15;
    let reachIncrease = highPriorityCount * 25 + mediumPriorityCount * 12;
    
    // Cap at realistic improvements
    engagementIncrease = Math.min(engagementIncrease, 100);
    reachIncrease = Math.min(reachIncrease, 80);

    const effort = recommendations.length > 5 ? 'high' : recommendations.length > 2 ? 'medium' : 'low';

    return {
      estimatedEngagementIncrease: `${engagementIncrease}%`,
      estimatedReachIncrease: `${reachIncrease}%`,
      estimatedSentimentImprovement: '10-20%',
      implementationEffort: effort
    };
  }
}
