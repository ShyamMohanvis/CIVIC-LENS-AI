const axios = require('axios');
const trendService = require('./trendService');

// In-memory cache — only call AI once per hour
let summaryCache = null;
let cacheTimestamp = null;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Generates an AI-powered daily municipal intelligence brief using Groq API.
 * Groq is OpenAI-compatible.
 */
exports.generateDailySummary = async () => {
    try {
        const trends = await trendService.calculateTrends();
        const fallbackSummary = `City status: ${trends?.riskLevel || 'Normal'} risk level with ${trends?.dailyAccidents ?? 0} road accidents and ${trends?.dailyIssues ?? 0} civic infrastructure issues logged in the past 24 hours. Urban Risk Index: ${trends?.riskScore ?? 0}/100.`;

        const now = Date.now();
        if (summaryCache && cacheTimestamp && (now - cacheTimestamp) < CACHE_TTL_MS) {
            console.log("📦 Returning cached AI summary.");
            return summaryCache;
        }

        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            console.warn("⚠️ GROQ_API_KEY missing — using rule-based summary.");
            return fallbackSummary;
        }

        if (!trends) return fallbackSummary;

        const prompt = `You are the Chief Intelligence Analyst for a Smart City control room.
Write a concise, high-level municipal intelligence brief (2-3 sentences max) based on the following real-time data:
- Daily Accidents: ${trends.dailyAccidents} (Trend: ${trends.accidentTrend}% vs yesterday)
- Infrastructure Complaints: ${trends.dailyIssues} (Trend: ${trends.issueTrend}% vs yesterday)
- Urban Risk Score: ${trends.riskScore} out of 100
- Overall Risk Level: ${trends.riskLevel}

Tone: Professional, urgent if risk is high, reassuring if risk is low.
Format: Just the summary paragraph, no greeting, no bullet points, no signature.`;

        // Groq Chat Completion (OpenAI-Compatible)
        const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
            model: "llama-3.3-70b-versatile",
            messages: [
                { role: "system", content: "You are a government intelligence analyst." },
                { role: "user", content: prompt }
            ],
            temperature: 0.5,
            max_tokens: 150
        }, {
            headers: { 
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json' 
            },
            timeout: 10000
        });

        const text = response.data?.choices?.[0]?.message?.content;
        if (text) {
            console.log("✅ Groq AI summary generated and cached.");
            summaryCache = text.trim();
            cacheTimestamp = now;
            return summaryCache;
        }

        console.warn("⚠️ Groq returned empty response — using fallback.");
        return fallbackSummary;

    } catch (error) {
        const errMsg = error?.response?.data?.error?.message || error?.message || 'Unknown error';
        console.error('❌ Groq summary error:', errMsg);

        if (summaryCache) {
            console.log("♻️ Serving stale cached summary due to error.");
            return summaryCache;
        }

        try {
            const trends = await trendService.calculateTrends();
            if (trends) {
                return `City monitoring active — ${trends.riskLevel} risk. ${trends.dailyAccidents} accidents and ${trends.dailyIssues} civic issues recorded today. Risk Score: ${trends.riskScore}/100.`;
            }
        } catch (_) { }

        return "City monitoring active. AI-powered brief will be available shortly.";
    }
};
