'use strict';
const mongoose = require('mongoose');
const logger   = require('../utils/logger');
module.exports = async () => {
  await mongoose.connect(process.env.MONGODB_URI, { maxPoolSize: 10, serverSelectionTimeoutMS: 5000 });
  logger.info({ msg: 'MongoDB connected', host: mongoose.connection.host });
  mongoose.connection.on('error', err => logger.error({ msg: 'MongoDB error', err }));
};
