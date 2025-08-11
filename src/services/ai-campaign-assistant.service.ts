/**
 * AI Campaign Assistant
 * Intelligent assistant that guides users through campaign optimization
 */

import { AssistantRecommendation, CampaignHealthScore } from '../types/campaign';

export class AICampaignAssistantService {
  /**
   * Generate personalized recommendations based on user behavior and campaign data
   */
  static generatePersonalizedRecommendations(
    user: { id: string; role: string; experience: string },
    campaign: any,
    metrics: any,
    userHistory: any[]
  ): AssistantRecommendation[] {
    const recommendations: AssistantRecommendation[] = [];

    // Onboarding recommendations for new users
    if (user.experience === 'beginner') {
      recommendations.push({
        id: 'beginner-hashtag-tip',
        type: 'learning_tip',
        urgency: 'low',
        title: '💡 Pro Tip: Hashtag Strategy',
        message:
          'Use 3-5 relevant hashtags per campaign. Too many can dilute your focus, too few limit your reach.',
        learnMore:
          'Research shows campaigns with 3-5 targeted hashtags perform 40% better than those with 10+ hashtags.',
        dismissible: true,
        showUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Show for 1 week
      });
    }

    // Performance-based recommendations
    if (metrics.sentimentScore < 0) {
      recommendations.push({
        id: 'negative-sentiment-action',
        type: 'quick_action',
        urgency: 'high',
        title: '⚠️ Negative Sentiment Alert',
        message:
          'Your campaign sentiment is trending negative. Take immediate action to prevent crisis.',
        actionButton: {
          text: 'View Negative Mentions',
          action: 'navigate_to_negative_tweets',
          parameters: { campaignId: campaign.id, sentiment: 'negative' },
        },
        dismissible: false,
      });
    }

    // Optimization opportunities
    if (!campaign.sentimentAnalysis) {
      recommendations.push({
        id: 'enable-sentiment-analysis',
        type: 'strategic_advice',
        urgency: 'medium',
        title: '📊 Unlock Deeper Insights',
        message: 'Enable sentiment analysis to understand how people really feel about your brand.',
        actionButton: {
          text: 'Enable Sentiment Analysis',
          action: 'update_campaign_settings',
          parameters: { campaignId: campaign.id, sentimentAnalysis: true },
        },
        dismissible: true,
      });
    }

    // Industry best practices
    recommendations.push({
      id: 'best-practice-timing',
      type: 'best_practice',
      urgency: 'low',
      title: '🕐 Optimal Posting Times',
      message:
        'Your audience is most active on weekdays between 9-11 AM and 2-4 PM. Schedule important updates during these windows.',
      learnMore: 'Based on analysis of similar campaigns in your industry.',
      dismissible: true,
    });

    return recommendations.sort((a, b) => {
      const urgencyOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return urgencyOrder[b.urgency] - urgencyOrder[a.urgency];
    });
  }

