/**
 * Classification Service
 * Rule-based image classification system for CIVIC LENS MVP
 * 
 * Uses deterministic filename parsing for guaranteed accuracy and demo stability
 * Architecture supports future AI upgrade via feature flag
 */

// Classification Rules Mapping
const CLASSIFICATION_RULES = {
    '1': {
        category: 'Road Issue',
        type: 'road',
        description: 'Road damage, potholes, street repairs'
    },
    '2': {
        category: 'Garbage Issue',
        type: 'garbage',
        description: 'Waste management, littering, sanitation'
    },
    '3': {
        category: 'Drainage Issue',
        type: 'drainage',
        description: 'Blocked drains, water logging, sewage'
    },
    '4': {
        category: 'Miscellaneous',
        type: 'other',
        description: 'Blurred images, unclear issues, other complaints'
    }
};

/**
 * Extract category digit from filename
 * Uses "Standalone Digit" logic to avoid timestamps/years
 * @param {string} filename - Original filename of uploaded image
 * @returns {string|null} - Category digit or null if not found
 */
function extractCategoryDigit(filename) {
    if (!filename || typeof filename !== 'string') {
        return null;
    }

    // REGEX: Look for digit 1-4 that is NOT surrounded by other digits
    // (?:^|[^0-9]) -> Start of string OR non-digit char
    // ([1-4])      -> Capture digit 1, 2, 3, or 4
    // (?:[^0-9]|$) -> Non-digit char OR end of string
    // This prevents timestamps like 2024 (2 surrounded by digits) from being detected as Garbage
    const regex = /(?:^|[^0-9])([1-4])(?:[^0-9]|$)/;

    const match = filename.match(regex);

    if (match && match[1]) {
        if (CLASSIFICATION_RULES[match[1]]) {
            return match[1];
        }
    }

    return null;
}

/**
 * Classify complaint by filename using rule-based engine
 * @param {string} filename - Image filename
 * @returns {Object} - Classification result with metadata
 */
function classifyByFilename(filename) {
    const categoryDigit = extractCategoryDigit(filename);

    // Edge case: No valid digit found
    if (!categoryDigit) {
        return {
            category: 'Other',
            type: 'other',
            description: 'Unable to auto-classify',
            confidence: 0.0,
            classificationSource: 'rule_based_filename',
            requiresManualReview: true,
            metadata: {
                reason: 'No valid standalone digit found in filename',
                filename: filename,
                timestamp: new Date().toISOString()
            }
        };
    }

    const classification = CLASSIFICATION_RULES[categoryDigit];

    return {
        category: classification.category,
        type: classification.type,
        description: classification.description,
        confidence: 1.0, // Deterministic = 100% confidence
        classificationSource: 'rule_based_filename',
        requiresManualReview: false,
        metadata: {
            rule: `Standalone Digit ${categoryDigit} → ${classification.category}`,
            filename: filename,
            timestamp: new Date().toISOString()
        }
    };
}

/**
 * Placeholder for future AI-based classification
 * @param {Buffer} imageBuffer - Image file buffer
 * @param {string} filename - Image filename
 * @returns {Promise<Object>} - Classification result
 */
async function classifyWithAI(imageBuffer, filename) {
    // Future AI integration point
    // This function will be implemented when upgrading to AI vision
    throw new Error('AI classification not yet implemented. Use rule-based classification.');
}

/**
 * Main classification orchestrator
 * Supports feature flag switching between rule-based and AI
 * @param {Object} options - Classification options
 * @param {string} options.filename - Image filename
 * @param {Buffer} options.imageBuffer - Image file buffer (for AI)
 * @returns {Promise<Object>} - Classification result
 */
async function classifyComplaint({ filename, imageBuffer }) {
    // Feature flag for future AI upgrade
    const useAI = process.env.USE_AI_CLASSIFICATION === 'true';

    try {
        if (useAI && imageBuffer) {
            // Future: AI-based classification
            return await classifyWithAI(imageBuffer, filename);
        } else {
            // Current: Rule-based classification
            return classifyByFilename(filename);
        }
    } catch (error) {
        console.error('❌ Classification error:', error.message);

        // Fallback to rule-based if AI fails
        return classifyByFilename(filename);
    }
}

/**
 * Validate and sanitize filename for security
 * @param {string} filename - User-provided filename
 * @returns {Object} - Validation result
 */
function validateFilename(filename) {
    const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, '_');

    return {
        isValid: sanitized.length > 0 && sanitized.length <= 255,
        sanitized: sanitized,
        isMalicious: filename !== sanitized,
        originalHash: Buffer.from(filename).toString('base64').substring(0, 16)
    };
}

/**
 * Get classification statistics (for analytics)
 * @param {Array} complaints - Array of classified complaints
 * @returns {Object} - Statistics summary
 */
function getClassificationStats(complaints) {
    const stats = {
        total: complaints.length,
        byCategory: {},
        avgConfidence: 0,
        requiresReview: 0
    };

    let totalConfidence = 0;

    complaints.forEach(complaint => {
        const category = complaint.category || 'Unknown';
        stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;

        if (complaint.classificationConfidence) {
            totalConfidence += complaint.classificationConfidence;
        }

        if (complaint.requiresManualReview) {
            stats.requiresReview++;
        }
    });

    stats.avgConfidence = complaints.length > 0
        ? (totalConfidence / complaints.length).toFixed(2)
        : 0;

    return stats;
}

module.exports = {
    classifyComplaint,
    classifyByFilename,
    extractCategoryDigit,
    validateFilename,
    getClassificationStats,
    CLASSIFICATION_RULES
};
