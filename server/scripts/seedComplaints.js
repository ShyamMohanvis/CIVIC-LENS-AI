require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Complaint = require('../models/Complaint');

/**
 * Seed script to create dummy complaints for testing RBAC dashboards
 * Run with: node scripts/seedComplaints.js
 */

const sampleComplaints = [
    // Citizen 1 complaints (Lucknow)
    {
        userId: null, // Will be set to citizen user ID
        category: 'road',
        department: 'Public Works Department',
        status: 'pending',
        riskLevel: 'high',
        trustScore: 85,
        aiConfidence: 0.92,
        location: { type: 'Point', coordinates: [80.9462, 26.8467] },
        jurisdiction: {
            state: 'Uttar Pradesh',
            city: 'Lucknow',
            ulbCode: 'UP-LKO-001',
            ward: 'Ward-1'
        },
        imageUrl: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=400',
        slaDuration: 48,
        slaDeadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        updates: [{
            message: 'Pothole reported on main road',
            timestamp: new Date(),
            actor: 'system',
            actorRole: 'system'
        }]
    },
    {
        userId: null,
        category: 'garbage',
        department: 'Waste Management',
        status: 'in_progress',
        riskLevel: 'medium',
        trustScore: 78,
        aiConfidence: 0.88,
        location: { type: 'Point', coordinates: [80.9512, 26.8500] },
        jurisdiction: {
            state: 'Uttar Pradesh',
            city: 'Lucknow',
            ulbCode: 'UP-LKO-001',
            ward: 'Ward-1'
        },
        imageUrl: 'https://images.unsplash.com/photo-1604187351574-c75ca79f5807?w=400',
        slaDuration: 24,
        slaDeadline: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        assignedTo: null, // Will be set to operator
        updates: [{
            message: 'Garbage pile reported',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
            actor: 'system',
            actorRole: 'system'
        }, {
            message: 'Assigned to sanitation operator',
            timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
            actor: 'admin',
            actorRole: 'admin'
        }]
    },
    {
        userId: null,
        category: 'water',
        department: 'Water Board',
        status: 'resolved',
        riskLevel: 'critical',
        trustScore: 92,
        aiConfidence: 0.95,
        location: { type: 'Point', coordinates: [80.9400, 26.8550] },
        jurisdiction: {
            state: 'Uttar Pradesh',
            city: 'Lucknow',
            ulbCode: 'UP-LKO-001',
            ward: 'Ward-1'
        },
        imageUrl: 'https://images.unsplash.com/photo-1581093458791-9d42e1b2b5e4?w=400',
        slaDuration: 12,
        slaDeadline: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        resolvedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
        resolutionImage: 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=400',
        updates: [{
            message: 'Water pipe burst reported',
            timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000),
            actor: 'system',
            actorRole: 'system'
        }, {
            message: 'Emergency repair team dispatched',
            timestamp: new Date(Date.now() - 10 * 60 * 60 * 1000),
            actor: 'admin',
            actorRole: 'admin'
        }, {
            message: 'Pipe repaired successfully',
            timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
            actor: 'operator',
            actorRole: 'engineer'
        }]
    },

    // More Lucknow complaints (for admin to see)
    {
        userId: null, // Different citizen
        category: 'sanitation',
        department: 'Health Department',
        status: 'pending',
        riskLevel: 'medium',
        trustScore: 72,
        aiConfidence: 0.84,
        location: { type: 'Point', coordinates: [80.9550, 26.8400] },
        jurisdiction: {
            state: 'Uttar Pradesh',
            city: 'Lucknow',
            ulbCode: 'UP-LKO-001',
            ward: 'Ward-2'
        },
        imageUrl: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=400',
        slaDuration: 36,
        slaDeadline: new Date(Date.now() + 1.5 * 24 * 60 * 60 * 1000),
        updates: [{
            message: 'Open drain needs cleaning',
            timestamp: new Date(),
            actor: 'system',
            actorRole: 'system'
        }]
    },
    {
        userId: null,
        category: 'electricity',
        department: 'Electricity Board',
        status: 'pending',
        riskLevel: 'high',
        trustScore: 88,
        aiConfidence: 0.91,
        location: { type: 'Point', coordinates: [80.9600, 26.8450] },
        jurisdiction: {
            state: 'Uttar Pradesh',
            city: 'Lucknow',
            ulbCode: 'UP-LKO-001',
            ward: 'Ward-2'
        },
        imageUrl: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=400',
        slaDuration: 24,
        slaDeadline: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        updates: [{
            message: 'Street light not working',
            timestamp: new Date(),
            actor: 'system',
            actorRole: 'system'
        }]
    },

    // Operator assigned complaints (Ward-1)
    {
        userId: null,
        category: 'road',
        department: 'Public Works Department',
        status: 'in_progress',
        riskLevel: 'medium',
        trustScore: 80,
        aiConfidence: 0.87,
        location: { type: 'Point', coordinates: [80.9480, 26.8490] },
        jurisdiction: {
            state: 'Uttar Pradesh',
            city: 'Lucknow',
            ulbCode: 'UP-LKO-001',
            ward: 'Ward-1'
        },
        imageUrl: 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=400',
        slaDuration: 48,
        slaDeadline: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        assignedTo: null, // Will be set to road operator
        updates: [{
            message: 'Road damage reported',
            timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
            actor: 'system',
            actorRole: 'system'
        }, {
            message: 'Assigned to road maintenance team',
            timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
            actor: 'admin',
            actorRole: 'admin'
        }, {
            message: 'Work in progress',
            timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
            actor: 'operator',
            actorRole: 'engineer'
        }]
    },
    {
        userId: null,
        category: 'garbage',
        department: 'Waste Management',
        status: 'pending',
        riskLevel: 'low',
        trustScore: 75,
        aiConfidence: 0.82,
        location: { type: 'Point', coordinates: [80.9520, 26.8520] },
        jurisdiction: {
            state: 'Uttar Pradesh',
            city: 'Lucknow',
            ulbCode: 'UP-LKO-001',
            ward: 'Ward-1'
        },
        imageUrl: 'https://images.unsplash.com/photo-1604187351574-c75ca79f5807?w=400',
        slaDuration: 24,
        slaDeadline: new Date(Date.now() + 12 * 60 * 60 * 1000),
        assignedTo: null, // Will be set to sanitation operator
        updates: [{
            message: 'Garbage collection delayed',
            timestamp: new Date(),
            actor: 'system',
            actorRole: 'system'
        }]
    },

    // State-level data (different city for State Admin to see)
    {
        userId: null,
        category: 'water',
        department: 'Water Board',
        status: 'pending',
        riskLevel: 'high',
        trustScore: 86,
        aiConfidence: 0.89,
        location: { type: 'Point', coordinates: [82.9739, 25.3176] }, // Varanasi
        jurisdiction: {
            state: 'Uttar Pradesh',
            city: 'Varanasi',
            ulbCode: 'UP-VAR-001',
            ward: 'Ward-1'
        },
        imageUrl: 'https://images.unsplash.com/photo-1581093458791-9d42e1b2b5e4?w=400',
        slaDuration: 24,
        slaDeadline: new Date(Date.now() + 18 * 60 * 60 * 1000),
        updates: [{
            message: 'Water shortage reported in Varanasi',
            timestamp: new Date(),
            actor: 'system',
            actorRole: 'system'
        }]
    },
    {
        userId: null,
        category: 'sanitation',
        department: 'Health Department',
        status: 'in_progress',
        riskLevel: 'medium',
        trustScore: 79,
        aiConfidence: 0.85,
        location: { type: 'Point', coordinates: [82.9800, 25.3200] }, // Varanasi
        jurisdiction: {
            state: 'Uttar Pradesh',
            city: 'Varanasi',
            ulbCode: 'UP-VAR-001',
            ward: 'Ward-1'
        },
        imageUrl: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=400',
        slaDuration: 36,
        slaDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
        updates: [{
            message: 'Public toilet maintenance needed',
            timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
            actor: 'system',
            actorRole: 'system'
        }, {
            message: 'Work initiated',
            timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
            actor: 'admin',
            actorRole: 'admin'
        }]
    }
];

