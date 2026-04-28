require('dotenv').config();
const { classifyImage } = require('./services/aiService');
const axios = require('axios');

async function testGroq() {
    console.log('--- Groq Connectivity Test ---');
    console.log('Key:', process.env.GROQ_API_KEY ? 'Present' : 'Missing');
    
    try {
        const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "user", content: "Hello, confirm you are working." }],
            max_tokens: 10
        }, {
            headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` }
        });
        console.log('✅ Chat Completion API: Working');
        console.log('Response:', response.data.choices[0].message.content);

        // Test with a tiny dummy image (1x1 red dot base64)
        const dummyImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
        console.log('\n--- Groq Vision Test ---');
        const visionResult = await classifyImage(dummyImage);
        console.log('✅ Vision API:', visionResult ? 'Working' : 'Failed');
        if (visionResult) {
            console.log('Result:', JSON.stringify(visionResult, null, 2));
        }

    } catch (e) {
        console.error('❌ Error testing Groq:', e.response?.data || e.message);
    }
}

testGroq();
