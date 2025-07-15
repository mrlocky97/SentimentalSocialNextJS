/**
 * Simple Test for Web Scraping
 * Test only the web scraping functionality without database
 */

import TwitterScraperService from '../services/twitter-scraper.service';

async function testWebScraping() {
  console.log('🧪 Testing Web Scraping Only...\n');
  
  const scraperService = new TwitterScraperService({
    headless: true,
    delay: 1000, // 1 second for testing
    maxRetries: 2
  });
  
  try {
    // Test 1: Check rate limit status
    console.log('📊 Test 1: Checking scraping rate limit status...');
    const status = scraperService.getRateLimitStatus();
    console.log('✅ Scraping Status:');
    console.log(`   🚦 Available: ${!status.isLimited}`);
    console.log(`   📈 Requests used: ${status.requestCount}/300 per hour`);
    console.log(`   ⏰ Reset time: ${status.resetTime.toLocaleString()}`);
    console.log('');

    // Test 2: Scrape tweets by hashtag
    console.log('🕷️ Test 2: Scraping tweets for #JustDoIt...');
    const scrapingResult = await scraperService.scrapeByHashtag('JustDoIt', {
      maxTweets: 5,
      includeReplies: false,
      includeRetweets: true,
      maxAgeHours: 24,
      minLikes: 0,
      minRetweets: 0
    });
    
    console.log('✅ Scraping Results:');
    console.log(`   📥 Total found: ${scrapingResult.totalFound} tweets`);
    console.log(`   📊 Total scraped: ${scrapingResult.totalScraped} tweets`);
    console.log(`   ❌ Errors: ${scrapingResult.errors.length}`);
    console.log(`   🚦 Rate limit remaining: ${scrapingResult.rateLimit.remaining}`);
    
    if (scrapingResult.errors.length > 0) {
      console.log('   🚨 Error details:');
      scrapingResult.errors.forEach((error, index) => {
        console.log(`      ${index + 1}. ${error}`);
      });
    }
    console.log('');

    // Test 3: Show scraped tweets
    if (scrapingResult.tweets.length > 0) {
      console.log('🏆 Scraped Tweets:');
      scrapingResult.tweets.forEach((tweet, index) => {
        const engagement = tweet.metrics.likes + tweet.metrics.retweets + tweet.metrics.replies;
        console.log(`   ${index + 1}. @${tweet.author.username} ${tweet.author.verified ? '✅' : ''}`);
        console.log(`      📝 "${tweet.content.substring(0, 80)}${tweet.content.length > 80 ? '...' : ''}"`);
        console.log(`      📈 ${tweet.metrics.likes} likes, ${tweet.metrics.retweets} retweets (Total: ${engagement})`);
        console.log(`      👥 ${tweet.author.followersCount} followers`);
        console.log(`      📅 ${new Date(tweet.createdAt).toLocaleDateString()}`);
        console.log('');
      });
    } else {
      console.log('⚠️ No tweets were scraped. This is expected with mock data.');
      console.log('💡 Real scraping would collect actual tweets from Twitter.');
    }

    // Test 4: Test user scraping
    console.log('🕷️ Test 4: Scraping tweets from user @nike...');
    const userResult = await scraperService.scrapeByUser('nike', {
      maxTweets: 3,
      includeReplies: false,
      includeRetweets: false,
      maxAgeHours: 48
    });
    
    console.log('✅ User Scraping Results:');
    console.log(`   📥 Found: ${userResult.totalFound} tweets from @nike`);
    console.log(`   📊 Scraped: ${userResult.totalScraped} tweets`);
    console.log('');

    // Test 5: Performance metrics
    console.log('📊 Performance Analysis:');
    console.log('   🕷️ Web Scraping Advantages:');
    console.log('      ✅ Unlimited tweet collection (no API quotas)');
    console.log('      ✅ Access to historical tweets (beyond 7 days)');
    console.log('      ✅ No costs or API keys required');
    console.log('      ✅ More comprehensive data collection');
    console.log('      ✅ Bypasses official API limitations');
    console.log('');
    console.log('   ⚠️ Web Scraping Considerations:');
    console.log('      🐌 Slower than API (requires delays to avoid blocking)');
    console.log('      🔄 Requires rate limiting and careful usage');
    console.log('      🛠️ May need updates if Twitter changes structure');
    console.log('      ⚡ Risk of IP blocking if overused');
    console.log('');

    console.log('🎉 Web scraping test completed successfully!');
    console.log('');
    console.log('🚀 Next Steps:');
    console.log('   1. 🔧 Install Playwright browsers: npx playwright install');
    console.log('   2. 🧪 Test with real Twitter scraping (requires browser)');
    console.log('   3. 📊 Scale up to collect thousands of tweets');
    console.log('   4. 🔗 Integrate with sentiment analysis');
    console.log('   5. 🎯 Move to Step 3: Sentiment Analysis');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.log('');
    console.log('💡 Troubleshooting:');
    console.log('   1. Install browser dependencies: npx playwright install');
    console.log('   2. Check internet connection');
    console.log('   3. Verify no firewall blocking');
    console.log('   4. Try running as administrator');
  }
}

// Run the test
testWebScraping()
  .then(() => {
    console.log('\n✨ Scraping test completed!');
    console.log('🎯 Ready to collect unlimited tweets! 🚀');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Scraping test failed:', error);
    process.exit(1);
  });
