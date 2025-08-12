# ⚡ Performance Optimization Guide

## 🎯 Performance Targets

### Response Time Goals

- **API Endpoints**: < 200ms (95th percentile)
- **Sentiment Analysis**: < 500ms per request
- **Database Queries**: < 100ms average
- **Campaign Metrics**: < 1s for complex aggregations
- **Real-time Updates**: < 100ms

### Throughput Goals

- **Concurrent Users**: 100+ simultaneous users
- **API Requests**: 1000+ requests/minute
- **Tweet Processing**: 500+ tweets/minute
- **Cache Hit Rate**: > 80%

## 🔧 Optimization Strategies

### 1. Caching Implementation

#### Memory Cache

```typescript
import { performanceCache } from '@/services/performance-cache.service';

// Cache sentiment analysis results
const cacheKey = performanceCache.generateKey('sentiment', text, method);
let result = performanceCache.get(cacheKey);

if (!result) {
  result = await analyzeSentiment(text, method);
  performanceCache.set(cacheKey, result, 300000); // 5 minutes
}
```

#### Redis Cache (Production)

```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// Cache with expiration
await redis.setex('sentiment:hash123', 300, JSON.stringify(result));

// Retrieve from cache
const cached = await redis.get('sentiment:hash123');
```

#### Cache Strategies by Data Type

| Data Type         | TTL        | Strategy      | Invalidation    |
| ----------------- | ---------- | ------------- | --------------- |
| Sentiment Results | 5 minutes  | LRU           | On model update |
| Campaign Metrics  | 10 minutes | Time-based    | On new data     |
| User Sessions     | 1 hour     | Session-based | On logout       |
| Static Data       | 24 hours   | Version-based | Manual          |

### 2. Database Optimization

#### Indexing Strategy

```javascript
// MongoDB indexes for performance
db.tweets.createIndex({ campaignId: 1, createdAt: -1 });
db.tweets.createIndex({ 'sentiment.score': 1 });
db.tweets.createIndex({ hashtags: 1 });
db.campaigns.createIndex({ userId: 1, status: 1 });
db.users.createIndex({ email: 1 }, { unique: true });

// Compound indexes for complex queries
db.tweets.createIndex({
  campaignId: 1,
  'sentiment.label': 1,
  createdAt: -1,
});
```

#### Query Optimization

```typescript
// Use projection to limit fields
const tweets = await Tweet.find({ campaignId }, { content: 1, sentiment: 1, createdAt: 1 });

// Use aggregation for complex operations
const metrics = await Tweet.aggregate([
  { $match: { campaignId } },
  {
    $group: {
      _id: '$sentiment.label',
      count: { $sum: 1 },
      avgScore: { $avg: '$sentiment.score' },
    },
  },
  { $sort: { count: -1 } },
]);

// Use pagination for large datasets
const tweets = await Tweet.find({ campaignId })
  .sort({ createdAt: -1 })
  .limit(20)
  .skip(page * 20);
```

#### Connection Pooling

```typescript
// MongoDB connection optimization
const mongoOptions = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4, // Use IPv4, skip trying IPv6
  bufferMaxEntries: 0,
  useNewUrlParser: true,
  useUnifiedTopology: true,
};
```

### 3. Query Optimization Service

#### Batch Processing

```typescript
import { queryOptimizer } from '@/services/query-optimization.service';

// Process multiple sentiment analyses in batches
const batchQueries = texts.map((text, index) => ({
  key: `sentiment:batch:${index}`,
  fn: () => analyzeSentiment(text),
  options: { ttl: 300000 },
}));

const results = await queryOptimizer.executeBatch(batchQueries);
```

#### Concurrent Query Limiting

```typescript
// Limit concurrent database operations
const config = {
  maxConcurrentQueries: 5,
  batchSize: 10,
  enableCaching: true,
  cacheTTL: 300000,
};

const optimizer = new QueryOptimizationService(config);
```

### 4. Memory Management

#### Garbage Collection Optimization

```javascript
// Node.js GC tuning flags
node --max-old-space-size=4096 \
     --gc-interval=100 \
     --expose-gc \
     dist/server.js
```

#### Memory Monitoring

```typescript
// Monitor memory usage
setInterval(() => {
  const usage = process.memoryUsage();
  console.log({
    rss: Math.round(usage.rss / 1024 / 1024) + ' MB',
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024) + ' MB',
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024) + ' MB',
    external: Math.round(usage.external / 1024 / 1024) + ' MB',
  });
}, 60000);
```

#### Memory Leak Prevention

```typescript
// Cleanup event listeners
class SentimentAnalyzer {
  private cleanup() {
    // Remove event listeners
    this.eventEmitter.removeAllListeners();

    // Clear intervals/timeouts
    clearInterval(this.monitoringInterval);

    // Clear caches
    this.cache.clear();
  }
}
```

### 5. CPU Optimization

#### Worker Threads for Heavy Processing

