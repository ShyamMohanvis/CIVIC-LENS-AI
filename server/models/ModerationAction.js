const mongoose = require('mongoose');

/**
 * Moderation Action Model — FR-54 / VULN-030
 *
 * Enforces mandatory justification for all penalties.
 * Routes appeals to a different admin.
 * Permanent bans require dual-admin approval.
 */
const ModerationActionSchema = new mongoose.Schema({
    citizenId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    actionType: {
        type: String,
        enum: ['warning', 'temp_ban', 'perm_ban'],
        required: true
    },
    justification: {
        type: String,
        required: true,
        minlength: 20 // Enforce detailed justification
    },
    evidenceComplaintId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Complaint' // Link to the flagged complaint that caused the penalty
    },
    
    // Original Admin who issued the penalty
    issuedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    
    // Status — includes 'pending_secondary_approval' for perm_ban dual-admin flow (VULN-030)
    status: {
        type: String,
        enum: ['active', 'appealed', 'revoked', 'expired', 'pending_secondary_approval'],
        default: 'active'
    },
    expiresAt: { type: Date }, // For temp_ban

    // Appeal System — VULN-030: appeals routed to a DIFFERENT admin than issuedBy
    appealText: { type: String },
    appealedAt: { type: Date },
    appealReviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User' // enforced at route level to differ from issuedBy
    },
    appealDecision: {
        type: String,
        enum: ['APPROVED', 'REJECTED']
    },
    appealDecisionText: { type: String },
    appealDecidedAt: { type: Date },

    // Dual-Admin Approval for perm_ban — VULN-030
    secondaryApprovalRequired: { type: Boolean, default: false },
    approvedBySecondaryAdmin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    secondaryApprovedAt: { type: Date },
    secondaryRejectedAt: { type: Date },
    secondaryRejectionReason: { type: String },

    createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('ModerationAction', ModerationActionSchema);
