/**
 * Job Persistence Service
 * Coordinates job data persistence and provides high-level operations
 */

import { logger } from '../lib/observability/logger';
import { QueryOptions } from '../repositories/base.repository';
import { CreateJobRequest, Job, JobRepository, UpdateJobRequest } from '../repositories/job.repository';
import { MongoJobRepository } from '../repositories/mongo-job.repository';

export class JobPersistenceService {
  private jobRepository: JobRepository;

  constructor() {
    this.jobRepository = new MongoJobRepository();
  }

  /**
   * Create and persist a new job
   */
  async createJob(data: CreateJobRequest): Promise<Job> {
    try {
      const job = await this.jobRepository.create(data);
      
      logger.info('Job created and persisted', {
        jobId: job.jobId,
        userId: job.userId,
        type: job.type,
        query: job.query,
        targetCount: job.targetCount,
        campaignId: job.campaignId,
      });

      return job;
    } catch (error) {
      logger.error('Failed to create job', {
        jobId: data.jobId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get job by jobId
   */
  async getJob(jobId: string): Promise<Job | null> {
    try {
      return await this.jobRepository.findByJobId(jobId);
    } catch (error) {
      logger.error('Failed to get job', {
        jobId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Get jobs for a user
   */
  async getUserJobs(userId: string, options?: QueryOptions): Promise<Job[]> {
    try {
      return await this.jobRepository.findByUserId(userId, options);
    } catch (error) {
      logger.error('Failed to get user jobs', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Get jobs for a campaign
   */
  async getCampaignJobs(campaignId: string, options?: QueryOptions): Promise<Job[]> {
    try {
      return await this.jobRepository.findByCampaignId(campaignId, options);
    } catch (error) {
      logger.error('Failed to get campaign jobs', {
        campaignId,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Get jobs by status
   */
  async getJobsByStatus(status: Job['status'], options?: QueryOptions): Promise<Job[]> {
    try {
      return await this.jobRepository.findByStatus(status, options);
    } catch (error) {
      logger.error('Failed to get jobs by status', {
        status,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Get all active jobs (pending or running)
   */
  async getActiveJobs(): Promise<Job[]> {
    try {
      return await this.jobRepository.findActiveJobs();
    } catch (error) {
      logger.error('Failed to get active jobs', {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Get recent jobs
   */
  async getRecentJobs(limit = 50): Promise<Job[]> {
    try {
      return await this.jobRepository.findRecentJobs(limit);
    } catch (error) {
      logger.error('Failed to get recent jobs', {
        limit,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Update job progress and status
   */
  async updateJobProgress(jobId: string, progress: UpdateJobRequest): Promise<Job | null> {
    try {
      const updatedJob = await this.jobRepository.updateProgress(jobId, progress);
      
      if (updatedJob) {
        logger.debug('Job progress updated', {
          jobId,
          status: updatedJob.status,
          phase: updatedJob.phase,
          progress: updatedJob.currentProgress,
          tweetsCollected: updatedJob.tweetsCollected,
        });
      }

      return updatedJob;
    } catch (error) {
      logger.error('Failed to update job progress', {
        jobId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Mark job as started
   */
  async startJob(jobId: string): Promise<Job | null> {
    try {
      const job = await this.jobRepository.markAsStarted(jobId);
      
      if (job) {
        logger.info('Job marked as started', {
          jobId,
          startedAt: job.startedAt,
        });
      }

      return job;
    } catch (error) {
      logger.error('Failed to start job', {
        jobId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Mark job as completed
   */
  async completeJob(jobId: string, resultSummary?: Job['resultSummary']): Promise<Job | null> {
    try {
      const job = await this.jobRepository.markAsCompleted(jobId, resultSummary);
      
      if (job) {
        logger.info('Job marked as completed', {
          jobId,
          completedAt: job.completedAt,
          tweetsCollected: job.tweetsCollected,
          sentimentAnalyzed: job.sentimentAnalyzed,
          savedToDatabase: job.savedToDatabase,
        });
      }

      return job;
    } catch (error) {
      logger.error('Failed to complete job', {
        jobId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Mark job as failed
   */
  async failJob(jobId: string, errorMessage: string): Promise<Job | null> {
    try {
      const job = await this.jobRepository.markAsFailed(jobId, errorMessage);
      
      if (job) {
        logger.warn('Job marked as failed', {
          jobId,
          error: errorMessage,
          completedAt: job.completedAt,
        });
      }

      return job;
    } catch (error) {
      logger.error('Failed to mark job as failed', {
        jobId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string): Promise<Job | null> {
    try {
      const job = await this.jobRepository.markAsCancelled(jobId);
      
      if (job) {
        logger.info('Job cancelled', {
          jobId,
          cancelledAt: job.completedAt,
        });
      }

      return job;
    } catch (error) {
      logger.error('Failed to cancel job', {
        jobId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Add error to job
   */
  async addJobError(jobId: string, errorMessage: string): Promise<Job | null> {
    try {
      const job = await this.jobRepository.addError(jobId, errorMessage);
      
      if (job) {
        logger.warn('Error added to job', {
          jobId,
          error: errorMessage,
          totalErrors: job.jobErrors.length,
        });
      }

      return job;
    } catch (error) {
      logger.error('Failed to add error to job', {
        jobId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Check if job exists
   */
  async jobExists(jobId: string): Promise<boolean> {
    try {
      return await this.jobRepository.exists(jobId);
    } catch (error) {
      logger.error('Failed to check job existence', {
        jobId,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Get job statistics
   */
  async getJobStats(): Promise<any> {
    try {
      return await this.jobRepository.getJobStats();
    } catch (error) {
      logger.error('Failed to get job stats', {
        error: error instanceof Error ? error.message : String(error),
      });
      return { byStatus: [], overall: {} };
    }
  }

  /**
   * Get user job statistics
   */
  async getUserJobStats(userId: string): Promise<any> {
    try {
      return await this.jobRepository.getUserJobStats(userId);
    } catch (error) {
      logger.error('Failed to get user job stats', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      return { byStatus: [], overall: {} };
    }
  }

  /**
   * Get campaign job statistics
   */
  async getCampaignJobStats(campaignId: string): Promise<any> {
    try {
      return await this.jobRepository.getCampaignJobStats(campaignId);
    } catch (error) {
      logger.error('Failed to get campaign job stats', {
        campaignId,
        error: error instanceof Error ? error.message : String(error),
      });
      return { byStatus: [] };
    }
  }

  /**
   * Delete old completed/failed jobs
   */
  async cleanupOldJobs(daysOld = 30): Promise<number> {
    try {
      const deletedCount = await this.jobRepository.deleteOldJobs(daysOld);
      
      if (deletedCount > 0) {
        logger.info('Old jobs cleaned up', {
          deletedCount,
          daysOld,
        });
      }

      return deletedCount;
    } catch (error) {
      logger.error('Failed to cleanup old jobs', {
        daysOld,
        error: error instanceof Error ? error.message : String(error),
      });
      return 0;
    }
  }

  /**
   * Get multiple jobs by IDs
   */
  async getJobsByIds(jobIds: string[]): Promise<Job[]> {
    try {
      return await this.jobRepository.findManyByJobIds(jobIds);
    } catch (error) {
      logger.error('Failed to get jobs by IDs', {
        jobIds: jobIds.length,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Count jobs by filter
   */
  async countJobs(filter?: Partial<Job>): Promise<number> {
    try {
      return await this.jobRepository.count(filter);
    } catch (error) {
      logger.error('Failed to count jobs', {
        filter,
        error: error instanceof Error ? error.message : String(error),
      });
      return 0;
    }
  }

  /**
   * Find jobs with pagination
   */
  async findJobs(filter?: Partial<Job>, options?: QueryOptions): Promise<Job[]> {
    try {
      return await this.jobRepository.findMany(filter, options);
    } catch (error) {
      logger.error('Failed to find jobs', {
        filter,
        options,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }
}

// Export singleton instance
export const jobPersistenceService = new JobPersistenceService();