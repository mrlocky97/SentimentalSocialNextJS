/**
 * Express Server with Swagger Documentation
 * Main server file that sets up Express with all routes and Swagger UI
 */

import dotenv from "dotenv";
// Load environment variables first - prioritize .env over .env.local
dotenv.config({ path: [".env.local", ".env"] });

// Validate required environment variables
import { validateEnv } from "./lib/config/validate-env";
validateEnv();

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

// Import performance services
import { generalRateLimitMiddleware } from "./middleware/intelligent-rate-limit";
import { performanceMonitor } from "./services/performance-monitor.service";

// Import database connection
import DatabaseConnection from "./lib/database/connection";

// Import route modules - consolidated imports
import adminRoutes from "./routes/admin";
import authRoutes from "./routes/auth";
import campaignRoutes from "./routes/campaigns";
import configureDashboardRoutes from "./routes/dashboard.routes";
import configureHealthRoutes from "./routes/health.routes";
import configureMetricsRoutes from "./routes/metrics.routes";
import { scrapingRoutes } from "./routes/scraping";
import securityRoutes from "./routes/security";
import sentimentRoutes from "./routes/sentiment";
import templateRoutes from "./routes/templates";
import twitterAuthRoutes from "./routes/twitter-auth";
import userRoutes from "./routes/users";

// Import Twitter authentication manager
import { createMetricsMiddleware } from "./middleware/metrics.middleware";
import { TwitterAuthManager } from "./services/twitter-auth-manager.service";
// Import sentiment analysis manager and training data
import path from "path";
import { modelPersistenceManager } from "./services/model-persistence.service";
import { TweetSentimentAnalysisManager } from "./services/tweet-sentiment-analysis.manager.service";
// Import IoC Configuration
import {
  checkContainerHealth,
  configureServices,
} from "./lib/dependency-injection/config";
// Import observability middleware
import { logger as systemLogger } from "./lib/observability/logger";
import {
  errorLoggingMiddleware,
  performanceLoggingMiddleware,
  requestLoggingMiddleware,
} from "./middleware/request-logging";

import { features } from "./lib/config/feature-flags";

const modelPath = path.join(
  process.cwd(),
  "src",
  "data",
  "trained-classifier.json",
);

const app = express();
const PORT = appConfig.app.port || 3001;

// Initialize MongoDB connection before mounting routes
async function initializeDatabase() {
  try {
    await DatabaseConnection.connect();
    systemLogger.info("✅ MongoDB connection established");
  } catch (error) {
    systemLogger.error("❌ MongoDB connection failed. Exiting...", { error });
    process.exit(1);
  }
}

// Graceful shutdown handlers
process.on("SIGINT", async () => {
  systemLogger.info("\n🔄 Received SIGINT, shutting down gracefully...");
  await DatabaseConnection.disconnect();
  systemLogger.info("✅ MongoDB connection closed");
  process.exit(0);
});

process.on("SIGTERM", async () => {
  systemLogger.info("\n🔄 Received SIGTERM, shutting down gracefully...");
  await DatabaseConnection.disconnect();
  systemLogger.info("✅ MongoDB connection closed");
  process.exit(0);
});

// Security middleware
app.use(helmet());

// Request correlation and logging (before other middleware)
app.use(requestLoggingMiddleware);

// Metrics collection middleware (after logging)
app.use(createMetricsMiddleware());

// Performance middleware for slow requests
app.use(performanceLoggingMiddleware(1000)); // 1 second threshold

// Compression middleware
app.use(compressionMiddleware);

// Performance optimization
app.use(performanceMiddleware);

// Request sanitization
app.use(sanitizeMiddleware);

// CORS configuration
app.use(cors(appConfig.api.cors));

// Request logging
app.use(morgan("combined"));

// Global rate limiting with intelligent rate limiter
app.use(generalRateLimitMiddleware);

// Performance middleware
app.use(performanceMonitor.middleware());

// Body parsing middleware - optimized limits
app.use(express.json({ limit: appConfig.uploads.maxFileSize }));
app.use(
  express.urlencoded({ extended: true, limit: appConfig.uploads.maxFileSize }),
);

// Health check endpoint
app.use("/health", configureHealthRoutes());

// Metrics endpoints
app.use("/metrics", configureMetricsRoutes());

if (features.ENABLE_SCRAPING) {
  app.use("/api/v1/scraping", scrapingRateLimit, scrapingRoutes);
}

