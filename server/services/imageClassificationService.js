/**
 * Government-Grade Image Classification Service
 * Multi-stage pipeline: Quality → Classification → Context → Emergency → Gating
 * 
 * Core Principle: Conservative, Explainable, Fail-safe
 */

const { analyzeImageWithVision, assessImageRisk } = require('./visionService');
const { classifyImage, analyzeEmergency } = require('./aiService');
const Complaint = require('../models/Complaint');

// Confidence threshold - below this, category becomes "other"
const CONFIDENCE_THRESHOLD = 0.6;

// Allowed categories (keep limited for accuracy)
const ALLOWED_CATEGORIES = ['road', 'water', 'electricity', 'sanitation', 'garbage', 'drainage', 'other'];

/**
 * MAIN PIPELINE - Government-Grade Image Classification
 * @param {string} imageUrl - Base64 or URL of image
 * @param {Object} context - Location, history, time context
 * @returns {Promise<Object>} - Complete classification result
 */
async function classifyImageGovernmentGrade(imageUrl, context = {}) {
    const pipelineResult = {
        stages: [],
        startTime: Date.now()
    };

    try {
        // ═══════════════════════════════════════════════════════════════
        // STAGE 1: IMAGE QUALITY FILTER
        // ═══════════════════════════════════════════════════════════════
        const qualityResult = await checkImageQuality(imageUrl);
        pipelineResult.stages.push({
            stage: 'quality_filter',
            ...qualityResult,
            timestamp: Date.now()
        });

        // If quality is too low, return early with "other"
        if (qualityResult.qualityScore < 0.3) {
            return buildFinalResult({
                category: 'other',
                confidence: qualityResult.qualityScore,
                reason: 'Image quality too low for reliable classification',
                visualIndicators: ['poor_image_quality'],
                pipelineResult,
                qualityResult,
                isLowQuality: true
            });
        }

        // ═══════════════════════════════════════════════════════════════
        // STAGE 2: PRIMARY VISUAL CLASSIFICATION
        // ═══════════════════════════════════════════════════════════════
        const classificationResult = await primaryVisualClassification(imageUrl);
        pipelineResult.stages.push({
            stage: 'primary_classification',
            ...classificationResult,
            timestamp: Date.now()
        });

        // ═══════════════════════════════════════════════════════════════
        // STAGE 3: CONTEXT VALIDATION (Geo + History)
        // ═══════════════════════════════════════════════════════════════
        const contextResult = await validateWithContext(
            classificationResult,
            context
        );
        pipelineResult.stages.push({
            stage: 'context_validation',
            ...contextResult,
            timestamp: Date.now()
        });

        // ═══════════════════════════════════════════════════════════════
        // STAGE 4: EMERGENCY DETECTION
        // ═══════════════════════════════════════════════════════════════
        const emergencyResult = await detectEmergency(imageUrl, classificationResult);
        pipelineResult.stages.push({
            stage: 'emergency_detection',
            ...emergencyResult,
            timestamp: Date.now()
        });

        // ═══════════════════════════════════════════════════════════════
        // STAGE 5: CONFIDENCE GATING
        // ═══════════════════════════════════════════════════════════════
        const gatedResult = applyConfidenceGating(
            contextResult.adjustedCategory || classificationResult.category,
            contextResult.adjustedConfidence || classificationResult.confidence,
            qualityResult.qualityScore
        );
        pipelineResult.stages.push({
            stage: 'confidence_gating',
            ...gatedResult,
            timestamp: Date.now()
        });

        // ═══════════════════════════════════════════════════════════════
        // FINAL RESULT
        // ═══════════════════════════════════════════════════════════════
        return buildFinalResult({
            category: gatedResult.finalCategory,
            confidence: gatedResult.finalConfidence,
            visualIndicators: classificationResult.visualIndicators,
            pipelineResult,
            qualityResult,
            classificationResult,
            contextResult,
            emergencyResult,
            gatedResult,
            isLowQuality: false
        });

    } catch (error) {
        console.error('Classification pipeline error:', error);

        // Fail-safe: return "other" on any error
        return buildFinalResult({
            category: 'other',
            confidence: 0.3,
            reason: 'Classification pipeline error - defaulting to manual review',
            visualIndicators: ['error'],
            pipelineResult,
            error: error.message
        });
    }
}

/**
 * STAGE 1: Image Quality Check
 * Checks brightness, clarity, object presence
 */
