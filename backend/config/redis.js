const Redis = require('ioredis');

let client;

const connectRedis = () => {
  client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    retryStrategy: times => (times > 5 ? null : Math.min(times * 500, 3000)),
    enableOfflineQueue: true,
    lazyConnect: false,
  });
  client.on('connect', () => console.log('✅ Redis connected'));
  client.on('error', err => console.warn('⚠️  Redis:', err.message));
  return client;
};

// ── Raw key store — caller passes the full key ──────────
const set    = (key, value, ttlSeconds) => client.setex(key, ttlSeconds, String(value));
const get    = key => client.get(key);
const del    = key => client.del(key);

// ── Shuttle position store ───────────────────────────────
const setPosition = (shuttleId, data) =>
  client.setex(`pos:${shuttleId}`, 30, JSON.stringify(data));

const getPosition = async shuttleId => {
  const raw = await client.get(`pos:${shuttleId}`);
  return raw ? JSON.parse(raw) : null;
};

const getAllPositions = async () => {
  const keys = await client.keys('pos:*');
  if (!keys.length) return [];
  const pipeline = client.pipeline();
  keys.forEach(k => pipeline.get(k));
  const results = await pipeline.exec();
  return results.map(([, v]) => (v ? JSON.parse(v) : null)).filter(Boolean);
};

const removePosition = shuttleId => client.del(`pos:${shuttleId}`);

const getClient = () => client;

module.exports = {
  connectRedis, getClient,
  set, get, del,
  setPosition, getPosition, getAllPositions, removePosition,
};
