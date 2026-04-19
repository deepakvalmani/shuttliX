'use strict';
/**
 * scripts/migrate-v2.js — One-time migration from ShuttliX v1 to v2.
 * Run: node scripts/migrate-v2.js
 */
require('dotenv').config();
const mongoose = require('mongoose');

async function migrate() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI);

  const User = require('../models/User');

  // 1. Set isVerified = true for all existing users (they were already using the app)
  const r1 = await User.updateMany({ isVerified: { $exists: false } }, { $set: { isVerified: true } });
  console.log(`Set isVerified on ${r1.modifiedCount} users`);

  // 2. Set isActive = true for all existing users
  const r2 = await User.updateMany({ isActive: { $exists: false } }, { $set: { isActive: true } });
  console.log(`Set isActive on ${r2.modifiedCount} users`);

  // 3. Initialize sessions array for users that have none
  const r3 = await User.updateMany({ sessions: { $exists: false } }, { $set: { sessions: [] } });
  console.log(`Init sessions on ${r3.modifiedCount} users`);

  // 4. Initialize loginAttempts for users that have none
  const r4 = await User.updateMany({ loginAttempts: { $exists: false } }, { $set: { loginAttempts: 0 } });
  console.log(`Init loginAttempts on ${r4.modifiedCount} users`);

  console.log('Migration complete!');
  await mongoose.disconnect();
}

migrate().catch(err => { console.error('Migration failed:', err); process.exit(1); });
