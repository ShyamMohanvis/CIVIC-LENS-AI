/**
 * Audit Logging Service
 * Provides immutable audit trail for all complaint actions
 */

const logAction = async (complaint, action, actor, actorRole, metadata = {}, ipAddress = null) => {
    const auditEntry = {
        action,
        actor,
        actorRole,
        timestamp: new Date(),
        metadata,
        ipAddress
    };

    complaint.auditLog.push(auditEntry);
    await complaint.save();

    return auditEntry;
};

const getAuditTrail = (complaint) => {
    return complaint.auditLog.sort((a, b) => b.timestamp - a.timestamp);
};

const getAuditSummary = (complaint) => {
    const trail = complaint.auditLog;

    return {
        totalActions: trail.length,
        createdAt: trail.find(log => log.action === 'created')?.timestamp,
        lastUpdated: trail[trail.length - 1]?.timestamp,
        escalations: trail.filter(log => log.action === 'escalated').length,
        updates: trail.filter(log => log.action === 'updated').length,
        actors: [...new Set(trail.map(log => log.actor))],
        timeline: trail.map(log => ({
            action: log.action,
            actor: log.actor,
            timestamp: log.timestamp
        }))
    };
};

const verifyAuditIntegrity = (complaint) => {
    const trail = complaint.auditLog;

    // Check for required creation log
    const hasCreation = trail.some(log => log.action === 'created');

    // Check chronological order
    const isChronological = trail.every((log, index) => {
        if (index === 0) return true;
        return new Date(log.timestamp) >= new Date(trail[index - 1].timestamp);
    });

    // Check for suspicious patterns
    const suspiciousPatterns = detectSuspiciousPatterns(trail);

    return {
        isValid: hasCreation && isChronological,
        hasCreation,
        isChronological,
        suspiciousPatterns,
        totalEntries: trail.length
    };
};

const detectSuspiciousPatterns = (trail) => {
    const patterns = [];

    // Check for rapid status changes (resolved then reopened multiple times)
    const statusChanges = trail.filter(log =>
        log.action === 'resolved' || log.action === 'reopened'
    );

    if (statusChanges.length > 3) {
        patterns.push({
            type: 'multiple_status_changes',
            count: statusChanges.length,
            severity: 'medium'
        });
    }

    // Check for same actor making many changes in short time
    const recentLogs = trail.filter(log =>
        new Date() - new Date(log.timestamp) < 60 * 60 * 1000 // Last hour
    );

    const actorCounts = {};
    recentLogs.forEach(log => {
        actorCounts[log.actor] = (actorCounts[log.actor] || 0) + 1;
    });

    Object.entries(actorCounts).forEach(([actor, count]) => {
        if (count > 10) {
            patterns.push({
                type: 'rapid_changes_by_actor',
                actor,
                count,
                severity: 'high'
            });
        }
    });

    return patterns;
};

const exportAuditReport = (complaint) => {
    const trail = getAuditTrail(complaint);
    const summary = getAuditSummary(complaint);
    const integrity = verifyAuditIntegrity(complaint);

    return {
        complaintId: complaint._id,
        category: complaint.category,
        status: complaint.status,
        summary,
        integrity,
        fullTrail: trail.map(log => ({
            timestamp: log.timestamp.toISOString(),
            action: log.action,
            actor: log.actor,
            actorRole: log.actorRole,
            metadata: log.metadata,
            ipAddress: log.ipAddress
        }))
    };
};

const searchAuditLogs = async (Complaint, filters = {}) => {
    const query = {};

    if (filters.action) {
        query['auditLog.action'] = filters.action;
    }

    if (filters.actor) {
        query['auditLog.actor'] = filters.actor;
    }

    if (filters.startDate || filters.endDate) {
        query['auditLog.timestamp'] = {};
        if (filters.startDate) {
            query['auditLog.timestamp'].$gte = new Date(filters.startDate);
        }
        if (filters.endDate) {
            query['auditLog.timestamp'].$lte = new Date(filters.endDate);
        }
    }

    const complaints = await Complaint.find(query);

    return complaints.map(complaint => ({
        complaintId: complaint._id,
        category: complaint.category,
        status: complaint.status,
        relevantLogs: complaint.auditLog.filter(log => {
            let matches = true;
            if (filters.action && log.action !== filters.action) matches = false;
            if (filters.actor && log.actor !== filters.actor) matches = false;
            if (filters.startDate && new Date(log.timestamp) < new Date(filters.startDate)) matches = false;
            if (filters.endDate && new Date(log.timestamp) > new Date(filters.endDate)) matches = false;
            return matches;
        })
    })).filter(item => item.relevantLogs.length > 0);
};

module.exports = {
    logAction,
    getAuditTrail,
    getAuditSummary,
    verifyAuditIntegrity,
    detectSuspiciousPatterns,
    exportAuditReport,
    searchAuditLogs
};
