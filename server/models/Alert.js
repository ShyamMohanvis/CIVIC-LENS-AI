const mongoose = require('mongoose');

const AlertSchema = new mongoose.Schema({
    accidentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Accident',
        default: null
    },
    complaintId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Complaint',
        default: null
    },
    source: {
        type: String,
        enum: ['accident', 'complaint', 'emergency'],
        default: 'accident'
    },
    smsStatus: {
        type: String,
        enum: ['sent', 'failed', 'pending', 'dlq'],
        default: 'pending'
    },
    recipientNumber: {
        type: String
    },
    sentAt: {
        type: Date
    },
    messageBody: {
        type: String
    },
    // Retry tracking
    retryCount: {
        type: Number,
        default: 0
    },
    maxRetries: {
        type: Number,
        default: 3
    },
    lastAttemptAt: {
        type: Date,
        default: null
    },
    errorMessage: {
        type: String,
        default: null
    },
    // Dead Letter Queue: populated when all retries are exhausted
    dlqReason: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

AlertSchema.index({ smsStatus: 1, source: 1 });
AlertSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Alert', AlertSchema);
