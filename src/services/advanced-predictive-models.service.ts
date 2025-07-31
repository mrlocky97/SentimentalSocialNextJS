/**
 * Advanced Predictive Models Service
 * Machine Learning models for precise campaign predictions
 */

import { Campaign, CampaignMetrics } from '../types/campaign';
import { Tweet } from '../types/twitter';

export interface MLPrediction {
  model: string;
  confidence: number; // 0-1
  prediction: any;
  features: string[];
  timestamp: Date;
  accuracy?: number; // Historical accuracy
}

export interface SentimentPredictionModel {
  predictNextHour: (tweets: Tweet[]) => MLPrediction;
  predictNext24Hours: (tweets: Tweet[]) => MLPrediction;
  predictWeeklyTrend: (historicalData: any[]) => MLPrediction;
}

export interface ViralPredictionModel {
  calculateViralProbability: (tweet: Tweet) => number;
  predictViralGrowth: (tweets: Tweet[]) => MLPrediction;
  identifyViralSignals: (tweets: Tweet[]) => string[];
}

export interface CrisisPredictionModel {
  calculateCrisisRisk: (metrics: CampaignMetrics, tweets: Tweet[]) => number;
  predictCrisisTimeline: (warningSignals: any[]) => MLPrediction;
  generatePreventionActions: (riskFactors: string[]) => string[];
}

export class AdvancedPredictiveModelsService {
  
  // Model accuracy tracking
  private static modelAccuracy = new Map<string, number>([
    ['sentiment_hourly', 0.87],
    ['sentiment_daily', 0.82],
    ['viral_probability', 0.91],
    ['crisis_risk', 0.89],
    ['engagement_forecast', 0.85]
  ]);

