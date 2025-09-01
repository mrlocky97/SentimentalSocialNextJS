/**
 * Sentiment Analysis Routes Module
 * Unified route definitions with middleware and handlers
 */

import { Router } from "express";
import { asyncHandler } from "../../../core/errors/error-handler";

// Import handlers
import {
  advancedCompareHandler,
  analyzeMultiLangHandler,
  analyzeTextHandler,
  analyzeTweetHandler,
  analyzeWithMethodHandler,
  batchAnalyzeHandler,
  compareMethodsHandler,
  getBenchmarksHandler,
  getDemoHandler,
  getMetricsHandler,
  getModelStatusHandler,
  getTestHandler,
  initializeBertHandler,
  trainModelHandler,
} from "./handlers";

// Import middleware
import {
  limitRequestSize,
  logSentimentRequest,
  sentimentRateLimit,
  setApiVersion,
  setSentimentSecurityHeaders,
  validateBatchInput,
  validateContentType,
  validateMethodInput,
  validateMultiLangInput,
  validateTextInput,
  validateTrainingInput,
  validateTweetInput,
  validateBertInitInput,
} from "./middleware";

const router = Router();

// Apply common middleware to all routes
router.use(setApiVersion);
router.use(setSentimentSecurityHeaders);
router.use(validateContentType);
router.use(limitRequestSize);
router.use(logSentimentRequest);
router.use(sentimentRateLimit);

/**
 * @swagger
 * components:
 *   schemas:
 *     SentimentAnalysisResult:
 *       type: object
 *       properties:
 *         tweetId:
 *           type: string
 *           description: Unique identifier for the tweet
 *         content:
 *           type: string
 *           description: The analyzed text content
 *         analysis:
 *           type: object
 *           properties:
 *             sentiment:
 *               type: string
 *               enum: [positive, negative, neutral]
 *               description: Overall sentiment classification
 *             confidence:
 *               type: number
 *               minimum: 0
 *               maximum: 1
 *               description: Confidence score of the analysis
 *             method:
 *               type: string
 *               enum: [rule, naive, hybrid]
 *               description: Analysis method used
 *         brandMentions:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               brand:
 *                 type: string
 *               sentiment:
 *                 type: string
 *                 enum: [positive, negative, neutral]
 *               confidence:
 *                 type: number
 *         hashtagSentiments:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               hashtag:
 *                 type: string
 *               sentiment:
 *                 type: string
 *                 enum: [positive, negative, neutral]
 *               frequency:
 *                 type: number
 *         influenceScore:
 *           type: number
 *           description: Influence score based on engagement metrics
 *         marketingInsights:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *               description:
 *                 type: string
 *               impact:
 *                 type: string
 *                 enum: [low, medium, high]
 *         analyzedAt:
 *           type: string
 *           format: date-time
 *
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         error:
 *           type: string
 *           description: Error message
 *         details:
 *           type: object
 *           description: Additional error details
 *         timestamp:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/sentiment/test:
 *   get:
 *     tags: [Sentiment Analysis]
 *     summary: Test sentiment analysis API availability
 *     description: Check if the sentiment analysis service is operational
 *     responses:
 *       200:
 *         description: Service is operational
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Sentiment Analysis API is operational"
 *                 version:
 *                   type: string
 *                   example: "3.0.0"
 *                 methods:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["hybrid", "rule-based", "ml"]
 *                 features:
 *                   type: array
 *                   items:
 *                     type: string
 */
router.get("/test", asyncHandler(getTestHandler));

/**
 * @swagger
 * /api/sentiment/analyze:
 *   post:
 *     tags: [Sentiment Analysis]
 *     summary: Analyze text sentiment (main endpoint)
 *     description: Analyze sentiment of text using the default analysis method
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
 *                 minLength: 1
 *                 maxLength: 5000
 *                 description: Text to analyze
 *                 example: "I love this product! It's amazing and works perfectly."
 *     responses:
 *       200:
 *         description: Sentiment analysis completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/SentimentAnalysisResult'
 *                 message:
 *                   type: string
 *                   example: "Sentiment analysis completed"
 *       400:
 *         description: Invalid input data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       429:
 *         description: Rate limit exceeded
 */
