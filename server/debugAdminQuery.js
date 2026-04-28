const mongoose = require('mongoose');
const User = require('./models/User');
const Complaint = require('./models/Complaint');
require('dotenv').config();

async function debug() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const admin = await User.findOne({ role: 'MUNICIPAL_ADMIN' });
        if (!admin) {
            console.log('No Admin found');
            return;
        }

        console.log('Admin ULB:', admin.jurisdiction.ulbCode);

        // Simulate Controller Logic
        const query = {};
        query['jurisdiction.ulbCode'] = admin.jurisdiction.ulbCode;

        console.log('Query:', JSON.stringify(query));

        const complaints = await Complaint.find(query);
        console.log('Found Complaints:', complaints.length);

        if (complaints.length > 0) {
            console.log('First Complaint Jurisdiction:', JSON.stringify(complaints[0].jurisdiction));
        } else {
            // Check if ANY complaints exist
            const total = await Complaint.countDocuments();
            console.log('Total Complaints in DB:', total);

            // Check one
            const one = await Complaint.findOne();
            if (one) {
                console.log('Sample Complaint ULB:', one.jurisdiction.ulbCode);
                console.log('Match?', one.jurisdiction.ulbCode === admin.jurisdiction.ulbCode);
            }
        }

    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

debug();
