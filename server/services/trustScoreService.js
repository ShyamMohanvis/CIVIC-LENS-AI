/**
 * Trust Score Service
 * Calculates trust score (0-100) for complaints based on multiple factors
 */

const calculateTrustScore = (complaint, userHistory = {}) => {
    let score = 50; // Base score

    // 1. AI Confidence (0-25 points)
    if (complaint.aiConfidence) {
        score += complaint.aiConfidence * 25;
    }

    // 2. Location Accuracy (0-15 points)
    if (complaint.locationAccuracy) {
        // Better accuracy (lower meters) = higher score
        const accuracyScore = Math.max(0, 15 - (complaint.locationAccuracy / 10));
        score += Math.min(15, accuracyScore);
    } else if (complaint.locationSource === 'gps') {
        score += 15; // Assume good accuracy for GPS
    } else if (complaint.locationSource === 'network') {
        score += 10;
    } else if (complaint.locationSource === 'manual') {
        score += 5;
    }

    // 3. User Credibility (0-20 points)
    if (userHistory.totalCount > 0) {
        const resolutionRate = userHistory.resolvedCount / userHistory.totalCount;
        score += resolutionRate * 20;
    } else {
        score += 10; // Neutral score for new users
    }

    // 4. Image Quality (0-10 points)
    // For now, assume good quality if image exists
    if (complaint.imageUrl && complaint.imageUrl.length > 100) {
        score += 10;
    } else if (complaint.imageUrl) {
        score += 5;
    }

    // 5. Duplicate Check (-30 points if duplicate)
    if (complaint.isDuplicate) {
        score -= 30;
    }

    // 6. Time of Day Context (0-10 points)
    const hour = new Date(complaint.createdAt || Date.now()).getHours();
    if (hour >= 6 && hour <= 22) {
        score += 10; // Daytime complaints are more verifiable
    } else {
        score += 5; // Night complaints still valid but harder to verify
    }

    // 7. Category Override Penalty (-5 points if user overrode AI)
    if (complaint.userOverrideCategory) {
        score -= 5; // Slight penalty as it might indicate AI uncertainty
    }

    // Ensure score is within bounds
    return Math.max(0, Math.min(100, Math.round(score)));
};

const getUserComplaintHistory = async (userId) => {
    // This would query the database for user's complaint history
    // For now, return mock data
    return {
        totalCount: 0,
        resolvedCount: 0,
        pendingCount: 0,
        avgResolutionTime: 0
    };
};

const updateTrustScore = async (complaint) => {
    const userHistory = await getUserComplaintHistory(complaint.userId);
    const trustScore = calculateTrustScore(complaint, userHistory);

    complaint.trustScore = trustScore;
    await complaint.save();

    return trustScore;
};

module.exports = {
    calculateTrustScore,
    getUserComplaintHistory,
    updateTrustScore
};