  /**
   * Calculate comprehensive campaign health score
   */
  static calculateCampaignHealth(campaign: any, metrics: any, tweets: any[]): CampaignHealthScore {
    let setupScore = 0;
    let performanceScore = 0;
    let optimizationScore = 0;
    let riskScore = 100; // Start high, deduct for risks

    const improvements: string[] = [];

    // Setup Score (25 points max)
    if (campaign.hashtags.length >= 3 && campaign.hashtags.length <= 7) {
      setupScore += 5;
    } else {
      improvements.push('Optimize hashtag count (3-7 recommended)');
    }

    if (campaign.description && campaign.description.length > 50) {
      setupScore += 5;
    } else {
      improvements.push('Add detailed campaign description');
    }

    if (campaign.sentimentAnalysis && campaign.emotionAnalysis) {
      setupScore += 10;
    } else {
      improvements.push('Enable comprehensive analysis features');
    }

    if (campaign.endDate) {
      setupScore += 5;
    } else {
      improvements.push('Set campaign end date for better tracking');
    }

    // Performance Score (25 points max)
    if (metrics.sentimentScore > 0.3) {
      performanceScore += 10;
    } else if (metrics.sentimentScore > 0) {
      performanceScore += 5;
    } else {
      improvements.push('Improve sentiment score through better content strategy');
    }

    if (metrics.avgEngagementRate > 0.03) {
      performanceScore += 10;
    } else if (metrics.avgEngagementRate > 0.01) {
      performanceScore += 5;
    } else {
      improvements.push('Increase engagement through interactive content');
    }

    if (metrics.totalTweets > 100) {
      performanceScore += 5;
    } else {
      improvements.push('Boost campaign visibility to increase mention volume');
    }

    // Optimization Score (25 points max)
    const hashtagPerformance = metrics.topHashtags[0]?.count / metrics.totalTweets;
    if (hashtagPerformance > 0.5) {
      optimizationScore += 10;
    } else if (hashtagPerformance > 0.2) {
      optimizationScore += 5;
    } else {
      improvements.push('Improve hashtag adoption rate');
    }

    if (metrics.hourlyDistribution.some((h: any) => h.count > metrics.totalTweets * 0.2)) {
      optimizationScore += 10;
    } else {
      improvements.push('Optimize content timing for peak engagement');
    }

    optimizationScore += 5; // Base optimization points

    // Risk Score (25 points max, deduct for risks)
    if (metrics.sentimentScore < -0.3) {
      riskScore -= 15;
      improvements.push('URGENT: Address negative sentiment crisis');
    }

    const negativeRatio = metrics.negativeCount / metrics.totalTweets;
    if (negativeRatio > 0.4) {
      riskScore -= 10;
      improvements.push('Monitor and respond to negative mentions');
    }

    riskScore = Math.max(0, Math.min(25, riskScore / 4)); // Scale to 25 points

    const overall = setupScore + performanceScore + optimizationScore + riskScore;

    let grade: CampaignHealthScore['grade'];
    if (overall >= 90) grade = 'A+';
    else if (overall >= 85) grade = 'A';
    else if (overall >= 80) grade = 'B+';
    else if (overall >= 75) grade = 'B';
    else if (overall >= 70) grade = 'C+';
    else if (overall >= 65) grade = 'C';
    else if (overall >= 60) grade = 'D';
    else grade = 'F';

    return {
      overall,
      breakdown: {
        setup: setupScore,
        performance: performanceScore,
        optimization: optimizationScore,
        risk: riskScore,
      },
      grade,
      improvements: improvements.slice(0, 5), // Top 5 improvements
    };
  }

  /**
   * Smart campaign setup wizard
   */
  static generateSmartCampaignSuggestions(userInput: {
    industry?: string;
    goal?: string;
    budget?: string;
    duration?: number;
    brandName?: string;
  }): {
    suggestedName: string;
    suggestedHashtags: string[];
    suggestedKeywords: string[];
    suggestedDuration: number;
    suggestedSettings: Record<string, any>;
    reasoning: string[];
  } {
    const { industry, goal, brandName, duration } = userInput;

    // Smart name generation
    const suggestedName = `${brandName || 'Brand'} ${goal || 'Monitoring'} - ${new Date().toLocaleDateString()}`;

    // Industry-specific hashtag suggestions
    const industryHashtags: Record<string, string[]> = {
      technology: ['#innovation', '#tech', '#digital', '#AI', '#software'],
      fashion: ['#fashion', '#style', '#trend', '#outfit', '#designer'],
      food: ['#foodie', '#recipe', '#restaurant', '#cooking', '#delicious'],
      fitness: ['#fitness', '#workout', '#health', '#gym', '#motivation'],
      travel: ['#travel', '#adventure', '#explore', '#vacation', '#wanderlust'],
    };

    const suggestedHashtags = [
      `#${brandName?.toLowerCase().replace(/\s+/g, '')}`,
      ...(industryHashtags[industry || 'technology'] || industryHashtags.technology).slice(0, 4),
    ];

    // Goal-specific keywords
    const goalKeywords: Record<string, string[]> = {
      'brand monitoring': ['brand perception', 'customer feedback', 'brand mentions'],
      'product launch': ['new product', 'launch event', 'innovation', 'available now'],
      'competitor analysis': ['competitor comparison', 'market analysis', 'alternative'],
      'crisis management': ['issue resolution', 'customer service', 'brand protection'],
    };

    const suggestedKeywords = [
      brandName || 'brand',
      ...(goalKeywords[goal || 'brand monitoring'] || goalKeywords['brand monitoring']),
    ];

    const suggestedDuration =
      duration || (goal === 'crisis management' ? 7 : goal === 'product launch' ? 14 : 30);

    const suggestedSettings = {
      sentimentAnalysis: true,
      emotionAnalysis: goal === 'brand monitoring' || goal === 'crisis management',
      influencerAnalysis: goal === 'product launch',
      maxTweets: goal === 'crisis management' ? 10000 : 50000,
      languages: ['en'],
      dataSources: ['twitter', 'instagram'],
    };

    const reasoning = [
      `Campaign duration set to ${suggestedDuration} days based on ${goal} best practices`,
      `Hashtags selected for ${industry} industry relevance and searchability`,
      'Sentiment analysis enabled for brand perception monitoring',
      `Settings optimized for ${goal} campaign objectives`,
    ];

    return {
      suggestedName,
      suggestedHashtags,
      suggestedKeywords,
      suggestedDuration,
      suggestedSettings,
      reasoning,
    };
  }

