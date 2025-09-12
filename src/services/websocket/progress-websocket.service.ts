/**
 * WebSocket Service for Real-time Scraping Progress
 * Provides live updates to clients about job progress
 */

import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { logger } from '../../lib/observability/logger';
import { ScrapingJobProgress } from '../queue/scraping-queue.service';

export interface ProgressUpdate {
  jobId: string;
  progress: ScrapingJobProgress;
  timestamp: Date;
}

export interface ClientSubscription {
  userId?: string;
  jobIds: Set<string>;
  socketId: string;
}

/**
 * Real-time progress tracking service using WebSockets
 */
export class ProgressWebSocketService {
  private io: SocketIOServer;
  private clients = new Map<string, ClientSubscription>();
  private jobSubscriptions = new Map<string, Set<string>>(); // jobId -> Set of socketIds

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:4200",
        methods: ["GET", "POST"],
        credentials: true,
      },
      path: '/socket.io/',
    });

    this.setupEventHandlers();
    logger.info('WebSocket service initialized');
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupEventHandlers(): void {
    this.io.on('connection', (socket) => {
      logger.info('Client connected', { socketId: socket.id });

      // Handle client subscription to job progress
      socket.on('subscribe-job', (data: { jobId: string; userId?: string }) => {
        this.subscribeToJob(socket.id, data.jobId, data.userId);
      });

      // Handle client unsubscription from job progress
      socket.on('unsubscribe-job', (data: { jobId: string }) => {
        this.unsubscribeFromJob(socket.id, data.jobId);
      });

      // Handle user-specific job subscription
      socket.on('subscribe-user-jobs', (data: { userId: string }) => {
        this.subscribeToUserJobs(socket.id, data.userId);
      });

      // Handle client disconnect
      socket.on('disconnect', () => {
        this.handleClientDisconnect(socket.id);
        logger.info('Client disconnected', { socketId: socket.id });
      });

      // Handle ping for connection health
      socket.on('ping', () => {
        socket.emit('pong');
      });
    });
  }

  /**
   * Subscribe a client to job progress updates
   */
  private subscribeToJob(socketId: string, jobId: string, userId?: string): void {
    // Get or create client subscription
    let clientSub = this.clients.get(socketId);
    if (!clientSub) {
      clientSub = {
        userId,
        jobIds: new Set(),
        socketId,
      };
      this.clients.set(socketId, clientSub);
    }

    // Add job to client's subscriptions
    clientSub.jobIds.add(jobId);

    // Add client to job's subscribers
    let jobSubs = this.jobSubscriptions.get(jobId);
    if (!jobSubs) {
      jobSubs = new Set();
      this.jobSubscriptions.set(jobId, jobSubs);
    }
    jobSubs.add(socketId);

    logger.info('Client subscribed to job', { socketId, jobId, userId });

    // Send subscription confirmation
    this.io.to(socketId).emit('job-subscribed', { jobId, success: true });
  }

  /**
   * Unsubscribe a client from job progress updates
   */
  private unsubscribeFromJob(socketId: string, jobId: string): void {
    // Remove job from client's subscriptions
    const clientSub = this.clients.get(socketId);
    if (clientSub) {
      clientSub.jobIds.delete(jobId);
    }

    // Remove client from job's subscribers
    const jobSubs = this.jobSubscriptions.get(jobId);
    if (jobSubs) {
      jobSubs.delete(socketId);
      if (jobSubs.size === 0) {
        this.jobSubscriptions.delete(jobId);
      }
    }

    logger.info('Client unsubscribed from job', { socketId, jobId });

    // Send unsubscription confirmation
    this.io.to(socketId).emit('job-unsubscribed', { jobId, success: true });
  }

  /**
   * Subscribe a client to all jobs for a specific user
   */
  private subscribeToUserJobs(socketId: string, userId: string): void {
    let clientSub = this.clients.get(socketId);
    if (!clientSub) {
      clientSub = {
        userId,
        jobIds: new Set(),
        socketId,
      };
      this.clients.set(socketId, clientSub);
    } else {
      clientSub.userId = userId;
    }

    logger.info('Client subscribed to user jobs', { socketId, userId });

    // Send subscription confirmation
    this.io.to(socketId).emit('user-jobs-subscribed', { userId, success: true });
  }

  /**
   * Handle client disconnect cleanup
   */
  private handleClientDisconnect(socketId: string): void {
    const clientSub = this.clients.get(socketId);
    if (clientSub) {
      // Remove client from all job subscriptions
      clientSub.jobIds.forEach(jobId => {
        const jobSubs = this.jobSubscriptions.get(jobId);
        if (jobSubs) {
          jobSubs.delete(socketId);
          if (jobSubs.size === 0) {
            this.jobSubscriptions.delete(jobId);
          }
        }
      });

      // Remove client subscription
      this.clients.delete(socketId);
    }
  }

  /**
   * Broadcast progress update to subscribed clients
   */
  broadcastProgressUpdate(jobId: string, progress: ScrapingJobProgress): void {
    const update: ProgressUpdate = {
      jobId,
      progress,
      timestamp: new Date(),
    };

    // Get subscribers for this specific job
    const jobSubscribers = this.jobSubscriptions.get(jobId);
    if (jobSubscribers && jobSubscribers.size > 0) {
      jobSubscribers.forEach(socketId => {
        this.io.to(socketId).emit('progress-update', update);
      });

      logger.debug('Progress update broadcasted', {
        jobId,
        subscriberCount: jobSubscribers.size,
        progress: {
          percentage: progress.percentage,
          status: progress.status,
          tweetsCollected: progress.tweetsCollected,
        },
      });
    }

    // Also broadcast to clients subscribed to user jobs
    this.broadcastToUserJobSubscribers(progress.jobId, update);
  }

  /**
   * Broadcast job completion to subscribers
   */
  broadcastJobCompletion(jobId: string, result: any): void {
    const jobSubscribers = this.jobSubscriptions.get(jobId);
    if (jobSubscribers && jobSubscribers.size > 0) {
      const completionData = {
        jobId,
        status: 'completed',
        result: {
          tweetsCollected: result.tweets?.length || 0,
          totalTime: result.metadata?.totalProcessingTime || 0,
          throughput: result.metadata?.actualThroughput || 0,
        },
        timestamp: new Date(),
      };

      jobSubscribers.forEach(socketId => {
        this.io.to(socketId).emit('job-completed', completionData);
      });

      logger.info('Job completion broadcasted', {
        jobId,
        subscriberCount: jobSubscribers.size,
      });
    }
  }

  /**
   * Broadcast job failure to subscribers
   */
  broadcastJobFailure(jobId: string, error: string): void {
    const jobSubscribers = this.jobSubscriptions.get(jobId);
    if (jobSubscribers && jobSubscribers.size > 0) {
      const failureData = {
        jobId,
        status: 'failed',
        error,
        timestamp: new Date(),
      };

      jobSubscribers.forEach(socketId => {
        this.io.to(socketId).emit('job-failed', failureData);
      });

      logger.error('Job failure broadcasted', {
        jobId,
        error,
        subscriberCount: jobSubscribers.size,
      });
    }
  }

  /**
   * Broadcast update to clients subscribed to user jobs
   */
  private broadcastToUserJobSubscribers(jobId: string, update: ProgressUpdate): void {
    // Find clients subscribed to user jobs that might include this job
    this.clients.forEach((clientSub, socketId) => {
      if (clientSub.userId && !clientSub.jobIds.has(jobId)) {
        // This client is subscribed to user jobs but not specifically to this job
        // We would need to check if this job belongs to their user
        // For now, we'll emit to all user-subscribed clients
        this.io.to(socketId).emit('user-job-update', update);
      }
    });
  }

  /**
   * Get current connection statistics
   */
  getConnectionStats(): {
    totalConnections: number;
    totalJobSubscriptions: number;
    activeJobs: number;
  } {
    return {
      totalConnections: this.clients.size,
      totalJobSubscriptions: Array.from(this.clients.values())
        .reduce((total, client) => total + client.jobIds.size, 0),
      activeJobs: this.jobSubscriptions.size,
    };
  }

  /**
   * Send system notification to all connected clients
   */
  broadcastSystemNotification(message: string, type: 'info' | 'warning' | 'error' = 'info'): void {
    this.io.emit('system-notification', {
      message,
      type,
      timestamp: new Date(),
    });

    logger.info('System notification broadcasted', { message, type });
  }

  /**
   * Get clients subscribed to a specific job
   */
  getJobSubscribers(jobId: string): string[] {
    const subscribers = this.jobSubscriptions.get(jobId);
    return subscribers ? Array.from(subscribers) : [];
  }

  /**
   * Close WebSocket service
   */
  async close(): Promise<void> {
    this.io.close();
    this.clients.clear();
    this.jobSubscriptions.clear();
    logger.info('WebSocket service closed');
  }
}
