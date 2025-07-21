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

// Import database connection
import DatabaseConnection from './lib/database/connection';

// Import route modules
import userRoutes from './routes/users';
import campaignRoutes from './routes/campaigns';
import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';
import sentimentRoutes from './routes/sentiment';
import experimentalRoutes from './routes/experimental.routes';
import { scrapingRoutes } from './routes/scraping';

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));

// Request logging
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
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

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/campaigns', campaignRoutes);
app.use('/api/v1/scraping', scrapingRoutes);
app.use('/api/v1/sentiment', sentimentRoutes);
app.use('/api/v1/experimental', experimentalRoutes);
app.use('/api/v1/admin', adminRoutes);

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

app.use((err: AppError, req: express.Request, res: express.Response) => {
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
    
    // Start Express server
    app.listen(PORT, () => {
      console.log(`🚀 SentimentalSocial API Server running on port ${PORT}`);
      console.log(`📚 API Documentation available at http://localhost:${PORT}/api-docs`);
      console.log(`🔍 API Info available at http://localhost:${PORT}/api/v1`);
      console.log(`❤️  Health check available at http://localhost:${PORT}/health`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;
