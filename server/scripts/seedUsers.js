require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

/**
 * Seed script to create initial admin and operator users
 * Run with: node scripts/seedUsers.js
 */

const seedUsers = async () => {
    try {
        // Connect to database
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/civic-lens');
        console.log('✅ Connected to MongoDB');

        // Clear existing users (CAUTION: Only for initial setup)
        // await User.deleteMany({});
        // console.log('🗑️  Cleared existing users');

        const users = [
            // State Admin for Uttar Pradesh
            {
                phone: '+919999999999',
                name: 'Rajesh Kumar (State Admin)',
                email: 'admin.state@civiclens.gov.in',
                password: 'StateAdmin@123',
                role: 'STATE_ADMIN',
                jurisdiction: {
                    state: 'Uttar Pradesh'
                },
                isVerified: true,
                isActive: true
            },

            // Municipal Admin for Lucknow
            {
                phone: '+919999999998',
                name: 'Priya Sharma (Lucknow Admin)',
                email: 'admin.lucknow@civiclens.gov.in',
                password: 'AdminLKO@123',
                role: 'MUNICIPAL_ADMIN',
                jurisdiction: {
                    state: 'Uttar Pradesh',
                    city: 'Lucknow',
                    ulbCode: 'UP-LKO-001'
                },
                isVerified: true,
                isActive: true
            },

            // Municipal Operator for Lucknow - Ward 1 (Roads)
            {
                phone: '+919999999997',
                name: 'Amit Singh (Road Operator)',
                email: 'operator.roads.w1@civiclens.gov.in',
                password: 'OperatorRoad@123',
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
            },

            // Municipal Operator for Lucknow - Ward 1 (Sanitation)
            {
                phone: '+919999999996',
                name: 'Sunita Devi (Sanitation Operator)',
                email: 'operator.sanitation.w1@civiclens.gov.in',
                password: 'OperatorSan@123',
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
            },

            // Test Citizen User
            {
                phone: '+919999999995',
                name: 'Test Citizen User',
                email: 'citizen@test.com',
                role: 'CITIZEN',
                jurisdiction: {},
                isVerified: true,
                isActive: true
            }
        ];

        // Create users
        for (const userData of users) {
            const existingUser = await User.findOne({ phone: userData.phone });
            if (existingUser) {
                console.log(`⏭️  User already exists: ${userData.phone} (${userData.name})`);
                continue;
            }

            const user = new User(userData);
            await user.save();
            console.log(`✅ Created: ${userData.name} (${userData.role})`);
            console.log(`   Phone: ${userData.phone}`);
            if (userData.password) {
                console.log(`   Password: ${userData.password}`);
            }
        }

        console.log('\n🎉 Seed users created successfully!');
        console.log('\n📋 Login Credentials:');
        console.log('====================================');
        console.log('STATE ADMIN:');
        console.log('  Phone: +919999999999');
        console.log('  Password: StateAdmin@123');
        console.log('\nMUNICIPAL ADMIN (Lucknow):');
        console.log('  Phone: +919999999998');
        console.log('  Password: AdminLKO@123');
        console.log('\nOPERATOR (Roads):');
        console.log('  Phone: +919999999997');
        console.log('  Password: OperatorRoad@123');
        console.log('\nOPERATOR (Sanitation):');
        console.log('  Phone: +919999999996');
        console.log('  Password: OperatorSan@123');
        console.log('\nCITIZEN (OTP Login):');
        console.log('  Phone: +919999999995');
        console.log('  (Use OTP login flow)');
        console.log('====================================\n');

    } catch (error) {
        console.error('❌ Error seeding users:', error);
    } finally {
        await mongoose.connection.close();
        console.log('👋 Database connection closed');
    }
};

// Run the seed function
seedUsers();
