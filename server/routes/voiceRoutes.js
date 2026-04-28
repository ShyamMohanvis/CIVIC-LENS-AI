const express = require('express');
const router = express.Router();
const { analyzeVoiceIncident, createVoiceComplaint } = require('../controllers/voiceController');
const { validate, schemas } = require('../middleware/validate');

// Analyze voice transcript
router.post('/analyze', validate(schemas.voiceAnalysis), analyzeVoiceIncident);

// Create complaint from voice (rate-limited via general limiter in index.js)
router.post('/', validate(schemas.voiceComplaint), createVoiceComplaint);

module.exports = router;
