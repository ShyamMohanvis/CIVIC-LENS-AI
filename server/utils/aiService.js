/**
 * Enhanced AI Classification Service
 * Integrates Google Cloud Vision API for real image analysis
 */

const { analyzeImageWithVision, assessImageRisk } = require('../services/visionService');

/**
 * Classify image using AI
 * @param {string} imageUrl - Base64 data URL or image URL
 * @returns {Promise<{category: string, confidence: number, labels: array, description: string}>}
 */
const classifyImage = async (imageUrl) => {
    try {
        // Use Google Cloud Vision API
        const visionResult = await analyzeImageWithVision(imageUrl);

        if (visionResult.success) {
            const analysis = visionResult.civicAnalysis;

            console.log(`🔍 Vision API Analysis: ${analysis.category} (${analysis.analysisMethod})`);

            return {
                category: analysis.category,
                confidence: analysis.confidence.toFixed(2),
                labels: visionResult.labels || [],
                description: analysis.description,
                riskLevel: analysis.riskLevel,
                isEmergency: analysis.isEmergency,
                department: analysis.department,
                rawLabels: visionResult.rawLabels,
                source: visionResult.source
            };
        }

        // Fallback to mock if Vision API fails
        return await classifyWithMockAI(imageUrl);

    } catch (error) {
        console.error('Classification error:', error.message);
        return await classifyWithMockAI(imageUrl);
    }
};

/**
 * Assess risk from image
 */
const assessRiskFromImage = async (imageUrl) => {
    return await assessImageRisk(imageUrl);
};

/**
 * Enhanced Mock AI Classification
 * Uses weighted random with better logic
 */
const classifyWithMockAI = async (imageUrl) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Weighted random classification (road issues most common)
    const categories = [
        { name: 'road', weight: 40, keywords: ['pothole', 'crack', 'road', 'street', 'pavement'] },
        { name: 'garbage', weight: 20, keywords: ['garbage', 'waste', 'trash', 'litter'] },
        { name: 'water', weight: 15, keywords: ['water', 'leak', 'pipe', 'drainage', 'flood'] },
        { name: 'sanitation', weight: 15, keywords: ['sanitation', 'sewage', 'drain', 'toilet'] },
        { name: 'electricity', weight: 10, keywords: ['electric', 'wire', 'pole', 'light', 'power'] }
    ];

    // Weighted random selection
    const totalWeight = categories.reduce((sum, cat) => sum + cat.weight, 0);
    let random = Math.random() * totalWeight;

    let selectedCategory = categories[0];
    for (const cat of categories) {
        random -= cat.weight;
        if (random <= 0) {
            selectedCategory = cat;
            break;
        }
    }

    // Generate mock labels
    const labels = generateMockLabels(selectedCategory.name);

    // Generate description
    const description = generateMockDescription(selectedCategory.name, labels);

    // Determine risk level
    const riskLevels = ['low', 'medium', 'high'];
    const riskLevel = riskLevels[Math.floor(Math.random() * 3)];

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
        category: selectedCategory.name,
        confidence: (0.75 + Math.random() * 0.24).toFixed(2),
        labels,
        description,
        riskLevel,
        isEmergency: riskLevel === 'high' && Math.random() > 0.7,
        department: departmentMap[selectedCategory.name],
        rawLabels: labels.map(l => l.description),
        source: 'mock'
    };
};

/**
 * Map Google Vision labels to civic categories
 */
const mapLabelsToCivicCategory = (labels) => {
    const categoryKeywords = {
        road: ['road', 'asphalt', 'pavement', 'street', 'highway', 'pothole', 'crack'],
        water: ['water', 'pipe', 'leak', 'drainage', 'flood', 'puddle', 'wet'],
        electricity: ['wire', 'cable', 'pole', 'electric', 'power', 'light', 'streetlight'],
        garbage: ['garbage', 'waste', 'trash', 'litter', 'dump', 'rubbish'],
        sanitation: ['sewage', 'drain', 'toilet', 'sanitation', 'hygiene']
    };

    const scores = {};

    // Score each category based on label matches
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
        scores[category] = 0;

        labels.forEach(label => {
            const labelText = label.description.toLowerCase();
            keywords.forEach(keyword => {
                if (labelText.includes(keyword)) {
                    scores[category] += label.score;
                }
            });
        });
    }

    // Return category with highest score
    const maxCategory = Object.keys(scores).reduce((a, b) =>
        scores[a] > scores[b] ? a : b
    );

    return scores[maxCategory] > 0 ? maxCategory : 'other';
};

/**
 * Generate mock labels for testing
 */
const generateMockLabels = (category) => {
    const mockLabels = {
        road: [
            { description: 'Pothole', score: 0.92 },
            { description: 'Road damage', score: 0.88 },
            { description: 'Asphalt', score: 0.85 }
        ],
        water: [
            { description: 'Water leak', score: 0.90 },
            { description: 'Pipe', score: 0.87 },
            { description: 'Drainage', score: 0.82 }
        ],
        electricity: [
            { description: 'Electrical wire', score: 0.91 },
            { description: 'Power line', score: 0.86 },
            { description: 'Utility pole', score: 0.83 }
        ],
        garbage: [
            { description: 'Garbage pile', score: 0.93 },
            { description: 'Waste', score: 0.89 },
            { description: 'Litter', score: 0.84 }
        ],
        sanitation: [
            { description: 'Drainage issue', score: 0.88 },
            { description: 'Sewage', score: 0.85 },
            { description: 'Sanitation', score: 0.81 }
        ]
    };

    return mockLabels[category] || mockLabels.road;
};

/**
 * Generate mock description
 */
const generateMockDescription = (category, labels) => {
    const descriptions = {
        road: `Road infrastructure issue detected. ${labels[0].description} identified with high confidence.`,
        water: `Water-related issue detected. ${labels[0].description} requiring immediate attention.`,
        electricity: `Electrical hazard detected. ${labels[0].description} poses potential safety risk.`,
        garbage: `Waste management issue detected. ${labels[0].description} affecting cleanliness.`,
        sanitation: `Sanitation issue detected. ${labels[0].description} requiring municipal action.`
    };

    return descriptions[category] || 'Civic issue detected requiring attention.';
};

module.exports = {
    classifyImage,
    classifyWithMockAI,
    mapLabelsToCivicCategory,
    assessRiskFromImage
};
