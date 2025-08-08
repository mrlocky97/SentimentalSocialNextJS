import { NextResponse } from 'next/server';
import { Tweet } from '../../../types/twitter';
// Import the shared instance of the sentiment manager from the server
// Note: In Next.js API routes, we need a local instance as they don't share state with Express
import { TweetSentimentAnalysisManager } from '../../../services/tweet-sentiment-analysis.manager.service';

// Create a dedicated instance for Next.js API routes
const sentimentManager = new TweetSentimentAnalysisManager();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tweet, method } = body;

    if (!tweet || !tweet.content) {
      return NextResponse.json({ error: 'Tweet content is required' }, { status: 400 });
    }

    const analysis = await sentimentManager.analyzeTweet(tweet as Tweet, {}, method);
    return NextResponse.json(analysis);
  } catch (error) {
    console.error('Error in sentiment analysis route:', error);
    return NextResponse.json({ error: 'Failed to analyze sentiment' }, { status: 500 });
  }
}