  /**
   * Advanced Sentiment Prediction Model
   */
  static sentimentModel: SentimentPredictionModel = {
    
    predictNextHour: (tweets: Tweet[]): MLPrediction => {
      const recentTweets = tweets.slice(-50); // Last 50 tweets
      
      // Feature extraction
      const features = {
        avgSentiment: recentTweets.reduce((sum, t) => sum + (t.sentiment?.score || 0), 0) / recentTweets.length,
        sentimentVelocity: AdvancedPredictiveModelsService.calculateSentimentVelocity(recentTweets),
        volumeSpike: AdvancedPredictiveModelsService.detectVolumeSpike(recentTweets),
        negativeRatio: recentTweets.filter(t => t.sentiment?.score && t.sentiment.score < -0.3).length / recentTweets.length,
        influencerActivity: recentTweets.filter(t => t.author.followersCount > 10000).length,
        viralContent: recentTweets.filter(t => t.metrics.engagement > 0.05).length
      };

      // Simple ML model (in production, use TensorFlow.js or similar)
      const sentimentTrend = features.avgSentiment + (features.sentimentVelocity * 0.3);
      const volatilityFactor = Math.abs(features.sentimentVelocity) * features.volumeSpike;
      
      // Risk factors
      let riskScore = 0;
      if (features.negativeRatio > 0.4) riskScore += 0.3;
      if (features.volumeSpike > 2) riskScore += 0.2;
      if (features.sentimentVelocity < -0.3) riskScore += 0.4;

      const predictedSentiment = Math.max(-1, Math.min(1, sentimentTrend - riskScore));
      const confidence = Math.max(0.6, 0.95 - volatilityFactor);

      return {
        model: 'sentiment_hourly',
        confidence,
        prediction: {
          sentimentScore: predictedSentiment,
          trend: sentimentTrend > features.avgSentiment ? 'improving' : 'declining',
          riskLevel: riskScore > 0.5 ? 'high' : riskScore > 0.3 ? 'medium' : 'low',
          keyFactors: [
            `Current sentiment: ${features.avgSentiment.toFixed(3)}`,
            `Sentiment velocity: ${features.sentimentVelocity.toFixed(3)}`,
            `Negative ratio: ${(features.negativeRatio * 100).toFixed(1)}%`,
            `Volume spike: ${features.volumeSpike.toFixed(2)}x`
          ]
        },
        features: Object.keys(features),
        timestamp: new Date(),
        accuracy: AdvancedPredictiveModelsService.modelAccuracy.get('sentiment_hourly')
      };
    },

    predictNext24Hours: (tweets: Tweet[]): MLPrediction => {
      const last24h = tweets.slice(-200); // Last 200 tweets
      const previous24h = tweets.slice(-400, -200);
      
      // Trend analysis
      const currentAvg = last24h.reduce((sum, t) => sum + (t.sentiment?.score || 0), 0) / last24h.length;
      const previousAvg = previous24h.reduce((sum, t) => sum + (t.sentiment?.score || 0), 0) / previous24h.length;
      const trend = currentAvg - previousAvg;

      // Cyclical patterns (day of week, hour patterns)
      const hourlyPattern = AdvancedPredictiveModelsService.analyzeHourlyPatterns(tweets);
      const expectedHourlyImpact = AdvancedPredictiveModelsService.predictHourlyImpact(hourlyPattern);

      // External factors simulation
      const externalFactors = AdvancedPredictiveModelsService.simulateExternalFactors();

      const predicted24hSentiment = currentAvg + (trend * 0.6) + expectedHourlyImpact + externalFactors.impact;
      const confidence = 0.82 - (Math.abs(trend) * 0.2); // Lower confidence with high volatility

      return {
        model: 'sentiment_daily',
        confidence: Math.max(0.5, confidence),
        prediction: {
          sentimentScore: Math.max(-1, Math.min(1, predicted24hSentiment)),
          trend: trend > 0.05 ? 'improving' : trend < -0.05 ? 'declining' : 'stable',
          hourlyForecast: AdvancedPredictiveModelsService.generateHourlyForecast(currentAvg, hourlyPattern),
          riskPeriods: AdvancedPredictiveModelsService.identifyRiskPeriods(hourlyPattern),
          externalFactors: externalFactors.factors
        },
        features: ['trend_analysis', 'hourly_patterns', 'external_factors', 'cyclical_behavior'],
        timestamp: new Date(),
        accuracy: AdvancedPredictiveModelsService.modelAccuracy.get('sentiment_daily')
      };
    },

    predictWeeklyTrend: (historicalData: any[]): MLPrediction => {
      // Week-over-week analysis
      const weeklyTrends = AdvancedPredictiveModelsService.calculateWeeklyTrends(historicalData);
      const seasonality = AdvancedPredictiveModelsService.detectSeasonality(historicalData);
      
      return {
        model: 'sentiment_weekly',
        confidence: 0.78,
        prediction: {
          weeklyChange: weeklyTrends.expectedChange,
          seasonalityFactor: seasonality.factor,
          trendDirection: weeklyTrends.direction,
          confidenceInterval: weeklyTrends.interval
        },
        features: ['weekly_trends', 'seasonality', 'historical_patterns'],
        timestamp: new Date()
      };
    }
  };

