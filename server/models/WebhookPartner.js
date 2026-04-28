const mongoose = require('mongoose');
const crypto = require('crypto');

/**
 * WebhookPartner Model — VULN-008
 * Stores registered webhook endpoints with HMAC secrets and IP allowlists.
 * Secret is stored as SHA-256 hash; raw secret returned only at registration.
 */
const WebhookPartnerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    url: {
        type: String,
        required: true,
        trim: true
    },
    // Stored as SHA-256 hash of the raw secret — never stored in plaintext
    secretHash: {
        type: String,
        required: true,
        select: false // never returned in queries by default
    },
    // IP allowlist — empty array = no restriction (not recommended)
    ipAllowlist: {
        type: [String],
        default: []
    },
    // Which events this partner is allowed to receive
    allowedEvents: {
        type: [String],
        enum: [
            'complaint.created',
            'complaint.status_changed',
            'complaint.resolved',
            'complaint.escalated',
            'sos.created',
            'sos.resolved',
            'moderation.penalty_issued',
            'sla.breached'
        ],
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    registeredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // Delivery stats
    successCount: { type: Number, default: 0 },
    failureCount: { type: Number, default: 0 },
    lastDeliveredAt: { type: Date },
    lastFailureAt: { type: Date }
}, { timestamps: true });

// Hash secret before saving
WebhookPartnerSchema.statics.hashSecret = (rawSecret) => {
    return crypto.createHash('sha256').update(rawSecret).digest('hex');
};

// Verify a signature: HMAC-SHA256(rawSecret, payload+timestamp)
WebhookPartnerSchema.statics.verifySignature = (rawSecret, payload, timestamp, signature) => {
    const message = `${timestamp}.${JSON.stringify(payload)}`;
    const expected = crypto
        .createHmac('sha256', rawSecret)
        .update(message)
        .digest('hex');
    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expected, 'hex')
    );
};

module.exports = mongoose.model('WebhookPartner', WebhookPartnerSchema);
