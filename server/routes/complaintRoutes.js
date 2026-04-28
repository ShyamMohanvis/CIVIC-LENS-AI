const express = require('express');
const router = express.Router();
const multer = require('multer');
const complaintController = require('../controllers/complaintController');
const { authenticate, authorize, optionalAuth } = require('../middleware/authMiddleware');
const { validate, schemas } = require('../middleware/validate');
const { complaintSubmitLimiter } = require('../middleware/rateLimiter');
const { requireIdempotencyKey } = require('../middleware/idempotency');
const Joi = require('joi');
const Complaint = require('../models/Complaint');
const { verifyResolutionEvidence } = require('../services/resolutionVerificationService');
const { dispatchWebhookEvent } = require('../services/webhookService');
const { notifyRatingWindowOpen } = require('../services/notificationService');

// Configure multer — limit to 10 MB images only
const upload = multer({
    dest: 'uploads/',
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) return cb(null, true);
        cb(new Error('Only image files are allowed'));
    }
});

// ─── Complaint Submission ─────────────────────────────────────────────────────
// POST /api/complaints — Create new complaint
// Rate-limited (10/day), Idempotency-Key required (FR-16-A), DTO validated (VULN-006)
router.post('/',
    optionalAuth,
    complaintSubmitLimiter,
    requireIdempotencyKey,
    upload.single('image'),
    validate(schemas.createComplaint),
    complaintController.createComplaint
);

// ─── Public / Filtered Listing ────────────────────────────────────────────────
// GET /api/complaints — Publicly visible, role-filtered if logged in
router.get('/',
    optionalAuth,
    complaintController.getComplaints
);

// ─── AI Human Review Queue ────────────────────────────────────────────────────
// GET /api/complaints/queue/review — Low-confidence complaints pending human review
router.get('/queue/review',
    authenticate,
    authorize('MUNICIPAL_OPERATOR', 'MUNICIPAL_ADMIN', 'STATE_ADMIN'),
    complaintController.getHumanReviewQueue
);

// PATCH /api/complaints/:id/review — Submit human review decision
router.patch('/:id/review',
    authenticate,
    authorize('MUNICIPAL_OPERATOR', 'MUNICIPAL_ADMIN', 'STATE_ADMIN'),
    complaintController.submitHumanReview
);

// ─── Status Update ────────────────────────────────────────────────────────────
// PATCH /api/complaints/:id/status — Operators and admins
router.patch('/:id/status',
    authenticate,
    authorize('MUNICIPAL_OPERATOR', 'MUNICIPAL_ADMIN', 'STATE_ADMIN'),
    validate(schemas.updateStatus),
    complaintController.updateComplaintStatus
);

// ─── Resolution with Evidence Upload — FR-39 / VULN-027 / Appendix F ─────────
/**
 * POST /api/complaints/:id/resolve
 * Authority submits resolution evidence. Validates:
 *   - GPS within 50m of complaint location
 *   - Timestamp after complaint creation AND after assignment
 *   - AI confidence ≥ 0.7 (else human inspector required)
 *   - Evidence image must not duplicate the original complaint image
 */
