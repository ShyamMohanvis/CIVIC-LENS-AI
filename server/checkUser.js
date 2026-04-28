// Quick check if user exists
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/civic-lens')
    .then(async () => {
        const user = await User.findOne({ employeeId: 'ADMIN001' });
        if (user) {
            console.log('✅ User found:', user.employeeId, '-', user.name);
            console.log('   Role:', user.role);
            console.log('   Has password:', !!user.password);
        } else {
            console.log('❌ User ADMIN001 not found');
        }
        process.exit();
    });
