/**
 * Google Cloud Vision API Service
 * Provides AI-powered image analysis for civic complaint classification
 */

const vision = require('@google-cloud/vision');

// Initialize Vision API client
let visionClient = null;

/**
 * Initialize the Vision API client
 */
function initializeVisionClient() {
    if (!visionClient) {
        try {
            // If GOOGLE_APPLICATION_CREDENTIALS is set, use it
            if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
                visionClient = new vision.ImageAnnotatorClient();
            } else if (process.env.GOOGLE_CLOUD_API_KEY) {
                // Use API key if provided
                visionClient = new vision.ImageAnnotatorClient({
                    apiKey: process.env.GOOGLE_CLOUD_API_KEY
                });
            } else {
                console.warn('⚠️ Google Cloud Vision API not configured. Using mock analysis.');
                return null;
            }
            console.log('✅ Google Cloud Vision API initialized');
        } catch (error) {
            console.error('❌ Failed to initialize Vision API:', error.message);
            return null;
        }
    }
    return visionClient;
}

/**
 * Analyze image using Google Cloud Vision API
 * @param {string} imageUrl - Base64 encoded image or URL
 * @returns {Promise<Object>} - Analysis results
 */
async function analyzeImageWithVision(imageUrl) {
    const client = initializeVisionClient();

    // If Vision API not available, use mock analysis
    if (!client) {
        return mockImageAnalysis(imageUrl);
    }

    try {
        let imageContent;

        // Handle base64 image
        if (imageUrl.startsWith('data:image')) {
            // Extract base64 content
            const base64Data = imageUrl.split(',')[1];
            imageContent = { content: base64Data };
        } else if (imageUrl.startsWith('http')) {
            // Handle URL
            imageContent = { source: { imageUri: imageUrl } };
        } else {
            // Assume it's already base64
            imageContent = { content: imageUrl };
        }

        // Perform multiple detection types in parallel
        const [
            labelDetection,
            objectDetection,
            safeSearchDetection,
            textDetection
        ] = await Promise.all([
            client.labelDetection({ image: imageContent }),
            client.objectLocalization({ image: imageContent }),
            client.safeSearchDetection({ image: imageContent }),
            client.textDetection({ image: imageContent })
        ]);

        // Process results
        const labels = labelDetection[0].labelAnnotations || [];
        const objects = objectDetection[0].localizedObjectAnnotations || [];
        const safeSearch = safeSearchDetection[0].safeSearchAnnotation || {};
        const texts = textDetection[0].textAnnotations || [];

        // Analyze for civic issues
        const civicAnalysis = analyzeCivicIssue(labels, objects, texts);

        return {
            success: true,
            source: 'google_vision',
            labels: labels.map(l => ({
                description: l.description,
                score: l.score,
                confidence: Math.round(l.score * 100)
            })),
            objects: objects.map(o => ({
                name: o.name,
                score: o.score,
                confidence: Math.round(o.score * 100)
            })),
            text: texts.length > 0 ? texts[0].description : '',
            safeSearch: {
                adult: safeSearch.adult,
                violence: safeSearch.violence,
                racy: safeSearch.racy
            },
            civicAnalysis,
            rawLabels: labels.map(l => l.description),
            rawObjects: objects.map(o => o.name)
        };

    } catch (error) {
        console.error('Vision API error:', error.message);
        // Fallback to mock analysis
        return mockImageAnalysis(imageUrl);
    }
}

/**
 * Analyze labels and objects for civic issues
 */
