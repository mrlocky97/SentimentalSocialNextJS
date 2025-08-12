/**
 * Jest Test Setup
 * Configuración global para todos los tests
 */

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://localhost:27017/sentimentalsocial_test';
// JWT_SECRET is set in setup-env.js (must be >= 32 chars)
process.env.TWITTER_USERNAME = 'test_user';
process.env.TWITTER_PASSWORD = 'test_password';
process.env.TWITTER_EMAIL = 'test@example.com';

// Global test timeout
jest.setTimeout(10000);

// Mock console.log in tests to reduce noise
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock dotenv to prevent server startup issues
jest.mock('dotenv', () => ({
  config: jest.fn(),
}));

// Mock cache service to prevent intervals
jest.mock('../src/services/cache.service', () => ({
  cacheService: {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    clear: jest.fn(),
    getStats: jest.fn().mockReturnValue({
      hits: 0,
      misses: 0,
      totalRequests: 0,
      hitRate: 0,
      size: 0,
    }),
    cleanup: jest.fn(),
  },
}));

// Mock performance monitor to prevent intervals
jest.mock('../src/services/performance-monitor.service', () => ({
  performanceMonitor: {
    recordRequest: jest.fn(),
    recordResponse: jest.fn(),
    getMetrics: jest.fn().mockReturnValue({
      totalRequests: 0,
      averageResponseTime: 0,
      errorRate: 0,
      uptime: 0,
    }),
    getAnalytics: jest.fn().mockReturnValue({
      requestsPerHour: [],
      responseTimeHistory: [],
      errorHistory: [],
    }),
    reset: jest.fn(),
  },
}));

// Mock database connection
jest.mock('../src/lib/database/connection', () => ({
  __esModule: true,
  default: {
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    isHealthy: jest.fn().mockReturnValue(true),
    getConnection: jest.fn().mockReturnValue({
      connection: {
        readyState: 1,
        db: { databaseName: 'test_db' },
      },
    }),
    healthCheck: jest.fn().mockResolvedValue({
      connected: true,
      readyState: 1,
      readyStateText: 'connected',
      host: 'localhost',
      port: 27017,
      database: 'sentimentalsocial_test',
    }),
    testConnection: jest.fn().mockResolvedValue(true),
  },
}));

// Global cleanup after all tests
afterAll(async () => {
  // Clear all timers and intervals
  jest.clearAllTimers();
  jest.useRealTimers();

  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }

  // Small delay to allow cleanup
  await new Promise((resolve) => setTimeout(resolve, 100));
});

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});
