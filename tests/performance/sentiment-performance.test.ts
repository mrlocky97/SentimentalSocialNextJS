/**
 * Performance Tests
 * Tests to ensure the application meets performance requirements
 */

import { describe, expect, it } from "@jest/globals";
import { TweetSentimentAnalysisManager } from "../../src/services/tweet-sentiment-analysis.manager.service";
import { TestCleanup } from "../helpers/test-cleanup";
import { createTestTweet } from "../utils/test-helpers";

TestCleanup.setupTestTimeout();

describe("Performance Tests - PASO 7", () => {
  const analysisManager = new TweetSentimentAnalysisManager();

  describe("Sentiment Analysis Performance", () => {
    it("should analyze single tweet within 500ms", async () => {
      const tweet = createTestTweet({
        content:
          "This is a performance test tweet with moderate content length",
      });

      const startTime = performance.now();
      const result = await analysisManager.analyzeTweet(tweet);
      const endTime = performance.now();

      const executionTime = endTime - startTime;

      expect(result).toBeDefined();
      expect(result.analysis.sentiment.label).toBeDefined();
      expect(executionTime).toBeLessThan(500); // 500ms target
    });

    it("should handle batch analysis efficiently", async () => {
      const tweets = Array.from({ length: 10 }, (_, i) =>
        createTestTweet({
          content: `Batch test tweet number ${i + 1} with various sentiment content`,
        }),
      );

      const startTime = performance.now();
      const results = await analysisManager.analyzeTweetsBatch(tweets);
      const endTime = performance.now();

      const executionTime = endTime - startTime;
      const averageTimePerTweet = executionTime / tweets.length;

      expect(results).toHaveLength(10);
      expect(averageTimePerTweet).toBeLessThan(200); // 200ms per tweet target
    });

    it("should maintain performance with large text", async () => {
      const largeContent = "This is a very long tweet content ".repeat(50); // ~1700 chars
      const tweet = createTestTweet({ content: largeContent });

      const startTime = performance.now();
      const result = await analysisManager.analyzeTweet(tweet);
      const endTime = performance.now();

      const executionTime = endTime - startTime;

      expect(result).toBeDefined();
      expect(executionTime).toBeLessThan(1000); // 1s for large content
    });
  });

  describe("Memory Usage Tests", () => {
    it("should not have significant memory leaks in batch processing", async () => {
      const initialMemory = process.memoryUsage();

      // Process multiple batches
      for (let batch = 0; batch < 5; batch++) {
        const tweets = Array.from({ length: 20 }, (_, i) =>
          createTestTweet({
            content: `Memory test batch ${batch} tweet ${i}`,
          }),
        );

        await analysisManager.analyzeTweetsBatch(tweets);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreaseInMB = memoryIncrease / (1024 * 1024);

      // Should not increase memory by more than 50MB
      expect(memoryIncreaseInMB).toBeLessThan(50);
    });
  });

  describe("Concurrent Processing Tests", () => {
    it("should handle concurrent requests efficiently", async () => {
      const concurrentRequests = 5;
      const promises = Array.from({ length: concurrentRequests }, (_, i) =>
        analysisManager.analyzeTweet(
          createTestTweet({
            content: `Concurrent test ${i}`,
          }),
        ),
      );

      const startTime = performance.now();
      const results = await Promise.all(promises);
      const endTime = performance.now();

      const executionTime = endTime - startTime;

      expect(results).toHaveLength(concurrentRequests);
      results.forEach((result) => {
        expect(result.analysis.sentiment.label).toBeDefined();
      });

      // Should complete all 5 requests in under 2 seconds
      expect(executionTime).toBeLessThan(2000);
    });
  });
});
