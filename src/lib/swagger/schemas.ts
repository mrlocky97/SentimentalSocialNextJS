// Aggregated OpenAPI schemas (extracted from original swagger.ts)
// NOTE: Keep each schema concise; large groups can be further split if they grow.

export const schemas = {
  User: {
    type: "object",
    properties: {
      id: {
        type: "string",
        description: "Unique identifier",
        example: "60d0fe4f5311236168a109ca",
      },
      email: {
        type: "string",
        format: "email",
        description: "User email",
        example: "user@company.com",
      },
      username: {
        type: "string",
        description: "Unique username",
        example: "analyst_john",
      },
      displayName: {
        type: "string",
        description: "Display name",
        example: "John Analyst",
      },
      avatar: { type: "string", nullable: true, description: "Avatar URL" },
      role: {
        type: "string",
        enum: ["admin", "manager", "analyst", "onlyView", "client"],
        example: "analyst",
      },
      permissions: {
        type: "array",
        items: { type: "string" },
        example: ["campaigns:view", "analytics:view"],
      },
      organizationId: { type: "string", nullable: true },
      isActive: { type: "boolean", example: true },
      isVerified: { type: "boolean", example: true },
      lastLoginAt: { type: "string", format: "date-time", nullable: true },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
    },
    required: [
      "id",
      "email",
      "username",
      "displayName",
      "role",
      "permissions",
      "isActive",
      "isVerified",
      "createdAt",
      "updatedAt",
    ],
  },
  CreateUserRequest: {
    type: "object",
    properties: {
      email: {
        type: "string",
        format: "email",
        example: "newuser@company.com",
      },
      username: {
        type: "string",
        minLength: 3,
        maxLength: 30,
        pattern: "^[a-zA-Z0-9_]+$",
        example: "new_analyst",
      },
      displayName: { type: "string", maxLength: 50, example: "New Analyst" },
      password: { type: "string", minLength: 8, example: "securePassword123!" },
      role: {
        type: "string",
        enum: ["admin", "manager", "analyst", "onlyView", "client"],
        example: "analyst",
      },
      organizationId: { type: "string", nullable: true },
    },
    required: ["email", "username", "displayName", "password"],
  },
  Campaign: {
    type: "object",
    properties: {
      id: { type: "string" },
      name: { type: "string" },
      description: { type: "string", nullable: true },
      keywords: { type: "array", items: { type: "string" } },
      hashtags: { type: "array", items: { type: "string" } },
      status: {
        type: "string",
        enum: ["active", "paused", "completed", "draft"],
      },
      startDate: { type: "string", format: "date-time" },
      endDate: { type: "string", format: "date-time", nullable: true },
      createdBy: { type: "string" },
      settings: {
        type: "object",
        properties: {
          maxTweets: { type: "integer", minimum: 1, maximum: 100000 },
          languages: { type: "array", items: { type: "string" } },
          excludeRetweets: { type: "boolean" },
        },
      },
      analytics: {
        type: "object",
        nullable: true,
        properties: {
          totalTweets: { type: "integer" },
          avgSentiment: { type: "number" },
          lastScrapedAt: {
            type: "string",
            format: "date-time",
            nullable: true,
          },
        },
      },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
    },
  },
  Tweet: {
    type: "object",
    description: "A Twitter tweet with sentiment & engagement metrics",
    properties: {
      id: { type: "string" },
      tweetId: { type: "string" },
      content: { type: "string" },
      author: {
        type: "object",
        properties: {
          id: { type: "string" },
          username: { type: "string" },
          displayName: { type: "string" },
          verified: { type: "boolean" },
          followersCount: { type: "integer" },
          followingCount: { type: "integer" },
          tweetsCount: { type: "integer" },
        },
      },
      metrics: {
        type: "object",
        properties: {
          likes: { type: "integer" },
          retweets: { type: "integer" },
          replies: { type: "integer" },
          quotes: { type: "integer" },
          engagement: { type: "number" },
        },
      },
      sentiment: {
        type: "object",
        nullable: true,
        properties: {
          score: { type: "number" },
          magnitude: { type: "number" },
          label: { type: "string", enum: ["positive", "negative", "neutral"] },
          confidence: { type: "number" },
          keywords: { type: "array", items: { type: "string" } },
          analyzedAt: { type: "string", format: "date-time" },
          processingTime: { type: "integer" },
        },
      },
      hashtags: { type: "array", items: { type: "string" } },
      mentions: { type: "array", items: { type: "string" } },
      urls: { type: "array", items: { type: "string" } },
      language: { type: "string" },
      isRetweet: { type: "boolean" },
      isReply: { type: "boolean" },
      campaignId: { type: "string", nullable: true },
      scrapedAt: { type: "string", format: "date-time" },
      createdAt: { type: "string", format: "date-time" },
    },
    required: [
      "id",
      "tweetId",
      "content",
      "author",
      "metrics",
      "hashtags",
      "mentions",
      "urls",
    ],
  },
  PaginationParams: {
    type: "object",
    properties: {
      page: { type: "integer", minimum: 1 },
      limit: { type: "integer", minimum: 1, maximum: 100 },
    },
  },
  PaginatedResponse: {
    type: "object",
    properties: {
      items: { type: "array", items: {} },
      pagination: {
        type: "object",
        properties: {
          page: { type: "integer" },
          limit: { type: "integer" },
          total: { type: "integer" },
          totalPages: { type: "integer" },
          hasNext: { type: "boolean" },
          hasPrev: { type: "boolean" },
        },
      },
    },
  },
  Error: {
    type: "object",
    properties: {
      error: {
        type: "object",
        properties: {
          code: { type: "string" },
          message: { type: "string" },
          details: { type: "object", nullable: true },
        },
      },
      timestamp: { type: "string", format: "date-time" },
      path: { type: "string" },
    },
  },
} as const;
