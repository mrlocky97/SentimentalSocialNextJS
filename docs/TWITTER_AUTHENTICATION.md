# Twitter Authentication Setup

## Overview
This project uses a hybrid approach for Twitter data collection:
- **Primary**: Real Twitter scraper with cookie-based authentication
- **Fallback**: Mock scraper with realistic data for development/testing

## Cookie-Based Authentication

### 1. Manual Cookie Extraction

1. **Login to Twitter/X** in your browser
2. **Open Developer Tools** (F12)
3. **Go to Application/Storage → Cookies → https://x.com**
4. **Copy the following essential cookies:**

#### Required Cookies:
- `auth_token` - Authentication token
- `ct0` - CSRF token  
- `guest_id` - Guest identifier
- `_twitter_sess` - Session data
- `twid` - Twitter ID
- `kdt` - Key data token
- `att` - Attention token

#### Optional but Recommended:
- `cf_clearance` - Cloudflare clearance
- `__cf_bm` - Cloudflare bot management
- `gt` - Guest token

### 2. Cookie Import Process

1. **Edit `manual-cookies.json`** with your extracted cookies:
```json
{
  "cookies": [
    {
      "name": "auth_token",
      "value": "your_auth_token_here",
      "domain": ".x.com",
      "path": "/",
      "secure": true,
      "httpOnly": true,
      "sameSite": "None"
    }
    // ... more cookies
  ],
  "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  "timestamp": null,
  "isValid": true
}
```

2. **Run the import script:**
```bash
node import-cookies.js
```

3. **Verify import:**
```bash
✅ Successfully imported manual cookies!
🍪 Saved 10 cookies
📁 Saved to: cookies.json
⏰ Valid for 24 hours
```

### 3. System Behavior

#### Real Scraper Mode:
- Uses imported cookies for authentication
- Scrapes actual Twitter data
- Respects rate limits
- Falls back to mock on authentication failure

#### Mock Scraper Mode:
- Generates realistic fake data
- No authentication required
- Consistent for development/testing
- Includes sentiment analysis

## API Endpoints

### Test the System:
```bash
# Test hashtag scraping
curl -X POST http://localhost:3001/api/v1/scraping/hashtag \
  -H "Content-Type: application/json" \
  -d '{"hashtag": "AI", "maxTweets": 5}'

# Test user scraping  
curl -X POST http://localhost:3001/api/v1/scraping/user \
  -H "Content-Type: application/json" \
  -d '{"username": "elonmusk", "maxTweets": 3}'

# Check system status
curl http://localhost:3001/api/v1/scraping/status
```

## Troubleshooting

### Common Issues:

1. **"Forbidden" errors:**
   - Cookies may have expired
   - Extract fresh cookies from browser
   - Check User-Agent compatibility

2. **"Scraper is not logged-in":**
   - Authentication failed
   - System automatically falls back to mock
   - Check cookie format and values

3. **No tweets returned:**
   - Rate limiting may be active
   - Try different hashtags/users
   - Check system status endpoint

### Maintenance:
- Cookies expire after 24 hours by default
- Re-extract cookies when authentication fails
- Monitor rate limits through status endpoint

## Production Considerations

1. **Security:**
   - Store cookies securely
   - Rotate authentication regularly
   - Use environment variables for sensitive data

2. **Rate Limiting:**
   - Respect Twitter's rate limits
   - Implement exponential backoff
   - Monitor usage patterns

3. **Fallback Strategy:**
   - Always have mock data available
   - Graceful degradation on auth failure
   - Clear error messages for debugging
