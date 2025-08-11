/**
 * Swagger Configuration
 * API Documentation setup for SentimentalSocial Marketing Analytics Platform
 */

import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SentimentalSocial API',
      version: '1.0.0',
      description: 'API for Twitter Sentiment Analysis and Marketing Analytics Platform',
      contact: {
        name: 'SentimentalSocial Team',
        email: 'api@sentimentalsocial.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server',
      },
      {
        url: 'https://api.sentimentalsocial.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token for API authentication',
        },
        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API Key for external integrations',
        },
      },
      schemas: {
        // User Schemas
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique identifier for the user',
              example: '60d0fe4f5311236168a109ca',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
              example: 'user@company.com',
            },
            username: {
              type: 'string',
              description: 'Unique username',
              example: 'analyst_john',
            },
            displayName: {
              type: 'string',
              description: 'Display name',
              example: 'John Analyst',
            },
            avatar: {
              type: 'string',
              nullable: true,
              description: 'Avatar URL',
              example: 'https://example.com/avatar.jpg',
            },
            role: {
              type: 'string',
              enum: ['admin', 'manager', 'analyst', 'onlyView', 'client'],
              description: 'User role in the system',
              example: 'analyst',
            },
            permissions: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'User permissions',
              example: ['campaigns:view', 'analytics:view'],
            },
            organizationId: {
              type: 'string',
              nullable: true,
              description: 'Organization ID',
              example: '60d0fe4f5311236168a109cb',
            },
            isActive: {
              type: 'boolean',
              description: 'Whether user is active',
              example: true,
            },
            isVerified: {
              type: 'boolean',
              description: 'Whether user is verified',
              example: true,
            },
            lastLoginAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              description: 'Last login timestamp',
              example: '2024-01-15T10:30:00Z',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp',
              example: '2024-01-10T08:00:00Z',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp',
              example: '2024-01-15T10:30:00Z',
            },
          },
          required: [
            'id',
            'email',
            'username',
            'displayName',
            'role',
            'permissions',
            'isActive',
            'isVerified',
            'createdAt',
            'updatedAt',
          ],
        },

        CreateUserRequest: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
              example: 'newuser@company.com',
            },
            username: {
              type: 'string',
              minLength: 3,
              maxLength: 30,
              pattern: '^[a-zA-Z0-9_]+$',
              description: 'Unique username',
              example: 'new_analyst',
            },
            displayName: {
              type: 'string',
              maxLength: 50,
              description: 'Display name',
              example: 'New Analyst',
            },
            password: {
              type: 'string',
              minLength: 8,
              description: 'User password',
              example: 'securePassword123!',
            },
            role: {
              type: 'string',
              enum: ['admin', 'manager', 'analyst', 'onlyView', 'client'],
              description: 'User role',
              example: 'analyst',
            },
            organizationId: {
              type: 'string',
              nullable: true,
              description: 'Organization ID',
              example: '60d0fe4f5311236168a109cb',
            },
          },
          required: ['email', 'username', 'displayName', 'password'],
        },

        // Campaign Schemas
        Campaign: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Campaign ID',
              example: '60d0fe4f5311236168a109cc',
            },
            name: {
              type: 'string',
              description: 'Campaign name',
              example: 'Q1 Brand Sentiment Analysis',
            },
            description: {
              type: 'string',
              nullable: true,
              description: 'Campaign description',
              example: 'Analyzing brand sentiment for Q1 marketing campaign',
            },
            keywords: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'Keywords to track',
              example: ['brand', 'product', 'marketing'],
            },
            hashtags: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'Hashtags to track',
              example: ['#brand2024', '#newproduct'],
            },
            status: {
              type: 'string',
              enum: ['active', 'paused', 'completed', 'draft'],
              description: 'Campaign status',
              example: 'active',
            },
            startDate: {
              type: 'string',
              format: 'date-time',
              description: 'Campaign start date',
              example: '2024-01-01T00:00:00Z',
            },
            endDate: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              description: 'Campaign end date',
              example: '2024-03-31T23:59:59Z',
            },
            createdBy: {
              type: 'string',
              description: 'User ID who created the campaign',
              example: '60d0fe4f5311236168a109ca',
            },
            settings: {
              type: 'object',
              properties: {
                maxTweets: {
                  type: 'integer',
                  minimum: 1,
                  maximum: 100000,
                  description: 'Maximum tweets to collect',
                  example: 10000,
                },
                languages: {
                  type: 'array',
                  items: {
                    type: 'string',
                  },
                  description: 'Languages to include',
                  example: ['en', 'es'],
                },
                excludeRetweets: {
                  type: 'boolean',
                  description: 'Whether to exclude retweets',
                  example: true,
                },
              },
            },
            analytics: {
              type: 'object',
              nullable: true,
              properties: {
                totalTweets: {
                  type: 'integer',
                  description: 'Total tweets collected',
                  example: 5230,
                },
                avgSentiment: {
                  type: 'number',
                  minimum: -1,
                  maximum: 1,
                  description: 'Average sentiment score',
                  example: 0.65,
                },
                lastScrapedAt: {
                  type: 'string',
                  format: 'date-time',
                  nullable: true,
                  description: 'Last scraping timestamp',
                  example: '2024-01-15T10:30:00Z',
                },
              },
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp',
              example: '2024-01-10T08:00:00Z',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp',
              example: '2024-01-15T10:30:00Z',
            },
          },
        },

        // Tweet Schemas - Updated with realistic examples
        Tweet: {
          type: 'object',
          description:
            'A Twitter tweet with comprehensive sentiment analysis and engagement metrics',
          properties: {
            id: {
              type: 'string',
              description: 'Unique tweet document ID in our database',
              example: '60d0fe4f5311236168a109cd',
            },
            tweetId: {
              type: 'string',
              description: 'Original Twitter tweet ID from Twitter API',
              example: '1747234567890123456',
            },
            content: {
              type: 'string',
              description: 'Full text content of the tweet',
              example:
                "Just tried the new #iPhone15 and it's absolutely incredible! 📱✨ The camera quality is mind-blowing. Highly recommended! @Apple #TechReview",
            },
            author: {
              type: 'object',
              description: 'Twitter user who posted the tweet',
              properties: {
                id: {
                  type: 'string',
                  description: 'Twitter user unique identifier',
                  example: 'twitter_user_123456',
                },
                username: {
                  type: 'string',
                  description: 'Twitter handle without @',
                  example: 'techreviewerjohn',
                },
                displayName: {
                  type: 'string',
                  description: "User's display name",
                  example: 'John - Tech Reviewer',
                },
                verified: {
                  type: 'boolean',
                  description: 'Whether user has Twitter verification badge',
                  example: true,
                },
                followersCount: {
                  type: 'integer',
                  description: 'Number of followers the user has',
                  example: 45000,
                },
                followingCount: {
                  type: 'integer',
                  description: 'Number of accounts the user follows',
                  example: 1200,
                },
                tweetsCount: {
                  type: 'integer',
                  description: 'Total number of tweets posted by user',
                  example: 3500,
                },
              },
            },
            metrics: {
              type: 'object',
              description: 'Engagement metrics for the tweet',
              properties: {
                likes: {
                  type: 'integer',
                  description: 'Number of likes on the tweet',
                  example: 1250,
                },
                retweets: {
                  type: 'integer',
                  description: 'Number of retweets',
                  example: 340,
                },
                replies: {
                  type: 'integer',
                  description: 'Number of replies',
                  example: 89,
                },
                quotes: {
                  type: 'integer',
                  description: 'Number of quote tweets',
                  example: 45,
                },
                engagement: {
                  type: 'number',
                  description: 'Calculated engagement rate (interactions/followers)',
                  example: 0.038,
                },
              },
            },
            sentiment: {
              type: 'object',
              nullable: true,
              description: 'AI-powered sentiment analysis results',
              properties: {
                score: {
                  type: 'number',
                  minimum: -1,
                  maximum: 1,
                  description: 'Sentiment score: -1 (very negative) to +1 (very positive)',
                  example: 0.87,
                },
                magnitude: {
                  type: 'number',
                  minimum: 0,
                  maximum: 1,
                  description: 'Emotional intensity: 0 (neutral) to 1 (very emotional)',
                  example: 0.92,
                },
                label: {
                  type: 'string',
                  enum: ['positive', 'negative', 'neutral'],
                  description: 'Human-readable sentiment classification',
                  example: 'positive',
                },
                confidence: {
                  type: 'number',
                  minimum: 0,
                  maximum: 1,
                  description: 'Confidence in sentiment analysis (0-1)',
                  example: 0.94,
                },
                keywords: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Key words that influenced sentiment',
                  example: ['incredible', 'mind-blowing', 'recommended'],
                },
                analyzedAt: {
                  type: 'string',
                  format: 'date-time',
                  description: 'When sentiment analysis was performed',
                  example: '2024-01-15T10:30:00Z',
                },
                processingTime: {
                  type: 'integer',
                  description: 'Analysis processing time in milliseconds',
                  example: 245,
                },
              },
            },
            hashtags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Hashtags mentioned in the tweet',
              example: ['#iPhone15', '#TechReview'],
            },
            mentions: {
              type: 'array',
              items: { type: 'string' },
              description: 'User mentions in the tweet',
              example: ['@Apple'],
            },
            urls: {
              type: 'array',
              items: { type: 'string' },
              description: 'URLs shared in the tweet',
              example: ['https://apple.com/iphone'],
            },
            language: {
              type: 'string',
              description: 'Detected language of the tweet (ISO code)',
              example: 'en',
            },
            isRetweet: {
              type: 'boolean',
              description: 'Whether this is a retweet',
              example: false,
            },
            isReply: {
              type: 'boolean',
              description: 'Whether this is a reply to another tweet',
              example: false,
            },
            campaignId: {
              type: 'string',
              nullable: true,
              description: 'ID of associated marketing campaign',
              example: '60d0fe4f5311236168a109ca',
            },
            scrapedAt: {
              type: 'string',
              format: 'date-time',
              description: 'When the tweet was scraped from Twitter',
              example: '2024-01-15T10:25:00Z',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'When the tweet was originally posted on Twitter',
              example: '2024-01-15T09:45:00Z',
            },
          },
          required: [
            'id',
            'tweetId',
            'content',
            'author',
            'metrics',
            'hashtags',
            'mentions',
            'urls',
          ],
          example: {
            id: '60d0fe4f5311236168a109cd',
            tweetId: '1747234567890123456',
            content:
              "Just tried the new #iPhone15 and it's absolutely incredible! 📱✨ The camera quality is mind-blowing. Highly recommended! @Apple #TechReview",
            author: {
              id: 'twitter_user_123456',
              username: 'techreviewerjohn',
              displayName: 'John - Tech Reviewer',
              verified: true,
              followersCount: 45000,
              followingCount: 1200,
              tweetsCount: 3500,
            },
            metrics: {
              likes: 1250,
              retweets: 340,
              replies: 89,
              quotes: 45,
              engagement: 0.038,
            },
            sentiment: {
              score: 0.87,
              magnitude: 0.92,
              label: 'positive',
              confidence: 0.94,
              keywords: ['incredible', 'mind-blowing', 'recommended'],
              analyzedAt: '2024-01-15T10:30:00Z',
              processingTime: 245,
            },
            hashtags: ['#iPhone15', '#TechReview'],
            mentions: ['@Apple'],
            urls: ['https://apple.com/iphone'],
            language: 'en',
            isRetweet: false,
            isReply: false,
            campaignId: '60d0fe4f5311236168a109ca',
            scrapedAt: '2024-01-15T10:25:00Z',
            createdAt: '2024-01-15T09:45:00Z',
          },
        },

        // Common Schemas
        PaginationParams: {
          type: 'object',
          properties: {
            page: {
              type: 'integer',
              minimum: 1,
              description: 'Page number',
              example: 1,
            },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              description: 'Items per page',
              example: 20,
            },
          },
        },

        PaginatedResponse: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: {},
              description: 'Array of items',
            },
            pagination: {
              type: 'object',
              properties: {
                page: {
                  type: 'integer',
                  description: 'Current page',
                  example: 1,
                },
                limit: {
                  type: 'integer',
                  description: 'Items per page',
                  example: 20,
                },
                total: {
                  type: 'integer',
                  description: 'Total items',
                  example: 150,
                },
                totalPages: {
                  type: 'integer',
                  description: 'Total pages',
                  example: 8,
                },
                hasNext: {
                  type: 'boolean',
                  description: 'Has next page',
                  example: true,
                },
                hasPrev: {
                  type: 'boolean',
                  description: 'Has previous page',
                  example: false,
                },
              },
            },
          },
        },

        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  description: 'Error code',
                  example: 'VALIDATION_ERROR',
                },
                message: {
                  type: 'string',
                  description: 'Error message',
                  example: 'Invalid input data provided',
                },
                details: {
                  type: 'object',
                  description: 'Additional error details',
                  nullable: true,
                },
              },
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Error timestamp',
              example: '2024-01-15T10:30:00Z',
            },
            path: {
              type: 'string',
              description: 'API path where error occurred',
              example: '/api/v1/users',
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts', './src/middleware/*.ts'],
};

const specs = swaggerJsdoc(options);

export const setupSwagger = (app: Express): void => {
  // Swagger UI
  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(specs, {
      explorer: true,
      customCss: `
      .topbar-wrapper img { content: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iMTYiIGZpbGw9IiMwMDdCRkYiLz4KPHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEwIDEwTDEwIDEwWiIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KPC9zdmc+Cjwvc3ZnPgo='); }
      .swagger-ui .topbar { background-color: #1f2937; }
      .swagger-ui .topbar-wrapper .download-url-wrapper { display: none; }
    `,
      customSiteTitle: 'SentimentalSocial API Documentation',
      customfavIcon: '/favicon.ico',
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        defaultModelsExpandDepth: 2,
        defaultModelExpandDepth: 2,
        docExpansion: 'list',
        filter: true,
        showRequestHeaders: true,
      },
    })
  );

  // JSON endpoint
  app.get('/api-docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });
};

export default specs;
