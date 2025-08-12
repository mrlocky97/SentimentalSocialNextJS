/**
 * Metrics Calculation Utilities
 * Centralized functions for calculating various metrics across the application
 */

import { SentimentResult } from "../../types/sentiment";

/**
 * Calculate engagement rate based on metrics
 */
export function calculateEngagementRate(
  likes: number,
  retweets: number,
  replies: number,
  quotes: number,
  views?: number,
): number {
  const totalEngagement = likes + retweets + replies + quotes;

  if (views && views > 0) {
    return (totalEngagement / views) * 100;
  }

  // If no views data, return raw engagement count
  return totalEngagement;
}

/**
 * Calculate evaluation metrics from an array of sentiment results
 */
export function calculateBatchSentimentMetrics(sentiments: SentimentResult[]): {
  averageScore: number;
  averageConfidence: number;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
  positivePercentage: number;
  negativePercentage: number;
  neutralPercentage: number;
} {
  if (sentiments.length === 0) {
    return {
      averageScore: 0,
      averageConfidence: 0,
      positiveCount: 0,
      negativeCount: 0,
      neutralCount: 0,
      positivePercentage: 0,
      negativePercentage: 0,
      neutralPercentage: 0,
    };
  }

  const totalScore = sentiments.reduce((sum, s) => sum + s.score, 0);
  const totalConfidence = sentiments.reduce((sum, s) => sum + s.confidence, 0);

  const positiveCount = sentiments.filter((s) => s.label === "positive").length;
  const negativeCount = sentiments.filter((s) => s.label === "negative").length;
  const neutralCount = sentiments.filter((s) => s.label === "neutral").length;

  const total = sentiments.length;

  return {
    averageScore: totalScore / total,
    averageConfidence: totalConfidence / total,
    positiveCount,
    negativeCount,
    neutralCount,
    positivePercentage: (positiveCount / total) * 100,
    negativePercentage: (negativeCount / total) * 100,
    neutralPercentage: (neutralCount / total) * 100,
  };
}

/**
 * Calculate evaluation metrics (precision, recall, F1-score, accuracy)
 */
export function calculateEvaluationMetrics(
  actual: string[],
  predicted: string[],
): {
  accuracy: number;
  precision: {
    positive: number;
    negative: number;
    neutral: number;
    macro: number;
  };
  recall: {
    positive: number;
    negative: number;
    neutral: number;
    macro: number;
  };
  f1Score: {
    positive: number;
    negative: number;
    neutral: number;
    macro: number;
  };
  confusionMatrix: { [key: string]: { [key: string]: number } };
} {
  if (actual.length !== predicted.length) {
    throw new Error("Actual and predicted arrays must have the same length");
  }

  const labels = ["positive", "negative", "neutral"];
  const confusionMatrix: { [key: string]: { [key: string]: number } } = {};

  // Initialize confusion matrix
  labels.forEach((actualLabel) => {
    confusionMatrix[actualLabel] = {};
    labels.forEach((predictedLabel) => {
      confusionMatrix[actualLabel][predictedLabel] = 0;
    });
  });

  // Fill confusion matrix
  actual.forEach((actualLabel, index) => {
    const predictedLabel = predicted[index];
    confusionMatrix[actualLabel][predictedLabel]++;
  });

  // Calculate metrics for each class
  const metrics: {
    [key: string]: { precision: number; recall: number; f1Score: number };
  } = {};

  labels.forEach((label) => {
    const tp = confusionMatrix[label][label]; // True positives
    const fp = labels.reduce(
      (sum, l) => (l !== label ? sum + confusionMatrix[l][label] : sum),
      0,
    ); // False positives
    const fn = labels.reduce(
      (sum, l) => (l !== label ? sum + confusionMatrix[label][l] : sum),
      0,
    ); // False negatives

    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
    const f1Score =
      precision + recall > 0
        ? (2 * (precision * recall)) / (precision + recall)
        : 0;

    metrics[label] = { precision, recall, f1Score };
  });

  // Calculate macro averages
  const macroPrecision =
    labels.reduce((sum, label) => sum + metrics[label].precision, 0) /
    labels.length;
  const macroRecall =
    labels.reduce((sum, label) => sum + metrics[label].recall, 0) /
    labels.length;
  const macroF1Score =
    labels.reduce((sum, label) => sum + metrics[label].f1Score, 0) /
    labels.length;

  // Calculate accuracy
  const correctPredictions = actual.filter(
    (actualLabel, index) => actualLabel === predicted[index],
  ).length;
  const accuracy = correctPredictions / actual.length;

  return {
    accuracy,
    precision: {
      positive: metrics.positive.precision,
      negative: metrics.negative.precision,
      neutral: metrics.neutral.precision,
      macro: macroPrecision,
    },
    recall: {
      positive: metrics.positive.recall,
      negative: metrics.negative.recall,
      neutral: metrics.neutral.recall,
      macro: macroRecall,
    },
    f1Score: {
      positive: metrics.positive.f1Score,
      negative: metrics.negative.f1Score,
      neutral: metrics.neutral.f1Score,
      macro: macroF1Score,
    },
    confusionMatrix,
  };
}

