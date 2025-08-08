import fs from 'fs';
import { NextResponse } from 'next/server';
import path from 'path';
import { trainingData } from '../../../data/training-data';
import { TweetSentimentAnalysisManager } from '../../../services/tweet-sentiment-analysis.manager.service';
import { Tweet } from '../../../types/twitter';

const sentimentManager = new TweetSentimentAnalysisManager();
const modelPath = path.join(process.cwd(), 'src', 'data', 'trained-classifier.json');

// Function to initialize the model
async function initializeModel() {
  try {
    // Check if the model file exists using fs.promises for async operation
    await fs.promises.access(modelPath);
    console.log('Loading pre-trained model from disk...');
    await sentimentManager.loadNaiveBayesFromFile(modelPath);
    console.log('Model loaded successfully.');
  } catch (error) {
    // If the file doesn't exist or another error occurs, train a new model
    console.log('No pre-trained model found or error loading. Training a new model...');
    await sentimentManager.trainNaiveBayes(trainingData);
    console.log('Model trained successfully. Saving to disk...');
    try {
      await sentimentManager.saveNaiveBayesToFile(modelPath);
      console.log('Model saved successfully.');
    } catch (saveError) {
      console.error('Failed to save the model:', saveError);
    }
  }
}

// Initialize the model on startup
initializeModel();

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
