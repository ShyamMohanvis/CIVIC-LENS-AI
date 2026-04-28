/**
 * Risk Assessment Service
 * Evaluates risk level and public safety impact of complaints
 */

const assessRiskLevel = (complaint, contextData = {}) => {
    const riskFactors = [];
    let riskScore = 0;

    // Category-based base risk
    const categoryRisk = {
        'electricity': 40, // High risk - electrocution hazard
        'road': 30,        // Medium-high - accident risk
        'water': 25,       // Medium - flooding/contamination
        'sanitation': 20,  // Medium-low - health hazard
        'garbage': 15      // Low - nuisance
    };

    riskScore += categoryRisk[complaint.category] || 20;

    // Image analysis indicators (would use AI in production)
    if (complaint.imageUrl) {
        // Mock: Check for keywords in AI description
        const description = complaint.aiSuggestedCategory || '';

        if (description.includes('exposed') || description.includes('wire')) {
            riskScore += 20;
            riskFactors.push({ factor: 'Exposed electrical hazard', severity: 8 });
        }

        if (description.includes('flood') || description.includes('water')) {
            riskScore += 15;
            riskFactors.push({ factor: 'Water accumulation', severity: 6 });
        }

        if (description.includes('collapse') || description.includes('crack')) {
            riskScore += 25;
            riskFactors.push({ factor: 'Structural damage', severity: 9 });
        }
    }

    // Location context
    if (contextData.populationDensity > 1000) {
        riskScore += 10;
        riskFactors.push({ factor: 'High population density area', severity: 5 });
    }

    // Time context
    const hour = new Date(complaint.createdAt || Date.now()).getHours();
    if (hour >= 6 && hour <= 9 || hour >= 17 && hour <= 20) {
        // Peak hours - higher risk due to more people
        riskScore += 5;
    }

    // Weather context (would integrate weather API in production)
    if (contextData.weather === 'rain' && complaint.category === 'electricity') {
        riskScore += 15;
        riskFactors.push({ factor: 'Electrical hazard during rain', severity: 8 });
    }

    // Determine risk level
    let riskLevel;
    if (riskScore >= 70) riskLevel = 'critical';
    else if (riskScore >= 50) riskLevel = 'high';
    else if (riskScore >= 30) riskLevel = 'medium';
    else riskLevel = 'low';

    // Calculate public safety impact (0-100)
    const publicSafetyImpact = Math.min(100, riskScore);

    return {
        riskLevel,
        riskScore,
        publicSafetyImpact,
        riskFactors,
        estimatedAffectedPopulation: estimateAffectedPopulation(complaint, contextData)
    };
};

const estimateAffectedPopulation = (complaint, contextData) => {
    const basePopulation = contextData.populationDensity || 500;
    const radiusMeters = 100; // Assume 100m radius of impact

    // Simple calculation: population density * area
    const area = Math.PI * Math.pow(radiusMeters, 2) / 1000000; // km²
    return Math.round(basePopulation * area);
};

const assessEmergencyRisk = async (complaint, imageAnalysis = {}) => {
    const riskFactors = {
        // Visual indicators from image analysis
        exposedWires: imageAnalysis.detectedHazards?.includes('electrical') || false,
        waterLevel: imageAnalysis.floodDepth || 0,
        structuralDamage: imageAnalysis.structuralIntegrity || 0,

        // Context
        populationDensity: 1000, // Would fetch from location API
        timeOfDay: getTimeRiskFactor(complaint.createdAt),
        weatherConditions: 'clear', // Would fetch from weather API

        // Historical
        previousIncidents: 0 // Would query database
    };

    const severity = calculateSeverity(riskFactors);
    const publicSafetyImpact = estimatePublicImpact(riskFactors);

    // Calculate numeric severity score for aiRiskScore (severity is a string!)
    const severityScoreMap = { 'critical': 100, 'high': 75, 'medium': 50, 'low': 25 };
    const severityScore = severityScoreMap[severity] || 50;

    return {
        severity,
        publicSafetyImpact,
        estimatedAffectedPopulation: estimateAffectedPopulation(complaint, riskFactors),
        aiRiskScore: Math.round(severityScore * 0.6 + publicSafetyImpact * 0.4),
        recommendedSLA: getSLAForRisk(severity),
        riskFactors: Object.entries(riskFactors).map(([key, value]) => ({
            factor: key,
            value,
            severity: calculateFactorSeverity(key, value)
        }))
    };
};

const calculateSeverity = (riskFactors) => {
    let score = 0;

    if (riskFactors.exposedWires) score += 40;
    if (riskFactors.waterLevel > 0.5) score += 30;
    if (riskFactors.structuralDamage > 0.7) score += 35;
    if (riskFactors.populationDensity > 1000) score += 15;

    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
};

const estimatePublicImpact = (riskFactors) => {
    let impact = 0;

    if (riskFactors.exposedWires) impact += 30;
    if (riskFactors.waterLevel > 0.5) impact += 25;
    if (riskFactors.structuralDamage > 0.7) impact += 30;
    impact += Math.min(15, riskFactors.populationDensity / 100);

    return Math.min(100, impact);
};

const getTimeRiskFactor = (timestamp) => {
    const hour = new Date(timestamp).getHours();
    if (hour >= 6 && hour <= 9 || hour >= 17 && hour <= 20) return 1.5; // Peak hours
    if (hour >= 22 || hour <= 5) return 1.2; // Night hours
    return 1.0;
};

const getSLAForRisk = (severity) => {
    const slaMinutes = {
        'critical': 15,
        'high': 60,
        'medium': 240,
        'low': 1440
    };
    return slaMinutes[severity] || 1440;
};

const calculateFactorSeverity = (factor, value) => {
    // Simple severity calculation
    if (typeof value === 'boolean') return value ? 8 : 0;
    if (typeof value === 'number') return Math.min(10, Math.round(value * 10));
    return 5;
};

module.exports = {
    assessRiskLevel,
    assessEmergencyRisk,
    estimateAffectedPopulation,
    getSLAForRisk
};
