/**
 * Express Server with Swagger Documentation
 * Main server file that sets up Express with all routes and Swagger UI
 */

import dotenv from 'dotenv';
// Load environment variables first
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import specs from './lib/swagger';
import { appConfig } from './lib/config/app';

// Import performance middleware
import {
  compressionMiddleware,
  performanceMiddleware,
  sanitizeMiddleware,
  cacheControlMiddleware,
  createRateLimit,
  authRateLimit,
  scrapingRateLimit,
  analyticsRateLimit
} from './lib/middleware/performance';

// Import database connection
import DatabaseConnection from './lib/database/connection';

// Import route modules - consolidated imports
import campaignRoutes from './routes/campaigns';
import adminRoutes from './routes/admin';
import sentimentRoutes from './routes/sentiment';
import experimentalRoutes from './routes/experimental.routes';
import hybridSentimentRoutes from './routes/hybrid-sentiment.routes';
import { scrapingRoutes } from './routes/scraping';
import twitterAuthRoutes from './routes/twitter-auth';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';

// Import Twitter authentication manager
import { TwitterAuthManager } from './services/twitter-auth-manager.service';
import { metricsService } from './lib/monitoring/metrics';

const app = express();
const PORT = appConfig.app.port || 3001;

// Security middleware
app.use(helmet());

// Compression middleware
app.use(compressionMiddleware);

// Performance monitoring
app.use(performanceMiddleware);

// Request sanitization
app.use(sanitizeMiddleware);

// CORS configuration
app.use(cors(appConfig.api.cors));

// Request logging
app.use(morgan('combined'));

// Global rate limiting (general protection)
app.use(createRateLimit());

// Body parsing middleware - optimized limits
app.use(express.json({ limit: appConfig.uploads.maxFileSize }));
app.use(express.urlencoded({ extended: true, limit: appConfig.uploads.maxFileSize }));

// Health check endpoint - optimized response
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: appConfig.app.environment,
    version: appConfig.app.version,
  });
});

// Metrics endpoint for monitoring
app.get('/metrics', (req, res) => {
  const healthReport = metricsService.generateHealthReport();
  res.status(healthReport.status === 'critical' ? 503 : 200).json(healthReport);
});

// Performance metrics endpoint
app.get('/api/v1/metrics', (req, res) => {
  const systemMetrics = metricsService.getSystemMetrics();
  res.json({
    success: true,
    data: systemMetrics,
    timestamp: new Date().toISOString(),
  });
});

// Swagger UI setup
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
  explorer: true,
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info .title { color: #1976d2 }
  `,
  customSiteTitle: 'SentimentalSocial API Documentation',
  swaggerOptions: {
    docExpansion: 'none',
    filter: true,
    showRequestDuration: true,
    tryItOutEnabled: true,
  },
}));

// API Routes with specific rate limiting
app.use('/api/v1/auth', authRateLimit, authRoutes);
app.use('/api/v1/users', analyticsRateLimit, userRoutes);
app.use('/api/v1/campaigns', analyticsRateLimit, campaignRoutes);
app.use('/api/v1/scraping', scrapingRateLimit, scrapingRoutes);
app.use('/api/v1/twitter-auth', authRateLimit, twitterAuthRoutes);
app.use('/api/v1/sentiment', analyticsRateLimit, cacheControlMiddleware(300), sentimentRoutes);
app.use('/api/v1/experimental', analyticsRateLimit, experimentalRoutes);
app.use('/api/v1/hybrid', analyticsRateLimit, cacheControlMiddleware(300), hybridSentimentRoutes);
app.use('/api/v1/admin', authRateLimit, adminRoutes);

// API info endpoint
app.get('/api/v1', (req, res) => {
  res.json({
    name: 'SentimentalSocial API',
    version: '1.0.0',
    description: 'Twitter Sentiment Analysis API for Marketing Analytics',
    documentation: '/api-docs',
    endpoints: {
      auth: '/api/v1/auth',
      users: '/api/v1/users',
      campaigns: '/api/v1/campaigns',
      scraping: '/api/v1/scraping',
      sentiment: '/api/v1/sentiment',
      experimental: '/api/v1/experimental',
      admin: '/api/v1/admin',
    },
    features: [
      'User Authentication & Authorization',
      'Campaign Management',
      'Twitter Data Scraping with Twikit (Unlimited)',
      'Real-time Sentiment Analysis',
      'Advanced Analytics & Reporting',
      'Experimental Model Evaluation',
      'Performance Benchmarking & Visualization',
      'Data Export Capabilities',
    ],
  });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: 'API endpoint not found',
      code: 'ENDPOINT_NOT_FOUND',
      path: req.path,
      method: req.method,
    },
  });
});

// Global error handler
interface AppError extends Error {
  status?: number;
  code?: string;
}

app.use((err: AppError, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';

  res.status(err.status || 500).json({
    success: false,
    error: {
      message: err.message || 'Internal server error',
      code: err.code || 'INTERNAL_ERROR',
      ...(isDevelopment && { stack: err.stack }),
      timestamp: new Date().toISOString(),
    },
  });
});

// Start server
async function startServer() {
  try {
    // Initialize database connection
    const database = DatabaseConnection.getInstance();
    await database.connect();

    // Initialize Twitter authentication
    const twitterAuth = TwitterAuthManager.getInstance();
    await twitterAuth.initializeOnStartup();

    // Start Express server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📚 Swagger UI available at http://localhost:${PORT}/api-docs`);
      console.log(`🏥 Health check at http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;
