/**
 * Utilidades de normalización para tweets y datos de sentimiento
 */
import { TweetDTO } from '../lib/sentiment/types';
import { Tweet } from '../types/twitter';

/**
 * Normaliza un tweet asegurando que todas las propiedades necesarias estén disponibles
 */
export function normalizeTweet(tweet: Tweet): TweetDTO {
  return {
    id: tweet.id || tweet.tweetId || '',
    // Utilizamos content como fuente principal y text como fallback
    text: tweet.content || (tweet.text as string) || '',
    language: (tweet.language as any) || 'unknown',
  };
}

/**
 * Normaliza un lote de tweets para ser procesados por el analizador de sentimiento
 */
export function normalizeTweetBatch(tweets: Tweet[]): TweetDTO[] {
  return tweets.map(normalizeTweet);
}

/**
 * Normaliza una etiqueta de sentimiento para asegurar compatibilidad con interfaces antiguas
 * @param label Etiqueta original
 */
export function normalizeSentimentLabel(label: string): 'positive' | 'negative' | 'neutral' {
  if (label === 'very_positive') return 'positive';
  if (label === 'very_negative') return 'negative';
  return label as 'positive' | 'negative' | 'neutral';
}
