const Accident = require('../models/Accident');

/**
 * Generates predictive accident hotspot data by aggregating historical accidents
 * into geographic grid cells and scoring each cell by frequency × severity × recency.
 * 
 * Returns an array of hotspot objects, sorted by weight descending.
 * @param {Object} options - { gridResolution: number (degrees), maxDays: number }
 */
exports.generateHotspots = async (options = {}) => {
    const gridResolution = options.gridResolution || 0.01; // ~1km grid cells
    const maxDays = options.maxDays || 90;

    const since = new Date(Date.now() - maxDays * 24 * 60 * 60 * 1000);

    const severityScore = { low: 1, medium: 3, high: 7 };

    // Fetch all accidents within time window
    const accidents = await Accident.find({ timestamp: { $gte: since } })
        .select('severity confidence location timestamp')
        .lean();

    if (!accidents.length) return [];

    // Bucket accidents into grid cells
    const cells = {};

    for (const accident of accidents) {
        const lat = accident.location?.latitude;
        const lng = accident.location?.longitude;
        if (lat == null || lng == null) continue;

        // Snap to grid
        const gridLat = Math.round(lat / gridResolution) * gridResolution;
        const gridLng = Math.round(lng / gridResolution) * gridResolution;
        const key = `${gridLat.toFixed(4)},${gridLng.toFixed(4)}`;

        if (!cells[key]) {
            cells[key] = { lat: gridLat, lng: gridLng, count: 0, totalScore: 0, accidents: [] };
        }

        // Time decay: more recent = higher weight (exponential decay over maxDays)
        const ageMs = Date.now() - new Date(accident.timestamp).getTime();
        const ageDays = ageMs / (1000 * 60 * 60 * 24);
        const timeDecay = Math.exp(-ageDays / (maxDays / 2));

        const sScore = (severityScore[accident.severity] || 1) * (accident.confidence || 0.5);
        const weight = sScore * timeDecay;

        cells[key].count += 1;
        cells[key].totalScore += weight;
        cells[key].accidents.push({ severity: accident.severity, timestamp: accident.timestamp });
    }

    // Convert to array and calculate risk level
    const hotspots = Object.values(cells).map((cell) => {
        const avgScore = cell.totalScore / cell.count;
        let riskLevel = 'low';
        if (avgScore >= 2) riskLevel = 'critical';
        else if (avgScore >= 1) riskLevel = 'high';
        else if (avgScore >= 0.4) riskLevel = 'medium';

        return {
            lat: cell.lat,
            lng: cell.lng,
            count: cell.count,
            weight: parseFloat(cell.totalScore.toFixed(3)),
            riskLevel
        };
    });

    // Sort by weight descending (top hotspots first)
    hotspots.sort((a, b) => b.weight - a.weight);

    return hotspots;
};
