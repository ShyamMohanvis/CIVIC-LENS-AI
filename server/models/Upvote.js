const mongoose = require('mongoose');

/**
 * Complaint Upvote Model — FR-41 / VULN-026
 *
 * Constraints enforced:
 * - One upvote per citizen per complaint (compound unique index)
 * - District match required (checked at route level)
 */
const UpvoteSchema = new mongoose.Schema({
    complaintId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Complaint',
        required: true,
        index: true
    },
    citizenId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    // Denormalized for anomaly detection queries
    citizenDistrict: { type: String },
    complaintDistrict: { type: String },

    // Anomaly detection flag (set by background job if bot-like pattern)
    flaggedAsAnomaly: { type: Boolean, default: false },

    createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Unique constraint: one upvote per (complaint, citizen) — VULN-026
UpvoteSchema.index({ complaintId: 1, citizenId: 1 }, { unique: true });

module.exports = mongoose.model('Upvote', UpvoteSchema);
