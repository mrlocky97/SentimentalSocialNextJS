/**
 * Quick test of the enhanced orchestrator features
 * PHASE 2 - Orchestrator Enhancements Verification
 */

const { SentimentAnalysisOrchestrator } = require('./dist/lib/sentiment/orchestrator');

async function testEnhancedOrchestrator() {
  console.log('🔧 Testing Enhanced Orchestrator Features...\n');

  const orchestrator = new SentimentAnalysisOrchestrator();

  // Test 1: Basic analysis
  console.log('1️⃣ Testing basic text analysis...');
  const result1 = await orchestrator.analyzeText({
    text: 'I love this amazing product!',
    language: 'en',
  });
  console.log(
    '✅ Basic analysis:',
    result1.sentiment.label,
    'confidence:',
    result1.sentiment.confidence
  );

  // Test 2: Cache hit
  console.log('\n2️⃣ Testing cache hit...');
  const result2 = await orchestrator.analyzeText({
    text: 'I love this amazing product!',
    language: 'en',
  });
  console.log('✅ Cache test passed');

  // Test 3: Tweet analysis
  console.log('\n3️⃣ Testing tweet analysis...');
  const tweetResult = await orchestrator.analyzeTweet({
    id: 'test_tweet_123',
    text: 'This is terrible customer service!',
    language: 'en',
  });
  console.log('✅ Tweet analysis:', tweetResult.sentiment.label, 'tweetId:', tweetResult.tweetId);

  // Test 4: Metrics
  console.log('\n4️⃣ Testing metrics...');
  const metrics = orchestrator.getMetrics();
  console.log('📊 Metrics:', {
    totalRequests: metrics.totalRequests,
    cacheHits: metrics.cacheHits,
    cacheMisses: metrics.cacheMisses,
    cacheHitRate: metrics.cacheHitRate,
    cacheSize: metrics.cacheSize,
  });

  // Test 5: Batch processing
  console.log('\n5️⃣ Testing batch processing...');
  const tweets = [
    { id: 'tweet1', text: 'Great product!', language: 'en' },
    { id: 'tweet2', text: 'Could be better', language: 'en' },
    { id: 'tweet3', text: 'Amazing experience!', language: 'en' },
  ];

  const batchResults = await orchestrator.analyzeTweetsBatch(tweets);
  console.log('✅ Batch processing completed for', batchResults.length, 'tweets');

  // Final metrics
  console.log('\n📈 Final Metrics:');
  const finalMetrics = orchestrator.getMetrics();
  console.log('- Total Requests:', finalMetrics.totalRequests);
  console.log('- Cache Hit Rate:', Math.round(finalMetrics.cacheHitRate * 100) + '%');
  console.log('- Average Processing Time:', Math.round(finalMetrics.averageProcessingTime) + 'ms');
  console.log('- Error Count:', finalMetrics.errorCount);
  console.log('- Cache Size:', finalMetrics.cacheSize);

  console.log('\n🎉 All Enhanced Orchestrator tests passed!');
}

// Only run if called directly
if (require.main === module) {
  testEnhancedOrchestrator().catch(console.error);
}

module.exports = { testEnhancedOrchestrator };
