/**
 * Core Mappers Module
 * Punto de entrada centralizado para todos los mappers
 */

// Tweet Data Mappers
export * from "./tweet-mappers";

// Sentiment Analysis Mappers
export * from "./sentiment-mappers";

// API Response Mappers
export * from "./api-mappers";

// Convenience re-exports for common patterns
export {
  TweetToTweetDTOMapper as TweetMapper,
  TweetNormalizationMapper as TweetNormalizer,
  TweetSentimentMapper as TweetSentimentEnricher,
} from "./tweet-mappers";

export {
  TweetSentimentAnalysisMapper as SentimentAnalysisMapper,
  AnalysisToSentimentResultMapper as SentimentResultMapper,
  SentimentStatsMapper as StatsMapper,
} from "./sentiment-mappers";

export {
  BatchAnalysisAPIMapper as APIBatchMapper,
  ComparisonAPIMapper as APIComparisonMapper,
  StatsAPIMapper as APIStatsMapper,
  TweetAnalysisAPIMapper as APITweetMapper,
} from "./api-mappers";
