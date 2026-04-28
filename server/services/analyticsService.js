/**
 * Analytics Service
 * Provides city rankings, heatmaps, and predictive analytics
 */

const Complaint = require('../models/Complaint');

/**
 * Calculate city/ward rankings
 */
const calculateCityRankings = async () => {
    // Mock ULB codes - in production, would fetch from database
    const ulbCodes = ['DL001', 'DL002', 'MH001', 'KA001'];

    const rankings = await Promise.all(ulbCodes.map(async (ulbCode) => {
        const metrics = await calculateMetrics(ulbCode);

        return {
            ulbCode,
            name: getULBName(ulbCode),

            // Core metrics
            resolutionRate: metrics.totalCount > 0 ? (metrics.resolvedCount / metrics.totalCount * 100).toFixed(2) : 0,
            avgResolutionTime: metrics.avgResolutionTime,
            slaAdherence: metrics.totalCount > 0 ? (metrics.withinSLA / metrics.totalCount * 100).toFixed(2) : 0,
            citizenSatisfaction: metrics.avgRating,

            // AI metrics
            avgTrustScore: metrics.avgTrustScore,
            duplicateRate: metrics.totalCount > 0 ? (metrics.duplicateCount / metrics.totalCount * 100).toFixed(2) : 0,

            // Composite score (0-100)
            overallScore: calculateCompositeScore(metrics)
        };
    }));

    return rankings.sort((a, b) => b.overallScore - a.overallScore);
};

/**
 * Calculate metrics for a ULB
 */
const calculateMetrics = async (ulbCode) => {
    const complaints = await Complaint.find({ ulbCode });

    const totalCount = complaints.length;
    const resolvedCount = complaints.filter(c => c.status === 'resolved').length;
    const duplicateCount = complaints.filter(c => c.isDuplicate).length;

    // Calculate average resolution time
    const resolvedComplaints = complaints.filter(c => c.resolvedAt);
    const avgResolutionTime = resolvedComplaints.length > 0
        ? resolvedComplaints.reduce((sum, c) => {
            const time = (new Date(c.resolvedAt) - new Date(c.createdAt)) / (1000 * 60 * 60);
            return sum + time;
        }, 0) / resolvedComplaints.length
        : 0;

    // Calculate SLA adherence
    const withinSLA = complaints.filter(c => {
        if (c.status !== 'resolved') return false;
        return new Date(c.resolvedAt) <= new Date(c.slaDeadline);
    }).length;

    // Calculate average trust score
    const avgTrustScore = totalCount > 0
        ? complaints.reduce((sum, c) => sum + (c.trustScore || 50), 0) / totalCount
        : 50;

    // Mock citizen rating
    const avgRating = 4.2;

    return {
        totalCount,
        resolvedCount,
        duplicateCount,
        avgResolutionTime: Math.round(avgResolutionTime),
        withinSLA,
        avgTrustScore: Math.round(avgTrustScore),
        avgRating
    };
};

/**
 * Calculate composite score
 */
const calculateCompositeScore = (metrics) => {
    let score = 0;

    // Resolution rate (0-30 points)
    const resolutionRate = metrics.totalCount > 0 ? metrics.resolvedCount / metrics.totalCount : 0;
    score += resolutionRate * 30;

    // SLA adherence (0-25 points)
    const slaRate = metrics.totalCount > 0 ? metrics.withinSLA / metrics.totalCount : 0;
    score += slaRate * 25;

    // Citizen satisfaction (0-20 points)
    score += (metrics.avgRating / 5) * 20;

    // Trust score (0-15 points)
    score += (metrics.avgTrustScore / 100) * 15;

    // Low duplicate rate bonus (0-10 points)
    const duplicateRate = metrics.totalCount > 0 ? metrics.duplicateCount / metrics.totalCount : 0;
    score += (1 - duplicateRate) * 10;

    return Math.round(score);
};

/**
 * Generate heatmap data
 */
const generateHeatmaps = async (ulbCode, timeRange = 30) => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeRange);

    const complaints = await Complaint.find({
        ulbCode,
        createdAt: { $gte: startDate }
    });

    return {
        // Complaint density heatmap
        densityMap: generateDensityHeatmap(complaints),

        // Risk cluster heatmap
        riskMap: generateRiskHeatmap(complaints.filter(c => ['high', 'critical'].includes(c.riskLevel))),

        // Category-specific heatmaps
        categoryMaps: {
            road: generateCategoryHeatmap(complaints, 'road'),
            water: generateCategoryHeatmap(complaints, 'water'),
            electricity: generateCategoryHeatmap(complaints, 'electricity'),
            sanitation: generateCategoryHeatmap(complaints, 'sanitation'),
            garbage: generateCategoryHeatmap(complaints, 'garbage')
        },

        // Temporal patterns
        temporalMap: generateTemporalHeatmap(complaints)
    };
};

/**
 * Generate density heatmap
 */
