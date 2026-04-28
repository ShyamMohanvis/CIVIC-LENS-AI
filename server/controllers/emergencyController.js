const EmergencyComplaint = require('../models/EmergencyComplaint');
const { assessEmergencyRisk } = require('../services/riskAssessmentService');
const { logAction } = require('../services/auditLoggingService');
const fs = require('fs');

/**
 * Create Emergency Complaint
 */
const createEmergencyComplaint = async (req, res) => {
    try {
        const { lat, lng, emergencyType, reportedBy } = req.body;
        let imageUrl = '';

        // Handle Image Upload
        if (req.file) {
            const imageBuffer = fs.readFileSync(req.file.path);
            const base64Image = imageBuffer.toString('base64');
            const mimeType = req.file.mimetype;
            imageUrl = `data:${mimeType};base64,${base64Image}`;
            fs.unlinkSync(req.file.path);
        }

        // Map emergency type to category
        const categoryMap = {
            electrical_hazard: 'electricity',
            flooding: 'water',
            road_collapse: 'road',
            water_contamination: 'water',
            fire: 'other',
            gas_leak: 'other',
            structural_damage: 'road',
            other_emergency: 'other'
        };

        const category = categoryMap[emergencyType] || 'other';

        // Assess emergency risk
        const riskAssessment = await assessEmergencyRisk({
            imageUrl,
            location: { lat, lng },
            emergencyType,
            createdAt: new Date()
        });

        // Find nearby emergency services
        const nearbyServices = await findNearbyEmergencyServices({ lat, lng });

        // Create emergency complaint
        const emergency = new EmergencyComplaint({
            imageUrl,
            category,
            emergencyType,
            department: getDepartmentForEmergency(emergencyType),
            location: {
                type: 'Point',
                coordinates: [parseFloat(lng), parseFloat(lat)]
            },
            riskAssessment,
            nearbyServices,
            reportedBy: {
                userId: reportedBy?.userId || 'anonymous',
                phone: reportedBy?.phone,
                name: reportedBy?.name,
                isOnSite: true
            },
            slaDuration: riskAssessment.recommendedSLA || 15,
            slaDeadline: new Date(Date.now() + (riskAssessment.recommendedSLA || 15) * 60 * 1000)
        });

        await emergency.save();

        // 🚨 REAL-TIME SOS ALERT - Emit to all connected admins
        if (global.io) {
            const alertPayload = {
                complaintId: emergency._id,
                category: emergency.category,
                emergencyType: emergency.emergencyType,
                riskLevel: riskAssessment.severity,
                location: {
                    lat,
                    lng,
                    coordinates: emergency.location.coordinates
                },
                timestamp: emergency.createdAt,
                slaDeadline: emergency.slaDeadline,
                slaDuration: emergency.slaDuration,
                nearbyServices: nearbyServices.length
            };

            // Emit to main emergency alerts room
            global.io.to('emergency_alerts').emit('NEW_SOS_ALERT', alertPayload);

            // Emit to dedicated emergency namespace
            if (global.emergencyNamespace) {
                global.emergencyNamespace.emit('NEW_SOS', alertPayload);
            }

            console.log(`🚨 REAL-TIME ALERT SENT: ${emergency._id} | Severity: ${riskAssessment.severity}`);
        }

        // Auto-notify emergency services if critical
        if (riskAssessment.severity === 'critical') {
            await notifyEmergencyServices(emergency, nearbyServices);
        }

        console.log(`🚨 Emergency created: ${emergency._id} | Severity: ${riskAssessment.severity}`);

        res.status(201).json({
            success: true,
            data: emergency,
            riskAssessment,
            nearbyServices,
            sla: {
                deadline: emergency.slaDeadline,
                duration: emergency.slaDuration
            }
        });

    } catch (error) {
        console.error('Error creating emergency:', error);
        res.status(500).json({ success: false, error: 'Server Error', details: error.message });
    }
};

