/**
 * Express Server with Swagger Documentation
 * Main server file that sets up Express with all routes and Swagger UI
 */

import dotenv from 'dotenv';
// Load environment variables first - prioritize .env.local over .env
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

// Validate required environment variables
import { validateEnv } from './lib/config/validate-env';
validateEnv();

import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import http from 'http';
import * as jwt from 'jsonwebtoken';
import morgan from 'morgan';
import path from 'path';
import { Server as SocketIOServer } from 'socket.io';
import swaggerUi from 'swagger-ui-express';

// Global types for WebSocket rate limiting
declare global {
  var wsHandshakeTracker: Map<string, { count: number; resetTime: number }> | undefined;
}

// Import configurations and utilities
import { appConfig } from './lib/config/app';
import { features } from './lib/config/feature-flags';
import specs from './lib/swagger';
import './types/socket';

// Import middleware
import {
  analyticsRateLimit,
  authRateLimit,
  cacheControlMiddleware,
  compressionMiddleware,
  performanceMiddleware,
  sanitizeMiddleware,
  scrapingRateLimit,
} from './lib/middleware/performance';
import { generalRateLimitMiddleware } from './middleware/intelligent-rate-limit';
import { createMetricsMiddleware } from './middleware/metrics.middleware';
import {
  errorLoggingMiddleware,
  performanceLoggingMiddleware,
  requestLoggingMiddleware,
} from './middleware/request-logging';

// Import services
import { modelPersistenceManager } from './services/model-persistence.service';
import { performanceMonitor } from './services/performance-monitor.service';
import { TweetSentimentAnalysisManager } from './services/tweet-sentiment-analysis.manager.service';
import { TwitterAuthManager } from './services/twitter-auth-manager.service';

// Import database connection
import DatabaseConnection from './lib/database/connection';

// Import route modules
import adminRoutes from './routes/admin';
import authRoutes from './routes/auth';
import campaignRoutes from './routes/campaigns';
import configureDashboardRoutes from './routes/dashboard.routes';
import configureHealthRoutes from './routes/health.routes';
import configureMetricsRoutes from './routes/metrics.routes';
import { scrapingRoutes } from './routes/scraping';
import securityRoutes from './routes/security';
import sentimentRoutes from './routes/sentiment';
import templateRoutes from './routes/templates';
import twitterAuthRoutes from './routes/twitter-auth';
import userRoutes from './routes/users';

// Import IoC Configuration
import { checkContainerHealth, configureServices } from './lib/dependency-injection/config';

// Import observability
import { logger as systemLogger } from './lib/observability/logger';

// Import error handlers
import { mainErrorHandler, notFoundHandler } from './core/errors/error-handler';

// Constants
const PORT = appConfig.app.port || 3001;
const JWT_SECRET = process.env.JWT_SECRET;
const MODEL_PATH = path.join(process.cwd(), 'src', 'data', 'trained-classifier.json');

// Server instances for graceful shutdown
let httpServer: http.Server | null = null;
let socketIOServer: SocketIOServer | null = null;

/**
 * Database initialization with retry logic
 */
async function initializeDatabase(
  maxRetries: number = 3,
  retryDelay: number = 5000
): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await DatabaseConnection.connect();
      systemLogger.info('✅ MongoDB connection established');
      return;
    } catch (error) {
      systemLogger.error(`❌ MongoDB connection attempt ${attempt}/${maxRetries} failed`, {
        error,
      });

      if (attempt === maxRetries) {
        systemLogger.error('❌ All MongoDB connection attempts failed. Exiting...');
        process.exit(1);
      }

      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }
}

/**
 * Enhanced graceful shutdown with timeout
 */
