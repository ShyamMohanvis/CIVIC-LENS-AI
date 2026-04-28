/**
 * Duplicate Detection Service
 * Uses image similarity and geo-spatial analysis
 */

const Complaint = require('../models/Complaint');
const crypto = require('crypto');
const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Find duplicate complaints
 * @param {string} imageUrl - Base64 image data
 * @param {object} location - {lat, lng}
 * @param {string} category - Complaint category
 * @returns {Promise<{isDuplicate: boolean, clusterId: string, confidence: number, duplicates: array}>}
 */
const findDuplicates = async (imageUrl, location, category) => {
    try {
        // 1. Calculate image hash
        const imageHash = calculateImageHash(imageUrl);

        // 2. Find similar images (simplified - would use perceptual hashing in production)
        const similarByImage = await findSimilarImages(imageHash, 0.85);

        // 3. Find nearby complaints (100m radius)
        const nearbyComplaints = await findNearbyComplaints(location, category, 100);

        // 4. Find intersection (both similar image AND nearby location)
        const duplicates = intersectComplaints(similarByImage, nearbyComplaints);

        // 5. Calculate duplicate confidence
        const confidence = calculateDuplicateConfidence(duplicates, imageHash, location);

        return {
            isDuplicate: duplicates.length > 0,
            clusterId: duplicates[0]?._id,
            confidence,
            duplicates: duplicates.map(d => ({
                id: d._id,
                category: d.category,
                distance: calculateDistance(location, {
                    lat: d.location.coordinates[1],
                    lng: d.location.coordinates[0]
                }),
                imageSimilarity: calculateImageSimilarity(imageHash, d.imageHash),
                createdAt: d.createdAt
            }))
        };
    } catch (error) {
        console.error('Duplicate detection error:', error);
        return {
            isDuplicate: false,
            clusterId: null,
            confidence: 0,
            duplicates: []
        };
    }
};

/**
 * Calculate simple image hash (MD5)
 * In production, use perceptual hashing (pHash, dHash)
 */
const calculateImageHash = (imageUrl) => {
    if (!imageUrl) return null;

    // Extract base64 data
    const base64Data = imageUrl.split(',')[1] || imageUrl;

    // Calculate MD5 hash
    const hash = crypto.createHash('md5').update(base64Data).digest('hex');

    return hash;
};

/**
 * Calculate perceptual hash (for production)
 * This would use libraries like 'sharp' and 'blockhash'
 */
const calculatePerceptualHash = async (imageBuffer) => {
    // Placeholder for production implementation
    // const sharp = require('sharp');
    // const blockhash = require('blockhash');

    // 1. Resize image to 8x8
    // const resized = await sharp(imageBuffer)
    //   .resize(8, 8, { fit: 'fill' })
    //   .greyscale()
    //   .raw()
    //   .toBuffer();

    // 2. Calculate average pixel value
    // 3. Generate hash based on pixels above/below average

    return null;
};

/**
 * Find complaints with similar images
 */
const findSimilarImages = async (imageHash, threshold = 0.85) => {
    if (!imageHash) return [];

    // In production, would use perceptual hash distance
    // For now, exact match only
    const similar = await Complaint.find({
        imageHash,
        status: { $ne: 'resolved' },
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
    }).limit(10);

    return similar;
};

/**
 * Find nearby complaints using geo-spatial query
 */
const findNearbyComplaints = async (location, category, radiusMeters = 100) => {
    try {
        const nearby = await Complaint.find({
            category,
            status: { $ne: 'resolved' },
            location: {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [parseFloat(location.lng), parseFloat(location.lat)]
                    },
                    $maxDistance: radiusMeters
                }
            },
            createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        }).limit(10);

        return nearby;
    } catch (error) {
        console.error('Geo-spatial query error:', error);
        // Fallback to manual distance calculation if index not available
        return await findNearbyManual(location, category, radiusMeters);
    }
};

/**
 * Manual distance-based search (fallback)
 */
const findNearbyManual = async (location, category, radiusMeters) => {
    const allComplaints = await Complaint.find({
        category,
        status: { $ne: 'resolved' },
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    });

    return allComplaints.filter(c => {
        const distance = calculateDistance(location, {
            lat: c.location.coordinates[1],
            lng: c.location.coordinates[0]
        });
        return distance <= radiusMeters;
    });
};

