/**
 * Simple Scraping Service - In-memory fallback for development/testing
 * Used when Redis is not available - provides same interface as QueueManager
 */

import { logger } from '../../lib/observability/logger';
import { ScrapingOptions } from '../../types/twitter';
import { TwitterRealScraperService } from '../twitter-scraper.service';

interface SimpleJobProgress {
  jobId: string;
  type: 'hashtag' | 'user' | 'search';
  query: string;
  current: number;
  total: number;
  percentage: number;
  currentBatch: number;
  totalBatches: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  tweetsCollected: number;
  estimatedTimeRemaining: number;
  errors: string[];
  userId?: string;
  startTime?: Date;
  endTime?: Date;
  startedAt?: Date;
  completedAt?: Date;
  throughput?: number;
}

interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  total: number;
}

export class SimpleScrapingService {
  private jobs = new Map<string, SimpleJobProgress>();
  private twitterService: TwitterRealScraperService;

  constructor() {
    this.twitterService = new TwitterRealScraperService();
  }

  async addScrapingJob(
    type: 'hashtag' | 'user' | 'search',
    query: string,
    targetCount: number,
    options: ScrapingOptions = {},
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    priority: string = 'medium',
    userId?: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    analyzeSentiment: boolean = true,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    campaignId?: string
  ): Promise<string> {
    const jobId = `simple-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const job: SimpleJobProgress = {
      jobId,
      type,
      query,
      current: 0,
      total: targetCount,
      percentage: 0,
      currentBatch: 0,
      totalBatches: Math.ceil(targetCount / 25), // Calculate total batches (25 per batch)
      status: 'pending',
      tweetsCollected: 0,
      estimatedTimeRemaining: 0,
      errors: [],
      userId,
      startTime: new Date(),
      startedAt: new Date(),
    };

    this.jobs.set(jobId, job);

    // Start processing immediately (asynchronously)
    setImmediate(() => {
      this.processJob(jobId, options).catch(error => {
        logger.error('Error processing simple job', { jobId, error });
      });
    });

    return jobId;
  }

  getJobProgress(jobId: string): SimpleJobProgress | null {
    return this.jobs.get(jobId) || null;
  }

  getUserJobs(userId: string): SimpleJobProgress[] {
    return Array.from(this.jobs.values()).filter(job => job.userId === userId);
  }

  async cancelJob(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (!job) return false;

    job.status = 'failed';
    job.errors.push('Job cancelled by user');
    job.endTime = new Date();
    job.completedAt = new Date();

    return true;
  }

  async getQueueStats(): Promise<QueueStats> {
    const jobs = Array.from(this.jobs.values());
    return {
      waiting: jobs.filter(j => j.status === 'pending').length,
      active: jobs.filter(j => j.status === 'running').length,
      completed: jobs.filter(j => j.status === 'completed').length,
      failed: jobs.filter(j => j.status === 'failed').length,
      total: jobs.length,
    };
  }

  async getSimpleManagerStats() {
    const queueStats = await this.getQueueStats();
    return {
      queueStats,
      connectionStats: {
        totalConnections: 0,
        totalJobSubscriptions: 0,
        activeJobs: queueStats.active,
      },
      systemHealth: {
        uptime: Date.now() - (this.jobs.size > 0 ? Math.min(...Array.from(this.jobs.values()).map(j => j.startTime?.getTime() || Date.now())) : Date.now()),
        memoryUsage: process.memoryUsage(),
        lastUpdate: new Date(),
      },
    };
  }

  private async processJob(jobId: string, options: ScrapingOptions): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    try {
      job.status = 'running';
      
      // For larger counts, process in chunks to simulate queue behavior
      if (job.total > 50) {
        await this.processJobInBatches(job, options);
      } else {
        await this.processJobImmediate(job, options);
      }

    } catch (error) {
      job.status = 'failed';
      job.errors.push(error instanceof Error ? error.message : String(error));
      job.endTime = new Date();
      job.completedAt = new Date();
      logger.error('Simple job processing failed', { jobId, error });
    }
  }

  private async processJobInBatches(job: SimpleJobProgress, options: ScrapingOptions): Promise<void> {
    const batchSize = 25; // Process in smaller batches
    let totalCollected = 0;
    let currentBatch = 0;

    while (totalCollected < job.total && job.status === 'running') {
      const remainingCount = job.total - totalCollected;
      const currentBatchSize = Math.min(batchSize, remainingCount);
      currentBatch++;

      try {
        let result;
        switch (job.type) {
          case 'hashtag':
            result = await this.twitterService.scrapeByHashtag(job.query, {
              ...options,
              maxTweets: currentBatchSize,
            });
            break;
          case 'user':
            result = await this.twitterService.scrapeByUser(job.query, {
              ...options,
              maxTweets: currentBatchSize,
            });
            break;
          case 'search':
            result = await this.twitterService.scrapeBySearch(job.query, {
              ...options,
              maxTweets: currentBatchSize,
            });
            break;
          default:
            throw new Error(`Unsupported job type: ${job.type}`);
        }

        totalCollected += result.tweets.length;
        job.current = totalCollected;
        job.tweetsCollected = totalCollected;
        job.currentBatch = currentBatch;
        job.percentage = Math.min((totalCollected / job.total) * 100, 100);

        // Update estimated time remaining
        if (job.startTime) {
          const elapsed = Date.now() - job.startTime.getTime();
          const rate = totalCollected / elapsed; // tweets per ms
          const remaining = job.total - totalCollected;
          job.estimatedTimeRemaining = rate > 0 ? remaining / rate : 0;
          job.throughput = rate * 1000; // tweets per second
        }

        // Small delay between batches to simulate real queue behavior
        if (totalCollected < job.total) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (error) {
        job.errors.push(error instanceof Error ? error.message : String(error));
        // Continue with next batch on error
      }
    }

    job.status = totalCollected >= job.total ? 'completed' : 'failed';
    job.endTime = new Date();
    job.completedAt = new Date();
  }

  private async processJobImmediate(job: SimpleJobProgress, options: ScrapingOptions): Promise<void> {
    let result;
    switch (job.type) {
      case 'hashtag':
        result = await this.twitterService.scrapeByHashtag(job.query, {
          ...options,
          maxTweets: job.total,
        });
        break;
      case 'user':
        result = await this.twitterService.scrapeByUser(job.query, {
          ...options,
          maxTweets: job.total,
        });
        break;
      case 'search':
        result = await this.twitterService.scrapeBySearch(job.query, {
          ...options,
          maxTweets: job.total,
        });
        break;
      default:
        throw new Error(`Unsupported job type: ${job.type}`);
    }

    job.current = result.tweets.length;
    job.tweetsCollected = result.tweets.length;
    job.currentBatch = 1;
    job.percentage = (job.current / job.total) * 100;
    job.status = 'completed';
    job.endTime = new Date();
    job.completedAt = new Date();
    
    // Calculate throughput
    if (job.startTime) {
      const elapsed = Date.now() - job.startTime.getTime();
      job.throughput = elapsed > 0 ? (result.tweets.length / elapsed) * 1000 : 0; // tweets per second
    }
  }
}

// Export singleton instance
export const simpleScrapingService = new SimpleScrapingService();