async function gracefulShutdown(signal: string): Promise<void> {
  systemLogger.info(`\n🔄 Received ${signal}, shutting down gracefully...`);

  const shutdownTimeout = setTimeout(() => {
    systemLogger.error('⏰ Graceful shutdown timeout reached, forcing exit');
    process.exit(1);
  }, 30000); // 30 second timeout

  try {
    // Close WebSocket server
    if (socketIOServer) {
      systemLogger.info('🔌 Closing WebSocket server...');
      await new Promise<void>((resolve) => {
        socketIOServer!.close(() => {
          systemLogger.info('✅ WebSocket server closed');
          resolve();
        });
      });
    }

    // Close HTTP server
    if (httpServer) {
      systemLogger.info('🌐 Closing HTTP server...');
      await new Promise<void>((resolve) => {
        httpServer!.close(() => {
          systemLogger.info('✅ HTTP server closed');
          resolve();
        });
      });
    }

    // Close database connection
    await DatabaseConnection.disconnect();
    systemLogger.info('✅ MongoDB connection closed');

    clearTimeout(shutdownTimeout);
    systemLogger.info('✅ Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    systemLogger.error('❌ Error during graceful shutdown', { error });
    clearTimeout(shutdownTimeout);
    process.exit(1);
  }
}

// Declare app variable in global scope and initialize it
const app: express.Application = express();

/**
 * Initialize Express application with middleware
 */
function initializeExpress(): express.Application {

  // Security middleware
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
    })
  );

  // Request correlation and logging
  app.use(requestLoggingMiddleware);
  app.use(createMetricsMiddleware());
  app.use(performanceLoggingMiddleware(1000));

  // Performance optimizations
  app.use(compressionMiddleware);
  app.use(performanceMiddleware);
  app.use(sanitizeMiddleware);

  // CORS configuration
  app.use(cors(appConfig.api.cors));

  // Request logging
  app.use(morgan('combined'));

  // Rate limiting
  app.use(generalRateLimitMiddleware);
  app.use(performanceMonitor.middleware());

  // Body parsing with optimized limits
  app.use(
    express.json({
      limit: appConfig.uploads.maxFileSize,
      verify: (req, res, buf) => {
        // Verify JSON payload integrity
        try {
          JSON.parse(buf.toString());
        } catch (e) {
          throw new Error('Invalid JSON payload');
        }
      },
    })
  );
  app.use(
    express.urlencoded({
      extended: true,
      limit: appConfig.uploads.maxFileSize,
    })
  );

  return app;
}

/**
 * Configure API routes
 */
function configureRoutes(app: express.Application): void {
  // Health check endpoint (no rate limiting)
  app.use('/health', configureHealthRoutes());

  // Metrics endpoints
  app.use('/metrics', configureMetricsRoutes());

  // Feature-gated scraping routes
  if (features.ENABLE_SCRAPING) {
    app.use('/api/v1/scraping', scrapingRateLimit, scrapingRoutes);
  }

  // API Routes with specific rate limiting
  const apiRoutes = [
    { path: '/api/v1/auth', middleware: authRateLimit, router: authRoutes },
    { path: '/api/v1/users', middleware: analyticsRateLimit, router: userRoutes },
    { path: '/api/v1/campaigns', middleware: analyticsRateLimit, router: campaignRoutes },
    { path: '/api/v1/templates', middleware: analyticsRateLimit, router: templateRoutes },
    { path: '/api/v1/twitter-auth', middleware: authRateLimit, router: twitterAuthRoutes },
    {
      path: '/api/v1/sentiment',
      middleware: [analyticsRateLimit, cacheControlMiddleware(300)],
      router: sentimentRoutes,
    },
    { path: '/api/v1/security', middleware: authRateLimit, router: securityRoutes },
    { path: '/api/v1/admin', middleware: authRateLimit, router: adminRoutes },
    { path: '/api/v1/dashboard', middleware: [], router: configureDashboardRoutes() },
  ];

  // Register routes
  apiRoutes.forEach(({ path, middleware, router }) => {
    if (Array.isArray(middleware)) {
      app.use(path, ...middleware, router);
    } else {
      app.use(path, middleware, router);
    }
  });

  // API info endpoint
  app.get('/api/v1', (req, res) => {
    res.json({
      name: 'SentimentalSocial API',
      version: '1.0.0',
      description: 'Twitter Sentiment Analysis API for Marketing Analytics',
      documentation: '/api-docs',
      endpoints: Object.fromEntries(apiRoutes.map(({ path }) => [path.split('/').pop(), path])),
      features: [
        'User Authentication & Authorization',
        'Campaign Management',
        'Twitter Data Scraping with Twikit (Unlimited)',
        'Real-time Sentiment Analysis',
        'Advanced Analytics & Reporting',
        'Data Export Capabilities',
        'Comprehensive Health Monitoring',
        'Performance Metrics & Alerting',
      ],
    });
  });
}

/**
 * Configure Swagger UI with security
 */
