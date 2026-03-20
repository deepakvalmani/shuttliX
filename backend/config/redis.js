const Redis = require('ioredis');
let redis;

const connectRedis = () => {
  redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    retryStrategy: (times) => {
      if (times > 5) {
        console.error('❌ Redis connection failed after 5 retries.');
        return null;
      }
      return Math.min(times * 500, 2000);
    },
    lazyConnect: false,
    enableOfflineQueue: true,
  });
  redis.on('connect', () => console.log('✅ Redis connected'));
  redis.on('error', (err) => console.warn('⚠️ Redis error:', err.message));
  return redis;
};

// ─── OTP functions ──────────────────────────────────────
const setOTP = async (email, otp, expirySeconds = 300) => {
  try {
    await redis.setex(`otp:${email}`, expirySeconds, otp);
  } catch (err) { console.warn('setOTP error:', err.message); }
};

const getOTP = async (email) => {
  try {
    return await redis.get(`otp:${email}`);
  } catch (err) { console.warn('getOTP error:', err.message); return null; }
};

const deleteOTP = async (email) => {
  try {
    await redis.del(`otp:${email}`);
  } catch (err) { console.warn('deleteOTP error:', err.message); }
};

// ─── Shuttle position functions ─────────────────────────
const setShuttlePosition = async (shuttleId, positionData) => {
  try {
    await redis.setex(`shuttle:${shuttleId}:position`, 30, JSON.stringify(positionData));
  } catch (err) { console.warn('setShuttlePosition error:', err.message); }
};

const getShuttlePosition = async (shuttleId) => {
  try {
    const data = await redis.get(`shuttle:${shuttleId}:position`);
    return data ? JSON.parse(data) : null;
  } catch (err) { console.warn('getShuttlePosition error:', err.message); return null; }
};

const getAllActiveShuttles = async () => {
  try {
    const keys = await redis.keys('shuttle:*:position');
    if (!keys.length) return [];
    const pipeline = redis.pipeline();
    keys.forEach(k => pipeline.get(k));
    const results = await pipeline.exec();
    return results.map(([err, val]) => (err || !val ? null : JSON.parse(val))).filter(Boolean);
  } catch (err) { console.warn('getAllActiveShuttles error:', err.message); return []; }
};

const removeShuttlePosition = async (shuttleId) => {
  try {
    await redis.del(`shuttle:${shuttleId}:position`);
  } catch (err) { console.warn('removeShuttlePosition error:', err.message); }
};

const getRedisClient = () => redis;

module.exports = {
  connectRedis,
  getRedisClient,
  setShuttlePosition,
  getShuttlePosition,
  getAllActiveShuttles,
  removeShuttlePosition,
  setOTP,
  getOTP,
  deleteOTP,
};