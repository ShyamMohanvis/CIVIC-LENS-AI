const express = require('express');
const router = express.Router();
const Upvote = require('../models/Upvote');
const Complaint = require('../models/Complaint');
const { authenticate } = require('../middleware/authMiddleware');
const { upvoteLimiter } = require('../middleware/rateLimiter');
const Joi = require('joi');

const upvoteBodySchema = Joi.object({ complaintId: Joi.string().hex().length(24).required() });

/**
 * Bot / Anomaly Detection for Upvotes — FR-41 / VULN-026
 *
 * Detects suspicious patterns:
 * 1. Velocity burst: >10 upvotes in the last 5 minutes from one citizen
 * 2. Cross-district: upvotes on complaints outside the citizen's ULB (already enforced, double-check)
 * 3. Account age: newly registered accounts (<24h) upvoting in bulk
 *
 * Returns { suspicious: boolean, reason?: string }
 */
const detectUpvoteAnomaly = async (citizen, complaintId) => {
    const FIVE_MINUTES_AGO = new Date(Date.now() - 5 * 60 * 1000);
    const ONE_DAY_AGO = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Check 1: Velocity burst — >10 upvotes in 5 minutes
    const recentCount = await Upvote.countDocuments({
        citizenId: citizen._id,
        createdAt: { $gte: FIVE_MINUTES_AGO }
    });

    if (recentCount >= 10) {
        return {
            suspicious: true,
            reason: `Velocity burst: ${recentCount} upvotes in the last 5 minutes (threshold: 10). Possible automated bot.`
        };
    }

    // Check 2: Very new accounts (<24h) attempting their first 5 upvotes in a burst
    const isNewAccount = new Date(citizen.createdAt) > ONE_DAY_AGO;
    if (isNewAccount && recentCount >= 3) {
        return {
            suspicious: true,
            reason: `New account (<24h) attempting rapid upvotes (${recentCount} in 5 min). Flagged for review.`
        };
    }

    // Check 3: Has the same citizen upvoted many DIFFERENT complaints today (>20)?
    const TODAY = new Date();
    TODAY.setHours(0, 0, 0, 0);
    const todayCount = await Upvote.countDocuments({
        citizenId: citizen._id,
        createdAt: { $gte: TODAY }
    });

    if (todayCount >= 20) {
        return {
            suspicious: true,
            reason: `Excessive upvoting: ${todayCount} upvotes today. Daily threshold for anomaly is 20.`
        };
    }

    return { suspicious: false };
};

/**
 * POST /api/upvotes — Cast an upvote on a complaint
 * FR-41 / VULN-026: one per citizen, district-restricted, anomaly detected
 */
router.post('/',
    authenticate,
    upvoteLimiter,
    async (req, res) => {
        try {
            const { error, value } = upvoteBodySchema.validate(req.body, { allowUnknown: false });
            if (error) return res.status(400).json({ success: false, error: error.details[0].message });

            const { complaintId } = value;
            const citizen = req.user;

            // Citizen role only
            if (citizen.role !== 'CITIZEN') {
                return res.status(403).json({ success: false, error: 'Only citizens can upvote.' });
            }

            const complaint = await Complaint.findById(complaintId);
            if (!complaint) return res.status(404).json({ success: false, error: 'Complaint not found.' });

            // District proximity check — citizen and complaint must be in same ULB
            if (citizen.jurisdiction?.ulbCode && complaint.jurisdiction?.ulbCode) {
                if (citizen.jurisdiction.ulbCode !== complaint.jurisdiction.ulbCode) {
                    return res.status(403).json({
                        success: false,
                        error: 'You can only upvote complaints in your district (jurisdiction).'
                    });
                }
            }

            // Bot / anomaly detection — VULN-026
            const anomaly = await detectUpvoteAnomaly(citizen, complaintId);
            if (anomaly.suspicious) {
                console.warn(`🤖 [Upvote] Anomaly detected for ${citizen.employeeId}: ${anomaly.reason}`);
                // Soft-block (reject the upvote but don't ban immediately)
                return res.status(429).json({
                    success: false,
                    error: 'Upvote temporarily blocked due to suspicious activity. Please try again later.',
                    _debug: process.env.NODE_ENV === 'development' ? anomaly.reason : undefined
                });
            }

            // Create upvote — unique index will throw on duplicate
            const upvote = new Upvote({
                complaintId,
                citizenId: citizen._id,
                citizenDistrict: citizen.jurisdiction?.ulbCode,
                complaintDistrict: complaint.jurisdiction?.ulbCode
            });

            await upvote.save();

            // Increment upvote counter on complaint
            await Complaint.findByIdAndUpdate(complaintId, { $inc: { upvoteCount: 1 } });

            console.log(`👍 Upvote: ${citizen.employeeId} → ${complaintId}`);
            res.status(201).json({ success: true, message: 'Upvote recorded.' });

        } catch (error) {
            if (error.code === 11000) {
                return res.status(409).json({ success: false, error: 'You have already upvoted this complaint.' });
            }
            console.error('Upvote error:', error);
            res.status(500).json({ success: false, error: 'Server Error' });
        }
    }
);

/**
 * DELETE /api/upvotes/:complaintId — Remove upvote
 */
router.delete('/:complaintId',
    authenticate,
    async (req, res) => {
        try {
            const { complaintId } = req.params;
            const deleted = await Upvote.findOneAndDelete({
                complaintId,
                citizenId: req.user._id
            });

            if (!deleted) return res.status(404).json({ success: false, error: 'Upvote not found.' });

            await Complaint.findByIdAndUpdate(complaintId, { $inc: { upvoteCount: -1 } });

            res.json({ success: true, message: 'Upvote removed.' });
        } catch (error) {
            console.error('Remove upvote error:', error);
            res.status(500).json({ success: false, error: 'Server Error' });
        }
    }
);

/**
 * GET /api/upvotes/my/:complaintId — Check if current user upvoted a specific complaint
 */
router.get('/my/:complaintId',
    authenticate,
    async (req, res) => {
        try {
            const exists = await Upvote.exists({
                complaintId: req.params.complaintId,
                citizenId: req.user._id
            });
            res.json({ success: true, upvoted: !!exists });
        } catch (error) {
            res.status(500).json({ success: false, error: 'Server Error' });
        }
    }
);

module.exports = router;
