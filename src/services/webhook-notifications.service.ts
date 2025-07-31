/**
 * Webhook Notification Service
 * Real-time notifications for campaign events and alerts
 */

import { Campaign, CampaignMetrics } from '../types/campaign';
import { CampaignInsight } from './campaign-insights.service';
import { Tweet } from '../types/twitter';

export interface WebhookPayload {
  eventType: 'campaign_alert' | 'sentiment_warning' | 'viral_opportunity' | 'crisis_detected' | 'influencer_mention';
  timestamp: Date;
  campaignId: string;
  campaignName: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  data: any;
  actionRequired?: boolean;
  suggestedActions?: string[];
}

export interface NotificationChannel {
  id: string;
  type: 'webhook' | 'slack' | 'teams' | 'email' | 'sms';
  endpoint: string;
  enabled: boolean;
  events: string[];
  credentials?: Record<string, any>;
}

export class WebhookNotificationService {
  private static channels: Map<string, NotificationChannel[]> = new Map();

  /**
   * Register notification channels for an organization
   */
  static registerChannels(organizationId: string, channels: NotificationChannel[]) {
    this.channels.set(organizationId, channels);
  }

  /**
   * Send real-time notifications for campaign insights
   */
  static async notifyInsights(
    campaign: Campaign,
    insights: CampaignInsight[],
    organizationId: string
  ): Promise<void> {
    const channels = this.channels.get(organizationId) || [];
    
    for (const insight of insights) {
      if (insight.priority === 'high' || insight.priority === 'critical') {
        const payload: WebhookPayload = {
          eventType: this.mapInsightToEventType(insight.type),
          timestamp: new Date(),
          campaignId: campaign.id,
          campaignName: campaign.name,
          severity: insight.priority,
          data: {
            insight: {
              id: insight.id,
              title: insight.title,
              message: insight.message,
              type: insight.type
            },
            campaignData: {
              hashtags: campaign.hashtags,
              status: campaign.status,
              startDate: campaign.startDate
            }
          },
          actionRequired: insight.actionable,
          suggestedActions: insight.suggestedActions
        };

        await this.sendToChannels(channels, payload, insight.type);
      }
    }
  }

  /**
   * Send crisis alerts immediately
   */
  static async sendCrisisAlert(
    campaign: Campaign,
    sentimentScore: number,
    criticalTweets: Tweet[],
    organizationId: string
  ): Promise<void> {
    const channels = this.channels.get(organizationId) || [];
    
    const payload: WebhookPayload = {
      eventType: 'crisis_detected',
      timestamp: new Date(),
      campaignId: campaign.id,
      campaignName: campaign.name,
      severity: 'critical',
      data: {
        sentimentScore,
        criticalTweetsCount: criticalTweets.length,
        criticalTweets: criticalTweets.slice(0, 3).map(tweet => ({
          id: tweet.id,
          content: tweet.content,
          author: tweet.author.username,
          sentiment: tweet.sentiment?.score,
          engagement: tweet.metrics.likes + tweet.metrics.retweets
        })),
        timeline: new Date().toISOString()
      },
      actionRequired: true,
      suggestedActions: [
        'Activate crisis management protocol',
        'Prepare official response',
        'Monitor social channels continuously',
        'Alert executive team'
      ]
    };

    // Send to all enabled crisis channels
    const crisisChannels = channels.filter(ch => 
      ch.enabled && ch.events.includes('crisis_detected')
    );

    await Promise.all(
      crisisChannels.map(channel => this.sendNotification(channel, payload))
    );

    // Log critical alert
    console.error(`🚨 CRISIS ALERT: ${campaign.name} - Sentiment: ${sentimentScore}`);
  }