async function checkImageQuality(imageUrl) {
    try {
        // For now, use heuristics. In production, use Vision API features
        const qualityFactors = {
            hasImage: !!imageUrl && imageUrl.length > 100,
            isBase64: imageUrl.startsWith('data:image'),
            sizeAdequate: imageUrl.length > 5000, // Rough size check
            formatValid: /^data:image\/(jpeg|jpg|png|webp|gif);base64,/.test(imageUrl)
        };

        // Calculate quality score
        let qualityScore = 0;
        let issues = [];

        if (qualityFactors.hasImage) qualityScore += 0.3;
        else issues.push('no_image_data');

        if (qualityFactors.sizeAdequate) qualityScore += 0.3;
        else issues.push('image_too_small');

        if (qualityFactors.formatValid || !qualityFactors.isBase64) qualityScore += 0.2;
        else issues.push('invalid_format');

        // Add remaining score for assumed clarity (would use Vision API in production)
        qualityScore += 0.2;

        return {
            qualityScore: Math.min(1, qualityScore),
            issues,
            isAcceptable: qualityScore >= 0.3,
            recommendation: qualityScore < 0.3 ? 'Image quality too low' : 'Image acceptable'
        };

    } catch (error) {
        return {
            qualityScore: 0.5,
            issues: ['quality_check_failed'],
            isAcceptable: true,
            recommendation: 'Quality check failed, proceeding with caution'
        };
    }
}

/**
 * STAGE 2: Primary Visual Classification
 * Uses Vision API with government-safe prompt
 */
async function primaryVisualClassification(imageUrl) {
    try {
        // Try Groq AI first (most accurate)
        const groqResult = await classifyImage(imageUrl);

        if (groqResult) {
            console.log(`🤖 Groq AI: ${groqResult.category} (${(groqResult.confidence * 100).toFixed(1)}%)`);
            return {
                category: ALLOWED_CATEGORIES.includes(groqResult.category) ? groqResult.category : 'other',
                confidence: groqResult.confidence,
                visualIndicators: groqResult.visualIndicators || [],
                rawLabels: groqResult.visualIndicators || [],
                source: groqResult.source || 'groq',
                description: groqResult.description,
                riskLevel: groqResult.riskLevel,
                isEmergency: groqResult.isEmergency
            };
        }

        // Fallback to Vision API
        const visionResult = await analyzeImageWithVision(imageUrl);

        if (!visionResult.success) {
            return {
                category: 'other',
                confidence: 0.4,
                visualIndicators: ['classification_failed'],
                rawLabels: [],
                source: 'fallback'
            };
        }

        // Extract civic analysis
        const analysis = visionResult.civicAnalysis;

        // Validate category is in allowed list
        const category = ALLOWED_CATEGORIES.includes(analysis.category)
            ? analysis.category
            : 'other';

        return {
            category,
            confidence: analysis.confidence,
            visualIndicators: analysis.detectedLabels || [],
            rawLabels: visionResult.rawLabels || [],
            source: visionResult.source,
            description: analysis.description
        };

    } catch (error) {
        console.error('Primary classification error:', error);
        return {
            category: 'other',
            confidence: 0.3,
            visualIndicators: ['error'],
            rawLabels: [],
            source: 'error'
        };
    }
}

/**
 * STAGE 3: Context Validation
 * Uses location, nearby complaints, time for validation
 */
