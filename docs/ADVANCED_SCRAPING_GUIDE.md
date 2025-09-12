# Advanced Scraping Implementation Guide

## 🎯 Overview

This implementation provides a complete solution for large-scale Twitter scraping with:
- **Redis-based queue system** for handling thousands of tweets
- **Real-time progress tracking** via WebSockets
- **Adaptive rate limiting** to avoid API blocks
- **Batch processing** with intelligent retry logic
- **Multi-user support** with job isolation
- **Scalable architecture** ready for unlimited growth

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │───▶│   API Gateway   │───▶│   Job Queue     │
│   (Angular/     │    │   (Express +    │    │   (Redis +      │
│    React/Vue)   │    │    Rate Limit)  │    │    Bull)        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────▼─────────┐    ┌───────▼───────┐
         └──────────────▶│   WebSocket      │◀───│   Worker Pool  │
                         │   (Socket.IO)    │    │   (Multi-core) │
                         └──────────────────┘    └───────────────┘
```

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install redis bull @types/bull ioredis @types/ioredis socket.io @types/socket.io uuid @types/uuid
```

### 2. Setup Redis
Follow `docs/REDIS_SETUP.md` for Redis installation.

### 3. Environment Configuration
Add to `.env`:
```env
# Redis Configuration
REDIS_URL=redis://localhost:6379
ENABLE_ADVANCED_SCRAPING=true
ENABLE_WEBSOCKET_PROGRESS=true
FRONTEND_URL=http://localhost:4200
```

### 4. Start Server
```bash
npm run dev
```

### 5. Test the System
```bash
# Create a 1000-tweet scraping job
curl -X POST http://localhost:3001/api/v1/scraping/advanced/job \
  -H "Content-Type: application/json" \
  -d '{
    "type": "hashtag",
    "query": "technology",
    "targetCount": 1000,
    "campaignId": "tech_analysis_2024",
    "priority": "high"
  }'
```

## 📊 API Endpoints

### Create Scraping Job
```
POST /api/v1/scraping/advanced/job
```

**Request:**
```json
{
  "type": "hashtag",
  "query": "technology",
  "targetCount": 1000,
  "campaignId": "tech_analysis_2024",
  "priority": "high",
  "options": {
    "includeReplies": false,
    "includeRetweets": false,
    "language": "en"
  }
}
```

**Response:**
```json
{
  "success": true,
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Scraping job created successfully",
  "estimatedTime": 300,
  "websocketUrl": "/socket.io/"
}
```

### Get Job Progress
```
GET /api/v1/scraping/advanced/job/{jobId}
```

**Response:**
```json
{
  "success": true,
  "progress": {
    "jobId": "550e8400-e29b-41d4-a716-446655440000",
    "current": 234,
    "total": 1000,
    "percentage": 23.4,
    "status": "running",
    "tweetsCollected": 234,
    "currentBatch": 8,
    "totalBatches": 34,
    "estimatedTimeRemaining": 180,
    "throughput": 2.3,
    "errors": []
  }
}
```

### Cancel Job
```
POST /api/v1/scraping/advanced/job/{jobId}/cancel
```

### Get User Jobs
```
GET /api/v1/scraping/advanced/jobs?status=running
```

### System Statistics
```
GET /api/v1/scraping/advanced/stats
```

## 🔌 WebSocket Events

### Client → Server

#### Subscribe to Job Progress
```javascript
socket.emit('subscribe-job', { 
  jobId: 'job-uuid',
  userId: 'user-id' // optional
});
```

#### Subscribe to User Jobs
```javascript
socket.emit('subscribe-user-jobs', { 
  userId: 'user-id'
});
```

### Server → Client

#### Progress Update
```javascript
socket.on('progress-update', (data) => {
  console.log(data.progress.percentage + '% completed');
});
```

#### Job Completed
```javascript
socket.on('job-completed', (data) => {
  console.log('Job finished with', data.result.tweetsCollected, 'tweets');
});
```

#### Job Failed
```javascript
socket.on('job-failed', (data) => {
  console.error('Job failed:', data.error);
});
```

## 🎛️ Configuration Options

### Queue Configuration
```typescript
// In queue service constructor
{
  defaultJobOptions: {
    removeOnComplete: 100,  // Keep last 100 jobs
    removeOnFail: 50,       // Keep last 50 failed jobs
    attempts: 3,            // Retry up to 3 times
    backoff: {
      type: 'exponential',
      delay: 2000           // 2s, 4s, 8s delays
    }
  }
}
```

### Batch Processing
- **Small jobs (1-50 tweets)**: 10 tweets per batch
- **Medium jobs (51-200 tweets)**: 20 tweets per batch  
- **Large jobs (201-1000 tweets)**: 30 tweets per batch
- **Very large jobs (1000+ tweets)**: 50 tweets per batch

