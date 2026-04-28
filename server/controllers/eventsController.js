const Accident = require('../models/Accident');
const CivicIssue = require('../models/CivicIssue');
const Alert = require('../models/Alert');
const smsService = require('../services/smsService');
const trendService = require('../services/trendService');
const summaryService = require('../services/summaryService');

exports.reportAccident = async (req, res) => {
    try {
        const { type, severity, confidence, latitude, longitude } = req.body;

        if (type !== 'accident') {
            return res.status(400).json({ success: false, message: 'Invalid event type' });
        }

        const newAccident = new Accident({
            severity,
            confidence,
            location: { latitude, longitude }
        });

        await newAccident.save();

        // Broadcast to WebSocket clients
        if (global.io) {
            global.io.emit('new_event', { type: 'accident', data: newAccident });
        }

        // Trigger SMS Alert if severity is high
        if (severity === 'high') {
            smsService.sendEmergencyAlert(newAccident).catch(err => {
                console.error("Non-blocking error triggering SMS:", err);
            });
        }

        res.status(201).json({ success: true, data: newAccident });
    } catch (error) {
        console.error('Error reporting accident:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.reportCivicIssue = async (req, res) => {
    try {
        const { category, imageUrl, latitude, longitude, severity } = req.body;

        const newIssue = new CivicIssue({
            category,
            imageUrl,
            location: { latitude, longitude },
            severity: severity || 'medium'
        });

        await newIssue.save();

        // Broadcast to WebSocket clients
        if (global.io) {
            global.io.emit('new_event', { type: 'civic_issue', data: newIssue });
        }

        res.status(201).json({ success: true, data: newIssue });
    } catch (error) {
        console.error('Error reporting civic issue:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getAllEvents = async (req, res) => {
    try {
        // Fetch recent accidents and civic issues (last 24 hours)
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const accidents = await Accident.find({ timestamp: { $gte: oneDayAgo } })
            .sort({ timestamp: -1 });

        const issues = await CivicIssue.find({ createdAt: { $gte: oneDayAgo } })
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: {
                accidents,
                civicIssues: issues
            }
        });
    } catch (error) {
        console.error('Error fetching events:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getDashboardData = async (req, res) => {
    try {
        const trends = await trendService.calculateTrends();
        const summary = await summaryService.generateDailySummary();

        res.status(200).json({
            success: true,
            data: {
                trends,
                aiSummary: summary
            }
        });
    } catch (error) {
        console.error('Error serving dashboard data:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// PATCH /api/events/:type/:id/action
exports.updateEventStatus = async (req, res) => {
    try {
        const { type, id } = req.params;
        const { action, assignedUnit } = req.body;

        let updated = null;
        if (type === 'accident') {
            updated = await Accident.findByIdAndUpdate(id, {
                status: action === 'resolve' ? 'resolved' : 'in_progress',
                assignedUnit: assignedUnit || null
            }, { new: true });
        } else if (type === 'civic-issue') {
            updated = await CivicIssue.findByIdAndUpdate(id, {
                status: action === 'resolve' ? 'resolved' : 'reported',
                assignedUnit: assignedUnit || null
            }, { new: true });
        }

        if (!updated) return res.status(404).json({ success: false, message: 'Event not found' });

        // Broadcast the status update
        if (global.io) {
            global.io.emit('event_updated', { type, id, action, assignedUnit });
        }

        res.status(200).json({ success: true, data: updated });
    } catch (error) {
        console.error('Error updating event status:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// GET /api/events/accidents – list/filter accidents
exports.getAccidents = async (req, res) => {
    try {
        const { severity, status, limit = 50, skip = 0, days = 7 } = req.query;

        const query = {};
        if (severity) query.severity = severity;
        if (status) query.status = status;

        const since = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);
        query.timestamp = { $gte: since };

        const accidents = await Accident.find(query)
            .sort({ timestamp: -1 })
            .limit(parseInt(limit))
            .skip(parseInt(skip))
            .lean();

        const total = await Accident.countDocuments(query);

        res.status(200).json({
            success: true,
            total,
            data: accidents
        });
    } catch (error) {
        console.error('Error fetching accidents:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

