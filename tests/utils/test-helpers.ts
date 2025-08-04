/**
 * Funciones utilitarias para crear objetos de test simplificados
 */

import { Tweet, TwitterUser, TweetMetrics } from '../../src/types/twitter';

export function createTestTweet(overrides: Partial<Tweet> = {}): Tweet {
  return {
    id: 'test-id',
    tweetId: 'test-tweet-id',
    content: 'Test content',
    author: createTestUser(),
    metrics: createTestMetrics(),
    hashtags: [],
    mentions: [],
    urls: [],
    isRetweet: false,
    isReply: false,
    isQuote: false,
    language: 'en',
    scrapedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  };
}

export function createTestUser(overrides: Partial<TwitterUser> = {}): TwitterUser {
  return {
    id: 'test-user-id',
    username: 'testuser',
    displayName: 'Test User',
    verified: false,
    followersCount: 100,
    followingCount: 50,
    tweetsCount: 200,
    ...overrides
  };
}

export function createTestMetrics(overrides: Partial<TweetMetrics> = {}): TweetMetrics {
  return {
    likes: 10,
    retweets: 2,
    replies: 1,
    quotes: 0,
    engagement: 13,
    ...overrides
  };
}