```typescript
import { Worker, isMainThread, parentPort } from 'worker_threads';

if (isMainThread) {
  // Main thread - distribute work
  const processLargeBatch = async (tweets: Tweet[]) => {
    const chunkSize = Math.ceil(tweets.length / 4);
    const chunks = chunkArray(tweets, chunkSize);

    const workers = chunks.map(
      (chunk) =>
        new Worker(__filename, {
          workerData: { tweets: chunk },
        })
    );

    const results = await Promise.all(
      workers.map(
        (worker) =>
          new Promise((resolve) => {
            worker.on('message', resolve);
            worker.on('error', reject);
          })
      )
    );

    return results.flat();
  };
} else {
  // Worker thread - process data
  const { tweets } = workerData;
  const results = await processTweetBatch(tweets);
  parentPort.postMessage(results);
}
```

#### Algorithm Optimization

```typescript
// Optimized sentiment analysis with early termination
class OptimizedSentimentAnalyzer {
  analyze(text: string): SentimentResult {
    // Quick classification for obvious cases
    if (this.isObviouslyPositive(text)) {
      return { label: 'positive', confidence: 0.95, score: 0.8 };
    }

    if (this.isObviouslyNegative(text)) {
      return { label: 'negative', confidence: 0.95, score: -0.8 };
    }

    // Full analysis only when needed
    return this.fullAnalysis(text);
  }

  private isObviouslyPositive(text: string): boolean {
    const strongPositive = ['amazing', 'excellent', 'love', 'perfect'];
    return strongPositive.some((word) => text.toLowerCase().includes(word));
  }
}
```

### 6. Network Optimization

#### Response Compression

```typescript
import compression from 'compression';

app.use(
  compression({
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    },
    level: 6,
    threshold: 1024,
  })
);
```

#### Request Optimization

```typescript
// Minimize payload size
const optimizedResponse = {
  id: tweet.id,
  content: tweet.content.substring(0, 280), // Limit content
  sentiment: {
    label: tweet.sentiment.label,
    score: Math.round(tweet.sentiment.score * 100) / 100, // Round to 2 decimal places
  },
  timestamp: tweet.createdAt.getTime(), // Use timestamp instead of date string
};
```

#### HTTP/2 and Keep-Alive

```typescript
import http2 from 'http2';

// Enable HTTP/2
const server = http2.createSecureServer({
  key: fs.readFileSync('private-key.pem'),
  cert: fs.readFileSync('certificate.pem'),
});

// Keep-alive settings
server.keepAliveTimeout = 5000;
server.headersTimeout = 6000;
```

## 📊 Performance Monitoring

### Key Metrics to Track

#### Application Metrics

```typescript
// Response time percentiles
const responseTimeMetrics = {
  p50: calculatePercentile(responseTimes, 50),
  p90: calculatePercentile(responseTimes, 90),
  p95: calculatePercentile(responseTimes, 95),
  p99: calculatePercentile(responseTimes, 99),
};

// Throughput metrics
const throughputMetrics = {
  requestsPerSecond: totalRequests / timeWindow,
  concurrentConnections: activeConnections.size,
  queueDepth: pendingRequests.length,
};

// Error metrics
const errorMetrics = {
  errorRate: errors / totalRequests,
  errorsByType: groupBy(errors, 'type'),
  timeToRecover: avgRecoveryTime,
};
```

#### System Metrics

```typescript
// CPU usage
const cpuUsage = process.cpuUsage();
const cpuPercent = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds

// Memory usage
const memUsage = process.memoryUsage();
const memPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

// Event loop lag
const start = Date.now();
setImmediate(() => {
  const lag = Date.now() - start;
  console.log(`Event loop lag: ${lag}ms`);
});
```

### Performance Dashboard

#### Real-time Monitoring

```typescript
// Performance monitoring middleware
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;

    performanceMonitor.trackEndpoint(
      req.method,
      req.path,
      res.statusCode,
      duration,
      req.get('content-length'),
      res.get('content-length')
    );
  });

  next();
});
```

#### Alerting Thresholds

```typescript
const alertThresholds = {
  responseTime: {
    warning: 500, // 500ms
    critical: 1000, // 1 second
  },
  errorRate: {
    warning: 0.05, // 5%
    critical: 0.1, // 10%
  },
  memoryUsage: {
    warning: 0.8, // 80%
    critical: 0.9, // 90%
  },
  cpuUsage: {
    warning: 0.7, // 70%
    critical: 0.9, // 90%
  },
};
```

## 🔧 Load Testing

### Performance Testing Setup

#### Artillery Load Testing

```yaml
# artillery-config.yml
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 10
    - duration: 120
      arrivalRate: 25
    - duration: 60
      arrivalRate: 50

scenarios:
  - name: 'Sentiment Analysis Load Test'
    weight: 60
    flow:
      - post:
          url: '/api/sentiment/analyze'
          headers:
            Authorization: 'Bearer {{ token }}'
          json:
            text: 'This is a test message for load testing'
            method: 'hybrid'

  - name: 'Campaign Metrics Load Test'
    weight: 40
    flow:
      - get:
          url: '/api/campaigns/{{ campaignId }}/metrics'
          headers:
            Authorization: 'Bearer {{ token }}'
```