// Swagger UI setup (disabled by default in production)
if (process.env.ENABLE_SWAGGER_UI === "true") {
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
      /* Ocultar secciones internas para usuarios externos */
      .swagger-ui .opblock-tag-section[data-tag="Twitter Authentication"] { display: none !important; }
      .swagger-ui .opblock-tag-section[data-tag="Admin"] { display: none !important; }
      .swagger-ui .opblock-tag-section[data-tag="Security"] { display: none !important; }
  /* Ocultar Sentiment Analysis (grupo de endpoints) */
  .swagger-ui .opblock-tag-section[data-tag="Sentiment Analysis"] { display: none !important; }
  /* Ocultar referencia en el índice/lateral para Sentiment Analysis */
  .swagger-ui .opblock-tag[data-tag="Sentiment Analysis"] { display: none !important; }
      /* Ocultar del índice también */
      .swagger-ui .scheme-container { display: none; }
    `,
      customSiteTitle: "SentimentalSocial API Documentation",
      swaggerOptions: {
        docExpansion: "none",
        filter: true,
        showRequestDuration: true,
        tryItOutEnabled: true,
        tagsSorter: "alpha",
        operationsSorter: "alpha",
        // Lista blanca de tags visibles para usuarios externos
        supportedSubmitMethods: ["get", "post", "put", "delete", "patch"],
        defaultModelExpandDepth: 1,
      },
    }),
  );
}

// API Routes with specific rate limiting
app.use("/api/v1/auth", authRateLimit, authRoutes);
app.use("/api/v1/users", analyticsRateLimit, userRoutes);
app.use("/api/v1/campaigns", analyticsRateLimit, campaignRoutes);
app.use("/api/v1/templates", analyticsRateLimit, templateRoutes);
app.use("/api/v1/twitter-auth", authRateLimit, twitterAuthRoutes);
app.use(
  "/api/v1/sentiment",
  analyticsRateLimit,
  cacheControlMiddleware(300),
  sentimentRoutes,
);
app.use("/api/v1/security", authRateLimit, securityRoutes);
app.use("/api/v1/admin", authRateLimit, adminRoutes);
app.use("/api/v1/dashboard", analyticsRateLimit, configureDashboardRoutes());

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
      dashboard: "/api/v1/dashboard",
      health: "/health",
      metrics: "/metrics",
    },
    features: [
      "User Authentication & Authorization",
      "Campaign Management",
      "Twitter Data Scraping with Twikit (Unlimited)",
      "Real-time Sentiment Analysis",
      "Advanced Analytics & Reporting",
      "Data Export Capabilities",
      "Real-time Observability Dashboard",
      "Comprehensive Health Monitoring",
      "Performance Metrics & Alerting",
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
import { mainErrorHandler, notFoundHandler } from "./core/errors/error-handler";

// 404 handler for unmatched routes
app.use("*", notFoundHandler);

// Global error handler
app.use(mainErrorHandler);

// Start server
async function startServer() {
  try {
    // Initialize database connection first
    await initializeDatabase();

    // Initialize Twitter authentication
    const twitterAuth = TwitterAuthManager.getInstance();
    await twitterAuth.initializeOnStartup();

    // Initialize and train sentiment analysis model with enhanced dataset
    if (features.TRAIN_MODEL_ON_START) {
      // ... el bloque de entrenamiento que ya tienes
      systemLogger.info(
        "🧠 Initializing Enhanced Sentiment Analysis System...",
      );
      const sentimentManager = new TweetSentimentAnalysisManager();

      // Try to load existing model first
      const modelInfo = await modelPersistenceManager.getModelInfo();
      systemLogger.info(
        `📊 Model Status: ${modelInfo.exists ? "Found" : "Not found"}`,
      );

      if (modelInfo.exists && modelInfo.metadata) {
        systemLogger.info(
          `📋 Existing model: ${modelInfo.metadata.datasetSize} examples, version ${modelInfo.metadata.version}`,
        );

        // Validate model age (retrain if older than 7 days)
        const modelAge =
          Date.now() - new Date(modelInfo.metadata.trainingDate).getTime();
        const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;

        if (modelAge > sevenDaysInMs) {
          systemLogger.info(
            "🔄 Model is outdated, retraining with latest data...",
          );
          await trainNewModel(sentimentManager);
        } else {
          systemLogger.info("✅ Using existing trained model");
        }
      } else {
        systemLogger.info("🔄 No existing model found, training new model...");
        await trainNewModel(sentimentManager);
      }
    } else {
      systemLogger.info(
        "⏭️  TRAIN_MODEL_ON_START=false → omito entrenamiento en el arranque",
      );
    }

    // Initialize sentiment manager and preload model (always, regardless of training flag)
    systemLogger.info("🧠 Initializing Sentiment Analysis System...");
    const sentimentManager = new TweetSentimentAnalysisManager();

    // Try to load the latest saved model
    const ok = await sentimentManager.tryLoadLatestModel?.();
    systemLogger.info(
      ok
        ? "🧠 Modelo cargado"
        : "ℹ️ Sin modelo preentrenado, se usará heurística",
    );

    // Configure IoC Container
    configureServices();

    // Verify container health
    const containerHealth = checkContainerHealth();
    systemLogger.info(`📦 IoC Container Status: ${containerHealth.status}`);

    async function trainNewModel(manager: TweetSentimentAnalysisManager) {
      try {
        // Load the most comprehensive training dataset available
        const datasetName = "enhanced-v3-production";

        // Load the enhanced training dataset V3
        const { enhancedTrainingDataV3Complete } = await import(
          "./data/enhanced-training-data-v3"
        );
        const trainingData = enhancedTrainingDataV3Complete;

        systemLogger.info(
          `� Training with ${trainingData.length} examples from ${datasetName} dataset`,
        );

        const startTime = Date.now();
        await manager.trainNaiveBayes(trainingData);
        const trainingTime = Date.now() - startTime;

        systemLogger.info(`✅ Model trained in ${trainingTime}ms`);

        // Save the trained model with metadata
        systemLogger.info("💾 Saving trained model...");
        await manager.saveNaiveBayesToFile(modelPath);

        // Validate model performance
        systemLogger.info("🧪 Validating model with test dataset...");

        try {
          const { sentimentTestDataset } = await import("./data/test-datasets");

          if (sentimentTestDataset && sentimentTestDataset.length > 0) {
            // Use the sentiment service to evaluate accuracy
            const { SentimentService } = await import(
              "./services/sentiment.service"
            );
            const sentimentService = new SentimentService();

            const evaluation = await sentimentService.evaluateAccuracy({
              testCases: sentimentTestDataset.map((item) => ({
                text: item.text,
                expectedSentiment: item.expectedSentiment,
              })),
              includeComparison: true,
            });

            systemLogger.info("📊 Model validation completed", {
              totalTests: evaluation.overall.total,
              accuracy: `${evaluation.overall.accuracy.toFixed(1)}%`,
              correctPredictions: evaluation.overall.correct,
            });

            // Log comparison if available
            if (evaluation.comparison) {
              systemLogger.info("� Model comparison results", {
                ruleBasedAccuracy: `${evaluation.comparison.rule.accuracy.toFixed(1)}%`,
                naiveBayesAccuracy: `${evaluation.comparison.naive.accuracy.toFixed(1)}%`,
                agreement: evaluation.comparison.agreement,
              });
            }
          }
        } catch (error) {
          systemLogger.warn("⚠️ Model validation failed", {
            error: error instanceof Error ? error.message : String(error),
          });
        }

        systemLogger.info("✅ Enhanced Sentiment Analysis System ready!");
      } catch (modelError) {
        systemLogger.error("❌ Error training sentiment model:", {
          error: modelError,
        });
        systemLogger.info("🔄 Falling back to basic model...");

        // Fallback training with enhanced dataset
        const { enhancedTrainingDataV3Complete } = await import(
          "./data/enhanced-training-data-v3"
        );
        await manager.trainNaiveBayes(
          enhancedTrainingDataV3Complete.slice(0, 800),
        ); // Use more samples from V3
        systemLogger.info("⚠️ Using fallback model with reduced dataset");
      }
    }

    // Error logging middleware (must be last)
    app.use(errorLoggingMiddleware);

    // Start Express server
    app.listen(PORT, () => {
      systemLogger.info("Server started successfully", {
        port: PORT,
        environment: process.env.NODE_ENV || "development",
        apiDocs: `http://localhost:${PORT}/api-docs`,
      });
      systemLogger.info(`🚀 Server running on port ${PORT}`);
      systemLogger.info(
        `📖 API Documentation: http://localhost:${PORT}/api-docs`,
      );
    });
  } catch (error) {
    systemLogger.error("❌ Failed to start server:", { error });
    process.exit(1);
  }
}

// Main initialization function
async function initializeApplication() {
  try {
    // Step 1: Initialize database connection before anything else
    await initializeDatabase();

    // Step 2: Start the server with all other initializations
    await startServer();
  } catch (error) {
    systemLogger.error("❌ Failed to initialize application:", { error });
    process.exit(1);
  }
}

initializeApplication();

export default app;
