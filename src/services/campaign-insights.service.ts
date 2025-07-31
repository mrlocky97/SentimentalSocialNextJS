/**
 * Real-time Campaign Insights Service
 * Provides intelligent insights and recommendations during campaign execution
 */

import { Campaign, CampaignMetrics } from '../types/campaign';
import { Tweet } from '../types/twitter';
import { WebhookNotificationService } from './webhook-notifications.service';
import { AdvancedPredictiveModelsService } from './advanced-predictive-models.service';

export interface CampaignInsight {
  id: string;
  type: 'opportunity' | 'warning' | 'success' | 'action_required';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  actionable: boolean;
  suggestedActions?: string[];
  data?: any;
  createdAt: Date;
}

export class CampaignInsightsService {

  /**
   * Generate real-time insights for a campaign WITH ML PREDICTIONS
   */
  static async generateInsightsWithML(
    campaign: Campaign, 
    metrics: CampaignMetrics, 
    recentTweets: Tweet[],
    organizationId: string
  ): Promise<CampaignInsight[]> {
    const insights: CampaignInsight[] = [];

    // 1. BASIC INSIGHTS (existing logic)
    const basicInsights = this.generateInsights(campaign, metrics, recentTweets);
    insights.push(...basicInsights);

    // 2. ML-POWERED PREDICTIONS
    
    // Sentiment Predictions
    const sentimentPrediction = AdvancedPredictiveModelsService.sentimentModel.predictNextHour(recentTweets);
    if (sentimentPrediction.confidence > 0.8 && sentimentPrediction.prediction.riskLevel === 'high') {
      insights.push({
        id: 'ml-sentiment-warning',
        type: 'warning',
        priority: 'high',
        title: '🤖 AI Prediction: Sentiment Risk Detected',
        message: `ML model predicts sentiment decline with ${(sentimentPrediction.confidence * 100).toFixed(1)}% confidence. ${sentimentPrediction.prediction.keyFactors[0]}`,
        actionable: true,
        suggestedActions: [
          'Prepare positive content strategy',
          'Monitor next 2 hours closely',
          'Ready crisis response team',
          'Review recent negative mentions'
        ],
        data: { 
          mlPrediction: sentimentPrediction,
          modelAccuracy: sentimentPrediction.accuracy 
        },
        createdAt: new Date()
      });
    }

    // Viral Content Predictions
    const viralPrediction = AdvancedPredictiveModelsService.viralModel.predictViralGrowth(recentTweets);
    if (viralPrediction.prediction.topCandidate && viralPrediction.prediction.topCandidate.viralProbability > 0.7) {
      insights.push({
        id: 'ml-viral-prediction',
        type: 'opportunity',
        priority: 'high',
        title: '🚀 AI Prediction: Viral Content Opportunity',
        message: `ML model identifies content with ${(viralPrediction.prediction.topCandidate.viralProbability * 100).toFixed(1)}% viral probability`,
        actionable: true,
        suggestedActions: [
          'Amplify this content immediately',
          'Prepare follow-up content',
          'Engage with the post author',
          'Monitor growth in next 6 hours'
        ],
        data: { 
          viralCandidate: viralPrediction.prediction.topCandidate,
          expectedPeak: viralPrediction.prediction.expectedViralPeak
        },
        createdAt: new Date()
      });
    }

    // Crisis Risk Assessment
    const crisisRisk = AdvancedPredictiveModelsService.crisisModel.calculateCrisisRisk(metrics, recentTweets);
    if (crisisRisk > 0.6) {
      const crisisTimeline = AdvancedPredictiveModelsService.crisisModel.predictCrisisTimeline([
        { severity: crisisRisk * 10, type: 'sentiment_decline' }
      ]);

      insights.push({
        id: 'ml-crisis-warning',
        type: 'action_required',
        priority: 'critical',
        title: '🚨 AI Crisis Alert: High Risk Detected',
        message: `ML model calculates ${(crisisRisk * 100).toFixed(1)}% crisis probability. Estimated escalation: ${crisisTimeline.prediction.timeToEscalation}`,
        actionable: true,
        suggestedActions: AdvancedPredictiveModelsService.crisisModel.generatePreventionActions(['negative_sentiment_spike', 'volume_spike']),
        data: { 
          crisisRisk,
          timeline: crisisTimeline,
          interventionWindows: crisisTimeline.prediction.interventionWindows
        },
        createdAt: new Date()
      });

      // SEND IMMEDIATE CRISIS ALERT
      await WebhookNotificationService.sendCrisisAlert(
        campaign,
        metrics.sentimentScore,
        recentTweets.filter(t => t.sentiment?.score && t.sentiment.score < -0.6),
        organizationId
      );
    }

    // Send high-priority insights via webhooks
    const highPriorityInsights = insights.filter(i => 
      i.priority === 'high' || i.priority === 'critical'
    );

    if (highPriorityInsights.length > 0) {
      await WebhookNotificationService.notifyInsights(campaign, highPriorityInsights, organizationId);
    }

    return insights.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Generate real-time insights for a campaign
   */
  static generateInsights(
    campaign: Campaign, 
    metrics: CampaignMetrics, 
    recentTweets: Tweet[]
  ): CampaignInsight[] {
    const insights: CampaignInsight[] = [];

    // 1. Sentiment Alert
    if (metrics.sentimentScore < -0.3) {
      insights.push({
        id: 'negative-sentiment-alert',
        type: 'warning',
        priority: 'high',
        title: 'High Negative Sentiment Detected',
        message: `Campaign sentiment is ${(metrics.sentimentScore * 100).toFixed(1)}%. This requires immediate attention.`,
        actionable: true,
        suggestedActions: [
          'Review recent negative tweets',
          'Prepare response strategy',
          'Escalate to PR team',
          'Consider pausing campaign'
        ],
        data: { sentimentScore: metrics.sentimentScore },
        createdAt: new Date()
      });
    }

    // 2. Viral Content Opportunity
    const highEngagementTweets = recentTweets.filter(tweet => 
      tweet.metrics && (tweet.metrics.likes + tweet.metrics.retweets) > 1000
    );
    if (highEngagementTweets.length > 0) {
      insights.push({
        id: 'viral-opportunity',
        type: 'opportunity',
        priority: 'high',
        title: 'Viral Content Detected',
        message: `${highEngagementTweets.length} tweets are gaining high engagement. Consider amplifying these.`,
        actionable: true,
        suggestedActions: [
          'Engage with viral tweets',
          'Create similar content',
          'Reach out to authors',
          'Share on company channels'
        ],
        data: { viralTweets: highEngagementTweets.length },
        createdAt: new Date()
      });
    }

    // 3. Influencer Detection
    const influencers = recentTweets.filter(tweet => 
      tweet.author.followersCount > 10000 && tweet.sentiment?.score && tweet.sentiment.score > 0.5
    );
    if (influencers.length > 0) {
      insights.push({
        id: 'influencer-opportunity',
        type: 'opportunity',
        priority: 'medium',
        title: 'Positive Influencer Mentions',
        message: `${influencers.length} influencers mentioned your brand positively. Great opportunity for partnerships.`,
        actionable: true,
        suggestedActions: [
          'Reach out to influencers',
          'Offer collaboration',
          'Send product samples',
          'Invite to events'
        ],
        data: { influencerCount: influencers.length },
        createdAt: new Date()
      });
    }

    // 4. Hashtag Performance
    const topHashtag = metrics.topHashtags[0];
    if (topHashtag && topHashtag.count < metrics.totalTweets * 0.1) {
      insights.push({
        id: 'hashtag-underperformance',
        type: 'warning',
        priority: 'medium',
        title: 'Low Hashtag Adoption',
        message: `Your main hashtag #${topHashtag.tag} appears in only ${((topHashtag.count / metrics.totalTweets) * 100).toFixed(1)}% of tweets.`,
        actionable: true,
        suggestedActions: [
          'Promote hashtag more actively',
          'Create hashtag challenges',
          'Incentivize hashtag use',
          'Simplify hashtag'
        ],
        data: { hashtagAdoption: topHashtag.count / metrics.totalTweets },
        createdAt: new Date()
      });
    }

    // 5. Peak Time Analysis
    const currentHour = new Date().getHours();
    const peakHours = metrics.hourlyDistribution
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(h => h.hour);
    
    if (!peakHours.includes(currentHour)) {
      insights.push({
        id: 'timing-optimization',
        type: 'opportunity',
        priority: 'low',
        title: 'Post Timing Optimization',
        message: `Peak engagement hours are ${peakHours.join(', ')}. Consider posting during these times.`,
        actionable: true,
        suggestedActions: [
          'Schedule posts for peak hours',
          'Adjust posting strategy',
          'Use scheduling tools',
          'Test different time zones'
        ],
        data: { peakHours },
        createdAt: new Date()
      });
    }

    // 6. Competitive Intelligence
    const competitorMentions = recentTweets.filter(tweet =>
      tweet.content.toLowerCase().includes('competitor') // This would be more sophisticated
    );
    if (competitorMentions.length > 0) {
      insights.push({
        id: 'competitive-intelligence',
        type: 'opportunity',
        priority: 'medium',
        title: 'Competitor Activity Detected',
        message: `${competitorMentions.length} mentions of competitors found. Monitor for opportunities.`,
        actionable: true,
        suggestedActions: [
          'Analyze competitor strategies',
          'Identify gaps in market',
          'Prepare counter-campaigns',
          'Engage in conversations'
        ],
        data: { competitorMentions: competitorMentions.length },
        createdAt: new Date()
      });
    }

    // 7. Geographic Insights
    if (metrics.countryDistribution && metrics.countryDistribution.length > 0) {
      const topCountry = metrics.countryDistribution[0];
      if (topCountry.percentage > 50) {
        insights.push({
          id: 'geographic-concentration',
          type: 'opportunity',
          priority: 'low',
          title: 'Geographic Concentration',
          message: `${topCountry.percentage}% of engagement comes from ${topCountry.country}. Consider localized content.`,
          actionable: true,
          suggestedActions: [
            'Create localized content',
            'Adjust posting times for timezone',
            'Partner with local influencers',
            'Run geo-targeted ads'
          ],
          data: { topCountry },
          createdAt: new Date()
        });
      }
    }

    return insights.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Generate weekly campaign summary
   */
  static generateWeeklySummary(campaign: Campaign, weeklyMetrics: CampaignMetrics): {
    summary: string;
    recommendations: string[];
    nextWeekGoals: string[];
  } {
    const sentimentTrend = weeklyMetrics.sentimentScore > 0 ? 'positive' : 'negative';
    const engagementRate = weeklyMetrics.avgEngagementRate || 0;
    
    const summary = `Week Summary for "${campaign.name}": 
    • ${weeklyMetrics.totalTweets.toLocaleString()} tweets collected
    • ${(weeklyMetrics.sentimentScore * 100).toFixed(1)}% sentiment score (${sentimentTrend})
    • ${(engagementRate * 100).toFixed(2)}% average engagement rate
    • ${weeklyMetrics.uniqueUsers.toLocaleString()} unique users reached`;

    const recommendations = [];
    const nextWeekGoals = [];

    if (weeklyMetrics.sentimentScore < 0) {
      recommendations.push('Focus on addressing negative sentiment sources');
      nextWeekGoals.push('Improve sentiment score by 20%');
    }

    if (engagementRate < 0.02) {
      recommendations.push('Increase content engagement through interactive posts');
      nextWeekGoals.push('Reach 3% engagement rate');
    }

    if (weeklyMetrics.totalTweets < campaign.maxTweets * 0.1) {
      recommendations.push('Boost hashtag visibility and campaign awareness');
      nextWeekGoals.push('Double tweet volume');
    }

    return { summary, recommendations, nextWeekGoals };
  }

  /**
   * Generate automated alerts based on thresholds
   */
  static checkAlerts(metrics: CampaignMetrics): CampaignInsight[] {
    const alerts: CampaignInsight[] = [];

    // Critical sentiment drop
    if (metrics.sentimentScore < -0.5) {
      alerts.push({
        id: 'critical-sentiment',
        type: 'action_required',
        priority: 'critical',
        title: 'CRITICAL: Severe Negative Sentiment',
        message: 'Campaign sentiment has dropped to critical levels. Immediate action required.',
        actionable: true,
        suggestedActions: [
          'Stop current campaign immediately',
          'Investigate root cause',
          'Prepare crisis communication',
          'Notify stakeholders'
        ],
        createdAt: new Date()
      });
    }

    // Unusual volume spike
    const avgDailyVolume = metrics.dailyVolume.reduce((sum, day) => sum + day.tweets, 0) / metrics.dailyVolume.length;
    const lastDayVolume = metrics.dailyVolume[metrics.dailyVolume.length - 1]?.tweets || 0;
    
    if (lastDayVolume > avgDailyVolume * 3) {
      alerts.push({
        id: 'volume-spike',
        type: 'warning',
        priority: 'high',
        title: 'Unusual Volume Spike Detected',
        message: `Tweet volume is ${Math.round(lastDayVolume / avgDailyVolume)}x higher than average. Investigate cause.`,
        actionable: true,
        suggestedActions: [
          'Check for viral content',
          'Monitor for crisis',
          'Verify data quality',
          'Adjust collection limits'
        ],
        data: { volumeMultiplier: lastDayVolume / avgDailyVolume },
        createdAt: new Date()
      });
    }

    return alerts;
  }
}
