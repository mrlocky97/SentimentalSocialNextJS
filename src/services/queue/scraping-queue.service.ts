/**
 * Advanced Scraping Queue Service with Redis
 * Supports unlimited scaling, progress tracking, and multi-user concurrency
 */

import Bull, { Job, Queue } from 'bull';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../lib/observability/logger';
import { processSentimentAnalysis } from '../../routes/modules/scraping/helpers';
import { ScrapingOptions, ScrapingResult } from '../../types/twitter';
import { TweetDatabaseService } from '../tweet-database.service';
import { TweetSentimentAnalysisManager } from '../tweet-sentiment-analysis.manager.service';
import { TwitterRealScraperService } from '../twitter-scraper.service';

export interface ScrapingJobData {
  id: string;
  userId?: string;
  type: 'hashtag' | 'user' | 'search';
  query: string;
  targetCount: number;
  options: ScrapingOptions;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  createdAt: Date;
  batchSize: number;
  analyzeSentiment?: boolean;
  campaignId?: string;
}

export interface ScrapingJobProgress {
  jobId: string;
  current: number;
  total: number;
  percentage: number;
  currentBatch: number;
  totalBatches: number;
  tweetsCollected: number;
  phase: 'scraping' | 'analyzing' | 'saving' | 'completed' | 'failed';
  sentimentAnalyzed: number;
  savedToDatabase: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused';
  errors: string[];
  estimatedTimeRemaining?: number;
  startedAt?: Date;
  completedAt?: Date;
  throughput?: number; // tweets per second
}

export interface ScrapingJobResult extends ScrapingResult {
  jobId: string;
  userId?: string;
  progress: ScrapingJobProgress;
  metadata: {
    totalProcessingTime: number;
    averageBatchTime: number;
    actualThroughput: number;
    retryCount: number;
  };
}

/**
 * Redis-based queue system for scalable scraping operations
 */
export class ScrapingQueueService {
  private queue: Queue<ScrapingJobData> | null = null;
  private scraper: TwitterRealScraperService;
  private sentimentManager: TweetSentimentAnalysisManager;
  private tweetDatabaseService: TweetDatabaseService;
  private activeJobs = new Map<string, ScrapingJobProgress>();
  private readonly REDIS_URL: string;
  private isRedisAvailable: boolean = false;
  private initializationPromise: Promise<void>;

  constructor() {
    this.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
    this.scraper = new TwitterRealScraperService();
    this.sentimentManager = new TweetSentimentAnalysisManager();
    this.tweetDatabaseService = new TweetDatabaseService();

    // Initialize Redis connection asynchronously
    this.initializationPromise = this.initializeRedisQueue();
  }

  /**
   * Ensure Redis queue is initialized before using
   */
  private async ensureInitialized(): Promise<void> {
    await this.initializationPromise;
  }

