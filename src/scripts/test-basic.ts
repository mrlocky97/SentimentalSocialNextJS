/**
 * Basic Services Test - Ultra Fast Core Functionality
 * Tests only essential services without reactive components
 */

import TwitterScraperService from '../../backup/backup-twitter-scraper.service';
import { TweetSentimentAnalysisManager } from '../services/tweet-sentiment-analysis.manager';
import { TweetDatabaseService } from '../services/tweet-database.service';
import { AuthService } from '../services/auth.service';

async function testBasicServices() {
  const startTime = Date.now();
  console.log('⚡ Testing BASIC Services (Ultra Fast - Core Only)...\n');

  try {
    // Test 1: Authentication Service
    console.log('🔐 Testing Authentication Service...');
    const authService = new AuthService();
    console.log('   ✅ Auth service instantiated correctly');

    // Test 2: Twitter Scraper (Instance Only)
    console.log('🐦 Testing Twitter Scraper Service...');
    const scraperService = new TwitterScraperService();
    console.log('   ✅ Twitter scraper service loaded');

    // Test 3: Sentiment Analysis (Quick Mock)
    console.log('🎯 Testing Sentiment Analysis...');
    const mockTweet = {
      id: 'test-basic-1',
      tweetId: 'twitter-basic-1',
      content: 'This is an amazing product! #awesome',
      author: {
        id: 'test-user',
        username: 'testuser',
        displayName: 'Test User',
        verified: false,
        followersCount: 100,
        followingCount: 50,
        tweetsCount: 10
      },
      metrics: { likes: 5, retweets: 2, replies: 1, quotes: 0, engagement: 0.08 },
      hashtags: ['#awesome'],
      mentions: [],
      urls: [],
      isRetweet: false,
      isReply: false,
      isQuote: false,
      language: 'en',
      scrapedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const sentimentManager = new TweetSentimentAnalysisManager();
    const sentimentResult = await sentimentManager.analyzeTweet(mockTweet);
    const sentimentScore = sentimentResult.analysis.sentiment.score;
    const sentimentLabel = sentimentScore > 0.3 ? 'positive' : sentimentScore < -0.3 ? 'negative' : 'neutral';
    console.log(`   ✅ Sentiment Analysis: ${sentimentLabel} (${(sentimentScore * 100).toFixed(1)}%)`);

    // Test 4: Database Connection (Quick Test)
    console.log('💾 Testing Database Connection...');
    const mockTweetWithSentiment = {
      ...mockTweet,
      sentiment: {
        score: sentimentScore,
        magnitude: sentimentResult.analysis.sentiment.magnitude,
        label: sentimentLabel as 'positive' | 'negative' | 'neutral',
        confidence: sentimentResult.analysis.sentiment.confidence,
        keywords: ['amazing', 'awesome'],
        analyzedAt: new Date(),
        processingTime: 150
      }
    };
    
    const dbService = new TweetDatabaseService();
    const dbResult = await dbService.saveTweet(mockTweetWithSentiment, 'test-basic-campaign');
    console.log('   ✅ Database connection operational');

    const endTime = Date.now();
    const executionTime = (endTime - startTime) / 1000;

    console.log('\n🎉 Basic Services Test Completed!');
    console.log('✅ Core services operational');
    console.log(`⏱️  Execution time: ${executionTime.toFixed(2)} seconds`);
    console.log(`🏆 ${executionTime < 3 ? '⚡ ULTRA FAST' : executionTime < 5 ? '🚀 FAST' : '✅ GOOD'} performance!`);

  } catch (error) {
    const endTime = Date.now();
    const executionTime = (endTime - startTime) / 1000;
    console.error(`❌ Basic test failed after ${executionTime.toFixed(2)} seconds:`, error);
    process.exit(1);
  }
}

// Export for use in other modules
export { testBasicServices };

// Run test if this file is executed directly
if (require.main === module) {
  testBasicServices();
}
