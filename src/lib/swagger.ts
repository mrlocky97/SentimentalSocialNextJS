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
          required: ['id', 'email', 'username', 'displayName', 'role', 'permissions', 'isActive', 'isVerified', 'createdAt', 'updatedAt'],
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

        // Tweet Schemas
        Tweet: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Tweet document ID',
              example: '60d0fe4f5311236168a109cd',
            },
            tweetId: {
              type: 'string',
              description: 'Original Twitter ID',
              example: '1234567890123456789',
            },
            content: {
              type: 'string',
              description: 'Tweet content',
              example: 'Amazing product! Love the new features #brand2024',
            },
            author: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  description: 'Twitter user ID',
                  example: 'twitter_user_123',
                },
                username: {
                  type: 'string',
                  description: 'Twitter username',
                  example: 'happycustomer',
                },
                displayName: {
                  type: 'string',
                  description: 'Display name',
                  example: 'Happy Customer',
                },
                verified: {
                  type: 'boolean',
                  description: 'Whether user is verified',
                  example: false,
                },
                followersCount: {
                  type: 'integer',
                  description: 'Follower count',
                  example: 1500,
                },
              },
            },
            sentiment: {
              type: 'object',
              nullable: true,
              properties: {
                score: {
                  type: 'number',
                  minimum: -1,
                  maximum: 1,
                  description: 'Sentiment score',
                  example: 0.8,
                },
                label: {
                  type: 'string',
                  enum: ['positive', 'negative', 'neutral'],
                  description: 'Sentiment classification',
                  example: 'positive',
                },
                confidence: {
                  type: 'number',
                  minimum: 0,
                  maximum: 1,
                  description: 'Confidence level',
                  example: 0.95,
                },
                keywords: {
                  type: 'array',
                  items: {
                    type: 'string',
                  },
                  description: 'Extracted keywords',
                  example: ['amazing', 'love', 'features'],
                },
              },
            },
            metrics: {
              type: 'object',
              properties: {
                likes: {
                  type: 'integer',
                  description: 'Like count',
                  example: 45,
                },
                retweets: {
                  type: 'integer',
                  description: 'Retweet count',
                  example: 12,
                },
                replies: {
                  type: 'integer',
                  description: 'Reply count',
                  example: 8,
                },
                engagement: {
                  type: 'number',
                  description: 'Engagement rate',
                  example: 0.032,
                },
              },
            },
            hashtags: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'Hashtags in tweet',
              example: ['brand2024', 'newproduct'],
            },
            campaignId: {
              type: 'string',
              nullable: true,
              description: 'Associated campaign ID',
              example: '60d0fe4f5311236168a109cc',
            },
            tweetCreatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Original tweet timestamp',
              example: '2024-01-15T10:30:00Z',
            },
            scrapedAt: {
              type: 'string',
              format: 'date-time',
              description: 'When tweet was scraped',
              example: '2024-01-15T11:00:00Z',
            },
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
  apis: [
    './src/routes/*.ts',
    './src/controllers/*.ts',
    './src/middleware/*.ts',
  ],
};

const specs = swaggerJsdoc(options);

export const setupSwagger = (app: Express): void => {
  // Swagger UI
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
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
  }));

  // JSON endpoint
  app.get('/api-docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });

  console.log('📚 Swagger documentation available at: /api-docs');
  console.log('📋 API spec available at: /api-docs.json');
};

export default specs;