router.post("/analyze", validateTextInput, asyncHandler(analyzeTextHandler));

/**
 * @swagger
 * /api/sentiment/batch:
 *   post:
 *     tags: [Sentiment Analysis]
 *     summary: Analyze multiple texts (batch processing)
 *     description: Analyze sentiment of multiple texts in a single request
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - texts
 *             properties:
 *               texts:
 *                 type: array
 *                 items:
 *                   type: string
 *                   minLength: 1
 *                   maxLength: 1000
 *                 minItems: 1
 *                 maxItems: 100
 *                 description: Array of texts to analyze
 *                 example: ["I love this!", "This is okay", "I hate this"]
 *     responses:
 *       200:
 *         description: Batch sentiment analysis completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SentimentAnalysisResult'
 *                 message:
 *                   type: string
 */
router.post("/batch", validateBatchInput, asyncHandler(batchAnalyzeHandler));

/**
 * @swagger
 * /api/sentiment/analyze-text:
 *   post:
 *     tags: [Sentiment Analysis]
 *     summary: Analyze text sentiment (detailed endpoint)
 *     description: Detailed sentiment analysis with comprehensive results
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
 *                 minLength: 1
 *                 maxLength: 5000
 *                 description: Text to analyze
 *                 example: "I love this product! It's amazing and works perfectly."
 *     responses:
 *       200:
 *         description: Sentiment analysis completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/SentimentAnalysisResult'
 *                 message:
 *                   type: string
 *                   example: "Sentiment analysis completed"
 *       400:
 *         description: Invalid input data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       429:
 *         description: Rate limit exceeded
 */
router.post(
  "/analyze-text",
  validateTextInput,
  asyncHandler(analyzeTextHandler),
);

/**
 * @swagger
 * /api/sentiment/analyze-multilang:
 *   post:
 *     tags: [Sentiment Analysis]
 *     summary: Analyze text sentiment with multi-language support
 *     description: Analyze sentiment with automatic or specified language detection
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
 *                 minLength: 1
 *                 maxLength: 5000
 *                 description: Text to analyze
 *                 example: "Me encanta este producto! Es fantástico."
 *               language:
 *                 type: string
 *                 enum: [en, es, fr, de, it, pt, auto]
 *                 description: Language code or 'auto' for detection
 *                 example: "es"
 *     responses:
 *       200:
 *         description: Multi-language sentiment analysis completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     sentiment:
 *                       type: string
 *                       enum: [positive, negative, neutral]
 *                     confidence:
 *                       type: number
 *                     language:
 *                       type: string
 *                     detectedLanguage:
 *                       type: string
 *                 message:
 *                   type: string
 */
router.post(
  "/analyze-multilang",
  validateMultiLangInput,
  asyncHandler(analyzeMultiLangHandler),
);

/**
 * @swagger
 * /api/sentiment/analyze-tweet:
 *   post:
 *     tags: [Sentiment Analysis]
 *     summary: Analyze tweet sentiment
 *     description: Analyze sentiment of a complete tweet object with metadata
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
 *                 required:
 *                   - content
 *                   - tweetId
 *                 properties:
 *                   tweetId:
 *                     type: string
 *                     description: Unique tweet identifier
 *                   content:
 *                     type: string
 *                     maxLength: 280
 *                     description: Tweet text content
 *                   author:
 *                     type: object
 *                     properties:
 *                       username:
 *                         type: string
 *                       verified:
 *                         type: boolean
 *                       followersCount:
 *                         type: number
 *                   metrics:
 *                     type: object
 *                     properties:
 *                       likes:
 *                         type: number
 *                       retweets:
 *                         type: number
 *                       replies:
 *                         type: number
 *     responses:
 *       200:
 *         description: Tweet sentiment analysis completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/SentimentAnalysisResult'
 *                 message:
 *                   type: string
 */
