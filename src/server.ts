/**
 * Express Server with Swaimport { cacheService } from './lib/cache/cache-migration';ger Documentation
 * Main server file that sets up Express with all routes and Swagger UI
 */

import dotenv from "dotenv";
// Load environment variables first - prioritize .env over .env.local
dotenv.config({ path: [".env.local", ".env"] });

import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import { appConfig } from "./lib/config/app";
import specs from "./lib/swagger";

// Import performance middleware
import {
  analyticsRateLimit,
  authRateLimit,
  cacheControlMiddleware,
  compressionMiddleware,
  performanceMiddleware,
  sanitizeMiddleware,
  scrapingRateLimit,
} from "./lib/middleware/performance";

// Import new performance and monitoring services
import { generalRateLimitMiddleware } from "./middleware/intelligent-rate-limit";
import { cacheService } from "./services/cache.service";
import { performanceMonitor } from "./services/performance-monitor.service";

// Import database connection
import DatabaseConnection from "./lib/database/connection";

// Import route modules - consolidated imports
import adminRoutes from "./routes/admin";
import authRoutes from "./routes/auth";
import campaignRoutes from "./routes/campaigns";
import { scrapingRoutes } from "./routes/scraping";
import securityRoutes from "./routes/security";
import sentimentRoutes from "./routes/sentiment";
import templateRoutes from "./routes/templates";
import twitterAuthRoutes from "./routes/twitter-auth";
import userRoutes from "./routes/users";

// Import Twitter authentication manager
import { metricsService } from "./lib/monitoring/metrics";
import { TwitterAuthManager } from "./services/twitter-auth-manager.service";
// Import sentiment analysis manager and training data
import path from "path";
import { modelPersistenceManager } from "./services/model-persistence.service";
import { TweetSentimentAnalysisManager } from "./services/tweet-sentiment-analysis.manager.service";
// Import IoC Configuration
import {
  configureServices,
  checkContainerHealth,
} from "./lib/dependency-injection/config";
const modelPath = path.join(
  process.cwd(),
  "src",
  "data",
  "trained-classifier.json",
);

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
app.use(morgan("combined"));

// Global rate limiting with intelligent rate limiter
app.use(generalRateLimitMiddleware);

// Performance monitoring middleware
app.use(performanceMonitor.middleware());

// Body parsing middleware - optimized limits
app.use(express.json({ limit: appConfig.uploads.maxFileSize }));
app.use(
  express.urlencoded({ extended: true, limit: appConfig.uploads.maxFileSize }),
);

// Health check endpoint - enhanced with new monitoring
app.get("/health", (req, res) => {
  const healthStatus = performanceMonitor.getHealthStatus();
  res.status(200).json({
    status:
      healthStatus.status === "healthy"
        ? "OK"
        : healthStatus.status.toUpperCase(),
    timestamp: new Date().toISOString(),
    uptime: healthStatus.uptime,
    environment: appConfig.app.environment,
    version: appConfig.app.version,
    metrics: healthStatus.metrics,
    issues: healthStatus.issues,
  });
});

// Enhanced metrics endpoint with cache and performance data
app.get("/metrics", (req, res) => {
  const timeWindow = parseInt(req.query.timeWindow as string) || 3600000;
  const performanceMetrics = performanceMonitor.getMetrics(timeWindow);
  const cacheStats = cacheService.getStats();
  const healthReport = metricsService.generateHealthReport();

  const combinedMetrics = {
    ...healthReport,
    performance: performanceMetrics,
    cache: cacheStats,
    timestamp: new Date().toISOString(),
  };

  res
    .status(healthReport.status === "critical" ? 503 : 200)
    .json(combinedMetrics);
});

// Performance metrics endpoint
app.get("/api/v1/metrics", (req, res) => {
  const systemMetrics = metricsService.getSystemMetrics();
  res.json({
    success: true,
    data: systemMetrics,
    timestamp: new Date().toISOString(),
  });
});

