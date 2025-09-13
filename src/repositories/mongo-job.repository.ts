/**
 * MongoDB Job Repository Implementation
 * Real implementation of JobRepository using Mongoose
 */

import JobModel, { IJobDocument } from '../models/Job.model';
import { QueryOptions } from './base.repository';
import {
  CreateJobRequest,
  Job,
  JobRepository,
  UpdateJobRequest,
} from './job.repository';

export class MongoJobRepository implements JobRepository {
  // Basic CRUD operations
  async create(data: CreateJobRequest): Promise<Job> {
    const jobData = {
      jobId: data.jobId,
      userId: data.userId,
      name: data.name,
      description: data.description,
      type: data.type,
      query: data.query,
      targetCount: data.targetCount,
      priority: data.priority || 'medium',
      analyzeSentiment: data.analyzeSentiment ?? true,
      campaignId: data.campaignId,
      estimatedTime: data.estimatedTime || 0,
      options: data.options || {},
      status: 'pending' as const,
      currentProgress: 0,
      phase: 'scraping' as const,
      tweetsCollected: 0,
      sentimentAnalyzed: 0,
      savedToDatabase: 0,
      jobErrors: [],
    };

    const job = new JobModel(jobData);
    const savedJob = await job.save();
    return this.documentToJob(savedJob);
  }

  async findById(id: string): Promise<Job | null> {
    try {
      const job = await JobModel.findById(id);
      return job ? this.documentToJob(job) : null;
    } catch {
      return null;
    }
  }

  async findByJobId(jobId: string): Promise<Job | null> {
    try {
      const job = await JobModel.findOne({ jobId });
      return job ? this.documentToJob(job) : null;
    } catch {
      return null;
    }
  }

  async findMany(filter?: Partial<Job>, options?: QueryOptions): Promise<Job[]> {
    const query = JobModel.find(filter || {});

    if (options?.limit) query.limit(options.limit);
    if (options?.offset) query.skip(options.offset);
    if (options?.sortBy && options?.sortOrder) {
      query.sort({ [options.sortBy]: options.sortOrder === 'asc' ? 1 : -1 });
    } else {
      query.sort({ createdAt: -1 }); // Default sort by creation date
    }

    const jobs = await query.exec();
    return jobs.map(job => this.documentToJob(job));
  }

  async update(jobId: string, data: UpdateJobRequest): Promise<Job | null> {
    try {
      const job = await JobModel.findOneAndUpdate(
        { jobId },
        { $set: data },
        { new: true, runValidators: true }
      );
      return job ? this.documentToJob(job) : null;
    } catch {
      return null;
    }
  }

  async delete(jobId: string): Promise<boolean> {
    try {
      const result = await JobModel.findOneAndDelete({ jobId });
      return !!result;
    } catch {
      return false;
    }
  }

  async exists(jobId: string): Promise<boolean> {
    try {
      const count = await JobModel.countDocuments({ jobId });
      return count > 0;
    } catch {
      return false;
    }
  }

  async count(filter?: Partial<Job>): Promise<number> {
    try {
      return await JobModel.countDocuments(filter || {});
    } catch {
      return 0;
    }
  }

  // Job-specific methods
  async findByUserId(userId: string, options?: QueryOptions): Promise<Job[]> {
    const query = JobModel.find({ userId });

    if (options?.limit) query.limit(options.limit);
    if (options?.offset) query.skip(options.offset);
    query.sort({ createdAt: -1 });

    const jobs = await query.exec();
    return jobs.map(job => this.documentToJob(job));
  }

  async findByCampaignId(campaignId: string, options?: QueryOptions): Promise<Job[]> {
    const query = JobModel.find({ campaignId });

    if (options?.limit) query.limit(options.limit);
    if (options?.offset) query.skip(options.offset);
    query.sort({ createdAt: -1 });

    const jobs = await query.exec();
    return jobs.map(job => this.documentToJob(job));
  }

  async findByStatus(status: Job['status'], options?: QueryOptions): Promise<Job[]> {
    const query = JobModel.find({ status });

    if (options?.limit) query.limit(options.limit);
    if (options?.offset) query.skip(options.offset);
    query.sort({ createdAt: -1 });

    const jobs = await query.exec();
    return jobs.map(job => this.documentToJob(job));
  }

  async findActiveJobs(): Promise<Job[]> {
    const jobs = await JobModel.find({
      status: { $in: ['pending', 'running'] }
    }).sort({ priority: 1, createdAt: 1 });

    return jobs.map(job => this.documentToJob(job));
  }

  async findRecentJobs(limit = 50): Promise<Job[]> {
    const jobs = await JobModel.find({})
      .sort({ createdAt: -1 })
      .limit(limit);

    return jobs.map(job => this.documentToJob(job));
  }

  // Status management
  async markAsStarted(jobId: string): Promise<Job | null> {
    try {
      const job = await JobModel.findOneAndUpdate(
        { jobId },
        {
          $set: {
            status: 'running',
            startedAt: new Date(),
          },
        },
        { new: true }
      );
      return job ? this.documentToJob(job) : null;
    } catch {
      return null;
    }
  }

  async markAsCompleted(jobId: string, resultSummary?: Job['resultSummary']): Promise<Job | null> {
    try {
      const updateData: any = {
        status: 'completed',
        phase: 'completed',
        currentProgress: 100,
        completedAt: new Date(),
      };

      if (resultSummary) {
        updateData.resultSummary = resultSummary;
      }

      const job = await JobModel.findOneAndUpdate(
        { jobId },
        { $set: updateData },
        { new: true }
      );
      return job ? this.documentToJob(job) : null;
    } catch {
      return null;
    }
  }