function analyzeCivicIssue(labels, objects, texts) {
    const labelDescriptions = labels.map(l => l.description.toLowerCase());
    const objectNames = objects.map(o => o.name.toLowerCase());
    const allDetections = [...labelDescriptions, ...objectNames];
    const textContent = texts.length > 0 ? texts[0].description?.toLowerCase() || '' : '';

    // Civic category keywords
    const categoryMappings = {
        road: {
            keywords: ['road', 'pothole', 'asphalt', 'pavement', 'street', 'crack', 'highway', 'lane', 'traffic', 'sidewalk'],
            weight: 0
        },
        water: {
            keywords: ['water', 'flood', 'leak', 'pipe', 'drainage', 'puddle', 'overflow', 'tap', 'sewage'],
            weight: 0
        },
        electricity: {
            keywords: ['electric', 'wire', 'pole', 'cable', 'transformer', 'power', 'light', 'lamp', 'streetlight'],
            weight: 0
        },
        garbage: {
            keywords: ['garbage', 'trash', 'waste', 'litter', 'rubbish', 'dump', 'debris', 'plastic', 'bin'],
            weight: 0
        },
        sanitation: {
            keywords: ['toilet', 'sanitation', 'sewage', 'drain', 'hygiene', 'cleaning', 'dirty'],
            weight: 0
        }
    };

    // Risk indicators
    const riskKeywords = {
        high: ['fire', 'smoke', 'flood', 'collapse', 'danger', 'broken', 'exposed', 'hazard', 'accident'],
        medium: ['damage', 'leak', 'crack', 'overflow', 'blocked', 'fallen'],
        low: ['dirty', 'litter', 'graffiti', 'minor']
    };

    // Calculate category weights
    for (const [category, data] of Object.entries(categoryMappings)) {
        for (const keyword of data.keywords) {
            if (allDetections.some(d => d.includes(keyword)) || textContent.includes(keyword)) {
                const labelMatch = labels.find(l => l.description.toLowerCase().includes(keyword));
                data.weight += labelMatch ? labelMatch.score : 0.3;
            }
        }
    }

    // Find best matching category
    let bestCategory = 'other';
    let maxWeight = 0;
    for (const [category, data] of Object.entries(categoryMappings)) {
        if (data.weight > maxWeight) {
            maxWeight = data.weight;
            bestCategory = category;
        }
    }

    // Calculate risk level
    let riskLevel = 'low';
    for (const keyword of riskKeywords.high) {
        if (allDetections.some(d => d.includes(keyword)) || textContent.includes(keyword)) {
            riskLevel = 'high';
            break;
        }
    }
    if (riskLevel !== 'high') {
        for (const keyword of riskKeywords.medium) {
            if (allDetections.some(d => d.includes(keyword)) || textContent.includes(keyword)) {
                riskLevel = 'medium';
                break;
            }
        }
    }

    // Calculate confidence
    const confidence = maxWeight > 0 ? Math.min(0.95, maxWeight * 0.8 + 0.2) : 0.5;

    // Determine if emergency
    const emergencyKeywords = ['fire', 'flood', 'collapse', 'accident', 'danger', 'emergency'];
    const isEmergency = allDetections.some(d => emergencyKeywords.some(e => d.includes(e)));

    // Generate description
    const topLabels = labels.slice(0, 3).map(l => l.description);
    const description = topLabels.length > 0
        ? `Detected: ${topLabels.join(', ')}`
        : 'Image analysis completed';

    // Map category to department
    const departmentMap = {
        road: 'Public Works Department',
        water: 'Water Board',
        electricity: 'Electricity Board',
        garbage: 'Waste Management',
        sanitation: 'Health Department',
        other: 'Municipal Corporation'
    };

    return {
        category: bestCategory,
        confidence,
        riskLevel,
        isEmergency,
        department: departmentMap[bestCategory],
        description,
        detectedLabels: topLabels,
        analysisMethod: 'google_vision'
    };
}

/**
 * Mock image analysis when Vision API is not available
 */
