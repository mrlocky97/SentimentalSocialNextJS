# Redis Setup Guide for Windows

## Option 1: Docker (Recommended)

### Prerequisites
- Docker Desktop for Windows

### Installation Steps

1. **Pull Redis Docker Image**
```bash
docker pull redis:latest
```

2. **Run Redis Container**
```bash
docker run -d --name redis-sentimentalsocial -p 6379:6379 redis:latest
```

3. **Verify Redis is Running**
```bash
docker ps
```

4. **Test Redis Connection**
```bash
docker exec -it redis-sentimentalsocial redis-cli ping
# Should return: PONG
```

### Docker Compose (Alternative)
Create `docker-compose.redis.yml`:
```yaml
version: '3.8'
services:
  redis:
    image: redis:latest
    container_name: redis-sentimentalsocial
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped
    command: redis-server --appendonly yes

volumes:
  redis_data:
```

Run with:
```bash
docker-compose -f docker-compose.redis.yml up -d
```

## Option 2: WSL2 + Linux Redis

### Prerequisites
- WSL2 enabled
- Ubuntu or similar Linux distribution

### Installation Steps

1. **Open WSL2 Terminal**
```bash
wsl
```

2. **Update Package List**
```bash
sudo apt update
```

3. **Install Redis**
```bash
sudo apt install redis-server
```

4. **Start Redis Service**
```bash
sudo service redis-server start
```

5. **Test Redis**
```bash
redis-cli ping
# Should return: PONG
```

6. **Configure Redis to Start Automatically**
```bash
sudo systemctl enable redis-server
```

## Option 3: Windows Native (Not Recommended)

### Using Memurai (Redis-compatible)

1. **Download Memurai**
   - Visit: https://www.memurai.com/
   - Download Windows version

2. **Install and Configure**
   - Follow installer instructions
   - Default port: 6379

## Environment Configuration

Add to your `.env` file:
```env
# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Queue Configuration
QUEUE_MAX_CONCURRENT_JOBS=5
QUEUE_MAX_RETRIES=3
QUEUE_RETRY_DELAY=2000

# Advanced Scraping
ENABLE_ADVANCED_SCRAPING=true
ENABLE_WEBSOCKET_PROGRESS=true
```

## Testing the Setup

### Test Script
Create `test-redis.js`:
```javascript
const Redis = require('redis');

async function testRedis() {
  const client = Redis.createClient({
    url: 'redis://localhost:6379'
  });

  try {
    await client.connect();
    console.log('✅ Redis connected successfully');
    
    await client.set('test', 'Hello Redis!');
    const value = await client.get('test');
    console.log('✅ Test value:', value);
    
    await client.del('test');
    console.log('✅ Test cleanup completed');
    
  } catch (error) {
    console.error('❌ Redis test failed:', error);
  } finally {
    await client.quit();
  }
}

testRedis();
```

Run test:
```bash
node test-redis.js
```

## Common Issues and Solutions

### Issue: Connection Refused
**Solution:** Ensure Redis service is running
```bash
# Docker
docker ps
docker start redis-sentimentalsocial

# WSL2
sudo service redis-server status
sudo service redis-server start
```

### Issue: Port Already in Use
**Solution:** Check what's using port 6379
```bash
# Windows
netstat -ano | findstr :6379

# Change port in Redis config or use different port
docker run -d --name redis-sentimentalsocial -p 6380:6379 redis:latest
```
Then update REDIS_PORT=6380 in .env

### Issue: Permission Denied (WSL2)
**Solution:** Fix Redis permissions
```bash
sudo chown redis:redis /var/lib/redis
sudo chmod 755 /var/lib/redis
```

## Production Recommendations

### Security
```bash
# Set Redis password
docker run -d --name redis-sentimentalsocial -p 6379:6379 redis:latest redis-server --requirepass your_password
```

Update .env:
```env
REDIS_PASSWORD=your_password
```

### Persistence
```bash
# Enable Redis persistence
docker run -d --name redis-sentimentalsocial \
  -p 6379:6379 \
  -v redis_data:/data \
  redis:latest redis-server --appendonly yes
```

### Memory Limits
```bash
# Set memory limit
docker run -d --name redis-sentimentalsocial \
  -p 6379:6379 \
  --memory="512m" \
  redis:latest redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
```

## Monitoring

### Redis CLI Commands
```bash
# Connect to Redis
docker exec -it redis-sentimentalsocial redis-cli

# Monitor real-time commands
MONITOR

# Get server info
INFO

# List all keys
KEYS *

# Check memory usage
INFO memory
```

### Bull Queue Dashboard (Optional)
```bash
npm install bull-board
```

Add to your server for queue visualization at http://localhost:3001/admin/queues