const seedComplaints = async () => {
    try {
        // Connect to database
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/civic-lens');
        console.log('✅ Connected to MongoDB');

        // Get users
        const citizenUser = await User.findOne({ phone: '+919999999995' });
        const roadOperator = await User.findOne({ phone: '+919999999997' });
        const sanitationOperator = await User.findOne({ phone: '+919999999996' });
        const adminUser = await User.findOne({ phone: '+919999999998' });

        if (!citizenUser || !roadOperator || !sanitationOperator || !adminUser) {
            console.log('⚠️  Users not found. Run seedUsers.js first!');
            return;
        }

        console.log('👥 Found users:');
        console.log(`   Citizen: ${citizenUser.name}`);
        console.log(`   Road Operator: ${roadOperator.name}`);
        console.log(`   Sanitation Operator: ${sanitationOperator.name}`);
        console.log(`   Admin: ${adminUser.name}`);

        // Clear existing complaints (optional - comment out if you want to keep existing)
        await Complaint.deleteMany({});
        console.log('🗑️  Cleared existing complaints');

        // Create complaints
        console.log('\n📝 Creating dummy complaints...\n');

        for (let i = 0; i < sampleComplaints.length; i++) {
            const complaintData = { ...sampleComplaints[i] };

            // Set userId based on complaint type
            if (i < 3) {
                // First 3 complaints belong to test citizen
                complaintData.userId = citizenUser._id;
            } else {
                // Others belong to admin (for variety)
                complaintData.userId = adminUser._id;
            }

            // Set assignedTo for specific complaints
            if (complaintData.category === 'road' && complaintData.status === 'in_progress') {
                complaintData.assignedTo = roadOperator._id;
                complaintData.assignedBy = adminUser._id;
                complaintData.assignedAt = new Date(Date.now() - 4 * 60 * 60 * 1000);
            } else if (complaintData.category === 'garbage' && complaintData.assignedTo === null && complaintData.jurisdiction.ward === 'Ward-1') {
                complaintData.assignedTo = sanitationOperator._id;
                complaintData.assignedBy = adminUser._id;
                complaintData.assignedAt = new Date(Date.now() - 3 * 60 * 60 * 1000);
            }

            // Create audit log
            complaintData.auditLog = [{
                action: 'created',
                actor: complaintData.userId.toString(),
                actorRole: 'citizen',
                timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
                metadata: {
                    category: complaintData.category,
                    riskLevel: complaintData.riskLevel
                },
                ipAddress: '127.0.0.1'
            }];

            const complaint = new Complaint(complaintData);
            await complaint.save();

            console.log(`✅ Created ${complaintData.category} complaint in ${complaintData.jurisdiction.city} - Status: ${complaintData.status}`);
        }

        console.log('\n🎉 All dummy complaints created successfully!');
        console.log('\n📊 Summary:');
        console.log(`   Total Complaints: ${sampleComplaints.length}`);
        console.log(`   Citizen Complaints: 3`);
        console.log(`   Lucknow Complaints: ${sampleComplaints.filter(c => c.jurisdiction.city === 'Lucknow').length}`);
        console.log(`   Varanasi Complaints: ${sampleComplaints.filter(c => c.jurisdiction.city === 'Varanasi').length}`);
        console.log(`   Assigned to Road Operator: ${sampleComplaints.filter(c => c.status === 'in_progress' && c.category === 'road').length}`);
        console.log(`   Assigned to Sanitation Operator: ${sampleComplaints.filter(c => c.category === 'garbage' && c.jurisdiction.ward === 'Ward-1').length}`);

        console.log('\n🔐 Test the dashboards:');
        console.log('   Citizen (+919999999995) - Will see 3 own complaints');
        console.log('   Road Operator (+919999999997) - Will see 1 assigned road complaint');
        console.log('   Sanitation Operator (+919999999996) - Will see 2 assigned garbage complaints');
        console.log('   Municipal Admin (+919999999998) - Will see 7 Lucknow complaints');
        console.log('   State Admin (+919999999999) - Will see all 9 complaints across UP');

    } catch (error) {
        console.error('❌ Error seeding complaints:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\n👋 Database connection closed');
    }
};

// Run the seed function
seedComplaints();