router.post(
  "/analyze-tweet",
  validateTweetInput,
  asyncHandler(analyzeTweetHandler),
);

/**
 * @swagger
 * /api/sentiment/analyze-batch:
 *   post:
 *     tags: [Sentiment Analysis]
 *     summary: Batch analyze tweets
 *     description: Analyze sentiment for multiple tweets in a single request
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
 *                 minItems: 1
 *                 maxItems: 100
 *                 items:
 *                   type: object
 *                   required:
 *                     - content
 *                     - tweetId
 *                   properties:
 *                     tweetId:
 *                       type: string
 *                     content:
 *                       type: string
 *                       maxLength: 280
 *     responses:
 *       200:
 *         description: Batch analysis completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SentimentAnalysisResult'
 *                 message:
 *                   type: string
 */
router.post(
  "/analyze-batch",
  validateBatchInput,
  asyncHandler(batchAnalyzeHandler),
);

/**
 * @swagger
 * /api/sentiment/compare-methods:
 *   post:
 *     tags: [Sentiment Analysis]
 *     summary: Compare sentiment analysis methods
 *     description: Compare results from different sentiment analysis methods
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
 *                 minLength: 1
 *                 maxLength: 5000
 *                 example: "This product is okay, nothing special but works fine."
 *     responses:
 *       200:
 *         description: Method comparison completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     text:
 *                       type: string
 *                     methods:
 *                       type: object
 *                       properties:
 *                         ruleBased:
 *                           type: object
 *                         naiveBayes:
 *                           type: object
 *                         hybrid:
 *                           type: object
 *                     summary:
 *                       type: object
 *                       properties:
 *                         agreement:
 *                           type: boolean
 *                         bestMethod:
 *                           type: string
 *                 message:
 *                   type: string
 */
router.post(
  "/compare-methods",
  validateTextInput,
  asyncHandler(compareMethodsHandler),
);

/**
 * @swagger
 * /api/sentiment/advanced-compare:
 *   post:
 *     tags: [Sentiment Analysis]
 *     summary: Advanced method comparison
 *     description: Advanced comparison with detailed metrics and analysis
 */
router.post(
  "/advanced-compare",
  validateTextInput,
  asyncHandler(advancedCompareHandler),
);

/**
 * @swagger
 * /api/sentiment/analyze-method:
 *   post:
 *     tags: [Sentiment Analysis]
 *     summary: Analyze with specific method
 *     description: Analyze sentiment using a specific analysis method
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *               - method
 *             properties:
 *               text:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 5000
 *               method:
 *                 type: string
 *                 enum: [rule, naive]
 *                 description: Analysis method to use
 *                 example: "rule"
 *     responses:
 *       200:
 *         description: Analysis with specific method completed
 */
router.post(
  "/analyze-method",
  validateMethodInput,
  asyncHandler(analyzeWithMethodHandler),
);

/**
 * @swagger
 * /api/sentiment/demo:
 *   get:
 *     tags: [Sentiment Analysis]
 *     summary: Get demo analysis
 *     description: Get demonstration analysis results with example data
 *     responses:
 *       200:
 *         description: Demo analysis retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SentimentAnalysisResult'
 *                 message:
 *                   type: string
 */
router.get("/demo", asyncHandler(getDemoHandler));

/**
 * @swagger
 * /api/sentiment/train:
 *   post:
 *     tags: [Sentiment Analysis]
 *     summary: Train sentiment model
 *     description: Train or update the sentiment analysis model with new examples
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
 *                 minItems: 10
 *                 maxItems: 10000
 *                 items:
 *                   type: object
 *                   required:
 *                     - text
 *                     - label
 *                   properties:
 *                     text:
 *                       type: string
 *                       minLength: 1
 *                       maxLength: 1000
 *                     label:
 *                       type: string
 *                       enum: [positive, negative, neutral]
 *               saveModel:
 *                 type: boolean
 *                 default: true
 *                 description: Whether to save the trained model
 *     responses:
 *       200:
 *         description: Model training completed
 */
