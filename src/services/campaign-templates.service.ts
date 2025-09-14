/**
 * Campaign Templates Service
 * Pre-configured campaign templates for different use cases
 */

import { CampaignCategory } from "../enums/campaign.enum";
import { CampaignTemplate, CampaignType, DataSource } from "../types/campaign";

export class CampaignTemplatesService {
  // Default templates used for seeding and fallback
  private static defaultTemplates: CampaignTemplate[] = [
    {
      id: "brand-monitoring",
      name: "Brand Monitoring",
      description:
        "Monitor your brand mentions and sentiment across social media",
      type: "mention" as CampaignType,
      category: CampaignCategory.brandMonitoring,
      defaultDuration: 30,
      defaultMaxTweets: 50000,
      defaultDataSources: ["twitter", "instagram"] as DataSource[],
      defaultAnalysis: {
        sentiment: true,
        emotion: true,
        topics: false,
        influencer: true,
      },
      suggestedHashtags: ["#yourbrand"],
      suggestedKeywords: ["your brand name", "product name", "company"],
      suggestedLanguages: ["en", "es"],
      createdAt: new Date(),
      isActive: true,
    },
    {
      id: "product-launch",
      name: "Product Launch Analysis",
      description: "Analyze reception and sentiment around your product launch",
      type: "hashtag" as CampaignType,
      category: CampaignCategory.marketing,
      defaultDuration: 14,
      defaultMaxTweets: 25000,
      defaultDataSources: ["twitter", "instagram", "tiktok"] as DataSource[],
      defaultAnalysis: {
        sentiment: true,
        emotion: true,
        topics: true,
        influencer: true,
      },
      suggestedHashtags: ["#newproduct", "#launch", "#innovation"],
      suggestedKeywords: ["product name", "launch event", "available now"],
      suggestedLanguages: ["en"],
      createdAt: new Date(),
      isActive: true,
    },
    {
      id: "competitor-analysis",
      name: "Competitor Analysis",
      description: "Monitor competitor activity and market positioning",
      type: "competitor" as CampaignType,
      category: CampaignCategory.competitorAnalysis,
      defaultDuration: 60,
      defaultMaxTweets: 100000,
      defaultDataSources: ["twitter", "linkedin"] as DataSource[],
      defaultAnalysis: {
        sentiment: true,
        emotion: false,
        topics: true,
        influencer: true,
      },
      suggestedHashtags: ["#competitor1", "#competitor2"],
      suggestedKeywords: ["competitor name", "vs competitor", "alternative"],
      suggestedLanguages: ["en", "es"],
      createdAt: new Date(),
      isActive: true,
    },
    {
      id: "crisis-management",
      name: "Crisis Management",
      description: "Real-time monitoring during PR crises or negative events",
      type: "keyword" as CampaignType,
      category: CampaignCategory.crisisManagement,
      defaultDuration: 7,
      defaultMaxTweets: 10000,
      defaultDataSources: ["twitter"] as DataSource[],
      defaultAnalysis: {
        sentiment: true,
        emotion: true,
        topics: true,
        influencer: true,
      },
      suggestedHashtags: ["#crisis", "#issue"],
      suggestedKeywords: ["brand issue", "controversy", "problem"],
      suggestedLanguages: ["en", "es"],
      createdAt: new Date(),
      isActive: true,
    },
    {
      id: "campaign-performance",
      name: "Marketing Campaign Performance",
      description: "Track performance of specific marketing campaigns",
      type: "hashtag" as CampaignType,
      category: CampaignCategory.marketing,
      defaultDuration: 21,
      defaultMaxTweets: 75000,
      defaultDataSources: ["twitter", "instagram", "tiktok"] as DataSource[],
      defaultAnalysis: {
        sentiment: true,
        emotion: true,
        topics: true,
        influencer: true,
      },
      suggestedHashtags: ["#campaignname", "#promotion", "#sale"],
      suggestedKeywords: ["campaign slogan", "promotion code", "limited time"],
      suggestedLanguages: ["en", "es"],
      createdAt: new Date(),
      isActive: true,
    },
  ];

  /**
   * Get all available campaign templates (from in-memory defaults only)
   */
  static async getTemplates(): Promise<CampaignTemplate[]> {
    return this.defaultTemplates;
  }

  static async getTemplate(id: string): Promise<CampaignTemplate | null> {
    return this.defaultTemplates.find((t) => t.id === id) || null;
  }

  static async getTemplatesByCategory(
    category: string,
  ): Promise<CampaignTemplate[]> {
    return this.defaultTemplates.filter(
      (t) => t.category === (category as any),
    );
  }

  /**
   * Generate campaign config from template (async)
   */
  static async generateCampaignFromTemplate(
    templateId: string,
    customization: {
      name: string;
      hashtags?: string[];
      keywords?: string[];
      mentions?: string[];
      organizationId: string;
    },
  ) {
    const template = await this.getTemplate(templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + template.defaultDuration);

    return {
      name: customization.name,
      description: template.description,
      type: template.type,
      dataSources: template.defaultDataSources,
      hashtags: customization.hashtags || template.suggestedHashtags,
      keywords: customization.keywords || template.suggestedKeywords,
      mentions: customization.mentions || [],
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      timezone: "UTC",
      maxTweets: template.defaultMaxTweets,
      languages: template.suggestedLanguages,
      sentimentAnalysis: template.defaultAnalysis.sentiment,
      emotionAnalysis: template.defaultAnalysis.emotion,
      topicsAnalysis: template.defaultAnalysis.topics,
      influencerAnalysis: template.defaultAnalysis.influencer,
      organizationId: customization.organizationId,
    };
  }
}