  /**
   * Send viral content opportunities
   */
  static async sendViralOpportunity(
    campaign: Campaign,
    viralTweets: Tweet[],
    organizationId: string
  ): Promise<void> {
    const channels = this.channels.get(organizationId) || [];
    
    const payload: WebhookPayload = {
      eventType: 'viral_opportunity',
      timestamp: new Date(),
      campaignId: campaign.id,
      campaignName: campaign.name,
      severity: 'high',
      data: {
        viralTweetsCount: viralTweets.length,
        totalEngagement: viralTweets.reduce((sum, t) => 
          sum + t.metrics.likes + t.metrics.retweets, 0
        ),
        topViralTweet: viralTweets[0] ? {
          id: viralTweets[0].id,
          content: viralTweets[0].content,
          author: viralTweets[0].author.username,
          engagement: viralTweets[0].metrics.likes + viralTweets[0].metrics.retweets,
          potentialReach: viralTweets[0].author.followersCount
        } : null
      },
      actionRequired: true,
      suggestedActions: [
        'Engage with viral content immediately',
        'Amplify through official channels',
        'Reach out to viral content creators',
        'Prepare follow-up content strategy'
      ]
    };

    await this.sendToChannels(channels, payload, 'viral_opportunity');
  }

  /**
   * Send notifications to configured channels
   */
  private static async sendToChannels(
    channels: NotificationChannel[],
    payload: WebhookPayload,
    eventType: string
  ): Promise<void> {
    const relevantChannels = channels.filter(ch => 
      ch.enabled && ch.events.includes(eventType)
    );

    await Promise.all(
      relevantChannels.map(channel => this.sendNotification(channel, payload))
    );
  }

  /**
   * Send notification to specific channel
   */
  private static async sendNotification(
    channel: NotificationChannel,
    payload: WebhookPayload
  ): Promise<void> {
    try {
      switch (channel.type) {
        case 'webhook':
          await this.sendWebhook(channel.endpoint, payload);
          break;
        case 'slack':
          await this.sendSlackNotification(channel, payload);
          break;
        case 'teams':
          await this.sendTeamsNotification(channel, payload);
          break;
        case 'email':
          await this.sendEmailNotification(channel, payload);
          break;
        case 'sms':
          await this.sendSMSNotification(channel, payload);
          break;
      }
    } catch (error) {
      console.error(`Failed to send notification to ${channel.type}:`, error);
    }
  }

