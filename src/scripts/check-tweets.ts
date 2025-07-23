import mongoose from 'mongoose';
import Tweet from '../models/Tweet.model';

async function checkTweets() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sentimentalsocial');
    console.log('✅ Connected to MongoDB');

    // Count total tweets
    const totalTweets = await Tweet.countDocuments();
    console.log(`📊 Total tweets in database: ${totalTweets}`);

    // Get recent tweets
    const recentTweets = await Tweet.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('tweetId content sentiment.label createdAt');

    console.log('\n📝 Recent tweets:');
    recentTweets.forEach((tweet: any, index: number) => {
      console.log(`${index + 1}. ID: ${tweet.tweetId}`);
      console.log(`   Text: ${tweet.content?.substring(0, 100)}...`);
      console.log(`   Sentiment: ${tweet.sentiment?.label || 'N/A'}`);
      console.log(`   Created: ${tweet.createdAt}`);
      console.log('');
    });

    // Check for working hashtag tweets
    const workingTweets = await Tweet.find({ content: { $regex: /learning|working/i } }).limit(3);
    console.log(`\n🔍 Tweets containing "learning" or "working": ${workingTweets.length}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

checkTweets();
