require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Complaint = require('../models/Complaint');

/**
 * Seed script with Employee ID authentication
 * Run with: node scripts/seedWithEmployeeId.js
 */

const seedWithEmployeeId = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/civic-lens');
        console.log('✅ Connected to MongoDB');

        // Clear existing data
        await User.deleteMany({});
        await Complaint.deleteMany({});
        console.log('🗑️  Cleared existing data\n');

        // Create users with Employee IDs
        console.log('👥 Creating users with Employee IDs...\n');

        const stateAdmin = await User.create({
            employeeId: 'ADMIN-STATE-001',
            name: 'Rajesh Kumar (State Admin)',
            email: 'admin.state@civiclens.gov.in',
            password: await bcrypt.hash('StateAdmin@123', 10),
            role: 'STATE_ADMIN',
            jurisdiction: { state: 'Uttar Pradesh' },
            isVerified: true,
            isActive: true
        });
        console.log(`✅ ${stateAdmin.employeeId} - ${stateAdmin.name}`);

        const municipalAdmin = await User.create({
            employeeId: 'ADMIN-LKO-001',
            name: 'Priya Sharma (Lucknow Admin)',
            email: 'admin.lucknow@civiclens.gov.in',
            password: await bcrypt.hash('AdminLKO@123', 10),
            role: 'MUNICIPAL_ADMIN',
            jurisdiction: { state: 'Uttar Pradesh', city: 'Lucknow', ulbCode: 'UP-LKO-001' },
            isVerified: true,
            isActive: true
        });
        console.log(`✅ ${municipalAdmin.employeeId} - ${municipalAdmin.name}`);

        const roadOperator = await User.create({
            employeeId: 'EMP-ROAD-001',
            name: 'Amit Singh (Road Operator)',
            email: 'operator.roads@civiclens.gov.in',
            password: await bcrypt.hash('OperatorRoad@123', 10),
            role: 'MUNICIPAL_OPERATOR',
            jurisdiction: { state: 'Uttar Pradesh', city: 'Lucknow', ulbCode: 'UP-LKO-001', ward: 'Ward-1', department: 'Public Works Department' },
            isVerified: true,
            isActive: true
        });
        console.log(`✅ ${roadOperator.employeeId} - ${roadOperator.name}`);

        const sanitationOperator = await User.create({
            employeeId: 'EMP-SAN-001',
            name: 'Sunita Devi (Sanitation Operator)',
            email: 'operator.sanitation@civiclens.gov.in',
            password: await bcrypt.hash('OperatorSan@123', 10),
            role: 'MUNICIPAL_OPERATOR',
            jurisdiction: { state: 'Uttar Pradesh', city: 'Lucknow', ulbCode: 'UP-LKO-001', ward: 'Ward-1', department: 'Health Department' },
            isVerified: true,
            isActive: true
        });
        console.log(`✅ ${sanitationOperator.employeeId} - ${sanitationOperator.name}`);

        const citizen = await User.create({
            employeeId: 'CIT-001',
            name: 'Test Citizen User',
            email: 'citizen@test.com',
            password: await bcrypt.hash('Citizen@123', 10),
            role: 'CITIZEN',
            jurisdiction: {},
            isVerified: true,
            isActive: true
        });
        console.log(`✅ ${citizen.employeeId} - ${citizen.name}`);

        // Create sample complaints
        console.log('\n📝 Creating sample complaints...\n');

        await Complaint.create({
            userId: citizen._id,
            category: 'road',
            department: 'Public Works Department',
            status: 'pending',
            riskLevel: 'high',
            trustScore: 85,
            aiConfidence: 0.92,
            location: { type: 'Point', coordinates: [80.9462, 26.8467] },
            jurisdiction: { state: 'Uttar Pradesh', city: 'Lucknow', ulbCode: 'UP-LKO-001', ward: 'Ward-1' },
            slaDuration: 48,
            slaDeadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
        });

        await Complaint.create({
            userId: citizen._id,
            category: 'garbage',
            department: 'Waste Management',
            status: 'in_progress',
            riskLevel: 'medium',
            trustScore: 78,
            aiConfidence: 0.88,
            location: { type: 'Point', coordinates: [80.9512, 26.8500] },
            jurisdiction: { state: 'Uttar Pradesh', city: 'Lucknow', ulbCode: 'UP-LKO-001', ward: 'Ward-1' },
            slaDuration: 24,
            slaDeadline: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
            assignedTo: sanitationOperator._id,
            assignedBy: municipalAdmin._id,
            assignedAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
        });

        await Complaint.create({
            userId: municipalAdmin._id,
            category: 'road',
            department: 'Public Works Department',
            status: 'in_progress',
            riskLevel: 'medium',
            trustScore: 80,
            aiConfidence: 0.87,
            location: { type: 'Point', coordinates: [80.9480, 26.8490] },
            jurisdiction: { state: 'Uttar Pradesh', city: 'Lucknow', ulbCode: 'UP-LKO-001', ward: 'Ward-1' },
            slaDuration: 48,
            slaDeadline: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
            assignedTo: roadOperator._id,
            assignedBy: municipalAdmin._id,
            assignedAt: new Date(Date.now() - 4 * 60 * 60 * 1000)
        });

        console.log('✅ Created 3 sample complaints');

        console.log('\n🎉 Seed completed successfully!\n');
        console.log('📊 Summary:');
        console.log('   Users: 5');
        console.log('   Complaints: 3');
        console.log('\n🔐 Test Login Credentials:');
        console.log('==========================================');
        console.log('State Admin:');
        console.log('  Employee ID: ADMIN-STATE-001');
        console.log('  Password: StateAdmin@123');
        console.log('\nMunicipal Admin (Lucknow):');
        console.log('  Employee ID: ADMIN-LKO-001');
        console.log('  Password: AdminLKO@123');
        console.log('\nRoad Operator:');
        console.log('  Employee ID: EMP-ROAD-001');
        console.log('  Password: OperatorRoad@123');
        console.log('\nSanitation Operator:');
        console.log('  Employee ID: EMP-SAN-001');
        console.log('  Password: OperatorSan@123');
        console.log('\nCitizen:');
        console.log('  Employee ID: CIT-001');
        console.log('  Password: Citizen@123');
        console.log('==========================================');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\n👋 Database connection closed');
    }
};

seedWithEmployeeId();