const getEmergencyComplaints = async (req, res) => {
    try {
        const { status, severity } = req.query;

        const query = {};
        if (status) query.status = status;
        if (severity) query['riskAssessment.severity'] = severity;

        const emergencies = await EmergencyComplaint.find(query).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: emergencies.length,
            data: emergencies
        });
    } catch (error) {
        console.error('Error fetching emergencies:', error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

const updateEmergencyStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, respondingAgency, respondingOfficer, verificationCode } = req.body;

        const emergency = await EmergencyComplaint.findById(id);
        if (!emergency) {
            return res.status(404).json({ success: false, error: 'Emergency not found' });
        }

        const oldStatus = emergency.status;

        // Only update status if explicitly provided
        if (status) {
            emergency.status = status;
        }

        if (status === 'dispatched' && !emergency.emergencyResponse.dispatchedAt) {
            emergency.emergencyResponse.dispatchedAt = new Date();
            emergency.emergencyResponse.respondingAgency = respondingAgency;
            emergency.emergencyResponse.respondingOfficer = respondingOfficer;
        }

        if (status === 'on_site' && !emergency.emergencyResponse.onSiteAt) {
            emergency.emergencyResponse.onSiteAt = new Date();
            emergency.calculateResponseTime();
        }

        // Save OTP if provided (usually on Acknowledge)
        if (verificationCode) {
            emergency.verificationCode = verificationCode;
            console.log(`🔑 OTP saved for emergency ${id}: ${verificationCode}`);
        }

        if (status === 'resolved') {
            emergency.emergencyResponse.resolvedAt = new Date();
            const resolutionTime = (emergency.emergencyResponse.resolvedAt - emergency.createdAt) / (1000 * 60);
            emergency.emergencyResponse.resolutionTime = Math.round(resolutionTime);
        }

        if (status) {
            emergency.checkSLABreach();
        }

        await emergency.save();

        if (status) {
            console.log(`🚨 Emergency status updated: ${id} -> ${status}`);

            // 📡 BROADCAST STATUS UPDATE to all connected clients (for Track page live updates)
            if (global.io) {
                global.io.to('emergency_alerts').emit('EMERGENCY_STATUS_UPDATE', {
                    emergencyId: id,
                    status: status,
                    oldStatus: oldStatus,
                    updatedAt: new Date()
                });
                console.log(`📡 Status update broadcasted: ${id} -> ${status}`);
            }
        }

        res.status(200).json({ success: true, data: emergency });
    } catch (error) {
        console.error('Error updating emergency:', error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

const verifyEmergencyOtp = async (req, res) => {
    try {
        const { id } = req.params;
        const { otp } = req.body;

        const emergency = await EmergencyComplaint.findById(id);
        if (!emergency) {
            return res.status(404).json({ success: false, error: 'Emergency not found' });
        }

        console.log(`🔍 Verifying OTP for ${id}. Expected: '${emergency.verificationCode}', Received: '${otp}'`);

        // Loose equality check to handle string/number differences
        if (String(emergency.verificationCode) !== String(otp)) {
            return res.status(400).json({ success: false, error: 'Invalid OTP' });
        }

        // OTP Verified - Resolve Issue
        emergency.status = 'resolved';
        emergency.emergencyResponse.resolvedAt = new Date();
        const resolutionTime = (emergency.emergencyResponse.resolvedAt - emergency.createdAt) / (1000 * 60);
        emergency.emergencyResponse.resolutionTime = Math.round(resolutionTime);
        // Clear code after use to prevent reuse (optional, but good practice)
        // emergency.verificationCode = null; 

        await emergency.save();

        console.log(`✅ Emergency RESOLVED via OTP: ${id}`);

        if (global.io) {
            global.io.to('emergency_alerts').emit('EMERGENCY_RESOLVED', {
                emergencyId: id,
                resolvedAt: new Date()
            });
        }

        res.status(200).json({ success: true, message: 'Emergency verified and resolved' });

    } catch (error) {
        console.error('Error verifying OTP:', error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

async function findNearbyEmergencyServices(location) {
    // Generate pseudo-random coordinates within 1-5km of the emergency to simulate real proximity filtering
    const getRandomOffset = (maxMeters) => {
        const offset = (Math.random() * maxMeters) / 111320; // roughly 1 degree = 111.32km
        return Math.random() > 0.5 ? offset : -offset;
    };

    const services = [
        {
            type: 'police',
            name: 'Local Police Station',
            distance: Math.floor(Math.random() * 3000) + 500, // 500m to 3.5km
            contactNumber: '100',
            address: 'Generated Geo-Proximity Address',
            coordinates: [location.lng + getRandomOffset(3500), location.lat + getRandomOffset(3500)]
        },
        {
            type: 'hospital',
            name: 'Regional General Hospital',
            distance: Math.floor(Math.random() * 4000) + 1000,
            contactNumber: '108',
            address: 'Generated Geo-Proximity Address',
            coordinates: [location.lng + getRandomOffset(5000), location.lat + getRandomOffset(5000)]
        },
        {
            type: 'fire',
            name: 'District Fire Brigade',
            distance: Math.floor(Math.random() * 5000) + 1500,
            contactNumber: '101',
            address: 'Generated Geo-Proximity Address',
            coordinates: [location.lng + getRandomOffset(6500), location.lat + getRandomOffset(6500)]
        }
    ];

    // Sort by distance ascending so the nearest is first
    return services.sort((a, b) => a.distance - b.distance);
}

async function notifyEmergencyServices(emergency, services) {
    console.log(`🚨 CRITICAL ALERT: Notifying emergency services for ${emergency._id}`);
    services.forEach(service => {
        console.log(`   → ${service.type.toUpperCase()}: ${service.name} (${service.contactNumber})`);
    });

    emergency.nearbyServices.forEach(service => {
        service.notified = true;
        service.notifiedAt = new Date();
    });

    await emergency.save();
}

function getDepartmentForEmergency(emergencyType) {
    const map = {
        electrical_hazard: 'Electricity Board - Emergency',
        flooding: 'Water Board - Emergency',
        road_collapse: 'Public Works - Emergency',
        fire: 'Fire Department',
        gas_leak: 'Gas Authority - Emergency',
        water_contamination: 'Water Board - Emergency',
        structural_damage: 'Public Works - Emergency',
        other_emergency: 'Emergency Services'
    };
    return map[emergencyType] || 'Emergency Services';
}

module.exports = {
    createEmergencyComplaint,
    getEmergencyComplaints,
    updateEmergencyStatus,
    verifyEmergencyOtp
};
