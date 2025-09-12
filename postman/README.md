# 🚀 Postman Collections for SentimentalSocial API

## 📋 Available Collections

### 1. **SentimentalSocial-Complete.postman_collection.json**
**🎯 Complete API Testing Suite**
- All standard API endpoints
- **NEW: 🚀 ADVANCED SCRAPING** section with 9 endpoints
- Job creation, progress tracking, and queue management
- Real-time WebSocket testing capabilities
- Comprehensive error handling scenarios

### 2. **SentimentalSocial-AutomatedTests.postman_collection.json**
**🤖 Automated Advanced Scraping Tests**
- Specialized collection for testing the new scraping system
- 9 sequential automated tests with detailed logging
- Progress tracking and performance monitoring
- Stress testing for concurrent job processing
- Automatic cleanup and resource management

### 3. **Environment Files**
- `SentimentalSocial-Complete.postman_environment.json` - Updated with advanced scraping variables
- `SentimentalSocial-Local.postman_environment.json` - Local development environment

## 🚀 New Advanced Scraping Features

### **Job Management Endpoints:**
- **POST** `/api/v1/scraping/advanced/job` - Create large-scale scraping jobs (up to 1000+ tweets)
- **GET** `/api/v1/scraping/advanced/job/{jobId}` - Real-time progress tracking
- **DELETE** `/api/v1/scraping/advanced/job/{jobId}` - Cancel running jobs
- **GET** `/api/v1/scraping/advanced/jobs/user/{userId}` - List all user jobs

### **System Monitoring:**
- **GET** `/api/v1/scraping/advanced/status` - Queue system status with Redis availability
- **GET** `/api/v1/scraping/advanced/queue/stats` - Detailed queue statistics and performance metrics
- **GET** `/api/v1/scraping/advanced/health` - Advanced system health diagnostics

### **Real-time Features:**
- **WebSocket** connections for live progress updates (`ws://localhost:3001`)
- **Progress tracking** with percentage, throughput, and ETA calculations
- **Batch processing** monitoring with current/total batch information
- **Performance metrics** including tweets/second and memory usage

## 🛠️ Quick Setup

### **1. Import Collections:**
```bash
# Import both collections into Postman
1. Open Postman
2. Click "Import" 
3. Select both .json files from this directory
4. Import the environment file
```

### **2. Configure Environment:**
```json
{
  "baseUrl": "http://localhost:3001",
  "apiVersion": "v1",
  "userEmail": "your-email@example.com",
  "userPassword": "your-password",
  
  // New advanced scraping variables
  "advancedHashtag": "technology",
  "advancedSearchQuery": "artificial intelligence OR machine learning",
  "testUsername": "elonmusk",
  "smallScrapeTarget": 100,
  "mediumScrapeTarget": 500,
  "largeScrapeTarget": 1000,
  "websocketUrl": "ws://localhost:3001"
}
```

### **3. Run Tests:**

#### **Manual Testing:**
- Use the **Complete Collection** for individual endpoint testing
- Start with authentication, then explore advanced scraping features
- Monitor real-time progress through WebSocket connections

#### **Automated Testing:**
- Run the **Automated Tests Collection** for comprehensive system validation
- All tests execute sequentially with detailed console logging
- Automatic cleanup prevents resource buildup

#### **Command Line Testing:**
```bash
# Bash (Linux/Mac)
chmod +x postman/test-advanced-scraping.sh
./postman/test-advanced-scraping.sh

# PowerShell (Windows)
powershell -ExecutionPolicy Bypass -File postman/test-advanced-scraping.ps1
```

## � Test Scenarios

### **Automated Test Flow:**
1. **🔐 Authentication** - Login and token generation
2. **🏥 System Status** - Health check and Redis availability
3. **🏷️ Small Job (100 tweets)** - Basic hashtag scraping test
4. **📊 Progress Tracking** - Real-time job monitoring
5. **👤 Medium Job (500 tweets)** - User timeline scraping
6. **� Large Job (1000 tweets)** - Search query stress test
7. **📋 Job Management** - List and analyze all user jobs
8. **📊 Queue Statistics** - Performance and resource monitoring
9. **🏥 Advanced Health** - Comprehensive system diagnostics
10. **🧹 Cleanup** - Job cancellation and resource cleanup

### **Performance Metrics Tracked:**
- **Throughput**: Tweets processed per second
- **Response Times**: API endpoint latency
- **Queue Performance**: Job processing efficiency
- **Memory Usage**: System resource consumption
- **WebSocket Performance**: Real-time update delivery
- **Error Rates**: Failed job tracking and recovery

## 🎯 Advanced Features

### **Queue System:**
- **Redis-based**: High-performance job queuing (with fallback)
- **Priority Levels**: urgent, high, medium, low
- **Batch Processing**: Intelligent batching for large jobs
- **Progress Tracking**: Real-time percentage and ETA calculation
- **Concurrent Processing**: Multiple jobs running simultaneously

