const Joi = require('joi');

/**
 * Middleware factory — validates req.body against a Joi schema.
 * Unknown fields are stripped (allowUnknown:false = strict DTO).
 */
const validate = (schema) => (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
        abortEarly: false,
        allowUnknown: false,   // reject extra/server-only fields — VULN-006
        stripUnknown: true     // silently strip unexpected keys
    });

    if (error) {
        const messages = error.details.map((d) => d.message).join(', ');
        return res.status(400).json({
            success: false,
            error: 'Validation Error',
            details: messages
        });
    }

    req.body = value; // use validated & stripped body
    next();
};

// ─────────────────────────────────────────────────────
// Schemas
// ─────────────────────────────────────────────────────

/**
 * Citizen self-registration — FR-01
 */
const registerSchema = Joi.object({
    name:       Joi.string().trim().min(2).max(100).required(),
    email:      Joi.string().email().lowercase().trim().optional(),
    phone:      Joi.string().pattern(/^\+?[0-9]{10,15}$/).optional(),
    password:   Joi.string().min(8).required(),
    employeeId: Joi.string().alphanum().uppercase().optional() // auto-generated if missing
}).or('email', 'phone'); // at least one contact required

/**
 * Staff login — employee ID + password
 */
const loginSchema = Joi.object({
    employeeId: Joi.string().alphanum().uppercase().trim().required(),
    password:   Joi.string().required()
});

/**
 * Complaint creation — STRICT allowlist per FR-16-B / VULN-006
 * Only these 5 citizen-writable fields accepted:
 *   category_override, description, lat, lng, idempotency_key
 */
const createComplaintSchema = Joi.object({
    lat:              Joi.number().min(-90).max(90).required(),
    lng:              Joi.number().min(-180).max(180).required(),
    categoryOverride: Joi.string().valid(
        'road', 'water', 'electricity', 'sanitation', 'garbage',
        'pothole', 'road_damage', 'road_obstruction', 'garbage_dumping',
        'encroachment', 'infrastructure', 'other'
    ).optional(),
    description:      Joi.string().trim().max(1000).optional()
    // idempotency_key comes from header — not body
});

/**
 * Complaint status update
 */
const updateStatusSchema = Joi.object({
    status:          Joi.string().valid('pending', 'in_progress', 'resolved').required(),
    resolutionImage: Joi.string().uri().optional(),
    evidenceMetadata: Joi.object({
        lat: Joi.number().min(-90).max(90).optional(),
        lng: Joi.number().min(-180).max(180).optional(),
        timestamp: Joi.date().iso().optional()
    }).optional(),
    actor:           Joi.string().trim().optional(),
    actorRole:       Joi.string().valid('citizen', 'engineer', 'admin', 'system').optional()
});

/**
 * Emergency / SOS creation
 */
const createEmergencySchema = Joi.object({
    lat:           Joi.number().min(-90).max(90).required(),
    lng:           Joi.number().min(-180).max(180).required(),
    emergencyType: Joi.string().valid(
        'electrical_hazard', 'flooding', 'road_collapse',
        'water_contamination', 'fire', 'gas_leak', 'structural_damage', 'other_emergency'
    ).required(),
    reportedBy: Joi.object({
        userId: Joi.string().optional(),
        phone:  Joi.string().optional(),
        name:   Joi.string().optional()
    }).optional()
});

/**
 * Voice analysis
 */
const voiceAnalysisSchema = Joi.object({
    transcript: Joi.string().trim().min(5).max(2000).required(),
    location:   Joi.object({ lat: Joi.number(), lng: Joi.number() }).optional()
});

/**
 * Voice complaint creation
 */
const voiceComplaintSchema = Joi.object({
    transcript: Joi.string().trim().min(5).max(2000).required(),
    analysis:   Joi.object().required(),
    lat:        Joi.number().min(-90).max(90).required(),
    lng:        Joi.number().min(-180).max(180).required(),
    userId:     Joi.string().optional()
});

/**
 * Staff user creation (admin only)
 */
const createStaffSchema = Joi.object({
    employeeId:  Joi.string().alphanum().uppercase().trim().required(),
    name:        Joi.string().trim().min(2).max(100).required(),
    email:       Joi.string().email().lowercase().trim().optional(),
    role:        Joi.string().valid('MUNICIPAL_OPERATOR', 'MUNICIPAL_ADMIN', 'STATE_ADMIN').required(),
    password:    Joi.string().min(8).required(),
    jurisdiction: Joi.object({
        state:    Joi.string().optional(),
        city:     Joi.string().optional(),
        ulbCode:  Joi.string().optional(),
        ward:     Joi.string().optional(),
        department: Joi.string().optional()
    }).optional()
});

module.exports = {
    validate,
    schemas: {
        register:        registerSchema,
        login:           loginSchema,
        createComplaint: createComplaintSchema,
        updateStatus:    updateStatusSchema,
        createEmergency: createEmergencySchema,
        voiceAnalysis:   voiceAnalysisSchema,
        voiceComplaint:  voiceComplaintSchema,
        createStaff:     createStaffSchema
    }
};
