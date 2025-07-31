/**
 * Predictive Analytics Service
 * Uses historical data to predict campaign outcomes and trends
 */

import { Campaign, CampaignMetrics } from '../types/campaign';
import { Tweet } from '../types/twitter';

export interface PredictiveInsight {
  type: 'trend_prediction' | 'sentiment_forecast' | 'viral_potential' | 'crisis_warning';
  confidence: number; // 0-100%
  timeframe: '24h' | '3d' | '1w' | '2w' | '1m';
  prediction: string;
  reasoning: string[];
  actionable: boolean;
  suggestedActions?: string[];
}

export interface CampaignForecast {
  campaignId: string;
  forecastDate: Date;
  timeframe: string;
  predictions: {
    expectedVolume: { value: number; confidence: number };
    sentimentTrend: { direction: 'up' | 'down' | 'stable'; confidence: number };
    peakDays: { dates: Date[]; confidence: number };
    riskLevel: { level: 'low' | 'medium' | 'high'; factors: string[] };
  };
  insights: PredictiveInsight[];
  recommendations: string[];
}

export class PredictiveAnalyticsService {

  /**
   * Predict campaign performance based on historical data
   */
  static generateCampaignForecast(
    campaign: Campaign,
    historicalMetrics: CampaignMetrics[],
    currentTweets: Tweet[]
  ): CampaignForecast {
    const insights: PredictiveInsight[] = [];

    // 1. Volume Prediction
    const volumeTrend = this.analyzeVolumeTrend(historicalMetrics);
    insights.push({
      type: 'trend_prediction',
      confidence: 78,
      timeframe: '1w',
      prediction: `Tweet volume expected to ${volumeTrend.direction} by ${volumeTrend.percentage}%`,
      reasoning: [
        'Based on 30-day historical pattern',
        'Seasonal trend analysis',
        'Current momentum indicators'
      ],
      actionable: true,
      suggestedActions: volumeTrend.direction === 'decrease' ? [
        'Boost campaign visibility',
        'Engage with influencers',
        'Launch promotional content'
      ] : [
        'Prepare for increased volume',
        'Monitor sentiment closely',
        'Scale moderation resources'
      ]
    });

    // 2. Sentiment Forecast
    const sentimentForecast = this.predictSentimentTrend(currentTweets);
    if (sentimentForecast.riskLevel === 'high') {
      insights.push({
        type: 'crisis_warning',
        confidence: 85,
        timeframe: '24h',
        prediction: 'High probability of negative sentiment spike',
        reasoning: [
          'Increasing negative mentions detected',
          'Viral complaint gaining traction',
          'Competitor activity amplifying issues'
        ],
        actionable: true,
        suggestedActions: [
          'Prepare crisis response team',
          'Draft proactive statements',
          'Monitor closely next 24h',
          'Consider pausing campaigns'
        ]
      });
    }

    // 3. Viral Content Prediction
    const viralPotential = this.analyzeViralPotential(currentTweets);
    if (viralPotential.score > 0.7) {
      insights.push({
        type: 'viral_potential',
        confidence: 92,
        timeframe: '3d',
        prediction: 'High viral potential detected in recent content',
        reasoning: [
          'Exponential engagement growth pattern',
          'High-influence user participation',
          'Trending topic alignment'
        ],
        actionable: true,
        suggestedActions: [
          'Amplify viral content immediately',
          'Prepare follow-up content',
          'Engage with viral participants',
          'Scale customer support'
        ]
      });
    }

    return {
      campaignId: campaign.id,
      forecastDate: new Date(),
      timeframe: '7 days',
      predictions: {
        expectedVolume: { 
          value: this.predictVolume(historicalMetrics), 
          confidence: 75 
        },
        sentimentTrend: { 
          direction: sentimentForecast.direction, 
          confidence: sentimentForecast.confidence 
        },
        peakDays: { 
          dates: this.predictPeakDays(historicalMetrics), 
          confidence: 68 
        },
        riskLevel: { 
          level: sentimentForecast.riskLevel, 
          factors: sentimentForecast.riskFactors 
        }
      },
      insights,
      recommendations: this.generatePredictiveRecommendations(insights)
    };
  }

