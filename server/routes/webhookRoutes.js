const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const WebhookPartner = require('../models/WebhookPartner');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const Joi = require('joi');

const registerSchema = Joi.object({
    name: Joi.string().trim().min(2).max(100).required(),
    url: Joi.string().uri({ scheme: ['https'] }).required()
        .messages({ 'string.uri': 'Webhook URL must be an HTTPS endpoint.' }),
    ipAllowlist: Joi.array().items(Joi.string().ip()).default([]),
    allowedEvents: Joi.array().items(Joi.string().valid(
        'complaint.created', 'complaint.status_changed', 'complaint.resolved',
        'complaint.escalated', 'sos.created', 'sos.resolved',
        'moderation.penalty_issued', 'sla.breached'
    )).min(1).required()
});

/**
 * POST /api/webhooks — Register a new webhook partner
 * Admin only. Returns rawSecret ONCE at registration — never retrievable again.
 */
router.post('/',
    authenticate,
    authorize('MUNICIPAL_ADMIN', 'STATE_ADMIN'),
    async (req, res) => {
        try {
            const { error, value } = registerSchema.validate(req.body, { abortEarly: false });
            if (error) {
                return res.status(400).json({
                    success: false,
                    error: error.details.map(d => d.message).join('; ')
                });
            }

            // Generate a random 32-byte (64-char hex) raw secret
            const rawSecret = crypto.randomBytes(32).toString('hex');
            const secretHash = WebhookPartner.hashSecret(rawSecret);

            const partner = new WebhookPartner({
                ...value,
                secretHash,
                registeredBy: req.user._id
            });

            await partner.save();

            console.log(`[Webhook] Partner registered: ${partner.name} by ${req.user.employeeId}`);

            // Return raw secret ONCE — not stored, cannot be retrieved later
            res.status(201).json({
                success: true,
                message: 'Webhook partner registered. Store the secret securely — it will not be shown again.',
                partnerId: partner._id,
                name: partner.name,
                url: partner.url,
                allowedEvents: partner.allowedEvents,
                secret: rawSecret  // ← shown only once at registration
            });
        } catch (err) {
            console.error('[Webhook] Register error:', err);
            res.status(500).json({ success: false, error: 'Server Error' });
        }
    }
);

/**
 * GET /api/webhooks — List all registered partners (Admin only)
 * Does NOT return secrets.
 */
router.get('/',
    authenticate,
    authorize('MUNICIPAL_ADMIN', 'STATE_ADMIN'),
    async (req, res) => {
        try {
            const partners = await WebhookPartner.find({ registeredBy: req.user._id })
                .select('-secretHash')
                .populate('registeredBy', 'name employeeId');

            res.json({ success: true, count: partners.length, data: partners });
        } catch (err) {
            res.status(500).json({ success: false, error: 'Server Error' });
        }
    }
);

/**
 * PATCH /api/webhooks/:id/toggle — Enable or disable a partner
 */
router.patch('/:id/toggle',
    authenticate,
    authorize('MUNICIPAL_ADMIN', 'STATE_ADMIN'),
    async (req, res) => {
        try {
            const partner = await WebhookPartner.findById(req.params.id);
            if (!partner) return res.status(404).json({ success: false, error: 'Partner not found.' });

            partner.isActive = !partner.isActive;
            await partner.save();

            res.json({
                success: true,
                message: `Webhook partner ${partner.isActive ? 'enabled' : 'disabled'}.`,
                isActive: partner.isActive
            });
        } catch (err) {
            res.status(500).json({ success: false, error: 'Server Error' });
        }
    }
);

/**
 * DELETE /api/webhooks/:id — Remove a webhook partner
 */
router.delete('/:id',
    authenticate,
    authorize('MUNICIPAL_ADMIN', 'STATE_ADMIN'),
    async (req, res) => {
        try {
            const partner = await WebhookPartner.findByIdAndDelete(req.params.id);
            if (!partner) return res.status(404).json({ success: false, error: 'Partner not found.' });

            res.json({ success: true, message: 'Webhook partner removed.' });
        } catch (err) {
            res.status(500).json({ success: false, error: 'Server Error' });
        }
    }
);

module.exports = router;
