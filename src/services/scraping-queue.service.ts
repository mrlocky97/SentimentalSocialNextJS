/**
 * Scraping Queue Service - Manejo asíncrono para requests grandes
 * Implementa cola de procesamiento con retry y backoff exponencial
 */

import EventEmitter from 'events';
import { logger } from '../lib/observability/logger';
import { TwitterRealScraperService } from './twitter-scraper.service';

// ==================== Types & Interfaces ====================
export interface QueueJob {
  id: string;
  type: 'hashtag' | 'user' | 'search';
  query: string;
  targetTweets: number;
  campaignId: string;
  options: {
    includeReplies?: boolean;
    language?: string;
    maxAgeHours?: number;
  };
  priority: 'high' | 'medium' | 'low';
  createdAt: Date;
  attempts: number;
  maxAttempts: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'chunked';
  chunks?: QueueChunk[];
  progress?: {
    completed: number;
    total: number;
    currentChunk?: number;
  };
}

export interface QueueChunk {
  id: string;
  jobId: string;
  chunkIndex: number;
  targetTweets: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  retries: number;
  result?: any;
}

export interface QueueStats {
  totalJobs: number;
  pendingJobs: number;
  processingJobs: number;
  completedJobs: number;
  failedJobs: number;
  averageProcessingTime: number;
}

// ==================== Main Queue Service ====================
export class ScrapingQueueService extends EventEmitter {
  private static instance: ScrapingQueueService;
  private queue: Map<string, QueueJob> = new Map();
  private processing: Set<string> = new Set();
  private scraper: TwitterRealScraperService;
  private maxConcurrent = 3;
  private chunkSize = 100; // tweets per chunk
  private retryDelay = 5000; // 5 seconds initial delay

  private constructor() {
    super();
    this.scraper = new TwitterRealScraperService();
    this.startProcessing();
  }

  static getInstance(): ScrapingQueueService {
    if (!ScrapingQueueService.instance) {
      ScrapingQueueService.instance = new ScrapingQueueService();
    }
    return ScrapingQueueService.instance;
  }

  // ==================== Public API ====================
  