const generateDensityHeatmap = (complaints) => {
    const heatmapData = complaints.map(c => ({
        lat: c.location.coordinates[1],
        lng: c.location.coordinates[0],
        intensity: 1
    }));

    return heatmapData;
};

/**
 * Generate risk heatmap
 */
const generateRiskHeatmap = (complaints) => {
    const riskWeights = { low: 1, medium: 2, high: 3, critical: 4 };

    return complaints.map(c => ({
        lat: c.location.coordinates[1],
        lng: c.location.coordinates[0],
        intensity: riskWeights[c.riskLevel] || 1
    }));
};

/**
 * Generate category-specific heatmap
 */
const generateCategoryHeatmap = (complaints, category) => {
    return complaints
        .filter(c => c.category === category)
        .map(c => ({
            lat: c.location.coordinates[1],
            lng: c.location.coordinates[0],
            intensity: 1
        }));
};

/**
 * Generate temporal heatmap (hour of day patterns)
 */
const generateTemporalHeatmap = (complaints) => {
    const hourCounts = new Array(24).fill(0);

    complaints.forEach(c => {
        const hour = new Date(c.createdAt).getHours();
        hourCounts[hour]++;
    });

    return hourCounts.map((count, hour) => ({
        hour,
        count,
        intensity: count
    }));
};

/**
 * Predictive analytics
 */
const generatePredictions = async (ulbCode, days = 90) => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const historicalData = await Complaint.find({
        ulbCode,
        createdAt: { $gte: startDate }
    });

    return {
        // SLA breach prediction
        slaBreachRisk: await predictSLABreaches(historicalData),

        // Infrastructure failure hotspots
        riskClusters: await identifyRiskClusters(historicalData),

        // Seasonal patterns
        seasonalTrends: analyzeSeasonalPatterns(historicalData),

        // Resource allocation suggestions
        resourceNeeds: predictResourceNeeds(historicalData)
    };
};

/**
 * Predict SLA breaches
 */
const predictSLABreaches = async (historicalData) => {
    const activeComplaints = historicalData.filter(c => c.status !== 'resolved');

    const highRisk = activeComplaints.filter(c => c.breachProbability > 0.7).length;
    const mediumRisk = activeComplaints.filter(c => c.breachProbability > 0.4 && c.breachProbability <= 0.7).length;

    return {
        highRisk,
        mediumRisk,
        totalAtRisk: highRisk + mediumRisk,
        recommendations: highRisk > 5 ? ['Increase staffing', 'Prioritize high-risk complaints'] : []
    };
};

/**
 * Identify risk clusters
 */
const identifyRiskClusters = async (historicalData) => {
    // Simple clustering by category and location
    const clusters = {};

    historicalData.forEach(c => {
        const key = `${c.category}_${Math.floor(c.location.coordinates[0] * 100)}_${Math.floor(c.location.coordinates[1] * 100)}`;

        if (!clusters[key]) {
            clusters[key] = {
                category: c.category,
                location: c.location.coordinates,
                count: 0,
                avgRisk: 0
            };
        }

        clusters[key].count++;
        const riskScore = { low: 1, medium: 2, high: 3, critical: 4 }[c.riskLevel] || 1;
        clusters[key].avgRisk = (clusters[key].avgRisk * (clusters[key].count - 1) + riskScore) / clusters[key].count;
    });

    return Object.values(clusters)
        .filter(c => c.count >= 3)
        .sort((a, b) => b.avgRisk - a.avgRisk)
        .slice(0, 10);
};

/**
 * Analyze seasonal patterns
 */
const analyzeSeasonalPatterns = (historicalData) => {
    const monthCounts = {};

    historicalData.forEach(c => {
        const month = new Date(c.createdAt).getMonth();
        monthCounts[month] = (monthCounts[month] || 0) + 1;
    });

    return monthCounts;
};

/**
 * Predict resource needs
 */
const predictResourceNeeds = (historicalData) => {
    const categoryCount = {};

    historicalData.forEach(c => {
        categoryCount[c.category] = (categoryCount[c.category] || 0) + 1;
    });

    const total = historicalData.length;
    const recommendations = [];

    Object.entries(categoryCount).forEach(([category, count]) => {
        const percentage = (count / total * 100).toFixed(1);
        if (percentage > 30) {
            recommendations.push({
                category,
                percentage,
                suggestion: `High volume in ${category} - consider dedicated team`
            });
        }
    });

    return recommendations;
};

/**
 * Get ULB name
 */
const getULBName = (ulbCode) => {
    const names = {
        'DL001': 'New Delhi Municipal Corporation',
        'DL002': 'South Delhi Municipal Corporation',
        'MH001': 'Mumbai Municipal Corporation',
        'KA001': 'Bangalore Municipal Corporation'
    };
    return names[ulbCode] || ulbCode;
};

module.exports = {
    calculateCityRankings,
    generateHeatmaps,
    generatePredictions,
    calculateMetrics
};