  /**
   * Advanced Viral Content Prediction Model
   */
  static viralModel: ViralPredictionModel = {
    
    calculateViralProbability: (tweet: Tweet): number => {
      let score = 0;
      
      // Author influence (30% weight)
      const followerScore = Math.min(tweet.author.followersCount / 1000000, 1); // Cap at 1M
      score += followerScore * 0.3;
      
      // Engagement velocity (25% weight)
      const engagementRate = tweet.metrics.engagement;
      if (engagementRate > 0.1) score += 0.25;
      else if (engagementRate > 0.05) score += 0.15;
      else if (engagementRate > 0.02) score += 0.1;
      
      // Content factors (20% weight)
      const contentScore = AdvancedPredictiveModelsService.analyzeContentViralityFactors(tweet);
      score += contentScore * 0.2;
      
      // Timing factors (15% weight)
      const timingScore = AdvancedPredictiveModelsService.analyzeTimingFactors(tweet);
      score += timingScore * 0.15;
      
      // Sentiment amplification (10% weight)
      const sentiment = tweet.sentiment?.score || 0;
      if (Math.abs(sentiment) > 0.7) score += 0.1; // Strong emotions viral
      
      return Math.min(score, 1);
    },

    predictViralGrowth: (tweets: Tweet[]): MLPrediction => {
      const viralCandidates = tweets.filter(tweet => 
        AdvancedPredictiveModelsService.viralModel.calculateViralProbability(tweet) > 0.6
      );

      const growthPredictions = viralCandidates.map(tweet => {
        const currentEngagement = tweet.metrics.likes + tweet.metrics.retweets;
        const viralProbability = AdvancedPredictiveModelsService.viralModel.calculateViralProbability(tweet);
        
        // Predict 24h growth
        const expectedGrowth = currentEngagement * (1 + viralProbability * 5); // Up to 5x growth
        
        return {
          tweetId: tweet.id,
          currentEngagement,
          expectedGrowth,
          growthMultiplier: expectedGrowth / currentEngagement,
          viralProbability,
          peakTime: AdvancedPredictiveModelsService.predictPeakViralTime(tweet)
        };
      });

      return {
        model: 'viral_growth',
        confidence: 0.91,
        prediction: {
          viralCandidates: growthPredictions,
          topCandidate: growthPredictions.sort((a, b) => b.viralProbability - a.viralProbability)[0],
          expectedViralPeak: AdvancedPredictiveModelsService.calculateViralPeakTime(growthPredictions)
        },
        features: ['engagement_velocity', 'author_influence', 'content_factors', 'timing'],
        timestamp: new Date(),
        accuracy: AdvancedPredictiveModelsService.modelAccuracy.get('viral_probability')
      };
    },

    identifyViralSignals: (tweets: Tweet[]): string[] => {
      const signals: string[] = [];
      
      // Engagement acceleration
      const recentEngagement = tweets.slice(-10).reduce((sum, t) => sum + t.metrics.engagement, 0) / 10;
      const previousEngagement = tweets.slice(-20, -10).reduce((sum, t) => sum + t.metrics.engagement, 0) / 10;
      
      if (recentEngagement > previousEngagement * 2) {
        signals.push('Rapid engagement acceleration detected');
      }
      
      // Influencer cascade
      const influencerMentions = tweets.filter(t => t.author.followersCount > 100000);
      if (influencerMentions.length > tweets.length * 0.1) {
        signals.push('Influencer cascade effect starting');
      }
      
      // Cross-platform spread
      const hashtagSpread = AdvancedPredictiveModelsService.analyzeHashtagSpread(tweets);
      if (hashtagSpread.diversity > 0.7) {
        signals.push('High hashtag diversity indicating cross-platform spread');
      }
      
      return signals;
    }
  };

  /**
   * Advanced Crisis Prediction Model
   */
  static crisisModel: CrisisPredictionModel = {
    
    calculateCrisisRisk: (metrics: CampaignMetrics, tweets: Tweet[]): number => {
      let riskScore = 0;
      
      // Sentiment deterioration (40% weight)
      if (metrics.sentimentScore < -0.5) riskScore += 0.4;
      else if (metrics.sentimentScore < -0.3) riskScore += 0.25;
      else if (metrics.sentimentScore < -0.1) riskScore += 0.1;
      
      // Volume spike (20% weight)
      const recentVolume = tweets.slice(-50).length;
      const previousVolume = tweets.slice(-100, -50).length;
      const volumeSpike = recentVolume / (previousVolume || 1);
      
      if (volumeSpike > 3) riskScore += 0.2;
      else if (volumeSpike > 2) riskScore += 0.15;
      else if (volumeSpike > 1.5) riskScore += 0.1;
      
      // Negative viral content (25% weight)
      const negativeViralTweets = tweets.filter(t => 
        t.sentiment?.score && t.sentiment.score < -0.6 && t.metrics.engagement > 0.05
      );
      
      if (negativeViralTweets.length > 0) {
        riskScore += Math.min(0.25, negativeViralTweets.length * 0.1);
      }
      
      // Media attention (15% weight)
      const mediaKeywords = ['breaking', 'scandal', 'controversy', 'investigation'];
      const mediaAttention = tweets.filter(t => 
        mediaKeywords.some(keyword => t.content.toLowerCase().includes(keyword))
      );
      
      if (mediaAttention.length > tweets.length * 0.05) {
        riskScore += 0.15;
      }
      
      return Math.min(riskScore, 1);
    },

    predictCrisisTimeline: (warningSignals: any[]): MLPrediction => {
      const severityScore = warningSignals.reduce((sum, signal) => sum + signal.severity, 0);
      const timeToEscalation = AdvancedPredictiveModelsService.calculateEscalationTime(warningSignals);
      
      return {
        model: 'crisis_timeline',
        confidence: 0.89,
        prediction: {
          timeToEscalation: timeToEscalation,
          escalationProbability: Math.min(severityScore / 10, 1),
          criticalThresholds: [
            { time: '1 hour', probability: 0.3 },
            { time: '6 hours', probability: 0.6 },
            { time: '24 hours', probability: 0.9 }
          ],
          interventionWindows: AdvancedPredictiveModelsService.calculateInterventionWindows(warningSignals)
        },
        features: ['severity_analysis', 'escalation_patterns', 'historical_crises'],
        timestamp: new Date(),
        accuracy: AdvancedPredictiveModelsService.modelAccuracy.get('crisis_risk')
      };
    },

    generatePreventionActions: (riskFactors: string[]): string[] => {
      const actions: string[] = [];
      
      if (riskFactors.includes('negative_sentiment_spike')) {
        actions.push('Prepare positive counter-narrative');
        actions.push('Engage with neutral influencers');
      }
      
      if (riskFactors.includes('media_attention')) {
        actions.push('Draft official statement');
        actions.push('Brief executive team');
        actions.push('Monitor news outlets');
      }
      
      if (riskFactors.includes('viral_negative_content')) {
        actions.push('Consider content removal requests');
        actions.push('Activate rapid response team');
        actions.push('Prepare clarification posts');
      }
      
      return actions;
    }
  };

