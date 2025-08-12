# 🔌 API Documentation

## Base URL
```
http://localhost:3000/api
```

## Authentication

All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

### Authentication Endpoints

#### POST /auth/login
Login with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "64f1b2c3d4e5f6789abc",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

#### POST /auth/register
Register a new user account.

**Request:**
```json
{
  "name": "John Doe",
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": "64f1b2c3d4e5f6789abc",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

#### POST /auth/logout
Logout current user (protected).

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

## Sentiment Analysis

### POST /sentiment/analyze
Analyze sentiment of provided text.

**Request:**
```json
{
  "text": "I love this new product! It's amazing.",
  "method": "hybrid"
}
```

**Parameters:**
- `text` (string, required): Text to analyze
- `method` (string, optional): Analysis method (`naive`, `rule`, `ml`, `advanced`, `hybrid`)

**Response:**
```json
{
  "label": "positive",
  "confidence": 0.89,
  "score": 0.75,
  "method": "hybrid",
  "explanation": "Positive sentiment detected based on words: love, amazing",
  "languageAnalysis": {
    "detectedLanguage": "en",
    "emotionalIntensity": 0.8,
    "textStats": {
      "length": 42,
      "complexity": 0.3
    }
  }
}
```

### GET /sentiment/test
Quick sentiment analysis test endpoint.

**Response:**
```json
{
  "label": "positive",
  "confidence": 0.95,
  "score": 0.8,
  "method": "rule",
  "text": "This is a test of sentiment analysis",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### POST /sentiment/compare
Compare different sentiment analysis methods.

**Request:**
```json
{
  "text": "This product is okay, nothing special."
}
```

**Response:**
```json
{
  "text": "This product is okay, nothing special.",
  "methods": {
    "naive": {
      "label": "neutral",
      "confidence": 0.65,
      "score": 0.05
    },
    "rule": {
      "label": "neutral",
      "confidence": 0.72,
      "score": 0.1
    },
    "hybrid": {
      "label": "neutral",
      "confidence": 0.84,
      "score": 0.08
    }
  },
  "recommendation": "hybrid",
  "consensus": "neutral"
}
```

## Campaign Management

### GET /campaigns
Get all campaigns for authenticated user (protected).

**Query Parameters:**
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 10)
- `status` (string, optional): Filter by status (`active`, `paused`, `completed`)

**Response:**
```json
{
  "campaigns": [
    {
      "id": "64f1b2c3d4e5f6789abc",
      "name": "Brand Monitor Q1 2024",
      "description": "Monitor brand mentions and sentiment",
      "status": "active",
      "hashtags": ["#brand", "#product"],
      "keywords": ["brand name", "product"],
      "settings": {
        "sentimentAnalysis": true,
        "emotionAnalysis": true,
        "influencerAnalysis": false
      },
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T12:45:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3
  }
}
```

### POST /campaigns
Create a new campaign (protected).

**Request:**
```json
{
  "name": "Summer Campaign 2024",
  "description": "Monitor summer product launch",
  "hashtags": ["#summer", "#newproduct"],
  "keywords": ["summer collection", "new launch"],
  "settings": {
    "sentimentAnalysis": true,
    "emotionAnalysis": true,
    "influencerAnalysis": true,
    "maxTweets": 10000,
    "languages": ["en", "es"]
  }
}
```

**Response:**
```json
{
  "success": true,
  "campaign": {
    "id": "64f1b2c3d4e5f6789def",
    "name": "Summer Campaign 2024",
    "description": "Monitor summer product launch",
    "status": "active",
    "hashtags": ["#summer", "#newproduct"],
    "keywords": ["summer collection", "new launch"],
    "settings": {
      "sentimentAnalysis": true,
      "emotionAnalysis": true,
      "influencerAnalysis": true,
      "maxTweets": 10000,
      "languages": ["en", "es"]
    },
    "createdAt": "2024-01-15T14:20:00Z"
  }
}
```

### GET /campaigns/:id
Get specific campaign details (protected).