function configureSwagger(app: express.Application): void {
  if (process.env.ENABLE_SWAGGER_UI !== 'true') {
    return;
  }

  const swaggerAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const user = appConfig.docs.basicAuthUser;
    const pass = appConfig.docs.basicAuthPass;

    if (!user || !pass) return next();

    const authHeader = req.headers.authorization || '';
    const match = authHeader.match(/^Basic (.+)$/);

    if (!match) {
      return res
        .status(401)
        .set('WWW-Authenticate', 'Basic realm="API Docs"')
        .json({ error: 'Authentication required' });
    }

    const [u, p] = Buffer.from(match[1], 'base64').toString('utf8').split(':');

    if (u === user && p === pass) return next();

    return res
      .status(401)
      .set('WWW-Authenticate', 'Basic realm="API Docs"')
      .json({ error: 'Invalid credentials' });
  };

  app.use(
    '/api-docs',
    swaggerAuth,
    swaggerUi.serve,
    swaggerUi.setup(specs, {
      explorer: true,
      customCss: `
        .swagger-ui .topbar { display: none }
        .swagger-ui .info .title { color: #1976d2 }
        .swagger-ui .opblock-tag-section[data-tag*="Admin"], 
        .swagger-ui .opblock-tag-section[data-tag*="Security"],
        .swagger-ui .opblock-tag-section[data-tag*="Twitter Authentication"],
        .swagger-ui .opblock-tag-section[data-tag*="Sentiment Analysis"] { display: none !important; }
        .swagger-ui .scheme-container { display: none; }
      `,
      customSiteTitle: 'SentimentalSocial API Documentation',
      swaggerOptions: {
        docExpansion: 'none',
        filter: true,
        showRequestDuration: true,
        tryItOutEnabled: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
        supportedSubmitMethods: ['get', 'post', 'put', 'delete', 'patch'],
        defaultModelExpandDepth: 1,
      },
    })
  );
}

/**
 * Train sentiment analysis model
 */
async function trainSentimentModel(manager: TweetSentimentAnalysisManager): Promise<void> {
  try {
    const datasetName = 'enhanced-v3-clean-production';
    const { enhancedTrainingDataV3Clean } = await import('./data/enhanced-training-data-v3-clean');

    systemLogger.info(
      `🧠 Training with ${enhancedTrainingDataV3Clean.length} examples from ${datasetName} dataset`
    );

    const startTime = Date.now();
    await manager.trainNaiveBayes(enhancedTrainingDataV3Clean);
    const trainingTime = Date.now() - startTime;

    systemLogger.info(`✅ Model trained in ${trainingTime}ms`);

    // Save model
    systemLogger.info('💾 Saving trained model...');
    await manager.saveNaiveBayesToFile(MODEL_PATH);

    // Validate model performance
    await validateModel();

    systemLogger.info('✅ Enhanced Sentiment Analysis System ready!');
  } catch (error) {
    systemLogger.error('❌ Error training sentiment model:', { error });
    await fallbackModelTraining(manager);
  }
}

/**
 * Fallback model training with reduced dataset
 */
async function fallbackModelTraining(manager: TweetSentimentAnalysisManager): Promise<void> {
  try {
    systemLogger.info('🔄 Attempting fallback training...');
    const { enhancedTrainingDataV3Clean } = await import('./data/enhanced-training-data-v3-clean');
    await manager.trainNaiveBayes(enhancedTrainingDataV3Clean.slice(0, 800));
    systemLogger.info('⚠️ Using fallback model with reduced dataset');
  } catch (fallbackError) {
    systemLogger.error('❌ Fallback training also failed:', { fallbackError });
    throw new Error('Both primary and fallback model training failed');
  }
}

/**
 * Validate trained model
 */
