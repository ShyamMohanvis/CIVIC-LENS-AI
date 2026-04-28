const express = require('express');
const router = express.Router();
const ModerationAction = require('../models/ModerationAction');
const User = require('../models/User');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { notifyModerationPenalty, notifyAppealDecision } = require('../services/notificationService');
const Joi = require('joi');

const penaltySchema = Joi.object({
    citizenId: Joi.string().hex().length(24).required(),
    actionType: Joi.string().valid('warning', 'temp_ban', 'perm_ban').required(),
    justification: Joi.string().min(20).required(),
    evidenceComplaintId: Joi.string().hex().length(24).optional()
});

const appealSchema = Joi.object({
    appealText: Joi.string().min(20).max(1000).required()
});

const appealDecisionSchema = Joi.object({
    decision: Joi.string().valid('APPROVED', 'REJECTED').required(),
    decisionText: Joi.string().min(10).max(500).required()
});

const secondaryApprovalSchema = Joi.object({
    approve: Joi.boolean().required(),
    rejectionReason: Joi.string().min(10).max(500).when('approve', {
        is: false,
        then: Joi.required()
    })
});

/**
 * POST /api/moderation/penalty — Issue a penalty
 * Admin only, mandatory justification (VULN-030).
 * Permanent bans go to pending_secondary_approval.
 */
router.post('/penalty',
    authenticate,
    authorize('MUNICIPAL_ADMIN', 'STATE_ADMIN'),
    async (req, res) => {
        try {
            const { error, value } = penaltySchema.validate(req.body);
            if (error) return res.status(400).json({ success: false, error: error.details[0].message });

            const citizen = await User.findById(value.citizenId);
            if (!citizen || citizen.role !== 'CITIZEN') {
                return res.status(404).json({ success: false, error: 'Citizen not found.' });
            }

            const modAction = new ModerationAction({
                ...value,
                issuedBy: req.user._id,
                status: 'active'
            });

            if (value.actionType === 'temp_ban') {
                modAction.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
                citizen.isActive = false;
            } else if (value.actionType === 'perm_ban') {
                // Requires dual-admin approval — VULN-030
                modAction.status = 'pending_secondary_approval';
                modAction.secondaryApprovalRequired = true;
                // Do NOT deactivate citizen yet — only after secondary approval
            }

            await modAction.save();
            if (value.actionType !== 'perm_ban') await citizen.save();

            // Notify citizen (all channels)
            await notifyModerationPenalty(citizen, modAction);

            console.log(`⚖️  Penalty issued: ${value.actionType} → ${citizen.employeeId} by ${req.user.employeeId}`);

            res.status(201).json({ success: true, data: modAction });
        } catch (err) {
            console.error('Moderation penalty error:', err);
            res.status(500).json({ success: false, error: 'Server Error' });
        }
    }
);

/**
 * GET /api/moderation/my-penalties — Citizen views their own active sanctions
 * Citizen only.
 */
router.get('/my-penalties',
    authenticate,
    authorize('CITIZEN'),
    async (req, res) => {
        try {
            const penalties = await ModerationAction.find({
                citizenId: req.user._id
            })
            .populate('issuedBy', 'name employeeId')
            .sort({ createdAt: -1 });

            res.json({
                success: true,
                count: penalties.length,
                data: penalties.map(p => ({
                    id: p._id,
                    actionType: p.actionType,
                    justification: p.justification,
                    status: p.status,
                    expiresAt: p.expiresAt,
                    appealText: p.appealText,
                    appealedAt: p.appealedAt,
                    appealDecision: p.appealDecision,
                    appealDecisionText: p.appealDecisionText,
                    appealDecidedAt: p.appealDecidedAt,
                    createdAt: p.createdAt
                }))
            });
        } catch (err) {
            console.error('Get my-penalties error:', err);
            res.status(500).json({ success: false, error: 'Server Error' });
        }
    }
);

/**
 * GET /api/moderation/pending-approval — State Admin sees perm_bans awaiting 2nd approval
 */
router.get('/pending-approval',
    authenticate,
    authorize('STATE_ADMIN'),
    async (req, res) => {
        try {
            const pending = await ModerationAction.find({
                status: 'pending_secondary_approval'
            })
            .populate('citizenId', 'name employeeId email')
            .populate('issuedBy', 'name employeeId')
            .sort({ createdAt: -1 });

            res.json({ success: true, count: pending.length, data: pending });
        } catch (err) {
            res.status(500).json({ success: false, error: 'Server Error' });
        }
    }
);

/**
 * POST /api/moderation/:id/appeal — Citizen submits an appeal
 * VULN-030: appeal routed to a DIFFERENT admin via separate review endpoint.
 */
router.post('/:id/appeal',
    authenticate,
    authorize('CITIZEN'),
    async (req, res) => {
        try {
            const { error, value } = appealSchema.validate(req.body);
            if (error) return res.status(400).json({ success: false, error: error.details[0].message });

            const modAction = await ModerationAction.findById(req.params.id);
            if (!modAction) return res.status(404).json({ success: false, error: 'Action not found.' });

            if (modAction.citizenId.toString() !== req.user._id.toString()) {
                return res.status(403).json({ success: false, error: 'Unauthorized.' });
            }

            if (modAction.status === 'appealed') {
                return res.status(409).json({ success: false, error: 'Appeal already submitted.' });
            }

            modAction.status = 'appealed';
            modAction.appealText = value.appealText;
            modAction.appealedAt = new Date();
            await modAction.save();

            res.json({ success: true, message: 'Appeal submitted. It will be reviewed by a different administrator.' });
        } catch (err) {
            res.status(500).json({ success: false, error: 'Server Error' });
        }
    }
);