**Response:**
```json
{
  "id": "64f1b2c3d4e5f6789abc",
  "name": "Brand Monitor Q1 2024",
  "description": "Monitor brand mentions and sentiment",
  "status": "active",
  "hashtags": ["#brand", "#product"],
  "keywords": ["brand name", "product"],
  "settings": {
    "sentimentAnalysis": true,
    "emotionAnalysis": true,
    "influencerAnalysis": false
  },
  "metrics": {
    "totalTweets": 1250,
    "sentimentScore": 0.65,
    "avgEngagementRate": 0.034,
    "lastUpdated": "2024-01-15T15:30:00Z"
  },
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T12:45:00Z"
}
```

### PUT /campaigns/:id
Update campaign (protected).

**Request:**
```json
{
  "name": "Updated Campaign Name",
  "description": "Updated description",
  "status": "paused",
  "settings": {
    "sentimentAnalysis": true,
    "emotionAnalysis": false,
    "influencerAnalysis": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "campaign": {
    "id": "64f1b2c3d4e5f6789abc",
    "name": "Updated Campaign Name",
    "description": "Updated description",
    "status": "paused",
    "updatedAt": "2024-01-15T16:00:00Z"
  }
}
```

### DELETE /campaigns/:id
Delete campaign (protected).

**Response:**
```json
{
  "success": true,
  "message": "Campaign deleted successfully"
}
```

### GET /campaigns/:id/metrics
Get detailed campaign metrics (protected).

**Query Parameters:**
- `timeRange` (string, optional): Time range (`1h`, `24h`, `7d`, `30d`)
- `granularity` (string, optional): Data granularity (`hour`, `day`, `week`)

**Response:**
```json
{
  "campaignId": "64f1b2c3d4e5f6789abc",
  "timeRange": "7d",
  "summary": {
    "totalTweets": 1250,
    "sentimentScore": 0.65,
    "avgEngagementRate": 0.034,
    "reachEstimate": 125000,
    "influencerMentions": 15
  },
  "sentimentDistribution": {
    "positive": 0.68,
    "neutral": 0.25,
    "negative": 0.07
  },
  "topHashtags": [
    { "hashtag": "#brand", "count": 456, "sentiment": 0.72 },
    { "hashtag": "#product", "count": 234, "sentiment": 0.61 }
  ],
  "timeSeriesData": [
    {
      "timestamp": "2024-01-15T00:00:00Z",
      "tweets": 45,
      "sentiment": 0.67,
      "engagement": 0.032
    }
  ],
  "topInfluencers": [
    {
      "username": "tech_reviewer",
      "followers": 25000,
      "mentions": 3,
      "avgSentiment": 0.85
    }
  ]
}
```

## Twitter Integration

### GET /twitter-auth/status
Check Twitter authentication status.

**Response:**
```json
{
  "authenticated": true,
  "sessionValid": true,
  "lastChecked": "2024-01-15T15:30:00Z",
  "capabilities": {
    "canScrape": true,
    "rateLimit": {
      "remaining": 45,
      "resetTime": "2024-01-15T16:00:00Z"
    }
  }
}
```

### POST /twitter-auth/validate
Validate Twitter credentials (protected).

**Request:**
```json
{
  "email": "twitter@example.com",
  "username": "twitteruser",
  "password": "twitterpass"
}
```

**Response:**
```json
{
  "success": true,
  "valid": true,
  "message": "Twitter credentials validated successfully"
}
```

## Data Collection

### POST /data/collect
Start data collection for campaign (protected).

**Request:**
```json
{
  "campaignId": "64f1b2c3d4e5f6789abc",
  "options": {
    "maxTweets": 1000,
    "language": "en",
    "includeRetweets": false,
    "timeRange": "24h"
  }
}
```

**Response:**
```json
{
  "success": true,
  "jobId": "collection_64f1b2c3d4e5f6789abc_001",
  "status": "started",
  "estimatedDuration": "5-10 minutes",
  "message": "Data collection started successfully"
}
```

### GET /data/status/:jobId
Check data collection status (protected).

**Response:**
```json
{
  "jobId": "collection_64f1b2c3d4e5f6789abc_001",
  "status": "running",
  "progress": {
    "collected": 450,
    "target": 1000,
    "percentage": 45
  },
  "estimatedCompletion": "2024-01-15T16:15:00Z",
  "errors": []
}
```

## Performance & Monitoring