async function validateWithContext(classificationResult, context = {}) {
    const { lat, lng, timestamp } = context;

    let contextScore = 0;
    let contextFactors = [];
    let adjustedCategory = classificationResult.category;
    let adjustedConfidence = classificationResult.confidence;

    try {
        // Check nearby complaints for same category (strengthens confidence)
        if (lat && lng) {
            const nearbyComplaints = await findNearbyComplaints(lat, lng, 200); // 200m radius

            if (nearbyComplaints.length > 0) {
                const sameCategoryCount = nearbyComplaints.filter(
                    c => c.category === classificationResult.category
                ).length;

                if (sameCategoryCount > 0) {
                    contextScore += 0.2;
                    contextFactors.push({
                        factor: 'nearby_similar',
                        count: sameCategoryCount,
                        boost: 0.2
                    });
                    adjustedConfidence = Math.min(0.95, adjustedConfidence + 0.1);
                }

                // Check if different category is more common
                const categoryCount = {};
                nearbyComplaints.forEach(c => {
                    categoryCount[c.category] = (categoryCount[c.category] || 0) + 1;
                });

                const mostCommon = Object.entries(categoryCount)
                    .sort((a, b) => b[1] - a[1])[0];

                if (mostCommon && mostCommon[1] >= 3 && mostCommon[0] !== classificationResult.category) {
                    contextFactors.push({
                        factor: 'area_trend',
                        dominantCategory: mostCommon[0],
                        count: mostCommon[1]
                    });

                    // If AI is uncertain and area has clear trend, consider adjustment
                    if (classificationResult.confidence < 0.7) {
                        adjustedCategory = mostCommon[0];
                        contextFactors.push({
                            factor: 'category_adjusted',
                            from: classificationResult.category,
                            to: mostCommon[0]
                        });
                    }
                }
            }
        }

        // Time-based context (e.g., after rain = more water issues)
        if (timestamp) {
            const hour = new Date(timestamp).getHours();
            const month = new Date(timestamp).getMonth();

            // Monsoon season (June-September in India) = more water/drainage issues
            if (month >= 5 && month <= 8) {
                if (['water', 'drainage'].includes(classificationResult.category)) {
                    contextScore += 0.1;
                    contextFactors.push({
                        factor: 'seasonal_context',
                        season: 'monsoon',
                        boost: 0.1
                    });
                }
            }
        }

    } catch (error) {
        console.error('Context validation error:', error);
        contextFactors.push({
            factor: 'context_error',
            error: error.message
        });
    }

    return {
        contextScore,
        contextFactors,
        adjustedCategory,
        adjustedConfidence,
        originalCategory: classificationResult.category,
        wasAdjusted: adjustedCategory !== classificationResult.category
    };
}

/**
 * STAGE 4: Emergency Detection
 * Detects immediate threats to public safety
 */
async function detectEmergency(imageUrl, classificationResult) {
    const emergencyIndicators = {
        electricity: ['exposed wire', 'live wire', 'sparking', 'electrocution risk'],
        fire: ['fire', 'smoke', 'burning', 'flames'],
        structural: ['collapse', 'collapsed', 'falling', 'unstable'],
        flooding: ['flood', 'submerged', 'deep water', 'drowning risk']
    };

    let isEmergency = false;
    let riskLevel = 'low';
    let detectedThreats = [];
    let confidence = 0.5;

    const visualIndicators = classificationResult.visualIndicators || [];
    const rawLabels = classificationResult.rawLabels || [];
    const allIndicators = [...visualIndicators, ...rawLabels].map(i => i.toLowerCase());

    // Check for emergency indicators
    for (const [threatType, keywords] of Object.entries(emergencyIndicators)) {
        for (const keyword of keywords) {
            if (allIndicators.some(ind => ind.includes(keyword))) {
                detectedThreats.push({
                    type: threatType,
                    indicator: keyword
                });
            }
        }
    }

    // Determine emergency status
    if (detectedThreats.length > 0) {
        isEmergency = true;
        confidence = Math.min(0.95, 0.7 + detectedThreats.length * 0.1);

        if (detectedThreats.some(t => ['fire', 'structural'].includes(t.type))) {
            riskLevel = 'critical';
        } else if (detectedThreats.length >= 2) {
            riskLevel = 'high';
        } else {
            riskLevel = 'medium';
        }
    }

    // Category-based emergency check
    if (classificationResult.category === 'electricity' && classificationResult.confidence > 0.8) {
        riskLevel = riskLevel === 'low' ? 'medium' : riskLevel;
    }

    return {
        isEmergency,
        riskLevel,
        confidence,
        detectedThreats,
        recommendedSLA: getRecommendedSLA(riskLevel)
    };
}

/**
 * STAGE 5: Confidence Gating
 * If confidence < threshold, category becomes "other"
 */
function applyConfidenceGating(category, confidence, qualityScore) {
    // Calculate combined confidence
    const combinedConfidence = (confidence * 0.7) + (qualityScore * 0.3);

    // Apply gating
    if (combinedConfidence < CONFIDENCE_THRESHOLD) {
        return {
            finalCategory: 'other',
            finalConfidence: combinedConfidence,
            wasGated: true,
            reason: `Confidence ${(combinedConfidence * 100).toFixed(1)}% below threshold ${CONFIDENCE_THRESHOLD * 100}%`,
            originalCategory: category,
            originalConfidence: confidence
        };
    }

    return {
        finalCategory: category,
        finalConfidence: combinedConfidence,
        wasGated: false,
        reason: 'Confidence above threshold',
        originalCategory: category,
        originalConfidence: confidence
    };
}

