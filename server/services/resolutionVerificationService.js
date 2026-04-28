/**
 * Resolution Verification Service — FR-39 / VULN-027 / Appendix F
 *
 * Validates evidence uploaded when an authority marks a complaint as resolved.
 *
 * Checks (in order):
 *  1. GPS — evidence GPS must be within 50m of the complaint location
 *  2. Timestamp — evidence must be captured AFTER complaint created_at AND after assignment
 *  3. AI Confidence — confidence score must be ≥ 0.7 for auto-approval
 *  4. Image Hash — evidence image must not match the original complaint image (possible fake)
 *  5. Critical/SOS — always requires additional human inspector sign-off
 */

const Complaint = require('../models/Complaint');
const crypto = require('crypto');

// Haversine distance in meters
const haversineMeters = (lat1, lng1, lat2, lng2) => {
    const R = 6371000;
    const toRad = d => d * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/**
 * Validate evidence GPS against the complaint's original location.
 * @param {number} evidenceLat
 * @param {number} evidenceLng
 * @param {object} complaint — Mongoose complaint document
 * @returns {{ valid: boolean, distanceMeters: number }}
 */
const validateGPS = (evidenceLat, evidenceLng, complaint) => {
    if (evidenceLat == null || evidenceLng == null) {
        return { valid: false, distanceMeters: null, reason: 'Evidence GPS coordinates missing' };
    }

    const [complaintLng, complaintLat] = complaint.location.coordinates;
    const distanceMeters = haversineMeters(evidenceLat, evidenceLng, complaintLat, complaintLng);

    const MAX_DISTANCE = 50; // 50 metres per Appendix F
    return {
        valid: distanceMeters <= MAX_DISTANCE,
        distanceMeters: Math.round(distanceMeters),
        reason: distanceMeters > MAX_DISTANCE
            ? `Evidence is ${Math.round(distanceMeters)}m from complaint location (max 50m)`
            : null
    };
};

/**
 * Validate evidence timestamp.
 * Must be AFTER complaint.createdAt AND after complaint.assignedAt (if assigned).
 * @param {Date|string} evidenceTimestamp
 * @param {object} complaint
 * @returns {{ valid: boolean, reason?: string }}
 */
const validateTimestamp = (evidenceTimestamp, complaint) => {
    if (!evidenceTimestamp) {
        return { valid: false, reason: 'Evidence timestamp missing' };
    }

    const evTs = new Date(evidenceTimestamp);
    const createdAt = new Date(complaint.createdAt);

    if (evTs <= createdAt) {
        return {
            valid: false,
            reason: `Evidence timestamp (${evTs.toISOString()}) must be after complaint creation (${createdAt.toISOString()})`
        };
    }

    if (complaint.assignedAt) {
        const assignedAt = new Date(complaint.assignedAt);
        if (evTs <= assignedAt) {
            return {
                valid: false,
                reason: `Evidence timestamp must be after complaint assignment (${assignedAt.toISOString()})`
            };
        }
    }

    return { valid: true };
};

/**
 * Compute SHA-256 hash of base64 image data for duplicate/fake detection.
 */
const hashImage = (base64Image) => {
    if (!base64Image) return null;
    const raw = base64Image.split(',')[1] || base64Image;
    return crypto.createHash('sha256').update(raw).digest('hex');
};

/**
 * Check if the evidence image is suspiciously identical to the original complaint image.
 * Prevents authorities from re-using the original photo as "resolution proof".
 */
const checkImageDuplication = (evidenceImageHash, complaint) => {
    if (!evidenceImageHash || !complaint.imageHash) {
        return { suspicious: false };
    }
    if (evidenceImageHash === complaint.imageHash) {
        return { suspicious: true, reason: 'Evidence image hash matches original complaint image — possible fake evidence' };
    }
    return { suspicious: false };
};

/**
 * Simulate AI confidence check for resolution.
 * In production: call the Detectron2 or Gemini Vision API with the evidence image.
 *
 * @param {string} evidenceImageBase64
 * @param {string} category
 * @returns {Promise<{ confident: boolean, score: number, requiresHumanReview: boolean }>}
 */
const checkAIResolutionConfidence = async (evidenceImageBase64, category) => {
    // TODO (Phase 2): Replace with actual call to resolution verification AI model.
    // For now, return a deterministic pseudo-score if image is provided.
    if (!evidenceImageBase64) {
        return { confident: false, score: 0, requiresHumanReview: true, reason: 'No evidence image provided' };
    }

    // Stub: use image size as proxy for confidence (real image = higher confidence)
    const imageSize = evidenceImageBase64.length;
    const score = imageSize > 50000 ? 0.82 : imageSize > 10000 ? 0.65 : 0.40;
    const THRESHOLD = 0.70; // Appendix F: Confidence ≥ 0.7

    return {
        confident: score >= THRESHOLD,
        score: parseFloat(score.toFixed(2)),
        requiresHumanReview: score < THRESHOLD,
        reason: score < THRESHOLD
            ? `AI confidence ${(score * 100).toFixed(0)}% is below 70% threshold — human inspector required`
            : null
    };
};

/**
 * Main resolution verification orchestrator.
 *
 * @param {object} opts
 * @param {number}  opts.evidenceLat
 * @param {number}  opts.evidenceLng
 * @param {Date}    opts.evidenceTimestamp
 * @param {string}  opts.evidenceImageBase64
 * @param {object}  opts.complaint — Mongoose Complaint document
 * @returns {Promise<{
 *   approved: boolean,
 *   requiresHumanReview: boolean,
 *   gpsCheck: object,
 *   timestampCheck: object,
 *   aiCheck: object,
 *   imageDuplicationCheck: object,
 *   criticalFlag: boolean,
 *   reasons: string[]
 * }>}
 */
const verifyResolutionEvidence = async ({ evidenceLat, evidenceLng, evidenceTimestamp, evidenceImageBase64, complaint }) => {
    const reasons = [];

    // 1. GPS check
    const gpsCheck = validateGPS(evidenceLat, evidenceLng, complaint);
    if (!gpsCheck.valid) reasons.push(gpsCheck.reason);

    // 2. Timestamp check
    const timestampCheck = validateTimestamp(evidenceTimestamp, complaint);
    if (!timestampCheck.valid) reasons.push(timestampCheck.reason);

    // 3. Image duplication check
    const evidenceHash = hashImage(evidenceImageBase64);
    const imageDuplicationCheck = checkImageDuplication(evidenceHash, complaint);
    if (imageDuplicationCheck.suspicious) reasons.push(imageDuplicationCheck.reason);

    // 4. AI confidence check
    const aiCheck = await checkAIResolutionConfidence(evidenceImageBase64, complaint.category);
    if (!aiCheck.confident) reasons.push(aiCheck.reason);

    // 5. Critical/SOS always require human review (Appendix F)
    const criticalFlag = ['critical'].includes(complaint.riskLevel) || complaint.source === 'sos';

    // Approve if: GPS ✅ + timestamp ✅ + not suspicious image + AI ≥ 0.7 + NOT critical
    const approved = gpsCheck.valid && timestampCheck.valid && !imageDuplicationCheck.suspicious && aiCheck.confident && !criticalFlag;
    const requiresHumanReview = !approved;

    return {
        approved,
        requiresHumanReview,
        gpsCheck,
        timestampCheck,
        aiCheck,
        imageDuplicationCheck,
        evidenceImageHash: evidenceHash,
        criticalFlag,
        reasons
    };
};

// Legacy compat — kept for backward compatibility with existing controller calls
const verifyResolution = async (beforeImage, afterImage, complaint) => {
    return verifyResolutionEvidence({
        evidenceImageBase64: afterImage,
        evidenceLat: null,
        evidenceLng: null,
        evidenceTimestamp: new Date(),
        complaint
    });
};

module.exports = {
    verifyResolutionEvidence,
    verifyResolution,
    validateGPS,
    validateTimestamp,
    checkAIResolutionConfidence,
    hashImage
};