  async markAsFailed(jobId: string, error: string): Promise<Job | null> {
    try {
      const job = await JobModel.findOneAndUpdate(
        { jobId },
        {
          $set: {
            status: 'failed',
            completedAt: new Date(),
          },
          $push: { jobErrors: error },
        },
        { new: true }
      );
      return job ? this.documentToJob(job) : null;
    } catch {
      return null;
    }
  }

  async markAsCancelled(jobId: string): Promise<Job | null> {
    try {
      const job = await JobModel.findOneAndUpdate(
        { jobId },
        {
          $set: {
            status: 'cancelled',
            completedAt: new Date(),
          },
        },
        { new: true }
      );
      return job ? this.documentToJob(job) : null;
    } catch {
      return null;
    }
  }

  async updateProgress(jobId: string, progress: UpdateJobRequest): Promise<Job | null> {
    try {
      const job = await JobModel.findOneAndUpdate(
        { jobId },
        { $set: progress },
        { new: true, runValidators: true }
      );
      return job ? this.documentToJob(job) : null;
    } catch {
      return null;
    }
  }

  async addError(jobId: string, error: string): Promise<Job | null> {
    try {
      const job = await JobModel.findOneAndUpdate(
        { jobId },
        { $push: { jobErrors: error } },
        { new: true }
      );
      return job ? this.documentToJob(job) : null;
    } catch {
      return null;
    }
  }

  // Analytics and statistics
  async getJobStats(): Promise<any> {
    try {
      const stats = await JobModel.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            avgTargetCount: { $avg: '$targetCount' },
            avgTweetsCollected: { $avg: '$tweetsCollected' },
            avgProgress: { $avg: '$currentProgress' },
          },
        },
      ]);

      const totalStats = await JobModel.aggregate([
        {
          $group: {
            _id: null,
            totalJobs: { $sum: 1 },
            totalTweetsCollected: { $sum: '$tweetsCollected' },
            totalSentimentAnalyzed: { $sum: '$sentimentAnalyzed' },
            totalSavedToDatabase: { $sum: '$savedToDatabase' },
            avgEstimatedTime: { $avg: '$estimatedTime' },
          },
        },
      ]);

      return {
        byStatus: stats,
        overall: totalStats[0] || {},
      };
    } catch {
      return { byStatus: [], overall: {} };
    }
  }

  async getUserJobStats(userId: string): Promise<any> {
    try {
      const stats = await JobModel.aggregate([
        { $match: { userId } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            avgTargetCount: { $avg: '$targetCount' },
            avgTweetsCollected: { $avg: '$tweetsCollected' },
          },
        },
      ]);

      const totalStats = await JobModel.aggregate([
        { $match: { userId } },
        {
          $group: {
            _id: null,
            totalJobs: { $sum: 1 },
            totalTweetsCollected: { $sum: '$tweetsCollected' },
          },
        },
      ]);

      return {
        byStatus: stats,
        overall: totalStats[0] || {},
      };
    } catch {
      return { byStatus: [], overall: {} };
    }
  }

  async getCampaignJobStats(campaignId: string): Promise<any> {
    try {
      const stats = await JobModel.aggregate([
        { $match: { campaignId } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalTweetsCollected: { $sum: '$tweetsCollected' },
            totalSentimentAnalyzed: { $sum: '$sentimentAnalyzed' },
          },
        },
      ]);

      return { byStatus: stats };
    } catch {
      return { byStatus: [] };
    }
  }

  // Bulk operations
  async findManyByJobIds(jobIds: string[]): Promise<Job[]> {
    try {
      const jobs = await JobModel.find({ jobId: { $in: jobIds } });
      return jobs.map(job => this.documentToJob(job));
    } catch {
      return [];
    }
  }

  async updateManyByStatus(
    currentStatus: Job['status'],
    updates: UpdateJobRequest
  ): Promise<number> {
    try {
      const result = await JobModel.updateMany(
        { status: currentStatus },
        { $set: updates }
      );
      return result.modifiedCount;
    } catch {
      return 0;
    }
  }

  async deleteManyByStatus(status: Job['status']): Promise<number> {
    try {
      const result = await JobModel.deleteMany({ status });
      return result.deletedCount;
    } catch {
      return 0;
    }
  }

  async deleteOldJobs(daysOld: number): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await JobModel.deleteMany({
        createdAt: { $lt: cutoffDate },
        status: { $in: ['completed', 'failed', 'cancelled'] },
      });

      return result.deletedCount;
    } catch {
      return 0;
    }
  }

  // Helper method to convert MongoDB document to Job domain object
  private documentToJob(doc: IJobDocument): Job {
    return {
      id: (doc._id as any).toString(),
      jobId: doc.jobId,
      userId: doc.userId,
      name: doc.name,
      description: doc.description,
      type: doc.type,
      query: doc.query,
      targetCount: doc.targetCount,
      priority: doc.priority,
      analyzeSentiment: doc.analyzeSentiment,
      campaignId: doc.campaignId,
      status: doc.status,
      currentProgress: doc.currentProgress,
      phase: doc.phase,
      tweetsCollected: doc.tweetsCollected,
      sentimentAnalyzed: doc.sentimentAnalyzed,
      savedToDatabase: doc.savedToDatabase,
      estimatedTime: doc.estimatedTime,
      startedAt: doc.startedAt,
      completedAt: doc.completedAt,
      jobErrors: doc.jobErrors,
      resultSummary: doc.resultSummary,
      options: doc.options,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}