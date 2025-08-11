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
