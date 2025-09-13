/**
 * Queue Manager - Central orchestrator for scraping operations
 * Integrates queue service with WebSocket progress tracking
 */

import { logger } from '../../lib/observability/logger';
import { ScrapingOptions } from '../../types/twitter';
import { jobPersistenceService } from '../job-persistence.service';
import { ProgressWebSocketService } from '../websocket/progress-websocket.service';
import { ScrapingJobProgress, ScrapingQueueService } from './scraping-queue.service';
import { SimpleScrapingService } from './simple-scraping.service';

export interface QueueManagerStats {
  queueStats: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    total: number;
  };
  connectionStats: {
    totalConnections: number;
    totalJobSubscriptions: number;
    activeJobs: number;
  };
  systemHealth: {
    uptime: number;
    memoryUsage: NodeJS.MemoryUsage;
    lastUpdate: Date;
  };
}

/**
 * Central manager for scraping queue operations with real-time progress
 */
export class QueueManager {
  private queueService: ScrapingQueueService;
  private fallbackService: SimpleScrapingService;
  private websocketService: ProgressWebSocketService | null = null;
  private progressUpdateInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;
  private startTime = Date.now();

  constructor() {
    this.queueService = new ScrapingQueueService();
    this.fallbackService = new SimpleScrapingService();
  }

  /**
   * Initialize the queue manager with WebSocket support
   */
  async initialize(websocketService?: ProgressWebSocketService): Promise<void> {
    if (this.isInitialized) {
      logger.warn('Queue manager already initialized');
      return;
    }

    if (websocketService) {
      this.websocketService = websocketService;
      this.setupProgressTracking();
    }

    this.isInitialized = true;
    logger.info('Queue manager initialized', {
      websocketEnabled: !!this.websocketService,
    });
  }

