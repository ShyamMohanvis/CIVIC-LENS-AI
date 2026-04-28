const mongoose = require('mongoose');
const Complaint = require('./models/Complaint');
const EmergencyComplaint = require('./models/EmergencyComplaint');
require('dotenv').config();

async function clearData() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected.');

        const r1 = await Complaint.deleteMany({});
        console.log(`🗑️ Deleted ${r1.deletedCount} Complaints.`);

        const r2 = await EmergencyComplaint.deleteMany({});
        console.log(`🗑️ Deleted ${r2.deletedCount} Emergencies.`);

        console.log('✨ All complaints cleared successfully.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error clearing data:', error);
        process.exit(1);
    }
}

clearData();