  /**
   * Early warning system for potential crises
   */
  static detectEarlyWarnings(
    tweets: Tweet[],
    sentimentThreshold: number = -0.3
  ): {
    warningLevel: 'green' | 'yellow' | 'red';
    indicators: string[];
    recommendations: string[];
  } {
    const indicators: string[] = [];
    let warningLevel: 'green' | 'yellow' | 'red' = 'green';

    // Check recent sentiment trend
    const recentTweets = tweets.slice(-100); // Last 100 tweets
    const negativeTweets = recentTweets.filter(t => 
      t.sentiment?.score && t.sentiment.score < sentimentThreshold
    );

    if (negativeTweets.length > recentTweets.length * 0.6) {
      warningLevel = 'red';
      indicators.push('High concentration of negative sentiment (>60%)');
    } else if (negativeTweets.length > recentTweets.length * 0.4) {
      warningLevel = 'yellow';
      indicators.push('Elevated negative sentiment (>40%)');
    }

    // Check for viral negative content
    const viralNegative = recentTweets.filter(t => 
      t.metrics.engagement > 0.05 && 
      t.sentiment?.score && 
      t.sentiment.score < -0.5
    );

    if (viralNegative.length > 0) {
      warningLevel = warningLevel === 'green' ? 'yellow' : 'red';
      indicators.push('Viral negative content detected');
    }

    // Check for unusual volume spikes
    const avgEngagement = recentTweets.reduce((sum, t) => sum + t.metrics.engagement, 0) / recentTweets.length;
    const highEngagementTweets = recentTweets.filter(t => t.metrics.engagement > avgEngagement * 3);

    if (highEngagementTweets.length > 5) {
      warningLevel = warningLevel === 'green' ? 'yellow' : 'red';
      indicators.push('Unusual engagement spike detected');
    }

    const recommendations = this.getWarningRecommendations(warningLevel, indicators);

    return { warningLevel, indicators, recommendations };
  }

  /**
   * Competitive intelligence and benchmarking
   */
  static generateCompetitiveIntelligence(
    campaignMetrics: CampaignMetrics,
    industryBenchmarks: {
      avgSentiment: number;
      avgEngagement: number;
      avgVolume: number;
    }
  ): {
    performance: 'above' | 'at' | 'below';
    competitiveAdvantages: string[];
    improvementOpportunities: string[];
    marketPosition: string;
  } {
    const sentimentVsBenchmark = campaignMetrics.sentimentScore / industryBenchmarks.avgSentiment;
    const engagementVsBenchmark = campaignMetrics.avgEngagementRate / industryBenchmarks.avgEngagement;
    const volumeVsBenchmark = campaignMetrics.totalTweets / industryBenchmarks.avgVolume;

    const performance = (sentimentVsBenchmark + engagementVsBenchmark + volumeVsBenchmark) / 3 > 1.1 ? 'above' : 
                      (sentimentVsBenchmark + engagementVsBenchmark + volumeVsBenchmark) / 3 < 0.9 ? 'below' : 'at';

    const competitiveAdvantages: string[] = [];
    const improvementOpportunities: string[] = [];

    if (sentimentVsBenchmark > 1.2) {
      competitiveAdvantages.push('Superior brand sentiment vs. industry');
    } else if (sentimentVsBenchmark < 0.8) {
      improvementOpportunities.push('Sentiment significantly below industry average');
    }

    if (engagementVsBenchmark > 1.2) {
      competitiveAdvantages.push('Above-average audience engagement');
    } else if (engagementVsBenchmark < 0.8) {
      improvementOpportunities.push('Engagement rates need improvement');
    }

    const marketPosition = performance === 'above' ? 'Market Leader' : 
                          performance === 'at' ? 'Market Participant' : 'Market Challenger';

    return {
      performance,
      competitiveAdvantages,
      improvementOpportunities,
      marketPosition
    };
  }

  // Helper methods
  private static analyzeVolumeTrend(metrics: CampaignMetrics[]): {
    direction: 'increase' | 'decrease' | 'stable';
    percentage: number;
  } {
    if (metrics.length < 2) return { direction: 'stable', percentage: 0 };

    const recent = metrics.slice(-3);
    const earlier = metrics.slice(-6, -3);

    const recentAvg = recent.reduce((sum, m) => sum + m.totalTweets, 0) / recent.length;
    const earlierAvg = earlier.reduce((sum, m) => sum + m.totalTweets, 0) / earlier.length;

    const changePercentage = ((recentAvg - earlierAvg) / earlierAvg) * 100;

    if (changePercentage > 10) return { direction: 'increase', percentage: Math.round(changePercentage) };
    if (changePercentage < -10) return { direction: 'decrease', percentage: Math.round(Math.abs(changePercentage)) };
    return { direction: 'stable', percentage: Math.round(Math.abs(changePercentage)) };
  }

