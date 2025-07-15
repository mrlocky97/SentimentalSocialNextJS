/**
 * Test Twitter Collection
 * Quick test script to verify collection functionality
 */

import TwitterCollectionManager from '../services/twitter-collection.manager';

async function testCollection() {
  console.log('🧪 Testing Twitter Collection Manager...\n');
  
  const manager = new TwitterCollectionManager();
  
  try {
    // Test 1: Check quota status
    console.log('📊 Test 1: Checking quota status...');
    const quota = await manager.getQuotaStatus();
    console.log('✅ Quota Status:', quota);
    console.log('');

    // Test 2: Get recommendations
    console.log('💡 Test 2: Getting recommendations for #JustDoIt...');
    const recommendations = await manager.getCollectionRecommendations('JustDoIt');
    console.log('✅ Recommendations:', recommendations);
    console.log('');

    // Test 3: Collect tweets (small test)
    console.log('🚀 Test 3: Collecting 5 tweets for #JustDoIt...');
    const result = await manager.collectTweets({
      hashtag: 'JustDoIt',
      maxTweets: 5,
      prioritizeVerified: true,
      minFollowers: 1000,
      minEngagement: 1,
      maxAgeHours: 24
    });
    
    console.log('✅ Collection Result:');
    console.log(`   📥 Collected: ${result.collected} tweets`);
    console.log(`   🔄 Filtered: ${result.filtered} tweets`);
    console.log(`   🔄 Duplicates: ${result.duplicates} tweets`);
    console.log(`   ❌ Errors: ${result.errors}`);
    console.log(`   💰 API Cost: ${result.estimatedCost} tweets from quota`);
    console.log(`   📊 Avg Engagement: ${result.summary.averageEngagement}%`);
    console.log(`   ✅ Verified Users: ${result.summary.verifiedUsers}`);
    console.log(`   🏷️  Top Hashtags: ${result.summary.hashtagVariations.join(', ')}`);
    console.log('');

    // Test 4: Show top tweets
    if (result.summary.topEngagement.length > 0) {
      console.log('🏆 Top Engagement Tweets:');
      result.summary.topEngagement.forEach((tweet, index) => {
        console.log(`   ${index + 1}. @${tweet.author?.username}: ${tweet.content?.substring(0, 100)}...`);
        console.log(`      📈 ${tweet.metrics?.likes} likes, ${tweet.metrics?.retweets} retweets`);
      });
    }

    console.log('\n🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testCollection()
  .then(() => {
    console.log('\n✨ Test completed. You can now use the API endpoints!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Test suite failed:', error);
    process.exit(1);
  });