async function validateModel(): Promise<void> {
  try {
    systemLogger.info('🧪 Validating model with enhanced dataset...');

    const { enhancedTrainingDataV3Clean } = await import('./data/enhanced-training-data-v3-clean');
    if (!enhancedTrainingDataV3Clean?.length) {
      systemLogger.warn('⚠️ No enhanced dataset available for validation');
      return;
    }

    // Use a small sample for validation (first 50 examples)
    const validationSample = enhancedTrainingDataV3Clean.slice(0, 50);
    
    // Use sentimentServiceFacade for compatibility with unified architecture
    const { sentimentServiceFacade } = await import('./lib/sentiment/sentiment-service-facade');

    // Simple validation using orchestrator through facade
    systemLogger.info('📊 Model validation using unified orchestrator via facade', {
      testCases: validationSample.length,
      model: 'unified-orchestrator-v2.0'
    });

    // Test a small sample to verify the system is working
    const sampleSize = Math.min(10, validationSample.length);
    let correct = 0;
    
    for (let i = 0; i < sampleSize; i++) {
      const testCase = validationSample[i];
      try {
        const result = await sentimentServiceFacade.testSentimentAnalysis({ 
          text: testCase.text, 
          method: 'unified' 
        });
        if (result.label === testCase.label) {
          correct++;
        }
      } catch (testError) {
        systemLogger.warn('Test case evaluation failed', { 
          index: i,
          error: testError instanceof Error ? testError.message : String(testError)
        });
      }
    }

    const accuracy = (correct / sampleSize) * 100;
    
    systemLogger.info('� Model validation completed', {
      totalTests: sampleSize,
      accuracy: `${accuracy.toFixed(1)}%`,
      correctPredictions: correct,
      modelVersion: 'unified-orchestrator-v2.0'
    });

  } catch (error) {
    systemLogger.warn('⚠️ Model validation failed', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Initialize sentiment analysis system
 */
async function initializeSentimentAnalysis(): Promise<void> {
  const sentimentManager = new TweetSentimentAnalysisManager();

  if (features.TRAIN_MODEL_ON_START) {
    systemLogger.info('Initializing Enhanced Sentiment Analysis System...');

    const modelInfo = await modelPersistenceManager.getModelInfo();
    systemLogger.info(`Model Status: ${modelInfo.exists ? 'Found' : 'Not found'}`);

    if (modelInfo.exists && modelInfo.metadata) {
      const modelAge = Date.now() - new Date(modelInfo.metadata.trainingDate).getTime();
      const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;

      if (modelAge > sevenDaysInMs) {
        systemLogger.info('Model is outdated, retraining with latest data...');
        await trainSentimentModel(sentimentManager);
      } else {
        systemLogger.info('Using existing trained model');
      }
    } else {
      systemLogger.info('No existing model found, training new model...');
      await trainSentimentModel(sentimentManager);
    }
  } else {
    systemLogger.info('TRAIN_MODEL_ON_START=false → Skipping training on startup');
  }

  // Always try to load the latest model
  systemLogger.info('Loading Sentiment Analysis System...');
  const loaded = await sentimentManager.tryLoadLatestModel?.();
  systemLogger.info(
    loaded ? 'Model loaded successfully' : 'No pre-trained model, using heuristic fallback'
  );
}

/**
 * WebSocket rate limiting with cleanup
 */
function createWebSocketRateLimiter() {
  const tracker = new Map<string, { count: number; resetTime: number }>();

  // Cleanup old entries every 5 minutes
  setInterval(
    () => {
      const now = Date.now();
      for (const [ip, data] of tracker.entries()) {
        if (now > data.resetTime) {
          tracker.delete(ip);
        }
      }
    },
    5 * 60 * 1000
  );

  return (clientIP: string): boolean => {
    const now = Date.now();
    const windowMs = 60000; // 1 minute window
    const maxConnections = 10; // Max 10 connections per minute per IP

    const clientData = tracker.get(clientIP) || { count: 0, resetTime: now + windowMs };

    if (now > clientData.resetTime) {
      clientData.count = 0;
      clientData.resetTime = now + windowMs;
    }

    if (clientData.count >= maxConnections) {
      return false;
    }

    clientData.count++;
    tracker.set(clientIP, clientData);
    return true;
  };
}

/**
 * Initialize WebSocket server with authentication
 */
function initializeWebSocketServer(httpServer: http.Server): SocketIOServer {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET not configured for WebSocket authentication');
  }

  const rateLimiter = createWebSocketRateLimiter();

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:4200',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000,
      skipMiddlewares: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    connectTimeout: 45000,
    allowRequest: (req, callback) => {
      const clientIP = req.socket.remoteAddress || 'unknown';

      if (!rateLimiter(clientIP)) {
        systemLogger.warn(`WebSocket handshake rate limit exceeded for IP: ${clientIP}`);
        callback('Rate limit exceeded', false);
        return;
      }

      callback(null, true);
    },
  });

  // WebSocket authentication middleware
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.split(' ')[1] ||
        socket.handshake.query?.token;

      if (!token) {
        systemLogger.warn(
          `WebSocket connection rejected: No token from ${socket.handshake.address}`
        );
        return next(new Error('Authentication token required'));
      }

      // Dynamic imports for better performance
      const [{ tokenBlacklistService }] = await Promise.all([
        import('./lib/security/token-blacklist'),
      ]);

      if (tokenBlacklistService.isTokenBlacklisted(token as string)) {
        systemLogger.warn(
          `WebSocket connection rejected: Blacklisted token from ${socket.handshake.address}`
        );
        return next(new Error('Token has been invalidated'));
      }

      const decoded = jwt.verify(token as string, JWT_SECRET) as {
        id: string;
        email: string;
        role: string;
        fullName: string;
        iat?: number;
        exp?: number;
      };

      socket.data.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
        fullName: decoded.fullName,
        connectedAt: new Date(),
        ipAddress: socket.handshake.address,
      };

      systemLogger.info(`WebSocket authenticated: ${decoded.email} (${decoded.id})`);
      next();
    } catch (error) {
      const errorMessage =
        error instanceof jwt.TokenExpiredError
          ? 'Access token has expired'
          : error instanceof jwt.JsonWebTokenError
            ? 'Invalid access token'
            : 'Authentication failed';

      systemLogger.warn(
        `WebSocket connection rejected: ${errorMessage} from ${socket.handshake.address}`
      );
      return next(new Error(errorMessage));
    }
  });

  return io;
}

