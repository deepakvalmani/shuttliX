'use strict';
const REQUIRED = ['MONGODB_URI','REDIS_URL','JWT_SECRET','JWT_REFRESH_SECRET','JWT_EXPIRE','JWT_REFRESH_EXPIRE','CLIENT_URLS'];
const missing = REQUIRED.filter(k => !process.env[k]);
if (missing.length) {
  console.error('[env] Missing env vars:\n ' + missing.join('\n  '));
  process.exit(1);
}
