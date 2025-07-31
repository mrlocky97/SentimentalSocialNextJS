/**
 * Auto-Optimization Job Service
 * Automated campaign optimizations that run during off-peak hours
 */

import cron from 'node-cron';

export interface OptimizationJob {
  id: string;
  organizationId: string;
  campaignId: string;
  type: 'nightly' | 'weekly' | 'manual';
  status: 'pending' | 'running' | 'completed' | 'failed';
  scheduledAt: Date;
  completedAt?: Date;
  results?: {
    optimizations: string[];
    improvements: Record<string, number>;
    errors?: string[];
  };
}

export interface AutoOptimizationConfig {
  enabled: boolean;
  schedule: string; // Cron expression
  optimizationTypes: ('hashtags' | 'timing' | 'targeting' | 'content')[];
  safeMode: boolean; // Only apply low-risk optimizations
  notifyOnCompletion: boolean;
  organizationId: string;
}

export class AutoOptimizationJobService {
  private static jobs: Map<string, OptimizationJob> = new Map();
  private static configs: Map<string, AutoOptimizationConfig> = new Map();
  private static isInitialized = false;
  private static cronJobs: any[] = []; // Store cron job references

  /**
   * Initialize auto-optimization scheduler
   */
  static initialize() {
    if (this.isInitialized) return;

    // Schedule nightly optimization job at 2:00 AM
    const nightlyJob = cron.schedule('0 2 * * *', async () => {
      console.log('🔄 Starting nightly auto-optimization job...');
      await this.runNightlyOptimizations();
    });

    // Schedule weekly deep optimization on Sundays at 1:00 AM
    const weeklyJob = cron.schedule('0 1 * * 0', async () => {
      console.log('🔄 Starting weekly deep optimization job...');
      await this.runWeeklyDeepOptimizations();
    });

    // Schedule performance monitoring every 4 hours
    const monitoringJob = cron.schedule('0 */4 * * *', async () => {
      console.log('📊 Running performance monitoring check...');
      await this.monitorCampaignPerformance();
    });

    // Store job references for later cleanup
    this.cronJobs = [nightlyJob, weeklyJob, monitoringJob];

    this.isInitialized = true;
    console.log('✅ Auto-optimization scheduler initialized');
  }

  /**
   * Configure auto-optimization for an organization
   */
  static configureOptimization(organizationId: string, config: AutoOptimizationConfig) {
    this.configs.set(organizationId, config);
    console.log(`⚙️  Auto-optimization configured for organization: ${organizationId}`);
  }

  /**
   * Check if database is connected
   */
  private static isDatabaseConnected(): boolean {
    try {
      // Simple check for mongoose connection
      const mongoose = require('mongoose');
      return mongoose.connection.readyState === 1;
    } catch (error) {
      return false;
    }
  }

  /**
   * Run nightly optimizations for all active campaigns
   */
  private static async runNightlyOptimizations(): Promise<void> {
    try {
      // Check if database is connected
      if (!this.isDatabaseConnected()) {
        console.log('⚠️  Database not connected, skipping nightly optimization');
        return;
      }

      console.log('✅ Nightly optimization would run here (database connected)');
      
    } catch (error) {
      console.error('Nightly optimization failed:', error);
    }
  }

  /**
   * Run weekly deep optimizations
   */
  private static async runWeeklyDeepOptimizations(): Promise<void> {
    try {
      // Check if database is connected
      if (!this.isDatabaseConnected()) {
        console.log('⚠️  Database not connected, skipping weekly optimization');
        return;
      }

      console.log('✅ Weekly deep optimization would run here (database connected)');
      
    } catch (error) {
      console.error('Weekly optimization failed:', error);
    }
  }

  /**
   * Monitor campaign performance continuously
   */
  private static async monitorCampaignPerformance(): Promise<void> {
    try {
      // Check if database is connected
      if (!this.isDatabaseConnected()) {
        console.log('⚠️  Database not connected, skipping performance monitoring');
        return;
      }

      console.log('✅ Performance monitoring would run here (database connected)');
      
    } catch (error) {
      console.error('Performance monitoring failed:', error);
    }
  }

  /**
   * Get optimization job status
   */
  static getJobStatus(jobId: string): OptimizationJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Get all jobs for an organization
   */
  static getOrganizationJobs(organizationId: string): OptimizationJob[] {
    return Array.from(this.jobs.values())
      .filter(job => job.organizationId === organizationId);
  }

  /**
   * Stop all optimization jobs (for testing/shutdown)
   */
  static stopAllJobs(): void {
    // Destroy all cron jobs
    this.cronJobs.forEach(job => {
      if (job && typeof job.destroy === 'function') {
        job.destroy();
      }
    });
    
    this.cronJobs = [];
    this.isInitialized = false;
    console.log('🛑 Auto-optimization scheduler stopped');
  }
}
