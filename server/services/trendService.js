const Accident = require('../models/Accident');
const CivicIssue = require('../models/CivicIssue');

/**
 * Calculates the Urban Risk Score and generates trend metrics 
 * based on the last 24 hours of data compared to the previous 7 days.
 */
exports.calculateTrends = async () => {
    try {
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        // 1. Get counts for last 24 hours
        const dailyAccidentsCount = await Accident.countDocuments({ timestamp: { $gte: oneDayAgo } });
        const dailyIssuesCount = await CivicIssue.countDocuments({ createdAt: { $gte: oneDayAgo } });

        // 2. Get counts for previous 7 days (to calculate average)
        const weeklyAccidentsCount = await Accident.countDocuments({ timestamp: { $gte: sevenDaysAgo, $lt: oneDayAgo } });
        const weeklyIssuesCount = await CivicIssue.countDocuments({ createdAt: { $gte: sevenDaysAgo, $lt: oneDayAgo } });

        // Averages over the previous 7 days
        const avgDailyAccidents = weeklyAccidentsCount / 7 || 1; // prevent div by zero
        const avgDailyIssues = weeklyIssuesCount / 7 || 1;

        // 3. Calculate Trend Percentages
        const accidentTrendPct = ((dailyAccidentsCount - avgDailyAccidents) / avgDailyAccidents) * 100;
        const issueTrendPct = ((dailyIssuesCount - avgDailyIssues) / avgDailyIssues) * 100;

        // 4. Calculate Urban Risk Score
        // Formula: (Accidents × 0.4) + (Infrastructure Complaints × 0.3) + Baseline
        // For demonstration, we'll scale it to 0-100 based on some assumed maximums.
        // Let's say 20 accidents/day and 50 issues/day is "maximum" risk.
        const accidentRisk = Math.min((dailyAccidentsCount / 20) * 100, 100) * 0.4;
        const issueRisk = Math.min((dailyIssuesCount / 50) * 100, 100) * 0.3;

        let riskScore = Math.round(accidentRisk + issueRisk);
        if (riskScore > 100) riskScore = 100;

        let riskLevel = 'Low';
        if (riskScore > 30 && riskScore <= 60) riskLevel = 'Medium';
        if (riskScore > 60) riskLevel = 'High';

        return {
            dailyAccidents: dailyAccidentsCount,
            dailyIssues: dailyIssuesCount,
            accidentTrend: Math.round(accidentTrendPct),
            issueTrend: Math.round(issueTrendPct),
            riskScore,
            riskLevel,
            generatedAt: now
        };

    } catch (error) {
        console.error('Error calculating trends:', error);
        return null;
    }
};
