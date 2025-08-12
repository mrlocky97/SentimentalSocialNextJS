import { TweetSentimentAnalysisManager } from '@/services/tweet-sentiment-analysis.manager.service';

// Singleton instance shared across app and services without importing server.ts
export const sentimentManager = new TweetSentimentAnalysisManager();
