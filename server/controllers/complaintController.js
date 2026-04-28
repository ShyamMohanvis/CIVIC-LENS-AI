const Complaint = require('../models/Complaint');
// Removed: unused aiService import (was never called)
const cloudinary = require('cloudinary').v2;
const fs = require('fs');

// Gen-5 Services
const { calculateTrustScore } = require('../services/trustScoreService');
const { assessRiskLevel } = require('../services/riskAssessmentService');
const { setSLA, updateSLAMetrics } = require('../services/slaManagementService');
const { logAction } = require('../services/auditLoggingService');
const { findDuplicates, calculateImageHash, verifySemanticDuplicate } = require('../services/duplicateDetectionService');
const { classifyComplaint } = require('../services/classificationService');
const { analyseImage: detectronAnalyse } = require('../services/detectronService');
const { verifyResolution } = require('../services/resolutionVerificationService');
const { notifySlaBreach } = require('../services/notificationService');
const sharp = require('sharp');

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

exports.createComplaint = async (req, res) => {
    try {
        const { lat, lng, categoryOverride, description } = req.body;
        let imageUrl = '';

        // Handle Image Upload
        let detectronResult = null;  // will be populated if ai_detectron is running

        if (req.file) {
            // ── Detectron2 analysis (runs BEFORE we delete the temp file) ──
            try {
                detectronResult = await detectronAnalyse(
                    req.file.path,
                    req.file.mimetype,
                    req.file.originalname
                );
            } catch (e) {
                console.warn('Detectron2 analysis skipped:', e.message);
            }

            // ── EXIF Stripping & Image Normalization — FR-42 / VULN-005 ──
            const strippedImageBuffer = await sharp(req.file.path)
                .rotate() // preserve upright orientation
                .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true }) // uniform scaling
                .jpeg({ quality: 80, mozjpeg: true }) // force format & quality
                .toBuffer();
                
            const base64Image = strippedImageBuffer.toString('base64');
            const mimeType = 'image/jpeg';
            imageUrl = `data:${mimeType};base64,${base64Image}`;

            console.log('📸 Image uploaded & EXIF stripped:', req.file.originalname, `(${(base64Image.length / 1024).toFixed(2)} KB)`);

            // Clean up temp file
            fs.unlinkSync(req.file.path);
        }

        // ═══════════════════════════════════════════════════════════════
        // FILENAME PARSING ENGINE (PURE RULE-BASED)
        // Extract filename → Check digit → Map category
        // No randomness. No AI hallucination.
        // ═══════════════════════════════════════════════════════════════

        let finalCategory;
        let classificationSource;
        let classificationConfidence;
        let autoDetectedCategory;
        let requiresManualReview = false;
        let classificationMetadata = {};

        // ONLY filename-based classification
        if (req.file && req.file.originalname) {
            const filenameClassification = await classifyComplaint({
                filename: req.file.originalname,
                imageBuffer: null
            });

            console.log('📋 Filename Parsing:', {
                filename: req.file.originalname,
                detectedDigit: filenameClassification.metadata?.rule,
                category: filenameClassification.category
            });

            // Use classification result (or user override)
            finalCategory = categoryOverride || filenameClassification.type;
            classificationSource = categoryOverride ? 'manual' : 'rule_based_filename';
            classificationConfidence = filenameClassification.confidence;
            autoDetectedCategory = filenameClassification.category;
            requiresManualReview = filenameClassification.requiresManualReview;
            classificationMetadata = filenameClassification.metadata;
        } else {
            // No file uploaded
            finalCategory = categoryOverride || 'other';
            classificationSource = 'manual';
            classificationConfidence = 0.0;
            requiresManualReview = true;
        }

        // ── Upgrade classification with Detectron2 result (if available) ──
        // Detectron2 wins over filename rules if confidence ≥ 60% and user
        // hasn't explicitly overridden the category.
        if (detectronResult && !categoryOverride && detectronResult.aiConfidence >= 0.60) {
            console.log(`🔬 Detectron2 upgrade: ${finalCategory} → ${detectronResult.suggestedCategory} (${(detectronResult.aiConfidence * 100).toFixed(0)}%)`);
            finalCategory = detectronResult.suggestedCategory;
            classificationSource = `detectron2_${detectronResult.inferenceMode}`;
            classificationConfidence = detectronResult.aiConfidence;
            autoDetectedCategory = detectronResult.aiLabel;
        }

        const userOverrideCategory = !!categoryOverride;

        console.log(`🎯 Final Category: ${finalCategory}`);
        console.log(`   ├─ Source: ${classificationSource}`);
        console.log(`   ├─ Confidence: ${classificationConfidence}`);
        console.log(`   └─ Requires Review: ${requiresManualReview}`);

        // Calculate image hash for duplicate detection
        const imageHash = calculateImageHash(imageUrl);

        // Duplicate Detection (if enabled)
        let duplicateResult = { isDuplicate: false, clusterId: null, confidence: 0, duplicates: [] };

        if (process.env.DUPLICATE_DETECTION_ENABLED !== 'false') {
            try {
                duplicateResult = await findDuplicates(
                    imageUrl,
                    { lat: parseFloat(lat), lng: parseFloat(lng) },
                    finalCategory
                );

                if (duplicateResult.isDuplicate && duplicateResult.confidence > 0.8) {
                    console.log(`⚠️  Stage 1 Duplicate detected! Cluster: ${duplicateResult.clusterId}, Confidence: ${duplicateResult.confidence}`);

                    // ── Stage 2: Semantic Analysis (Phase E) ──
                    const headId = duplicateResult.clusterId || duplicateResult.duplicates[0].id;
                    const existingComplaint = await Complaint.findById(headId);

                    if (existingComplaint) {
                        const semanticCheck = await verifySemanticDuplicate(
                            description, lat, lng,
                            existingComplaint.description,
                            existingComplaint.location.coordinates[1],
                            existingComplaint.location.coordinates[0]
                        );

                        if (semanticCheck.isDuplicate) {
                            console.log(`🔍 Stage 2 Duplicate Confirmed! Confidence: ${semanticCheck.confidence}`);
                            
                            // Log cluster merge action
                            try {
                                await logAction(existingComplaint, 'updated', 'system', 'system', {
                                    action: 'cluster_merged',
                                    confidence: semanticCheck.confidence
                                }, req.ip);
                            } catch (logErr) {
                                console.error('🚨 Failed to logAction during cluster merge:', logErr);
                            }
                        } else {
                            console.log(`⚖️ Stage 2 Overruled Duplicate Check. Found to be unique distinct physical incident.`);
                            duplicateResult.isDuplicate = false; // Override Stage 1
                            duplicateResult.clusterId = null;
                        }
                    }
                }
            } catch (error) {
                console.error('Duplicate detection failed:', error.message);
                // Continue with complaint creation even if duplicate detection fails
            }
        }

        // Create initial complaint object
        let newComplaint = new Complaint({
            imageUrl,
            imageHash,
            description,
            category: finalCategory,
            aiSuggestedCategory: autoDetectedCategory,
            userOverrideCategory,
            aiConfidence: classificationConfidence,
            department: mapCategoryToDepartment(finalCategory),
            location: {
                type: 'Point',
                coordinates: [parseFloat(lng), parseFloat(lat)]
            },
            locationSource: 'mock',
            locationAccuracy: 10,
            isDuplicate: duplicateResult.isDuplicate,
            duplicateClusterId: duplicateResult.clusterId,
            duplicateConfidence: duplicateResult.confidence,
            userId: req.user ? req.user._id : null,
            // Classification metadata (Rule-Based System)
            classificationSource,
            classificationConfidence,
            autoDetectedCategory,
            requiresManualReview,
            classificationMetadata,
            // FIXED: matched to Admin's jurisdiction (Lucknow) for demo visibility
            jurisdiction: req.user ? req.user.jurisdiction : {
                state: 'Uttar Pradesh',
                city: 'Lucknow',
                ulbCode: 'UP-LKO-001',
                ward: 'Ward-1'
            },
            createdAt: new Date()
        });

        // Gen-5 Enhancements

        // 1. Calculate Trust Score
        const trustScore = calculateTrustScore(newComplaint, {});
        newComplaint.trustScore = trustScore;

        // 2. Assess Risk Level
        const riskAssessment = assessRiskLevel(newComplaint, {
            populationDensity: 1000
        });
        newComplaint.riskLevel = riskAssessment.riskLevel;
        newComplaint.publicSafetyImpact = riskAssessment.publicSafetyImpact;

        // 3. Set SLA based on risk
        setSLA(newComplaint);

        // 4. Calculate initial breach probability
        newComplaint.breachProbability = 0;

        // 5. Add creation audit log
        newComplaint.auditLog = [{
            action: 'created',
            actor: newComplaint.userId,
            actorRole: 'citizen',
            timestamp: new Date(),
            metadata: {
                trustScore,
                riskLevel: riskAssessment.riskLevel,
                classificationConfidence: classificationConfidence,
                classificationSource: classificationSource,
                category: finalCategory,
                userOverride: userOverrideCategory,
                isDuplicate: duplicateResult.isDuplicate,
                duplicateConfidence: duplicateResult.confidence
            },
            ipAddress: req.ip
        }];

        // 6. Add initial update
        let initialMessage = 'Complaint registered via App';
        if (duplicateResult.isDuplicate) {
            initialMessage += ` (Possible duplicate of ${duplicateResult.duplicates.length} similar complaint(s))`;
        }

        newComplaint.updates = [{
            message: initialMessage,
            timestamp: new Date(),
            actor: newComplaint.userId,
            actorRole: 'citizen'
        }];

        // Save to database
        await newComplaint.save();

        // Broadcast to real-time clients
        if (global.io) {
            console.log('📡 Broadcasting NEW_COMPLAINT event');
            global.io.emit('NEW_COMPLAINT', newComplaint);
        }

        console.log(`✅ Complaint created: ${newComplaint._id}`);
        console.log(`   Trust: ${trustScore} | Risk: ${riskAssessment.riskLevel} | SLA: ${newComplaint.slaDuration}h`);

        res.status(201).json({
            success: true,
            data: newComplaint,
            classification: {
                category: autoDetectedCategory,
                finalCategory: finalCategory,
                confidence: classificationConfidence,
                source: classificationSource,
                userOverride: userOverrideCategory,
                requiresReview: requiresManualReview
            },
            trustScore,
            riskAssessment,
            duplicateInfo: {
                isDuplicate: duplicateResult.isDuplicate,
                confidence: duplicateResult.confidence,
                similarComplaints: duplicateResult.duplicates.length
            },
            sla: {
                deadline: newComplaint.slaDeadline,
                duration: newComplaint.slaDuration
            }
        });

    } catch (error) {
        console.error('❌ Error creating complaint:', error);
        res.status(500).json({
            success: false,
            error: 'Server Error',
            details: error.message
        });
    }
};

