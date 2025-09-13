/**
 * Job Repository Interface
 * Defines operations for job data persistence
 */

import { QueryOptions } from './base.repository';

export interface Job {
  id?: string;
  jobId: string;
  userId?: string;
  name?: string;
  description?: string;
  type: 'hashtag' | 'user' | 'search';
  query: string;
  targetCount: number;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  analyzeSentiment: boolean;
  campaignId?: string;
  
  // Status and progress
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused';
  currentProgress: number;
  phase: 'scraping' | 'analyzing' | 'saving' | 'completed';
  
  // Counts
  tweetsCollected: number;
  sentimentAnalyzed: number;
  savedToDatabase: number;
  
  // Timing
  estimatedTime: number;
  startedAt?: Date;
  completedAt?: Date;
  
  // Results and errors
  jobErrors: string[];
  resultSummary?: {
    totalFound: number;
    totalScraped: number;
    sentimentDistribution?: {
      positive: number;
      negative: number;
      neutral: number;
    };
    rateLimit?: {
      remaining: number;
      resetTime: Date;
    };
  };
  
  // Options
  options: {
    includeReplies?: boolean;
    includeRetweets?: boolean;
    maxAgeHours?: number;
    language?: string;
  };
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateJobRequest {
  jobId: string;
  userId?: string;
  name?: string;
  description?: string;
  type: 'hashtag' | 'user' | 'search';
  query: string;
  targetCount: number;
  priority?: 'urgent' | 'high' | 'medium' | 'low';
  analyzeSentiment?: boolean;
  campaignId?: string;
  estimatedTime?: number;
  options?: {
    includeReplies?: boolean;
    includeRetweets?: boolean;
    maxAgeHours?: number;
    language?: string;
  };
}

export interface UpdateJobRequest {
  name?: string;
  description?: string;
  status?: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused';
  currentProgress?: number;
  phase?: 'scraping' | 'analyzing' | 'saving' | 'completed';
  tweetsCollected?: number;
  sentimentAnalyzed?: number;
  savedToDatabase?: number;
  startedAt?: Date;
  completedAt?: Date;
  jobErrors?: string[];
  resultSummary?: Job['resultSummary'];
}

export interface JobRepository {
  // Basic CRUD operations
  create(data: CreateJobRequest): Promise<Job>;
  findById(id: string): Promise<Job | null>;
  findByJobId(jobId: string): Promise<Job | null>;
  findMany(filter?: Partial<Job>, options?: QueryOptions): Promise<Job[]>;
  update(jobId: string, data: UpdateJobRequest): Promise<Job | null>;
  delete(jobId: string): Promise<boolean>;
  exists(jobId: string): Promise<boolean>;
  count(filter?: Partial<Job>): Promise<number>;

  // Job-specific methods
  findByUserId(userId: string, options?: QueryOptions): Promise<Job[]>;
  findByCampaignId(campaignId: string, options?: QueryOptions): Promise<Job[]>;
  findByStatus(status: Job['status'], options?: QueryOptions): Promise<Job[]>;
  findActiveJobs(): Promise<Job[]>;
  findRecentJobs(limit?: number): Promise<Job[]>;

  // Status management
  markAsStarted(jobId: string): Promise<Job | null>;
  markAsCompleted(jobId: string, resultSummary?: Job['resultSummary']): Promise<Job | null>;
  markAsFailed(jobId: string, error: string): Promise<Job | null>;
  markAsCancelled(jobId: string): Promise<Job | null>;
  updateProgress(jobId: string, progress: UpdateJobRequest): Promise<Job | null>;
  addError(jobId: string, error: string): Promise<Job | null>;

  // Analytics and statistics
  getJobStats(): Promise<any>;
  getUserJobStats(userId: string): Promise<any>;
  getCampaignJobStats(campaignId: string): Promise<any>;

  // Bulk operations
  findManyByJobIds(jobIds: string[]): Promise<Job[]>;
  updateManyByStatus(currentStatus: Job['status'], updates: UpdateJobRequest): Promise<number>;
  deleteManyByStatus(status: Job['status']): Promise<number>;
  deleteOldJobs(daysOld: number): Promise<number>;
}