  /**
   * Initialize Redis queue connection
   */
  private async initializeRedisQueue(): Promise<void> {
    try {
      // Initialize Redis queue with advanced configuration
      this.queue = new Bull('scraping-jobs', this.REDIS_URL, {
        defaultJobOptions: {
          removeOnComplete: 100, // Keep last 100 completed jobs
          removeOnFail: 50, // Keep last 50 failed jobs
          attempts: 3, // Retry failed jobs up to 3 times
          backoff: {
            type: 'exponential',
            delay: 2000, // Start with 2s, then 4s, 8s
          },
        },
        settings: {
          stalledInterval: 30 * 1000, // Check for stalled jobs every 30s
          maxStalledCount: 1, // Mark job as failed after 1 stall
        },
        redis: {
          // Add Redis-specific options to handle connection issues
          maxRetriesPerRequest: 1, // Reduce to 1 for faster failure detection
          connectTimeout: 2000, // 2 second connection timeout
          commandTimeout: 2000, // 2 second command timeout  
          enableReadyCheck: false,
          lazyConnect: true, // Don't connect immediately
          reconnectOnError: (err) => {
            const targetError = 'READONLY';
            return err.message.includes(targetError);
          },
        },
      });

      // Test the connection with timeout
      const connectionPromise = this.queue.isReady();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Redis connection timeout')), 2000)
      );

      await Promise.race([connectionPromise, timeoutPromise]);
      this.isRedisAvailable = true;

      this.setupJobProcessors();
      this.setupEventListeners();

      logger.info('Redis queue initialized successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Provide more helpful messaging based on error type
      if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('Redis connection timeout')) {
        logger.info('Redis server not available, using fallback service for scraping operations', {
          note: 'This is normal for development. See docs/REDIS_SETUP.md to enable Redis',
          redisUrl: this.REDIS_URL
        });
      } else if (errorMessage.includes('max retries')) {
        logger.info('Redis connection limit reached, using fallback service', {
          note: 'Check if Redis server is running. See docs/REDIS_SETUP.md for setup instructions'
        });
      } else {
        logger.warn('Redis not available, queue service disabled', { 
          error: errorMessage,
          redisUrl: this.REDIS_URL,
          note: 'Using fallback service for scraping operations'
        });
      }
      
      this.queue = null;
      this.isRedisAvailable = false;
    }
  }

  /**
   * Add a new scraping job to the queue
   */
  async addScrapingJob(
    type: 'hashtag' | 'user' | 'search',
    query: string,
    targetCount: number,
    options: ScrapingOptions = {},
    priority: 'urgent' | 'high' | 'medium' | 'low' = 'medium',
    userId?: string,
    analyzeSentiment: boolean = true,
    campaignId?: string
  ): Promise<string> {
    await this.ensureInitialized();
    
    if (!this.queue) {
      throw new Error('Redis queue not available. Please check Redis connection.');
    }

    const jobId = uuidv4();
    const batchSize = this.calculateOptimalBatchSize(targetCount);

    const jobData: ScrapingJobData = {
      id: jobId,
      userId,
      type,
      query,
      targetCount,
      options,
      priority,
      createdAt: new Date(),
      batchSize,
      analyzeSentiment,
      campaignId,
    };

    // Add job with priority (lower number = higher priority)
    const priorityMap = {
      urgent: 1,
      high: 2,
      medium: 3,
      low: 4,
    };

    await this.queue.add(jobData, {
      priority: priorityMap[priority],
      jobId,
    });

    logger.info('Job added to queue', { jobId, priority });

    // Initialize progress tracking
    const progress: ScrapingJobProgress = {
      jobId,
      current: 0,
      total: targetCount,
      percentage: 0,
      currentBatch: 0,
      totalBatches: Math.ceil(targetCount / batchSize),
      tweetsCollected: 0,
      phase: 'scraping',
      sentimentAnalyzed: 0,
      savedToDatabase: 0,
      status: 'pending',
      errors: [],
    };

    this.activeJobs.set(jobId, progress);

    logger.info('Scraping job added to queue', {
      jobId,
      type,
      query,
      targetCount,
      batchSize,
      priority,
      userId,
    });

    return jobId;
  }

  /**
   * Get job progress
   */
  getJobProgress(jobId: string): ScrapingJobProgress | null {
    return this.activeJobs.get(jobId) || null;
  }

  /**
   * Get all active jobs for a user
   */
  getUserJobs(userId: string): ScrapingJobProgress[] {
    const userJobs: ScrapingJobProgress[] = [];

    this.activeJobs.forEach((progress) => {
      if (this.getJobUserId(progress.jobId) === userId) {
        userJobs.push(progress);
      }
    });

    return userJobs;
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    await this.ensureInitialized();
    
    if (!this.queue) {
      return false;
    }

    try {
      const job = await this.queue.getJob(jobId);
      if (job) {
        await job.remove();

        const progress = this.activeJobs.get(jobId);
        if (progress) {
          progress.status = 'failed';
          progress.errors.push('Job cancelled by user');
          progress.completedAt = new Date();
        }

        this.activeJobs.delete(jobId);
        logger.info('Job cancelled', { jobId });
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Error cancelling job', { jobId, error });
      return false;
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    await this.ensureInitialized();
    
    if (!this.queue || !this.isRedisAvailable) {
      return {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        total: 0,
        redisAvailable: false,
      };
    }

    try {
      const waiting = await this.queue.getWaiting();
      const active = await this.queue.getActive();
      const completed = await this.queue.getCompleted();
      const failed = await this.queue.getFailed();

      return {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        total: waiting.length + active.length + completed.length + failed.length,
        redisAvailable: true,
      };
    } catch (error) {
      // Only log as debug during startup to avoid spam
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Check if it's a connection-related error (common during startup)
      if (errorMessage.includes('max retries') || errorMessage.includes('connection')) {
        logger.debug('Redis connection not available for queue stats', { error: errorMessage });
      } else {
        logger.warn('Failed to get queue stats', { error: errorMessage });
      }
      
      // Mark Redis as unavailable for future calls
      this.isRedisAvailable = false;
      
      return {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        total: 0,
        redisAvailable: false,
      };
    }
  }

  /**
   * Setup job processors
   */
  private setupJobProcessors(): void {
    if (!this.queue) return;

    // Process jobs concurrently (up to 5 jobs at once)
    this.queue.process(5, async (job: Job<ScrapingJobData>) => {
      return this.processScrapingJob(job);
    });
  }

  /**
   * Setup event listeners for job lifecycle
   */
  private setupEventListeners(): void {
    if (!this.queue) return;

    this.queue.on('active', (job: Job<ScrapingJobData>) => {
      const progress = this.activeJobs.get(job.data.id);
      if (progress) {
        progress.status = 'running';
        progress.startedAt = new Date();
      }
      logger.info('Job started', { jobId: job.data.id });
    });

    this.queue.on('completed', (job: Job<ScrapingJobData>, result: ScrapingJobResult) => {
      const progress = this.activeJobs.get(job.data.id);
      if (progress) {
        progress.status = 'completed';
        progress.completedAt = new Date();
        progress.percentage = 100;
      }
      logger.info('Job completed', { jobId: job.data.id, tweetsCollected: result.tweets.length });
    });

    this.queue.on('failed', (job: Job<ScrapingJobData>, error: Error) => {
      const progress = this.activeJobs.get(job.data.id);
      if (progress) {
        progress.status = 'failed';
        progress.errors.push(error.message);
        progress.completedAt = new Date();
      }
      logger.error('Job failed', { jobId: job.data.id, error: error.message });
    });

    this.queue.on('stalled', (job: Job<ScrapingJobData>) => {
      logger.warn('Job stalled', { jobId: job.data.id });
    });
  }

  /**
   * Process individual scraping job with batch processing
   */
  private async processScrapingJob(job: Job<ScrapingJobData>): Promise<ScrapingJobResult> {
    const { id: jobId, type, query, targetCount, options, batchSize } = job.data;
    const startTime = Date.now();

    const progress = this.activeJobs.get(jobId);
    if (!progress) {
      throw new Error(`Progress tracking not found for job ${jobId}`);
    }

    const allTweets: any[] = [];
    const allErrors: string[] = [];
    const batchTimes: number[] = [];

    try {
      const totalBatches = Math.ceil(targetCount / batchSize);
      progress.totalBatches = totalBatches;

      logger.info('Starting batch processing', {
        jobId,
        targetCount,
        batchSize,
        totalBatches,
      });

      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        // Check if job was cancelled
        if (this.queue) {
          const currentJob = await this.queue.getJob(jobId);
          if (!currentJob) {
            throw new Error('Job was cancelled');
          }
        }

        const batchStartTime = Date.now();
        const remainingTweets = targetCount - allTweets.length;
        const currentBatchSize = Math.min(batchSize, remainingTweets);

        progress.currentBatch = batchIndex + 1;
        progress.current = allTweets.length;
        progress.percentage = Math.round((allTweets.length / targetCount) * 100);

        // Update job progress in Redis
        if (this.queue) {
          await job.progress(progress.percentage);
        }

        logger.info('Processing batch', {
          jobId,
          batchIndex: batchIndex + 1,
          totalBatches,
          currentBatchSize,
          collected: allTweets.length,
          remaining: remainingTweets,
        });

        try {
          // Execute batch scraping with adaptive delay
          const batchResult = await this.executeBatchScraping(
            type,
            query,
            currentBatchSize,
            options,
            batchIndex
          );

          allTweets.push(...batchResult.tweets);
          if (batchResult.errors.length > 0) {
            allErrors.push(...batchResult.errors);
            progress.errors.push(...batchResult.errors);
          }

          const batchTime = Date.now() - batchStartTime;
          batchTimes.push(batchTime);

          // Update progress with throughput calculation
          const averageBatchTime = batchTimes.reduce((a, b) => a + b, 0) / batchTimes.length;
          const remainingBatches = totalBatches - (batchIndex + 1);
          progress.estimatedTimeRemaining = (remainingBatches * averageBatchTime) / 1000; // seconds
          progress.throughput = allTweets.length / ((Date.now() - startTime) / 1000);

          progress.tweetsCollected = allTweets.length;

          logger.info('Batch completed', {
            jobId,
            batchIndex: batchIndex + 1,
            batchTime,
            tweetsInBatch: batchResult.tweets.length,
            totalCollected: allTweets.length,
            throughput: progress.throughput,
          });

          // Break if we have enough tweets
          if (allTweets.length >= targetCount) {
            logger.info('Target count reached', {
              jobId,
              collected: allTweets.length,
              target: targetCount,
            });
            break;
          }

          // Adaptive delay between batches to avoid rate limiting
          await this.adaptiveDelay(batchIndex, allErrors.length);
        } catch (batchError) {
          const errorMessage =
            batchError instanceof Error ? batchError.message : String(batchError);
          allErrors.push(`Batch ${batchIndex + 1}: ${errorMessage}`);
          progress.errors.push(errorMessage);

          logger.warn('Batch failed', {
            jobId,
            batchIndex: batchIndex + 1,
            error: errorMessage,
          });

          // If it's a rate limit error, increase delay significantly
          if (errorMessage.includes('429') || errorMessage.includes('Rate limit')) {
            await this.adaptiveDelay(batchIndex, allErrors.length, true);
          }
        }
      }

      // Process sentiment analysis if enabled
      let tweetsWithSentiment = allTweets.slice(0, targetCount);
      let sentimentSummary = null;
      
      if (job.data.analyzeSentiment && tweetsWithSentiment.length > 0) {
        try {
          logger.info('Starting sentiment analysis', {
            jobId,
            tweetCount: tweetsWithSentiment.length,
          });

          // Update progress to analyzing phase
          progress.phase = 'analyzing';
          progress.percentage = 75; // Scraping is done, now analyzing
          if (this.queue) {
            await job.progress(progress.percentage);
          }

          // Perform sentiment analysis in batches
          const analysisResults = await this.sentimentManager.analyzeTweetsBatch(tweetsWithSentiment);
          sentimentSummary = this.sentimentManager.generateStatistics(analysisResults);
          
          // Apply sentiment analysis to tweets
          tweetsWithSentiment = processSentimentAnalysis(tweetsWithSentiment, analysisResults);
          progress.sentimentAnalyzed = tweetsWithSentiment.length;

          logger.info('Sentiment analysis completed', {
            jobId,
            analyzedTweets: tweetsWithSentiment.length,
            sentimentSummary,
          });
        } catch (sentimentError) {
          logger.warn('Sentiment analysis failed, continuing without sentiment data', {
            error: sentimentError,
            jobId,
            tweetCount: tweetsWithSentiment.length,
          });
          allErrors.push(`Sentiment analysis failed: ${sentimentError instanceof Error ? sentimentError.message : String(sentimentError)}`);
        }
      }

      // Save to database if campaignId is provided
      if (job.data.campaignId && tweetsWithSentiment.length > 0) {
        try {
          logger.info('Starting database save', {
            jobId,
            campaignId: job.data.campaignId,
            tweetCount: tweetsWithSentiment.length,
          });

          // Update progress to saving phase
          progress.phase = 'saving';
          progress.percentage = 90; // Analysis done, now saving
          if (this.queue) {
            await job.progress(progress.percentage);
          }

          const saveResult = await this.tweetDatabaseService.saveTweetsBulk(
            tweetsWithSentiment, 
            job.data.campaignId
          );

          progress.savedToDatabase = saveResult.saved;

          logger.info('Database save completed', {
            jobId,
            success: saveResult.success,
            saved: saveResult.saved,
            errors: saveResult.errors,
            errorMessages: saveResult.errorMessages,
          });

          if (!saveResult.success && saveResult.errorMessages.length > 0) {
            allErrors.push(...saveResult.errorMessages);
          }
        } catch (dbError) {
          logger.error('Database save failed', {
            error: dbError,
            jobId,
            campaignId: job.data.campaignId,
            tweetsCount: tweetsWithSentiment.length,
          });
          allErrors.push(`Database save failed: ${dbError instanceof Error ? dbError.message : String(dbError)}`);
        }
      }

      // Mark as completed
      progress.phase = 'completed';
      progress.percentage = 100;
      if (this.queue) {
        await job.progress(progress.percentage);
      }

      const totalTime = Date.now() - startTime;
      const finalResult: ScrapingJobResult = {
        jobId,
        userId: job.data.userId,
        tweets: tweetsWithSentiment,
        totalFound: allTweets.length,
        totalScraped: tweetsWithSentiment.length,
        errors: allErrors,
        rateLimit: {
          remaining: 0,
          resetTime: new Date(),
        },
        progress,
        metadata: {
          totalProcessingTime: totalTime,
          averageBatchTime: batchTimes.reduce((a, b) => a + b, 0) / batchTimes.length,
          actualThroughput: allTweets.length / (totalTime / 1000),
          retryCount: job.attemptsMade,
        },
      };

      logger.info('Job processing completed', {
        jobId,
        totalTime,
        tweetsCollected: finalResult.tweets.length,
        averageBatchTime: finalResult.metadata.averageBatchTime,
        throughput: finalResult.metadata.actualThroughput,
      });

      return finalResult;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      progress.status = 'failed';
      progress.errors.push(errorMessage);
      progress.completedAt = new Date();

      logger.error('Job processing failed', {
        jobId,
        error: errorMessage,
        tweetsCollected: allTweets.length,
      });

      throw error;
    }
  }

  /**
   * Execute batch scraping with retry logic
   */
  private async executeBatchScraping(
    type: 'hashtag' | 'user' | 'search',
    query: string,
    batchSize: number,
    options: ScrapingOptions,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _batchIndex: number
  ): Promise<ScrapingResult> {
    const batchOptions = {
      ...options,
      maxTweets: batchSize,
    };

    switch (type) {
      case 'hashtag':
        return await this.scraper.scrapeByHashtag(query, batchOptions);
      case 'user':
        return await this.scraper.scrapeByUser(query, batchOptions);
      case 'search':
        return await this.scraper.scrapeBySearch(query, batchOptions);
      default:
        throw new Error(`Unsupported scraping type: ${type}`);
    }
  }

  /**
   * Calculate optimal batch size based on target count
   */
  private calculateOptimalBatchSize(targetCount: number): number {
    if (targetCount <= 50) return 10;
    if (targetCount <= 200) return 20;
    if (targetCount <= 500) return 25;
    if (targetCount <= 1000) return 30;
    return 50; // For very large scraping jobs
  }

  /**
   * Adaptive delay between batches to avoid rate limiting
   */
  private async adaptiveDelay(
    batchIndex: number,
    errorCount: number,
    isRateLimited = false
  ): Promise<void> {
    let delay = 2000; // Base delay of 2 seconds

    // Increase delay based on batch index (gradual slowdown)
    delay += batchIndex * 500;

    // Increase delay based on error count
    delay += errorCount * 1000;

    // Significant delay if rate limited
    if (isRateLimited) {
      delay += 30000; // Add 30 seconds for rate limit
    }

    // Cap maximum delay at 2 minutes
    delay = Math.min(delay, 120000);

    logger.debug('Applying adaptive delay', {
      batchIndex,
      errorCount,
      isRateLimited,
      delayMs: delay,
    });

    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  /**
   * Get user ID for a job (helper method)
   */
  private getJobUserId(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _jobId: string
  ): string | undefined {
    // This would need to be implemented based on your job storage
    // For now, returning undefined
    return undefined;
  }

  /**
   * Cleanup method
   */
  async close(): Promise<void> {
    try {
      if (this.queue) {
        await this.queue.close();
        this.queue = null;
      }
      this.activeJobs.clear();
      logger.info('ScrapingQueueService closed successfully');
    } catch (error) {
      logger.error('Error closing ScrapingQueueService', { error });
      // Don't re-throw to avoid unhandled promise rejection
    }
  }
}