  /**
   * Contextual help system
   */
  static getContextualHelp(
    currentPage: string,
    userRole: string,
    userActions: string[]
  ): {
    tips: string[];
    shortcuts: Array<{ key: string; action: string }>;
    relatedHelp: Array<{ title: string; url: string }>;
  } {
    const helpContent = {
      dashboard: {
        tips: [
          'Use filters to focus on specific time periods or sentiment ranges',
          'Click on any chart element to drill down into detailed data',
          'Set up alerts to be notified of significant changes',
        ],
        shortcuts: [
          { key: 'Ctrl+F', action: 'Quick search campaigns' },
          { key: 'N', action: 'Create new campaign' },
          { key: 'R', action: 'Refresh data' },
        ],
      },
      campaigns: {
        tips: [
          'Use campaign templates to get started quickly',
          'Monitor your campaign health score regularly',
          'Set realistic goals and track progress daily',
        ],
        shortcuts: [
          { key: 'Ctrl+N', action: 'New campaign' },
          { key: 'Ctrl+E', action: 'Edit selected campaign' },
          { key: 'Space', action: 'Play/pause campaign' },
        ],
      },
    };

    const pageHelp = helpContent[currentPage as keyof typeof helpContent] || helpContent.dashboard;

    return {
      tips: pageHelp.tips,
      shortcuts: pageHelp.shortcuts,
      relatedHelp: [
        { title: 'Campaign Best Practices', url: '/help/campaigns' },
        { title: 'Understanding Sentiment Analysis', url: '/help/sentiment' },
        { title: 'Crisis Management Guide', url: '/help/crisis' },
      ],
    };
  }

  /**
   * Progressive onboarding system
   */
  static getOnboardingSteps(userProgress: {
    campaignsCreated: number;
    insightsViewed: number;
    reportsGenerated: number;
  }): Array<{
    id: string;
    title: string;
    description: string;
    completed: boolean;
    action: string;
    estimatedTime: string;
  }> {
    return [
      {
        id: 'create-first-campaign',
        title: 'Create Your First Campaign',
        description: 'Set up monitoring for your brand or product',
        completed: userProgress.campaignsCreated > 0,
        action: 'create_campaign',
        estimatedTime: '5 minutes',
      },
      {
        id: 'explore-insights',
        title: 'Explore Campaign Insights',
        description: 'Learn how to read sentiment analysis and engagement metrics',
        completed: userProgress.insightsViewed > 5,
        action: 'view_insights_tutorial',
        estimatedTime: '3 minutes',
      },
      {
        id: 'generate-report',
        title: 'Generate Your First Report',
        description: 'Create a comprehensive campaign performance report',
        completed: userProgress.reportsGenerated > 0,
        action: 'generate_report',
        estimatedTime: '2 minutes',
      },
      {
        id: 'set-up-alerts',
        title: 'Set Up Smart Alerts',
        description: 'Get notified when important events happen',
        completed: false, // This would check if user has alerts configured
        action: 'configure_alerts',
        estimatedTime: '3 minutes',
      },
    ];
  }
}