function mockImageAnalysis(imageUrl) {
    console.log('📷 Using mock image analysis (Vision API not configured)');

    // Generate random but reasonable results
    const categories = ['road', 'water', 'electricity', 'garbage', 'sanitation', 'other'];
    const category = categories[Math.floor(Math.random() * 4)]; // Favor common categories

    const riskLevels = ['low', 'medium', 'high'];
    const riskLevel = riskLevels[Math.floor(Math.random() * 3)];

    const confidence = 0.7 + Math.random() * 0.25;

    const mockLabels = {
        road: ['Road', 'Asphalt', 'Street', 'Infrastructure'],
        water: ['Water', 'Pipe', 'Leak', 'Infrastructure'],
        electricity: ['Electricity', 'Wire', 'Pole', 'Infrastructure'],
        garbage: ['Garbage', 'Waste', 'Debris', 'Environment'],
        sanitation: ['Sanitation', 'Drainage', 'Environment'],
        other: ['Urban', 'Infrastructure', 'Outdoor']
    };

    const departmentMap = {
        road: 'Public Works Department',
        water: 'Water Board',
        electricity: 'Electricity Board',
        garbage: 'Waste Management',
        sanitation: 'Health Department',
        other: 'Municipal Corporation'
    };

    return {
        success: true,
        source: 'mock',
        labels: mockLabels[category].map((l, i) => ({
            description: l,
            score: 0.9 - (i * 0.1),
            confidence: Math.round((0.9 - (i * 0.1)) * 100)
        })),
        objects: [],
        text: '',
        safeSearch: { adult: 'VERY_UNLIKELY', violence: 'UNLIKELY', racy: 'VERY_UNLIKELY' },
        civicAnalysis: {
            category,
            confidence,
            riskLevel,
            isEmergency: riskLevel === 'high' && Math.random() > 0.5,
            department: departmentMap[category],
            description: `Detected ${category} related issue`,
            detectedLabels: mockLabels[category],
            analysisMethod: 'mock'
        },
        rawLabels: mockLabels[category],
        rawObjects: []
    };
}

/**
 * Assess risk level from image
 */
async function assessImageRisk(imageUrl) {
    const analysis = await analyzeImageWithVision(imageUrl);

    return {
        riskLevel: analysis.civicAnalysis.riskLevel,
        isEmergency: analysis.civicAnalysis.isEmergency,
        confidence: analysis.civicAnalysis.confidence,
        factors: analysis.rawLabels.slice(0, 5)
    };
}

/**
 * Verify resolution by comparing before/after images
 */
async function verifyResolution(beforeImageUrl, afterImageUrl) {
    const [beforeAnalysis, afterAnalysis] = await Promise.all([
        analyzeImageWithVision(beforeImageUrl),
        analyzeImageWithVision(afterImageUrl)
    ]);

    // Compare labels
    const beforeLabels = new Set(beforeAnalysis.rawLabels.map(l => l.toLowerCase()));
    const afterLabels = new Set(afterAnalysis.rawLabels.map(l => l.toLowerCase()));

    // Check if problem indicators are removed
    const problemKeywords = ['damage', 'broken', 'leak', 'pothole', 'garbage', 'debris', 'crack'];

    const beforeProblems = [...beforeLabels].filter(l =>
        problemKeywords.some(p => l.includes(p))
    );
    const afterProblems = [...afterLabels].filter(l =>
        problemKeywords.some(p => l.includes(p))
    );

    const problemsResolved = beforeProblems.length > afterProblems.length;

    // Calculate resolution confidence
    let confidence = 0.5;
    if (problemsResolved) {
        confidence = 0.7 + (beforeProblems.length - afterProblems.length) * 0.1;
    }

    // Check for repair/clean indicators
    const repairKeywords = ['clean', 'new', 'repaired', 'fixed', 'smooth', 'clear'];
    const hasRepairIndicators = [...afterLabels].some(l =>
        repairKeywords.some(r => l.includes(r))
    );

    if (hasRepairIndicators) {
        confidence = Math.min(0.95, confidence + 0.15);
    }

    return {
        isResolved: problemsResolved || confidence > 0.6,
        confidence: Math.min(0.95, confidence),
        beforeIssues: beforeProblems,
        afterIssues: afterProblems,
        recommendation: problemsResolved
            ? 'Issue appears to be resolved'
            : 'Issue may still be present - manual verification recommended'
    };
}

module.exports = {
    analyzeImageWithVision,
    assessImageRisk,
    verifyResolution,
    initializeVisionClient
};
