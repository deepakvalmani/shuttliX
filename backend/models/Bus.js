const mongoose = require('mongoose');

const busSchema = new mongoose.Schema({
    name: { type: String, required: true }, // e.g., "Shuttle-01"
    shortCode: { type: String, required: true },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    currentRoute: { type: mongoose.Schema.Types.ObjectId, ref: 'Route' },
    status: { type: String, enum: ['active', 'inactive', 'maintenance'], default: 'inactive' },
    lastLocation: {
        lat: Number,
        lng: Number
    }
}, { timestamps: true });

module.exports = mongoose.model('Bus', busSchema);