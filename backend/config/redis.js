'use strict';
const Redis  = require('ioredis');
const logger = require('../utils/logger');
let client;
const connectRedis = async () => {
  client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', { maxRetriesPerRequest: 3 });
  client.on('connect', ()  => logger.info('Redis connected'));
  client.on('error',   err => logger.error({ msg: 'Redis error', err }));
  await client.ping();
  return client;
};
const TTL = 35;
const setPosition    = (id, d) => client.setex(`pos:${id}`, TTL, JSON.stringify(d));
const getPosition    = async id => { const r = await client.get(`pos:${id}`); return r ? JSON.parse(r) : null; };
const removePosition = id => client.del(`pos:${id}`);
const getAllPositions = async () => {
  const keys = await client.keys('pos:*');
  if (!keys.length) return [];
  const vals = await client.mget(...keys);
  return vals.filter(Boolean).map(v => JSON.parse(v));
};
const setOTP = (k, code, ttl = 300) => client.setex(`otp:${k}`, ttl, code);
const getOTP = k => client.get(`otp:${k}`);
const delOTP = k => client.del(`otp:${k}`);
module.exports = Object.assign(connectRedis, { getClient: () => client, setPosition, getPosition, removePosition, getAllPositions, setOTP, getOTP, delOTP });
