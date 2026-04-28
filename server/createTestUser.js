// Super simple user creation with mongosh command
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

async function createUser() {
    const client = new MongoClient('mongodb://localhost:27017');

    try {
        await client.connect();
        const db = client.db('civic-lens');
        const users = db.collection('users');

        await users.deleteMany({ employeeId: 'ADMIN001' });

        const hashedPwd = await bcrypt.hash('Admin@123', 10);
        console.log('Hashed password length:', hashedPwd.length);

        const result = await users.insertOne({
            employeeId: 'ADMIN001',
            name: 'Test Admin',
            email: 'admin@test.com',
            password: hashedPwd,
            role: 'STATE_ADMIN',
            jurisdiction: { state: 'Uttar Pradesh' },
            isVerified: true,
            isActive: true,
            loginCount: 0,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        console.log('✅ Inserted:', result.insertedId);

        // Verify
        const user = await users.findOne({ employeeId: 'ADMIN001' });
        console.log('✅ Verification:');
        console.log('   Employee ID:', user.employeeId);
        console.log('   Name:', user.name);
        console.log('   Role:', user.role);
        console.log('   Has password:', !!user.password, '(length:', user.password?.length, ')');

        console.log('\n🔐 Login at: http://localhost:5173/login');
        console.log('Employee ID: ADMIN001');
        console.log('Password: Admin@123');

    } finally {
        await client.close();
    }
}

createUser();
