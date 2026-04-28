const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({
    dest: 'uploads/',
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) return cb(null, true);
        cb(new Error('Only image files are allowed'));
    }
});

const emergencyController = require('../controllers/emergencyController');
const { validate, schemas } = require('../middleware/validate');
const { sosLimiter } = require('../middleware/rateLimiter');

// GET /api/emergencies — List emergencies (admin/operator view)
router.get('/', emergencyController.getEmergencyComplaints);

// POST /api/emergencies — SOS creation: 2/hour/device, DTO validated
router.post('/',
    sosLimiter,
    upload.single('image'),
    validate(schemas.createEmergency),
    emergencyController.createEmergencyComplaint
);

router.patch('/:id/status', emergencyController.updateEmergencyStatus);
router.post('/:id/verify',  emergencyController.verifyEmergencyOtp);

module.exports = router;
