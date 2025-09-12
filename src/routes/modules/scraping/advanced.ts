import { Request, Response, Router } from 'express';
import { scrapingRateLimit } from '../../../lib/middleware/performance';
import { logger } from '../../../lib/observability/logger';
import { jobPersistenceService } from '../../../services/job-persistence.service';
import { queueManager } from '../../../services/queue/queue-manager.service';
import { simpleScrapingService } from '../../../services/queue/simple-scraping.service';

const router = Router();

// Check if Redis is available
const isRedisAvailable = process.env.REDIS_URL !== undefined;

// Apply rate limiting to all scraping routes
router.use(scrapingRateLimit);

/**
 * @swagger
 * /api/v1/scraping/advanced/job:
 *   post:
 *     tags: [Advanced Scraping]
 *     summary: Create a large-scale scraping job
 *     description: Creates a scraping job that can handle thousands of tweets with real-time progress tracking
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - query
 *               - targetCount
 *               - campaignId
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [hashtag, user, search]
 *                 description: Type of scraping operation
 *               query:
 *                 type: string
 *                 description: Search query (hashtag, username, or search terms)
 *                 example: "technology"
 *               targetCount:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 10000
 *                 description: Number of tweets to scrape
 *                 example: 1000
 *               campaignId:
 *                 type: string
 *                 description: Campaign identifier
 *                 example: "tech_analysis_2024"
 *               analyzeSentiment:
 *                 type: boolean
 *                 default: true
 *                 description: Whether to perform sentiment analysis on scraped tweets
 *               priority:
 *                 type: string
 *                 enum: [urgent, high, medium, low]
 *                 default: medium
 *                 description: Job priority
 *               options:
 *                 type: object
 *                 properties:
 *                   includeReplies:
 *                     type: boolean
 *                     default: false
 *                   includeRetweets:
 *                     type: boolean
 *                     default: false
 *                   maxAgeHours:
 *                     type: number
 *                     description: Maximum age of tweets in hours
 *                   language:
 *                     type: string
 *                     description: Language filter (ISO 639-1 code)
 *     responses:
 *       201:
 *         description: Scraping job created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 jobId:
 *                   type: string
 *                   example: "550e8400-e29b-41d4-a716-446655440000"
 *                 message:
 *                   type: string
 *                   example: "Scraping job created successfully"
 *                 estimatedTime:
 *                   type: number
 *                   description: Estimated completion time in seconds
 *       400:
 *         description: Invalid request parameters
 *       429:
 *         description: Rate limit exceeded
 */
