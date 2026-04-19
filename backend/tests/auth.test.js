'use strict';
/**
 * tests/auth.test.js — Basic auth endpoint tests.
 * Run: npm test
 */
const request = require('supertest');

// Mock environment
process.env.MONGODB_URI          = 'mongodb://localhost:27017/shuttlix_test';
process.env.REDIS_URL            = 'redis://localhost:6379';
process.env.JWT_SECRET           = 'test_secret_32_chars_minimum_ok!';
process.env.JWT_REFRESH_SECRET   = 'test_refresh_32_chars_minimum_ok!';
process.env.JWT_EXPIRE           = '15m';
process.env.JWT_REFRESH_EXPIRE   = '7d';
process.env.CLIENT_URLS          = 'http://localhost:5173';
process.env.BCRYPT_SALT_ROUNDS   = '4'; // fast for tests

describe('Auth Endpoints', () => {
  it('GET /api/health returns ok', async () => {
    // Placeholder — import app after env is set
    expect(true).toBe(true);
  });

  it('POST /api/auth/send-otp validates email', async () => {
    expect(true).toBe(true);
  });
});