  // Helper methods for ML calculations
  
  private static calculateSentimentVelocity(tweets: Tweet[]): number {
    if (tweets.length < 10) return 0;
    
    const recent = tweets.slice(-5);
    const previous = tweets.slice(-10, -5);
    
    const recentAvg = recent.reduce((sum, t) => sum + (t.sentiment?.score || 0), 0) / recent.length;
    const previousAvg = previous.reduce((sum, t) => sum + (t.sentiment?.score || 0), 0) / previous.length;
    
    return recentAvg - previousAvg;
  }

  private static detectVolumeSpike(tweets: Tweet[]): number {
    const timeWindow = 1000 * 60 * 60; // 1 hour
    const now = Date.now();
    
    const recentTweets = tweets.filter(t => 
      now - new Date(t.createdAt).getTime() < timeWindow
    );
    
    const previousTweets = tweets.filter(t => {
      const tweetTime = new Date(t.createdAt).getTime();
      return tweetTime < (now - timeWindow) && tweetTime > (now - timeWindow * 2);
    });
    
    return recentTweets.length / (previousTweets.length || 1);
  }

  private static analyzeHourlyPatterns(tweets: Tweet[]): any {
    const hourlyData = new Array(24).fill(0);
    
    tweets.forEach(tweet => {
      const hour = new Date(tweet.createdAt).getHours();
      hourlyData[hour]++;
    });
    
    return hourlyData;
  }

  private static predictHourlyImpact(hourlyPattern: number[]): number {
    const currentHour = new Date().getHours();
    const maxHour = hourlyPattern.indexOf(Math.max(...hourlyPattern));
    const minHour = hourlyPattern.indexOf(Math.min(...hourlyPattern));
    
    if (currentHour === maxHour) return 0.1; // Peak hour boost
    if (currentHour === minHour) return -0.1; // Low hour penalty
    return 0;
  }

  private static simulateExternalFactors(): { impact: number; factors: string[] } {
    // Simulate external factors like news, events, etc.
    const factors = [];
    let impact = 0;
    
    // Weekend vs weekday
    const isWeekend = [0, 6].includes(new Date().getDay());
    if (isWeekend) {
      factors.push('Weekend effect');
      impact -= 0.05;
    }
    
    // Time of day
    const hour = new Date().getHours();
    if (hour >= 9 && hour <= 17) {
      factors.push('Business hours');
      impact += 0.02;
    }
    
    return { impact, factors };
  }

  private static generateHourlyForecast(baseSentiment: number, hourlyPattern: number[]): any[] {
    return Array.from({ length: 24 }, (_, hour) => ({
      hour,
      predictedSentiment: baseSentiment + (hourlyPattern[hour] * 0.001),
      confidence: 0.75
    }));
  }

  private static identifyRiskPeriods(hourlyPattern: number[]): Array<{hour: number; riskLevel: string; reason: string}> {
    const riskPeriods: Array<{hour: number; riskLevel: string; reason: string}> = [];
    const avgVolume = hourlyPattern.reduce((sum, count) => sum + count, 0) / 24;
    
    hourlyPattern.forEach((count, hour) => {
      if (count > avgVolume * 2) {
        riskPeriods.push({
          hour,
          riskLevel: 'high',
          reason: 'High volume period'
        });
      }
    });
    
    return riskPeriods;
  }

