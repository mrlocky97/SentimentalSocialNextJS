/**
 * Test Script for Advanced Scraping System
 * Tests the new 1000+ tweet scraping capability
 */

import axios from 'axios';
import { io, Socket } from 'socket.io-client';

const BASE_URL = 'http://localhost:3000';
const API_BASE = `${BASE_URL}/api/v1/scraping/advanced`;

interface JobResponse {
  success: boolean;
  jobId: string;
  message: string;
  estimatedTime: number;
  websocketUrl: string;
}

interface ProgressUpdate {
  jobId: string;
  current: number;
  total: number;
  percentage: number;
  currentBatch: number;
  totalBatches: number;
  status: string;
  tweetsCollected: number;
  estimatedTimeRemaining: number;
  errors: string[];
}

class ScrapingTestClient {
  private socket: Socket | null = null;
  private activeJobs = new Set<string>();

  async connectWebSocket(): Promise<void> {
    this.socket = io(BASE_URL);
    
    this.socket.on('connect', () => {
      console.log('✅ Connected to WebSocket server');
    });

    this.socket.on('job-progress', (data: ProgressUpdate) => {
      this.handleProgressUpdate(data);
    });

    this.socket.on('job-completed', (data: any) => {
      console.log(`🎉 Job ${data.jobId} completed!`);
      console.log(`📊 Final stats: ${data.tweetsCollected} tweets collected`);
      this.activeJobs.delete(data.jobId);
    });

    this.socket.on('job-failed', (data: any) => {
      console.log(`❌ Job ${data.jobId} failed: ${data.error}`);
      this.activeJobs.delete(data.jobId);
    });

    return new Promise((resolve) => {
      this.socket?.on('connect', resolve);
    });
  }

  private handleProgressUpdate(data: ProgressUpdate): void {
    const progress = data.percentage.toFixed(1);
    const eta = data.estimatedTimeRemaining ? `${Math.round(data.estimatedTimeRemaining / 1000)}s` : 'N/A';
    
    console.log(`📈 [${data.jobId.slice(-8)}] ${progress}% | ${data.tweetsCollected}/${data.total} tweets | Batch ${data.currentBatch}/${data.totalBatches} | ETA: ${eta}`);
    
    if (data.errors.length > 0) {
      console.log(`⚠️  Errors: ${data.errors.slice(-3).join(', ')}`);
    }
  }

