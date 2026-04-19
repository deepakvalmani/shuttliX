'use strict';
const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  userId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  action:         { type: String, required: true },
  resource:       { type: String },
  resourceId:     { type: mongoose.Schema.Types.ObjectId },
  ip:             { type: String },
  userAgent:      { type: String },
  requestId:      { type: String },
  status:         { type: String, enum: ['success','failure'], default: 'success' },
  message:        { type: String },
  changes:        mongoose.Schema.Types.Mixed,
}, { timestamps: true });

schema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });
schema.index({ userId: 1, createdAt: -1 });
schema.index({ organizationId: 1, action: 1 });

schema.statics.log = function(data) {
  return this.create(data).catch(err => console.error('[AuditLog]', err.message));
};

module.exports = mongoose.model('AuditLog', schema);
