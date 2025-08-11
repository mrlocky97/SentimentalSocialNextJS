/**
 * Database Configuration
 * Centralized database configuration following Single Responsibility Principle
 */

import { env } from './env';

export const databaseConfig = {
  // MongoDB configuration with enhanced connection options
  mongodb: {
    uri: env.MONGODB_URI || 'mongodb://localhost:27017/sentimentalsocial',
    options: {
      // Connection options
      maxPoolSize: 10, // Maximum number of connections in the connection pool
      minPoolSize: 5, // Minimum number of connections in the connection pool
      maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
      serverSelectionTimeoutMS: 5000, // How long to try selecting a server
      socketTimeoutMS: 45000, // How long a send or receive on a socket can take before timing out
      connectTimeoutMS: 10000, // How long to wait for initial connection

      // Write concern options
      retryWrites: true,
      w: 'majority',

      // Buffer options - MongoDB native options
      bufferCommands: false, // Disable mongoose buffering

      // Heartbeat and monitoring
      heartbeatFrequencyMS: 10000, // Heartbeat frequency

      // Authentication (if needed)
      authSource: 'admin',
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
