import { EventEmitter } from 'events';
import { Server } from 'socket.io';

export interface ScrapingProgress {
  campaignId: string;
  totalTweets: number;
  scrapedTweets: number;
  currentPhase: 'initializing' | 'scraping' | 'analyzing' | 'completed' | 'error';
  message: string;
  percentage: number;
  timeElapsed: number;
  estimatedTimeRemaining?: number;
}

class ScrapingProgressService extends EventEmitter {
  private io: Server | null = null;
  private progressData: Map<string, ScrapingProgress> = new Map();

  initialize(io: Server): void {
    this.io = io;
  }

  updateProgress(campaignId: string, progress: Partial<ScrapingProgress>): void {
    const existing = this.progressData.get(campaignId) || {
      campaignId,
      totalTweets: 0,
      scrapedTweets: 0,
      currentPhase: 'initializing',
      message: 'Starting...',
      percentage: 0,
      timeElapsed: 0
    };

    const updated: ScrapingProgress = {
      ...existing,
      ...progress,
      percentage: progress.totalTweets && progress.scrapedTweets 
        ? Math.round((progress.scrapedTweets / progress.totalTweets) * 100)
        : existing.percentage
    };

    this.progressData.set(campaignId, updated);

    // Emit to specific campaign room
    if (this.io) {
      this.io.to(`campaign-${campaignId}`).emit('scraping-progress', updated);
    }

    this.emit('progress-updated', updated);
  }

  getProgress(campaignId: string): ScrapingProgress | undefined {
    return this.progressData.get(campaignId);
  }

  completeProgress(campaignId: string): void {
    const progress = this.progressData.get(campaignId);
    if (progress) {
      this.updateProgress(campaignId, {
        currentPhase: 'completed',
        percentage: 100,
        message: 'Scraping completed successfully'
      });
    }
  }

  errorProgress(campaignId: string, error: string): void {
    this.updateProgress(campaignId, {
      currentPhase: 'error',
      message: `Error: ${error}`
    });
  }

  cleanupProgress(campaignId: string): void {
    this.progressData.delete(campaignId);
  }
}

export const scrapingProgressService = new ScrapingProgressService();