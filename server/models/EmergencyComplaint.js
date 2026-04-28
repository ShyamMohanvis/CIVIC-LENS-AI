const mongoose = require('mongoose');

const EmergencyComplaintSchema = new mongoose.Schema({
    // Core fields - imageUrl optional for voice-first SOS
    imageUrl: { type: String, default: '' },
    category: {
        type: String,
        enum: ['road', 'water', 'electricity', 'sanitation', 'garbage', 'other'],
        required: true
    },
    department: { type: String, required: true },
    location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], required: true }
    },
    status: {
        type: String,
        enum: ['pending', 'dispatched', 'on_site', 'resolved'],
        default: 'pending'
    },
    verificationCode: { type: String }, // OTP for resolution

    // Emergency-Specific Fields
    emergencyType: {
        type: String,
        enum: [
            'electrical_hazard',
            'flooding',
            'road_collapse',
            'fire',
            'gas_leak',
            'structural_damage',
            'water_contamination',
            'other_emergency'
        ],
        required: true
    },

    // Risk Assessment
    riskAssessment: {
        severity: {
            type: String,
            enum: ['low', 'medium', 'high', 'critical'],
            default: 'high'
        },
        publicSafetyImpact: { type: Number, min: 0, max: 100, default: 50 },
        estimatedAffectedPopulation: { type: Number, default: 0 },
        aiRiskScore: { type: Number, min: 0, max: 100, default: 50 },
        riskFactors: [{
            factor: String,
            severity: Number,
            description: String
        }]
    },

    // Emergency Response
    emergencyResponse: {
        dispatchedAt: { type: Date },
        respondingAgency: { type: String },
        respondingOfficer: { type: String },
        eta: { type: Number },
        onSiteAt: { type: Date },
        resolvedAt: { type: Date },
        responseTime: { type: Number },
        resolutionTime: { type: Number }
    },

    // Nearby Emergency Services
    nearbyServices: [{
        type: {
            type: String,
            enum: ['police', 'fire', 'hospital', 'disaster_management']
        },
        name: { type: String },
        distance: { type: Number },
        contactNumber: { type: String },
        address: { type: String },
        coordinates: [Number],
        notified: { type: Boolean, default: false },
        notifiedAt: { type: Date }
    }],

    // Public Safety Alert
    publicAlert: {
        issued: { type: Boolean, default: false },
        issuedAt: { type: Date },
        alertRadius: { type: Number },
        affectedCitizens: { type: Number },
        alertMessage: { type: String },
        alertLevel: {
            type: String,
            enum: ['advisory', 'warning', 'danger', 'critical']
        }
    },

    // SLA (Minute-level for emergencies)
    slaDuration: {
        type: Number,
        default: 15
    },
    slaDeadline: { type: Date },
    slaBreached: { type: Boolean, default: false },

    // Escalation
    escalationHistory: [{
        level: { type: Number },
        escalatedTo: { type: String },
        escalatedAt: { type: Date },
        reason: { type: String }
    }],

    // Media & Evidence
    additionalImages: [{ type: String }],
    videoUrl: { type: String },

    // Citizen Info
    reportedBy: {
        userId: { type: String },
        phone: { type: String },
        name: { type: String },
        isOnSite: { type: Boolean, default: true }
    }
}, {
    timestamps: true
});

// Indexes
EmergencyComplaintSchema.index({ createdAt: -1 });
EmergencyComplaintSchema.index({ 'riskAssessment.severity': 1, status: 1 });
EmergencyComplaintSchema.index({ emergencyType: 1 });

// Method to check SLA breach
EmergencyComplaintSchema.methods.checkSLABreach = function () {
    if (this.status === 'resolved') return false;
    if (!this.slaDeadline) return false;
    const breached = new Date() > this.slaDeadline;
    if (breached && !this.slaBreached) {
        this.slaBreached = true;
    }
    return breached;
};

// Method to calculate response time
EmergencyComplaintSchema.methods.calculateResponseTime = function () {
    if (this.emergencyResponse && this.emergencyResponse.onSiteAt) {
        const responseTime = (this.emergencyResponse.onSiteAt - this.createdAt) / (1000 * 60);
        this.emergencyResponse.responseTime = Math.round(responseTime);
        return responseTime;
    }
    return null;
};

module.exports = mongoose.model('EmergencyComplaint', EmergencyComplaintSchema);
