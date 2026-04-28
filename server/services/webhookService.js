/**
 * Webhook Service — VULN-008
 *
 * Delivers signed webhook payloads to registered partners.
 * Signature: HMAC-SHA256(rawSecret, `${timestamp}.${JSON.stringify(payload)}`)
 * Partners verify using X-Webhook-Signature and X-Webhook-Timestamp headers.
 * Timestamps outside ±5 minutes are rejected (replay protection).
 */

const crypto = require('crypto');
const WebhookPartner = require('../models/WebhookPartner');

/**
 * Dispatch an event to all matching active webhook partners.
 * @param {string} eventType — e.g. 'complaint.created'
 * @param {object} payload   — event body (serializable JSON)
 */
const dispatchWebhookEvent = async (eventType, payload) => {
    try {
        const partners = await WebhookPartner.find({
            isActive: true,
            allowedEvents: eventType
        }).select('+secretHash');

        if (!partners.length) return;

        const timestamp = Math.floor(Date.now() / 1000).toString();

        await Promise.allSettled(
            partners.map(partner => deliverToPartner(partner, eventType, payload, timestamp))
        );
    } catch (err) {
        console.error('[Webhook] Dispatch error:', err.message);
    }
};

/**
 * Deliver a single signed webhook to one partner.
 */
const deliverToPartner = async (partner, eventType, payload, timestamp) => {
    const body = {
        event: eventType,
        timestamp,
        data: payload
    };

    // Build HMAC signature: HMAC-SHA256(rawSecretHash, `${timestamp}.${json}`)
    // NOTE: we store the SHA-256 hash of the secret, not the raw secret.
    // The actual HMAC is built over: timestamp + "." + JSON body
    const message = `${timestamp}.${JSON.stringify(body)}`;
    const signature = crypto
        .createHmac('sha256', partner.secretHash)  // Uses stored hash as key
        .update(message)
        .digest('hex');

    try {
        const response = await fetch(partner.url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Webhook-Signature': signature,
                'X-Webhook-Timestamp': timestamp,
                'X-Civi-Event': eventType
            },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(10000) // 10s timeout
        });

        if (response.ok) {
            await WebhookPartner.findByIdAndUpdate(partner._id, {
                $inc: { successCount: 1 },
                lastDeliveredAt: new Date()
            });
            console.log(`[Webhook] ✅ Delivered '${eventType}' to ${partner.name} → ${response.status}`);
        } else {
            throw new Error(`HTTP ${response.status}`);
        }
    } catch (err) {
        await WebhookPartner.findByIdAndUpdate(partner._id, {
            $inc: { failureCount: 1 },
            lastFailureAt: new Date()
        });
        console.warn(`[Webhook] ❌ Failed '${eventType}' to ${partner.name}: ${err.message}`);
    }
};

/**
 * Verify an incoming webhook signature from a partner (inbound verification).
 * @param {string} rawSecret  — the partner's raw secret
 * @param {string} body       — raw request body string
 * @param {string} timestamp  — X-Webhook-Timestamp header value (Unix seconds)
 * @param {string} signature  — X-Webhook-Signature header value
 * @returns {{ valid: boolean, reason?: string }}
 */
const verifyInboundWebhook = (rawSecret, body, timestamp, signature) => {
    // Reject if timestamp is outside ±5 minutes (replay protection)
    const now = Math.floor(Date.now() / 1000);
    const ts = parseInt(timestamp, 10);
    if (Math.abs(now - ts) > 300) {
        return { valid: false, reason: 'Timestamp outside 5-minute replay window' };
    }

    const message = `${timestamp}.${body}`;
    const expected = crypto
        .createHmac('sha256', rawSecret)
        .update(message)
        .digest('hex');

    const sigBuffer = Buffer.from(signature.replace('sha256=', ''), 'hex');
    const expectedBuffer = Buffer.from(expected, 'hex');

    if (sigBuffer.length !== expectedBuffer.length) {
        return { valid: false, reason: 'Signature length mismatch' };
    }

    const valid = crypto.timingSafeEqual(sigBuffer, expectedBuffer);
    return valid ? { valid: true } : { valid: false, reason: 'Signature mismatch' };
};

module.exports = {
    dispatchWebhookEvent,
    deliverToPartner,
    verifyInboundWebhook
};