exports.getComplaints = async (req, res) => {
    try {
        const { sortBy = 'createdAt', ulbCode, wardNumber, status, riskLevel, view } = req.query;

        // Build query with RBAC filtering
        const query = {};

        console.log('🔍 GET /complaints request');
        console.log('User:', req.user ? `${req.user.role} (${req.user._id})` : 'Anonymous');
        if (req.user) console.log('User Jurisdiction:', req.user.jurisdiction);

        // Role-based filtering (CRITICAL for security)
        // Bypass if view='public' (for Track Dashboard)
        if (req.user && view !== 'public') {
            if (req.user.role === 'CITIZEN') {
                // Citizens can only see their own complaints
                query.userId = req.user._id;
            } else if (req.user.role === 'MUNICIPAL_OPERATOR') {
                // DEMO FIX: Operators see all city complaints to pick them up
                query['jurisdiction.ulbCode'] = req.user.jurisdiction.ulbCode;
            } else if (req.user.role === 'MUNICIPAL_ADMIN') {
                // Admins see all city complaints
                query['jurisdiction.ulbCode'] = req.user.jurisdiction.ulbCode;
            } else if (req.user.role === 'STATE_ADMIN') {
                // State admins see all state complaints
                query['jurisdiction.state'] = req.user.jurisdiction.state;
            }
        }

        // Additional filters
        if (ulbCode) query['jurisdiction.ulbCode'] = ulbCode;
        if (wardNumber) query.wardNumber = wardNumber;
        if (status) query.status = status;
        if (riskLevel) query.riskLevel = riskLevel;

        let complaints = await Complaint.find(query)
            .populate('userId', 'name phone')
            .populate('assignedTo', 'name phone role')
            .populate('assignedBy', 'name');

        // Sort based on parameter
        if (sortBy === 'priority') {
            complaints = complaints.map(c => ({
                ...c.toObject(),
                priorityScore: c.calculatePriorityScore()
            })).sort((a, b) => b.priorityScore - a.priorityScore);
        } else if (sortBy === 'sla') {
            complaints = complaints.sort((a, b) =>
                new Date(a.slaDeadline) - new Date(b.slaDeadline)
            );
        } else if (sortBy === 'trust') {
            complaints = complaints.sort((a, b) => b.trustScore - a.trustScore);
        } else {
            complaints = complaints.sort((a, b) =>
                new Date(b.createdAt) - new Date(a.createdAt)
            );
        }

        res.status(200).json({
            success: true,
            count: complaints.length,
            data: complaints
        });
    } catch (error) {
        console.error('Error fetching complaints:', error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

exports.updateComplaintStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, resolutionImage, evidenceMetadata, actor = 'admin', actorRole = 'admin' } = req.body;

        const complaint = await Complaint.findById(id);
        if (!complaint) {
            return res.status(404).json({ success: false, error: 'Complaint not found' });
        }

        // ── Evidence Validation (GPS + Timestamp) — FR-39 / VULN-027 ──
        if (status === 'resolved' && evidenceMetadata) {
            const evidenceTime = new Date(evidenceMetadata.timestamp || Date.now());
            
            // 1. Timestamp validation (must be after creation and after assignment)
            if (evidenceTime < complaint.createdAt) {
                return res.status(400).json({ success: false, error: 'Evidence timestamp cannot be before complaint creation.' });
            }
            if (complaint.assignedAt && evidenceTime < complaint.assignedAt) {
                return res.status(400).json({ success: false, error: 'Evidence timestamp must be after assignment.' });
            }

            // 2. GPS validation (must be within 50m)
            if (evidenceMetadata.lat && evidenceMetadata.lng && complaint.location?.coordinates) {
                const distance = getDistanceFromLatLonInM(
                    evidenceMetadata.lat, evidenceMetadata.lng,
                    complaint.location.coordinates[1], complaint.location.coordinates[0]
                );
                
                if (distance > 50) {
                    return res.status(400).json({ 
                        success: false, 
                        error: `Evidence GPS validation failed. Image is ${Math.round(distance)}m away from complaint location (max allowed: 50m).` 
                    });
                }
            }
        }

        const oldStatus = complaint.status;
        complaint.status = status;

        // Reset the dual timer on status transition — FR-27
        if (oldStatus !== status) {
            complaint.lastStatusChangeAt = new Date();
        }

        if (status === 'resolved') {
            complaint.resolvedAt = new Date();
            if (resolutionImage) {
                complaint.resolutionImage = resolutionImage;
                
                // ── AI Resolution Verification (Phase B1) ──
                const verification = await verifyResolution(complaint.imageUrl, resolutionImage, complaint);
                complaint.resolutionVerified = verification.issueResolved;
                complaint.resolutionConfidence = verification.confidence;

                // Log verification context
                complaint.updates.push({
                    message: `AI Verification: ${verification.issueResolved ? 'Passed' : 'Failed'} (${(verification.confidence * 100).toFixed(1)}% confidence)`,
                    timestamp: new Date(),
                    actor: 'system',
                    actorRole: 'system'
                });

                if (verification.requiresManualReview) {
                    console.warn(`⚠️ Resolution flagged for manual review: ${id}`);
                }
            }
        }

        // ── 2× SLA Breach Auto-Escalation Check — FR-27 / VULN-028 ──
        if (complaint.slaDeadline && status !== 'resolved') {
            const hoursSinceCreation = (Date.now() - new Date(complaint.createdAt).getTime()) / (1000 * 60 * 60);
            
            if (hoursSinceCreation >= (complaint.slaDuration * 2) && complaint.escalationLevel < 3) {
                complaint.escalationLevel += 1;
                complaint.slaBreachCount += 1;
                
                complaint.updates.push({
                    message: `SYSTEM ESCALATION: Complaint breached SLA by 2× duration. Escalation Level: ${complaint.escalationLevel}`,
                    timestamp: new Date(),
                    actor: 'system',
                    actorRole: 'system'
                });
                
                await logAction(complaint, 'escalated', 'system', 'system', {
                    reason: '2x_sla_breach',
                    newLevel: complaint.escalationLevel
                }, req.ip);

                console.log(`🚨 Auto-Escalation triggered for ${id}: Level ${complaint.escalationLevel}`);
                
                // Notify Authority (Phase C)
                await notifySlaBreach(complaint, 'admin@civilens.gov'); // Mapped to generic admin for MVP
            }
        }

        complaint.updates.push({
            message: `Status updated from ${oldStatus} to ${status}`,
            timestamp: new Date(),
            actor,
            actorRole
        });

        await logAction(complaint, 'updated', actor, actorRole, {
            oldStatus,
            newStatus: status,
            resolutionImage: !!resolutionImage
        }, req.ip);

        await updateSLAMetrics(complaint);
        await complaint.save();

        console.log(`📊 Status updated: ${id} -> ${status}`);

        res.status(200).json({ success: true, data: complaint });
    } catch (error) {
        console.error('Error updating status:', error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

exports.uploadCommunityMedia = async (req, res) => {
    try {
        const { id } = req.params;
        const complaint = await Complaint.findById(id);

        if (!complaint) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(404).json({ success: false, error: 'Complaint not found' });
        }

        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No media file provided.' });
        }

        // ── EXIF Stripping for Community Media — FR-42 / VULN-005 ──
        const strippedImageBuffer = await sharp(req.file.path)
            .rotate()
            .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 80 })
            .toBuffer();
            
        const base64Image = strippedImageBuffer.toString('base64');
        const mimeType = 'image/jpeg';
        const mediaUrl = `data:${mimeType};base64,${base64Image}`;

        fs.unlinkSync(req.file.path);

        // Add to timeline explicitly flagged as unverified community contribution.
        // Does NOT re-trigger detectron or update the complaint's main category.
        complaint.updates.push({
            message: `Community Media Contributed [Unverified]: ${req.file.originalname}`,
            timestamp: new Date(),
            actor: req.user._id,
            actorRole: req.user.role || 'citizen'
        });

        // Store media url inside the update metadata
        // Since the updates array doesn't have a specific media field, we add it to the audit log
        await logAction(complaint, 'updated', req.user._id, req.user.role || 'citizen', {
            action: 'community_media_upload',
            mediaUrl,
            unverified: true
        }, req.ip);

        await complaint.save();

        console.log(`📸 Community Media uploaded for ${id} by ${req.user._id}`);
        res.status(201).json({ success: true, message: 'Community media added successfully.' });

    } catch (error) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        console.error('Community media upload error:', error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

function mapCategoryToDepartment(category) {
    const map = {
        'road':            'Public Works Department',
        'water':           'Water Board',
        'electricity':     'Electricity Board',
        'sanitation':      'Health Department',
        'garbage':         'Waste Management',
        'other':           'Municipal Corporation',
        'pothole':         'Public Works Department',
        'road_damage':     'Public Works Department',
        'road_obstruction':'Traffic Police',
        'garbage_dumping': 'Waste Management',
        'encroachment':    'Municipal Corporation',
        'infrastructure':  'Urban Development',
    };
    return map[category] || 'Municipal Corporation';
}

// Helper: Haversine distance in meters
function getDistanceFromLatLonInM(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Radius of the earth in m
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in m
}

function deg2rad(deg) {
    return deg * (Math.PI / 180);
}

/**
 * ── Phase E: Human Review Queue ──
 * GET /api/complaints/queue/review
 * Fetches complaints flagged by AI for mandatory human review
 */
exports.getHumanReviewQueue = async (req, res) => {
    try {
        const complaints = await Complaint.find({ requiresManualReview: true, status: 'pending' })
            .sort({ createdAt: -1 })
            .select('-__v');

        res.status(200).json({
            success: true,
            count: complaints.length,
            data: complaints
        });
    } catch (error) {
        console.error('Fetch review queue error:', error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

/**
 * PATCH /api/complaints/:id/review
 * Submits the human review decision (overriding/approving AI category)
 */
exports.submitHumanReview = async (req, res) => {
    try {
        const { id } = req.params;
        const { category, department, riskLevel, notes } = req.body;

        const complaint = await Complaint.findById(id);
        if (!complaint) return res.status(404).json({ success: false, error: 'Complaint not found' });

        // Apply operator overrides
        if (category) complaint.category = category;
        if (department) complaint.department = department;
        if (riskLevel) complaint.riskLevel = riskLevel;
        
        complaint.requiresManualReview = false; // Mark as resolved
        
        complaint.updates.push({
            message: `AI Classification reviewed by human operator. ${notes ? 'Notes: ' + notes : ''}`,
            actor: req.user.id,
            actorRole: req.user.role,
            timestamp: new Date()
        });

        await complaint.save();
        
        if (req.app.get('io') || global.io) {
            (req.app.get('io') || global.io).emit('COMPLAINT_UPDATED', complaint);
        }

        res.status(200).json({ success: true, data: complaint });
    } catch (error) {
        console.error('Submit review error:', error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};
