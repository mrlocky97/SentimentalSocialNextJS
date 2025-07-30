/**
 * Application Configuration
 * Central configuration management following SRP
 */

// Helper function for better type safety
const getEnvVar = (key: string, defaultValue: string): string => {
  return process.env[key] || defaultValue;
};

const getEnvNumber = (key: string, defaultValue: number): number => {
  const value = process.env[key];
  return value ? parseInt(value, 10) : defaultValue;
};

const getEnvBoolean = (key: string, defaultValue: boolean): boolean => {
  const value = process.env[key];
  return value ? value.toLowerCase() === 'true' : defaultValue;
};

export const appConfig = {
  app: {
    name: 'SentimentalSocial',
    version: '1.0.0',
    environment: getEnvVar('NODE_ENV', 'development'),
    port: getEnvNumber('PORT', 3001), // Fixed default port
    url: getEnvVar('APP_URL', 'http://localhost:3001'),
  },

  auth: {
    jwtSecret: getEnvVar('JWT_SECRET', 'your-secret-key-change-in-production'),
    jwtExpiresIn: getEnvVar('JWT_EXPIRES_IN', '24h'),
    bcryptRounds: getEnvNumber('BCRYPT_ROUNDS', 12),
  },

  api: {
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: getEnvNumber('RATE_LIMIT_MAX', 100),
    },
    cors: {
      origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
      credentials: true,
    },
  },

  uploads: {
    maxFileSize: getEnvVar('MAX_FILE_SIZE', '10mb'), // Changed to string for express
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/json'],
    uploadPath: getEnvVar('UPLOAD_PATH', './uploads'),
  },

  database: {
    uri: getEnvVar('MONGODB_URI', 'mongodb://localhost:27017/sentimentalsocial'),
    options: {
      maxPoolSize: getEnvNumber('DB_MAX_POOL_SIZE', 10),
      minPoolSize: getEnvNumber('DB_MIN_POOL_SIZE', 1),
      maxIdleTimeMS: getEnvNumber('DB_MAX_IDLE_TIME', 30000),
    },
  },

  twitter: {
    username: getEnvVar('TWITTER_USERNAME', ''),
    password: getEnvVar('TWITTER_PASSWORD', ''),
    email: getEnvVar('TWITTER_EMAIL', ''),
    cookies: getEnvVar('TWITTER_COOKIES', ''),
    rateLimitDelay: getEnvNumber('TWITTER_RATE_LIMIT_DELAY', 1000),
  },

  email: {
    smtp: {
      host: getEnvVar('SMTP_HOST', ''),
      port: getEnvNumber('SMTP_PORT', 587),
      secure: getEnvBoolean('SMTP_SECURE', false),
      auth: {
        user: getEnvVar('SMTP_USER', ''),
        pass: getEnvVar('SMTP_PASS', ''),
      },
    },
    from: getEnvVar('EMAIL_FROM', 'noreply@sentimentalsocial.com'),
  },

  performance: {
    compressionLevel: getEnvNumber('COMPRESSION_LEVEL', 6),
    cacheTtl: getEnvNumber('CACHE_TTL', 3600), // 1 hour
    maxRequestSize: getEnvVar('MAX_REQUEST_SIZE', '50mb'),
  },
} as const;

export type AppConfig = typeof appConfig;
