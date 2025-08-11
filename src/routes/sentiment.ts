/**
 * Sentiment Analysis Routes
 * API endpoints for tweet sentiment analysis and marketing insights
 */

import { Request, Response, Router } from 'express';
import { sentimentService } from '../services/sentiment.service';
import { Tweet } from '../types/twitter';
import { asyncHandler, SentimentAnalysisError, successResponse } from '../utils/error-handler';

const router = Router();

/**
 * @swagger
 * /api/v1/sentiment/analyze:
 *   post:
 *     summary: Analyze sentiment of a single tweet
 *     tags: [Sentiment Analysis]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tweet
 *             properties:
 *               tweet:
 *                 type: object
 *                 description: Tweet object to analyze
 *               config:
 *                 type: object
 *                 description: Optional analysis configuration
 *     responses:
 *       200:
 *         description: Sentiment analysis completed successfully
 *       400:
 *         description: Invalid tweet data
 */
router.post(
  '/analyze',
  asyncHandler(async (req: Request, res: Response) => {
    const { tweet, config } = req.body;

    if (!tweet || !tweet.content) {
      throw SentimentAnalysisError.invalidTweet();
    }

    const analysis = await sentimentService.analyzeTweet(tweet as Tweet, config);
    return successResponse(res, analysis, 'Tweet sentiment analysis completed successfully');
  })
);

/**
 * @swagger
 * /api/v1/sentiment/batch:
 *   post:
 *     summary: Analyze sentiment of multiple tweets in batch
 *     tags: [Sentiment Analysis]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tweets
 *             properties:
 *               tweets:
 *                 type: array
 *                 items:
 *                   type: object
 *                 description: Array of tweet objects to analyze
 *               config:
 *                 type: object
 *                 description: Optional analysis configuration
 *               includeStats:
 *                 type: boolean
 *                 default: true
 *                 description: Include aggregate statistics in response
 *     responses:
 *       200:
 *         description: Batch sentiment analysis completed
 */
router.post(
  '/batch',
  asyncHandler(async (req: Request, res: Response) => {
    const { tweets, config, includeStats = true } = req.body;

    if (!tweets || !Array.isArray(tweets) || tweets.length === 0) {
      throw SentimentAnalysisError.invalidBatch();
    }

    if (tweets.length > 100) {
      throw SentimentAnalysisError.invalidBatch(tweets.length);
    }

    const result = await sentimentService.analyzeTweetsBatch(
      tweets as Tweet[],
      config,
      includeStats
    );
    return successResponse(
      res,
      result,
      `Successfully analyzed ${result.summary.totalProcessed} tweets`
    );
  })
);

/**
 * @swagger
 * /api/v1/sentiment/statistics:
 *   post:
 *     summary: Generate comprehensive statistics from analyzed tweets
 *     tags: [Sentiment Analysis]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - analyses
 *             properties:
 *               analyses:
 *                 type: array
 *                 items:
 *                   type: object
 *                 description: Array of tweet sentiment analyses
 *     responses:
 *       200:
 *         description: Statistics generated successfully
 */
router.post(
  '/statistics',
  asyncHandler(async (req: Request, res: Response) => {
    const { analyses } = req.body;

    if (!analyses || !Array.isArray(analyses)) {
      throw SentimentAnalysisError.invalidAnalysisArray();
    }

    const statistics = sentimentService.generateStatistics(analyses);
    return successResponse(res, statistics, `Statistics generated for ${analyses.length} analyses`);
  })
);

/**
 * @swagger
 * /api/v1/sentiment/trends:
 *   post:
 *     summary: Generate sentiment trends over time
 *     tags: [Sentiment Analysis]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - analyses
 *             properties:
 *               analyses:
 *                 type: array
 *                 items:
 *                   type: object
 *                 description: Array of tweet sentiment analyses
 *               intervalHours:
 *                 type: number
 *                 default: 1
 *                 description: Time interval for grouping trends (in hours)
 *     responses:
 *       200:
 *         description: Sentiment trends generated successfully
 */
router.post(
  '/trends',
  asyncHandler(async (req: Request, res: Response) => {
    const { analyses, intervalHours = 1 } = req.body;

    if (!analyses || !Array.isArray(analyses)) {
      throw SentimentAnalysisError.invalidAnalysisArray();
    }

    const result = sentimentService.generateSentimentTrends(analyses, intervalHours);
    return successResponse(res, result, `Generated ${result.totalDataPoints} trend data points`);
  })
);

/**
 * @swagger
 * /api/v1/sentiment/demo:
 *   get:
 *     summary: Demo sentiment analysis with sample tweets
 *     tags: [Sentiment Analysis]
 *     responses:
 *       200:
 *         description: Demo analysis completed successfully
 */
router.get(
  '/demo',
  asyncHandler(async (req: Request, res: Response) => {
    const result = await sentimentService.getDemoAnalysis();
    return successResponse(res, result, 'Demo sentiment analysis completed successfully');
  })
);

