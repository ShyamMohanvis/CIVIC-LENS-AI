/**
 * detectronService.js
 * ────────────────────────────────────────────────────────────────────────────
 * Calls the Detectron2 AI service (port 8001) with a citizen-uploaded image.
 * Returns a civic classification result for the complaint controller.
 *
 * FLOW: complaintController → detectronService → ai_detectron (Python) → result
 *
 * Fails gracefully — if the service is unavailable, returns null so the
 * complaint creation continues without AI enhancement.
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const DETECTRON_URL = process.env.DETECTRON_URL || 'http://localhost:8001';

/**
 * Analyse an image file using the Detectron2 service.
 *
 * @param {string}  filePath   - Absolute path to temp image file (multer disk storage)
 * @param {string}  mimeType   - MIME type of the image (e.g. 'image/jpeg')
 * @param {string}  filename   - Original filename
 * @returns {Object|null}      - Detectron result or null on timeout/error
 */
async function analyseImage(filePath, mimeType, filename) {
    if (!filePath || !fs.existsSync(filePath)) {
        console.warn('⚠️  detectronService: file not found, skipping AI analysis');
        return null;
    }

    const form = new FormData();
    form.append('file', fs.createReadStream(filePath), {
        filename,
        contentType: mimeType
    });

    try {
        const response = await axios.post(`${DETECTRON_URL}/detect`, form, {
            headers: form.getHeaders(),
            timeout: 8000  // 8 second timeout — don't block complaint creation
        });

        const { civic, suggested_category, suggested_department, inference_mode, detection_count } = response.data;

        console.log(`🤖 Detectron2 [${inference_mode}]: ${civic.label} (${(civic.confidence * 100).toFixed(0)}% confidence) | ${detection_count} objects detected`);

        return {
            aiLabel:           civic.label,
            aiDisplay:         civic.display,
            aiConfidence:      civic.confidence,
            aiDepartment:      civic.department,
            aiSeverity:        civic.severity,
            suggestedCategory: suggested_category,
            inferenceMode:     inference_mode,
            detectionCount:    detection_count
        };

    } catch (err) {
        if (err.code === 'ECONNREFUSED') {
            console.warn('⚠️  detectronService: service offline (port 8001). Skipping AI analysis.');
        } else if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
            console.warn('⚠️  detectronService: request timed out (>8s). Skipping AI analysis.');
        } else {
            console.error('❌ detectronService error:', err.message);
        }
        return null;  // Graceful fallback — complaint creation continues
    }
}

/**
 * Ping the Detectron2 service to check health.
 * @returns {{ online: boolean, model: string }}
 */
async function checkHealth() {
    try {
        const res = await axios.get(`${DETECTRON_URL}/`, { timeout: 2000 });
        return {
            online: res.data.status === 'ok',
            model: res.data.model || 'unknown',
            detectron2Loaded: res.data.detectron2_loaded || false
        };
    } catch {
        return { online: false, model: 'unavailable', detectron2Loaded: false };
    }
}

module.exports = { analyseImage, checkHealth };