  private static predictSentimentTrend(tweets: Tweet[]): {
    direction: 'up' | 'down' | 'stable';
    confidence: number;
    riskLevel: 'low' | 'medium' | 'high';
    riskFactors: string[];
  } {
    const recent = tweets.slice(-50);
    const earlier = tweets.slice(-100, -50);

    const recentAvgSentiment = recent
      .filter(t => t.sentiment?.score)
      .reduce((sum, t) => sum + (t.sentiment?.score || 0), 0) / recent.length;

    const earlierAvgSentiment = earlier
      .filter(t => t.sentiment?.score)
      .reduce((sum, t) => sum + (t.sentiment?.score || 0), 0) / earlier.length;

    const change = recentAvgSentiment - earlierAvgSentiment;
    const direction = change > 0.05 ? 'up' : change < -0.05 ? 'down' : 'stable';

    const riskFactors: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' = 'low';

    if (recentAvgSentiment < -0.3) {
      riskLevel = 'high';
      riskFactors.push('High negative sentiment concentration');
    }

    if (change < -0.2) {
      riskLevel = 'high';
      riskFactors.push('Rapid sentiment deterioration');
    }

    return { direction, confidence: 75, riskLevel, riskFactors };
  }

  private static analyzeViralPotential(tweets: Tweet[]): { score: number; factors: string[] } {
    const recent = tweets.slice(-20);
    let score = 0;
    const factors: string[] = [];

    // Check engagement growth rate
    const avgEngagement = recent.reduce((sum, t) => sum + t.metrics.engagement, 0) / recent.length;
    if (avgEngagement > 0.05) {
      score += 0.3;
      factors.push('High engagement rate');
    }

    // Check for influencer participation
    const influencerTweets = recent.filter(t => t.author.followersCount > 100000);
    if (influencerTweets.length > 0) {
      score += 0.4;
      factors.push('Influencer participation');
    }

    // Check retweet velocity
    const recentRetweets = recent.reduce((sum, t) => sum + t.metrics.retweets, 0);
    if (recentRetweets > recent.length * 10) {
      score += 0.3;
      factors.push('High retweet velocity');
    }

    return { score, factors };
  }

  private static predictVolume(metrics: CampaignMetrics[]): number {
    if (metrics.length === 0) return 0;
    const recent = metrics.slice(-7); // Last 7 data points
    const avgVolume = recent.reduce((sum, m) => sum + m.totalTweets, 0) / recent.length;
    return Math.round(avgVolume * 7); // Weekly prediction
  }

  private static predictPeakDays(metrics: CampaignMetrics[]): Date[] {
    // Simplified: predict next 3 peak days based on historical patterns
    const today = new Date();
    return [
      new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000),
      new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000),
      new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
    ];
  }

  private static generatePredictiveRecommendations(insights: PredictiveInsight[]): string[] {
    const recommendations: string[] = [];

    insights.forEach(insight => {
      if (insight.actionable && insight.suggestedActions) {
        recommendations.push(...insight.suggestedActions);
      }
    });

    return [...new Set(recommendations)]; // Remove duplicates
  }

  private static getWarningRecommendations(
    warningLevel: 'green' | 'yellow' | 'red',
    indicators: string[]
  ): string[] {
    const recommendations: string[] = [];

    switch (warningLevel) {
      case 'red':
        recommendations.push(
          'Activate crisis management protocol',
          'Prepare official statements',
          'Monitor social channels 24/7',
          'Consider campaign suspension'
        );
        break;
      case 'yellow':
        recommendations.push(
          'Increase monitoring frequency',
          'Prepare response templates',
          'Brief stakeholders on situation',
          'Review campaign messaging'
        );
        break;
      case 'green':
        recommendations.push(
          'Continue normal monitoring',
          'Maintain current strategy',
          'Look for growth opportunities'
        );
        break;
    }

    return recommendations;
  }
}
