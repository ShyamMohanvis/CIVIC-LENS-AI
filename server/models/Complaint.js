const mongoose = require('mongoose');

const ComplaintSchema = new mongoose.Schema({
    // Core Fields (Existing)
    imageUrl: { type: String, required: false, default: '' }, // Made optional for voice complaints
    category: {
        type: String,
        required: true
    },
    department: { type: String, required: true },
    location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], required: true, index: '2dsphere' }
    },
    status: {
        type: String,
        enum: ['pending', 'in_progress', 'resolved'],
        default: 'pending'
    },
    isDuplicate: { type: Boolean, default: false },

    // Gen-5 Enhancements

    // Assignment (RBAC)
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    assignedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    assignedAt: { type: Date },

    // Jurisdiction (for filtering by role)
    jurisdiction: {
        state: { type: String, index: true },
        city: { type: String },
        ulbCode: { type: String, index: true },
        ward: { type: String }
    },

    // Swachh City Integration
    swachhCityId: { type: String, index: true },
    wardNumber: { type: String },

    // Voice Complaint Support
    source: { type: String, enum: ['photo', 'voice', 'sos'], default: 'photo' },
    transcript: { type: String },
    aiReasoning: {
        keywords: [String],
        urgencySignals: [String]
    },

    // AI & Trust Metrics
    trustScore: {
        type: Number,
        min: 0,
        max: 100,
        default: 50
    },
    aiConfidence: {
        type: Number,
        min: 0,
        max: 1,
        default: 0.5
    },
    aiSuggestedCategory: { type: String },
    userOverrideCategory: { type: Boolean, default: false },

    // Classification Metadata (Rule-Based System)
    classificationSource: {
        type: String,
        enum: [
            'rule_based_filename', 'ai_vision', 'manual', 'voice_ai',
            // Detectron2 pipeline modes
            'detectron2_detectron2', 'detectron2_stub_cv2'
        ],
        default: 'manual'
    },
    classificationConfidence: {
        type: Number,
        min: 0,
        max: 1,
        default: 0.0
    },
    autoDetectedCategory: { type: String }, // Preserves original detection
    requiresManualReview: { type: Boolean, default: false },
    classificationMetadata: {
        rule: String,
        filename: String,
        reason: String,
        timestamp: Date
    },

    // Risk Assessment
    riskLevel: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'low'
    },
    publicSafetyImpact: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
    },

    // Duplicate Detection
    duplicateClusterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Complaint'
    },
    duplicateConfidence: { type: Number, min: 0, max: 1 },
    imageHash: { type: String },

    // SLA Management — FR-27 / VULN-028
    // Dual timer: total elapsed (createdAt — never resets) + since last status change
    slaDeadline: { type: Date },
    slaDuration: { type: Number }, // in hours
    lastStatusChangeAt: { type: Date, default: Date.now }, // resets on status transitions only
    slaBreachCount: { type: Number, default: 0 }, // increments at each 1× SLA
    breachProbability: {
        type: Number,
        min: 0,
        max: 1,
        default: 0
    },
    escalationLevel: {
        type: Number,
        default: 0,
        min: 0,
        max: 3
    },

    // Location Metadata
    locationAccuracy: { type: Number }, // in meters
    locationSource: {
        type: String,
        enum: ['gps', 'network', 'manual', 'mock'],
        default: 'mock'
    },

    // Resolution Verification
    resolutionImage: { type: String },
    resolutionVerified: { type: Boolean, default: false },
    resolutionConfidence: { type: Number, min: 0, max: 1 },

    // User Context
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    userCredibilityScore: { type: Number, min: 0, max: 100, default: 50 },

    // Community
    upvoteCount: { type: Number, default: 0, min: 0 },

    // Updates & Timeline
    updates: [{
        message: String,
        timestamp: { type: Date, default: Date.now },
        actor: String,
        actorRole: {
            type: String,
            enum: ['citizen', 'engineer', 'admin', 'system']
        }
    }],

    // Audit Trail
    auditLog: [{
        action: {
            type: String,
            enum: ['created', 'updated', 'escalated', 'resolved', 'reopened', 'verified']
        },
        actor: String,
        actorRole: String,
        timestamp: { type: Date, default: Date.now },
        metadata: mongoose.Schema.Types.Mixed,
        ipAddress: String
    }],

    // Timestamps
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    resolvedAt: { type: Date },

    // Feedback
    citizenRating: { type: Number, min: 1, max: 5 },
    citizenFeedback: { type: String },
    feedbackTimestamp: { type: Date },

    // Dispute System — FR-28 / VULN-029
    // Citizens can dispute within 14 days of resolution
    disputedAt: { type: Date },
    disputeReason: { type: String, maxlength: 1000 },
    disputeStatus: {
        type: String,
        enum: ['none', 'pending', 'upheld', 'dismissed'],
        default: 'none'
    },
    disputeReviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    disputeReviewNote: { type: String }
}, {
    timestamps: true
});

// Indexes for performance
ComplaintSchema.index({ createdAt: -1 });
ComplaintSchema.index({ status: 1, createdAt: -1 });
ComplaintSchema.index({ ulbCode: 1, wardNumber: 1 });
ComplaintSchema.index({ trustScore: -1 });
ComplaintSchema.index({ riskLevel: 1, status: 1 });
ComplaintSchema.index({ slaDeadline: 1, status: 1 });

// Virtual for SLA status
ComplaintSchema.virtual('slaStatus').get(function () {
    if (!this.slaDeadline) return 'no_sla';
    if (this.status === 'resolved') return 'met';
    if (new Date() > this.slaDeadline) return 'breached';

    const hoursRemaining = (this.slaDeadline - new Date()) / (1000 * 60 * 60);
    if (hoursRemaining < 2) return 'critical';
    if (hoursRemaining < 6) return 'warning';
    return 'on_track';
});

// Method to add audit log entry
ComplaintSchema.methods.addAuditLog = function (action, actor, actorRole, metadata = {}) {
    this.auditLog.push({
        action,
        actor,
        actorRole,
        metadata,
        timestamp: new Date()
    });
    return this.save();
};

// Method to calculate priority score
ComplaintSchema.methods.calculatePriorityScore = function () {
    let score = 0;

    // Risk level (0-40 points)
    const riskPoints = { low: 10, medium: 20, high: 30, critical: 40 };
    score += riskPoints[this.riskLevel] || 10;

    // SLA breach probability (0-30 points)
    score += (this.breachProbability || 0) * 30;

    // Trust score (0-15 points)
    score += (this.trustScore || 50) * 0.15;

    // Age of complaint (0-10 points)
    const ageHours = (Date.now() - this.createdAt) / (1000 * 60 * 60);
    score += Math.min(10, (ageHours / 24) * 10);

    // Public impact (0-5 points)
    score += (this.publicSafetyImpact || 0) * 0.05;

    return Math.round(score);
};

module.exports = mongoose.model('Complaint', ComplaintSchema);