router.post('/job', async (req: Request, res: Response) => {
  try {
    const { 
      type, 
      query, 
      targetCount, 
      campaignId, 
      priority = 'medium', 
      options = {},
      analyzeSentiment = true 
    } = req.body;

    // Validation
    if (!type || !query || !targetCount || !campaignId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: type, query, targetCount, campaignId',
      });
    }

    // Add campaignId to options
    const scrapingOptions = {
      ...options,
      campaingId: campaignId, // Note: keeping the typo from the original interface
    };

    // Extract userId from request (if authenticated)
    const userId = (req as any).user?.id;

    // Choose service based on Redis availability
    let jobId: string;
    if (isRedisAvailable) {
      // Use advanced queue manager with Redis
      jobId = await queueManager.addScrapingJob(
        type,
        query,
        targetCount,
        scrapingOptions,
        priority,
        userId,
        analyzeSentiment,
        campaignId
      );
    } else {
      // Use simple service as fallback
      logger.info('Using simple scraping service (Redis not available)');
      jobId = await simpleScrapingService.addScrapingJob(
        type, 
        query, 
        targetCount, 
        scrapingOptions, 
        priority, 
        userId,
        analyzeSentiment,
        campaignId
      );
    }

    // Estimate completion time (rough calculation)
    const estimatedTime = Math.ceil(targetCount / 10) * 3; // ~3 seconds per batch of 10

    logger.info('Advanced scraping job created', {
      jobId,
      type,
      query,
      targetCount,
      campaignId,
      userId,
    });

    res.status(201).json({
      success: true,
      jobId,
      message: 'Scraping job created successfully',
      estimatedTime,
      websocketUrl: '/socket.io/',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Failed to create scraping job', { error: errorMessage });

    res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

/**
 * @swagger
 * /api/v1/scraping/advanced/job/{jobId}:
 *   get:
 *     tags: [Advanced Scraping]
 *     summary: Get job progress
 *     description: Get the current progress and status of a scraping job
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: Job ID
 *     responses:
 *       200:
 *         description: Job progress retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 progress:
 *                   type: object
 *                   properties:
 *                     jobId:
 *                       type: string
 *                     current:
 *                       type: number
 *                     total:
 *                       type: number
 *                     percentage:
 *                       type: number
 *                     status:
 *                       type: string
 *                       enum: [pending, running, completed, failed, paused]
 *                     tweetsCollected:
 *                       type: number
 *                     estimatedTimeRemaining:
 *                       type: number
 *                     errors:
 *                       type: array
 *                       items:
 *                         type: string
 *       404:
 *         description: Job not found
 */
router.get('/job/:jobId', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;

    // Try queue manager first, then simple service
    let progress = queueManager.getJobProgress(jobId);
    if (!progress) {
      const simpleProgress = simpleScrapingService.getJobProgress(jobId);
      if (simpleProgress) {
        // Convert SimpleJobProgress to ScrapingJobProgress
        progress = {
          ...simpleProgress,
          phase: 'scraping' as const,
          sentimentAnalyzed: 0,
          savedToDatabase: 0,
        };
      }
    }

    if (!progress) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      });
    }

    res.json({
      success: true,
      progress,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Failed to get job progress', { jobId: req.params.jobId, error: errorMessage });

    res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

/**
 * @swagger
 * /api/v1/scraping/advanced/job/{jobId}/cancel:
 *   post:
 *     tags: [Advanced Scraping]
 *     summary: Cancel a scraping job
 *     description: Cancel a running or pending scraping job
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: Job ID
 *     responses:
 *       200:
 *         description: Job cancelled successfully
 *       404:
 *         description: Job not found
 *       403:
 *         description: Not authorized to cancel this job
 */
router.post('/job/:jobId/cancel', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const userId = (req as any).user?.id;

    // Try queue manager first, then simple service
    let success = await queueManager.cancelJob(jobId, userId);
    if (!success) {
      success = await simpleScrapingService.cancelJob(jobId);
    }

    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Job not found or cannot be cancelled',
      });
    }

    logger.info('Job cancelled', { jobId, userId });

    res.json({
      success: true,
      message: 'Job cancelled successfully',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Failed to cancel job', { jobId: req.params.jobId, error: errorMessage });

    res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

/**
 * @swagger
 * /api/v1/scraping/advanced/jobs:
 *   get:
 *     tags: [Advanced Scraping]
 *     summary: Get user's jobs
 *     description: Get all scraping jobs for the authenticated user
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, running, completed, failed, paused]
 *         description: Filter by job status
 *     responses:
 *       200:
 *         description: User jobs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 jobs:
 *                   type: array
 *                   items:
 *                     type: object
 */
router.get('/jobs', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const statusFilter = req.query.status as string;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    // Get jobs from memory (active queue)
    let memoryJobs = queueManager.getUserJobs(userId);
    
    // If no jobs found in queue manager, try simple service
    if (memoryJobs.length === 0) {
      const simpleJobs = simpleScrapingService.getUserJobs(userId);
      memoryJobs = simpleJobs.map(job => ({
        ...job,
        phase: 'scraping' as const,
        sentimentAnalyzed: 0,
        savedToDatabase: 0,
      }));
    }

    // Get jobs from database (persistent storage)
    const persistedJobs = await jobPersistenceService.getUserJobs(userId, {
      limit,
      offset,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });

    // Merge jobs from memory and database, avoiding duplicates
    const allJobsMap = new Map();

    // Add memory jobs first (these are the most current)
    memoryJobs.forEach(job => {
      allJobsMap.set(job.jobId, {
        id: job.jobId,
        jobId: job.jobId,
        userId: userId, // Use the current user ID
        type: 'unknown', // Memory jobs don't have all fields
        query: '',
        targetCount: job.total || 0,
        priority: 'medium',
        analyzeSentiment: true,
        campaignId: undefined,
        status: job.status,
        currentProgress: job.percentage || 0,
        phase: job.phase,
        tweetsCollected: job.tweetsCollected || job.current || 0,
        sentimentAnalyzed: job.sentimentAnalyzed || 0,
        savedToDatabase: job.savedToDatabase || 0,
        estimatedTime: job.estimatedTimeRemaining || 0,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        jobErrors: job.errors || [],
        options: {
          includeReplies: false,
          includeRetweets: false,
        },
        createdAt: job.startedAt || new Date(),
        updatedAt: new Date(),
        source: 'memory',
      });
    });

    // Add database jobs if not already in memory
    persistedJobs.forEach(job => {
      if (!allJobsMap.has(job.jobId)) {
        allJobsMap.set(job.jobId, {
          ...job,
          source: 'database',
        });
      } else {
        // Update with database information if available
        const memoryJob = allJobsMap.get(job.jobId);
        allJobsMap.set(job.jobId, {
          ...memoryJob,
          // Keep memory data for active status, but update from database for historical info
          ...(memoryJob.status === 'pending' || memoryJob.status === 'running' ? {} : {
            status: job.status,
            completedAt: job.completedAt,
            resultSummary: job.resultSummary,
          }),
          source: 'hybrid',
        });
      }
    });

    // Convert to array and sort by creation date
    let jobs = Array.from(allJobsMap.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Apply status filter if provided
    if (statusFilter) {
      jobs = jobs.filter(job => job.status === statusFilter);
    }

    // Apply pagination if needed (since we might have fetched more than needed)
    const totalJobs = jobs.length;
    if (offset > 0 || limit < totalJobs) {
      jobs = jobs.slice(offset, offset + limit);
    }

    res.json({
      success: true,
      jobs,
      count: jobs.length,
      total: totalJobs,
      pagination: {
        offset,
        limit,
        hasMore: offset + limit < totalJobs,
      },
      sources: {
        memory: memoryJobs.length,
        database: persistedJobs.length,
        total: totalJobs,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Failed to get user jobs', { error: errorMessage });

    res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

/**
 * @swagger
 * /api/v1/scraping/advanced/stats:
 *   get:
 *     tags: [Advanced Scraping]
 *     summary: Get queue statistics
 *     description: Get comprehensive statistics about the scraping queue system
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 stats:
 *                   type: object
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    let queueStats;
    
    try {
      // Try queue manager first
      queueStats = await queueManager.getQueueManagerStats();
    } catch {
      // Fall back to simple service
      queueStats = await simpleScrapingService.getSimpleManagerStats();
    }

    // Get database statistics
    const dbStats = await jobPersistenceService.getJobStats();

    const combinedStats = {
      queue: queueStats,
      database: dbStats,
      combined: {
        totalJobsEverCreated: dbStats.overall.totalJobs || 0,
        totalTweetsCollected: dbStats.overall.totalTweetsCollected || 0,
        totalSentimentAnalyzed: dbStats.overall.totalSentimentAnalyzed || 0,
        currentActiveJobs: queueStats.queueStats?.active || 0,
      },
    };

    res.json({
      success: true,
      stats: combinedStats,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Failed to get queue stats', { error: errorMessage });

    res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

/**
 * @swagger
 * /api/v1/scraping/advanced/job/{jobId}/history:
 *   get:
 *     tags: [Advanced Scraping]
 *     summary: Get job history from database
 *     description: Get comprehensive job information from persistent storage
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: Job ID
 *     responses:
 *       200:
 *         description: Job history retrieved successfully
 *       404:
 *         description: Job not found in database
 */
router.get('/job/:jobId/history', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;

    const job = await jobPersistenceService.getJob(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found in database',
      });
    }

    res.json({
      success: true,
      job,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Failed to get job history', { jobId: req.params.jobId, error: errorMessage });

    res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

/**
 * @swagger
 * /api/v1/scraping/advanced/health:
 *   get:
 *     tags: [Advanced Scraping]
 *     summary: Get system health
 *     description: Get health status of the advanced scraping system
 *     responses:
 *       200:
 *         description: Health status retrieved successfully
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const health = await queueManager.healthCheck();

    const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;

    res.status(statusCode).json({
      success: health.status !== 'unhealthy',
      health,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Health check failed', { error: errorMessage });

    res.status(503).json({
      success: false,
      health: {
        status: 'unhealthy',
        error: errorMessage,
      },
    });
  }
});

export default router;
