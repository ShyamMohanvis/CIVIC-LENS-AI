const Complaint = require('../models/Complaint');
const { calculateTrustScore } = require('../services/trustScoreService');
const { assessRiskLevel } = require('../services/riskAssessmentService');
const { setSLA } = require('../services/slaManagementService');

/**
 * Analyze voice transcript using AI
 */
const analyzeVoiceIncident = async (req, res) => {
    try {
        const { transcript, location } = req.body;

        if (!transcript || !transcript.trim()) {
            return res.status(400).json({ success: false, error: 'Transcript is required' });
        }

        const analysis = await analyzeIncidentWithAI(transcript);

        res.status(200).json({
            success: true,
            analysis
        });

    } catch (error) {
        console.error('Voice analysis error:', error);
        res.status(500).json({ success: false, error: 'Analysis failed', details: error.message });
    }
};

/**
 * Create complaint from voice
 */
const createVoiceComplaint = async (req, res) => {
    try {
        const { transcript, analysis, lat, lng } = req.body;

        if (!transcript || !analysis || !lat || !lng) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }

        let newComplaint = new Complaint({
            imageUrl: '',
            category: analysis.category,
            aiSuggestedCategory: analysis.category,
            userOverrideCategory: false,
            aiConfidence: analysis.confidence,
            department: analysis.department,
            location: {
                type: 'Point',
                coordinates: [parseFloat(lng), parseFloat(lat)]
            },
            locationSource: 'mock',
            locationAccuracy: 10,
            isDuplicate: false,
            userId: req.user ? req.user._id : null,
            source: 'voice',
            transcript: transcript.trim(),
            aiReasoning: {
                keywords: analysis.keywords || [],
                urgencySignals: analysis.urgencySignals || []
            },
            createdAt: new Date()
        });

        const trustScore = calculateTrustScore(newComplaint, {});
        newComplaint.trustScore = trustScore;

        newComplaint.riskLevel = analysis.riskLevel;
        newComplaint.publicSafetyImpact = getRiskImpact(analysis.riskLevel);

        setSLA(newComplaint);

        newComplaint.auditLog = [{
            action: 'created',
            actor: newComplaint.userId,
            actorRole: 'citizen',
            timestamp: new Date(),
            metadata: {
                source: 'voice',
                trustScore,
                riskLevel: analysis.riskLevel,
                aiConfidence: analysis.confidence,
                isEmergency: analysis.isEmergency
            },
            ipAddress: req.ip
        }];

        let message = 'Voice complaint registered';
        if (analysis.isEmergency) {
            message += ' (Emergency detected)';
        }

        newComplaint.updates = [{
            message,
            timestamp: new Date(),
            actor: newComplaint.userId,
            actorRole: 'citizen'
        }];

        await newComplaint.save();

        console.log(`🎙️ Voice complaint created: ${newComplaint._id} | Category: ${analysis.category} | Emergency: ${analysis.isEmergency}`);

        res.status(201).json({
            success: true,
            data: newComplaint,
            analysis
        });

    } catch (error) {
        console.error('Voice complaint creation error:', error);
        res.status(500).json({ success: false, error: 'Server Error', details: error.message });
    }
};

async function analyzeIncidentWithAI(transcript) {
    const text = transcript.toLowerCase();

    const categoryKeywords = {
        electricity: ['electric', 'wire', 'pole', 'power', 'shock', 'electrocuted', 'transformer', 'cable'],
        road: ['road', 'pothole', 'street', 'pavement', 'crack', 'collapse', 'accident'],
        water: ['water', 'leak', 'pipe', 'drainage', 'flood', 'overflow', 'tap'],
        sanitation: ['sewage', 'drain', 'toilet', 'sanitation', 'smell', 'waste water'],
        garbage: ['garbage', 'waste', 'trash', 'litter', 'dump', 'rubbish']
    };

    const urgencyWords = ['danger', 'emergency', 'accident', 'fire', 'electrocuted', 'flood', 'collapse', 'urgent', 'immediate', 'critical'];

    let category = 'other';
    let maxMatches = 0;

    for (const [cat, keywords] of Object.entries(categoryKeywords)) {
        const matches = keywords.filter(kw => text.includes(kw)).length;
        if (matches > maxMatches) {
            maxMatches = matches;
            category = cat;
        }
    }

    const urgencySignals = urgencyWords.filter(word => text.includes(word));
    const isEmergency = urgencySignals.length > 0 || text.includes('people') || text.includes('children');

    let riskLevel = 'low';
    if (isEmergency || urgencySignals.length >= 2) {
        riskLevel = 'high';
    } else if (urgencySignals.length === 1 || category === 'electricity') {
        riskLevel = 'medium';
    }

    const confidence = maxMatches > 0 ? Math.min(0.95, 0.7 + (maxMatches * 0.05)) : 0.6;

    const departmentMap = {
        electricity: 'Electricity Board',
        road: 'Public Works Department',
        water: 'Water Board',
        sanitation: 'Health Department',
        garbage: 'Waste Management',
        other: 'Municipal Corporation'
    };

    const slaMap = {
        high: '15 minutes',
        medium: '4 hours',
        low: '24 hours'
    };

    return {
        category,
        subCategory: extractSubCategory(text, category),
        riskLevel,
        isEmergency,
        confidence,
        department: departmentMap[category],
        keywords: categoryKeywords[category]?.filter(kw => text.includes(kw)) || [],
        urgencySignals,
        expectedSLA: slaMap[riskLevel]
    };
}

function extractSubCategory(text, category) {
    const subCategories = {
        electricity: text.includes('wire') ? 'Exposed live wire' : 'Power issue',
        road: text.includes('pothole') ? 'Pothole' : 'Road damage',
        water: text.includes('leak') ? 'Water leak' : 'Water issue',
        sanitation: 'Drainage issue',
        garbage: 'Waste accumulation'
    };
    return subCategories[category] || 'General issue';
}

function getRiskImpact(riskLevel) {
    const impacts = {
        low: 20,
        medium: 50,
        high: 80,
        critical: 100
    };
    return impacts[riskLevel] || 20;
}

module.exports = {
    analyzeVoiceIncident,
    createVoiceComplaint
};