/**
 * @swagger
 * /api/v1/sentiment/test:
 *   post:
 *     summary: Test sentiment analysis with custom text
 *     tags: [Sentiment Analysis]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *                 description: Text to analyze
 *                 example: "I love this product! It's amazing and works perfectly."
 *               method:
 *                 type: string
 *                 description: Analysis method to use (rule or naive)
 *                 enum: [rule, naive]
 *                 default: rule
 *     responses:
 *       200:
 *         description: Text analysis completed successfully
 */
router.post(
  '/test',
  asyncHandler(async (req: Request, res: Response) => {
    const { text, method = 'rule' } = req.body;

    if (!text || typeof text !== 'string') {
      throw SentimentAnalysisError.invalidText();
    }

    if (method && !['rule', 'naive'].includes(method)) {
      throw SentimentAnalysisError.invalidSentimentMethod(method);
    }

    const result = await sentimentService.testSentimentAnalysis({ text, method });
    return successResponse(res, result, 'Sentiment analysis test completed successfully');
  })
);

/**
 * @swagger
 * /api/v1/sentiment/update-model:
 *   post:
 *     summary: Update the sentiment analysis model with new training data
 *     tags: [Sentiment Analysis]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - examples
 *             properties:
 *               examples:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     text:
 *                       type: string
 *                     label:
 *                       type: string
 *                       enum: [positive, negative, neutral]
 *               saveModel:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       200:
 *         description: Model updated successfully
 */
router.post(
  '/update-model',
  asyncHandler(async (req: Request, res: Response) => {
    const { examples, saveModel = true } = req.body;

    if (!examples || !Array.isArray(examples) || examples.length === 0) {
      throw SentimentAnalysisError.invalidTrainingData();
    }

    const result = await sentimentService.updateModel({ examples, saveModel });
    return successResponse(
      res,
      result,
      `Model successfully updated with ${result.trainingStats.newExamples} new examples`
    );
  })
);

/**
 * @swagger
 * /api/v1/sentiment/model-status:
 *   get:
 *     summary: Get sentiment model status and information
 *     tags: [Sentiment Analysis]
 *     responses:
 *       200:
 *         description: Model information retrieved successfully
 */
router.get(
  '/model-status',
  asyncHandler(async (req: Request, res: Response) => {
    const result = await sentimentService.getModelStatus();
    return successResponse(res, result, 'Model status retrieved successfully');
  })
);

/**
 * @swagger
 * /api/v1/sentiment/compare:
 *   post:
 *     summary: Compare different sentiment analysis methods on the same text
 *     tags: [Sentiment Analysis]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *                 description: Text to analyze
 *     responses:
 *       200:
 *         description: Comparison completed successfully
 */
router.post(
  '/compare',
  asyncHandler(async (req: Request, res: Response) => {
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      throw SentimentAnalysisError.invalidText();
    }

    const result = await sentimentService.compareSentimentMethods({ text });
    return successResponse(res, result, 'Sentiment analysis comparison completed successfully');
  })
);

/**
 * @swagger
 * /api/v1/sentiment/quick-eval:
 *   get:
 *     summary: Quick evaluation with predefined test dataset
 *     tags: [Sentiment Analysis]
 *     parameters:
 *       - in: query
 *         name: dataset
 *         schema:
 *           type: string
 *           enum: [general, marketing, tech]
 *           default: general
 *         description: Which test dataset to use
 *     responses:
 *       200:
 *         description: Quick evaluation results
 */
router.get(
  '/quick-eval',
  asyncHandler(async (req: Request, res: Response) => {
    const { dataset = 'general' } = req.query;

    // Import test datasets
    const { sentimentTestDataset, marketingSpecificTestDataset, techSpecificTestDataset } =
      await import('../data/test-datasets');

    let testCases;
    switch (dataset) {
      case 'marketing':
        testCases = marketingSpecificTestDataset;
        break;
      case 'tech':
        testCases = techSpecificTestDataset;
        break;
      default:
        testCases = sentimentTestDataset;
    }

    const results = await sentimentService.evaluateAccuracy({
      testCases,
      includeComparison: true,
    });

    return successResponse(
      res,
      results,
      `Quick evaluation completed: ${results.overall.accuracy.toFixed(
        2
      )}% accuracy on ${dataset} dataset`
    );
  })
);

/**
 * @swagger
 * /api/v1/sentiment/evaluate:
 *   post:
 *     summary: Evaluate sentiment prediction accuracy
 *     tags: [Sentiment Analysis]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - testCases
 *             properties:
 *               testCases:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     text:
 *                       type: string
 *                     expectedSentiment:
 *                       type: string
 *                       enum: [positive, negative, neutral]
 *               includeComparison:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       200:
 *         description: Evaluation results with accuracy metrics
 */
router.post(
  '/evaluate',
  asyncHandler(async (req: Request, res: Response) => {
    const { testCases, includeComparison = true } = req.body;

    if (!testCases || !Array.isArray(testCases) || testCases.length === 0) {
      throw SentimentAnalysisError.invalidAnalysisArray();
    }

    const results = await sentimentService.evaluateAccuracy({
      testCases,
      includeComparison,
    });

    return successResponse(
      res,
      results,
      `Evaluated ${testCases.length} test cases with ${results.overall.accuracy.toFixed(
        2
      )}% accuracy`
    );
  })
);

export default router;
