import { NextResponse } from 'next/server';
import { trainingData } from '../../../data/training-data';
import { TweetSentimentAnalysisManager } from '../../../services/tweet-sentiment-analysis.manager.service';
import { Tweet } from '../../../types/twitter';

const sentimentManager = new TweetSentimentAnalysisManager();

// Train the model on startup
sentimentManager.trainNaiveBayes(trainingData);

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
