require('dotenv').config();
const mongoose = require('mongoose');
const Accident = require('../models/Accident');
const CivicIssue = require('../models/CivicIssue');
const trendService = require('../services/trendService');

const url = process.env.MONGODB_URI || 'mongodb://localhost:27017/civic-lens';

const MOCK_ACCIDENTS = [
    { severity: 'high', location: { latitude: 26.8467, longitude: 80.9462 }, confidence: 0.95 },
    { severity: 'medium', location: { latitude: 26.8500, longitude: 80.9500 }, confidence: 0.88 },
    { severity: 'low', location: { latitude: 26.8400, longitude: 80.9400 }, confidence: 0.72 }
];

const MOCK_ISSUES = [
    { category: 'pothole', severity: 'high', location: { latitude: 26.8450, longitude: 80.9450 }, imageUrl: 'https://via.placeholder.com/150' },
    { category: 'garbage', severity: 'medium', location: { latitude: 26.8480, longitude: 80.9480 }, imageUrl: 'https://via.placeholder.com/150' }
];

async function simulate() {
    try {
        await mongoose.connect(url);
        console.log("Connected to MongoDB");

        console.log("Injecting mock accidents...");
        for (let acc of MOCK_ACCIDENTS) {
            await new Accident(acc).save();
        }

        console.log("Injecting mock civic issues...");
        for (let issue of MOCK_ISSUES) {
            await new CivicIssue(issue).save();
        }

        console.log("Mock data injected. Calculating trends...");
        const trends = await trendService.calculateTrends();
        console.log("Current Urban Risk Trends:", JSON.stringify(trends, null, 2));

        console.log("Done.");
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

simulate();
