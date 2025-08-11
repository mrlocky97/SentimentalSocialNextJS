// Ensure critical env vars exist before any module import during tests
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-must-be-32-chars-long-1234';
process.env.MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://localhost:27017/sentimentalsocial_test';
process.env.TWITTER_USERNAME = process.env.TWITTER_USERNAME || 'test_user';
process.env.TWITTER_PASSWORD = process.env.TWITTER_PASSWORD || 'test_password';
process.env.TWITTER_EMAIL = process.env.TWITTER_EMAIL || 'test@example.com';
