const express = require('express');
const router = express.Router();
const eventsController = require('../controllers/eventsController');

// @route   POST /api/events/accident
// @desc    Report an accident from the AI Microservice
router.post('/accident', eventsController.reportAccident);

// @route   POST /api/events/civic-issue
// @desc    Report a civic issue (pothole, garbage, etc.)
router.post('/civic-issue', eventsController.reportCivicIssue);

// @route   GET /api/events
// @desc    Get all recent events for the dashboard map
router.get('/', eventsController.getAllEvents);

// @route   GET /api/events/dashboard-data
// @desc    Get the trends and AI summary for the Analytics Panel
router.get('/dashboard-data', eventsController.getDashboardData);

// @route   PATCH /api/events/:type/:id/action
// @desc    Update event status (resolve, assign unit, escalate)
router.patch('/:type/:id/action', eventsController.updateEventStatus);

// @route   GET /api/events/accidents
// @desc    List and filter all accidents (supports ?severity=high&status=pending&limit=50&days=7)
router.get('/accidents', eventsController.getAccidents);

module.exports = router;

