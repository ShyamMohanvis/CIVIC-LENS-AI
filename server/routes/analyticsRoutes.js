const express = require('express');
const router = express.Router();
const { calculateCityRankings, generateHeatmaps, generatePredictions } = require('../services/analyticsService');
const { generateHotspots } = require('../services/hotspotService');
const { getRecentAlerts } = require('../services/smsService');
const { sendErrorResponse } = require('../utils/errorHandler');
const { DEFAULT_TIME_RANGE_DAYS, DEFAULT_PREDICTION_DAYS } = require('../utils/constants');


// Get city rankings
router.get('/rankings', async (req, res) => {
    try {
        const rankings = await calculateCityRankings();
        res.json({ success: true, data: rankings });
    } catch (error) {
        console.error('❌ Error fetching rankings:', error);
        sendErrorResponse(error, res);
    }
});

// Get heatmap data
router.get('/heatmaps/:ulbCode', async (req, res) => {
    try {
        const { ulbCode } = req.params;
        const { timeRange } = req.query;

        if (!ulbCode) {
            return res.status(400).json({
                success: false,
                error: 'ULB code is required'
            });
        }

        const timeRangeDays = parseInt(timeRange) || DEFAULT_TIME_RANGE_DAYS;
        const heatmaps = await generateHeatmaps(ulbCode, timeRangeDays);
        res.json({ success: true, data: heatmaps });
    } catch (error) {
        console.error('❌ Error generating heatmaps:', error);
        sendErrorResponse(error, res);
    }
});

// Get predictions
router.get('/predictions/:ulbCode', async (req, res) => {
    try {
        const { ulbCode } = req.params;
        const { days } = req.query;

        if (!ulbCode) {
            return res.status(400).json({
                success: false,
                error: 'ULB code is required'
            });
        }

        const predictionDays = parseInt(days) || DEFAULT_PREDICTION_DAYS;
        const predictions = await generatePredictions(ulbCode, predictionDays);
        res.json({ success: true, data: predictions });
    } catch (error) {
        console.error('❌ Error generating predictions:', error);
        sendErrorResponse(error, res);
    }
});

// Get predictive accident hotspots
// Optional query params: ?days=90&gridResolution=0.01
router.get('/hotspots', async (req, res) => {
    try {
        const { days, gridResolution } = req.query;
        const hotspots = await generateHotspots({
            maxDays: parseInt(days) || 90,
            gridResolution: parseFloat(gridResolution) || 0.01
        });
        res.json({ success: true, count: hotspots.length, data: hotspots });
    } catch (error) {
        console.error('❌ Error generating hotspots:', error);
        sendErrorResponse(error, res);
    }
});

// Get recent SMS alert delivery log
router.get('/alerts', async (req, res) => {
    try {
        const { limit } = req.query;
        const alerts = await getRecentAlerts(parseInt(limit) || 20);
        res.json({ success: true, data: alerts });
    } catch (error) {
        console.error('❌ Error fetching alerts:', error);
        sendErrorResponse(error, res);
    }
});

module.exports = router;