/**
 * POST /api/moderation/:id/review-appeal — Admin reviews a citizen's appeal
 * VULN-030: Must be a DIFFERENT admin than the one who issued the penalty.
 */
router.post('/:id/review-appeal',
    authenticate,
    authorize('MUNICIPAL_ADMIN', 'STATE_ADMIN'),
    async (req, res) => {
        try {
            const { error, value } = appealDecisionSchema.validate(req.body);
            if (error) return res.status(400).json({ success: false, error: error.details[0].message });

            const modAction = await ModerationAction.findById(req.params.id)
                .populate('citizenId', 'name email fcmToken');

            if (!modAction) return res.status(404).json({ success: false, error: 'Action not found.' });

            // VULN-030: Appeal reviewer MUST differ from the issuer
            if (modAction.issuedBy.toString() === req.user._id.toString()) {
                return res.status(403).json({
                    success: false,
                    error: 'You cannot review your own penalty. Appeals must be reviewed by a different administrator.'
                });
            }

            if (modAction.status !== 'appealed') {
                return res.status(400).json({
                    success: false,
                    error: `Action is not in 'appealed' status (current: ${modAction.status}).`
                });
            }

            modAction.appealReviewedBy = req.user._id;
            modAction.appealDecision = value.decision;
            modAction.appealDecisionText = value.decisionText;
            modAction.appealDecidedAt = new Date();

            if (value.decision === 'APPROVED') {
                modAction.status = 'revoked';
                // Re-activate citizen if it was a temp_ban
                if (modAction.actionType === 'temp_ban') {
                    await User.findByIdAndUpdate(modAction.citizenId, { isActive: true });
                }
            } else {
                modAction.status = 'active'; // Sanction upheld
            }

            await modAction.save();

            // Notify citizen of decision
            if (modAction.citizenId) {
                await notifyAppealDecision(modAction.citizenId, modAction, value.decision === 'APPROVED');
            }

            console.log(`⚖️  Appeal ${value.decision} for ${modAction._id} by ${req.user.employeeId}`);

            res.json({
                success: true,
                message: `Appeal ${value.decision === 'APPROVED' ? 'approved — sanction revoked' : 'rejected — sanction upheld'}.`,
                data: modAction
            });
        } catch (err) {
            console.error('Review appeal error:', err);
            res.status(500).json({ success: false, error: 'Server Error' });
        }
    }
);

/**
 * POST /api/moderation/:id/secondary-approve — State Admin gives 2nd approval for perm_ban
 * VULN-030: Dual-admin required for permanent bans.
 * Must be a different admin than the one who issued.
 */
router.post('/:id/secondary-approve',
    authenticate,
    authorize('STATE_ADMIN'),
    async (req, res) => {
        try {
            const { error, value } = secondaryApprovalSchema.validate(req.body);
            if (error) return res.status(400).json({ success: false, error: error.details[0].message });

            const modAction = await ModerationAction.findById(req.params.id)
                .populate('citizenId');

            if (!modAction) return res.status(404).json({ success: false, error: 'Action not found.' });

            if (modAction.status !== 'pending_secondary_approval') {
                return res.status(400).json({
                    success: false,
                    error: `Action is not pending secondary approval (current: ${modAction.status}).`
                });
            }

            // Must be a different admin than the one who issued
            if (modAction.issuedBy.toString() === req.user._id.toString()) {
                return res.status(403).json({
                    success: false,
                    error: 'You cannot approve your own permanent ban. A different State Admin must review.'
                });
            }

            if (value.approve) {
                modAction.status = 'active';
                modAction.approvedBySecondaryAdmin = req.user._id;
                modAction.secondaryApprovedAt = new Date();

                // Now actually deactivate the citizen
                const citizen = await User.findById(modAction.citizenId);
                if (citizen) {
                    citizen.isActive = false;
                    await citizen.save();
                    // Notify citizen
                    await notifyModerationPenalty(citizen, modAction);
                }

                console.log(`🔒 Perm ban APPROVED: ${modAction._id} by ${req.user.employeeId}`);
            } else {
                modAction.status = 'revoked';
                modAction.approvedBySecondaryAdmin = req.user._id;
                modAction.secondaryRejectedAt = new Date();
                modAction.secondaryRejectionReason = value.rejectionReason;

                console.log(`🔓 Perm ban REJECTED: ${modAction._id} by ${req.user.employeeId}`);
            }

            await modAction.save();

            res.json({
                success: true,
                message: value.approve
                    ? 'Permanent ban approved and applied. Citizen account deactivated.'
                    : 'Permanent ban rejected. No action taken on citizen account.',
                data: modAction
            });
        } catch (err) {
            console.error('Secondary approval error:', err);
            res.status(500).json({ success: false, error: 'Server Error' });
        }
    }
);

module.exports = router;
