const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true },
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    shuttleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shuttle' },
    score: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, maxlength: 500, trim: true },
    tags: [{ type: String, enum: ['on_time', 'clean', 'safe_driving', 'helpful', 'overcrowded', 'late', 'rough_ride', 'great_driver'] }],
  },
  { timestamps: true }
);

ratingSchema.index({ organizationId: 1, createdAt: -1 });
ratingSchema.index({ driverId: 1 });
ratingSchema.index({ studentId: 1, tripId: 1 }, { unique: true });

module.exports = mongoose.model('Rating', ratingSchema);