/**
 * Calculate influence score based on follower metrics and engagement
 */
export function calculateInfluenceScore(
  followersCount: number,
  followingCount: number,
  tweetsCount: number,
  avgEngagement: number,
): number {
  // Normalize followers (log scale to handle large numbers)
  const normalizedFollowers = Math.log10(Math.max(1, followersCount)) / 8; // Max log10(100M) = 8

  // Calculate follower-to-following ratio (capped at 10)
  const followRatio =
    Math.min(10, followersCount / Math.max(1, followingCount)) / 10;

  // Activity score based on tweets count (log scale)
  const activityScore = Math.log10(Math.max(1, tweetsCount)) / 6; // Max log10(1M) = 6

  // Engagement score (normalized to 0-1)
  const engagementScore = Math.min(1, avgEngagement / 100);

  // Weighted combination
  const influenceScore =
    (normalizedFollowers * 0.4 + // 40% followers
      followRatio * 0.2 + // 20% follow ratio
      activityScore * 0.2 + // 20% activity
      engagementScore * 0.2) * // 20% engagement
    100;

  return Math.round(influenceScore);
}

/**
 * Calculate trending score for hashtags/keywords
 */
export function calculateTrendingScore(
  currentCount: number,
  previousCount: number,
  timeWindow: number, // in hours
): number {
  if (previousCount === 0) {
    return currentCount > 0 ? 100 : 0;
  }

  const growthRate = ((currentCount - previousCount) / previousCount) * 100;
  const timeWeight = Math.max(0.1, 1 / timeWindow); // More recent = higher weight

  return Math.round(growthRate * timeWeight);
}

/**
 * Calculate campaign performance score
 */
export function calculateCampaignPerformance(metrics: {
  totalTweets: number;
  totalEngagement: number;
  avgSentiment: number;
  targetReached: number;
  timeRemaining: number; // in days
}): {
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  insights: string[];
} {
  const insights: string[] = [];
  let score = 0;

  // Volume score (30%)
  const volumeScore = Math.min(
    100,
    (metrics.totalTweets / Math.max(1, metrics.targetReached)) * 100,
  );
  score += volumeScore * 0.3;

  if (volumeScore < 50) {
    insights.push("Low tweet volume - consider increasing campaign reach");
  }

  // Engagement score (30%)
  const avgEngagementPerTweet =
    metrics.totalEngagement / Math.max(1, metrics.totalTweets);
  const engagementScore = Math.min(100, avgEngagementPerTweet * 10); // Assume 10 engagement per tweet is good
  score += engagementScore * 0.3;

  if (engagementScore < 50) {
    insights.push("Low engagement rate - content may need optimization");
  }

  // Sentiment score (25%)
  const sentimentScore = ((metrics.avgSentiment + 1) / 2) * 100; // Convert -1,1 to 0,100
  score += sentimentScore * 0.25;

  if (sentimentScore < 50) {
    insights.push("Negative sentiment detected - monitor brand perception");
  }

  // Time efficiency score (15%)
  const timeScore =
    metrics.timeRemaining > 0
      ? 100
      : Math.max(0, 100 - Math.abs(metrics.timeRemaining) * 10);
  score += timeScore * 0.15;

  if (timeScore < 50) {
    insights.push("Campaign timeline needs attention");
  }

  // Determine grade
  let grade: "A" | "B" | "C" | "D" | "F";
  if (score >= 90) grade = "A";
  else if (score >= 80) grade = "B";
  else if (score >= 70) grade = "C";
  else if (score >= 60) grade = "D";
  else grade = "F";

  return {
    score: Math.round(score),
    grade,
    insights,
  };
}

/**
 * Calculate percentile rank
 */
export function calculatePercentileRank(
  value: number,
  dataset: number[],
): number {
  if (dataset.length === 0) return 0;

  const sortedData = [...dataset].sort((a, b) => a - b);
  const rank = sortedData.filter((x) => x <= value).length;

  return Math.round((rank / sortedData.length) * 100);
}

/**
 * Calculate moving average for time series data
 */
export function calculateMovingAverage(
  data: { value: number; timestamp: Date }[],
  windowSize: number,
): { value: number; timestamp: Date }[] {
  if (data.length < windowSize) return data;

  const result: { value: number; timestamp: Date }[] = [];

  for (let i = windowSize - 1; i < data.length; i++) {
    const window = data.slice(i - windowSize + 1, i + 1);
    const average =
      window.reduce((sum, item) => sum + item.value, 0) / windowSize;

    result.push({
      value: average,
      timestamp: data[i].timestamp,
    });
  }

  return result;
}
