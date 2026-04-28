/**
 * Groq AI Service for Civic Image Classification & Analysis
 * Uses Llama-4-Scout-17b-16e-instruct for multimodal vision tasks.
 * Groq-specific limitation: 4MB request size limit for base64 images.
 */

const axios = require('axios');
const sharp = require('sharp');

/**
 * Initialize Groq
 */
const getApiKey = () => process.env.GROQ_API_KEY;

/**
 * Ensures the base64 image is within Groq's 4MB limit.
 * Resizes if necessary using sharp.
 */
async function ensureImageSize(base64Data) {
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Target < 3MB to be safe with overhead
    if (buffer.length <= 3 * 1024 * 1024) {
        return base64Data;
    }

    console.log(`🖼️ Resizing image for Groq Vision (${(buffer.length / 1024 / 1024).toFixed(2)}MB -> <3MB)`);
    
    const resizedBuffer = await sharp(buffer)
        .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 75 })
        .toBuffer();
        
    return resizedBuffer.toString('base64');
}

/**
 * Classify civic issue from image using Groq Vision
 */
async function classifyImage(imageUrl) {
    const apiKey = getApiKey();
    if (!apiKey) {
        console.warn('⚠️ GROQ_API_KEY not configured');
        return null;
    }

    try {
        let base64Data = imageUrl;
        let mimeType = 'image/jpeg';

        if (imageUrl.startsWith('data:')) {
            const matches = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
            if (matches) {
                mimeType = matches[1];
                base64Data = matches[2];
            }
        }

        const safeBase64 = await ensureImageSize(base64Data);

        const prompt = `You are a computer vision AI used by a government civic complaint platform in India.
Analyze this image and identify the civic infrastructure issue shown.

CATEGORIES:
- road: Potholes, road damage, cracks, broken pavement, footpath damage
- water: Water leaks, pipe bursts, water logging, tap issues
- electricity: Broken streetlights, exposed wires, damaged poles, electrical hazards
- sanitation: Sewage overflow, open drains, blocked drains, toilet issues
- garbage: Garbage piles, littering, overflowing bins, waste accumulation
- drainage: Blocked drainage, waterlogging after rain, drain damage
- other: Unclear image, multiple issues, or non-civic issues

Respond ONLY with valid JSON in this exact format:
{
  "category": "road|water|electricity|sanitation|garbage|drainage|other",
  "confidence": 0.0 to 1.0,
  "visualIndicators": ["indicator1", "indicator2"],
  "description": "Brief description of the issue",
  "riskLevel": "low|medium|high",
  "isEmergency": true or false
}`;

        const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
            model: "meta-llama/llama-4-scout-17b-16e-instruct",
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: prompt },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:${mimeType};base64,${safeBase64}`
                            }
                        }
                    ]
                }
            ],
            temperature: 0.1,
            max_tokens: 500,
            response_format: { type: "json_object" }
        }, {
            headers: { 
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json' 
            },
            timeout: 25000
        });

        const parsed = response.data?.choices?.[0]?.message?.content;
        if (!parsed) return null;
        
        const data = typeof parsed === 'string' ? JSON.parse(parsed) : parsed;
        console.log(`🤖 Groq (Llama 4) Classification: ${data.category} (${(data.confidence * 100).toFixed(1)}%)`);

        return {
            ...data,
            source: 'groq_llama4_scout'
        };

    } catch (error) {
        console.error('Groq classification error:', error?.response?.data || error.message);
        return null;
    }
}

/**
 * Analyze emergency status from image
 */
async function analyzeEmergency(imageUrl) {
    const apiKey = getApiKey();
    if (!apiKey) return null;

    try {
        let base64Data = imageUrl;
        let mimeType = 'image/jpeg';
        if (imageUrl.startsWith('data:')) {
            const matches = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
            if (matches) {
                mimeType = matches[1];
                base64Data = matches[2];
            }
        }

        const safeBase64 = await ensureImageSize(base64Data);

        const prompt = `Analyze this image for immediate threats to public safety. Respond ONLY with JSON:
{
  "isEmergency": true/false,
  "riskLevel": "low|medium|high|critical",
  "confidence": 0.0-1.0,
  "threats": ["threat1"],
  "reason": "explanation"
}`;

        const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
            model: "meta-llama/llama-4-scout-17b-16e-instruct",
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: prompt },
                        { type: "image_url", image_url: { url: `data:${mimeType};base64,${safeBase64}` } }
                    ]
                }
            ],
            temperature: 0.1,
            response_format: { type: "json_object" }
        }, {
            headers: { 'Authorization': `Bearer ${apiKey}` },
            timeout: 20000
        });

        const content = response.data?.choices?.[0]?.message?.content;
        return typeof content === 'string' ? JSON.parse(content) : content;
    } catch (error) {
        console.error('Groq emergency analysis error:', error.message);
        return null;
    }
}

/**
 * Verify resolution by comparing before/after images
 */
async function verifyResolution(beforeImageUrl, afterImageUrl) {
    const apiKey = getApiKey();
    if (!apiKey) return null;

    try {
        const getSafeBase64 = async (url) => {
            let data = url;
            let mime = 'image/jpeg';
            if (url.startsWith('data:')) {
                const matches = url.match(/^data:([^;]+);base64,(.+)$/);
                if (matches) { mime = matches[1]; data = matches[2]; }
            }
            const safe = await ensureImageSize(data);
            return { mime, data: safe };
        };

        const before = await getSafeBase64(beforeImageUrl);
        const after = await getSafeBase64(afterImageUrl);

        const prompt = `Compare Image 1 (BEFORE) and Image 2 (AFTER). Has the civic issue been resolved? JSON only:
{ "isResolved": true/false, "confidence": 0.0-1.0, "reason": "why" }`;

        const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
            model: "meta-llama/llama-4-scout-17b-16e-instruct",
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: prompt },
                        { type: "image_url", image_url: { url: `data:${before.mime};base64,${before.data}` } },
                        { type: "image_url", image_url: { url: `data:${after.mime};base64,${after.data}` } }
                    ]
                }
            ],
            temperature: 0.1,
            response_format: { type: "json_object" }
        }, {
            headers: { 'Authorization': `Bearer ${apiKey}` },
            timeout: 30000
        });

        const content = response.data?.choices?.[0]?.message?.content;
        return typeof content === 'string' ? JSON.parse(content) : content;
    } catch (error) {
        console.error('Groq resolution verification error:', error.message);
        return null;
    }
}

module.exports = {
    classifyImage,
    analyzeEmergency,
    verifyResolution
};
