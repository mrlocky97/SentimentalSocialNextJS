import { TweetSentimentAnalysisManager } from '@/services';

// Singleton instance shared across app and services without importing server.ts
export const sentimentManager = new TweetSentimentAnalysisManager();
