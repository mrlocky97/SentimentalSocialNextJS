import mongoose from 'mongoose';
import TweetModel from '../models/Tweet.model';

async function testDirectInsert() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sentimentalsocial');
    console.log('✅ Connected to MongoDB');

    // Create a simple test tweet document with numeric ID
    const testTweet = {
      tweetId: String(Date.now() * 1000), // Numeric string like real Twitter IDs
      content: "This is a test tweet for direct insertion",
      author: {
        id: "test_user",
        username: "testuser",
        displayName: "Test User",
        verified: false,
        followersCount: 100,
        followingCount: 50,
        tweetsCount: 10
      },
      metrics: {
        likes: 5,
        retweets: 2,
        replies: 1,
        quotes: 0,
        views: 25,
        engagement: 0
      },
      hashtags: ["test"],
      mentions: [],
      urls: [],
      mediaUrls: [],
      isRetweet: false,
      isReply: false,
      isQuote: false,
      language: "en",
      scrapedAt: new Date(),
      tweetCreatedAt: new Date()
    };

    console.log('📝 Attempting to insert test tweet...');
    console.log('📝 Test tweet data:', JSON.stringify(testTweet, null, 2));

    // Try direct insertion
    const result = await TweetModel.create(testTweet);
    console.log('✅ Successfully inserted tweet:', result.tweetId);

    // Try insertMany with the same data
    console.log('📝 Testing insertMany...');
    const testTweet2 = { 
      ...testTweet, 
      tweetId: String(Date.now() * 1000 + 1) // Different numeric ID
    };
    
    const bulkResult = await TweetModel.insertMany([testTweet2]);
    console.log('✅ InsertMany result:', bulkResult.length, 'documents inserted');
    console.log('✅ InsertMany IDs:', bulkResult.map(t => t.tweetId));

  } catch (error: any) {
    console.error('❌ Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      errors: error.errors
    });
    
    if (error.errors) {
      console.error('❌ Validation errors:');
      for (const field in error.errors) {
        console.error(`  - ${field}: ${error.errors[field].message}`);
      }
    }
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

testDirectInsert();
