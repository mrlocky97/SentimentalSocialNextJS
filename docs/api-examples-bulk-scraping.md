# SentimentalSocial API - Bulk Processing Examples

## Hashtag Examples

### Single Hashtag (Legacy mode)
```bash
curl -X POST http://localhost:3000/api/v1/scraping/hashtag \
  -H "Content-Type: application/json" \
  -d '{
    "hashtag": "Marketing",
    "maxTweets": 20,
    "analyzeSentiment": true,
    "campaignId": "my-campaign-2025"
  }'
```

### Multiple Hashtags (New bulk mode)
```bash
curl -X POST http://localhost:3000/api/v1/scraping/hashtag \
  -H "Content-Type: application/json" \
  -d '{
    "hashtags": ["Marketing", "SocialMedia", "#Innovation"],
    "maxTweets": 20,
    "analyzeSentiment": true,
    "campaignId": "multi-hashtag-campaign-2025"
  }'
```

## User Examples

### Single User (Legacy mode)
```bash
curl -X POST http://localhost:3000/api/v1/scraping/user \
  -H "Content-Type: application/json" \
  -d '{
    "username": "nike",
    "maxTweets": 30,
    "analyzeSentiment": true,
    "campaignId": "brand-monitor-2025"
  }'
```

### Multiple Users (New bulk mode)
```bash
curl -X POST http://localhost:3000/api/v1/scraping/user \
  -H "Content-Type: application/json" \
  -d '{
    "usernames": ["nike", "@adidas", "puma"],
    "maxTweets": 30,
    "analyzeSentiment": true,
    "campaignId": "competitor-analysis-2025"
  }'
```

## Search Examples

### Single Search Query (Legacy mode)
```bash
curl -X POST http://localhost:3000/api/v1/scraping/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "running shoes",
    "maxTweets": 50,
    "language": "en",
    "analyzeSentiment": true,
    "campaignId": "product-research-2025"
  }'
```

### Multiple Search Queries (New bulk mode)
```bash
curl -X POST http://localhost:3000/api/v1/scraping/search \
  -H "Content-Type: application/json" \
  -d '{
    "queries": ["running shoes", "fitness gear", "workout equipment"],
    "maxTweets": 50,
    "language": "en",
    "analyzeSentiment": true,
    "campaignId": "fitness-industry-analysis-2025"
  }'
```
