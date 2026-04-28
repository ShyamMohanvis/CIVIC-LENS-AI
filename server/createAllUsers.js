// Create users and drop old phone index
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

async function createAllUsers() {
    const client = new MongoClient('mongodb://localhost:27017');

    try {
        await client.connect();
        const db = client.db('civic-lens');
        const users = db.collection('users');

        console.log('🗑️  Dropping old indexes...');
        try {
            await users.dropIndex('phone_1');
            console.log('✅ Dropped phone index');
        } catch (e) {
            console.log('Phone index not found (OK)');
        }

        console.log('\n🗑️  Clearing existing users...\n');
        await users.deleteMany({});

        const testUsers = [
            {
                employeeId: 'ADMIN001',
                name: 'Rajesh Kumar (State Admin)',
                email: 'admin.state@civiclens.gov.in',
                password: 'Admin@123',
                role: 'STATE_ADMIN',
                jurisdiction: { state: 'Uttar Pradesh' }
            },
            {
                employeeId: 'ADMIN002',
                name: 'Priya Sharma (Municipal Admin)',
                email: 'admin.lucknow@civiclens.gov.in',
                password: 'Admin@123',
                role: 'MUNICIPAL_ADMIN',
                jurisdiction: { state: 'Uttar Pradesh', city: 'Lucknow', ulbCode: 'UP-LKO-001' }
            },
            {
                employeeId: 'EMP001',
                name: 'Amit Singh (Operator)',
                email: 'operator@civiclens.gov.in',
                password: 'Emp@123',
                role: 'MUNICIPAL_OPERATOR',
                jurisdiction: {
                    state: 'Uttar Pradesh',
                    city: 'Lucknow',
                    ulbCode: 'UP-LKO-001',
                    ward: 'Ward-1',
                    department: 'Public Works Department'
                }
            },
            {
                employeeId: 'CIT001',
                name: 'Sunita Devi (Citizen)',
                email: 'citizen@test.com',
                password: 'Cit@123',
                role: 'CITIZEN',
                jurisdiction: {}
            }
        ];

        console.log('👥 Creating users for all levels...\n');

        for (const userData of testUsers) {
            const hashedPwd = await bcrypt.hash(userData.password, 10);

            await users.insertOne({
                employeeId: userData.employeeId,
                name: userData.name,
                email: userData.email,
                password: hashedPwd,
                role: userData.role,
                jurisdiction: userData.jurisdiction,
                isVerified: true,
                isActive: true,
                loginCount: 0,
                createdAt: new Date(),
                updatedAt: new Date()
            });

            console.log(`✅ ${userData.employeeId} - ${userData.name}`);
        }

        console.log('\n🎉 All users created successfully!\n');
        console.log('═══════════════════════════════════════════');
        console.log('📋 TEST LOGIN CREDENTIALS:');
        console.log('═══════════════════════════════════════════');
        console.log('State Admin (View ALL state data):');
        console.log('  ID: ADMIN001  |  Pass: Admin@123');
        console.log('');
        console.log('Municipal Admin (View city data):');
        console.log('  ID: ADMIN002  |  Pass: Admin@123');
        console.log('');
        console.log('Operator (View assigned tasks):');
        console.log('  ID: EMP001    |  Pass: Emp@123');
        console.log('');
        console.log('Citizen (View own complaints):');
        console.log('  ID: CIT001    |  Pass: Cit@123');
        console.log('═══════════════════════════════════════════');
        console.log('\n🔐 Test at: http://localhost:5173/login');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await client.close();
    }
}

createAllUsers();
