const mongoose = require('mongoose');

const AccidentSchema = new mongoose.Schema({
    severity: {
        type: String,
        enum: ['low', 'medium', 'high'],
        required: true
    },
    // Standard lat/lng fields (kept for backward compat with AI service)
    location: {
        latitude: { type: Number, required: true },
        longitude: { type: Number, required: true }
    },
    // GeoJSON Point for geo-spatial queries ($near, $geoWithin, heatmaps)
    geoLocation: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            default: [0, 0]
        }
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['pending', 'in_progress', 'resolved'],
        default: 'pending'
    },
    confidence: {
        type: Number,
        default: 0.0
    },
    assignedUnit: {
        type: String,
        default: null
    },
    resolvedAt: { type: Date },
    cameraId: { type: String, default: null }
}, {
    timestamps: true
});

// Time-based index for fast dashboard queries
AccidentSchema.index({ timestamp: -1 });

// 2dsphere index for geo queries (hotspots, radius search)
AccidentSchema.index({ geoLocation: '2dsphere' });

// Pre-save hook to auto-sync geoLocation from lat/lng
AccidentSchema.pre('save', function (next) {
    if (this.location && this.location.longitude != null && this.location.latitude != null) {
        this.geoLocation = {
            type: 'Point',
            coordinates: [this.location.longitude, this.location.latitude]
        };
    }
    next();
});

module.exports = mongoose.model('Accident', AccidentSchema);