router.post("/train", validateTrainingInput, asyncHandler(trainModelHandler));

/**
 * @swagger
 * /api/sentiment/model-status:
 *   get:
 *     tags: [Sentiment Analysis]
 *     summary: Get model status
 *     description: Get current status and performance metrics of sentiment models
 *     responses:
 *       200:
 *         description: Model status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     accuracy:
 *                       type: number
 *                     totalExamples:
 *                       type: number
 *                     trainingDate:
 *                       type: string
 *                       format: date-time
 *                     version:
 *                       type: string
 *                 message:
 *                   type: string
 */
router.get("/model-status", asyncHandler(getModelStatusHandler));

/**
 * @swagger
 * /api/sentiment/benchmarks:
 *   get:
 *     tags: [Sentiment Analysis]
 *     summary: Get performance benchmarks
 *     description: Get performance benchmarks and metrics
 */
router.get("/benchmarks", asyncHandler(getBenchmarksHandler));

/**
 * @swagger
 * /api/sentiment/metrics:
 *   get:
 *     tags: [Sentiment Analysis]
 *     summary: Get analysis metrics
 *     description: Get comprehensive analysis metrics and statistics
 */
router.get("/metrics", asyncHandler(getMetricsHandler));

/**
 * @swagger
 * /api/sentiment/initialize-bert:
 *   post:
 *     tags: [Sentiment Analysis]
 *     summary: Initialize BERT model for enhanced sentiment analysis
 *     description: Load and initialize the BERT model for superior sentiment analysis
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               enableAfterLoad:
 *                 type: boolean
 *                 default: true
 *                 description: Whether to enable BERT analysis immediately after loading
 *     responses:
 *       200:
 *         description: BERT model initialized successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     initialized:
 *                       type: boolean
 *                     enabled:
 *                       type: boolean
 *                     modelType:
 *                       type: string
 *                     version:
 *                       type: string
 *                 message:
 *                   type: string
 *       500:
 *         description: Failed to initialize BERT model
 */
router.post(
  "/initialize-bert",
  validateBertInitInput,
  asyncHandler(initializeBertHandler),
);

/**
 * @swagger
 * /api/sentiment/initialize-bert:
 *   post:
 *     tags: [Sentiment Analysis]
 *     summary: Initialize BERT model for enhanced sentiment analysis
 *     description: Load and initialize the BERT model for superior sentiment analysis
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               enableAfterLoad:
 *                 type: boolean
 *                 default: true
 *                 description: Whether to enable BERT analysis immediately after loading
 *     responses:
 *       200:
 *         description: BERT model initialized successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     initialized:
 *                       type: boolean
 *                     enabled:
 *                       type: boolean
 *                     modelType:
 *                       type: string
 *                     version:
 *                       type: string
 *                 message:
 *                   type: string
 *       500:
 *         description: Failed to initialize BERT model
 */
router.post(
  "/initialize-bert",
  validateBertInitInput,
  asyncHandler(initializeBertHandler),
);

// Temporary test endpoint for tweet analysis without middleware issues
router.post(
  "/test-tweet",
  asyncHandler(
    async (req: import("express").Request, res: import("express").Response) => {
      try {
        const { tweet } = req.body;
        if (!tweet || !tweet.content) {
          return res.status(400).json({ error: "Tweet content required" });
        }

        // Normalize id to tweetId if needed
        if (!tweet.tweetId && tweet.id) {
          tweet.tweetId = tweet.id;
        }

        // Import sentiment service
        const { sentimentService } = await import(
          "../../../services/sentiment.service"
        );
        const result = await sentimentService.analyzeTweet(tweet);

        return res.json({
          success: true,
          data: result,
          message: "Test tweet analysis completed with frozen model v3.0",
        });
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        return res.status(500).json({ error: errorMessage });
      }
    },
  ),
);

export default router;