### GET /performance/metrics
Get system performance metrics (admin only).

**Response:**
```json
{
  "timestamp": "2024-01-15T15:30:00Z",
  "system": {
    "uptime": 86400,
    "memory": {
      "used": 256000000,
      "total": 512000000,
      "percentage": 50
    },
    "cpu": {
      "usage": 25.5,
      "loadAverage": [1.2, 1.5, 1.8]
    }
  },
  "application": {
    "activeConnections": 15,
    "requestsPerSecond": 12.5,
    "averageResponseTime": 145,
    "errorRate": 0.02
  },
  "database": {
    "connections": 5,
    "queryTime": 25,
    "cacheHitRate": 0.85
  }
}
```

### GET /performance/health
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T15:30:00Z",
  "version": "1.0.0",
  "services": {
    "database": {
      "status": "healthy",
      "responseTime": 15
    },
    "cache": {
      "status": "healthy",
      "responseTime": 2
    },
    "twitter": {
      "status": "healthy",
      "responseTime": 250
    }
  }
}
```

## Error Responses

All endpoints may return error responses in this format:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input parameters",
    "details": {
      "field": "email",
      "reason": "Invalid email format"
    },
    "timestamp": "2024-01-15T15:30:00Z"
  }
}
```

### Common Error Codes

- `UNAUTHORIZED` (401): Missing or invalid authentication
- `FORBIDDEN` (403): Insufficient permissions
- `NOT_FOUND` (404): Resource not found
- `VALIDATION_ERROR` (400): Invalid input data
- `RATE_LIMIT_EXCEEDED` (429): Too many requests
- `INTERNAL_ERROR` (500): Server error

## Rate Limits

- General API: 100 requests per 15 minutes per IP
- Sentiment Analysis: 50 requests per minute per user
- Data Collection: 10 concurrent jobs per user
- Authentication: 5 attempts per minute per IP

## SDKs and Examples

### JavaScript/Node.js

```javascript
const SentimentalSocialAPI = require('sentimentalsocial-sdk');

const client = new SentimentalSocialAPI({
  baseURL: 'http://localhost:3000/api',
  token: 'your-jwt-token'
});

// Analyze sentiment
const result = await client.sentiment.analyze({
  text: 'I love this product!',
  method: 'hybrid'
});

// Create campaign
const campaign = await client.campaigns.create({
  name: 'My Campaign',
  hashtags: ['#brand'],
  keywords: ['product']
});
```

### Python

```python
import requests

class SentimentalSocialAPI:
    def __init__(self, base_url, token):
        self.base_url = base_url
        self.headers = {'Authorization': f'Bearer {token}'}
    
    def analyze_sentiment(self, text, method='hybrid'):
        response = requests.post(
            f'{self.base_url}/sentiment/analyze',
            json={'text': text, 'method': method},
            headers=self.headers
        )
        return response.json()

# Usage
api = SentimentalSocialAPI('http://localhost:3000/api', 'your-token')
result = api.analyze_sentiment('I love this product!')
```

### cURL Examples

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# Analyze sentiment
curl -X POST http://localhost:3000/api/sentiment/analyze \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"text":"I love this product!","method":"hybrid"}'

# Get campaigns
curl -X GET http://localhost:3000/api/campaigns \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Webhooks

### Campaign Events

Register webhook URLs to receive real-time notifications:

#### Campaign Completed
```json
{
  "event": "campaign.completed",
  "timestamp": "2024-01-15T15:30:00Z",
  "data": {
    "campaignId": "64f1b2c3d4e5f6789abc",
    "name": "Brand Monitor Q1 2024",
    "metrics": {
      "totalTweets": 1250,
      "sentimentScore": 0.65
    }
  }
}
```

#### Alert Triggered
```json
{
  "event": "alert.triggered",
  "timestamp": "2024-01-15T15:30:00Z",
  "data": {
    "campaignId": "64f1b2c3d4e5f6789abc",
    "alertType": "negative_sentiment_spike",
    "severity": "high",
    "details": {
      "currentSentiment": -0.75,
      "threshold": -0.5,
      "affectedTweets": 25
    }
  }
}
```

---

*For more information, see the [Technical Documentation](./README.md)*
