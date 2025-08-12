module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: {
          baseUrl: '.',
          paths: {
            '@/*': ['src/*'],
          },
        },
      },
    ],
  },
  // Correct module name mapper for Jest
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  // Module resolution
  modulePaths: ['<rootDir>/src'],
  moduleDirectories: ['node_modules', '<rootDir>/src'],
  // Mock external dependencies that might cause issues
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  // Handle timers and intervals - ENHANCED FOR TESTING
  fakeTimers: {
    enableGlobally: false,
  },
  // Test environment optimizations
  maxWorkers: 1, // Run tests sequentially to avoid conflicts
  detectOpenHandles: true,
  forceExit: true,
  // Ensure env vars are set before any modules are loaded in tests
  setupFiles: ['<rootDir>/tests/setup-env.js'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/server.ts', // Exclude server startup
    '!src/types/**', // Exclude type definitions
    '!src/**/*.test.ts', // Exclude test files
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testTimeout: 30000, // Increased timeout
  verbose: true,
  // Resource cleanup
  globalTeardown: '<rootDir>/tests/helpers/global-teardown.js',
};
