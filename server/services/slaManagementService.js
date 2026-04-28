/**
 * SLA Management Service
 * Handles SLA calculation, tracking, and breach prediction
 */

const setSLA = (complaint, customDuration = null) => {
    // SLA duration in hours based on risk level
    const slaDurations = {
        'critical': 4,   // 4 hours
        'high': 12,      // 12 hours
        'medium': 24,    // 24 hours
        'low': 48        // 48 hours
    };

    const duration = customDuration || slaDurations[complaint.riskLevel] || 24;

    complaint.slaDuration = duration;
    complaint.slaDeadline = new Date(Date.now() + duration * 60 * 60 * 1000);

    return complaint;
};

const calculateBreachProbability = (complaint) => {
    if (complaint.status === 'resolved') return 0;
    if (!complaint.slaDeadline) return 0;

    const now = new Date();
    const deadline = new Date(complaint.slaDeadline);
    const created = new Date(complaint.createdAt);

    // Already breached
    if (now > deadline) return 1.0;

    const totalTime = deadline - created;
    const elapsedTime = now - created;
    const remainingTime = deadline - now;

    // Calculate progress percentage
    const progress = elapsedTime / totalTime;

    // Base probability on progress
    let probability = progress;

    // Adjust based on status
    if (complaint.status === 'pending') {
        probability += 0.2; // Higher risk if still pending
    } else if (complaint.status === 'in_progress') {
        probability += 0.1; // Moderate risk if in progress
    }

    // Adjust based on remaining time
    const hoursRemaining = remainingTime / (1000 * 60 * 60);
    if (hoursRemaining < 2) {
        probability += 0.3; // Critical - less than 2 hours
    } else if (hoursRemaining < 6) {
        probability += 0.15; // Warning - less than 6 hours
    }

    // Adjust based on complexity (category)
    const complexCategories = ['electricity', 'water', 'road'];
    if (complexCategories.includes(complaint.category)) {
        probability += 0.1;
    }

    return Math.max(0, Math.min(1, probability));
};

const getSLAStatus = (complaint) => {
    if (!complaint.slaDeadline) return 'no_sla';
    if (complaint.status === 'resolved') return 'met';

    const now = new Date();
    const deadline = new Date(complaint.slaDeadline);

    if (now > deadline) return 'breached';

    const hoursRemaining = (deadline - now) / (1000 * 60 * 60);

    if (hoursRemaining < 2) return 'critical';
    if (hoursRemaining < 6) return 'warning';
    return 'on_track';
};

const updateSLAMetrics = async (complaint) => {
    complaint.breachProbability = calculateBreachProbability(complaint);

    // Auto-escalate if high breach probability
    if (complaint.breachProbability > 0.8 && complaint.escalationLevel < 2) {
        await escalateComplaint(complaint);
    }

    await complaint.save();
    return complaint;
};

const escalateComplaint = async (complaint) => {
    complaint.escalationLevel += 1;

    const escalationMessage = `Auto-escalated to level ${complaint.escalationLevel} due to SLA breach risk`;

    complaint.updates.push({
        message: escalationMessage,
        timestamp: new Date(),
        actor: 'system',
        actorRole: 'system'
    });

    await complaint.addAuditLog('escalated', 'system', 'system', {
        level: complaint.escalationLevel,
        reason: 'SLA breach probability > 80%',
        breachProbability: complaint.breachProbability
    });

    // In production, would send notifications to higher authorities
    console.log(`🚨 Complaint ${complaint._id} escalated to level ${complaint.escalationLevel}`);

    return complaint;
};

const checkSLABreaches = async (Complaint) => {
    // Find all complaints with breached SLAs
    const breachedComplaints = await Complaint.find({
        status: { $ne: 'resolved' },
        slaDeadline: { $lt: new Date() }
    });

    for (const complaint of breachedComplaints) {
        if (complaint.escalationLevel < 3) {
            await escalateComplaint(complaint);
        }
    }

    return breachedComplaints;
};

const getSLAStatistics = async (Complaint, ulbCode = null) => {
    const query = ulbCode ? { ulbCode } : {};

    const [total, met, breached, onTrack] = await Promise.all([
        Complaint.countDocuments(query),
        Complaint.countDocuments({ ...query, status: 'resolved' }),
        Complaint.countDocuments({
            ...query,
            status: { $ne: 'resolved' },
            slaDeadline: { $lt: new Date() }
        }),
        Complaint.countDocuments({
            ...query,
            status: { $ne: 'resolved' },
            slaDeadline: { $gte: new Date() }
        })
    ]);

    return {
        total,
        met,
        breached,
        onTrack,
        adherenceRate: total > 0 ? (met / total * 100).toFixed(2) : 0,
        breachRate: total > 0 ? (breached / total * 100).toFixed(2) : 0
    };
};

module.exports = {
    setSLA,
    calculateBreachProbability,
    getSLAStatus,
    updateSLAMetrics,
    escalateComplaint,
    checkSLABreaches,
    getSLAStatistics
};
