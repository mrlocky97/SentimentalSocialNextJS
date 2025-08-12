export enum Language {
  ENGLISH = 'en',
  SPANISH = 'es',
  FRENCH = 'fr',
  GERMAN = 'de',
  UNKNOWN = 'unknown',
}

export enum EntityType {
  UNKNOWN = 'UNKNOWN',
  PERSON = 'PERSON',
  LOCATION = 'LOCATION',
  ORGANIZATION = 'ORGANIZATION',
  EVENT = 'EVENT',
  WORK_OF_ART = 'WORK_OF_ART',
  CONSUMER_GOOD = 'CONSUMER_GOOD',
  OTHER = 'OTHER',
}

export enum ImpactLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum InsightType {
  BRAND_PERCEPTION = 'brand_perception',
  COMPETITOR_ANALYSIS = 'competitor_analysis',
  TREND_IDENTIFICATION = 'trend_identification',
  CUSTOMER_FEEDBACK = 'customer_feedback',
  INFLUENCER_IMPACT = 'influencer_impact',
  CAMPAIGN_PERFORMANCE = 'campaign_performance',
}

export enum Method {
  'naive' = 'naive',
  'rule' = 'rule',
  'ml' = 'ml',
  'advanced' = 'advanced',
  'hybrid' = 'hybrid',
}

export enum Label {
  VERY_POSITIVE = 'very_positive',
  POSITIVE = 'positive',
  NEUTRAL = 'neutral',
  NEGATIVE = 'negative',
  VERY_NEGATIVE = 'very_negative',
}