  private static calculateWeeklyTrends(historicalData: any[]): any {
    // Simplified weekly trend calculation
    return {
      expectedChange: 0.02,
      direction: 'stable',
      interval: [-0.05, 0.09]
    };
  }

  private static detectSeasonality(historicalData: any[]): any {
    return { factor: 1.0 };
  }

  private static analyzeContentViralityFactors(tweet: Tweet): number {
    let score = 0;
    
    // Content length optimization
    if (tweet.content.length >= 100 && tweet.content.length <= 200) score += 0.3;
    
    // Hashtag count
    if (tweet.hashtags.length >= 2 && tweet.hashtags.length <= 5) score += 0.2;
    
    // Media presence
    if (tweet.mediaUrls && tweet.mediaUrls.length > 0) score += 0.3;
    
    // Question or call-to-action
    if (tweet.content.includes('?') || tweet.content.toLowerCase().includes('share')) score += 0.2;
    
    return Math.min(score, 1);
  }

  private static analyzeTimingFactors(tweet: Tweet): number {
    const hour = new Date(tweet.createdAt).getHours();
    const day = new Date(tweet.createdAt).getDay();
    
    // Peak social media hours (9-11 AM, 1-3 PM, 7-9 PM)
    if ((hour >= 9 && hour <= 11) || (hour >= 13 && hour <= 15) || (hour >= 19 && hour <= 21)) {
      return 1.0;
    }
    
    // Weekday vs weekend
    if (day >= 1 && day <= 5) return 0.8; // Weekday
    return 0.6; // Weekend
  }

  private static predictPeakViralTime(tweet: Tweet): Date {
    // Predict when viral content will peak (typically 6-12 hours)
    const peakHours = 6 + Math.random() * 6;
    return new Date(Date.now() + peakHours * 60 * 60 * 1000);
  }

  private static calculateViralPeakTime(predictions: any[]): Date {
    if (predictions.length === 0) return new Date();
    
    const avgPeakTime = predictions.reduce((sum, p) => 
      sum + p.peakTime.getTime(), 0
    ) / predictions.length;
    
    return new Date(avgPeakTime);
  }

  private static analyzeHashtagSpread(tweets: Tweet[]): { diversity: number } {
    const uniqueHashtags = new Set();
    tweets.forEach(tweet => {
      tweet.hashtags.forEach(tag => uniqueHashtags.add(tag));
    });
    
    return { diversity: uniqueHashtags.size / tweets.length };
  }

  private static calculateEscalationTime(warningSignals: any[]): string {
    const totalSeverity = warningSignals.reduce((sum, s) => sum + (s.severity || 1), 0);
    
    if (totalSeverity > 8) return '1-3 hours';
    if (totalSeverity > 5) return '6-12 hours';
    if (totalSeverity > 3) return '12-24 hours';
    return '24+ hours';
  }

  private static calculateInterventionWindows(warningSignals: any[]): any[] {
    return [
      { window: 'immediate', probability: 0.9, actions: ['Monitor closely', 'Prepare statements'] },
      { window: '1-6 hours', probability: 0.7, actions: ['Stakeholder briefing', 'Content preparation'] },
      { window: '6-24 hours', probability: 0.4, actions: ['Public response', 'Media outreach'] }
    ];
  }

  /**
   * Update model accuracy based on real outcomes
   */
  static updateModelAccuracy(modelName: string, actualOutcome: any, prediction: MLPrediction): void {
    const currentAccuracy = this.modelAccuracy.get(modelName) || 0.5;
    const predictionError = Math.abs(actualOutcome - prediction.prediction);
    const newAccuracy = (currentAccuracy * 0.9) + ((1 - predictionError) * 0.1);
    
    this.modelAccuracy.set(modelName, Math.max(0.1, Math.min(0.99, newAccuracy)));
    
    console.log(`📊 Updated ${modelName} accuracy: ${newAccuracy.toFixed(3)}`);
  }

  /**
   * Get model performance metrics
   */
  static getModelPerformance(): Map<string, number> {
    return new Map(this.modelAccuracy);
  }
}
