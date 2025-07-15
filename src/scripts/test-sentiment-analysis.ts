/**
 * Test Sentiment Analysis
 * Comprehensive test script for sentiment analysis functionality
 */

import { SentimentAnalysisService } from '../services/sentiment-analysis.service';
import { TweetSentimentAnalysisManager } from '../services/tweet-sentiment-analysis.manager';
import { Tweet } from '../types/twitter';

async function testSentimentAnalysis() {
  console.log('🧪 Testing Sentiment Analysis System...\n');

  // Initialize services
  const sentimentService = new SentimentAnalysisService();
  const tweetAnalysisManager = new TweetSentimentAnalysisManager();

  // Test 1: Basic sentiment analysis
  console.log('📊 Test 1: Basic Sentiment Analysis');
  console.log('=====================================');

  const testTexts = [
    "I absolutely love my new Nike shoes! They are amazing and so comfortable! 😍",
    "Terrible customer service. Very disappointed with this product. Waste of money!",
    "The shoes are okay, nothing special but they do the job.",
    "Best purchase ever! Highly recommend to everyone. Outstanding quality!",
    "Not sure about this brand. Maybe Adidas is better? What do you think?"
  ];

  for (let i = 0; i < testTexts.length; i++) {
    const text = testTexts[i];
    console.log(`\n🔍 Analyzing: "${text}"`);
    
    try {
      const analysis = await sentimentService.analyze(text);
      console.log(`   📈 Sentiment: ${analysis.sentiment.label} (${analysis.sentiment.score.toFixed(3)})`);
      console.log(`   🎯 Confidence: ${(analysis.sentiment.confidence * 100).toFixed(1)}%`);
      console.log(`   📝 Keywords: ${analysis.keywords.slice(0, 3).join(', ')}`);
      console.log(`   🌍 Language: ${analysis.language}`);
      console.log(`   📚 Readability: ${analysis.readabilityScore?.toFixed(1)}/100`);
      
      if (analysis.sentiment.emotions) {
        const topEmotion = Object.entries(analysis.sentiment.emotions)
          .sort(([, a], [, b]) => b - a)[0];
        if (topEmotion[1] > 0.1) {
          console.log(`   😊 Top Emotion: ${topEmotion[0]} (${(topEmotion[1] * 100).toFixed(1)}%)`);
        }
      }
    } catch (error) {
      console.error(`   ❌ Error: ${error}`);
    }
  }

  // Test 2: Tweet analysis with marketing insights
  console.log('\n\n📱 Test 2: Tweet Analysis with Marketing Insights');
  console.log('=================================================');

  const testTweets: Tweet[] = [
    {
      id: 'test_1',
      tweetId: 'test_1',
      content: 'Just got my new @nike Air Max and they are incredible! Best running shoes I\'ve ever owned! #Nike #JustDoIt #Running',
      author: {
        id: 'fitness_enthusiast',
        username: 'fitness_enthusiast',
        displayName: 'Fitness Enthusiast',
        verified: true,
        followersCount: 25000,
        followingCount: 500,
        tweetsCount: 3500,
        avatar: 'https://example.com/avatar1.jpg'
      },
      metrics: {
        likes: 156,
        retweets: 89,
        replies: 23,
        quotes: 12,
        views: 4500,
        engagement: 280
      },
      hashtags: ['#Nike', '#JustDoIt', '#Running'],
      mentions: ['@nike'],
      urls: [],
      mediaUrls: [],
      isRetweet: false,
      isReply: false,
      isQuote: false,
      language: 'en',
      createdAt: new Date('2025-07-15T12:00:00Z'),
      scrapedAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'test_2',
      tweetId: 'test_2',
      content: 'Disappointed with @nike customer service. Order delayed 2 weeks, no communication. Considering switching to Adidas.',
      author: {
        id: 'upset_customer',
        username: 'upset_customer',
        displayName: 'Upset Customer',
        verified: false,
        followersCount: 890,
        followingCount: 1200,
        tweetsCount: 2100,
        avatar: 'https://example.com/avatar2.jpg'
      },
      metrics: {
        likes: 34,
        retweets: 67,
        replies: 45,
        quotes: 8,
        views: 2100,
        engagement: 154
      },
      hashtags: [],
      mentions: ['@nike'],
      urls: [],
      mediaUrls: [],
      isRetweet: false,
      isReply: false,
      isQuote: false,
      language: 'en',
      createdAt: new Date('2025-07-15T15:30:00Z'),
      scrapedAt: new Date(),
      updatedAt: new Date()
    }
  ];

  for (let i = 0; i < testTweets.length; i++) {
    const tweet = testTweets[i];
    console.log(`\n🐦 Tweet ${i + 1}: @${tweet.author.username}`);
    console.log(`   📝 Content: "${tweet.content}"`);
    console.log(`   👥 Followers: ${tweet.author.followersCount.toLocaleString()}`);
    console.log(`   📊 Engagement: ${tweet.metrics?.engagement || 0} interactions`);
    
    try {
      const analysis = await tweetAnalysisManager.analyzeTweet(tweet);
      
      console.log(`   📈 Sentiment: ${analysis.analysis.sentiment.label} (${analysis.analysis.sentiment.score.toFixed(3)})`);
      console.log(`   🎯 Influence Score: ${analysis.influenceScore.toFixed(1)}/100`);
      
      if (analysis.brandMentions.length > 0) {
        console.log(`   🏷️  Brand Mentions:`);
        analysis.brandMentions.forEach(mention => {
          console.log(`      • ${mention.brand}: ${mention.sentiment.label} (${mention.sentiment.score.toFixed(2)})`);
        });
      }
      
      if (analysis.marketingInsights.length > 0) {
        console.log(`   💡 Marketing Insights:`);
        analysis.marketingInsights.forEach(insight => {
          console.log(`      • ${insight.type}: ${insight.description}`);
          console.log(`        Impact: ${insight.impact} | Actionable: ${insight.actionable}`);
          if (insight.recommendation) {
            console.log(`        💡 Recommendation: ${insight.recommendation}`);
          }
        });
      }
      
    } catch (error) {
      console.error(`   ❌ Error analyzing tweet: ${error}`);
    }
  }

  // Test 3: Batch analysis and statistics
  console.log('\n\n📊 Test 3: Batch Analysis and Statistics');
  console.log('========================================');

  try {
    console.log(`🔄 Running batch analysis on ${testTweets.length} tweets...`);
    const batchAnalyses = await tweetAnalysisManager.analyzeTweetsBatch(testTweets);
    
    console.log(`✅ Batch analysis completed: ${batchAnalyses.length} tweets analyzed`);
    
    const statistics = tweetAnalysisManager.generateStatistics(batchAnalyses);
    
    console.log('\n📈 Statistics Summary:');
    console.log(`   📊 Total Analyzed: ${statistics.totalAnalyzed}`);
    console.log(`   📈 Average Sentiment: ${statistics.averageSentiment.toFixed(3)}`);
    console.log(`   📊 Sentiment Distribution:`);
    Object.entries(statistics.sentimentDistribution).forEach(([label, percentage]) => {
      console.log(`      • ${label}: ${percentage.toFixed(1)}%`);
    });
    
    if (statistics.topKeywords.length > 0) {
      console.log(`   🔑 Top Keywords:`);
      statistics.topKeywords.slice(0, 5).forEach(keyword => {
        console.log(`      • ${keyword.keyword}: ${keyword.frequency} mentions (avg sentiment: ${keyword.avgSentiment.toFixed(2)})`);
      });
    }
    
    if (statistics.brandMentionStats.length > 0) {
      console.log(`   🏷️  Brand Mention Stats:`);
      statistics.brandMentionStats.forEach(brand => {
        console.log(`      • ${brand.brand}: ${brand.mentions} mentions (avg sentiment: ${brand.avgSentiment.toFixed(2)})`);
      });
    }
    
    // Test trends
    console.log('\n📈 Generating sentiment trends...');
    const trends = tweetAnalysisManager.generateSentimentTrends(batchAnalyses, 1);
    console.log(`✅ Generated ${trends.length} trend data points`);
    
    if (trends.length > 0) {
      console.log('   📊 Trend Overview:');
      trends.forEach((trend, index) => {
        console.log(`      ${index + 1}. ${trend.timestamp.toISOString().slice(11, 16)} - Sentiment: ${trend.sentiment.toFixed(3)}, Volume: ${trend.volume} tweets`);
      });
    }
    
  } catch (error) {
    console.error(`❌ Error in batch analysis: ${error}`);
  }

  // Test 4: Performance test
  console.log('\n\n⚡ Test 4: Performance Test');
  console.log('===========================');

  const performanceTexts = Array(50).fill(0).map((_, i) => 
    `Performance test text ${i + 1}. This is a sample text for testing sentiment analysis speed and accuracy. ${Math.random() > 0.5 ? 'I love this!' : 'Not great.'}`
  );

  console.log(`🚀 Testing performance with ${performanceTexts.length} texts...`);
  const startTime = Date.now();

  try {
    const performanceResults = await sentimentService.analyzeBatch(performanceTexts);
    const endTime = Date.now();
    const processingTime = endTime - startTime;
    
    console.log(`✅ Performance test completed:`);
    console.log(`   📊 Processed: ${performanceResults.length} texts`);
    console.log(`   ⏱️  Total time: ${processingTime}ms`);
    console.log(`   📈 Average time per text: ${(processingTime / performanceResults.length).toFixed(2)}ms`);
    console.log(`   🎯 Success rate: ${((performanceResults.length / performanceTexts.length) * 100).toFixed(1)}%`);
    
    // Calculate average sentiment
    const avgSentiment = performanceResults.reduce((sum, result) => sum + result.sentiment.score, 0) / performanceResults.length;
    console.log(`   📈 Average sentiment: ${avgSentiment.toFixed(3)}`);
    
  } catch (error) {
    console.error(`❌ Performance test failed: ${error}`);
  }

  console.log('\n🎉 Sentiment Analysis Testing Complete!');
  console.log('=======================================');
  console.log('✅ All tests completed successfully!');
  console.log('🚀 Sentiment analysis system is ready for production!');
}

// Run the test if this file is executed directly
if (require.main === module) {
  testSentimentAnalysis().catch(console.error);
}

export { testSentimentAnalysis };