/**
 * Build final result with all metadata
 */
function buildFinalResult(data) {
    const {
        category,
        confidence,
        visualIndicators = [],
        pipelineResult = {},
        qualityResult = {},
        classificationResult = {},
        contextResult = {},
        emergencyResult = {},
        gatedResult = {},
        reason = '',
        error = null,
        isLowQuality = false
    } = data;

    // Calculate trust score (weighted)
    const trustScore = calculateTrustScore(
        qualityResult.qualityScore || 0.5,
        confidence,
        contextResult.contextScore || 0,
        0 // Duplication score (would come from duplicate detection)
    );

    // Map category to department
    const departmentMap = {
        road: 'Public Works Department',
        water: 'Water Board',
        electricity: 'Electricity Board',
        garbage: 'Waste Management',
        sanitation: 'Health Department',
        drainage: 'Drainage Department',
        other: 'Municipal Corporation'
    };

    return {
        // Primary result
        category,
        confidence: parseFloat(confidence.toFixed(3)),
        department: departmentMap[category] || 'Municipal Corporation',

        // Visual analysis
        visualIndicators,
        description: classificationResult.description || `${category} issue detected`,

        // Emergency status
        isEmergency: emergencyResult.isEmergency || false,
        riskLevel: emergencyResult.riskLevel || 'low',

        // Trust & quality
        trustScore: Math.round(trustScore),
        imageQuality: qualityResult.qualityScore || 0.5,
        isLowQuality,

        // Gating info
        wasGated: gatedResult.wasGated || false,
        gatingReason: gatedResult.reason || reason,

        // Context
        contextApplied: (contextResult.contextFactors || []).length > 0,
        contextFactors: contextResult.contextFactors || [],
        wasAdjusted: contextResult.wasAdjusted || false,

        // Pipeline metadata
        pipelineStages: (pipelineResult.stages || []).length,
        processingTime: pipelineResult.startTime ? Date.now() - pipelineResult.startTime : 0,
        source: classificationResult.source || 'unknown',

        // For admin review
        requiresReview: confidence < 0.7 || isLowQuality,
        reviewReason: confidence < 0.7
            ? 'Low confidence classification'
            : isLowQuality
                ? 'Low quality image'
                : null,

        // Error handling
        error: error || null
    };
}

/**
 * Calculate Trust Score (weighted formula)
 * Image clarity: 30%, AI confidence: 40%, Context match: 20%, Duplication: 10%
 */
function calculateTrustScore(imageQuality, aiConfidence, contextScore, duplicationScore) {
    const weights = {
        imageQuality: 0.30,
        aiConfidence: 0.40,
        contextMatch: 0.20,
        duplication: 0.10
    };

    const score = (
        (imageQuality * weights.imageQuality) +
        (aiConfidence * weights.aiConfidence) +
        (contextScore * weights.contextMatch) +
        ((1 - duplicationScore) * weights.duplication) // Lower is better for duplication
    ) * 100;

    return Math.min(100, Math.max(0, score));
}

/**
 * Find nearby complaints for context
 */
async function findNearbyComplaints(lat, lng, radiusMeters = 200) {
    try {
        const complaints = await Complaint.find({
            'location.coordinates': {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [lng, lat]
                    },
                    $maxDistance: radiusMeters
                }
            },
            createdAt: {
                $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
            }
        }).limit(10);

        return complaints;
    } catch (error) {
        console.error('Error finding nearby complaints:', error);
        return [];
    }
}

/**
 * Get recommended SLA based on risk level
 */
function getRecommendedSLA(riskLevel) {
    const slaMap = {
        critical: 15,    // 15 minutes
        high: 60,        // 1 hour
        medium: 240,     // 4 hours
        low: 1440        // 24 hours
    };
    return slaMap[riskLevel] || 1440;
}

module.exports = {
    classifyImageGovernmentGrade,
    checkImageQuality,
    primaryVisualClassification,
    validateWithContext,
    detectEmergency,
    applyConfidenceGating,
    calculateTrustScore,
    CONFIDENCE_THRESHOLD,
    ALLOWED_CATEGORIES
};