### **WebSocket Integration:**
- **Real-time Updates**: Live progress broadcasting
- **Job Subscriptions**: Subscribe to specific job progress
- **Connection Management**: Automatic reconnection handling
- **Performance Monitoring**: Connection statistics tracking

### **Error Handling:**
- **Graceful Degradation**: Automatic fallback to SimpleScrapingService
- **Retry Logic**: Intelligent retry with exponential backoff
- **Rate Limiting**: Automatic rate limit detection and handling
- **Resource Management**: Memory and connection limit monitoring

## 📋 Collection Contents

### **🚀 ADVANCED SCRAPING Section:**
1. **Queue System Status** - System health and Redis availability
2. **Create Large Hashtag Job** - Scrape 500 tweets from hashtag
3. **Create User Timeline Job** - Scrape 200 tweets from user
4. **Create Search Query Job** - Scrape 1000 tweets from search
5. **Get Job Progress** - Real-time progress with detailed metrics
6. **Get All User Jobs** - List and analyze job history
7. **Cancel Scraping Job** - Stop running jobs
8. **Get Queue Statistics** - Performance and resource metrics
9. **Health Check Advanced** - Comprehensive system diagnostics

### **Automated Testing Scripts:**
- **Pre-request Scripts**: Environment setup and token management
- **Test Scripts**: Comprehensive validation with detailed logging
- **Progress Tracking**: Real-time job monitoring and metrics
- **Error Handling**: Graceful failure detection and reporting
- **Cleanup**: Automatic resource management and job cancellation

## 🔧 Environment Variables

### **Required:**
- `baseUrl` - API server URL
- `apiVersion` - API version (v1)
- `userEmail` - User credentials
- `userPassword` - User credentials

### **Advanced Scraping:**
- `advancedHashtag` - Test hashtag (e.g., "technology")
- `advancedSearchQuery` - Complex search query
- `testUsername` - Twitter username for testing
- `smallScrapeTarget` - Small job size (100)
- `mediumScrapeTarget` - Medium job size (500)
- `largeScrapeTarget` - Large job size (1000)

### **Auto-populated:**
- `authToken` - JWT token from login
- `userId` - User ID from authentication
- `scrapingJobId` - Job ID from job creation
- `smallHashtagJobId` - Small job tracking
- `mediumUserJobId` - Medium job tracking
- `largeSearchJobId` - Large job tracking

## 🏥 System Requirements

### **Server Requirements:**
- **Node.js**: Version 18+
- **MongoDB**: Database connection
- **Redis**: Optional (for enhanced queue features)
- **WebSocket**: Socket.IO support enabled

### **Testing Requirements:**
- **Postman**: Version 10+
- **Environment**: Variables properly configured
- **Authentication**: Valid user credentials
- **Network**: Access to localhost:3001

## 📈 Performance Guidelines

### **Recommended Test Sizes:**
- **Development**: 50-100 tweets per job
- **Testing**: 100-500 tweets per job
- **Production**: 500-1000+ tweets per job

### **Resource Monitoring:**
- **Memory Usage**: Keep below 80%
- **Queue Depth**: Monitor waiting jobs
- **Response Times**: Aim for <5 seconds
- **Error Rates**: Keep below 5%

## � Troubleshooting

### **Common Issues:**
1. **Authentication Failures**: Check email/password in environment
2. **Connection Errors**: Verify server is running on localhost:3001
3. **WebSocket Issues**: Ensure Socket.IO is enabled on server
4. **Queue Problems**: Check Redis connection or use fallback mode
5. **Rate Limiting**: Monitor Twitter API usage limits

### **Debug Steps:**
1. **Check Console Logs**: Detailed error information in Postman console
2. **Verify Environment**: Ensure all variables are properly set
3. **Test Basic Endpoints**: Start with health check and authentication
4. **Monitor Server Logs**: Check server console for detailed errors
5. **Use Command Line Tests**: Run automated scripts for system validation

## 📚 Additional Resources

- **📖 ADVANCED_SCRAPING_GUIDE.md** - Detailed usage guide
- **🔧 test-advanced-scraping.sh** - Bash test script
- **🔧 test-advanced-scraping.ps1** - PowerShell test script
- **📊 Environment Files** - Pre-configured testing environments

## 🚀 Getting Started

1. **Start the Server**: Ensure SentimentalSocial server is running
2. **Import Collections**: Load both Postman collections
3. **Configure Environment**: Set up your credentials and test data
4. **Run Authentication**: Execute login to get auth token
5. **Test Advanced Features**: Explore the new scraping capabilities
6. **Monitor Performance**: Use queue statistics and health checks
7. **Scale Testing**: Gradually increase job sizes and complexity

**Happy Testing! 🎉**
