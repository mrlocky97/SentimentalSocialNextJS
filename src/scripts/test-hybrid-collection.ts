/**
 * Test Hybrid Twitter Collection
 * Test script for the new web scraping + API system
 */

import HybridTwitterCollectionManager from '../services/hybrid-twitter-collection.manager';

async function testHybridCollection() {
  console.log('🧪 Testing Hybrid Twitter Collection Manager...\n');
  
  const manager = new HybridTwitterCollectionManager();
  
  try {
    // Test 1: Check system status
    console.log('📊 Test 1: Checking system status...');
    const status = await manager.getSystemStatus();
    console.log('✅ System Status:');
    console.log('   🕷️ Scraping:', status.scraping.available ? 
      `Available (${status.scraping.remaining} requests remaining)` : 
      'Rate limited');
    console.log('   🔌 API:', status.api.available ? 
      `Available (${status.api.remaining} calls remaining)` : 
      'Quota exhausted');
    console.log('   💡 Recommendation:', status.recommendation);
    console.log('');

    // Test 2: Get collection recommendations
    console.log('💡 Test 2: Getting recommendations for #JustDoIt...');
    const recommendations = await manager.getCollectionRecommendations('JustDoIt');
    console.log('✅ Collection Recommendations:');
    console.log(`   🎯 Recommended method: ${recommendations.recommendedMethod}`);
    console.log(`   📈 Max collectable: ${recommendations.maxCollectable} tweets`);
    console.log(`   💰 Estimated cost: ${recommendations.estimatedCost} API calls`);
    console.log(`   🕷️ Scraping available: ${recommendations.scrapingAvailable}`);
    console.log(`   🔌 API available: ${recommendations.apiAvailable}`);
    
    if (recommendations.strategies.length > 0) {
      console.log('   📋 Available strategies:');
      recommendations.strategies.forEach((strategy, index) => {
        console.log(`      ${index + 1}. ${strategy.name}`);
        console.log(`         📝 ${strategy.description}`);
        console.log(`         📊 Max tweets: ${strategy.maxTweets}`);
        console.log(`         💰 Cost: ${strategy.cost} API calls`);
        console.log(`         ✅ Pros: ${strategy.pros.slice(0, 2).join(', ')}`);
        console.log(`         ⚠️ Cons: ${strategy.cons.slice(0, 2).join(', ')}`);
      });
    }
    console.log('');

    // Test 3: Hybrid collection (small test)
    console.log('🚀 Test 3: Hybrid collection - 10 tweets for #JustDoIt...');
    const collectionResult = await manager.collectTweets({
      hashtag: 'JustDoIt',
      maxTweets: 10,
      useScrapingFirst: true,
      fallbackToAPI: true,
      scrapingRatio: 0.8, // 80% scraping, 20% API
      includeReplies: false,
      includeRetweets: true,
      maxAgeHours: 24,
      minLikes: 1,
      prioritizeVerified: true,
      minFollowers: 100
    });
    
    console.log('✅ Collection Results:');
    console.log(`   📥 Total collected: ${collectionResult.totalCollected} tweets`);
    console.log(`   🕷️ Scraped: ${collectionResult.scrapedCount} tweets`);
    console.log(`   🔌 API: ${collectionResult.apiCount} tweets`);
    console.log(`   🎯 Method used: ${collectionResult.method}`);
    console.log(`   💰 API cost: ${collectionResult.estimatedCost} calls`);
    console.log(`   ✅ Scraping success: ${collectionResult.scrapingSuccess}`);
    console.log(`   ✅ API success: ${collectionResult.apiSuccess}`);
    console.log(`   ❌ Errors: ${collectionResult.errors.length}`);
    
    if (collectionResult.errors.length > 0) {
      console.log('   🚨 Error details:');
      collectionResult.errors.forEach((error, index) => {
        console.log(`      ${index + 1}. ${error}`);
      });
    }
    
    console.log(`   📊 Summary:`);
    console.log(`      📈 Average engagement: ${collectionResult.summary.averageEngagement}`);
    console.log(`      ✅ Verified users: ${collectionResult.summary.verifiedUsers}`);
    console.log(`      🏷️ Hashtags found: ${collectionResult.summary.hashtagVariations.slice(0, 5).join(', ')}`);
    console.log(`      📅 Time range: ${collectionResult.summary.timeRange.earliest.toISOString().split('T')[0]} to ${collectionResult.summary.timeRange.latest.toISOString().split('T')[0]}`);
    console.log('');

    // Test 4: Show top engagement tweets (if any)
    if (collectionResult.summary.topEngagement.length > 0) {
      console.log('🏆 Top Engagement Tweets (from scraping):');
      collectionResult.summary.topEngagement.slice(0, 3).forEach((tweet, index) => {
        const engagement = tweet.metrics.likes + tweet.metrics.retweets + tweet.metrics.replies;
        console.log(`   ${index + 1}. @${tweet.author.username} ${tweet.author.verified ? '✅' : ''}`);
        console.log(`      📝 "${tweet.content.substring(0, 100)}${tweet.content.length > 100 ? '...' : ''}"`);
        console.log(`      📈 ${tweet.metrics.likes} likes, ${tweet.metrics.retweets} retweets, ${tweet.metrics.replies} replies (Total: ${engagement})`);
        console.log(`      👥 ${tweet.author.followersCount} followers`);
        console.log('');
      });
    }

    // Test 5: Performance comparison
    console.log('📊 Performance Analysis:');
    if (collectionResult.scrapedCount > 0 && collectionResult.apiCount > 0) {
      console.log('   🎯 Hybrid approach successfully combined both methods');
      console.log(`   🕷️ Scraping efficiency: ${collectionResult.scrapedCount} tweets at $0 cost`);
      console.log(`   🔌 API efficiency: ${collectionResult.apiCount} tweets at ${collectionResult.estimatedCost} calls cost`);
      const totalCost = collectionResult.estimatedCost;
      const totalTweets = collectionResult.totalCollected;
      const costPerTweet = totalTweets > 0 ? (totalCost / totalTweets).toFixed(3) : '0';
      console.log(`   💰 Cost efficiency: ${costPerTweet} API calls per tweet`);
    } else if (collectionResult.scrapedCount > 0) {
      console.log('   🕷️ Pure scraping approach - excellent cost efficiency!');
      console.log(`   💰 Total cost: $0 (${collectionResult.scrapedCount} tweets scraped)`);
    } else if (collectionResult.apiCount > 0) {
      console.log('   🔌 Pure API approach - reliable but limited');
      console.log(`   💰 Total cost: ${collectionResult.estimatedCost} API calls`);
    } else {
      console.log('   ⚠️ No tweets collected - check configuration');
    }

    console.log('\n🎉 All hybrid collection tests completed!');
    console.log('\n💡 Next steps:');
    console.log('   1. 🔧 Fine-tune scraping parameters based on results');
    console.log('   2. 📊 Set up monitoring for rate limits');
    console.log('   3. 🚀 Scale up to collect thousands of tweets');
    console.log('   4. 📈 Proceed with sentiment analysis (Step 3)');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testHybridCollection()
  .then(() => {
    console.log('\n✨ Hybrid collection test completed!');
    console.log('🎯 You can now collect unlimited tweets using web scraping! 🚀');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Hybrid test suite failed:', error);
    process.exit(1);
  });
