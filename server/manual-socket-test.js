
// Manual Socket.IO Test Script
const io = require('socket.io-client');

const SOCKET_URL = 'http://localhost:5000';

console.log('🔵 Connecting to', SOCKET_URL);
const socket = io(SOCKET_URL);

socket.on('connect', () => {
    console.log('✅ CONNECTED! Socket ID:', socket.id);

    // Prepare test data
    const testData = {
        emergencyId: 'test-' + Date.now(),
        acknowledgedBy: 'Test Script',
        timestamp: new Date()
    };

    console.log('📤 Sending EMERGENCY_ACKNOWLEDGED event in 1 second...');
    setTimeout(() => {
        socket.emit('EMERGENCY_ACKNOWLEDGED', testData);
        console.log('✅ Event sent! Waiting for broadcast...');
    }, 1000);
});

socket.on('EMERGENCY_ACKNOWLEDGED', (data) => {
    console.log('📢 RECEIVED EMERGENCY_ACKNOWLEDGED EVENT!');
    console.log('Data:', JSON.stringify(data, null, 2));
    console.log('✅ TEST PASSED!');
    socket.disconnect();
    process.exit(0);
});

socket.on('connect_error', (err) => {
    console.error('❌ Connection Error:', err.message);
    process.exit(1);
});

// Timeout if nothing happens
setTimeout(() => {
    console.error('❌ TEST TIMEOUT: Did not receive event back.');
    process.exit(1);
}, 5000);