  /**
   * Add a new scraping job with automatic progress tracking
   */
  async addScrapingJob(
    type: 'hashtag' | 'user' | 'search',
    query: string,
    targetCount: number,
    options: ScrapingOptions = {},
    priority: 'urgent' | 'high' | 'medium' | 'low' = 'medium',
    userId?: string,
    analyzeSentiment: boolean = true,
    campaignId?: string,
    name?: string,
    description?: string
  ): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('Queue manager not initialized. Call initialize() first.');
    }

    // Validate input parameters
    this.validateJobInput(type, query, targetCount);

    let jobId: string;

    // Try Redis first, fallback to simple service
    if (await this.isQueueServiceAvailable()) {
      jobId = await this.queueService.addScrapingJob(
        type,
        query,
        targetCount,
        options,
        priority,
        userId,
        analyzeSentiment,
        campaignId
      );
      logger.info('Job added to Redis queue', { jobId });
    } else {
      jobId = await this.fallbackService.addScrapingJob(
        type,
        query,
        targetCount,
        options,
        priority,
        userId,
        analyzeSentiment,
        campaignId
      );
      logger.info('Job added to fallback service (Redis unavailable)', { jobId });
    }

    // Persist job to database
    try {
      const estimatedTime = Math.ceil(targetCount / 10) * 3; // ~3 seconds per batch of 10
      
      await jobPersistenceService.createJob({
        jobId,
        userId,
        name,
        description,
        type,
        query,
        targetCount,
        priority,
        analyzeSentiment,
        campaignId,
        estimatedTime,
        options: {
          includeReplies: options.includeReplies,
          includeRetweets: options.includeRetweets,
          maxAgeHours: options.maxAgeHours,
          language: options.language,
        },
      });

      logger.info('Job persisted to database', { jobId });
    } catch (error) {
      // Log error but don't fail the job creation
      logger.error('Failed to persist job to database', {
        jobId,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Send immediate job creation notification via WebSocket
    if (this.websocketService) {
      const initialProgress = this.getJobProgress(jobId);
      if (initialProgress) {
        this.websocketService.broadcastProgressUpdate(jobId, initialProgress);
      }
    }

    logger.info('Scraping job added through queue manager', {
      jobId,
      type,
      query,
      targetCount,
      priority,
      userId,
    });

    return jobId;
  }

  /**
   * Get job progress with enhanced information
   */
  getJobProgress(jobId: string): ScrapingJobProgress | null {
    // Try Redis first, then fallback
    const redisProgress = this.queueService.getJobProgress(jobId);
    if (redisProgress) {
      return redisProgress;
    }

    // Convert simple progress to ScrapingJobProgress format
    const simpleProgress = this.fallbackService.getJobProgress(jobId);
    if (simpleProgress) {
      return {
        jobId: simpleProgress.jobId,
        current: simpleProgress.current,
        total: simpleProgress.total,
        percentage: simpleProgress.percentage,
        currentBatch: simpleProgress.currentBatch,
        totalBatches: simpleProgress.totalBatches,
        tweetsCollected: simpleProgress.tweetsCollected,
        phase: 'scraping' as const,
        sentimentAnalyzed: 0,
        savedToDatabase: 0,
        status: simpleProgress.status,
        errors: simpleProgress.errors,
        estimatedTimeRemaining: simpleProgress.estimatedTimeRemaining,
        startedAt: simpleProgress.startedAt,
        completedAt: simpleProgress.completedAt,
        throughput: simpleProgress.throughput,
      };
    }

    return null;
  }

  /**
   * Get all jobs for a specific user
   */
  getUserJobs(userId: string): ScrapingJobProgress[] {
    // Try Redis first
    const redisJobs = this.queueService.getUserJobs(userId);
    if (redisJobs.length > 0) {
      return redisJobs;
    }

    // Fallback to simple service and convert format
    const simpleJobs = this.fallbackService.getUserJobs(userId);
    return simpleJobs.map(job => ({
      jobId: job.jobId,
      current: job.current,
      total: job.total,
      percentage: job.percentage,
      currentBatch: job.currentBatch,
      totalBatches: job.totalBatches,
      tweetsCollected: job.tweetsCollected,
      phase: 'scraping' as const,
      sentimentAnalyzed: 0,
      savedToDatabase: 0,
      status: job.status,
      errors: job.errors,
      estimatedTimeRemaining: job.estimatedTimeRemaining,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      throughput: job.throughput,
    }));
  }

  /**
   * Cancel a job and notify subscribers
   */
  async cancelJob(jobId: string, userId?: string): Promise<boolean> {
    // Optional: Add user permission check here
    if (userId) {
      const userJobs = this.getUserJobs(userId);
      const hasPermission = userJobs.some(job => job.jobId === jobId);
      if (!hasPermission) {
        logger.warn('User attempted to cancel job without permission', {
          jobId,
          userId,
        });
        return false;
      }
    }

    // Try Redis first, then fallback
    let success = await this.queueService.cancelJob(jobId);
    if (!success) {
      success = await this.fallbackService.cancelJob(jobId);
    }

    if (success && this.websocketService) {
      this.websocketService.broadcastJobFailure(jobId, 'Job cancelled by user');
    }

    return success;
  }

  /**
   * Get comprehensive queue and system statistics
   */
  async getQueueManagerStats(): Promise<QueueManagerStats> {
    let queueStats;
    
    // Try Redis first, then fallback
    if (await this.isQueueServiceAvailable()) {
      queueStats = await this.queueService.getQueueStats();
    } else {
      // Use fallback service stats
      const fallbackStats = await this.fallbackService.getQueueStats();
      queueStats = {
        waiting: fallbackStats.waiting,
        active: fallbackStats.active,
        completed: fallbackStats.completed,
        failed: fallbackStats.failed,
        total: fallbackStats.total,
      };
    }

    const connectionStats = this.websocketService?.getConnectionStats() || {
      totalConnections: 0,
      totalJobSubscriptions: 0,
      activeJobs: 0,
    };

    return {
      queueStats,
      connectionStats,
      systemHealth: {
        uptime: Date.now() - this.startTime,
        memoryUsage: process.memoryUsage(),
        lastUpdate: new Date(),
      },
    };
  }

  /**
   * Check if the queue service is available and functional
   */
  private async isQueueServiceAvailable(): Promise<boolean> {
    try {
      // First check if Redis was marked as available during initialization
      // This avoids unnecessary connection attempts
      const stats = await this.queueService.getQueueStats();
      return stats.redisAvailable === true;
    } catch (error) {
      // If there's any error (including Redis connection issues), return false
      // Use debug level to avoid spam in logs
      logger.debug('Queue service availability check failed', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return false;
    }
  }

  /**
   * Setup periodic progress tracking and broadcasting
   */
  private setupProgressTracking(): void {
    if (!this.websocketService) return;

    // Update progress every 2 seconds, but only if Redis is available
    this.progressUpdateInterval = setInterval(async () => {
      try {
        // Check if Redis queue is available before attempting operations
        if (await this.isQueueServiceAvailable()) {
          await this.broadcastAllActiveProgress();
        } else {
          // If Redis is not available, we skip this interval
          logger.debug('Skipping progress tracking - Redis queue not available');
        }
      } catch (error) {
        logger.error('Error in progress tracking interval', { error });
      }
    }, 2000);

    logger.info('Progress tracking interval established');
  }

  /**
   * Broadcast progress for all active jobs
   */
  private async broadcastAllActiveProgress(): Promise<void> {
    if (!this.websocketService) return;

    const queueStats = await this.queueService.getQueueStats();
    
    // Only proceed if there are active jobs
    if (queueStats.active === 0) return;

    // Get all active job progresses
    // Note: This would need to be implemented in ScrapingQueueService
    // For now, we'll rely on the individual job progress updates
  }

  /**
   * Validate job input parameters
   */
  private validateJobInput(
    type: 'hashtag' | 'user' | 'search',
    query: string,
    targetCount: number
  ): void {
    if (!type || !['hashtag', 'user', 'search'].includes(type)) {
      throw new Error('Invalid scraping type. Must be hashtag, user, or search.');
    }

    if (!query || query.trim().length === 0) {
      throw new Error('Query cannot be empty.');
    }

    if (targetCount <= 0) {
      throw new Error('Target count must be greater than 0.');
    }

    if (targetCount > 10000) {
      throw new Error('Target count cannot exceed 10,000 tweets per job.');
    }

    // Additional validation based on type
    switch (type) {
      case 'hashtag':
        if (query.length > 100) {
          throw new Error('Hashtag query too long (max 100 characters).');
        }
        break;
      case 'user':
        if (query.length > 50) {
          throw new Error('Username too long (max 50 characters).');
        }
        break;
      case 'search':
        if (query.length > 200) {
          throw new Error('Search query too long (max 200 characters).');
        }
        break;
    }
  }

  /**
   * Health check for the queue manager
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: any;
  }> {
    try {
      const stats = await this.getQueueManagerStats();
      
      // Define health criteria
      const memoryUsagePercent = (stats.systemHealth.memoryUsage.heapUsed / stats.systemHealth.memoryUsage.heapTotal) * 100;
      const isHealthy = memoryUsagePercent < 85 && stats.queueStats.failed < stats.queueStats.total * 0.1;
      
      return {
        status: isHealthy ? 'healthy' : 'degraded',
        details: {
          ...stats,
          memoryUsagePercent,
          isInitialized: this.isInitialized,
          websocketEnabled: !!this.websocketService,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : String(error),
          isInitialized: this.isInitialized,
        },
      };
    }
  }

  /**
   * Emergency shutdown - cancel all jobs and close connections
   */
  async emergencyShutdown(): Promise<void> {
    logger.warn('Emergency shutdown initiated');

    try {
      // Stop progress tracking
      if (this.progressUpdateInterval) {
        clearInterval(this.progressUpdateInterval);
        this.progressUpdateInterval = null;
      }

      // Broadcast shutdown notification
      if (this.websocketService) {
        try {
          this.websocketService.broadcastSystemNotification(
            'System maintenance in progress. All active jobs will be paused.',
            'warning'
          );
        } catch (error) {
          logger.warn('Failed to broadcast shutdown notification', { error });
        }
      }

      // Close services with error handling
      try {
        await this.queueService.close();
      } catch (error) {
        logger.error('Error closing queue service', { error });
      }

      if (this.websocketService) {
        try {
          await this.websocketService.close();
        } catch (error) {
          logger.error('Error closing WebSocket service', { error });
        }
      }

      this.isInitialized = false;
      logger.info('Emergency shutdown completed');

    } catch (error) {
      logger.error('Error during emergency shutdown', { error });
      // Don't re-throw to avoid unhandled promise rejection
    }
  }

  /**
   * Graceful shutdown - wait for current jobs to complete
   */
  async gracefulShutdown(timeoutMs = 300000): Promise<void> { // 5 minutes default
    logger.info('Graceful shutdown initiated', { timeoutMs });

    const startTime = Date.now();

    try {
      // Notify clients about shutdown
      if (this.websocketService) {
        try {
          this.websocketService.broadcastSystemNotification(
            'System shutdown initiated. Current jobs will complete, new jobs will be rejected.',
            'info'
          );
        } catch (error) {
          logger.warn('Failed to notify clients about shutdown', { error });
        }
      }

      // Wait for active jobs to complete or timeout
      while (Date.now() - startTime < timeoutMs) {
        try {
          const stats = await this.getQueueManagerStats();
          if (stats.queueStats.active === 0) {
            logger.info('All jobs completed, proceeding with shutdown');
            break;
          }

          logger.info('Waiting for jobs to complete', {
            activeJobs: stats.queueStats.active,
            elapsed: Date.now() - startTime,
          });
        } catch (error) {
          logger.warn('Error checking queue stats during shutdown', { error });
          // Continue with shutdown process even if stats check fails
          break;
        }

        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      }

      // Proceed with shutdown
      await this.emergencyShutdown();

    } catch (error) {
      logger.error('Error during graceful shutdown, falling back to emergency shutdown', { error });
      try {
        await this.emergencyShutdown();
      } catch (emergencyError) {
        logger.error('Error during emergency shutdown', { error: emergencyError });
        // Don't throw here to avoid unhandled promise rejection
      }
    }
  }
}

// Singleton instance
export const queueManager = new QueueManager();