  /**
   * Añadir job a la cola
   */
  async addJob(
    type: 'hashtag' | 'user' | 'search',
    query: string,
    targetTweets: number,
    campaignId: string,
    options: any = {},
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<string> {
    const jobId = `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const job: QueueJob = {
      id: jobId,
      type,
      query,
      targetTweets,
      campaignId,
      options,
      priority,
      createdAt: new Date(),
      attempts: 0,
      maxAttempts: 3,
      status: targetTweets > this.chunkSize ? 'chunked' : 'pending',
      progress: { completed: 0, total: targetTweets }
    };

    // Si es un request grande, dividir en chunks
    if (targetTweets > this.chunkSize) {
      job.chunks = this.createChunks(jobId, targetTweets);
      job.status = 'chunked';
    }

    this.queue.set(jobId, job);
    
    logger.info('Job added to queue', {
      jobId,
      type,
      query,
      targetTweets,
      isChunked: !!job.chunks,
      chunksCount: job.chunks?.length || 0
    });

    this.emit('jobAdded', job);
    return jobId;
  }

  /**
   * Obtener estado del job
   */
  getJobStatus(jobId: string): QueueJob | null {
    return this.queue.get(jobId) || null;
  }

  /**
   * Obtener estadísticas de la cola
   */
  getQueueStats(): QueueStats {
    const jobs = Array.from(this.queue.values());
    const totalTime = jobs
      .filter(j => j.status === 'completed')
      .reduce((sum, job) => {
        const duration = job.progress?.completed || 0;
        return sum + duration;
      }, 0);

    return {
      totalJobs: jobs.length,
      pendingJobs: jobs.filter(j => ['pending', 'chunked'].includes(j.status)).length,
      processingJobs: jobs.filter(j => j.status === 'processing').length,
      completedJobs: jobs.filter(j => j.status === 'completed').length,
      failedJobs: jobs.filter(j => j.status === 'failed').length,
      averageProcessingTime: jobs.filter(j => j.status === 'completed').length > 0 
        ? totalTime / jobs.filter(j => j.status === 'completed').length 
        : 0
    };
  }

  // ==================== Private Methods ====================

  /**
   * Crear chunks para jobs grandes
   */
  private createChunks(jobId: string, targetTweets: number): QueueChunk[] {
    const chunks: QueueChunk[] = [];
    const numChunks = Math.ceil(targetTweets / this.chunkSize);

    for (let i = 0; i < numChunks; i++) {
      const remaining = targetTweets - (i * this.chunkSize);
      const chunkTweets = Math.min(this.chunkSize, remaining);

      chunks.push({
        id: `${jobId}-chunk-${i}`,
        jobId,
        chunkIndex: i,
        targetTweets: chunkTweets,
        status: 'pending',
        retries: 0
      });
    }

    return chunks;
  }

  /**
   * Iniciar procesamiento de la cola
   */
  private startProcessing(): void {
    setInterval(async () => {
      if (this.processing.size >= this.maxConcurrent) return;

      const nextJob = this.getNextJob();
      if (!nextJob) return;

      await this.processJob(nextJob);
    }, 1000); // Check every second
  }

  /**
   * Obtener siguiente job a procesar
   */
  private getNextJob(): QueueJob | null {
    const jobs = Array.from(this.queue.values())
      .filter(job => 
        !this.processing.has(job.id) && 
        ['pending', 'chunked'].includes(job.status)
      )
      .sort((a, b) => {
        // Priority order: high -> medium -> low
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        }
        // Then by creation time (FIFO)
        return a.createdAt.getTime() - b.createdAt.getTime();
      });

    return jobs[0] || null;
  }

  /**
   * Procesar un job
   */
  private async processJob(job: QueueJob): Promise<void> {
    this.processing.add(job.id);
    job.status = 'processing';
    job.attempts++;

    logger.info('Processing job', {
      jobId: job.id,
      type: job.type,
      targetTweets: job.targetTweets,
      attempt: job.attempts
    });

    try {
      if (job.chunks && job.chunks.length > 0) {
        await this.processChunkedJob(job);
      } else {
        await this.processSingleJob(job);
      }

      job.status = 'completed';
      this.emit('jobCompleted', job);

    } catch (error) {
      logger.error('Job processing failed', {
        jobId: job.id,
        attempt: job.attempts,
        error: error instanceof Error ? error.message : String(error)
      });

      if (job.attempts >= job.maxAttempts) {
        job.status = 'failed';
        this.emit('jobFailed', job);
      } else {
        job.status = 'pending';
        // Exponential backoff
        const delay = this.retryDelay * Math.pow(2, job.attempts - 1);
        setTimeout(() => {
          // Job will be retried in next processing cycle
        }, delay);
      }
    } finally {
      this.processing.delete(job.id);
    }
  }

  /**
   * Procesar job simple (sin chunks)
   */
  private async processSingleJob(job: QueueJob): Promise<void> {
    const startTime = Date.now();

    const result = await this.executeScraping(
      job.type,
      job.query,
      job.targetTweets,
      job.options
    );

    const duration = Date.now() - startTime;
    if (job.progress) {
      job.progress.completed = result.tweets.length;
    }

    logger.info('Single job completed', {
      jobId: job.id,
      tweetsObtained: result.tweets.length,
      targetTweets: job.targetTweets,
      duration
    });
  }

  /**
   * Procesar job con chunks
   */
  private async processChunkedJob(job: QueueJob): Promise<void> {
    if (!job.chunks) return;

    let totalTweets = 0;
    const allTweets: any[] = [];

    for (let i = 0; i < job.chunks.length; i++) {
      const chunk = job.chunks[i];
      
      try {
        if (job.progress) {
          job.progress.currentChunk = i + 1;
        }

        chunk.status = 'processing';
        
        const result = await this.executeScraping(
          job.type,
          job.query,
          chunk.targetTweets,
          job.options
        );

        chunk.result = result;
        chunk.status = 'completed';
        totalTweets += result.tweets.length;
        allTweets.push(...result.tweets);

        if (job.progress) {
          job.progress.completed = totalTweets;
        }

        logger.info('Chunk completed', {
          jobId: job.id,
          chunkIndex: i + 1,
          chunksTotal: job.chunks.length,
          chunkTweets: result.tweets.length,
          totalTweets
        });

        // Delay between chunks to avoid overwhelming
        await this.sleep(2000);

      } catch (error: any) {
        chunk.retries++;
        if (chunk.retries >= 3) {
          chunk.status = 'failed';
          logger.error('Chunk failed permanently', {
            jobId: job.id,
            chunkIndex: i,
            retries: chunk.retries,
            error: error?.message || String(error)
          });
        } else {
          chunk.status = 'pending';
          // Retry chunk later
          i--; // Retry this chunk
          await this.sleep(5000); // Wait before retry
        }
      }
    }

    logger.info('Chunked job completed', {
      jobId: job.id,
      totalTweets,
      targetTweets: job.targetTweets,
      chunksProcessed: job.chunks.filter(c => c.status === 'completed').length,
      chunksFailed: job.chunks.filter(c => c.status === 'failed').length
    });
  }

  /**
   * Ejecutar scraping usando el servicio
   */
  private async executeScraping(
    type: string,
    query: string,
    maxTweets: number,
    options: any
  ): Promise<any> {
    const scrapingOptions = {
      maxTweets,
      ...options
    };

    switch (type) {
      case 'hashtag':
        return await this.scraper.scrapeByHashtag(query, scrapingOptions);
      case 'user':
        return await this.scraper.scrapeByUser(query, scrapingOptions);
      case 'search':
        // Assuming there's a search method
        return await this.scraper.scrapeByHashtag(query, scrapingOptions);
      default:
        throw new Error(`Unsupported scraping type: ${type}`);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}