/**
 * Find intersection of two complaint arrays
 */
const intersectComplaints = (array1, array2) => {
    const ids1 = new Set(array1.map(c => c._id.toString()));
    return array2.filter(c => ids1.has(c._id.toString()));
};

/**
 * Calculate duplicate confidence
 */
const calculateDuplicateConfidence = (duplicates, imageHash, location) => {
    if (duplicates.length === 0) return 0;

    let confidence = 0;

    // Base confidence if duplicates found
    confidence += 0.5;

    // Increase confidence based on number of duplicates
    confidence += Math.min(0.2, duplicates.length * 0.05);

    // Increase confidence based on proximity
    const avgDistance = duplicates.reduce((sum, d) => {
        return sum + calculateDistance(location, {
            lat: d.location.coordinates[1],
            lng: d.location.coordinates[0]
        });
    }, 0) / duplicates.length;

    if (avgDistance < 50) confidence += 0.2; // Very close
    else if (avgDistance < 100) confidence += 0.1; // Close

    // Increase confidence if image hash matches
    const exactImageMatch = duplicates.some(d => d.imageHash === imageHash);
    if (exactImageMatch) confidence += 0.2;

    return Math.min(1, confidence);
};

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
const calculateDistance = (coord1, coord2) => {
    const R = 6371e3; // Earth radius in meters
    const φ1 = coord1.lat * Math.PI / 180;
    const φ2 = coord2.lat * Math.PI / 180;
    const Δφ = (coord2.lat - coord1.lat) * Math.PI / 180;
    const Δλ = (coord2.lng - coord1.lng) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
};

/**
 * Calculate image similarity (0-1)
 */
const calculateImageSimilarity = (hash1, hash2) => {
    if (!hash1 || !hash2) return 0;

    // Exact match for MD5
    if (hash1 === hash2) return 1.0;

    // In production, would calculate Hamming distance for perceptual hashes
    return 0;
};

/**
 * Hamming distance for perceptual hashes (production)
 */
const hammingDistance = (hash1, hash2) => {
    if (hash1.length !== hash2.length) return Infinity;

    let distance = 0;
    for (let i = 0; i < hash1.length; i++) {
        if (hash1[i] !== hash2[i]) distance++;
    }

    return distance;
};

/**
 * Stage 2: Advanced Semantic Analysis (Gemini)
 * Evaluates whether two complaints are about the EXACT same physical issue.
 */
const verifySemanticDuplicate = async (newText, newLat, newLng, oldText, oldLat, oldLng) => {
    if (!newText || !oldText) return { isDuplicate: false, confidence: 0 };
    if (!process.env.GEMINI_API_KEY) return { isDuplicate: false, confidence: 0 };

    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const distanceMeters = calculateDistance({lat: newLat, lng: newLng}, {lat: oldLat, lng: oldLng});

        if (distanceMeters > 500) {
           return { isDuplicate: false, confidence: 0 }; // Too far to be the same exact pothole etc.
        }

        const prompt = `
            Analyze these two civic complaints and determine if they describe the EXACT SAME physical incident. 
            They are reported ${Math.round(distanceMeters)} meters apart.
            
            Complaint 1: "${newText}"
            Complaint 2: "${oldText}"
            
            Return a JSON object: {"isDuplicate": true/false, "confidence": 0.0-1.0}
            Return ONLY the JSON.
        `;

        const result = await model.generateContent(prompt);
        let text = result.response.text();
        
        // Clean JSON formatting if present
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const analysis = JSON.parse(text);

        return {
            isDuplicate: analysis.isDuplicate === true && analysis.confidence > 0.8,
            confidence: analysis.confidence || 0
        };
    } catch (e) {
        console.warn('Semantic Duplicate Detection failed:', e.message);
        return { isDuplicate: false, confidence: 0 };
    }
};

module.exports = {
    findDuplicates,
    calculateImageHash,
    calculatePerceptualHash,
    findSimilarImages,
    findNearbyComplaints,
    calculateDistance,
    calculateImageSimilarity,
    verifySemanticDuplicate
};
