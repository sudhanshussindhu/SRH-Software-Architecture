/**
 * ============================================
 * JEST CONFIGURATION
 * ============================================
 * 
 * This file configures Jest for the SMS-Template project.
 * Jest is a testing framework that helps us verify our code works correctly.
 * 
 * KEY CONCEPTS:
 * - testEnvironment: 'node' means tests run in a Node.js environment
 * - collectCoverageFrom: Shows which parts of code are tested
 * - coverageThreshold: Minimum % of code that must be tested
 * - testMatch: Patterns for finding test files
 */

module.exports = {
  // Use Node.js environment (not browser)
  testEnvironment: "node",

  // Find test files with these patterns
  testMatch: [
    "**/__tests__/**/*.test.js",
    "**/?(*.)+(spec|test).js",
  ],

  // Ignore node_modules when collecting coverage
  collectCoverageFrom: [
    "**/*.js",
    "!node_modules/**",
    "!**/__tests__/**",
    "!coverage/**",
    "!jest.config.js",
  ],

  // Coverage thresholds (minimum % of code that must be tested)
  // These are aspirational - start lower and improve over time
  coverageThreshold: {
    global: {
      statements: 50,   // At least 50% of statements tested
      branches: 40,     // At least 40% of branches tested
      functions: 50,    // At least 50% of functions tested
      lines: 50,        // At least 50% of lines tested
    },
  },

  // Verbose output shows each test name
  verbose: true,

  // Collect coverage by default
  collectCoverage: true,

  // Output coverage reports
  coverageDirectory: "coverage",

  // Timeout for tests (30 seconds)
  testTimeout: 30000,

  // Clear mocks between tests
  clearMocks: true,

  // Transform support for ES6+ syntax
  transform: {},
};
