export enum CampaignStatus {
  draft = "draft", // Campaign being created
  active = "active", // Currently collecting data
  paused = "paused", // Temporarily stopped
  completed = "completed", // Finished collecting
  archived = "archived", // Completed and archived
  deleted = "deleted",
}

export enum CampaignType {
  hashtag = "hashtag", // Hashtag-based campaign (#JustDoIt)
  keyword = "keyword", // Keyword-based campaign
  mention = "mention", // Mention-based campaign (@brand)
}

export enum DataSource {
  twitter = "twitter", // Twitter/X platform
  instagram = "instagram", // Instagram platform
  facebook = "facebook", // Facebook platform
  tiktok = "tiktok", // TikTok platform
  linkedin = "linkedin", // LinkedIn platform
}

export enum CampaignCategory {
  marketing = "marketing", // Marketing campaigns
  brandMonitoring = "brand-monitoring", // Brand monitoring campaigns
  competitorAnalysis = "competitor-analysis", // Competitor analysis campaigns
  crisisManagement = "crisis-management", // Crisis management campaigns
}

export enum CampaignRole {
  //'owner' | 'editor' | 'viewer';
  admin = "admin", // Full access
  manager = "manager", // Manage campaigns
  analyst = "analyst", // Analyze data
  onlyView = "onlyView", // View only access
  client = "client", // Client access with limited features
}

export enum AssistantRecommendationType {
  quickAction = "quick_action", // Quick actions for immediate impact
  strategicAdvice = "strategic_advice", // Long-term strategic advice
  learningTip = "learning_tip", // Tips for improving skills
  bestPractice = "best_practice", // Industry best practices
}

export enum AssistantRecommendationUrgency {
  low = "low", // Low urgency
  medium = "medium", // Medium urgency
  high = "high", // High urgency
  critical = "critical", // Critical urgency
}

export enum CampaignHealthScoreGrade {
  APlus = "A+", // Excellent
  A = "A", // Very Good
  BPlus = "B+", // Good
  B = "B", // Satisfactory
  CPlus = "C+", // Fair
  C = "C", // Needs Improvement
  D = "D", // Poor
  F = "F", // Fail
}