router.post('/:id/resolve',
    authenticate,
    authorize('MUNICIPAL_OPERATOR', 'MUNICIPAL_ADMIN', 'STATE_ADMIN'),
    upload.single('evidenceImage'),
    async (req, res) => {
        try {
            const complaint = await Complaint.findById(req.params.id);
            if (!complaint) {
                return res.status(404).json({ success: false, error: 'Complaint not found.' });
            }

            if (complaint.status === 'resolved') {
                return res.status(409).json({ success: false, error: 'Complaint is already resolved.' });
            }

            // Parse evidence data from request
            const { evidenceLat, evidenceLng, evidenceTimestamp, notes } = req.body;

            // Read evidence image if uploaded
            let evidenceImageBase64 = null;
            if (req.file) {
                const fs = require('fs');
                const buf = fs.readFileSync(req.file.path);
                evidenceImageBase64 = `data:${req.file.mimetype};base64,${buf.toString('base64')}`;
                fs.unlinkSync(req.file.path);
            }

            // Run all evidence validation checks
            const verification = await verifyResolutionEvidence({
                evidenceLat: evidenceLat ? parseFloat(evidenceLat) : null,
                evidenceLng: evidenceLng ? parseFloat(evidenceLng) : null,
                evidenceTimestamp: evidenceTimestamp || new Date().toISOString(),
                evidenceImageBase64,
                complaint
            });

            // If GPS or timestamp checks fail — hard reject
            if (!verification.gpsCheck.valid || !verification.timestampCheck.valid) {
                return res.status(422).json({
                    success: false,
                    error: 'Evidence validation failed. Resolution rejected.',
                    details: verification.reasons,
                    checks: {
                        gps: verification.gpsCheck,
                        timestamp: verification.timestampCheck
                    }
                });
            }

            // Update complaint
            complaint.status = 'resolved';
            complaint.resolvedAt = new Date();
            complaint.lastStatusChangeAt = new Date();
            complaint.resolutionImage = evidenceImageBase64 || null;
            complaint.resolutionVerified = verification.approved;
            complaint.resolutionConfidence = verification.aiCheck.score;
            complaint.requiresManualReview = verification.requiresHumanReview;

            if (verification.evidenceImageHash) {
                // Store resolution image hash to prevent re-use
                complaint.resolutionImageHash = verification.evidenceImageHash;
            }

            complaint.updates.push({
                message: notes || 'Issue resolved. Evidence submitted.',
                timestamp: new Date(),
                actor: req.user.name,
                actorRole: req.user.role === 'CITIZEN' ? 'citizen' : 'engineer'
            });

            complaint.auditLog.push({
                action: 'resolved',
                actor: req.user.name,
                actorRole: req.user.role,
                timestamp: new Date(),
                metadata: {
                    gpsDistanceMeters: verification.gpsCheck.distanceMeters,
                    aiConfidence: verification.aiCheck.score,
                    autoApproved: verification.approved,
                    requiresHumanReview: verification.requiresHumanReview,
                    imageDuplicate: verification.imageDuplicationCheck.suspicious
                }
            });

            await complaint.save();

            // Dispatch webhook event
            await dispatchWebhookEvent('complaint.resolved', {
                complaintId: complaint._id,
                category: complaint.category,
                resolvedBy: req.user.employeeId,
                autoApproved: verification.approved
            });

            // Schedule rating window notification for citizen (24h from now)
            if (complaint.userId) {
                const User = require('../models/User');
                const citizen = await User.findById(complaint.userId);
                if (citizen) {
                    // In production, schedule this via a job queue (Bull/BullMQ)
                    setTimeout(async () => {
                        await notifyRatingWindowOpen(citizen, complaint);
                    }, 24 * 60 * 60 * 1000);
                }
            }

            console.log(`✅ Complaint ${complaint._id} resolved by ${req.user.employeeId} | AutoApproved: ${verification.approved}`);

            res.json({
                success: true,
                message: verification.approved
                    ? 'Complaint resolved and evidence approved.'
                    : 'Complaint marked resolved. Evidence requires human inspector review.',
                autoApproved: verification.approved,
                requiresHumanReview: verification.requiresHumanReview,
                verification: {
                    gps: verification.gpsCheck,
                    timestamp: verification.timestampCheck,
                    aiConfidence: verification.aiCheck.score,
                    imageDuplicate: verification.imageDuplicationCheck.suspicious,
                    criticalFlag: verification.criticalFlag,
                    reasons: verification.reasons
                }
            });

        } catch (err) {
            console.error('[Resolve] Error:', err);
            res.status(500).json({ success: false, error: 'Server Error', details: err.message });
        }
    }
);

// ─── 14-Day Dispute Window — FR-28 / VULN-029 ────────────────────────────────
/**
 * POST /api/complaints/:id/dispute
 * Citizens can dispute a resolution within 14 days.
 */
router.post('/:id/dispute',
    authenticate,
    authorize('CITIZEN'),
    async (req, res) => {
        try {
            const disputeSchema = Joi.object({
                reason: Joi.string().trim().min(20).max(1000).required()
            });

            const { error, value } = disputeSchema.validate(req.body, { allowUnknown: false });
            if (error) {
                return res.status(400).json({ success: false, error: error.details[0].message });
            }

            const complaint = await Complaint.findById(req.params.id);
            if (!complaint) {
                return res.status(404).json({ success: false, error: 'Complaint not found.' });
            }

            // Must be the owner
            if (!complaint.userId || complaint.userId.toString() !== req.user._id.toString()) {
                return res.status(403).json({ success: false, error: 'You can only dispute your own complaints.' });
            }

            // Must be resolved
            if (complaint.status !== 'resolved') {
                return res.status(400).json({ success: false, error: 'Only resolved complaints can be disputed.' });
            }

            // 14-day window from resolvedAt
            const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;
            const daysSinceResolution = Date.now() - new Date(complaint.resolvedAt).getTime();
            if (daysSinceResolution > FOURTEEN_DAYS_MS) {
                return res.status(410).json({
                    success: false,
                    error: 'Dispute window has closed. Complaints can only be disputed within 14 days of resolution.'
                });
            }

            // Prevent duplicate disputes
            if (complaint.disputeStatus !== 'none') {
                return res.status(409).json({
                    success: false,
                    error: `A dispute has already been submitted (status: ${complaint.disputeStatus}).`
                });
            }

            complaint.disputedAt = new Date();
            complaint.disputeReason = value.reason;
            complaint.disputeStatus = 'pending';

            complaint.auditLog.push({
                action: 'reopened',
                actor: req.user.name,
                actorRole: 'citizen',
                timestamp: new Date(),
                metadata: { disputeReason: value.reason }
            });

            await complaint.save();

            console.log(`🔁 Dispute submitted: ${complaint._id} by ${req.user.employeeId}`);

            res.status(201).json({
                success: true,
                message: 'Dispute submitted successfully. An administrator will review within 3–5 business days.',
                disputeStatus: 'pending',
                disputedAt: complaint.disputedAt
            });

        } catch (err) {
            console.error('[Dispute] Error:', err);
            res.status(500).json({ success: false, error: 'Server Error' });
        }
    }
);

// ─── Community Media ──────────────────────────────────────────────────────────
// POST /api/complaints/:id/community-media — Community Media (FR-43/VULN-007)
router.post('/:id/community-media',
    authenticate,
    upload.single('media'),
    complaintController.uploadCommunityMedia
);

module.exports = router;
