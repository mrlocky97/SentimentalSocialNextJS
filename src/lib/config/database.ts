/**
 * Database Configuration
 * Centralized database configuration following Single Responsibility Principle
 */

import { env } from './env';

export const databaseConfig = {
  // MongoDB Atlas configuration
  mongodb: {
    uri: env.MONGODB_URI || 'mongodb://localhost:27017/sentimentalsocial',
    options: {
      retryWrites: true,
      w: 'majority',
    },
  },
  
  // Example for PostgreSQL
  postgres: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'sentimentalsocial',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  },

  // Redis for caching
  redis: {
    url: env.REDIS_URL || 'redis://localhost:6379',
    ttl: env.CACHE_TTL || 3600, // 1 hour default
  },
} as const;

export type DatabaseConfig = typeof databaseConfig;
