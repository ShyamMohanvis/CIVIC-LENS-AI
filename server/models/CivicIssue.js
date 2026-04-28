const mongoose = require('mongoose');

const CivicIssueSchema = new mongoose.Schema({
    category: {
        type: String,
        enum: ['pothole', 'garbage', 'broken_streetlight', 'water_leakage', 'other'],
        required: true
    },
    imageUrl: {
        type: String,
        required: true
    },
    location: {
        latitude: { type: Number, required: true },
        longitude: { type: Number, required: true }
    },
    severity: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    },
    status: {
        type: String,
        enum: ['pending', 'in_progress', 'resolved'],
        default: 'pending'
    },
    citizenReported: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

CivicIssueSchema.index({ createdAt: -1 });

module.exports = mongoose.model('CivicIssue', CivicIssueSchema);
