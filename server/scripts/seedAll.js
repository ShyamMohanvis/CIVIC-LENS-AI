require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Complaint = require('../models/Complaint');

/**
 * Complete seed script - creates users AND complaints
 * Run with: node scripts/seedAll.js
 */

const seedAll = async () => {
    try {
        // Connect to database
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/civic-lens');
        console.log('✅ Connected to MongoDB');

        // Clear existing data
        console.log('🗑️  Clearing existing data...');
        await User.deleteMany({});
        await Complaint.deleteMany({});

        // Create users manually with hashed passwords
        console.log('\n👥 Creating test users...\n');

        const users = [];

        // State Admin
        const stateAdmin = await User.create({
            phone: '+919999999999',
            name: 'Rajesh Kumar (State Admin)',
            email: 'admin.state@civiclens.gov.in',
            password: await bcrypt.hash('StateAdmin@123', 10),
            role: 'STATE_ADMIN',
            jurisdiction: { state: 'Uttar Pradesh' },
            isVerified: true,
            isActive: true
        });
        users.push(stateAdmin);
        console.log(`✅ Created: ${stateAdmin.name}`);

        // Municipal Admin (Lucknow)
        const municipalAdmin = await User.create({
            phone: '+919999999998',
            name: 'Priya Sharma (Lucknow Admin)',
            email: 'admin.lucknow@civiclens.gov.in',
            password: await bcrypt.hash('AdminLKO@123', 10),
            role: 'MUNICIPAL_ADMIN',
            jurisdiction: {
                state: 'Uttar Pradesh',
                city: 'Lucknow',
                ulbCode: 'UP-LKO-001'
            },
            isVerified: true,
            isActive: true
        });
        users.push(municipalAdmin);
        console.log(`✅ Created: ${municipalAdmin.name}`);

        // Road Operator (Ward-1)
        const roadOperator = await User.create({
            phone: '+919999999997',
            name: 'Amit Singh (Road Operator)',
            email: 'operator.roads.w1@civiclens.gov.in',
            password: await bcrypt.hash('OperatorRoad@123', 10),
            role: 'MUNICIPAL_OPERATOR',
            jurisdiction: {
                state: 'Uttar Pradesh',
                city: 'Lucknow',
                ulbCode: 'UP-LKO-001',
                ward: 'Ward-1',
                department: 'Public Works Department'
            },
            isVerified: true,
            isActive: true
        });
        users.push(roadOperator);
        console.log(`✅ Created: ${roadOperator.name}`);

        // Sanitation Operator (Ward-1)
        const sanitationOperator = await User.create({
            phone: '+919999999996',
            name: 'Sunita Devi (Sanitation Operator)',
            email: 'operator.sanitation.w1@civiclens.gov.in',
            password: await bcrypt.hash('OperatorSan@123', 10),
            role: 'MUNICIPAL_OPERATOR',
            jurisdiction: {
                state: 'Uttar Pradesh',
                city: 'Lucknow',
                ulbCode: 'UP-LKO-001',
                ward: 'Ward-1',
                department: 'Health Department'
            },
            isVerified: true,
            isActive: true
        });
        users.push(sanitationOperator);
        console.log(`✅ Created: ${sanitationOperator.name}`);

        // Test Citizen
        const citizen = await User.create({
            phone: '+919999999995',
            name: 'Test Citizen User',
            email: 'citizen@test.com',
            role: 'CITIZEN',
            jurisdiction: {},
            isVerified: true,
            isActive: true
        });
        users.push(citizen);
        console.log(`✅ Created: ${citizen.name}`);

        // Create complaints
        console.log('\n📝 Creating dummy complaints...\n');

        const complaints = [];

        // Citizen's complaints (3)
        complaints.push(await Complaint.create({
            userId: citizen._id,
            category: 'road',
            department: 'Public Works Department',
            status: 'pending',
            riskLevel: 'high',
            trustScore: 85,
            aiConfidence: 0.92,
            location: { type: 'Point', coordinates: [80.9462, 26.8467] },
            jurisdiction: { state: 'Uttar Pradesh', city: 'Lucknow', ulbCode: 'UP-LKO-001', ward: 'Ward-1' },
            imageUrl: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=400',
            slaDuration: 48,
            slaDeadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
            updates: [{ message: 'Pothole on main road', timestamp: new Date(), actor: 'citizen', actorRole: 'citizen' }]
        }));

        complaints.push(await Complaint.create({
            userId: citizen._id,
            category: 'garbage',
            department: 'Waste Management',
            status: 'in_progress',
            riskLevel: 'medium',
            trustScore: 78,
            aiConfidence: 0.88,
            location: { type: 'Point', coordinates: [80.9512, 26.8500] },
            jurisdiction: { state: 'Uttar Pradesh', city: 'Lucknow', ulbCode: 'UP-LKO-001', ward: 'Ward-1' },
            imageUrl: 'https://images.unsplash.com/photo-1604187351574-c75ca79f5807?w=400',
            slaDuration: 24,
            slaDeadline: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
            assignedTo: sanitationOperator._id,
            assignedBy: municipalAdmin._id,
            assignedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
            updates: [
                { message: 'Garbage pile reported', timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), actor: 'citizen', actorRole: 'citizen' },
                { message: 'Assigned to operator', timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000), actor: 'admin', actorRole: 'admin' }
            ]
        }));

        complaints.push(await Complaint.create({
            userId: citizen._id,
            category: 'water',
            department: 'Water Board',
            status: 'resolved',
            riskLevel: 'critical',
            trustScore: 92,
            aiConfidence: 0.95,
            location: { type: 'Point', coordinates: [80.9400, 26.8550] },
            jurisdiction: { state: 'Uttar Pradesh', city: 'Lucknow', ulbCode: 'UP-LKO-001', ward: 'Ward-1' },
            imageUrl: 'https://images.unsplash.com/photo-1581093458791-9d42e1b2b5e4?w=400',
            slaDuration: 12,
            slaDeadline: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
            resolvedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
            resolutionImage: 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=400',
            updates: [
                { message: 'Water pipe burst', timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000), actor: 'citizen', actorRole: 'citizen' },
                { message: 'Pipe repaired', timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), actor: 'operator', actorRole: 'engineer' }
            ]
        }));

        // Assigned to road operator
        complaints.push(await Complaint.create({
            userId: municipalAdmin._id,
            category: 'road',
            department: 'Public Works Department',
            status: 'in_progress',
            riskLevel: 'medium',
            trustScore: 80,
            aiConfidence: 0.87,
            location: { type: 'Point', coordinates: [80.9480, 26.8490] },
            jurisdiction: { state: 'Uttar Pradesh', city: 'Lucknow', ulbCode: 'UP-LKO-001', ward: 'Ward-1' },
            imageUrl: 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=400',
            slaDuration: 48,
            slaDeadline: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
            assignedTo: roadOperator._id,
            assignedBy: municipalAdmin._id,
            assignedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
            updates: [
                { message: 'Road damage reported', timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000), actor: 'admin', actorRole: 'admin' },
                { message: 'Work in progress', timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000), actor: 'operator', actorRole: 'engineer' }
            ]
        }));

        // More Lucknow complaints
        complaints.push(await Complaint.create({
            userId: municipalAdmin._id,
            category: 'sanitation',
            department: 'Health Department',
            status: 'pending',
            riskLevel: 'medium',
            trustScore: 72,
            aiConfidence: 0.84,
            location: { type: 'Point', coordinates: [80.9550, 26.8400] },
            jurisdiction: { state: 'Uttar Pradesh', city: 'Lucknow', ulbCode: 'UP-LKO-001', ward: 'Ward-2' },
            slaDuration: 36,
            slaDeadline: new Date(Date.now() + 1.5 * 24 * 60 * 60 * 1000),
            updates: [{ message: 'Open drain needs cleaning', timestamp: new Date(), actor: 'admin', actorRole: 'admin' }]
        }));

        complaints.push(await Complaint.create({
            userId: municipalAdmin._id,
            category: 'electricity',
            department: 'Electricity Board',
            status: 'pending',
            riskLevel: 'high',
            trustScore: 88,
            aiConfidence: 0.91,
            location: { type: 'Point', coordinates: [80.9600, 26.8450] },
            jurisdiction: { state: 'Uttar Pradesh', city: 'Lucknow', ulbCode: 'UP-LKO-001', ward: 'Ward-2' },
            slaDuration: 24,
            slaDeadline: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
            updates: [{ message: 'Street light not working', timestamp: new Date(), actor: 'admin', actorRole: 'admin' }]
        }));

        // Varanasi complaints (for State Admin)
        complaints.push(await Complaint.create({
            userId: stateAdmin._id,
            category: 'water',
            department: 'Water Board',
            status: 'pending',
            riskLevel: 'high',
            trustScore: 86,
            aiConfidence: 0.89,
            location: { type: 'Point', coordinates: [82.9739, 25.3176] },
            jurisdiction: { state: 'Uttar Pradesh', city: 'Varanasi', ulbCode: 'UP-VAR-001', ward: 'Ward-1' },
            slaDuration: 24,
            slaDeadline: new Date(Date.now() + 18 * 60 * 60 * 1000),
            updates: [{ message: 'Water shortage in Varanasi', timestamp: new Date(), actor: 'citizen', actorRole: 'citizen' }]
        }));

        complaints.push(await Complaint.create({
            userId: stateAdmin._id,
            category: 'sanitation',
            department: 'Health Department',
            status: 'in_progress',
            riskLevel: 'medium',
            trustScore: 79,
            aiConfidence: 0.85,
            location: { type: 'Point', coordinates: [82.9800, 25.3200] },
            jurisdiction: { state: 'Uttar Pradesh', city: 'Varanasi', ulbCode: 'UP-VAR-001', ward: 'Ward-1' },
            slaDuration: 36,
            slaDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
            updates: [
                { message: 'Public toilet maintenance needed', timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000), actor: 'citizen', actorRole: 'citizen' },
                { message: 'Work initiated', timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000), actor: 'admin', actorRole: 'admin' }
            ]
        }));

        console.log(`✅ Created ${complaints.length} dummy complaints`);

        console.log('\n🎉 Seed complete!\n');
        console.log('📊 Summary:');
        console.log(`   Users: ${users.length}`);
        console.log(`   Complaints: ${complaints.length}`);
        console.log(`   Lucknow: 6 complaints`);
        console.log(`   Varanasi: 2 complaints`);
        console.log('\n🔐 Test Login Credentials:');
        console.log('   State Admin: +919999999999 / StateAdmin@123');
        console.log('   Municipal Admin: +919999999998 / AdminLKO@123');
        console.log('   Road Operator: +919999999997 / OperatorRoad@123');
        console.log('   Sanitation Operator: +919999999996 / OperatorSan@123');
        console.log('   Citizen: +919999999995 (OTP login)');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\n👋 Database connection closed');
    }
};

seedAll();
