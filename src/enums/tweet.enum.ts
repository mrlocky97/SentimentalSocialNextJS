export enum TweetCollectionJobStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  PAUSED = 'paused',
  CANCELLED = 'cancelled',
}

export enum TwitterRateLimitStrategy {
  ADAPTIVE = 'adaptive',
  DEFAULT = 'default',
  AGGRESSIVE = 'aggressive',
  CONSERVATIVE = 'conservative',
}

export enum PriorityScrapingStrategy {
  HIGH = 'high', // Prioritize high-value tweets
  MEDIUM = 'medium', // Balanced approach
  LOW = 'low', // Focus on volume over quality
}

export enum TweetCookieSameSite {
  LAX = 'Lax', // Default for most browsers
  STRICT = 'Strict', // More secure, but may break some functionality
  NONE = 'None', // Required for cross-site cookies, but less secure
}