/**
 * Initialize WebSocket services
 */
async function initializeWebSocketServices(io: SocketIOServer): Promise<void> {
  try {
    const [{ webSocketService }, { scrapingProgressService }] = await Promise.all([
      import('./services/websocket.service'),
      import('./services/scraping-progress.service'),
    ]);

    webSocketService.initialize(io);
    scrapingProgressService.initialize(io);

    systemLogger.info('WebSocket services initialized successfully');
  } catch (error) {
    systemLogger.error('Failed to initialize WebSocket services:', error);
    throw error;
  }
}

/**
 * Start the HTTP server
 */
async function startServer(): Promise<void> {
  try {
    // Initialize Twitter authentication
    const twitterAuth = TwitterAuthManager.getInstance();
    await twitterAuth.initializeOnStartup();

    // Initialize sentiment analysis
    await initializeSentimentAnalysis();

    // Configure IoC Container
    configureServices();
    const containerHealth = checkContainerHealth();
    systemLogger.info(`IoC Container Status: ${containerHealth.status}`);

    // Initialize Express app
    // Initialize Express app
    initializeExpress();
    // Configure routes
    configureRoutes(app);

    // Configure Swagger
    configureSwagger(app);

    // Error handling (must be last)
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

    app.use('*', notFoundHandler);
    app.use(errorLoggingMiddleware);
    app.use(mainErrorHandler);

    // Create and configure servers
    httpServer = http.createServer(app);
    socketIOServer = initializeWebSocketServer(httpServer);

    // Initialize WebSocket services
    await initializeWebSocketServices(socketIOServer);

    // Start server
    httpServer.listen(PORT, () => {
      systemLogger.info('Server started successfully', {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        apiDocs: `http://localhost:${PORT}/api-docs`,
        websocket: 'enabled',
        features: {
          scraping: features.ENABLE_SCRAPING,
          modelTraining: features.TRAIN_MODEL_ON_START,
          swagger: process.env.ENABLE_SWAGGER_UI === 'true',
        },
      });
    });
  } catch (error) {
    systemLogger.error('Failed to start server:', { error });
    throw error;
  }
}

/**
 * Main application initialization
 */
async function initializeApplication(): Promise<void> {
  try {
    systemLogger.info('Starting application initialization...');

    // Initialize database with retry logic
    await initializeDatabase();

    // Start server
    await startServer();

    systemLogger.info('Application initialized successfully');
  } catch (error) {
    systemLogger.error('Failed to initialize application:', { error });
    process.exit(1);
  }
}

// Graceful shutdown handlers
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Unhandled rejection/exception handlers
process.on('unhandledRejection', (reason, promise) => {
  systemLogger.error('Unhandled Rejection', reason instanceof Error ? reason : new Error(String(reason)), {
    promise: String(promise),
    reason: String(reason)
  });
});

process.on('uncaughtException', (error) => {
  systemLogger.error('Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Initialize application
initializeApplication();

export default app;