### Rate Limiting
- **Base delay**: 2 seconds between batches
- **Adaptive increase**: +500ms per batch
- **Error penalty**: +1 second per error
- **Rate limit penalty**: +30 seconds
- **Maximum delay**: 2 minutes

## 🔧 Troubleshooting

### Common Issues

#### 1. Redis Connection Failed
```bash
# Check Redis status
docker ps | grep redis

# Restart Redis
docker restart redis-sentimentalsocial
```

#### 2. Jobs Stuck in Pending
```bash
# Check queue status
curl http://localhost:3001/api/v1/scraping/advanced/stats

# Clear stuck jobs (if needed)
# Connect to Redis CLI and run: FLUSHDB
```

#### 3. High Memory Usage
```bash
# Monitor memory
curl http://localhost:3001/api/v1/scraping/advanced/health

# Adjust batch sizes in queue service if needed
```

#### 4. WebSocket Connection Issues
```javascript
// Client-side debugging
socket.on('connect_error', (error) => {
  console.error('WebSocket connection failed:', error);
});

// Check CORS settings in server.ts
```

### Performance Tuning

#### For High Volume (10,000+ tweets)
```typescript
// Increase concurrent workers
this.queue.process(10, async (job) => { ... });

// Larger batch sizes
private calculateOptimalBatchSize(targetCount: number): number {
  if (targetCount > 5000) return 100;
  if (targetCount > 1000) return 75;
  return 50;
}

// Reduced delays for authenticated API access
private async adaptiveDelay(batchIndex: number): Promise<void> {
  const delay = Math.min(1000 + (batchIndex * 100), 30000);
  await new Promise(resolve => setTimeout(resolve, delay));
}
```

#### For Development/Testing
```typescript
// Faster processing
private async adaptiveDelay(): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 500));
}

// Smaller batches for testing
private calculateOptimalBatchSize(): number {
  return 5;
}
```

## 📈 Scaling Considerations

### Horizontal Scaling
- **Multiple server instances**: Bull queue supports clustering
- **Redis Cluster**: For high availability
- **Load balancer**: Distribute API requests
- **Database sharding**: For large datasets

### Vertical Scaling
- **Increase worker count**: More concurrent jobs
- **Larger batch sizes**: Fewer API calls
- **Better hardware**: More CPU/RAM for processing

### Monitoring
- **Queue dashboard**: Bull Board for visual monitoring
- **Metrics collection**: Prometheus/Grafana integration
- **Alerting**: Slack/email notifications for failures
- **Performance tracking**: Response times and throughput

## 🔐 Security Best Practices

### Redis Security
```bash
# Set password
docker run -d --name redis-sentimentalsocial \
  -p 6379:6379 \
  redis:latest redis-server --requirepass your_secure_password
```

### API Security
- **Rate limiting**: Already implemented
- **Authentication**: JWT tokens for user identification
- **Authorization**: User-specific job access
- **Input validation**: Sanitize all inputs
- **HTTPS**: Use SSL in production

### Data Protection
- **Encrypt sensitive data**: Twitter credentials
- **Audit logging**: Track all job operations
- **Data retention**: Auto-delete old jobs
- **Backup strategy**: Regular Redis backups

## 🧪 Testing

### Unit Tests
```bash
npm run test:unit
```

### Integration Tests
```bash
npm run test:integration
```

### Load Testing
```bash
# Install artillery
npm install -g artillery

# Create load test config
echo 'config:
  target: "http://localhost:3001"
  phases:
    - duration: 60
      arrivalRate: 5
scenarios:
  - name: "Create scraping jobs"
    requests:
      - post:
          url: "/api/v1/scraping/advanced/job"
          json:
            type: "hashtag"
            query: "test"
            targetCount: 100
            campaignId: "load-test"' > load-test.yml

# Run load test
artillery run load-test.yml
```

## 📚 Next Steps

1. **Frontend Integration**: Implement real-time progress UI
2. **Analytics Dashboard**: Add job statistics and visualizations  
3. **Advanced Filters**: More sophisticated tweet filtering
4. **Data Export**: CSV/JSON export of scraped data
5. **Scheduled Jobs**: Cron-based recurring scraping
6. **Multiple APIs**: Support for additional social media platforms
7. **Machine Learning**: Automated content categorization
8. **Compliance Tools**: GDPR/privacy law compliance features

## 🆘 Support

For issues or questions:
1. Check logs: `docker logs redis-sentimentalsocial`
2. Monitor queues: Visit Bull Board dashboard
3. Check system health: `/api/v1/scraping/advanced/health`
4. Review this documentation
5. Contact development team

---

**Happy Scraping! 🚀**
