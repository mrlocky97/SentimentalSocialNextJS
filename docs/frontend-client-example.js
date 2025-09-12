/**
 * Frontend Client Example for Advanced Scraping with Real-time Progress
 * This example shows how to integrate with the advanced scraping system
 */

class AdvancedScrapingClient {
  private socket: any;
  private apiBaseUrl: string;

  constructor(apiBaseUrl = 'http://localhost:3001') {
    this.apiBaseUrl = apiBaseUrl;
    this.initializeWebSocket();
  }

  /**
   * Initialize WebSocket connection for real-time progress
   */
  private initializeWebSocket() {
    // Import socket.io-client in your frontend
    // npm install socket.io-client
    // const io = require('socket.io-client');
    
    console.log('🔌 Connecting to WebSocket...');
    
    // This would be the actual implementation:
    /*
    this.socket = io(this.apiBaseUrl, {
      path: '/socket.io/',
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('❌ WebSocket disconnected');
    });

    this.socket.on('progress-update', (data) => {
      this.handleProgressUpdate(data);
    });

    this.socket.on('job-completed', (data) => {
      this.handleJobCompleted(data);
    });

    this.socket.on('job-failed', (data) => {
      this.handleJobFailed(data);
    });

    this.socket.on('system-notification', (data) => {
      this.handleSystemNotification(data);
    });
    */
  }

  /**
   * Create a new scraping job
   */
  async createScrapingJob(jobConfig: {
    type: 'hashtag' | 'user' | 'search';
    query: string;
    targetCount: number;
    campaignId: string;
    priority?: 'urgent' | 'high' | 'medium' | 'low';
    options?: any;
  }) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/v1/scraping/advanced/job`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add authorization header if needed
          // 'Authorization': `Bearer ${your_token}`
        },
        body: JSON.stringify(jobConfig)
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ Job created successfully:', result.jobId);
        
        // Subscribe to job progress updates
        this.subscribeToJobProgress(result.jobId);
        
        return result;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('❌ Failed to create scraping job:', error);
      throw error;
    }
  }

  /**
   * Subscribe to job progress updates via WebSocket
   */
  private subscribeToJobProgress(jobId: string) {
    if (this.socket) {
      this.socket.emit('subscribe-job', { jobId });
      console.log(`🔔 Subscribed to progress updates for job: ${jobId}`);
    }
  }

  /**
   * Get current job progress via REST API
   */
  async getJobProgress(jobId: string) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/v1/scraping/advanced/job/${jobId}`);
      const result = await response.json();

      if (result.success) {
        return result.progress;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('❌ Failed to get job progress:', error);
      throw error;
    }
  }

  /**
   * Cancel a running job
   */
  async cancelJob(jobId: string) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/v1/scraping/advanced/job/${jobId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ Job cancelled successfully');
        return true;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('❌ Failed to cancel job:', error);
      throw error;
    }
  }

  /**
   * Get all user jobs
   */
  async getUserJobs(status?: string) {
    try {
      const url = new URL(`${this.apiBaseUrl}/api/v1/scraping/advanced/jobs`);
      if (status) {
        url.searchParams.append('status', status);
      }

      const response = await fetch(url.toString());
      const result = await response.json();

      if (result.success) {
        return result.jobs;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('❌ Failed to get user jobs:', error);
      throw error;
    }
  }

  /**
   * Get system statistics
   */
  async getSystemStats() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/v1/scraping/advanced/stats`);
      const result = await response.json();

      if (result.success) {
        return result.stats;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('❌ Failed to get system stats:', error);
      throw error;
    }
  }

  /**
   * Handle progress update from WebSocket
   */
  private handleProgressUpdate(data: any) {
    console.log('📊 Progress update:', {
      jobId: data.jobId,
      percentage: data.progress.percentage,
      status: data.progress.status,
      tweetsCollected: data.progress.tweetsCollected,
      estimatedTimeRemaining: data.progress.estimatedTimeRemaining
    });

    // Update UI here
    this.updateProgressUI(data);
  }

  /**
   * Handle job completion
   */
  private handleJobCompleted(data: any) {
    console.log('✅ Job completed:', data);
    
    // Update UI to show completion
    this.showJobCompleted(data);
  }

  /**
   * Handle job failure
   */
  private handleJobFailed(data: any) {
    console.log('❌ Job failed:', data);
    
    // Update UI to show error
    this.showJobError(data);
  }

  /**
   * Handle system notifications
   */
  private handleSystemNotification(data: any) {
    console.log(`📢 System notification (${data.type}):`, data.message);
    
    // Show notification in UI
    this.showNotification(data);
  }

  /**
   * Update progress UI (implement based on your frontend framework)
   */
  private updateProgressUI(data: any) {
    // Example implementation for vanilla JS
    const progressBar = document.getElementById(`progress-${data.jobId}`);
    if (progressBar) {
      progressBar.style.width = `${data.progress.percentage}%`;
      progressBar.textContent = `${data.progress.percentage}% (${data.progress.tweetsCollected}/${data.progress.total})`;
    }

    const statusElement = document.getElementById(`status-${data.jobId}`);
    if (statusElement) {
      statusElement.textContent = data.progress.status;
    }

    const etaElement = document.getElementById(`eta-${data.jobId}`);
    if (etaElement && data.progress.estimatedTimeRemaining) {
      const minutes = Math.floor(data.progress.estimatedTimeRemaining / 60);
      const seconds = Math.floor(data.progress.estimatedTimeRemaining % 60);
      etaElement.textContent = `ETA: ${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
  }

  /**
   * Show job completion UI
   */
  private showJobCompleted(data: any) {
    // Implement completion UI
    console.log('Job completed with', data.result.tweetsCollected, 'tweets');
  }

  /**
   * Show job error UI
   */
  private showJobError(data: any) {
    // Implement error UI
    console.error('Job failed:', data.error);
  }

  /**
   * Show system notification
   */
  private showNotification(data: any) {
    // Implement notification UI (toast, alert, etc.)
    if (data.type === 'error') {
      console.error(data.message);
    } else if (data.type === 'warning') {
      console.warn(data.message);
    } else {
      console.info(data.message);
    }
  }

  /**
   * Disconnect WebSocket
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      console.log('🔌 WebSocket disconnected');
    }
  }
}

// Example usage
async function example() {
  const client = new AdvancedScrapingClient();

  try {
    // Create a scraping job for 1000 tweets
    const job = await client.createScrapingJob({
      type: 'hashtag',
      query: 'technology',
      targetCount: 1000,
      campaignId: 'tech_analysis_2024',
      priority: 'high',
      options: {
        includeReplies: false,
        includeRetweets: false,
        language: 'en'
      }
    });

    console.log('Job created:', job.jobId);

    // Poll for progress every 5 seconds (alternative to WebSocket)
    const progressInterval = setInterval(async () => {
      try {
        const progress = await client.getJobProgress(job.jobId);
        console.log(`Progress: ${progress.percentage}% - ${progress.status}`);

        if (progress.status === 'completed' || progress.status === 'failed') {
          clearInterval(progressInterval);
          console.log('Job finished');
        }
      } catch (error) {
        console.error('Error checking progress:', error);
      }
    }, 5000);

  } catch (error) {
    console.error('Example failed:', error);
  }
}

// Export for use in frontend applications
// export { AdvancedScrapingClient };

// For testing in Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AdvancedScrapingClient, example };
}