  /**
   * Send generic webhook
   */
  private static async sendWebhook(endpoint: string, payload: WebhookPayload): Promise<void> {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Source': 'SentimentalSocial',
        'X-Webhook-Event': payload.eventType
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
    }
  }

  /**
   * Send Slack notification
   */
  private static async sendSlackNotification(
    channel: NotificationChannel,
    payload: WebhookPayload
  ): Promise<void> {
    const slackPayload = {
      text: this.formatSlackMessage(payload),
      attachments: [{
        color: this.getSeverityColor(payload.severity),
        fields: [
          {
            title: 'Campaign',
            value: payload.campaignName,
            short: true
          },
          {
            title: 'Severity',
            value: payload.severity.toUpperCase(),
            short: true
          },
          {
            title: 'Event Type',
            value: payload.eventType.replace('_', ' ').toUpperCase(),
            short: true
          }
        ],
        footer: 'SentimentalSocial',
        ts: Math.floor(payload.timestamp.getTime() / 1000)
      }]
    };

    await this.sendWebhook(channel.endpoint, slackPayload as any);
  }

  /**
   * Send Microsoft Teams notification
   */
  private static async sendTeamsNotification(
    channel: NotificationChannel,
    payload: WebhookPayload
  ): Promise<void> {
    const teamsPayload = {
      '@type': 'MessageCard',
      '@context': 'https://schema.org/extensions',
      summary: payload.data.insight?.title || 'Campaign Alert',
      themeColor: this.getSeverityColor(payload.severity),
      sections: [{
        activityTitle: payload.data.insight?.title || 'Campaign Alert',
        activitySubtitle: `Campaign: ${payload.campaignName}`,
        activityText: payload.data.insight?.message || 'No message provided',
        facts: [
          {
            name: 'Severity',
            value: payload.severity.toUpperCase()
          },
          {
            name: 'Event Type',
            value: payload.eventType.replace('_', ' ').toUpperCase()
          },
          {
            name: 'Timestamp',
            value: payload.timestamp.toISOString()
          }
        ]
      }]
    };

    await this.sendWebhook(channel.endpoint, teamsPayload as any);
  }

  /**
   * Send email notification
   */
  private static async sendEmailNotification(
    channel: NotificationChannel,
    payload: WebhookPayload
  ): Promise<void> {
    // This would integrate with your email service (SendGrid, etc.)
    console.log(`📧 Email notification would be sent to ${channel.endpoint}`);
    console.log(`Subject: ${payload.severity.toUpperCase()} Alert - ${payload.campaignName}`);
    console.log(`Body: ${payload.data.insight?.message}`);
  }

  /**
   * Send SMS notification
   */
  private static async sendSMSNotification(
    channel: NotificationChannel,
    payload: WebhookPayload
  ): Promise<void> {
    // This would integrate with your SMS service (Twilio, etc.)
    console.log(`📱 SMS notification would be sent to ${channel.endpoint}`);
    console.log(`Message: ${payload.severity.toUpperCase()}: ${payload.data.insight?.title} - ${payload.campaignName}`);
  }

  /**
   * Format message for Slack
   */
  private static formatSlackMessage(payload: WebhookPayload): string {
    const emoji = this.getSeverityEmoji(payload.severity);
    return `${emoji} *${payload.data.insight?.title}* - ${payload.campaignName}\n${payload.data.insight?.message}`;
  }

  /**
   * Get color for severity level
   */
  private static getSeverityColor(severity: string): string {
    switch (severity) {
      case 'critical': return '#FF0000';
      case 'high': return '#FF6600';
      case 'medium': return '#FFAA00';
      case 'low': return '#00AA00';
      default: return '#808080';
    }
  }

  /**
   * Get emoji for severity level
   */
  private static getSeverityEmoji(severity: string): string {
    switch (severity) {
      case 'critical': return '🚨';
      case 'high': return '⚠️';
      case 'medium': return '🔔';
      case 'low': return 'ℹ️';
      default: return '📢';
    }
  }

  /**
   * Map insight type to event type
   */
  private static mapInsightToEventType(insightType: string): WebhookPayload['eventType'] {
    switch (insightType) {
      case 'warning': return 'sentiment_warning';
      case 'opportunity': return 'viral_opportunity';
      case 'action_required': return 'crisis_detected';
      default: return 'campaign_alert';
    }
  }

  /**
   * Test webhook endpoint
   */
  static async testWebhook(channel: NotificationChannel): Promise<boolean> {
    const testPayload: WebhookPayload = {
      eventType: 'campaign_alert',
      timestamp: new Date(),
      campaignId: 'test-campaign',
      campaignName: 'Test Campaign',
      severity: 'low',
      data: {
        insight: {
          title: 'Webhook Test',
          message: 'This is a test notification from SentimentalSocial'
        }
      }
    };

    try {
      await this.sendNotification(channel, testPayload);
      return true;
    } catch (error) {
      console.error('Webhook test failed:', error);
      return false;
    }
  }

  /**
   * Send optimization results notification
   */
  static async notifyOptimizationResults(
    campaign: Campaign,
    optimizations: string[],
    improvements: Record<string, number>,
    organizationId: string
  ): Promise<void> {
    const channels = this.channels.get(organizationId) || [];
    
    const payload: WebhookPayload = {
      eventType: 'campaign_alert',
      timestamp: new Date(),
      campaignId: campaign.id,
      campaignName: campaign.name,
      severity: 'low',
      data: {
        optimizations,
        improvements,
        totalImprovementEstimate: Object.values(improvements).reduce((sum, val) => sum + val, 0),
        message: `Auto-optimization completed: ${optimizations.length} improvements applied`
      }
    };

    await this.sendToChannels(channels, payload, 'Optimization completed successfully');
  }
}