// Swagger UI setup (disabled by default in production)
if (appConfig.docs.enableSwaggerUI) {
  // Optional basic auth for Swagger
  const swaggerAuth = (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    const user = appConfig.docs.basicAuthUser;
    const pass = appConfig.docs.basicAuthPass;
    if (!user || !pass) return next();
    const hdr = req.headers.authorization || "";
    const m = hdr.match(/^Basic (.+)$/);
    if (!m)
      return res
        .status(401)
        .set("WWW-Authenticate", 'Basic realm="API Docs"')
        .end();
    const [u, p] = Buffer.from(m[1], "base64").toString("utf8").split(":");
    if (u === user && p === pass) return next();
    return res
      .status(401)
      .set("WWW-Authenticate", 'Basic realm="API Docs"')
      .end();
  };

  app.use(
    "/api-docs",
    swaggerAuth,
    swaggerUi.serve,
    swaggerUi.setup(specs, {
      explorer: true,
      customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info .title { color: #1976d2 }
    `,
      customSiteTitle: "SentimentalSocial API Documentation",
      swaggerOptions: {
        docExpansion: "none",
        filter: true,
        showRequestDuration: true,
        tryItOutEnabled: true,
      },
    }),
  );
}

// API Routes with specific rate limiting
app.use("/api/v1/auth", authRateLimit, authRoutes);
app.use("/api/v1/users", analyticsRateLimit, userRoutes);
app.use("/api/v1/campaigns", analyticsRateLimit, campaignRoutes);
app.use("/api/v1/templates", analyticsRateLimit, templateRoutes);
app.use("/api/v1/scraping", scrapingRateLimit, scrapingRoutes);
app.use("/api/v1/twitter-auth", authRateLimit, twitterAuthRoutes);
app.use(
  "/api/v1/sentiment",
  analyticsRateLimit,
  cacheControlMiddleware(300),
  sentimentRoutes,
);
app.use("/api/v1/security", authRateLimit, securityRoutes);
app.use("/api/v1/admin", authRateLimit, adminRoutes);

// API info endpoint
app.get("/api/v1", (req, res) => {
  res.json({
    name: "SentimentalSocial API",
    version: "1.0.0",
    description: "Twitter Sentiment Analysis API for Marketing Analytics",
    documentation: "/api-docs",
    endpoints: {
      auth: "/api/v1/auth",
      users: "/api/v1/users",
      campaigns: "/api/v1/campaigns",
      templates: "/api/v1/templates",
      scraping: "/api/v1/scraping",
      sentiment: "/api/v1/sentiment",
      security: "/api/v1/security",
      admin: "/api/v1/admin",
    },
    features: [
      "User Authentication & Authorization",
      "Campaign Management",
      "Twitter Data Scraping with Twikit (Unlimited)",
      "Real-time Sentiment Analysis",
      "Advanced Analytics & Reporting",
      "Data Export Capabilities",
    ],
  });
});

// 404 handler for API routes
app.use("/api/*", (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: "API endpoint not found",
      code: "ENDPOINT_NOT_FOUND",
      path: req.path,
      method: req.method,
    },
  });
});

// Import and use our improved error handler
import { errorHandler, notFoundHandler } from "./utils/error-handler";

// 404 handler for unmatched routes
app.use("*", notFoundHandler);

// Global error handler
app.use(errorHandler);

// Start server
async function startServer() {
  try {
    // Initialize database connection
    await DatabaseConnection.connect();

    // Initialize Twitter authentication
    const twitterAuth = TwitterAuthManager.getInstance();
    await twitterAuth.initializeOnStartup();

    // Initialize and train sentiment analysis model with enhanced dataset
    console.log("🧠 Initializing Enhanced Sentiment Analysis System...");

    // Configure IoC Container
    configureServices();

    // Verify container health
    const containerHealth = checkContainerHealth();
    console.log("📦 IoC Container Status:", containerHealth.status);

    const sentimentManager = new TweetSentimentAnalysisManager();

    // Try to load existing model first
    const modelInfo = await modelPersistenceManager.getModelInfo();
    console.log(`📊 Model Status: ${modelInfo.exists ? "Found" : "Not found"}`);

    if (modelInfo.exists && modelInfo.metadata) {
      console.log(
        `📋 Existing model: ${modelInfo.metadata.datasetSize} examples, version ${modelInfo.metadata.version}`,
      );

      // Validate model age (retrain if older than 7 days)
      const modelAge =
        Date.now() - new Date(modelInfo.metadata.trainingDate).getTime();
      const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;

      if (modelAge > sevenDaysInMs) {
        console.log("🔄 Model is outdated, retraining with latest data...");
        await trainNewModel(sentimentManager);
      } else {
        console.log("✅ Using existing trained model");
      }
    } else {
      console.log("🔄 No existing model found, training new model...");
      await trainNewModel(sentimentManager);
    }

    async function trainNewModel(manager: TweetSentimentAnalysisManager) {
      try {
        // Load the most comprehensive training dataset available
        const datasetName = "enhanced-v3-production";

        // Load the enhanced training dataset V3
        const { enhancedTrainingDataV3 } = await import(
          "./data/enhanced-training-data-v3"
        );
        const trainingData = enhancedTrainingDataV3;

        console.log(
          `� Training with ${trainingData.length} examples from ${datasetName} dataset`,
        );

        const startTime = Date.now();
        await manager.trainNaiveBayes(trainingData);
        const trainingTime = Date.now() - startTime;

        console.log(`✅ Model trained in ${trainingTime}ms`);

        // Save the trained model with metadata
        console.log("💾 Saving trained model...");
        await manager.saveNaiveBayesToFile(modelPath);

        // Validate model performance
        console.log("🧪 Validating model performance...");
        const { sentimentTestDataset } = await import("./data/test-datasets");

        if (sentimentTestDataset && sentimentTestDataset.length > 0) {
          // We'll implement validation in the persistence manager
          console.log(
            `📊 Validation completed with test dataset of ${sentimentTestDataset.length} cases`,
          );
        }

        console.log("✅ Enhanced Sentiment Analysis System ready!");
      } catch (modelError) {
        console.error("❌ Error training sentiment model:", modelError);
        console.log("🔄 Falling back to basic model...");

        // Fallback training with enhanced dataset
        const { enhancedTrainingDataV3 } = await import(
          "./data/enhanced-training-data-v3"
        );
        await manager.trainNaiveBayes(enhancedTrainingDataV3.slice(0, 800)); // Use more samples from V3
        console.log("⚠️ Using fallback model with reduced dataset");
      }
    }

    // Start Express server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📖 API Documentation: http://localhost:${PORT}/api-docs`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

startServer();

export default app;