  async createScrapingJob(
    type: 'hashtag' | 'user' | 'search',
    query: string,
    targetCount: number,
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<string> {
    try {
      console.log(`🚀 Creating ${type} scraping job for "${query}" (${targetCount} tweets)`);
      
      const response = await axios.post<JobResponse>(`${API_BASE}/job`, {
        type,
        query,
        targetCount,
        campaignId: `test-${Date.now()}`,
        priority,
        options: {
          includeReplies: false,
          includeRetweets: true,
        },
      });

      const { jobId, estimatedTime } = response.data;
      console.log(`✅ Job created: ${jobId}`);
      console.log(`⏱️  Estimated time: ${estimatedTime} seconds`);

      // Subscribe to WebSocket updates
      if (this.socket) {
        this.socket.emit('subscribe-to-job', { jobId });
        this.activeJobs.add(jobId);
      }

      return jobId;
    } catch (error: any) {
      console.error('❌ Failed to create job:', error.response?.data || error.message);
      throw error;
    }
  }

  async getJobProgress(jobId: string): Promise<ProgressUpdate | null> {
    try {
      const response = await axios.get(`${API_BASE}/job/${jobId}`);
      return response.data.progress;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async getSystemStats(): Promise<void> {
    try {
      const response = await axios.get(`${API_BASE}/stats`);
      const { stats } = response.data;
      
      console.log('\n📊 System Statistics:');
      console.log(`   Queue: ${stats.queueStats.active} active, ${stats.queueStats.waiting} waiting, ${stats.queueStats.completed} completed`);
      console.log(`   WebSocket: ${stats.connectionStats.totalConnections} connections`);
      console.log(`   Memory: ${Math.round(stats.systemHealth.memoryUsage.heapUsed / 1024 / 1024)}MB used`);
      console.log(`   Uptime: ${Math.round(stats.systemHealth.uptime / 1000)}s`);
    } catch (error: any) {
      console.error('❌ Failed to get stats:', error.message);
    }
  }

  async cancelJob(jobId: string): Promise<void> {
    try {
      await axios.post(`${API_BASE}/job/${jobId}/cancel`);
      console.log(`🛑 Job ${jobId} cancelled`);
      this.activeJobs.delete(jobId);
    } catch (error: any) {
      console.error('❌ Failed to cancel job:', error.response?.data || error.message);
    }
  }

  async waitForCompletion(): Promise<void> {
    return new Promise((resolve) => {
      const check = () => {
        if (this.activeJobs.size === 0) {
          resolve();
        } else {
          setTimeout(check, 1000);
        }
      };
      check();
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
  }
}

// Test scenarios
async function testBasicScraping(): Promise<void> {
  console.log('\n🧪 Test 1: Basic Hashtag Scraping (50 tweets)');
  
  const client = new ScrapingTestClient();
  await client.connectWebSocket();

  try {
    const jobId = await client.createScrapingJob('hashtag', 'javascript', 50, 'high');
    
    // Monitor progress
    let lastProgress = 0;
    const progressTimer = setInterval(async () => {
      const progress = await client.getJobProgress(jobId);
      if (progress && progress.percentage > lastProgress) {
        lastProgress = progress.percentage;
      }
    }, 2000);

    await client.waitForCompletion();
    clearInterval(progressTimer);
    
    await client.getSystemStats();
  } finally {
    client.disconnect();
  }
}

async function testLargeScraping(): Promise<void> {
  console.log('\n🧪 Test 2: Large Scale Scraping (1000 tweets)');
  
  const client = new ScrapingTestClient();
  await client.connectWebSocket();

  try {
    const jobId = await client.createScrapingJob('search', 'AI technology', 1000, 'medium');
    console.log(`🔍 Large job started: ${jobId}`);
    
    // Show stats every 30 seconds
    const statsTimer = setInterval(() => {
      client.getSystemStats();
    }, 30000);

    await client.waitForCompletion();
    clearInterval(statsTimer);
    
    console.log('\n🎉 Large scale test completed!');
    await client.getSystemStats();
  } finally {
    client.disconnect();
  }
}

async function testConcurrentJobs(): Promise<void> {
  console.log('\n🧪 Test 3: Concurrent Jobs');
  
  const client = new ScrapingTestClient();
  await client.connectWebSocket();

  try {
    // Create multiple jobs simultaneously
    const jobs = await Promise.all([
      client.createScrapingJob('hashtag', 'react', 200, 'high'),
      client.createScrapingJob('hashtag', 'nodejs', 200, 'medium'),
      client.createScrapingJob('search', 'machine learning', 300, 'low'),
    ]);

    console.log(`🔄 Created ${jobs.length} concurrent jobs`);
    
    await client.waitForCompletion();
    await client.getSystemStats();
  } finally {
    client.disconnect();
  }
}

async function testJobCancellation(): Promise<void> {
  console.log('\n🧪 Test 4: Job Cancellation');
  
  const client = new ScrapingTestClient();
  await client.connectWebSocket();

  try {
    const jobId = await client.createScrapingJob('hashtag', 'testing', 500, 'low');
    
    // Cancel after 10 seconds
    setTimeout(async () => {
      await client.cancelJob(jobId);
    }, 10000);

    await client.waitForCompletion();
  } finally {
    client.disconnect();
  }
}

// Main test runner
async function runTests(): Promise<void> {
  console.log('🚀 Advanced Scraping System Test Suite');
  console.log('=====================================');
  
  try {
    // Check if server is running
    await axios.get(`${BASE_URL}/health`);
    console.log('✅ Server is running');
  } catch {
    console.error('❌ Server is not running. Please start the server first.');
    process.exit(1);
  }

  const testChoice = process.argv[2] || 'basic';

  switch (testChoice) {
    case 'basic':
      await testBasicScraping();
      break;
    case 'large':
      await testLargeScraping();
      break;
    case 'concurrent':
      await testConcurrentJobs();
      break;
    case 'cancel':
      await testJobCancellation();
      break;
    case 'all':
      await testBasicScraping();
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5s between tests
      await testConcurrentJobs();
      await new Promise(resolve => setTimeout(resolve, 5000));
      await testJobCancellation();
      break;
    default:
      console.log('Usage: npm run test:scraping [basic|large|concurrent|cancel|all]');
      process.exit(1);
  }

  console.log('\n✅ All tests completed!');
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Test interrupted by user');
  process.exit(0);
});

if (require.main === module) {
  runTests().catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
}

export { ScrapingTestClient };
