const Alert = require('../models/Alert');

// Exponential backoff delay helper (1s, 2s, 4s)
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Attempts to send an SMS via Twilio with exponential backoff retry.
 * Falls back to mock console output when Twilio is not configured.
 * On all retries exhausted, marks alert as DLQ.
 *
 * @param {Object} accident - Accident mongoose document
 * @param {Object} options  - { source: 'accident'|'complaint'|'emergency', complaintId }
 */
exports.sendEmergencyAlert = async (accident, options = {}) => {
    const source = options.source || 'accident';
    const recipientNumber = process.env.EMERGENCY_CONTACT_NUMBER || '+1234567890';
    const messageBody =
        `🚨 EMERGENCY ALERT\nMajor incident detected!\nSeverity: ${accident.severity?.toUpperCase()}\n` +
        `Time: ${new Date(accident.timestamp || Date.now()).toLocaleTimeString()}\n` +
        `Coordinates: ${accident.location?.latitude}, ${accident.location?.longitude}`;

    // Create alert record
    const alert = new Alert({
        accidentId: source === 'accident' ? accident._id : null,
        complaintId: options.complaintId || null,
        source,
        recipientNumber,
        messageBody,
        smsStatus: 'pending',
        maxRetries: 3
    });
    await alert.save();

    const isTwilioConfigured = !!(
        process.env.TWILIO_ACCOUNT_SID &&
        process.env.TWILIO_AUTH_TOKEN &&
        process.env.TWILIO_PHONE_NUMBER
    );

    let lastError = null;
    const MAX_RETRIES = 3;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            alert.retryCount = attempt - 1;
            alert.lastAttemptAt = new Date();

            if (isTwilioConfigured) {
                const twilio = require('twilio');
                const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
                await client.messages.create({
                    body: messageBody,
                    from: process.env.TWILIO_PHONE_NUMBER,
                    to: recipientNumber
                });
            } else {
                // Mock mode — always succeeds
                console.log(`\n================= MOCK SMS ALERT (Attempt ${attempt}) =================`);
                console.log(`To: ${recipientNumber}`);
                console.log(messageBody);
                console.log(`====================================================================\n`);
            }

            // ✅ Success
            alert.smsStatus = 'sent';
            alert.sentAt = new Date();
            alert.errorMessage = null;
            await alert.save();
            console.log(`✅ SMS Alert sent successfully on attempt ${attempt} to ${recipientNumber}`);
            return { success: true, attempt };

        } catch (err) {
            lastError = err;
            console.warn(`⚠️  SMS attempt ${attempt}/${MAX_RETRIES} failed: ${err.message}`);

            if (attempt < MAX_RETRIES) {
                const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
                console.log(`🔄 Retrying in ${delay / 1000}s...`);
                await sleep(delay);
            }
        }
    }

    // ❌ All retries exhausted – move to Dead Letter Queue
    console.error(`❌ All ${MAX_RETRIES} SMS attempts exhausted. Moving to DLQ.`);
    alert.smsStatus = 'dlq';
    alert.retryCount = MAX_RETRIES;
    alert.errorMessage = lastError?.message || 'Unknown error';
    alert.dlqReason = `Failed after ${MAX_RETRIES} retries. Last error: ${lastError?.message}`;
    await alert.save();

    return { success: false, dlq: true, error: lastError?.message };
};


/**
 * Returns the last N alert records for dashboard display.
 * @param {number} limit
 */
exports.getRecentAlerts = async (limit = 20) => {
    return Alert.find({})
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
};
