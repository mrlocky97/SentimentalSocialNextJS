/**
 * Tweet Mapper Utilities
 * Herramientas para convertir entre formatos antiguos y nuevos de tweets
 */

import { TweetDTO, TweetSentimentAnalysis } from '../lib/sentiment/types';
import { Tweet } from '../types/twitter';

/**
 * Convierte un Tweet al formato TweetDTO para el motor de análisis unificado
 */
export function mapTweetToDTO(tweet: Tweet): TweetDTO {
  return {
    id: tweet.id || tweet.tweetId || '',
    text: tweet.content || (tweet.text as string) || '',
    language: (tweet.language as any) || 'unknown',
  };
}

/**
 * Convierte un lote de Tweets al formato TweetDTO
 */
export function mapTweetBatchToDTO(tweets: Tweet[]): TweetDTO[] {
  return tweets.map(mapTweetToDTO);
}

/**
 * Añade información de análisis a un Tweet
 */
export function enrichTweetWithAnalysis(tweet: Tweet, analysis: TweetSentimentAnalysis): Tweet {
  return {
    ...tweet,
    sentiment: {
      score: analysis.analysis.sentiment.score,
      magnitude: analysis.analysis.sentiment.magnitude,
      label:
        analysis.analysis.sentiment.label === 'very_positive'
          ? 'positive'
          : analysis.analysis.sentiment.label === 'very_negative'
            ? 'negative'
            : (analysis.analysis.sentiment.label as 'positive' | 'negative' | 'neutral'),
      confidence: analysis.analysis.sentiment.confidence,
      emotions: analysis.analysis.sentiment.emotions,
      keywords: analysis.analysis.keywords,
      analyzedAt: analysis.analyzedAt,
      processingTime: Date.now() - analysis.analyzedAt.getTime(),
    },
  };
}

/**
 * Normaliza el formato de un tweet para garantizar compatibilidad con ambos sistemas
 */
export function normalizeTweet(tweet: any): Tweet {
  // Asegurar que el tweet tiene los campos mínimos necesarios
  return {
    id: tweet.id || tweet.tweetId || '',
    tweetId: tweet.tweetId || tweet.id || '',
    content: tweet.content || tweet.text || '',
    text: tweet.text || tweet.content || '',
    author: tweet.author || {
      id: '',
      username: '',
      displayName: '',
      verified: false,
      followersCount: 0,
      followingCount: 0,
      tweetsCount: 0,
    },
    metrics: tweet.metrics || {
      likes: 0,
      retweets: 0,
      replies: 0,
      quotes: 0,
      engagement: 0,
    },
    hashtags: tweet.hashtags || [],
    mentions: tweet.mentions || [],
    urls: tweet.urls || [],
    isRetweet: tweet.isRetweet || false,
    isReply: tweet.isReply || false,
    isQuote: tweet.isQuote || false,
    language: tweet.language || 'unknown',
    scrapedAt: tweet.scrapedAt || new Date(),
    createdAt: tweet.createdAt || new Date(),
    updatedAt: tweet.updatedAt || new Date(),
    ...tweet,
  };
}

/**
 * Normaliza un lote de tweets
 */
export function normalizeTweetBatch(tweets: any[]): Tweet[] {
  return tweets.map(normalizeTweet);
}