#### Running Load Tests

```bash
# Install Artillery
npm install -g artillery

# Run load test
artillery run artillery-config.yml

# Generate report
artillery run artillery-config.yml --output report.json
artillery report report.json
```

### Stress Testing

```javascript
// stress-test.js
const axios = require('axios');

async function stressTest() {
  const concurrentRequests = 100;
  const totalRequests = 1000;

  const promises = [];

  for (let i = 0; i < totalRequests; i++) {
    if (promises.length >= concurrentRequests) {
      await Promise.race(promises);
      promises.splice(
        promises.findIndex((p) => p.isResolved),
        1
      );
    }

    const promise = axios
      .post('/api/sentiment/analyze', {
        text: `Test message ${i}`,
        method: 'hybrid',
      })
      .then((response) => {
        promise.isResolved = true;
        return response;
      });

    promises.push(promise);
  }

  await Promise.all(promises);
}
```

## 🚀 Production Optimizations

### Environment Configuration

#### Production Settings

```env
# Performance settings
NODE_ENV=production
UV_THREADPOOL_SIZE=16
NODE_OPTIONS="--max-old-space-size=4096"

# Database settings
MONGODB_POOL_SIZE=10
MONGODB_TIMEOUT=5000

# Cache settings
REDIS_POOL_SIZE=10
CACHE_TTL=300000

# Rate limiting
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
```

#### PM2 Configuration

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'sentimentalsocial',
      script: 'dist/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      max_memory_restart: '1G',
      node_args: '--max-old-space-size=1024',
    },
  ],
};
```

### CDN and Caching

#### Static Asset Optimization

```typescript
// Static file serving with caching
app.use(
  '/static',
  express.static('public', {
    maxAge: '1y',
    etag: true,
    lastModified: true,
    setHeaders: (res, path) => {
      if (path.endsWith('.js') || path.endsWith('.css')) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  })
);
```

#### API Response Caching

```typescript
// Cache API responses
app.get('/api/campaigns/:id/metrics', cache('10 minutes'), async (req, res) => {
  const metrics = await getCampaignMetrics(req.params.id);
  res.json(metrics);
});
```

## 📈 Performance Checklist

### Pre-deployment Checklist

- [ ] **Database Indexes**: All queries have appropriate indexes
- [ ] **Caching Strategy**: Critical paths are cached with appropriate TTL
- [ ] **Memory Management**: No memory leaks detected
- [ ] **Query Optimization**: Slow queries identified and optimized
- [ ] **Load Testing**: Application tested under expected load
- [ ] **Monitoring**: Performance metrics and alerting configured
- [ ] **Compression**: Response compression enabled
- [ ] **Connection Pooling**: Database connections optimized
- [ ] **Error Handling**: Graceful degradation implemented
- [ ] **Resource Limits**: Memory and CPU limits configured

### Ongoing Monitoring

- [ ] **Response Times**: < 200ms for 95% of requests
- [ ] **Cache Hit Rate**: > 80% for cacheable requests
- [ ] **Error Rate**: < 1% of total requests
- [ ] **Memory Usage**: < 80% of available memory
- [ ] **CPU Usage**: < 70% average utilization
- [ ] **Database Performance**: Query times within limits
- [ ] **Queue Depths**: No requests backing up
- [ ] **User Experience**: No performance complaints

## 🔍 Troubleshooting

### Common Performance Issues

#### High Memory Usage

```bash
# Generate heap dump
kill -USR2 <process_id>

# Analyze with clinic.js
npm install -g @clinic/doctor
clinic doctor -- node dist/server.js
```

#### Slow Database Queries

```javascript
// Enable MongoDB profiling
db.setProfilingLevel(2, { slowms: 100 });

// View slow operations
db.system.profile.find().sort({ ts: -1 }).limit(5);
```

#### High CPU Usage

```bash
# CPU profiling with clinic.js
clinic flame -- node dist/server.js

# Profile with Node.js built-in profiler
node --prof dist/server.js
node --prof-process isolate-*.log > processed.txt
```

### Performance Debugging Tools

#### Application Performance Monitoring

```typescript
// Custom performance tracker
class PerformanceTracker {
  private traces = new Map<string, number>();

  start(name: string): void {
    this.traces.set(name, Date.now());
  }

  end(name: string): number {
    const start = this.traces.get(name);
    if (!start) return 0;

    const duration = Date.now() - start;
    this.traces.delete(name);

    console.log(`${name}: ${duration}ms`);
    return duration;
  }
}

// Usage
const tracker = new PerformanceTracker();
tracker.start('sentiment-analysis');
await analyzeSentiment(text);
tracker.end('sentiment-analysis');
```

---

_Follow these guidelines to maintain optimal performance as your application scales._
