const express = require('express');
const router = express.Router();
const Complaint = require('../models/Complaint');
const { authenticate } = require('../middleware/authMiddleware');
const Joi = require('joi');

const ratingSchema = Joi.object({
    complaintId: Joi.string().hex().length(24).required(),
    rating:      Joi.number().min(1).max(5).required(),
    feedback:    Joi.string().trim().max(500).optional()
});

/**
 * POST /api/ratings — Submit citizen rating after resolution
 * FR-28 / VULN-029: 24h delay enforced, citizen must own the complaint
 */
router.post('/',
    authenticate,
    async (req, res) => {
        try {
            const { error, value } = ratingSchema.validate(req.body, { allowUnknown: false });
            if (error) return res.status(400).json({ success: false, error: error.details[0].message });

            const { complaintId, rating, feedback } = value;
            const citizen = req.user;

            if (citizen.role !== 'CITIZEN') {
                return res.status(403).json({ success: false, error: 'Only citizens can submit ratings.' });
            }

            const complaint = await Complaint.findById(complaintId);
            if (!complaint) return res.status(404).json({ success: false, error: 'Complaint not found.' });

            // Ownership check
            if (!complaint.userId || complaint.userId.toString() !== citizen._id.toString()) {
                return res.status(403).json({ success: false, error: 'You can only rate your own complaints.' });
            }

            // Must be resolved
            if (complaint.status !== 'resolved') {
                return res.status(400).json({ success: false, error: 'Complaint must be resolved before rating.' });
            }

            // ── 24h delay enforcement — FR-28 / VULN-029 ──
            const resolvedAt = complaint.resolvedAt;
            if (!resolvedAt) {
                return res.status(400).json({ success: false, error: 'Resolution timestamp not found.' });
            }

            const hoursSinceResolved = (Date.now() - new Date(resolvedAt).getTime()) / (1000 * 60 * 60);
            if (hoursSinceResolved < 24) {
                const remainingMins = Math.ceil((24 - hoursSinceResolved) * 60);
                return res.status(429).json({
                    success: false,
                    error: `Rating available in ${remainingMins} minutes (24h delay required after resolution).`,
                    availableAt: new Date(new Date(resolvedAt).getTime() + 24 * 60 * 60 * 1000)
                });
            }

            // Prevent re-rating
            if (complaint.citizenRating) {
                return res.status(409).json({ success: false, error: 'You have already rated this complaint.' });
            }

            // Save rating
            complaint.citizenRating = rating;
            complaint.citizenFeedback = feedback;
            complaint.feedbackTimestamp = new Date();
            await complaint.save();

            console.log(`⭐ Rating submitted: ${complaintId} → ${rating}/5`);
            res.status(201).json({ success: true, message: 'Rating submitted. Thank you for your feedback!' });

        } catch (error) {
            console.error('Rating error:', error);
            res.status(500).json({ success: false, error: 'Server Error' });
        }
    }
);

module.exports = router;
